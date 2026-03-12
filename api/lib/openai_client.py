import os
from openai import OpenAI

_client = None

def get_client() -> OpenAI:
    """Returns a shared OpenAI client instance."""
    global _client
    if _client is not None:
        return _client
    _client = OpenAI(api_key=os.environ["OPENAI_API_KEY"])
    return _client


def chat(
    system_prompt: str,
    user_prompt: str,
    max_tokens: int = 500,
    temperature: float = 0.7,
    json_mode: bool = False,
) -> str:
    """
    Simple chat completion wrapper.

    Args:
        system_prompt: Sets the AI's role and behaviour
        user_prompt:   The actual content/question
        max_tokens:    Max length of the response
        temperature:   0.0 = deterministic, 1.0 = creative
        json_mode:     If True, forces the response to be valid JSON

    Returns:
        The response text as a string.
    """
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
    """
    Chat completion with full conversation history.
    Used by the /chat endpoint for multi-turn journal conversations.

    messages format: [{"role": "user"|"assistant", "content": "..."}]
    """
    client = get_client()

    full_messages = [{"role": "system", "content": system_prompt}] + messages

    response = client.chat.completions.create(
        model="gpt-4o-mini",
        messages=full_messages,
        max_tokens=max_tokens,
        temperature=temperature,
    )
    return response.choices[0].message.content.strip()