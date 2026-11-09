"""Ubuntu worker core: real local telemetry, no synthetic task completion."""
from __future__ import annotations
import asyncio
import json
import os
import pathlib
import time
import uuid
from datetime import datetime, timezone

AGENTS = ("Aria", "Alex", "Astyria", "Aurelius", "System")
DIMENSIONS = ("code", "logs", "processes", "models", "agents", "security", "resources")

def now():
    return datetime.now(timezone.utc).isoformat()

async def observe_system():
    """Collect only data accessible to the running OS account."""
    async def processes():
        proc = pathlib.Path("/proc")
        if not proc.is_dir():
            return {"available": False}
        return {"visible_pid_count": sum(p.name.isdigit() for p in proc.iterdir())}
    async def resources():
        mem = pathlib.Path("/proc/meminfo")
        return {"meminfo": mem.read_text().splitlines()[:4]} if mem.exists() else {"available": False}
    async def models():
        import httpx
        url = os.getenv("OLLAMA_BASE_URL", "http://127.0.0.1:11434").rstrip("/")
        async with httpx.AsyncClient(timeout=3) as client:
            r = await client.get(url + "/api/tags")
            r.raise_for_status()
            return {"models": [m.get("name") for m in r.json().get("models", [])]}
    probes = {"processes": processes, "resources": resources, "models": models}
    async def one(name):
        if name not in probes:
            return {"dimension": name, "status": "not_connected"}
        try:
            return {"dimension": name, "status": "ok", "data": await asyncio.wait_for(probes[name](), timeout=5)}
        except Exception as exc:
            return {"dimension": name, "status": "error", "error": type(exc).__name__}
    return {"timestamp": now(), "dimensions": await asyncio.gather(*(one(d) for d in DIMENSIONS))}

class Orchestrator:
    def __init__(self, store=None):
        self.store = pathlib.Path(store or os.getenv("WORKER_STATE_PATH", ".data/tasks.json"))
        self.lock = asyncio.Lock()
        self.tasks = {}
        if self.store.exists():
            self.tasks = json.loads(self.store.read_text())
            for task in self.tasks.values():
                if task["status"] == "running":
                    task["status"] = "interrupted"
                    task["updated_at"] = now()
            self._save()
    def _save(self):
        self.store.parent.mkdir(parents=True, exist_ok=True)
        tmp = self.store.with_suffix(".tmp")
        tmp.write_text(json.dumps(self.tasks, ensure_ascii=False, indent=2))
        os.replace(tmp, self.store)
    async def create(self, agent, task_type):
        if agent not in AGENTS or task_type != "observe":
            raise ValueError("Unsupported agent or task type")
        async with self.lock:
            task_id = str(uuid.uuid4())
            self.tasks[task_id] = {"id": task_id, "agent": agent, "type": task_type, "status": "queued", "created_at": now()}
            self._save()
        asyncio.create_task(self.run(task_id))
        return self.tasks[task_id].copy()
    async def run(self, task_id):
        async with self.lock:
            self.tasks[task_id].update(status="running", updated_at=now())
            self._save()
        try:
            result = await observe_system()
            async with self.lock:
                self.tasks[task_id].update(status="completed", result=result, updated_at=now())
                self._save()
        except Exception as exc:
            async with self.lock:
                self.tasks[task_id].update(status="failed", error=str(exc), updated_at=now())
                self._save()
