#!/usr/bin/env python3
"""Local, editable Linux kernel source modification workflow using Ollama.

Requires an existing kernel Git checkout and installed Python dependencies.
Never automatically installs a kernel or changes the bootloader.
"""
import argparse
import asyncio
import difflib
import os
from pathlib import Path
import subprocess
import sys

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))
from ubuntu.ollama_agent import chat

def git(root, *args):
    return subprocess.run(["git", "-C", str(root), *args], text=True, capture_output=True, check=True).stdout

def validate(root, relative):
    root = root.resolve(strict=True)
    if not (root / "Makefile").is_file() or not (root / ".git").exists():
        raise ValueError("Kernel Git checkout with Makefile required")
    source_path = root / relative
    if source_path.is_symlink():
        raise ValueError("Symlinks are not supported")
    target = source_path.resolve(strict=True)
    if not target.is_relative_to(root) or target.suffix not in {".c", ".h", ".S"}:
        raise ValueError("Only C, header and assembly files within kernel checkout allowed")
    if target.is_symlink() or target.stat().st_size > 200_000:
        raise ValueError("Symlinks and files over 200 KB not supported")
    return root, target

async def main():
    parser = argparse.ArgumentParser(description="Edit kernel source with Ollama and review a diff")
    parser.add_argument("--kernel-tree", type=Path, required=True)
    parser.add_argument("--file", required=True, help="Relative path to .c, .h or .S source")
    parser.add_argument("--request", help="Natural language modification request")
    args = parser.parse_args()
    if not (sys.stdin.isatty() and sys.stdout.isatty()):
        parser.error("Interactive local terminal required")
    root, target = validate(args.kernel_tree, args.file)
    relative = str(target.relative_to(root))
    if git(root, "status", "--porcelain", "--", relative).strip():
        parser.error("Target has uncommitted changes. Commit or stash first.")
    original = target.read_text(encoding="utf-8")
    request = args.request or input("Opisz zmiane w kernelu> ").strip()
    if not request:
        parser.error("Empty request")
    prompt = ("Edit this Linux kernel source according to the user's request. "
              "Return ONLY the complete updated file source, no markdown fences. "
              "Preserve unrelated code. Do not execute anything.\n"
              f"File: {relative}\nRequest: {request}\nOriginal source:\n{original}")
    answer = (await chat(prompt))["response"].strip()
    if answer.startswith("```"):
        lines = answer.splitlines()[1:]
        if lines and lines[-1].strip() == "```":
            lines.pop()
        answer = "\n".join(lines) + "\n"
    if not answer or answer == original:
        print("No change proposed")
        return
    backup = target.with_name(target.name + ".ollama-backup")
    if backup.exists():
        parser.error(f"Backup already exists: {backup}")
    backup.write_text(original, encoding="utf-8")
    target.write_text(answer, encoding="utf-8")
    try:
        import shlex
        editor = shlex.split(os.environ.get("EDITOR", "nano"))
        if not editor:
            raise ValueError("EDITOR must specify a command")
        subprocess.run(editor + [str(target)], check=True)
        edited = target.read_text(encoding="utf-8")
        diff = "".join(difflib.unified_diff(original.splitlines(True), edited.splitlines(True),
                                            fromfile="original/" + relative, tofile="edited/" + relative))
        print(diff[:50000] if diff else "No changes")
        print(f"Backup: {backup}")
        if input("Keep modifications? Type KEEP: ").strip() != "KEEP":
            target.write_text(original, encoding="utf-8")
            print("Original restored")
            return
        print("Changes retained in working tree. Compile and install manually after review.")
        print(f"Suggested: make -C {root} O=/tmp/kernel-build olddefconfig")
        print("No kernel compilation, installation, or reboot was performed.")
    except BaseException:
        target.write_text(original, encoding="utf-8")
        raise

if __name__ == "__main__":
    asyncio.run(main())
