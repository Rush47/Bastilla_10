"""Verify MCP handshake and tool execution; model availability is a separate check."""
import asyncio
import json
import os
from mcp import ClientSession
from mcp.client.streamable_http import streamablehttp_client

async def main():
    async with streamablehttp_client(os.environ.get("BASTILLA_MCP_URL", "http://127.0.0.1:8000/mcp")) as (read, write, _):
        async with ClientSession(read, write) as session:
            await session.initialize()
            tools = await session.list_tools()
            names = {tool.name for tool in tools.tools}
            expected = {"ollama_status", "agents_status", "vm_status"}
            allow_commands = os.environ.get("BASTILLA_MCP_READ_ONLY", "1").strip().lower() in {"0", "false", "no"}
            if allow_commands:
                expected.add("agent_command")
            elif "agent_command" in names:
                raise RuntimeError("Read-only MCP unexpectedly exposes agent_command")
            assert expected <= names, f"Missing MCP tools: {expected - names}"
            result = await session.call_tool("ollama_status", {})
            if result.isError:
                raise RuntimeError("MCP ollama_status returned a tool error")
            if not result.content:
                raise RuntimeError("MCP ollama_status returned an empty response")
            if os.environ.get("BASTILLA_MCP_EXPECT_OFFLINE") == "1":
                diagnostic = getattr(result, "structuredContent", None)
                if not isinstance(diagnostic, dict):
                    diagnostic = json.loads(result.content[0].text)
                if diagnostic.get("connected") is not False:
                    raise RuntimeError("Expected Ollama offline diagnostic, got a different state")
            agents_result = await session.call_tool("agents_status", {})
            if agents_result.isError or not agents_result.content:
                raise RuntimeError("MCP agents_status failed or returned an empty response")
            vm_result = await session.call_tool("vm_status", {})
            if vm_result.isError or not vm_result.content:
                raise RuntimeError("MCP vm_status failed or returned an empty response")
            agent_result = "disabled (read-only mode)"
            if allow_commands:
                agent_result = await session.call_tool(
                    "agent_command", {"agent": "triad", "command": "SYSTEM_STATUS"}
                )
                if agent_result.isError:
                    raise RuntimeError("MCP agent_command returned a tool error")
                if not agent_result.content:
                    raise RuntimeError("MCP agent_command returned an empty response")
                rejected = await session.call_tool(
                    "agent_command", {"agent": "triad", "command": "EXECUTE_SHELL"}
                )
                if not rejected.isError:
                    raise RuntimeError("MCP accepted an unsupported agent command")
                rejected_agent = await session.call_tool(
                    "agent_command", {"agent": "unauthorized-agent", "command": "SYSTEM_STATUS"}
                )
                if not rejected_agent.isError:
                    raise RuntimeError("MCP accepted an unsupported agent role")
    
            print("MCP handshake, diagnostics, command and agent allowlists: OK")
            print("Tools:", ", ".join(sorted(names)))
            print("Ollama diagnostic:", result)
            print("Agents monitoring diagnostic:", agents_result)
            print("VM diagnostic:", vm_result)
            print("Agent diagnostic:", agent_result)
            print("Note: tool responses do not independently prove an LLM model is online.")

if __name__ == "__main__":
    asyncio.run(main())
