import os

from dotenv import load_dotenv
from openai import OpenAI
from utils import video_to_frames

load_dotenv()

model = "Llama-4-Maverick-17B-128E-Instruct-FP8"

client = OpenAI(
    api_key=os.environ.get("LLAMA_API_KEY"), base_url="https://api.llama.com/compat/v1/"
)

prompt = (
    "Explain what is happening in these video frames which are sampled every 1 second."
)
frames = video_to_frames(
    "../localdata/no_error_example.mp4", time_based_sampling="random", as_base64=True
)

CONTEXT = "These frames are sampled every 1 second from a video of a robotic arm. The sequences depict a warehouse environment with a robotic arm and a conveyor belt."

SYSTEM_PROMPT = """You are a video analytics agent specialized in factual event detection.
    Your task is to determine, based strictly on visual and contextual evidence, whether specific events occurred in the video.
    Do not infer or assume beyond what is clearly supported by the video and context.
    Use only the visual content and the following context when making determinations: {context}"""

USER_PROMPT = """Based on the the sequence of frames and the provided context, analyze whether the following events occurred. Respond with a factual assessment of each event\n: {events_list}"""

EVENT_LIST_ITEM = "- {event_code}: {event_description} {detection_guidelines}"

events = [
    {
        "event_code": "robot-is-idle",
        "event_description": "The robotic arm hasn't moved for the whole duration of the video.",
        "detection_guidelines": "This event must be detected if and only if the robot hasn't moved for the whole duration of the video and the green light is on.",
    },
    {
        "event_code": "robot-in-error",
        "event_description": "The robot is in error state.",
        "detection_guidelines": "This event must be detected if and only if the robot hasn't moved for the whole duration of the video and the red light is on.",
    },
]


def build_system_message(prompt, context):
    return {
        "role": "system",
        "content": prompt.format(context=context),
    }


def build_user_message(frames, prompt, events):
    events_list = "\n".join(
        EVENT_LIST_ITEM.format(
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


system_message = build_system_message(SYSTEM_PROMPT, CONTEXT)
user_message = build_user_message(frames=frames[:5], prompt=USER_PROMPT, events=events)

response = client.chat.completions.create(
    model=model,
    messages=[system_message, user_message],
)

print(response.choices[0])
