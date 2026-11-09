"""Real local Ollama inference for the independent System agent."""
from __future__ import annotations
import os
import httpx

class OllamaUnavailable(RuntimeError):
    pass

async def chat(message: str, model: str | None = None) -> dict:
    if not message.strip():
        raise ValueError("Message cannot be empty")
    if len(message) > 32000:
        raise ValueError("Message exceeds 32000 characters")
    base = os.getenv("OLLAMA_BASE_URL", "http://127.0.0.1:11434").rstrip("/")
    chosen = model or os.getenv("OLLAMA_MODEL", "dolphin3:8b")
    fallback = os.getenv("OLLAMA_FALLBACK_MODEL", "gemma4-e4b-ultra-uncensored")
    candidates = [chosen] if model else list(dict.fromkeys([chosen, fallback]))
    errors = []
    result = None
    used_model = chosen
    async with httpx.AsyncClient(timeout=httpx.Timeout(180.0, connect=5.0), trust_env=False) as client:
        for candidate in candidates:
            try:
                response = await client.post(base + "/api/chat", json={
                    "model": candidate, "messages": [{"role": "user", "content": message}], "stream": False})
                response.raise_for_status()
                result = response.json()
                used_model = candidate
                break
            except (httpx.HTTPError, ValueError) as exc:
                errors.append(f"{candidate}: {type(exc).__name__}")
    if result is None:
        raise OllamaUnavailable("Ollama models unavailable: " + "; ".join(errors))
    answer = result.get("message", {}).get("content")
    if not isinstance(answer, str):
        raise OllamaUnavailable("Ollama returned no message content")
    return {"agent": "System", "provider": "ollama", "model": result.get("model", used_model),
            "response": answer, "done": result.get("done", False)}
