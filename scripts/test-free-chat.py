#!/usr/bin/env python3
"""Manual live free-chat probe. Sends ordinary messages; never command prefixes."""
import argparse, json, os, re, sys, urllib.request, urllib.error
BASE = os.environ.get("BASTILLA_API_URL", "http://127.0.0.1:3000").rstrip("/")
TIMEOUT = float(os.environ.get("BASTILLA_CHAT_TEST_TIMEOUT", "400"))
AGENTS = ("si_1", "Alex", "Astyria", "Aurelius")
PROMPTS = (
    "Cześć! Przedstaw się jednym zdaniem i powiedz, w czym możesz pomóc.",
    "Lubię astronomię. Zaproponuj mi prosty sposób obserwowania nocnego nieba bez teleskopu. Odpowiedz krótko.",
    "Jaka dziedzina mnie interesuje według mojej poprzedniej wiadomości? Odpowiedz jednym zdaniem.",
)
def send(agent, message):
    body = json.dumps({"agent": agent, "message": message}, ensure_ascii=False).encode()
    request = urllib.request.Request(BASE + "/api/triad/message", data=body,
        headers={"Content-Type": "application/json"}, method="POST")
    try:
        with urllib.request.urlopen(request, timeout=TIMEOUT) as response:
            return response.status, json.load(response)
    except urllib.error.HTTPError as exc:
        return exc.code, {"error": exc.read(1200).decode(errors="replace")}
    except (urllib.error.URLError, TimeoutError, ValueError) as exc:
        return 0, {"error": str(exc)}
def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.parse_args()
    if os.environ.get("BASTILLA_LIVE_CHAT_TEST") != "1":
        sys.exit("Live chat sends messages and persists chat history. Set BASTILLA_LIVE_CHAT_TEST=1 to consent.")
    failures = 0
    for agent in AGENTS:
        print(f"\n=== {agent} ===")
        for index, prompt in enumerate(PROMPTS, 1):
            status, data = send(agent, prompt)
            print(f"Turn {index}: HTTP {status}; success={data.get('success')}; keys={sorted(data)}")
            for key in ("engines", "provider", "nlpProvider", "model", "fallback", "error"):
                if key in data: print(f"{key}: {str(data[key])[:300]}")
            replies = data.get("replies", data.get("reply", data.get("response", data.get("message"))))
            print("Response excerpt:", json.dumps(replies, ensure_ascii=False, default=str)[:900])
            reply = data.get("replies", {}).get(agent)
            engine = data.get("engines", {}).get(agent, "")
            history = data.get("state", {}).get("store", {}).get("chat_history", [])
            persisted = any(
                entry.get("agent") == "Mateusz Mitek" and entry.get("tekst") == prompt
                and pos + 1 < len(history)
                and history[pos + 1].get("agent") == agent
                and history[pos + 1].get("tekst") == reply
                for pos, entry in enumerate(history)
            )
            model_reply = engine == "ollama:dolphin-llama3:8b"
            if (status != 200 or data.get("success") is not True
                    or not isinstance(reply, str) or not reply.strip() or not persisted
                    or not model_reply):
                failures += 1
                print("FAIL: expected a persisted reply from dolphin-llama3:8b; engine=", engine)
            elif index == len(PROMPTS) and not re.search(r"astronom|nieb|gwiazd|kosmos", reply, re.IGNORECASE):
                failures += 1
                print("FAIL: reply did not recall the topic of the previous message")
    print(f"\nCompleted with {failures} transport/response/context failures.")
    print("Model provenance and transcript persistence checked. Review reply text for relevance and memory.")
    sys.exit(1 if failures else 0)
if __name__ == "__main__":
    main()
