import base64
import random

import cv2


def video_to_frames(
    video_path,
    time_based_sampling="first",
    as_base64=False,
):
    """
    Reads a video file and returns an array of frames, one frame per second.

    Args:
        video_path (str): Path to the video file
        time_based_sampling (str): Method to extract exactly one frame per second:
                                  "first" - first frame in each second
                                  "last" - last frame in each second
                                  "random" - random frame within each second
        as_base64 (bool): If True, returns frames as base64 encoded strings

    Returns:
        list: Array of frames as numpy arrays or base64 strings
    """
    frames = []
    cap = cv2.VideoCapture(video_path)

    if not cap.isOpened():
        print(f"Error: Could not open video file {video_path}")
        return frames

    # Get video properties
    total_frames = int(cap.get(cv2.CAP_PROP_FRAME_COUNT))
    fps = cap.get(cv2.CAP_PROP_FPS)
    duration_seconds = int(total_frames / fps)

    frame_indices = []

    for second in range(duration_seconds):
        start_frame = int(second * fps)
        end_frame = int((second + 1) * fps) - 1
        end_frame = min(end_frame, total_frames - 1)

        if time_based_sampling == "first":
            frame_indices.append(start_frame)
        elif time_based_sampling == "last":
            frame_indices.append(end_frame)
        elif time_based_sampling == "random":
            frame_indices.append(random.randint(start_frame, end_frame))
        else:
            print(f"Unknown sampling method: {time_based_sampling}. Using first frame.")
            frame_indices.append(start_frame)

    for frame_idx in frame_indices:
        cap.set(cv2.CAP_PROP_POS_FRAMES, frame_idx)
        success, frame = cap.read()

        if success:
            if as_base64:
                success, buffer = cv2.imencode(".png", frame)
                if success:
                    frame_base64 = base64.b64encode(buffer).decode("utf-8")
                    frames.append(f"data:image/png;base64,{frame_base64}")
            else:
                frames.append(frame)

    cap.release()
    return frames


def visualize_frames(frames):
    """
    Visualizes a list of frames using OpenCV.

    Args:
        frames (list): List of frames to visualize
    """
    for frame in frames:
        cv2.imshow("Frame", frame)
        cv2.waitKey(0)
