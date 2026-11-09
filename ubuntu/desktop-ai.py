#!/usr/bin/env python3
"""Ollama-powered desktop controller for the local graphical user."""
import asyncio
import json
import os
import shutil
import subprocess
import sys
from pathlib import Path
sys.path.insert(0, str(Path(__file__).resolve().parent.parent))
from ubuntu.ollama_agent import chat

PROMPT = """Translate the desktop request into JSON ONLY:
{"action":"launch|open_url|list_windows|focus_window|close_window|none","target":"string"}.
launch target: terminal, files, browser, settings, editor, monitor.
open_url: https URL. Window targets: existing window title substring.
Never output shell commands. Request: """
APPS = {"terminal":["gnome-terminal","kgx","xterm"],"files":["nautilus","thunar"],"browser":["firefox","chromium"],"settings":["gnome-control-center"],"editor":["gnome-text-editor","gedit"],"monitor":["gnome-system-monitor"]}
def execute(action, target):
    if action == "launch":
        if target not in APPS: raise ValueError("Unknown application")
        exe = next((shutil.which(n) for n in APPS[target] if shutil.which(n)), None)
        if not exe: raise RuntimeError("Application not installed")
        subprocess.Popen([exe], start_new_session=True, stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
        return "Uruchomiono: " + target
    if action == "open_url":
        if not target.startswith("https://") or any(c.isspace() for c in target): raise ValueError("HTTPS URL required")
        subprocess.Popen(["xdg-open",target],start_new_session=True)
        return "Otwarto: " + target
    if action in ("list_windows","focus_window","close_window"):
        if not shutil.which("wmctrl"): raise RuntimeError("Install wmctrl and use an X11 desktop session")
        result = subprocess.run(["wmctrl","-l"],capture_output=True,text=True,check=True).stdout
        if action == "list_windows": return result or "Brak okien"
        matches = [line for line in result.splitlines() if target and target.casefold() in line.casefold()]
        if len(matches) != 1: raise ValueError("Expected one matching window; found " + str(len(matches)))
        wid = matches[0].split()[0]
        subprocess.run(["wmctrl","-ia" if action == "focus_window" else "-ic",wid],check=True)
        return "Wykonano: " + action
    if action == "none": return "Nie rozpoznano akcji"
    raise ValueError("Unknown action")
async def main():
    if os.geteuid() == 0: raise SystemExit("Run as desktop user, not root")
    if not (os.getenv("DISPLAY") or os.getenv("WAYLAND_DISPLAY")): raise SystemExit("Desktop session required")
    print("System AI Desktop — główny lokalny agent Ollama. /exit kończy.")
    while True:
        try: request = input("System AI> ").strip()
        except (EOFError,KeyboardInterrupt): break
        if request in ("/exit","/quit"): break
        if not request: continue
        try:
            raw = (await chat(PROMPT + request))["response"].strip()
            if raw.startswith("```"): raw = "\n".join(raw.splitlines()[1:-1])
            plan = json.loads(raw)
            action, target = plan["action"],plan.get("target","")
            if not isinstance(target,str): raise ValueError("Invalid target")
            print(execute(action,target))
        except Exception as exc: print("Błąd:",str(exc),file=sys.stderr)
if __name__ == "__main__": asyncio.run(main())
