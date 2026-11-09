from contextlib import asynccontextmanager
import os
import httpx
from fastapi import FastAPI, HTTPException, Request
from fastapi.responses import StreamingResponse
from pydantic import BaseModel
from .core import AGENTS, Orchestrator, observe_system
from .ollama_agent import chat as ollama_chat, OllamaUnavailable, STANDARD_OLLAMA_MODEL
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
    base = (os.getenv("OLLAMA_BASE_URL", "").strip() or "http://127.0.0.1:11434").rstrip("/")
    system = report["agents"]["system"]
    system["model"] = STANDARD_OLLAMA_MODEL
    system["model_installed"] = False
    system["available_for_chat"] = False
    try:
        async with httpx.AsyncClient(timeout=3, trust_env=False) as client:
            response = await client.get(base + "/api/tags")
            response.raise_for_status()
            data = response.json()
            entries = data.get("models", []) if isinstance(data, dict) else []
            if not isinstance(entries, list):
                raise ValueError("Invalid Ollama model list")
            installed = any(isinstance(entry, dict) and entry.get("name") == STANDARD_OLLAMA_MODEL for entry in entries)
        system["connection_status"] = "LOCAL_MODEL_AVAILABLE" if installed else "MODEL_NOT_INSTALLED"
        system["connection_label"] = "Model 8B dostępny" if installed else "Wymagany model 8B jest niedostępny"
        system["model_installed"] = installed
        system["available_for_chat"] = installed
    except (httpx.HTTPError, ValueError):
        system["connection_status"] = "OLLAMA_UNAVAILABLE"
        system["connection_label"] = "Ollama niedostępna"
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
