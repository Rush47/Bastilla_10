# Bastilla OS 2 in Codespaces

Read AGENTS.md and docs/DEVELOPMENT.md. Use the existing Alex, Aria, Astyria and Aurelius profiles in .github/agents. Alex coordinates backend/integration, Astyria UI/mobile, Aria AI/MCP, Aurelius tests/security. Delegate independent tasks only if the active Copilot runtime actually supports it, and report real tool results. Separate worktrees and one writer per file. Do not claim four agents are running because four profiles exist.

Work against mmitek515-netizen/Bastilla_OS_2. Preserve unrelated dirty work and source repositories. npm run verify is the integration gate; use npm run check:api against an actual local server. Keep forwarded ports private. Never commit secrets or generated runtime state.

Priorities: verify actual model access; compare preserved Codespace commits; mobile UI and bundle loading; audit write APIs; real MCP handshake. Commit and push small verified changes to agent branches. Opening a Codespace does not establish model inference or a VM boot.
