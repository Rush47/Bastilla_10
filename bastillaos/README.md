# BastillaOS build inputs and manual runtime

This directory contains Debian 13 (Trixie) amd64 Live image build inputs, KDE branding, and a package builder for the SVL web application. Source files alone do not establish that an ISO was built, booted or installed successfully.

## Build requirements

- Linux amd64 with Docker Engine and permission to use privileged disposable build containers.
- Node.js 24, npm, Bash, `dpkg-deb` and `sha256sum`.
- Access to Debian/npm build dependencies and approximately 20 GB of free storage.

The existing image and package builders are explicit build tools; they do not provision a VM on application startup.

```sh
bash bastillaos/build-iso.sh
```

The image build compiles the frontend/server and creates a Debian package before invoking Debian live-build in a disposable container. If successful, its outputs are:

- `bastillaos/build/BastillaOS-13-amd64.iso`
- `bastillaos/build/BastillaOS-13-amd64.iso.sha256`

Creating these artifacts does not install them on the host. Disk selection and operating-system installation remain separate manual operations.

## Manual application start

With the project's dependencies already available:

```sh
npm start
```

The former installer, keep-alive, auto-repair and VM-provisioning launchers have been removed. Package installation/upgrades do not automatically enable, start, stop or restart the web service. Existing models, disks, application data and host services are not removed by these source changes. If an operator uses an existing systemd service, its start and restart are explicit operator actions.

The model standard is exclusively the existing **`dolphin-llama3:8b` (uncensored)** on Ollama. Set `OLLAMA_BASE_URL` to the host that already has those weights. The application does not download a model, pick another installed model, install Ollama, or enable a cloud/template fallback. Missing or unavailable 8B weights produce an explicit error.

Source synchronization in AI Studio updates files, not model weights or an already running process. Restart that web process explicitly after synchronization. Confirm `GET /api/ollama/models` and `GET /api/ai/status` against the running instance; the configured model must remain `dolphin-llama3:8b`. A localhost URL in AI Studio refers to the AI Studio machine, not a separate computer running Ollama.

Keep runtime credentials in deployment secrets or an untracked, private environment file. The root-privileged legacy package service belongs on loopback only; do not expose its development HTTP API publicly.

## Deterministic engine and diagnostic protocol

`apps/without_nlp` remains a separate deterministic Euler/Fourier engine. It encodes and decodes signals; it is not a substitute chat model.

- `/usr/bin/without-nlp` is the package's standard-library Python command.
- `GET /api/without_nlp/status` and `POST /api/without_nlp/analyze` expose its signal operations.
- `POST /api/triad/command` accepts the structured diagnostic allowlist declared in `src/kernel/agentProtocol.ts`: `SYSTEM_STATUS`, `DATA_STORE_AUDIT`, `VERSION_TIMELINE`, and `SIGNAL_ANALYSIS`.
- `POST /api/triad/message` uses the pinned Ollama 8B model for conversation.

The React views, data store, explicit terminal, diagnostics, Apps Studio and manual GitHub controls remain part of the source project. VM provisioning is disabled: the retained `vm-gemini-4/compose.yaml` is a non-launching legacy descriptor for identifying an existing container, not a build or installation path. Existing VM disks are preserved.
