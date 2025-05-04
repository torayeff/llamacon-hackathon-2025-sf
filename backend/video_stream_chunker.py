import datetime
import logging
import os
import queue
import time
from typing import Optional

import cv2

logger = logging.getLogger(__name__)

DEFAULT_FOURCC = cv2.VideoWriter_fourcc(*"avc1")


class VideoStreamChunker:
    def __init__(
        self,
        stream_url: str,
        output_dir: str,
        chunk_duration: int = 5,
        output_queue: Optional[queue.Queue] = None,
    ):
        if chunk_duration <= 0:
            raise ValueError("Chunk duration must be positive")

        self.stream_url = stream_url
        self.output_dir = output_dir
        self.chunk_duration = chunk_duration
        self.output_queue = output_queue
        self.is_running = False
        self.fourcc = DEFAULT_FOURCC

        try:
            os.makedirs(output_dir, exist_ok=True)
            logger.info(f"Ensured output directory exists: {output_dir}")
        except OSError as e:
            logger.error(f"Failed to create output directory {output_dir}: {e}")
            raise

    def start(self):
        if self.is_running:
            logger.warning("Chunker is already running.")
            return
        self.is_running = True
        logger.info("Starting video stream chunker...")
        self.process_stream()
        logger.info("Video stream chunker stopped.")

    def stop(self):
        logger.info("Stopping video stream chunker...")
        self.is_running = False

    def _finalize_chunk(
        self,
        writer: Optional[cv2.VideoWriter],
        current_file: Optional[str],
        start_time: Optional[datetime.datetime],
    ) -> None:
        if writer and current_file and start_time:
            try:
                writer.release()
                end_time = datetime.datetime.now(datetime.timezone.utc)
                start_str = start_time.strftime("%Y%m%d%H%M%S")
                end_str = end_time.strftime("%Y%m%d%H%M%S")
                final_file = os.path.join(self.output_dir, f"{start_str}_{end_str}.mp4")
                os.rename(current_file, final_file)
                logger.info(f"Completed video chunk: {final_file}")
                if self.output_queue:
                    try:
                        self.output_queue.put(final_file)
                    except queue.Full:
                        logger.error("Output queue is full. Dropping chunk filename.")
                    except Exception as qe:
                        logger.error(f"Error putting chunk filename into queue: {qe}")
            except Exception as e:
                logger.error(f"Error finalizing video chunk {current_file}: {e}")

    def process_stream(self):
        cap = None
        writer = None
        chunk_start_time_monotonic = 0
        start_time_utc = None
        output_file = None
        frames_in_chunk = 0
        retry_delay = 1

        while self.is_running:
            try:
                if cap is None or not cap.isOpened():
                    logger.info(f"Attempting to open stream: {self.stream_url}")
                    cap = cv2.VideoCapture(self.stream_url)
                    if not cap.isOpened():
                        logger.warning(
                            f"Failed to open stream {self.stream_url}. Retrying in {retry_delay} seconds..."
                        )
                        time.sleep(retry_delay)
                        retry_delay = min(retry_delay * 2, 60)
                        continue
                    logger.info(f"Successfully opened stream: {self.stream_url}")
                    retry_delay = 1
                    chunk_start_time_monotonic = 0
                    fps = int(cap.get(cv2.CAP_PROP_FPS)) or 30
                    width = int(cap.get(cv2.CAP_PROP_FRAME_WIDTH))
                    height = int(cap.get(cv2.CAP_PROP_FRAME_HEIGHT))
                    logger.info(
                        f"Stream properties: FPS={fps}, Width={width}, Height={height}"
                    )

                ret, frame = cap.read()
                if not ret:
                    logger.warning(
                        "Stream ended or frame read error. Releasing capture and attempting reconnect..."
                    )
                    if writer:
                        self._finalize_chunk(writer, output_file, start_time_utc)
                        writer = None
                        output_file = None
                        start_time_utc = None
                    if cap:
                        cap.release()
                        cap = None
                    time.sleep(retry_delay)
                    retry_delay = min(retry_delay * 2, 60)
                    continue

                now_monotonic = time.monotonic()

                if (
                    chunk_start_time_monotonic == 0
                    or (now_monotonic - chunk_start_time_monotonic)
                    >= self.chunk_duration
                ):
                    if writer and frames_in_chunk > 0:
                        self._finalize_chunk(writer, output_file, start_time_utc)

                    chunk_start_time_monotonic = now_monotonic
                    start_time_utc = datetime.datetime.now(datetime.timezone.utc)
                    frames_in_chunk = 0
                    start_str = start_time_utc.strftime("%Y%m%d%H%M%S")

                    output_file = os.path.join(
                        self.output_dir, f"{start_str}_ongoing.mp4"
                    )
                    writer = cv2.VideoWriter(
                        output_file, self.fourcc, fps, (width, height)
                    )
                    if not writer.isOpened():
                        logger.error(f"Failed to open VideoWriter for {output_file}")
                        writer = None
                        time.sleep(1)
                        continue
                    logger.debug(f"Starting new chunk: {output_file}")

                if writer and writer.isOpened():
                    writer.write(frame)
                    frames_in_chunk += 1

            except cv2.error as e:
                logger.error(f"OpenCV error during stream processing: {e}")
                if writer:
                    writer.release()
                    writer = None
                if cap:
                    cap.release()
                    cap = None
                output_file = None
                start_time_utc = None
                time.sleep(retry_delay)
                retry_delay = min(retry_delay * 2, 60)
            except Exception as e:
                logger.exception(f"Unexpected error in process_stream loop: {e}")
                if writer:
                    writer.release()
                    writer = None
                if cap:
                    cap.release()
                    cap = None
                output_file = None
                start_time_utc = None
                time.sleep(5)

        if writer and frames_in_chunk > 0:
            self._finalize_chunk(writer, output_file, start_time_utc)
        if cap:
            cap.release()
        logger.info("Stream processing loop finished.")
