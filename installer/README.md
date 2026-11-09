# Ubuntu AI installer integration

Goal: integrate **all one-time setup tasks** into Ubuntu 24.04 LTS installation and remove local bootstrap files only after verified success. This is an initial orchestration layer, **not** a bootable ISO or completed integration.

`installer/first-boot.sh` runs explicitly registered paths from `installer/setup-manifest.txt` sequentially. It uses a lock and durable completion markers under `/var/lib/ubuntu-ai/setup`. If a task fails, subsequent tasks stop; successful tasks are skipped on retry. Run as root only in a trusted installation environment.

**Current state:** no tasks are registered yet. This is intentional: existing LibreChat installer assumes a user HOME, deletes its own script, and marks preparation rather than verified service readiness. It must be adapted before safe first-boot automation. Do not add arbitrary scripts without reviewing root privileges, dependencies, secrets, and health checks.

## Ubuntu integration plan
1. Ubuntu Autoinstall/Subiquity installs the base OS with user-confirmed storage settings.
2. Packages and source files are staged on the installed system.
3. A one-shot systemd unit invokes `installer/first-boot.sh` after network and Docker dependencies are available.
4. Each registered setup task verifies health and writes completion state.
5. Remove temporary **local** installers only after successful provisioning; keep service controllers, GUI, updates, diagnostics, configuration, persistent AI memory and backups.

Do not place GitHub tokens or Gemini keys in the ISO or Git. Do not silently partition disks. The original AI agents must be sourced and verified before installation; placeholders do not count as migrated agents.

This repository does not yet contain a tested Ubuntu Autoinstall ISO, the systemd unit, or a full verified inventory of one-time scripts.
