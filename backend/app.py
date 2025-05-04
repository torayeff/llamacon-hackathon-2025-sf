import logging
import os
import queue
import signal
import threading
import time
from datetime import datetime
from typing import Any, Dict, List

import uvicorn
from db_writer import DBWriter, EventAlert
from dotenv import load_dotenv
from fastapi import BackgroundTasks, FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from video_event_detector import VideoEventDetector
from video_stream_chunker import VideoStreamChunker

logging.basicConfig(
    level=logging.INFO, format="%(asctime)s - %(name)s - %(levelname)s - %(message)s"
)
logger = logging.getLogger(__name__)

load_dotenv()

app = FastAPI(title="Video Event Detection API")

# Add CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

video_chunk_queue: queue.Queue[str] = queue.Queue(maxsize=100)
event_detection_queue: queue.Queue[Dict[str, Any]] = queue.Queue(maxsize=100)

db_writer: DBWriter | None = None
shutdown_event = threading.Event()
service_active = False
threads = []


# Define Pydantic models for request validation
class EventConfig(BaseModel):
    event_code: str
    event_description: str
    detection_guidelines: str


class AppConfig(BaseModel):
    model: str
    base_url: str
    rtsp_url: str
    chunk_duration: int
    output_dir: str
    context: str
    events: List[EventConfig]


def validate_config(config: Dict[str, Any]) -> None:
    required_keys = [
        "rtsp_url",
        "output_dir",
        "chunk_duration",
        "model",
        "base_url",
        "context",
        "events",
    ]
    if not all(key in config for key in required_keys):
        raise ValueError(
            f"Config is missing one or more required keys: {required_keys}"
        )


def video_processing_worker(config: Dict[str, Any], stop_event: threading.Event):
    logger.info("Video processing worker started.")
    try:
        detector = VideoEventDetector(
            model=config["model"],
            base_url=config["base_url"],
            api_key=os.getenv("LLAMA_API_KEY", ""),
            output_queue=event_detection_queue,
        )
    except ValueError as e:
        logger.error(f"Failed to initialize VideoEventDetector: {e}. Worker stopping.")
        return
    except Exception as e:
        logger.error(
            f"Unexpected error initializing VideoEventDetector: {e}. Worker stopping."
        )
        return

    context = config.get("context", "")
    events = config.get("events", [])

    while not stop_event.is_set():
        try:
            video_path = video_chunk_queue.get(timeout=1)
            logger.info(f"Processing video chunk: {video_path}")
            detector.detect_events(
                video_path=video_path, events=events, context=context
            )
            video_chunk_queue.task_done()
            try:
                os.remove(video_path)
                logger.info(f"Removed processed chunk: {video_path}")
            except OSError as e:
                logger.error(f"Error removing processed chunk {video_path}: {e}")
        except queue.Empty:
            continue
        except Exception as e:
            logger.exception(
                f"Error during video processing for {video_path if 'video_path' in locals() else 'unknown video'}: {e}"
            )
            video_chunk_queue.task_done()
            time.sleep(1)

    logger.info("Video processing worker stopped.")


def event_collection_worker(stop_event: threading.Event):
    global db_writer
    logger.info("Event collection worker started.")

    if not db_writer:
        logger.error("DBWriter not initialized. Event collection worker cannot start.")
        return

    while not stop_event.is_set():
        try:
            result = event_detection_queue.get(timeout=1)
            logger.info(f"Received event data: {result.get('event_code')}")

            try:
                event_alert = EventAlert(
                    event_timestamp=result.get("event_timestamp", datetime.now()),
                    event_code=result.get("event_code", "unknown-code"),
                    event_description=result.get(
                        "event_description", "Unknown event description"
                    ),
                    event_detection_explanation_by_ai=result.get(
                        "event_detection_explanation_by_ai", ""
                    ),
                    event_video_url=result.get("event_video_url", ""),
                )

                num_written = db_writer.write_events(events=[event_alert])
                if num_written > 0:
                    logger.info(f"Wrote {num_written} event(s) to database.")
                else:
                    logger.warning("Failed to write event to database.")

            except Exception as e:
                logger.exception(f"Error processing or writing event to database: {e}")

            finally:
                event_detection_queue.task_done()

        except queue.Empty:
            continue
        except Exception as e:
            logger.exception(f"Error collecting event from queue: {e}")
            time.sleep(1)

    logger.info("Event collection worker stopped.")


def start_services(config: Dict[str, Any]):
    global db_writer, shutdown_event, service_active, threads
    logger.info("Starting services...")

    try:
        validate_config(config)
    except Exception as e:
        logger.error(f"Failed to validate configuration: {e}. Shutting down.")
        raise HTTPException(status_code=400, detail=f"Invalid configuration: {e}")

    try:
        db_writer = DBWriter(
            db_url=os.getenv("DATABASE_URL"),
            create_tables=True,
        )
        logger.info("Database writer initialized.")
    except Exception as e:
        logger.error(f"Failed to initialize DBWriter: {e}. Shutting down.")
        raise HTTPException(
            status_code=500, detail=f"Failed to initialize database: {e}"
        )

    try:
        chunker = VideoStreamChunker(
            stream_url=config["rtsp_url"],
            output_dir=config["output_dir"],
            chunk_duration=config["chunk_duration"],
            output_queue=video_chunk_queue,
        )
        logger.info("Video stream chunker initialized.")
    except Exception as e:
        logger.error(f"Failed to initialize VideoStreamChunker: {e}. Shutting down.")
        raise HTTPException(
            status_code=500, detail=f"Failed to initialize video chunker: {e}"
        )

    video_proc_thread = threading.Thread(
        target=video_processing_worker,
        args=(config, shutdown_event),
        daemon=True,
        name="VideoProcessor",
    )
    event_collect_thread = threading.Thread(
        target=event_collection_worker,
        args=(shutdown_event,),
        daemon=True,
        name="EventCollector",
    )
    chunker_thread = threading.Thread(
        target=chunker.start, daemon=True, name="StreamChunker"
    )

    threads = [video_proc_thread, event_collect_thread, chunker_thread]

    logger.info("Starting worker threads.")
    for t in threads:
        t.start()

    service_active = True
    logger.info("All services started.")
    return {"status": "Services started successfully"}


def stop_services():
    global shutdown_event, service_active, threads

    if not service_active:
        return {"status": "Service is not running"}

    logger.info("Stopping services...")
    shutdown_event.set()

    # Reset shutdown event for future use
    shutdown_event = threading.Event()

    timeout_seconds = 10
    for t in threads:
        if t.is_alive():
            t.join(timeout=timeout_seconds)
            if t.is_alive():
                logger.warning(f"Thread {t.name} did not finish within timeout.")

    service_active = False
    threads = []
    logger.info("All services stopped.")
    return {"status": "Services stopped successfully"}


@app.post("/start")
async def start(config: AppConfig, background_tasks: BackgroundTasks):
    global service_active

    if service_active:
        return {"status": "Service is already running"}

    # Convert Pydantic model to dict
    config_dict = config.dict()

    try:
        start_services(config_dict)
        return {"status": "Services started successfully"}
    except HTTPException as e:
        raise e
    except Exception as e:
        logger.exception(f"Error starting services: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to start services: {e}")


@app.post("/stop")
async def stop():
    return stop_services()


@app.get("/status")
async def status():
    global service_active
    queue_info = {
        "video_chunks_queue_size": video_chunk_queue.qsize(),
        "event_detection_queue_size": event_detection_queue.qsize(),
    }
    return {"service_active": service_active, "queue_info": queue_info}


def signal_handler(signum, frame):
    logger.warning(f"Received signal {signum}. Initiating graceful shutdown...")
    stop_services()


if __name__ == "__main__":
    signal.signal(signal.SIGINT, signal_handler)
    signal.signal(signal.SIGTERM, signal_handler)

    uvicorn.run(app, host="0.0.0.0", port=8000)
