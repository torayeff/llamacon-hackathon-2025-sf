import datetime
import os
import queue
import time
from typing import Optional

import cv2


class VideoStreamChunker:
    def __init__(
        self,
        stream_url: str,
        output_dir: str,
        chunk_duration: int = 5,
        output_queue: Optional[queue.Queue] = None,
    ):
        """
        Initialize the video stream chunker.

        Args:
            stream_url: URL of the video stream (e.g., rtsp://localhost:8554/hackathon)
            output_dir: Directory to save video chunks
            chunk_duration: Duration of each chunk in seconds
            output_queue: Queue to output filenames to when chunks are complete
        """
        self.stream_url = stream_url
        self.output_dir = output_dir
        self.chunk_duration = chunk_duration
        self.output_queue = output_queue
        self.is_running = False
        os.makedirs(output_dir, exist_ok=True)

    def start(self):
        """Start the video chunking process."""
        if self.is_running:
            return
        self.is_running = True
        self.process_stream()

    def stop(self):
        """Stop the video chunking process."""
        self.is_running = False

    def process_stream(self):
        """Main processing loop for video chunking."""
        cap = None
        writer = None
        chunk_start = 0
        start_time = None
        output_file = None
        frames = 0

        try:
            cap = cv2.VideoCapture(self.stream_url)
            if not cap.isOpened():
                print(f"Error: Could not open stream {self.stream_url}")
                return

            fps = int(cap.get(cv2.CAP_PROP_FPS)) or 30
            width = int(cap.get(cv2.CAP_PROP_FRAME_WIDTH))
            height = int(cap.get(cv2.CAP_PROP_FRAME_HEIGHT))

            while self.is_running:
                ret, frame = cap.read()
                if not ret:
                    if writer:
                        writer.release()
                        writer = None
                    cap.release()
                    time.sleep(1)
                    cap = cv2.VideoCapture(self.stream_url)
                    chunk_start = 0
                    continue

                now = time.time()

                if chunk_start == 0 or (now - chunk_start) >= self.chunk_duration:
                    if writer and frames > 0:
                        writer.release()
                        end_time = datetime.datetime.now(datetime.timezone.utc)
                        start_str = start_time.strftime("%Y%m%d%H%M%S")
                        end_str = end_time.strftime("%Y%m%d%H%M%S")
                        final_file = os.path.join(
                            self.output_dir, f"{start_str}_{end_str}.mp4"
                        )
                        os.rename(output_file, final_file)
                        if self.output_queue:
                            self.output_queue.put(final_file)

                    chunk_start = now
                    start_time = datetime.datetime.now(datetime.timezone.utc)
                    frames = 0
                    start_str = start_time.strftime("%Y%m%d%H%M%S")
                    output_file = os.path.join(
                        self.output_dir, f"{start_str}_ongoing.mp4"
                    )
                    fourcc = cv2.VideoWriter_fourcc(*"avc1")
                    writer = cv2.VideoWriter(output_file, fourcc, fps, (width, height))

                if writer:
                    writer.write(frame)
                    frames += 1

        finally:
            if cap:
                cap.release()

            if writer and frames > 0:
                writer.release()
                end_time = datetime.datetime.now(datetime.timezone.utc)
                start_str = start_time.strftime("%Y%m%d%H%M%S")
                end_str = end_time.strftime("%Y%m%d%H%M%S")
                final_file = os.path.join(self.output_dir, f"{start_str}_{end_str}.mp4")
                os.rename(output_file, final_file)
                if self.output_queue:
                    self.output_queue.put(final_file)


if __name__ == "__main__":
    output_dir = "../localdata/video_chunks"
    stream_url = "rtsp://localhost:8554/hackathon"
    file_queue = queue.Queue()

    chunker = VideoStreamChunker(
        stream_url=stream_url,
        output_dir=output_dir,
        chunk_duration=5,
        output_queue=file_queue,
    )

    try:
        chunker.start()
    except KeyboardInterrupt:
        print("Stopping chunker...")
        chunker.stop()
        print("Chunker stopped.")
