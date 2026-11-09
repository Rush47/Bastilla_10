# BastillaOS MCP bridge

This optional bridge exposes a read-only subset of the already running BastillaOS API. It does not install dependencies, start Ollama, download models, start the web app, or synchronize source code.

## Manual start

Use an environment where the project's Node and MCP Python dependencies are already installed. Start the web application explicitly in one terminal:

```sh
npm start
```

In another terminal, start only the MCP bridge:

```sh
npm run start:mcp
# Equivalent: python3 integrations/mcp/server.py
```

The MCP endpoint is `http://127.0.0.1:8000/mcp`; the web API defaults to `http://127.0.0.1:3000`. `BASTILLA_API_URL` selects an already running web API. Keep both terminals open; there is no keep-alive/restart wrapper.

The only standard chat model is the existing Ollama model `dolphin-llama3:8b` (uncensored). `OLLAMA_BASE_URL` must point to the Ollama host that already has it. Missing Ollama or missing 8B weights is a configuration error; no smaller model or cloud provider replaces it automatically.

## Available tools

- `ollama_status`: GET `/api/ollama/models`
- `agent_command`: limited diagnostics through POST `/api/triad/command`

These tools do not grant shell access or write source files. Test an already running MCP listener explicitly:

```sh
BASTILLA_MCP_URL=http://127.0.0.1:8000/mcp python3 integrations/mcp/smoke_test.py
```

A successful MCP handshake verifies that listener, not model inference, an AI Studio deployment, or a ChatGPT account connection.

## Remote access

Keep the listener on loopback. An external client requires a separately configured authenticated HTTPS reverse proxy, access controls and rate limits. Do not publish the development server or Ollama API directly. GitHub synchronization updates source files; it does not restart these processes or move model weights to another machine. In AI Studio, `127.0.0.1` refers to the AI Studio runtime rather than the operator's computer.
