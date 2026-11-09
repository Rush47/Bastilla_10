from contextlib import asynccontextmanager
import os
import httpx
from fastapi import FastAPI, HTTPException, Request
from fastapi.responses import StreamingResponse
from pydantic import BaseModel
from .core import AGENTS, Orchestrator, observe_system
from .ollama_agent import chat as ollama_chat, OllamaUnavailable
from .svl_registry import SVLSystemKernel
from .workspace_sync import workspace_events

engine = Orchestrator()

@asynccontextmanager
async def lifespan(app: FastAPI):
    yield

app = FastAPI(title="Ubuntu AI System", lifespan=lifespan)

class TaskRequest(BaseModel):
    agent: str
    type: str = "observe"

@app.get("/api/health")
async def health():
    return {"status": "ok", "agents": AGENTS, "runtime": "ubuntu-python"}

@app.get("/api/observe")
async def observe():
    return await observe_system()

@app.get("/api/tasks")
async def tasks():
    return list(engine.tasks.values())

@app.post("/api/tasks", status_code=202)
async def create_task(req: TaskRequest):
    try:
        task = await engine.create(req.agent, req.type)
        workspace_events.publish('tasks')
        return task
    except ValueError as exc:
        raise HTTPException(400, str(exc))

class ChatRequest(BaseModel):
    message: str
    model: str | None = None

@app.get("/api/agents")
async def agent_profiles():
    return SVLSystemKernel().generate_system_status_report()

@app.post("/api/agents/system/chat")
async def system_chat(req: ChatRequest):
    try:
        response = await ollama_chat(req.message, req.model)
        workspace_events.publish('chat')
        return response
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc))
    except OllamaUnavailable as exc:
        raise HTTPException(status_code=503, detail=str(exc))

@app.get("/api/diagnostics/agents")
async def agents_diagnostics():
    report = SVLSystemKernel().generate_system_status_report()
    base = os.getenv("OLLAMA_BASE_URL", "http://127.0.0.1:11434").rstrip("/")
    model = os.getenv("OLLAMA_MODEL", "dolphin3:8b")
    fallback = os.getenv("OLLAMA_FALLBACK_MODEL", "gemma4-e4b-ultra-uncensored")
    try:
        async with httpx.AsyncClient(timeout=3, trust_env=False) as client:
            response = await client.get(base + "/api/tags")
            response.raise_for_status()
            available = [entry.get("name") for entry in response.json().get("models", [])]
        installed = model in available
        fallback_installed = fallback in available
        report["agents"]["system"]["connection_status"] = "LOCAL_MODEL_AVAILABLE" if installed else "MODEL_NOT_INSTALLED"
        report["agents"]["system"]["connection_label"] = "Model dostępny" if installed else "Model nie jest pobrany"
        report["agents"]["system"]["model"] = model
        report["agents"]["system"]["model_installed"] = installed
        report["agents"]["system"]["fallback_model"] = fallback
        report["agents"]["system"]["fallback_installed"] = fallback_installed
        report["agents"]["system"]["available_for_chat"] = installed or fallback_installed
        report["agents"]["system"]["connection_status"] = "LOCAL_MODEL_AVAILABLE" if installed or fallback_installed else "MODEL_NOT_INSTALLED"
        report["agents"]["system"]["connection_label"] = "Główny model dostępny" if installed else ("Model awaryjny dostępny" if fallback_installed else "Brak zainstalowanych modeli")
    except (httpx.HTTPError, ValueError, KeyError):
        report["agents"]["system"]["connection_status"] = "OLLAMA_UNAVAILABLE"
        report["agents"]["system"]["connection_label"] = "Ollama niedostępna"
        report["agents"]["system"]["model"] = model
        report["agents"]["system"]["model_installed"] = False
        report["agents"]["system"]["fallback_model"] = fallback
        report["agents"]["system"]["fallback_installed"] = False
        report["agents"]["system"]["available_for_chat"] = False
    return report

@app.get("/api/workspace/status")
async def workspace_status():
    return {"mode": "local-live", "revision": workspace_events.revision,
            "subscribers": len(workspace_events.subscribers),
            "scope": "single_backend_process"}

@app.get("/api/workspace/events")
async def workspace_stream(request: Request):
    raw = request.headers.get("last-event-id", "")
    after = int(raw) if raw.isdecimal() else None
    return StreamingResponse(workspace_events.stream(after),
                             media_type="text/event-stream",
                             headers={"Cache-Control": "no-cache, no-transform",
                                      "X-Accel-Buffering": "no"})
