import os
import httpx
from openai import OpenAI

_client = None

def get_client() -> OpenAI:
    global _client
    if _client is not None:
        return _client
    _client = OpenAI(
        api_key=os.environ["OPENAI_API_KEY"],
        http_client=httpx.Client(
            timeout=30.0,
            follow_redirects=True,
        )
    )
    return _client


def chat(
    system_prompt: str,
    user_prompt: str,
    max_tokens: int = 500,
    temperature: float = 0.7,
    json_mode: bool = False,
) -> str:
    client = get_client()

    kwargs = {
        "model": "gpt-4o-mini",
        "messages": [
            {"role": "system", "content": system_prompt},
            {"role": "user",   "content": user_prompt},
        ],
        "max_tokens":  max_tokens,
        "temperature": temperature,
    }

    if json_mode:
        kwargs["response_format"] = {"type": "json_object"}

    response = client.chat.completions.create(**kwargs)
    return response.choices[0].message.content.strip()


def chat_with_history(
    system_prompt: str,
    messages: list[dict],
    max_tokens: int = 800,
    temperature: float = 0.7,
) -> str:
    client = get_client()

    full_messages = [{"role": "system", "content": system_prompt}] + messages

    response = client.chat.completions.create(
        model="gpt-4o-mini",
        messages=full_messages,
        max_tokens=max_tokens,
        temperature=temperature,
    )
    return response.choices[0].message.content.strip()