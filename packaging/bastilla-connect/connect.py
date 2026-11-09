"""BastillaOS Connect: outbound, read-only HTTPS API health probe."""
import json
import os
import ssl
import sys
from urllib.error import HTTPError, URLError
from urllib.parse import urlparse
from urllib.request import Request, urlopen

PATHS = ("/api/ai/status", "/api/agents/background/status", "/api/ollama/models")


def validate(raw):
    u = urlparse(raw)
    if (u.scheme != "https" and not (u.scheme == "http" and u.hostname in ("localhost", "127.0.0.1", "::1"))) or not u.netloc:
        raise ValueError("HTTPS required (except localhost)")
    if u.username or u.password or u.query or u.fragment:
        raise ValueError("Credentials and query strings in URLs are not allowed")
    if u.hostname == "aistudio.google.com":
        raise ValueError("Use a deployed API URL, not an AI Studio editor link")
    return u.scheme + "://" + u.netloc


def check(base, path):
    request = Request(base + path, headers={"Accept": "application/json"})
    try:
        with urlopen(request, timeout=10, context=ssl.create_default_context()) as response:
            status, body, content_type = response.status, response.read(65536), response.headers.get("Content-Type", "")
    except HTTPError as e:
        status, body, content_type = e.code, e.read(65536), e.headers.get("Content-Type", "")
    if "application/json" not in content_type:
        raise ValueError("Non-JSON response")
    data = json.loads(body)
    if not isinstance(data, dict):
        raise ValueError("Unexpected JSON type")
    if path == "/api/ollama/models":
        if status == 503 and data.get("connected") is False:
            return "OFFLINE (Ollama)"
        if status == 200 and isinstance(data.get("connected"), bool):
            return "ONLINE" if data["connected"] else "OFFLINE (Ollama)"
    elif status == 200:
        if path == "/api/agents/background/status" and isinstance(data.get("agents"), dict):
            return "REACHABLE (agents monitoring)"
        if path == "/api/ai/status" and isinstance(data.get("protocol"), str):
            return "REACHABLE (AI status)"
    raise ValueError("Unexpected API response: HTTP " + str(status))


def main():
    raw = os.environ.get("BASTILLA_PUBLIC_API_URL", "")
    if not raw:
        print("SKIP API: configure BASTILLA_PUBLIC_API_URL in /etc/bastilla-connect/config.env")
        return 0
    try:
        base = validate(raw)
    except ValueError as e:
        print("INVALID API CONFIG:", e, file=sys.stderr)
        return 2
    failures = 0
    for path in PATHS:
        try:
            print(path, check(base, path))
        except (ValueError, URLError, TimeoutError, json.JSONDecodeError) as e:
            failures += 1
            print(path, "FAIL:", str(e), file=sys.stderr)
    return 1 if failures else 0


if __name__ == "__main__":
    sys.exit(main())
