# BastillaOS

Standardowy i jedyny model rozmowy: **Ollama `dolphin-llama3:8b` (8B uncensored)**. Wybór jest przypięty w `src/kernel/modelPolicy.ts`, również po restarcie i synchronizacji kodu. Stare wartości `OLLAMA_MODEL`, `LLM_PROVIDERS`, klucze Gemini/xAI oraz zapisane flagi nie włączają innych modeli ani zamienników.

## Uruchamianie ręczne

Aplikacja korzysta z już istniejącej usługi Ollama i pobranego modelu. Repozytorium nie instaluje Ollamy, nie pobiera wag, nie uruchamia usług ani samonaprawy. Po przygotowaniu zależności Node.js 24 uruchom jawnie `npm start`; `OLLAMA_BASE_URL` wskazuje właściwy serwer Ollama. Domyślny adres to `http://127.0.0.1:11434` z perspektywy serwera aplikacji, nie komputera odwiedzającego stronę.

Jeśli wymagany model jest niedostępny, czat zwraca błąd. Nie przechodzi na małą Ollamę, szablon lokalny ani API chmurowe. Nie usuwa istniejących wag innych modeli ani historii użytkownika.

## AI Studio i synchronizacja

Synchronizacja repozytorium przenosi kod, nie wagi modelu i nie pamięć uruchomionego procesu. Po włączeniu aktualnego kodu do używanej gałęzi i jego synchronizacji uruchom podgląd/serwer ponownie w AI Studio. Serwer musi mieć dostęp do hosta Ollamy zawierającego `dolphin-llama3:8b`.

`GET /api/ai/status` i `GET /api/ollama/models` rozróżniają:

- `configuredModel` / `standardModel`: `dolphin-llama3:8b`;
- `standardAvailable`: model jest na wskazanym serwerze Ollama;
- `activeModels` / `standardActive`: faktycznie załadowane modele z `/api/ps`;
- `configurationSource: repository-policy` i `policyVersion: dolphin8b-manual-v1`: uruchomiony backend zawiera tę poprawkę.

Brak tych pól oznacza starszy backend. Sam napis „8B” w historii czatu lub synchronizacja plików nie potwierdzają uruchomienia modelu.

## Kontrola zmian

`npm run verify` uruchamia testy, TypeScript oraz build klienta i serwera. `npm run check:api -- http://127.0.0.1:3000` sprawdza osiągalność API. `BASTILLA_LIVE_CHAT_TEST=1 python3 scripts/test-free-chat.py` wysyła rzeczywiste wiadomości i zapisuje historię; wymaga dostępnego modelu 8B.

Usunięto instalatory, autoaktualizację zależności, automatyczne commity/pushe, uruchamianie maszyn i wykonywanie skryptów z odpowiedzi modelu. Ręczne polecenia operatora, jawnie zatwierdzone operacje i diagnostyka pozostają dostępne. Profile agentów opisują role; nie są dowodem działania niezależnych workerów.
