# BastillaOS MCP bridge (local Ollama)

This optional bridge exposes a **read-only** subset of the existing BastillaOS API as MCP tools. It makes no OpenAI/Gemini API calls and does not alter the main application.

## Start

From the repository root in a Linux Codespace, run `npm run start:mcp` to start the local services and perform the MCP smoke test. This checks local reachability, not remote ChatGPT authorization. Keep the terminal open while using the services.

Alternatively, start the bridge manually:

On the BastillaOS host, ensure BastillaOS and Ollama are already running.

```sh
python3 -m venv .venv-mcp
. .venv-mcp/bin/activate
pip install -r integrations/mcp/requirements.txt
python integrations/mcp/server.py
```

By default the MCP endpoint is `http://127.0.0.1:8000/mcp` and the BastillaOS API is `http://127.0.0.1:3000`. Override the latter with `BASTILLA_API_URL` if necessary.

## Available tools

- `ollama_status`: GET /api/ollama/models
- `agent_command`: limited diagnostics through POST /api/triad/command

No shell access, arbitrary commands, file writes, or model cloud API keys are required.

## Remote access

**Never publish port 8000 directly.** The underlying development API does not authenticate accounts. Use an HTTPS reverse proxy with proper authentication (ideally OAuth supported by your MCP client), access controls, and rate limits before registering a remote MCP URL. A tunnel alone does not provide authentication. Do not publish the BastillaOS development server itself.

## Notes

This bridge does not prove that ChatGPT can use a custom MCP server on your plan; availability depends on the client and account configuration. It also does not deploy anything from GitHub to your running Google AI Studio environment. Agent chat roles are not independent autonomous workers. Chat endpoints are intentionally excluded pending a reviewed authentication and permissions design.
