# BastillaOS Connect (.deb prototype)

Build on Debian 13 / Ubuntu with `dpkg-deb` installed:

```bash
bash integrations/mcp/build-deb.sh
sudo apt install ./dist/bastilla-connect_0.1.0_all.deb
sudo mkdir -p /opt/bastilla-connect
sudo python3 -m venv /opt/bastilla-connect/venv
sudo /opt/bastilla-connect/venv/bin/pip install 'mcp>=1.28,<2' 'httpx>=0.27,<1'
```

Choose an **existing** trusted MCP server. The AI Studio editor URL is not an MCP endpoint.
Run interactively first:

```bash
BASTILLA_REMOTE_MCP_URL=https://your-mcp-server.example/mcp bastilla-connect
```

The client lists allowed diagnostic tools and does not execute them unless `--call ollama_status`, `--call agents_status`, or `--call vm_status` is explicitly supplied.

Optional one-shot systemd probe (no agent command execution): write `BASTILLA_REMOTE_MCP_URL=https://your-mcp-server.example/mcp` into `/etc/bastilla-connect.env`, then `sudo systemctl start bastilla-connect.service` and `sudo journalctl -u bastilla-connect.service -n 30`. The service is not enabled automatically. Do not put access tokens in this environment file. This prototype does not implement remote OAuth authentication, background reconnection, or ChatGPT inbound access. It is a Linux outbound MCP client, not a full desktop GUI or virtual machine.
