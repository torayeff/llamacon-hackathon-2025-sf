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


def build_user_message(prompt, frames):
    content = [
        {
            "type": "text",
            "text": prompt,
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


response = client.chat.completions.create(
    model=model,
    messages=[build_user_message(prompt, frames[:9])],
)

print(response.choices[0])
