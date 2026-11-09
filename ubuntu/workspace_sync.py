"""Local live state-change notifications inspired by Bastilla workspace SSE design.

Only metadata is sent. No shell output, chat content or secrets.
"""
import asyncio
from collections import deque
from datetime import datetime, timezone

class WorkspaceEvents:
    def __init__(self):
        self.revision = 0
        self.history = deque(maxlen=120)
        self.subscribers = set()

    def publish(self, topic):
        if topic not in {"chat", "tasks", "agents", "diagnostics", "workspace"}:
            raise ValueError("Invalid topic")
        self.revision += 1
        event = {"id": self.revision, "topic": topic,
                 "at": datetime.now(timezone.utc).isoformat()}
        self.history.append(event)
        for queue in tuple(self.subscribers):
            try:
                queue.put_nowait(event)
            except asyncio.QueueFull:
                self.subscribers.discard(queue)
        return event

    async def stream(self, after=None):
        import json
        queue = asyncio.Queue(maxsize=64)
        self.subscribers.add(queue)
        try:
            yield ": connected\n\n"
            if after is not None:
                for event in tuple(self.history):
                    if event["id"] > after:
                        yield self.format(event)
            while True:
                try:
                    event = await asyncio.wait_for(queue.get(), timeout=20)
                    yield self.format(event)
                except asyncio.TimeoutError:
                    yield ": heartbeat\n\n"
        finally:
            self.subscribers.discard(queue)

    @staticmethod
    def format(event):
        import json
        return "id: {}\nevent: change\ndata: {}\n\n".format(
            event["id"], json.dumps(event, ensure_ascii=False))

workspace_events = WorkspaceEvents()
