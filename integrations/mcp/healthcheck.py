"""Read-only MCP handshake used by Codespaces readiness checks."""
import asyncio
import os
from mcp import ClientSession
from mcp.client.streamable_http import streamablehttp_client

async def main():
    url = os.environ.get("BASTILLA_MCP_URL", "http://127.0.0.1:8000/mcp/")
    async with streamablehttp_client(url, timeout=5) as (read, write, _):
        async with ClientSession(read, write) as session:
            await session.initialize()
            names = {item.name for item in (await session.list_tools()).tools}
            required = {"ollama_status", "agents_status", "vm_status"}
            if not required.issubset(names):
                raise RuntimeError(f"Missing tools: {sorted(required - names)}")
            print("MCP handshake OK; tools:", ", ".join(sorted(names)))

if __name__ == "__main__":
    asyncio.run(main())
