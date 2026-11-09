#!/usr/bin/env bash
# Uruchamia serwer SVL i restartuje go po każdym zakończeniu. Jedna instancja naraz.
cd "$(dirname "$0")/.." || exit 1
exec 9>/tmp/svl-keepalive.lock
flock -n 9 || exit 0
while true; do
  npm run dev >> /tmp/svl.log 2>&1
  echo "[keep-alive] serwer zakończył pracę ($(date)), restart za 3 s" >> /tmp/svl.log
  sleep 3
done
