import base64
import json
import logging
import os
import queue
import random
from datetime import datetime
from typing import Any, Dict, List, Optional, Union

import cv2
import numpy as np
from openai import OpenAI

logger = logging.getLogger(__name__)

DEFAULT_SYSTEM_PROMPT = (
    "You are a video analytics agent specialized in factual event detection.\n"
    "Your task is to determine, based strictly on visual and contextual evidence, "
    "whether specific events occurred in the video.\n"
    "Do not infer or assume beyond what is clearly supported by the video and context.\n"
    "Use only the visual content and the following context when making determinations: "
    "{context}\n"
    "Format your response as JSON."
)

DEFAULT_USER_PROMPT = (
    "Based on the sequence of frames and the provided context, analyze whether "
    "the following events occurred. Respond with a factual assessment of each event:\n"
    "{events_list}"
)

DEFAULT_EVENT_LIST_ITEM = "- {event_code}: {event_description} {detection_guidelines}"


class VideoEventDetector:
    """A class for detecting events in videos using LLM vision capabilities.

    This class handles extracting frames from videos, converting them to base64 format,
    and sending them to the Llama API for event detection analysis.
    """

    def __init__(
        self,
        model: str,
        base_url: str,
        api_key: str,
        output_queue: Optional[queue.Queue] = None,
    ) -> None:
        """Initialize the VideoEventDetector with API key and model.

        Args:
            model: Model name to use for event detection.
            base_url: Base URL for the API.
            api_key: API key for authentication.
            output_queue: Optional queue to send detection results to.

        Raises:
            ValueError: If model is not provided or API key is not available.
        """

        self.model: str = model
        self.base_url: str = base_url
        self.api_key: str = api_key
        self.output_queue: Optional[queue.Queue] = output_queue

        if not self.api_key:
            raise ValueError("API key must be provided")

        try:
            self.client: OpenAI = OpenAI(api_key=api_key, base_url=base_url)
        except Exception as e:
            logger.error(f"Failed to initialize OpenAI client: {e}")
            raise

        self.system_prompt: str = DEFAULT_SYSTEM_PROMPT
        self.user_prompt: str = DEFAULT_USER_PROMPT
        self.event_list_item: str = DEFAULT_EVENT_LIST_ITEM

    def video_to_frames(
        self, video_path: str, time_based_sampling: str = "random"
    ) -> List[str]:
        """Extract frames from video file and return as base64 strings.

        Args:
            video_path: Path to the video file.
            time_based_sampling: Method to extract frames:
                                "first" - first frame in each second
                                "last" - last frame in each second
                                "random" - random frame within each second

        Returns:
            List of frames as base64 encoded strings.
        """
        frames: List[str] = []
        cap = None
        try:
            cap = cv2.VideoCapture(video_path)
            if not cap.isOpened():
                logger.error(f"Could not open video file {video_path}")
                return frames

            total_frames = int(cap.get(cv2.CAP_PROP_FRAME_COUNT))
            fps = cap.get(cv2.CAP_PROP_FPS)
            if fps <= 0:
                logger.warning(
                    f"Invalid FPS ({fps}) detected for {video_path}. Assuming 30 FPS."
                )
                fps = 30

            duration_seconds = int(total_frames / fps)

            frame_indices = self._calculate_frame_indices(
                duration_seconds, fps, time_based_sampling, total_frames
            )

            for frame_idx in frame_indices:
                cap.set(cv2.CAP_PROP_POS_FRAMES, frame_idx)
                success, frame = cap.read()
                if success:
                    frame_base64 = self._convert_to_base64(frame)
                    if frame_base64:
                        frames.append(frame_base64)
                else:
                    logger.warning(
                        f"Failed to read frame at index {frame_idx} from {video_path}"
                    )

        except cv2.error as e:
            logger.error(f"OpenCV error processing video {video_path}: {e}")
        except Exception as e:
            logger.error(f"Unexpected error processing video {video_path}: {e}")
        finally:
            if cap is not None and cap.isOpened():
                cap.release()

        return frames

    def _calculate_frame_indices(
        self, duration_seconds: int, fps: float, sampling_method: str, total_frames: int
    ) -> List[int]:
        """Calculate which frame indices to extract based on sampling method.

        Args:
            duration_seconds: Duration of the video in seconds.
            fps: Frames per second of the video.
            sampling_method: Method for selecting frames ("first", "last", or "random").
            total_frames: Total number of frames in the video.

        Returns:
            List of frame indices to extract.
        """
        frame_indices: List[int] = []
        if duration_seconds <= 0 or fps <= 0 or total_frames <= 0:
            logger.warning(
                f"Invalid video parameters for frame index calculation: duration={duration_seconds}, fps={fps}, total_frames={total_frames}"
            )
            return frame_indices

        for second in range(duration_seconds):
            start_frame = int(second * fps)
            end_frame = int((second + 1) * fps) - 1
            end_frame = min(max(0, end_frame), total_frames - 1)
            start_frame = min(max(0, start_frame), end_frame)

            if start_frame > end_frame:
                logger.warning(
                    f"Calculated start_frame {start_frame} > end_frame {end_frame} for second {second}. Skipping."
                )
                continue

            try:
                if sampling_method == "first":
                    frame_index = start_frame
                elif sampling_method == "last":
                    frame_index = end_frame
                elif sampling_method == "random":
                    frame_index = random.randint(start_frame, end_frame)
                else:
                    logger.warning(
                        f"Unknown sampling method: {sampling_method}. Using first frame."
                    )
                    frame_index = start_frame
                frame_indices.append(frame_index)
            except ValueError as e:
                logger.error(
                    f"Error calculating random frame index between {start_frame} and {end_frame}: {e}. Using start frame."
                )
                frame_indices.append(start_frame)

        return frame_indices

    def _convert_to_base64(self, frame: np.ndarray) -> Optional[str]:
        """Convert an OpenCV frame to base64 format.

        Args:
            frame: OpenCV image frame as numpy array.

        Returns:
            Base64 encoded string of the image or None if conversion fails.
        """
        try:
            success, buffer = cv2.imencode(".png", frame)
            if success:
                frame_base64 = base64.b64encode(buffer).decode("utf-8")
                return f"data:image/png;base64,{frame_base64}"
            else:
                logger.warning("Failed to encode frame to PNG.")
                return None
        except cv2.error as e:
            logger.error(f"OpenCV error encoding frame: {e}")
            return None
        except Exception as e:
            logger.error(f"Unexpected error encoding frame: {e}")
            return None

    def _build_system_message(self, context: str) -> Dict[str, str]:
        """Create the system message for the API request.

        Args:
            context: Context to include in the prompt.

        Returns:
            System message dictionary.
        """
        return {
            "role": "system",
            "content": self.system_prompt.format(context=context),
        }

    def _build_user_message(
        self, frames: List[str], events: List[Dict[str, str]]
    ) -> Dict[str, List[Dict[str, Any]]]:
        """Create the user message with event list and frames for the API request.

        Args:
            frames: List of base64 encoded frames.
            events: List of event dictionaries with event_code, event_description,
                   and detection_guidelines.

        Returns:
            User message dictionary with text and image content.
        """
        events_list = "\n".join(
            self.event_list_item.format(
                event_code=event["event_code"],
                event_description=event["event_description"],
                detection_guidelines=event.get("detection_guidelines", ""),
            )
            for event in events
        )

        content = [
            {
                "type": "text",
                "text": self.user_prompt.format(events_list=events_list),
            }
        ]

        for frame in frames:
            content.append(
                {
                    "type": "image_url",
                    "image_url": {
                        "url": frame,
                    },
                }
            )

        return {"role": "user", "content": content}

    def _create_json_schema(self) -> Dict[str, Any]:
        """Create the JSON schema for response validation.

        Returns:
            JSON schema definition.
        """
        return {
            "schema": {
                "type": "object",
                "properties": {
                    "events": {
                        "type": "array",
                        "items": {
                            "type": "object",
                            "properties": {
                                "event_code": {"type": "string"},
                                "detected": {"type": "boolean"},
                                "explanation": {"type": "string"},
                            },
                            "required": ["event_code", "detected", "explanation"],
                        },
                    }
                },
                "required": ["events"],
            }
        }

    def _extract_timestamp_from_filename(self, filename: str) -> Optional[datetime]:
        """Extract timestamp from video filename.

        Args:
            filename: Video filename in format like "20250504020824_20250504020829.mp4"

        Returns:
            Datetime object extracted from the second part of filename (after underscore)
        """
        try:
            filename_base = os.path.splitext(os.path.basename(filename))[0]
            filename_parts = filename_base.split("_")
            if len(filename_parts) > 1:
                timestamp_str = filename_parts[1]
                if len(timestamp_str) == 14:
                    timestamp = datetime.strptime(timestamp_str, "%Y%m%d%H%M%S")
                    return timestamp
                else:
                    logger.warning(
                        f"Timestamp part '{timestamp_str}' in filename {filename} has incorrect length."
                    )
            else:
                logger.warning(
                    f"Could not split filename {filename} by '_' to find timestamp."
                )
        except (ValueError, IndexError) as e:
            logger.warning(f"Could not extract timestamp from filename {filename}: {e}")
        except Exception as e:
            logger.error(f"Unexpected error extracting timestamp from {filename}: {e}")
        return None

    def detect_events(
        self,
        video_path: str,
        events: List[Dict[str, str]],
        context: str,
        time_based_sampling: str = "random",
    ) -> Optional[Dict[str, Any]]:
        """Detect events in video using context and events criteria.

        Args:
            video_path: Path to the video file.
            events: List of event dictionaries with keys:
                   event_code, event_description, detection_guidelines.
            context: Context description for the video analysis.
            time_based_sampling: Method for extracting frames ("first", "last", or "random").

        Returns:
            Detection results with events analysis or error message.

        Raises:
            ValueError: If context is not provided.
        """
        if not context:
            logger.error("Context must be provided for event detection.")
            raise ValueError("Context must be provided")
        if not events:
            logger.warning(
                f"No events specified for detection in video {video_path}. Returning empty results."
            )
            return {"events": []}

        logger.info(f"Starting event detection for {video_path}")
        frames = self.video_to_frames(
            video_path, time_based_sampling=time_based_sampling
        )

        if not frames:
            logger.warning(
                f"No frames extracted from {video_path}. Cannot perform event detection."
            )
            return {"error": "No frames could be extracted from the video"}

        logger.info(
            f"Extracted {len(frames)} frames from {video_path}. Sending to LLM."
        )

        try:
            system_message = self._build_system_message(context)
            user_message = self._build_user_message(frames, events)
            json_schema = self._create_json_schema()

            response = self.client.chat.completions.create(
                model=self.model,
                messages=[system_message, user_message],
                response_format={"type": "json_schema", "json_schema": json_schema},
            )

            results_content = response.choices[0].message.content
            results = json.loads(results_content)
            logger.info(f"Received LLM response for {video_path}")

        except json.JSONDecodeError as e:
            logger.error(
                f"Failed to decode JSON response from LLM for {video_path}: {e}. Response content: {results_content}"
            )
            return {"error": "Failed to decode LLM response"}
        except Exception as e:
            logger.error(f"Error calling LLM API for {video_path}: {e}")
            return {"error": f"LLM API call failed: {e}"}

        if self.output_queue is not None:
            try:
                video_filename = os.path.basename(video_path)
                timestamp = (
                    self._extract_timestamp_from_filename(video_filename)
                    or datetime.now()
                )

                event_video_url = video_path

                if "events" in results:
                    detected_events_count = 0
                    for event in results["events"]:
                        if event.get("detected") is True:
                            event_description = "Unknown event description"
                            for event_def in events:
                                if event_def.get("event_code") == event.get(
                                    "event_code"
                                ):
                                    event_description = event_def.get(
                                        "event_description", "Unknown event description"
                                    )
                                    break

                            event_alert = {
                                "event_timestamp": timestamp,
                                "event_code": event.get("event_code", "unknown-code"),
                                "event_description": event_description,
                                "event_detection_explanation_by_ai": event.get(
                                    "explanation", ""
                                ),
                                "event_video_url": event_video_url,
                            }

                            try:
                                self.output_queue.put(event_alert)
                                detected_events_count += 1
                            except queue.Full:
                                logger.error(
                                    "Output queue is full. Dropping event alert."
                                )
                            except Exception as qe:
                                logger.error(
                                    f"Error putting event alert into queue: {qe}"
                                )
                    if detected_events_count > 0:
                        logger.info(
                            f"Queued {detected_events_count} detected events from {video_path}"
                        )
                else:
                    logger.warning(
                        f"LLM response for {video_path} did not contain 'events' key."
                    )
            except Exception as e:
                logger.error(
                    f"Error processing LLM results or queuing event alerts for {video_path}: {e}"
                )

        return results
