---
applyTo: "{server.ts,integrations/**,scripts/**,.github/workflows/**}"
---
# Bastilla OS 2 — backend, integration and automation safeguards
Treat HTTP/MCP endpoints, agent tool calls, shell execution, repository writes and model-provider requests as trust boundaries.
Require explicit authentication and authorization for state-changing operations; do not expose privileged write APIs on public forwarded ports.
Keep Codespaces ports private by default. Never log, commit or echo API keys, tokens, cookies or personal data.
Never grant blanket root/admin access to agents, run untrusted commands, force-push main, or merge unverified changes automatically.
For AI integrations distinguish configured profiles from running processes, mock replies from real inference, and local MCP listeners from authenticated external MCP handshakes.
Use least-privilege credentials, scoped permissions, input validation, timeouts and bounded retries. Preserve compatibility with existing API consumers.
For backend changes run `npm run verify` and `npm run check:api -- http://127.0.0.1:3000` against a running local server where feasible; record what was actually tested.
