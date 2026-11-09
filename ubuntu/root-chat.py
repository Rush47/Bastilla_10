#!/usr/bin/env python3
"""Local root chat terminal. Start with sudo from an interactive Ubuntu terminal.

The LLM generates a shell command and the session runs it as root automatically.
Never expose this program through HTTP or a remotely reachable API.
"""
import asyncio
from datetime import datetime, timezone
import json
import os
from pathlib import Path
import subprocess
import sys

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))
from ubuntu.ollama_agent import chat

LOG_FILE = Path('/var/log/ubuntu-ai/root-chat.jsonl')

def audit(event):
    LOG_FILE.parent.mkdir(parents=True, exist_ok=True)
    fd = os.open(LOG_FILE, os.O_WRONLY | os.O_APPEND | os.O_CREAT, 0o600)
    with os.fdopen(fd, 'a', encoding='utf-8') as stream:
        stream.write(json.dumps({'timestamp': datetime.now(timezone.utc).isoformat(), **event}, ensure_ascii=False) + '\n')

SYSTEM_PROMPT = """You translate the user's Polish or English system administration request
into a single Bash command for an Ubuntu machine. Respond ONLY with a JSON object
with exactly one string field named "command". Do not include markdown.
The command will execute on the real machine as root. If the user is asking a
question rather than requesting an action, produce a read-only command to inspect
the relevant system state. Do not claim the command has already run.
User request:
"""

async def main():
    if not (sys.stdin.isatty() and sys.stdout.isatty()):
        raise SystemExit("Interactive local terminal required")
    if os.geteuid() != 0:
        raise SystemExit("Run with sudo: sudo python3 ubuntu/root-chat.py")
    print("System root chat / Ollama dolphin3:8b. Type /exit to quit.")
    print("Commands execute automatically with root privileges on this machine.")
    print("Use /exec <natural language request> to explicitly execute via Ollama.")
    history = []
    while True:
        try:
            request = input("\nSystem(root)> ").strip()
        except (EOFError, KeyboardInterrupt):
            print()
            break
        if request in {"/exit", "/quit"}:
            break
        if not request:
            continue
        if request == "/history":
            for item in history[-10:]:
                print("[{}] {}".format(item["exit_code"], item["command"]))
            continue
        if request == "/status":
            print("UID={} | log={}".format(os.geteuid(), LOG_FILE))
            continue
        if request == "/exec":
            print("Usage: /exec <polecenie naturalnym jezykiem>")
            continue
        if request.startswith("/exec "):
            request = request[len("/exec "):].strip()
            if not request:
                print("Usage: /exec <polecenie naturalnym jezykiem>")
                continue
        try:
            result = await chat(SYSTEM_PROMPT + request)
            raw = result["response"].strip()
            if raw.startswith("```"):
                raw = "\n".join(raw.splitlines()[1:-1])
            command = json.loads(raw)["command"]
            if not isinstance(command, str) or not command.strip():
                raise ValueError("Model did not produce a command")
            print(f"\n[Ollama {result['model']}] $ {command}", flush=True)
            audit({"event": "command_start", "request": request, "command": command, "model": result["model"]})
            try:
                proc = subprocess.run(["/bin/bash", "-lc", command], check=False, timeout=600)
                exit_code = proc.returncode
            except subprocess.TimeoutExpired:
                exit_code = 124
                print("[timeout: 600s]", file=sys.stderr)
            entry = {"event": "command_end", "command": command, "exit_code": exit_code}
            history.append(entry)
            audit(entry)
            print(f"[exit code: {exit_code}]", flush=True)
        except Exception as exc:
            print(f"[error] {type(exc).__name__}: {exc}", file=sys.stderr)

if __name__ == "__main__":
    asyncio.run(main())
