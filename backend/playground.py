import os

from dotenv import load_dotenv
from openai import OpenAI

load_dotenv()

client = OpenAI(
    api_key=os.environ.get("LLAMA_API_KEY"), base_url="https://api.llama.com/compat/v1/"
)

completion = client.chat.completions.create(
    model="Llama-4-Maverick-17B-128E-Instruct-FP8",
    messages=[{"role": "user", "content": "Which planet do humans live on?"}],
)

print(completion.choices[0].message.content)
