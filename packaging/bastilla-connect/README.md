# BastillaOS Connect (.deb)

Build on **Debian 13 or Ubuntu** on the same architecture where you intend to install. The package bundles a Python virtual environment, so do not treat it as architecture-independent.

## Build
```bash
sudo apt update
sudo apt install -y python3 python3-venv python3-pip dpkg-dev ca-certificates
bash packaging/bastilla-connect/build-deb.sh
```
Build requires internet access to install pinned-range MCP Python dependencies. Review the dependencies before distributing the package.

## Install and configure
```bash
sudo apt install ./dist/bastilla-connect_0.1.0_$(dpkg --print-architecture).deb
sudoedit /etc/bastilla-connect/config.env
sudo chmod 600 /etc/bastilla-connect/config.env
sudo systemctl enable --now bastilla-connect.timer
sudo systemctl start bastilla-connect.service
sudo journalctl -u bastilla-connect.service -n 50 --no-pager
```
Set `BASTILLA_PUBLIC_API_URL=https://your-deployed-bastilla.example` to check the deployed API. Do not use an AI Studio editor URL. The timer runs **read-only outbound checks every five minutes**. It does not host BastillaOS, expose a port, start Ollama, or install a VM.

To test a separately hosted MCP server:
```bash
sudoedit /etc/bastilla-connect/config.env
bastilla-connect mcp
bastilla-connect mcp --call ollama_status
```
Set `BASTILLA_REMOTE_MCP_URL=https://your-authenticated-mcp.example/mcp`. The bundled client currently supports **unauthenticated or separately network-authenticated** MCP endpoints; do not expose an unauthenticated MCP endpoint on the public internet. OAuth/token support is not implemented. Only allowlisted diagnostic tools can be invoked. The default timer only checks the API; MCP calls are manual.

## Security and troubleshooting
The package does not store passwords or API tokens. Config is read as data, not executed as shell. For public services, require HTTPS and server-side authorization. Check the service logs and the remote API deployment separately. A successful API check does not establish a ChatGPT connection.

## Verify the actual connection (not just CI)

On the Linux host where the .deb is installed:

```bash
sudoedit /etc/bastilla-connect/config.env
# Set BASTILLA_PUBLIC_API_URL to the reachable deployed BastillaOS API.
# Set BASTILLA_REMOTE_MCP_URL to the authenticated MCP endpoint.
sudo systemctl start bastilla-connect.service
sudo journalctl -u bastilla-connect.service -n 60 --no-pager
bastilla-connect mcp
bastilla-connect mcp --call agents_status
```

The current outbound MCP client only allows `ollama_status`, `agents_status`, and `vm_status`. An `agents_status` response describes monitoring state and does **not** prove live inference by Aria, Alex, Astyria, or Aurelius. A successful handshake verifies the specified MCP endpoint, not ChatGPT connectivity. ChatGPT requires a separately configured, authenticated public HTTPS MCP server.

The GitHub workflow's local MCP test uses a **mock** backend. The public DEV/PRE checks are non-blocking diagnostics; a green workflow alone is not proof that either Cloud Run deployment is reachable. Inspect the workflow summary for DNS and HTTP results.
