"""BastillaOS as an MCP CLIENT: connect to an independently hosted MCP server.

Usage:
  BASTILLA_REMOTE_MCP_URL=https://mcp.example.com/mcp python integrations/mcp/client.py
  BASTILLA_REMOTE_MCP_URL=http://127.0.0.1:8000/mcp python integrations/mcp/client.py --call ollama_status

Remote servers are untrusted. Only explicitly approved tool names may be called.
Never place credentials in URLs. Configure authorization out-of-band.
"""
import argparse
import asyncio
import os
from urllib.parse import urlparse

from mcp import ClientSession
from mcp.client.streamable_http import streamablehttp_client

ALLOWED_TOOLS = {"ollama_status", "agents_status", "vm_status"}
MAX_OUTPUT = 12000


def validated_url(raw: str) -> str:
    parsed = urlparse(raw)
    if parsed.scheme != "https" and not (
        parsed.scheme == "http" and parsed.hostname in {"127.0.0.1", "localhost", "::1"}
    ):
        raise ValueError("Remote MCP must use HTTPS (except localhost)")
    if not parsed.netloc or parsed.username or parsed.password or parsed.query or parsed.fragment:
        raise ValueError("Invalid MCP URL; credentials and query strings are forbidden")
    return raw


async def main():
    parser = argparse.ArgumentParser(description="BastillaOS outbound MCP client")
    parser.add_argument("--call", choices=sorted(ALLOWED_TOOLS), help="Call an approved diagnostic tool")
    args = parser.parse_args()
    raw = os.environ.get("BASTILLA_REMOTE_MCP_URL")
    if not raw:
        parser.error("Set BASTILLA_REMOTE_MCP_URL to an existing MCP server endpoint")
    url = validated_url(raw)
    async with streamablehttp_client(url) as (read, write, _):
        async with ClientSession(read, write) as session:
            await session.initialize()
            available = {tool.name for tool in (await session.list_tools()).tools}
            print("MCP client handshake: OK")
            print("Approved tools available:", ", ".join(sorted(available & ALLOWED_TOOLS)) or "(none)")
            if args.call:
                if args.call not in available:
                    raise RuntimeError("Remote MCP server does not expose requested tool")
                result = await session.call_tool(args.call, {})
                if result.isError:
                    raise RuntimeError("Remote tool returned an error")
                for item in result.content:
                    if getattr(item, "type", "") == "text":
                        print(item.text[:MAX_OUTPUT])


if __name__ == "__main__":
    asyncio.run(main())
