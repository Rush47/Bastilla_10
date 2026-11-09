# Raport Bastilla OS 2 — 2026-11-01

## Wykonano

- Odtworzono 225 plików źródłowych z commit `2203ac94b1dbbad0f9e2a470c00a4b24bc9900ed`.
- Zachowano istniejące profile agentów i misję repozytorium docelowego.
- Dodano podział odpowiedzialności, kolejkę priorytetów i konwencje nazw.
- Ustawiono nazwę npm `bastilla-os-2`, zachowując kompatybilne ścieżki i identyfikatory.
- Dodano równoległe `npm run verify`; automatyczna synchronizacja używa tego samego zestawu kontroli.
- Dodano CI z cache npm i anulowaniem nieaktualnych przebiegów tej samej gałęzi.
- Usunięto zależność od globalnego `__dirname` w konfiguracji Vite.
- Zastąpiono odziedziczoną konfigurację Firebase ustawieniami własnego wdrożenia.
- Pominięto prywatne bazy danych, historyczny stan zadań, eksporty, środowiska i archiwa.

## Faktycznie sprawdzono lokalnie

- `npm ci --ignore-scripts --no-audit --no-fund`: 317 pakietów z lockfile.
- `npm test`: 90/90 testów przeszło.
- `npm run lint`: poprawny TypeScript.
- `npm run build`: poprawna kompilacja UI.
- `npm run build:server`: poprawna kompilacja backendu.
- `npm run verify`: wszystkie cztery kontrole przeszły równolegle.
- Serwer produkcyjny uruchomiony lokalnie na porcie 3099 na czas testu.
- `npm run check:api -- http://127.0.0.1:3099`: pięć punktów API przeszło kontrolę.
- Ollama: offline; nie potwierdzono działania modelu.

## Pozostałe ograniczenia

Profile Alex, Aria, Astyria i Aurelius istnieją; nie potwierdzono uruchomionych
zewnętrznych procesów tych agentów. Ten import i kontrole wykonał Codex.
Nie porównano niewysłanych zmian Codespace. Nie uruchamiano VM, budowania ISO
ani wdrożenia AI Studio; nie potwierdzono połączenia MCP z klientem ChatGPT.
Backend odziedziczył rozbudowane endpointy zapisu i wymaga audytu przed
publicznym udostępnieniem. Build zgłasza duży pakiet JS (~1.85 MB przed gzip);
podział ładowania UI jest kolejnym zadaniem optymalizacyjnym.
Raport nie określa procentu ukończenia całego systemu.

## Naprawa czatu — Rush47/Bastilla_10, 2026-11-09

- Oddzielono historię poszczególnych agentów: pytania skierowane wyłącznie do Arii nie trafiają do kontekstu Alexa. Wspólne wymiany Triady są zachowane; limit historii nie pozostawia osieroconej odpowiedzi modelu.
- Frontend wysyła `X-Bastilla-UI: 1`, dzięki czemu błędy modeli wracają jako jawne JSON także przez proxy podglądu. Backend respektuje `CHAT_LOCAL_FALLBACK=off` po awarii modelu.
- Ujednolicono zapis i sprawdzanie wiadomości z `@model`, również z załącznikami. Prefiks wymaga granicy słowa, a sam `@model` bez pliku zwraca HTTP 400.
- Instrukcja rozmowy respektuje temat i żądaną długość odpowiedzi; formatowanie i multimedia są opcjonalne.
- `scripts/test-free-chat.py` używa prawidłowego identyfikatora Arii (`si_1`), sprawdza pochodzenie odpowiedzi, zapis transkryptu i powrót do poprzedniego tematu. Domyślnie odrzuca szablony `local_nlp`; `--allow-local` dopuszcza ich osobny test. Timeout klienta można ustawić przez `BASTILLA_CHAT_TEST_TIMEOUT` (domyślnie 400 s).

### Weryfikacja

- `npm ci`: zakończone powodzeniem (317 pakietów).
- `npm run verify` po rebase na `cec3451`: 98/98 testów, TypeScript, build klienta i build serwera zaliczone. Pierwsze uruchomienie w sandboxie miało `spawnSync python3 EPERM`; wymagane kontrole uruchomiono ponownie poza sandboxem. Pozostaje ostrzeżenie Vite o dużym pakiecie klienta.
- `npm run check:api -- http://127.0.0.1:3000`: pięć endpointów osiągalnych. Lokalna Ollama jest offline; nie jest to dowód połączenia z nią.
- Chromium/Playwright, końcowy interfejs po rebase: wysłanie `@model` bez pliku i z plikiem tekstowym zachowuje poprawny transkrypt i czyści pole dopiero po sukcesie. Z notatki „Kolor: niebieski.” model odczytał „Niebieski.”. Sprawdzono nagłówek UI, brak fałszywego błędu zapisu, odrzucenie pustego `@model`, jawny błąd niedostępnego modelu oraz zachowanie tekstu po niepowodzeniu. Przy szerokości 390 px nie ma poziomego przepełnienia.
- Rzeczywisty lokalny model `Qwen2.5-1.5B-Instruct`, llama.cpp, CPU, Q4_K_M: 12 wiadomości (po trzy do Arii, Alexa, Astyrii i Aureliusa), 0 błędów transportu, zapisu i testu pamięci. Każdy agent na pytanie o temat poprzedniej wiadomości odpowiedział „Astronomia.”.
- Model działał przez lokalny endpoint zgodny z OpenAI, używający istniejącego transportu xAI (`XAI_BASE_URL` na localhost). Metadane `xai:Qwen2.5-1.5B-Instruct` oznaczają ten lokalny test, a nie połączenie z usługą xAI/Grok.

### Ograniczenia

Mały model testowy popełniał błędy językowe i rzeczowe w poradach astronomicznych. Wynik potwierdza działanie transportu, historii i pamięci tematu, nie jakość odpowiedzi większych modeli. Wcześniejszy model 0,5B nie zdał sprawdzenia pamięci. Nie weryfikowano Gemini, zewnętrznego xAI, wdrożenia AI Studio ani połączenia klienta ChatGPT. Testy używały osobnej kopii aplikacji i testowego pliku stanu; modele, zależności i historia testowa nie są częścią zmiany.

Powtórzenie testu na uruchomionej instancji z dostępnym modelem:

```sh
BASTILLA_LIVE_CHAT_TEST=1 python3 scripts/test-free-chat.py
```

Polecenie wysyła rzeczywiste wiadomości i zapisuje je w historii wybranej instancji; może zużywać limit dostawcy API. Inny serwer można wskazać przez `BASTILLA_API_URL`.
