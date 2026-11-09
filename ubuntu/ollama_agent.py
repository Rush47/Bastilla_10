"""Real local Ollama inference for the independent System agent."""
from __future__ import annotations
import os
import httpx

STANDARD_OLLAMA_MODEL = "dolphin-llama3:8b"


class OllamaUnavailable(RuntimeError):
    pass


async def chat(message: str, model: str | None = None) -> dict:
    if not message.strip():
        raise ValueError("Message cannot be empty")
    if len(message) > 32000:
        raise ValueError("Message exceeds 32000 characters")
    if model is not None and model != STANDARD_OLLAMA_MODEL:
        raise ValueError(f"Only the standard model {STANDARD_OLLAMA_MODEL} is allowed")
    base = (os.getenv("OLLAMA_BASE_URL", "").strip() or "http://127.0.0.1:11434").rstrip("/")
    try:
        async with httpx.AsyncClient(timeout=httpx.Timeout(180.0, connect=5.0), trust_env=False) as client:
            response = await client.post(base + "/api/chat", json={
                "model": STANDARD_OLLAMA_MODEL,
                "messages": [{"role": "user", "content": message}],
                "stream": False,
            })
            response.raise_for_status()
            result = response.json()
    except (httpx.HTTPError, ValueError) as exc:
        raise OllamaUnavailable(
            f"Required model {STANDARD_OLLAMA_MODEL} unavailable: {type(exc).__name__}; no replacement was selected"
        ) from exc
    if not isinstance(result, dict) or result.get("model") != STANDARD_OLLAMA_MODEL:
        raise OllamaUnavailable(f"Ollama did not confirm the required model {STANDARD_OLLAMA_MODEL}")
    payload = result.get("message")
    answer = payload.get("content") if isinstance(payload, dict) else None
    if not isinstance(answer, str) or not answer.strip():
        raise OllamaUnavailable("Ollama returned no message content")
    return {
        "agent": "System", "provider": "ollama", "model": STANDARD_OLLAMA_MODEL,
        "response": answer, "done": result.get("done", False),
    }
