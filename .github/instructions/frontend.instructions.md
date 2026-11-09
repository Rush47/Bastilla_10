---
applyTo: "src/**/*.{ts,tsx,css}"
---
# Bastilla OS 2 — frontend guidance
This is Bastilla OS 2, not Bastilla OS 1. Keep product identity and links unambiguous; do not relabel a legacy app as v2.
Preserve existing functionality, component contracts, responsive layouts and accessibility.
Prioritize mobile widths (320–430px), keyboard navigation, clear loading/error/empty states and reduced-motion preferences.
Prefer small, testable React/TypeScript changes. Avoid new dependencies and large bundles without measurable justification.
Never hardcode secrets or assume an API/model/agent/VM is live without checking.
After UI changes run `npm run lint`, `npm test`, `npm run build` and report actual outcomes. If a visual runtime is unavailable, state that explicitly.
