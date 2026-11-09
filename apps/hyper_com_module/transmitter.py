#!/usr/bin/env python3
"""Local, SQLite-backed message queue for the HyperCom app."""

import argparse
import json
import os
import sqlite3
import sys
from contextlib import closing
from datetime import datetime, timezone
from pathlib import Path


ROOT_DIR = Path(__file__).resolve().parents[2]
DEFAULT_DB_PATH = ROOT_DIR / "data" / "databases" / "hyper_com_db.sqlite"
MAX_CONTENT_LENGTH = 4000


def database_path() -> Path:
    return Path(os.environ.get("HYPER_COM_DB_PATH", DEFAULT_DB_PATH)).expanduser().resolve()


def connect_database() -> sqlite3.Connection:
    db_path = database_path()
    db_path.parent.mkdir(parents=True, exist_ok=True)
    connection = sqlite3.connect(db_path, timeout=5)
    connection.row_factory = sqlite3.Row
    connection.execute(
        """
        CREATE TABLE IF NOT EXISTS transmissions (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            direction TEXT NOT NULL CHECK (direction IN ('incoming', 'outgoing')),
            sender TEXT NOT NULL,
            recipient TEXT NOT NULL,
            content TEXT NOT NULL,
            status TEXT NOT NULL CHECK (status IN ('received', 'replied', 'queued')),
            in_reply_to INTEGER REFERENCES transmissions(id),
            created_at TEXT NOT NULL
        )
        """
    )
    connection.commit()
    return connection


def validate_content(content: str) -> str:
    value = content.strip()
    if not value:
        raise ValueError("Treść wiadomości nie może być pusta.")
    if len(value) > MAX_CONTENT_LENGTH:
        raise ValueError(f"Treść wiadomości może mieć maksymalnie {MAX_CONTENT_LENGTH} znaków.")
    return value


def add_message(
    connection: sqlite3.Connection,
    *,
    direction: str,
    sender: str,
    recipient: str,
    content: str,
    status: str,
    in_reply_to: int | None = None,
) -> dict:
    timestamp = datetime.now(timezone.utc).isoformat()
    cursor = connection.execute(
        """
        INSERT INTO transmissions
            (direction, sender, recipient, content, status, in_reply_to, created_at)
        VALUES (?, ?, ?, ?, ?, ?, ?)
        """,
        (direction, sender, recipient, content, status, in_reply_to, timestamp),
    )
    connection.commit()
    row = connection.execute(
        "SELECT * FROM transmissions WHERE id = ?", (cursor.lastrowid,)
    ).fetchone()
    return dict(row)


def list_messages(connection: sqlite3.Connection) -> list[dict]:
    rows = connection.execute(
        "SELECT * FROM transmissions ORDER BY id DESC LIMIT 100"
    ).fetchall()
    return [dict(row) for row in reversed(rows)]


def run_command(args: argparse.Namespace) -> dict:
    with closing(connect_database()) as connection:
        if args.command == "list":
            return {"success": True, "transmissions": list_messages(connection)}

        content = validate_content(args.content)
        if args.command == "receive":
            sender = args.sender.strip()
            if not sender or len(sender) > 120:
                raise ValueError("Nadawca musi mieć od 1 do 120 znaków.")
            message = add_message(
                connection,
                direction="incoming",
                sender=sender,
                recipient="LOCAL_OPERATOR",
                content=content,
                status="received",
            )
        elif args.command == "reply":
            original = connection.execute(
                "SELECT * FROM transmissions WHERE id = ? AND direction = 'incoming'",
                (args.reply_to,),
            ).fetchone()
            if original is None:
                raise ValueError("Nie znaleziono wiadomości przychodzącej o podanym ID.")
            message = add_message(
                connection,
                direction="outgoing",
                sender="LOCAL_OPERATOR",
                recipient=original["sender"],
                content=content,
                status="queued",
                in_reply_to=original["id"],
            )
            connection.execute(
                "UPDATE transmissions SET status = 'replied' WHERE id = ?",
                (original["id"],),
            )
            connection.commit()
        else:
            message = add_message(
                connection,
                direction="outgoing",
                sender="LOCAL_OPERATOR",
                recipient="GLOBAL_BROADCAST_QUEUE",
                content=content,
                status="queued",
            )
        return {"success": True, "transmission": message}


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description=__doc__)
    commands = parser.add_subparsers(dest="command", required=True)
    commands.add_parser("list", help="List the latest local transmissions")

    receive = commands.add_parser("receive", help="Add an explicitly local inbound test message")
    receive.add_argument("--sender", required=True)
    receive.add_argument("--content", required=True)

    reply = commands.add_parser("reply", help="Queue a local reply to an inbound message")
    reply.add_argument("--reply-to", required=True, type=int)
    reply.add_argument("--content", required=True)

    broadcast = commands.add_parser("broadcast", help="Queue a local global-broadcast record")
    broadcast.add_argument("--content", required=True)
    return parser.parse_args()


def main() -> int:
    try:
        result = run_command(parse_args())
    except (OSError, sqlite3.Error, ValueError) as error:
        print(json.dumps({"success": False, "error": str(error)}, ensure_ascii=False), file=sys.stderr)
        return 1
    print(json.dumps(result, ensure_ascii=False))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
