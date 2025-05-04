import json
import os
import queue
import threading
import time
from datetime import datetime

from db_writer import DBWriter, EventAlert
from dotenv import load_dotenv
from video_event_detector import VideoEventDetector
from video_stream_chunker import VideoStreamChunker

load_dotenv()

video_chunk_queue = queue.Queue()
event_detection_queue = queue.Queue()
detection_results = []

# Initialize database writer
db_writer = None


def load_config():
    """Load configuration from config.json file."""
    with open("config.json", "r") as f:
        return json.load(f)


def video_processing_worker():
    """Worker thread for processing video chunks and detecting events."""
    config = load_config()

    detector = VideoEventDetector(
        model=config["model"],
        base_url=config["base_url"],
        api_key=os.getenv("LLAMA_API_KEY"),
        output_queue=event_detection_queue,
    )

    context = config["context"]
    events = config["events"]

    while True:
        try:
            video_path = video_chunk_queue.get(timeout=1)
            print(f"Processing video: {video_path}")
            detector.detect_events(
                video_path=video_path, events=events, context=context
            )
            video_chunk_queue.task_done()
        except queue.Empty:
            continue
        except Exception as e:
            print(f"Error processing video: {e}")
            continue


def event_collection_worker():
    """Worker thread for collecting event detection results."""
    global detection_results, db_writer

    while True:
        try:
            result = event_detection_queue.get(timeout=1)
            detection_results.append(result)
            print(f"New event detected: {result}")

            # Process and store events in the database
            if db_writer:
                # The result from the queue is already a single detected event dictionary
                # matching the structure needed by EventAlert.
                try:
                    # Create EventAlert Pydantic model instance for validation (optional but good practice)
                    # Ensure the keys in the 'result' dict match EventAlert fields
                    event_alert = EventAlert(
                        event_timestamp=result.get(
                            "event_timestamp", datetime.now()
                        ),  # Use timestamp from result
                        event_code=result.get("event_code", "unknown-code"),
                        event_description=result.get(
                            "event_description", "Unknown event description"
                        ),
                        event_detection_explanation_by_ai=result.get(
                            "event_detection_explanation_by_ai", ""
                        ),
                        event_video_url=result.get("event_video_url", ""),
                    )

                    # write_events expects a list of EventAlert objects
                    num_written = db_writer.write_events(events=[event_alert])
                    if num_written > 0:
                        print(f"Wrote {num_written} event to database")

                except Exception as e:
                    print(f"Error processing or writing event to database: {e}")

            event_detection_queue.task_done()
        except queue.Empty:
            continue
        except Exception as e:
            print(f"Error collecting event: {e}")
            continue


def start_services():
    """Start video chunking and event detection services."""
    global db_writer
    config = load_config()

    # Initialize database writer
    db_writer = DBWriter(
        db_url=os.getenv("DATABASE_URL", "sqlite:///events.db"),
        create_tables=True,
    )

    chunker = VideoStreamChunker(
        stream_url=config["rtsp_url"],
        output_dir=config["output_dir"],
        chunk_duration=config["chunk_duration"],
        output_queue=video_chunk_queue,
    )

    video_proc_thread = threading.Thread(target=video_processing_worker, daemon=True)
    event_collect_thread = threading.Thread(target=event_collection_worker, daemon=True)

    video_proc_thread.start()
    event_collect_thread.start()

    chunker_thread = threading.Thread(target=chunker.start, daemon=True)
    chunker_thread.start()

    print("All services started")

    try:
        while True:
            time.sleep(1)
            if len(detection_results) > 0:
                print(f"Total events detected: {len(detection_results)}")
    except KeyboardInterrupt:
        print("Shutting down...")


if __name__ == "__main__":
    start_services()
