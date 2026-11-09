"""Loopback-only deterministic mock for MCP bridge integration tests (not a live AI)."""
import json
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer

class Handler(BaseHTTPRequestHandler):
    def respond(self, status, data):
        body = json.dumps(data).encode("utf-8")
        self.send_response(status)
        self.send_header("Content-Type", "application/json")
        self.send_header("Content-Length", str(len(body)))
        self.end_headers()
        self.wfile.write(body)

    def do_GET(self):
        if self.path == "/api/ollama/models":
            self.respond(503, {"connected": False, "models": [], "mock": True})
        elif self.path == "/api/vm-gemini-4/status":
            self.respond(200, {"available": False, "mock": True})
        elif self.path == "/api/vm-gemini-4/runtime":
            self.respond(503, {"success": False, "error": "Docker unavailable", "mock": True})
        elif self.path == "/api/agents/background/status":
            self.respond(200, {
                "monitoring": True,
                "agents": {
                    name: {"enabled": True, "status": "offline"}
                    for name in ("Aria", "Alex", "Astyria", "Aurelius")
                },
                "ollama": {"modelCount": 0, "models": []},
                "mock": True,
            })
        else:
            self.respond(404, {"error": "not found"})

    def do_POST(self):
        if self.path != "/api/triad/command":
            self.respond(404, {"error": "not found"})
            return
        try:
            length = int(self.headers.get("Content-Length", "0"))
            if length < 0:
                self.respond(400, {"error": "invalid content length"})
                return
            if length > 4096:
                self.respond(413, {"error": "too large"})
                return
            payload = json.loads(self.rfile.read(length))
        except (ValueError, TypeError):
            self.respond(400, {"error": "invalid JSON"})
            return
        if not isinstance(payload, dict) or payload.get("command") != "SYSTEM_STATUS":
            self.respond(400, {"success": False, "error": "unsupported test command"})
            return
        self.respond(200, {"success": True, "command": "SYSTEM_STATUS", "replies": {}, "mock": True})

    def log_message(self, *_args):
        pass

if __name__ == "__main__":
    ThreadingHTTPServer(("127.0.0.1", 3902), Handler).serve_forever()
