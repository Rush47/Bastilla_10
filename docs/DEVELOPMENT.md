# Development

## First run

Use Node.js 24. Run `npm ci`, then `npm run dev` on port 3000.
Configure model credentials through deployment secrets or a local `.env` based on
`.env.example`. No model is included; unavailable providers must be reported honestly.
Keep the Codespaces port private: the recovered backend still requires a full access-control audit.

`npm run verify` runs four independent checks concurrently. GitHub Actions caches npm
downloads and cancels obsolete runs on the same branch. Automatic Git synchronization
uses the same command before committing. It cannot resolve competing agent edits;
use one writer per file and separate worktrees.

## Priority queue

| Priority | Owner | Deliverable | Evidence |
| --- | --- | --- | --- |
| P0 | Alex | Compare unpushed Codespace work with recovered source | diff and source SHA |
| P0 | Aurelius | Audit write endpoints and deployment authentication | negative API tests |
| P1 | Aria | Validate Ollama and MCP against an actual provider | initialize/tools/list logs |
| P1 | Astyria | Verify terminal, chat and navigation on mobile | viewport checks |
| P1 | Alex | Integrate reviewed changes preserving API compatibility | green verify and API checks |
| P2 | Aurelius | Boot Debian/QEMU and validate packaging | actual boot/build logs |

Names in this table are responsibilities, not confirmation of agent execution.
Do not use placeholder percentages or countdowns as evidence of completion.

## Naming

- Repository: `Bastilla_OS_2`; displayed product: `Bastilla OS 2`.
- npm identifier: `bastilla-os-2`; branches: `agent/alex/<task>` etc.
- New documentation/scripts: descriptive kebab-case unless an existing contract requires otherwise.
- Existing `bastillaos` paths, app IDs, APIs and package names remain compatible.

Sources were recovered from `u6930438163-code/AI_Studio_BastillaOS` commit
`2203ac94b1dbbad0f9e2a470c00a4b24bc9900ed`. Runtime databases, exports,
virtual environments, archived ZIPs and automatic deployment workflows were excluded.
Local Codespace edits have not been compared: this import does not claim to contain them.
