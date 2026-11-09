# Bastilla OS 2

Canonical repository: `Rush47/Bastilla_10`. Product name: **Bastilla OS 2**.
Package identifier: `bastilla-os-2`. Preserve existing API paths, app IDs and Debian
package names until their consumers are migrated together.

Read `docs/MISSION_BASTILLA_OS_2.md` and `docs/DEVELOPMENT.md` before changes.
Profiles in `.github/agents/` describe roles; they do not prove running workers.

## Runtime policy (owner instruction, 2026-11-09)

Use only Ollama `dolphin-llama3:8b` as the application chat model. The repository
policy overrides stale model/provider environment settings. Do not reintroduce
installers, model downloads, auto-updates, auto-repair, automatic Git writes,
background deployment, or execution of model-generated commands. Existing model
weights and user data are not cleanup targets. AI Studio source sync is separate
from restarting its backend and from Ollama model availability; verify both.

## Ownership and parallel work

- Alex: backend (`server.ts`), architecture and integration; sole owner of shared contracts.
- Astyria: `src/components/`, CSS and mobile UI.
- Aria: `integrations/`, model routing and AI transport; coordinate `src/kernel/` with Alex.
- Aurelius: tests, CI and security review.

Use separate worktrees and `agent/<name>/<task>` branches. One writer per file.
Agree API contracts first, then work in parallel. Do not invent results from other agents.
Use small commits named `feat(scope): ...`, `fix(scope): ...`, `test(scope): ...`
or `docs(scope): ...`. Rebase against current main before integration; never force-push main.

## Acceptance

Run `npm ci`, then `npm run verify` (tests, TypeScript, web build, server build).
Report actual failures. For API changes run a local instance and `npm run check:api -- http://127.0.0.1:3000`.
Never call a profile, simulated response or stored flag a live AI/VM connection.
Do not commit secrets, private databases, runtime state, exports, node_modules or VM disks.
Keep unrelated application modules compatible. Do not delete archives or source repositories.
