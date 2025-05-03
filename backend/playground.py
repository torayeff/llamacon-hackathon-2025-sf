import base64
import os

from dotenv import load_dotenv
from openai import OpenAI

load_dotenv()

model = "Llama-4-Maverick-17B-128E-Instruct-FP8"

client = OpenAI(
    api_key=os.environ.get("LLAMA_API_KEY"), base_url="https://api.llama.com/compat/v1/"
)

prompt = "Wha colour is the floor to the right of the image?"
with open("../localdata/example.png", "rb") as image_file:
    b64_image = base64.b64encode(image_file.read()).decode("utf-8")

response = client.chat.completions.create(
    model=model,
    messages=[
        {
            "role": "user",
            "content": [
                {
                    "type": "text",
                    "text": prompt,
                },
                {
                    "type": "image_url",
                    "image_url": {
                        "url": f"data:image/png;base64,{b64_image}",
                    },
                },
            ],
        }
    ],
)

print(response.choices[0])
