"""Offline tests for the remote MCP bridge. No calls to the production API."""
import asyncio
import importlib.util
import os
import unittest
from unittest.mock import AsyncMock, patch

MODULE = os.path.join(os.path.dirname(__file__), "remote_server.py")
spec = importlib.util.spec_from_file_location("bastilla_remote_mcp", MODULE)
remote = importlib.util.module_from_spec(spec)
spec.loader.exec_module(remote)

class RemoteMcpTests(unittest.TestCase):
    def test_rejects_unrecognized_agent(self):
        result = asyncio.run(remote.remote_agent_task("unknown", "status"))
        self.assertIn("error", result)

    def test_rejects_empty_task(self):
        result = asyncio.run(remote.remote_agent_task("Aria", " "))
        self.assertIn("error", result)

    def test_rejects_shell_command(self):
        result = asyncio.run(remote.remote_app_command("rm -rf /"))
        self.assertIn("error", result)

    def test_writes_disabled_by_default(self):
        with patch.object(remote, "ALLOW_WRITES", False):
            result = asyncio.run(remote.post("/agent-tasks", {"agent": "Aria", "task": "hello"}))
        self.assertIn("error", result)

    def test_token_required_even_if_write_enabled(self):
        with patch.object(remote, "ALLOW_WRITES", True), patch.object(remote, "TOKEN", ""):
            result = asyncio.run(remote.post("/agent-tasks", {"agent": "Aria", "task": "hello"}))
        self.assertIn("error", result)

    def test_allowed_command_route_is_explicit(self):
        with patch.object(remote, "post", new_callable=AsyncMock) as send:
            send.return_value = {"ok": True}
            result = asyncio.run(remote.remote_app_command("SYSTEM_STATUS"))
            send.assert_awaited_once_with("/apps/command", {"command": "SYSTEM_STATUS"})
            self.assertTrue(result["ok"])

if __name__ == "__main__":
    unittest.main()
