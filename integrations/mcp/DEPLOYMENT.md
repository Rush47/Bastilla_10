# BastillaOS MCP — manual deployment and verification

## Architecture

MCP client → authenticated HTTPS reverse proxy → loopback FastMCP server (`127.0.0.1:8000/mcp`) → BastillaOS HTTP API (`127.0.0.1:3000`) → operator-configured Ollama host.

Repository access and source synchronization do not prove that any runtime service is connected. The web app's OpenAPI document is not an MCP endpoint.

## Manual startup

With runtime dependencies already available, start each service explicitly:

```sh
# Terminal 1: web application
npm start
```

```sh
# Terminal 2: MCP bridge only
npm run start:mcp
```

The former provisioning launcher has been removed. These commands do not install Ollama or Python packages, download models, create virtual machines, enable services, or restart themselves after exit.

The chat standard is exclusively `dolphin-llama3:8b` (uncensored), already present on the selected Ollama host. Configure `OLLAMA_BASE_URL` for that host. A missing model returns an error; it must not silently select a smaller downloaded model or a cloud fallback.

Run the protocol test separately:

```sh
BASTILLA_MCP_URL=http://127.0.0.1:8000/mcp python3 integrations/mcp/smoke_test.py
```

## Connecting an external MCP client

1. Use a host that remains online and start the web application and bridge manually. A stopped Codespace or CI runner is not persistent hosting.
2. Configure an authenticated HTTPS reverse proxy with access controls in front of the loopback bridge. Do not expose the development API or Ollama directly.
3. Configure the client with the authenticated public MCP URL. Keep tokens out of repository files, URL query parameters and chat messages.
4. List tools `ollama_status` and `agent_command`, then call `ollama_status`. Verify the required model separately; a handshake alone is not inference.

When AI Studio synchronizes repository changes, explicitly restart the running web process to load changed source. Synchronization does not replace its environment or copy the existing Ollama installation. Its localhost is the AI Studio runtime, so a model on a different host needs the correct reachable `OLLAMA_BASE_URL` and network authorization.

## Verification limits

The standalone smoke test can run against a mock web API for protocol testing. That validates negotiation and the diagnostic allowlist; it does not establish production availability, ChatGPT authorization, or a working 8B model. Keep model checks and remote-client verification distinct.
