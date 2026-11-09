"""Remote BastillaOS API tools for the existing MCP service.

The remote base URL is configurable. Writes are disabled unless explicitly enabled.
No credentials are stored in source control.
"""
import os
from urllib.parse import urlparse
import httpx
from mcp.server.fastmcp import FastMCP

BASE = os.environ.get("BASTILLA_REMOTE_API_URL", "https://ais-dev-wcohfbaczr2ohtvwiuxtdt-873947482948.europe-west2.run.app/api/").rstrip("/")
TOKEN = os.environ.get("BASTILLA_REMOTE_API_TOKEN", "")
ALLOW_WRITES = os.environ.get("BASTILLA_REMOTE_MCP_WRITES", "0") == "1"
parsed = urlparse(BASE)
if parsed.scheme != "https" or not parsed.hostname or parsed.username or parsed.password:
    raise RuntimeError("BASTILLA_REMOTE_API_URL must be an HTTPS URL")
mcp = FastMCP("BastillaOS Remote API Bridge", host="127.0.0.1", port=8001, json_response=True)

async def post(path: str, payload: dict) -> dict:
    if not ALLOW_WRITES or not TOKEN:
        return {"error": "Remote writes require BASTILLA_REMOTE_MCP_WRITES=1 and BASTILLA_REMOTE_API_TOKEN."}
    headers = {"Authorization": f"Bearer {TOKEN}"} if TOKEN else {}
    async with httpx.AsyncClient(timeout=30, follow_redirects=False) as client:
        response = await client.post(BASE + path, json=payload, headers=headers)
        response.raise_for_status()
        return response.json()

@mcp.tool()
async def remote_agent_task(agent: str, task: str) -> dict:
    """Send a task to an explicitly named BastillaOS agent (requires write opt-in)."""
    if agent not in {"Aria", "Alex", "Astyria", "Aurelius"}:
        return {"error": "Unsupported agent"}
    if not task.strip() or len(task) > 4000:
        return {"error": "Task must contain 1-4000 characters"}
    return await post("/agent-tasks", {"agent": agent, "task": task})

@mcp.tool()
async def remote_app_command(command: str) -> dict:
    """Send a non-shell app command to BastillaOS (requires write opt-in)."""
    if command not in {"SYSTEM_STATUS", "VERSION_TIMELINE", "DATA_STORE_AUDIT"}:
        return {"error": "Command not allowed"}
    return await post("/apps/command", {"command": command})

if __name__ == "__main__":
    mcp.run(transport="streamable-http")
