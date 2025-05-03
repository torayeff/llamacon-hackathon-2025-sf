import base64
import json
import os
import random
from typing import Any, Dict, List, Optional

import cv2
import numpy as np
from dotenv import load_dotenv
from openai import OpenAI


class VideoEventDetector:
    """A class for detecting events in videos using LLM vision capabilities.

    This class handles extracting frames from videos, converting them to base64 format,
    and sending them to the Llama API for event detection analysis.
    """

    def __init__(
        self, api_key: Optional[str] = None, model: Optional[str] = None
    ) -> None:
        """Initialize the VideoEventDetector with API key and model.

        Args:
            api_key: Llama API key. If None, loads from environment.
            model: Model name to use for event detection.

        Raises:
            ValueError: If model is not provided or API key is not available.
        """
        load_dotenv()

        if not model:
            raise ValueError("Model name must be provided")

        self.model: str = model
        api_key = api_key or os.environ.get("LLAMA_API_KEY")

        if not api_key:
            raise ValueError("API key must be provided or available in environment")

        self.client: OpenAI = OpenAI(
            api_key=api_key, base_url="https://api.llama.com/compat/v1/"
        )

        self.system_prompt: str = (
            "You are a video analytics agent specialized in factual event detection.\n"
            "Your task is to determine, based strictly on visual and contextual evidence, "
            "whether specific events occurred in the video.\n"
            "Do not infer or assume beyond what is clearly supported by the video and context.\n"
            "Use only the visual content and the following context when making determinations: "
            "{context}\n"
            "Format your response as JSON."
        )

        self.user_prompt: str = (
            "Based on the sequence of frames and the provided context, analyze whether "
            "the following events occurred. Respond with a factual assessment of each event:\n"
            "{events_list}"
        )

        self.event_list_item: str = (
            "- {event_code}: {event_description} {detection_guidelines}"
        )

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
        cap = cv2.VideoCapture(video_path)

        if not cap.isOpened():
            print(f"Error: Could not open video file {video_path}")
            return frames

        total_frames = int(cap.get(cv2.CAP_PROP_FRAME_COUNT))
        fps = cap.get(cv2.CAP_PROP_FPS)
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

        for second in range(duration_seconds):
            start_frame = int(second * fps)
            end_frame = int((second + 1) * fps) - 1
            end_frame = min(end_frame, total_frames - 1)

            if sampling_method == "first":
                frame_indices.append(start_frame)
            elif sampling_method == "last":
                frame_indices.append(end_frame)
            elif sampling_method == "random":
                frame_indices.append(random.randint(start_frame, end_frame))
            else:
                print(f"Unknown sampling method: {sampling_method}. Using first frame.")
                frame_indices.append(start_frame)

        return frame_indices

    def _convert_to_base64(self, frame: np.ndarray) -> Optional[str]:
        """Convert an OpenCV frame to base64 format.

        Args:
            frame: OpenCV image frame as numpy array.

        Returns:
            Base64 encoded string of the image or None if conversion fails.
        """
        success, buffer = cv2.imencode(".png", frame)
        if success:
            frame_base64 = base64.b64encode(buffer).decode("utf-8")
            return f"data:image/png;base64,{frame_base64}"
        return None

    def visualize_frames(self, frames: List[str]) -> None:
        """Display frames using OpenCV.

        Args:
            frames: List of base64 encoded image frames.
        """
        for i, frame_base64 in enumerate(frames):
            # Convert base64 back to OpenCV format
            base64_data = frame_base64.split(",")[1]
            img_data = base64.b64decode(base64_data)
            nparr = np.frombuffer(img_data, np.uint8)
            frame = cv2.imdecode(nparr, cv2.IMREAD_COLOR)

            cv2.imshow(f"Frame {i}", frame)
            cv2.waitKey(0)
            cv2.destroyAllWindows()

    def _build_system_message(self, prompt: str, context: str) -> Dict[str, str]:
        """Create the system message for the API request.

        Args:
            prompt: System prompt template.
            context: Context to include in the prompt.

        Returns:
            System message dictionary.
        """
        return {
            "role": "system",
            "content": prompt.format(context=context),
        }

    def _build_user_message(
        self, frames: List[str], prompt: str, events: List[Dict[str, str]]
    ) -> Dict[str, List[Dict[str, Any]]]:
        """Create the user message with event list and frames for the API request.

        Args:
            frames: List of base64 encoded frames.
            prompt: User prompt template.
            events: List of event dictionaries with event_code, event_description,
                   and detection_guidelines.

        Returns:
            User message dictionary with text and image content.
        """
        events_list = "\n".join(
            self.event_list_item.format(
                event_code=event["event_code"],
                event_description=event["event_description"],
                detection_guidelines=event["detection_guidelines"],
            )
            for event in events
        )

        content = [
            {
                "type": "text",
                "text": prompt.format(events_list=events_list),
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

    def detect_events(
        self,
        video_path: str,
        events: List[Dict[str, str]],
        context: str,
        time_based_sampling: str = "random",
    ) -> Dict[str, Any]:
        """Detect events in video using context and events criteria.

        Args:
            video_path: Path to the video file.
            events: List of event dictionaries with keys:
                   event_code, event_description, detection_guidelines.
            context: Context description for the video analysis.
            time_based_sampling: Method for extracting frames.

        Returns:
            Detection results with events analysis.

        Raises:
            ValueError: If context is not provided.
        """
        if not context:
            raise ValueError("Context must be provided")

        frames = self.video_to_frames(
            video_path, time_based_sampling=time_based_sampling
        )

        if not frames:
            return {"error": "No frames could be extracted from the video"}

        system_message = self._build_system_message(self.system_prompt, context)
        user_message = self._build_user_message(frames, self.user_prompt, events)
        json_schema = self._create_json_schema()

        response = self.client.chat.completions.create(
            model=self.model,
            messages=[system_message, user_message],
            response_format={"type": "json_schema", "json_schema": json_schema},
        )

        return json.loads(response.choices[0].message.content)


if __name__ == "__main__":
    model = "Llama-4-Maverick-17B-128E-Instruct-FP8"
    context = (
        "These frames are sampled every 1 second from a video of a robotic arm. "
        "The sequences depict a warehouse environment with a robotic arm and a conveyor belt."
    )

    detector = VideoEventDetector(model=model)

    events = [
        {
            "event_code": "robot-is-idle",
            "event_description": "The robotic arm hasn't moved for the whole duration of the video.",
            "detection_guidelines": (
                "This event must be detected if and only if the robot hasn't moved "
                "for the whole duration of the video and the green light is on."
            ),
        },
        {
            "event_code": "robot-in-error",
            "event_description": "The robot is in error state.",
            "detection_guidelines": (
                "This event must be detected if and only if the robot hasn't moved "
                "for the whole duration of the video and the red light is on."
            ),
        },
    ]

    results = detector.detect_events(
        "../localdata/chunk_2.mp4", events=events, context=context
    )

    print(json.dumps(results, indent=2))
