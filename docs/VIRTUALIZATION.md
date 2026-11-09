# BastillaOS — Debian 13 virtualization

This repository provides a software-emulation fallback for hosts without /dev/kvm.

## CI boot verification

Run the GitHub Actions workflow **BastillaOS Debian 13 TCG boot verification**
(`.github/workflows/debian13-tcg-boot.yml`). It downloads the Debian 13
generic AMD64 cloud image, boots it with QEMU TCG, checks the serial console
for a Debian 13 login/banner, and uploads `boot.log` as an artifact.

**Important:** a passing boot smoke test is not proof that the BastillaOS
application, AI agents, MCP integration, networking, or desktop UI work.
GitHub-hosted Actions runners are ephemeral and do not provide a persistent VM.

## Running a pre-existing qcow2 disk

Install `qemu-system-x86` and `qemu-utils` on a Linux host, then run:

```bash
bash scripts/launch-qemu-tcg.sh /absolute/path/to/debian13.qcow2 2048 2
```

The launcher intentionally uses `accel=tcg` (no hardware virtualization).
It does **not** install Debian, create user credentials, or expose a remote
desktop. The image must already contain a bootable OS. QEMU TCG is slower
than KVM and should be treated as a compatibility fallback.

## How to validate results

1. Open the workflow run and confirm the `debian13-boot` job succeeds.
2. Download the `debian13-tcg-boot-log` artifact.
3. Inspect `boot.log` for the actual Debian 13 boot banner/login prompt.
4. For BastillaOS functionality, run separate app-level tests on a persistent
   host; this smoke test only validates the guest OS boot path.
