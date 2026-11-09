# Remote BastillaOS MCP bridge

This is an optional, separate MCP process. It does not replace the existing local MCP integration.

## Run
```sh
python3 -m venv .venv-mcp
.venv-mcp/bin/pip install -r integrations/mcp/requirements.txt
BASTILLA_REMOTE_API_URL=https://ais-dev-wcohfbaczr2ohtvwiuxtdt-873947482948.europe-west2.run.app/api/ \
  .venv-mcp/bin/python integrations/mcp/remote_server.py
```

Local MCP endpoint: `http://127.0.0.1:8001/mcp/` (not directly accessible to ChatGPT).

Set `BASTILLA_REMOTE_API_TOKEN` in your hosting secret manager if the remote API requires bearer authentication. To enable task submission, set `BASTILLA_REMOTE_MCP_WRITES=1` only after verifying the remote request schemas and configuring authenticated HTTPS access to MCP. The remote API routes have not been independently verified.

**Deployment:** Use a persistent HTTPS host/reverse proxy with access control. Never expose port 8001 or a command endpoint without authentication. A GitHub repository by itself is not hosting. Do not publish the Codespaces port publicly as a shortcut.

## Offline tests

```sh
.venv-mcp/bin/python -m unittest discover -s integrations/mcp -p 'test_remote_server.py' -v
```

## Deployment checklist

1. Confirm the remote API accepts the exact JSON schemas used in `remote_server.py`; currently these are assumptions, not verified contracts.
2. Supply an API bearer token using the host's secret manager; never commit it to GitHub.
3. Add a public HTTPS ingress with OAuth or another supported client authentication mechanism. The Python process binds to loopback intentionally.
4. Test MCP initialize and tools/list using an authenticated client, then test a non-destructive diagnostic.
5. Only then enable `BASTILLA_REMOTE_MCP_WRITES=1` and permit agent task submissions. Command execution should remain allowlisted.

**Cloud Run note:** Deploying this loopback-only script directly will not work as a public Cloud Run service; it needs a separately implemented authenticated ingress and a process listening on the Cloud Run PORT. The bridge is prepared for integration, not deployed.
