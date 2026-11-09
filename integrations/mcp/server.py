"""BastillaOS MCP bridge; read-only tools are enabled by default.

Run on the same host as BastillaOS. Do not expose this service directly to
the public internet: place it behind HTTPS with authenticated access.
"""
import os
import httpx
from mcp.server.fastmcp import FastMCP

BASE = os.environ.get("BASTILLA_API_URL", "http://127.0.0.1:3000").rstrip("/")
TIMEOUT = float(os.environ.get("BASTILLA_API_TIMEOUT", "90"))
READ_ONLY = os.environ.get("BASTILLA_MCP_READ_ONLY", "1").strip().lower() not in {"0", "false", "no"}
mcp = FastMCP("BastillaOS Ollama Bridge", host="127.0.0.1", port=8000, json_response=True)

async def request(method: str, path: str, payload=None):
    async with httpx.AsyncClient(timeout=TIMEOUT, trust_env=False) as client:
        response = await client.request(method, BASE + path, json=payload)
        response.raise_for_status()
        return response.json()

@mcp.tool()
async def ollama_status() -> dict:
    """Read live local Ollama connectivity and model status."""
    try:
        return await request("GET", "/api/ollama/models")
    except httpx.HTTPStatusError as exc:
        # An offline Ollama returns HTTP 503 with a structured diagnostic.
        # Keep that state visible instead of marking the MCP transport broken.
        if exc.response.status_code == 503:
            data = exc.response.json()
            if isinstance(data, dict) and data.get("connected") is False:
                return data
        raise

@mcp.tool()
async def agents_status() -> dict:
    """Read Aria, Alex, Astyria and Aurelius background connectivity diagnostics.

    This endpoint reports Ollama/model monitoring, not proof of active inference.
    """
    return await request("GET", "/api/agents/background/status")

@mcp.tool()
async def vm_status() -> dict:
    """Read VM configuration and runtime status without starting a VM."""
    configuration = await request("GET", "/api/vm-gemini-4/status")
    try:
        runtime = await request("GET", "/api/vm-gemini-4/runtime")
    except httpx.HTTPStatusError as exc:
        if exc.response.status_code != 503:
            raise
        runtime = {"success": False, "error": "Docker runtime unavailable"}
    return {"configuration": configuration, "runtime": runtime}

async def agent_command(agent: str = "triad", command: str = "SYSTEM_STATUS") -> dict:
    """Run an allowlisted diagnostic; the BastillaOS API records its transcript."""
    if agent not in {"triad", "Alex", "Astyria", "Aurelius"}:
        raise ValueError("Unsupported agent role")
    if command not in {"SYSTEM_STATUS", "DATA_STORE_AUDIT", "VERSION_TIMELINE"}:
        raise ValueError("Unsupported diagnostic command")
    return await request("POST", "/api/triad/command", {"agent": agent, "command": command})

if not READ_ONLY:
    mcp.tool()(agent_command)

if __name__ == "__main__":
    # Bind only to loopback. Use a separately authenticated HTTPS reverse proxy.
    mcp.run(transport="streamable-http")
