import argparse
import asyncio
import json
import os
import pathlib
import signal
from datetime import datetime, timezone
from .core import AGENTS, observe_system

async def run(agent, interval, directory):
    if agent not in AGENTS:
        raise ValueError("Unknown agent")
    root = pathlib.Path(directory).expanduser()
    root.mkdir(parents=True, exist_ok=True)
    stop = asyncio.Event()
    loop = asyncio.get_running_loop()
    for sig in (signal.SIGINT, signal.SIGTERM):
        try:
            loop.add_signal_handler(sig, stop.set)
        except NotImplementedError:
            pass
    log = root / (agent.lower() + ".jsonl")
    while not stop.is_set():
        result = await observe_system()
        event = {"agent": agent, "kind": "observation", "timestamp": datetime.now(timezone.utc).isoformat(), "observation": result}
        with log.open("a", encoding="utf-8") as stream:
            stream.write(json.dumps(event, ensure_ascii=False) + "\n")
        try:
            await asyncio.wait_for(stop.wait(), timeout=interval)
        except asyncio.TimeoutError:
            continue

def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--agent", choices=AGENTS, required=True)
    parser.add_argument("--interval", type=int, default=60)
    parser.add_argument("--data-dir", default=os.getenv("DAEMON_DATA_DIR", ".data/daemons"))
    args = parser.parse_args()
    if args.interval < 5:
        parser.error("Interval must be at least 5 seconds")
    asyncio.run(run(args.agent, args.interval, args.data_dir))

if __name__ == "__main__":
    main()
