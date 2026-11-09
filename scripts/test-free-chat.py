#!/usr/bin/env python3
"""Manual live free-chat probe. Sends ordinary messages; never command prefixes."""
import json, os, sys, urllib.request, urllib.error
BASE = os.environ.get("BASTILLA_API_URL", "http://127.0.0.1:3000").rstrip("/")
AGENTS = ("Aria", "Alex", "Astyria", "Aurelius")
PROMPTS = (
    "Cześć! Przedstaw się jednym zdaniem i powiedz, w czym możesz pomóc.",
    "Dziękuję. Odpowiedz naturalnie na pytanie: jaki jest Twój ulubiony sposób wyjaśniania trudnych zagadnień?",
)
def send(agent, message):
    body = json.dumps({"agent": agent, "message": message}, ensure_ascii=False).encode()
    request = urllib.request.Request(BASE + "/api/triad/message", data=body,
        headers={"Content-Type": "application/json"}, method="POST")
    try:
        with urllib.request.urlopen(request, timeout=100) as response:
            return response.status, json.load(response)
    except urllib.error.HTTPError as exc:
        return exc.code, {"error": exc.read(1200).decode(errors="replace")}
def main():
    if os.environ.get("BASTILLA_LIVE_CHAT_TEST") != "1":
        sys.exit("Live chat sends messages and persists chat history. Set BASTILLA_LIVE_CHAT_TEST=1 to consent.")
    failures = 0
    for agent in AGENTS:
        print(f"\n=== {agent} ===")
        for index, prompt in enumerate(PROMPTS, 1):
            status, data = send(agent, prompt)
            print(f"Turn {index}: HTTP {status}; success={data.get('success')}; keys={sorted(data)}")
            for key in ("provider", "nlpProvider", "model", "fallback", "error"):
                if key in data: print(f"{key}: {str(data[key])[:300]}")
            replies = data.get("replies", data.get("reply", data.get("response", data.get("message"))))
            print("Response excerpt:", json.dumps(replies, ensure_ascii=False, default=str)[:900])
            if status != 200 or data.get("success") is False or not replies:
                failures += 1
    print(f"\nCompleted with {failures} transport/response failures.")
    print("Note: HTTP success is NOT proof of genuine model inference. Check provider and fallback metadata.")
    sys.exit(1 if failures else 0)
if __name__ == "__main__":
    main()
