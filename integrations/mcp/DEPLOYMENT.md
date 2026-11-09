# BastillaOS MCP — deployment and verification

## Architecture

ChatGPT (remote MCP client) → authenticated HTTPS reverse proxy → loopback FastMCP server (127.0.0.1:8000/mcp) → BastillaOS HTTP API (127.0.0.1:3000) → optional Ollama API (127.0.0.1:11434).

GitHub repository access does **not** mean the MCP service is connected or running. The OpenAPI document served by the web app is **not** the MCP protocol endpoint.

## Local startup

From the repository root:

```bash
npm ci
bash scripts/start-bastilla-mcp.sh
```

The script starts the local web API if necessary, installs Python MCP dependencies in `.venv-mcp`, starts a loopback-only MCP bridge, and runs a real MCP handshake plus tool calls. It reports Ollama reachability separately. It does **not** install a model or publish a public endpoint.

To test an already running MCP endpoint:

```bash
BASTILLA_MCP_URL=http://127.0.0.1:8000/mcp .venv-mcp/bin/python integrations/mcp/smoke_test.py
```

## Connecting ChatGPT

1. Deploy BastillaOS and the MCP bridge on a host that remains online. GitHub Actions and a stopped Codespace are not persistent hosting.
2. Put a trusted HTTPS reverse proxy in front of the MCP bridge. Require authentication supported by the ChatGPT MCP connector and protect against unauthenticated requests. Do **not** expose port 8000 or the Ollama API directly to the internet.
3. Configure a public HTTPS MCP URL ending in `/mcp` in ChatGPT's plugin/connector settings, using the authentication configuration offered there. Do not put tokens in GitHub files, URL query parameters, or chat messages.
4. Verify the connection by listing tools `ollama_status` and `agent_command`. Then call `ollama_status`. A successful handshake proves the MCP transport works; it does not prove that Ollama has a running model or that remote agents are connected.
5. For server-side diagnostics, review `.runtime/mcp.log` and `.runtime/bastilla.log`. Avoid posting secrets from logs.

## Automated verification

GitHub Actions runs a protocol-level MCP smoke test against a **mock** BastillaOS API. It validates MCP negotiation, both tools, and rejection of unsupported commands. This is not a production availability check.

The bridge is intentionally read-only and restricts agent commands to a small allowlist. Adding privileged or shell-execution tools requires a separate security review, access controls, and explicit authorization.
