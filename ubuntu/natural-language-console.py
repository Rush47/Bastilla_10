#!/usr/bin/env python3
"""Local natural-language command editor backed by Ollama Dolphin 8B.

The model only drafts Python. User edits the saved script before optional execution.
Never expose this program as a network service.
"""
import asyncio
import os
from pathlib import Path
import subprocess
import sys
import tempfile

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))
from ubuntu.ollama_agent import chat

PROMPT = """Convert the following Polish or English request into a standalone Python 3 script.
Return ONLY Python source code, no Markdown fences. Do not execute anything.
If a system command is needed, use Python subprocess explicitly.
Make the code readable, with comments and error handling. Request:
"""

def editor_command():
    return os.environ.get("EDITOR", "nano").split()

def edit_file(path: Path):
    subprocess.run(editor_command() + [str(path)], check=True)

def run_script(path: Path, root: bool):
    if not sys.stdin.isatty():
        raise RuntimeError("Local interactive terminal required")
    command = [sys.executable, str(path)]
    if root and os.geteuid() != 0:
        command = ["sudo", "--", sys.executable, str(path)]
    return subprocess.call(command)

def clean_source(source: str):
    source = source.strip()
    if source.startswith("```"):
        lines = source.splitlines()
        if lines and lines[0].startswith("```"):
            lines = lines[1:]
        if lines and lines[-1].strip() == "```":
            lines = lines[:-1]
        source = "\n".join(lines)
    compile(source, "<ollama-draft>", "exec")
    return source + "\n"

async def main():
    if not (sys.stdin.isatty() and sys.stdout.isatty()):
        raise SystemExit("Requires an interactive local terminal")
    print("System / Ollama natural language Python script editor")
    print("The model drafts code; you edit it before any execution.")
    request = input("Polecenie naturalnym jezykiem> ").strip()
    if not request:
        return
    try:
        response = await chat(PROMPT + request)
        source = clean_source(response["response"])
    except Exception as exc:
        raise SystemExit(f"Failed to draft Python: {exc}")
    folder = Path.home() / "ubuntu-ai-scripts"
    folder.mkdir(mode=0o700, parents=True, exist_ok=True)
    with tempfile.NamedTemporaryFile(mode="w", encoding="utf-8", prefix="system-", suffix=".py",
                                     dir=folder, delete=False) as stream:
        stream.write(source)
        path = Path(stream.name)
    path.chmod(0o600)
    print(f"Draft saved: {path}")
    print("Opening editable source in your editor...")
    edit_file(path)
    try:
        compile(path.read_text(encoding="utf-8"), str(path), "exec")
    except SyntaxError as exc:
        print(f"Syntax error: {exc}; script kept for editing")
        return
    choice = input("Run edited script? [n]o / [u]ser / [r]oot: ").strip().lower()
    if choice == "u":
        code = run_script(path, root=False)
        print(f"Exit code: {code}")
    elif choice == "r":
        print("WARNING: The edited script will execute with root privileges.")
        if input("Type ROOT to confirm: ").strip() == "ROOT":
            code = run_script(path, root=True)
            print(f"Exit code: {code}")
    else:
        print(f"Saved without execution: {path}")

if __name__ == "__main__":
    asyncio.run(main())
