#!/usr/bin/env python3
"""Interactive local Python console with explicit shell and root commands.

Run from an interactive Ubuntu terminal. Never expose this console over HTTP.
"""
import code
import os
import shlex
import subprocess
import sys

def shell(command: str, *, root: bool = False, timeout: int = 120) -> int:
    """Run a shell command locally; root=True asks sudo for authentication."""
    if not sys.stdin.isatty() or not sys.stdout.isatty():
        raise RuntimeError("Interactive local terminal required")
    if not isinstance(command, str) or not command.strip():
        raise ValueError("Nonempty command required")
    if timeout < 1 or timeout > 3600:
        raise ValueError("timeout must be 1..3600 seconds")
    argv = ["/bin/bash", "-lc", command]
    if root and os.geteuid() != 0:
        argv = ["sudo", "--"] + argv
    print(f"Running {'as root' if root else 'as current user'}: {command}")
    try:
        result = subprocess.run(argv, check=False, timeout=timeout)
    except subprocess.TimeoutExpired:
        print("Command timed out", file=sys.stderr)
        return 124
    return result.returncode

def root_shell() -> int:
    """Start an interactive root shell via sudo; authentication is required."""
    if not sys.stdin.isatty() or not sys.stdout.isatty():
        raise RuntimeError("Interactive local terminal required")
    return subprocess.call(["sudo", "-i"])

def main() -> None:
    if not sys.stdin.isatty() or not sys.stdout.isatty():
        raise SystemExit("This console requires an interactive local terminal")
    print("Ubuntu AI Python console. shell('pwd'), shell('id', root=True), root_shell()")
    print("Use exit() to quit. Root commands require sudo authentication.")
    code.interact(local={"shell": shell, "root_shell": root_shell, "os": os})

if __name__ == "__main__":
    main()
