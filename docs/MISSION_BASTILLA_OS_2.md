# Bastilla OS 2 — misja implementacyjna

Repozytorium docelowe: mmitek515-netizen/Bastilla_OS_2, main.
Zlecenie właściciela: rozwinąć BastillaOS, uruchomić, przetestować, następnie przygotować działający projekt dla Google AI Studio i zsynchronizować kod z tym repozytorium.

## Źródła i odzyskiwanie
- Dotychczasowy pełny kod: https://github.com/u6930438163-code/AI_Studio_BastillaOS (main; zweryfikowany punkt 2203ac94b1dbbad0f9e2a470c00a4b24bc9900ed).
- Codespace właściciela: cuddly-xylophone-gx7rjx9wj7gg29947. GitHub wskazywał dwa niewysłane commity i niezapisane zmiany. Próbowano eksportu do codespace-cuddly-xylophone-gx7rjx9wj7gg29947. Sprawdź, czy eksport istnieje; nie nadpisuj ani nie usuwaj lokalnych zmian.
- Repozytorium mmitek515-netizen/aplikacje podczas kontroli zawierało wyłącznie README. Nie zakładaj, że znajduje się tam kompletne archiwum.
- Nie usuwaj źródeł ani projektów AI Studio. Stary projekt AI Studio został wcześniej trwale usunięty. Zachowany projekt: 976ceb93-8585-4108-8d9a-cc37f16d4d72.
- Nie kopiuj .git, node_modules, .venv ani sekretów. Zachowaj archiwalne źródła bez zmian.

## Role
Alex koordynuje architekturę, backend i integrację. Astyria odpowiada za interfejs i telefon. Aria za modele AI, Ollama, MCP i API. Aurelius za bezpieczeństwo, prywatność i testy.
Użyj rzeczywistej delegacji tylko jeśli środowisko ją obsługuje. W raporcie odróżnij utworzone profile od uruchomionych agentów. Unikaj równoległych edycji tych samych plików.

## Kolejność realizacji
1. Odzyskaj kod źródłowy w gałęzi roboczej tego repozytorium; porównaj z dostępnymi zmianami Codespace.
2. Uruchom istniejącą aplikację i zachowaj działające moduły. Napraw błędy przed rozbudową.
3. Rozwijaj stabilny pulpit BastillaOS 2: terminal, czat agentów, zadania, rzeczywiste statusy integracji i przejrzysta diagnostyka. Zachowaj responsywność na telefonie.
4. Oddziel warstwę webową od systemu operacyjnego. Dla prawdziwego systemu przygotuj powtarzalne uruchomienie na Debianie 13 i QEMU z wykrywaniem KVM oraz jawnym fallbackiem TCG. Nie nazywaj aplikacji webowej uruchomionym jądrem OS.
5. Sprawdź MCP: initialize, notifications/initialized, tools/list, ping oraz bezpieczną operację odczytu. Nie deklaruj połączenia z ChatGPT wyłącznie na podstawie testu localhost. Nie wystawiaj nieuwierzytelnionego zdalnego wykonywania poleceń.
6. Obsłuż niedostępność Ollamy i modeli bez atrap odpowiedzi. Nie zakładaj, że qwen3:14b mieści się w pamięci danego środowiska. Zachowaj prywatność kluczy.
7. Uruchom odpowiednie testy, TypeScript/lint, build, testy API i kontrolę UI. Zapisz faktyczne wyniki oraz brakujące zależności.
8. Przygotuj eksport kodu dla AI Studio, konfigurację startu i instrukcję synchronizacji z tym repozytorium. W AI Studio wcześniej występowały Quota limits exceeded i Permission denied; adres dev przekierowywał klientów MCP do kontroli cookies. Wdrożenie wymaga rzeczywistego dostępu do AI Studio. Nie omijaj kontroli dostępu i nie twierdź, że wdrożono bez weryfikacji.

## Kryteria odbioru
- npm ci, npm test, npm run lint i npm run build: wyniki w raporcie; istniejące błędy jawnie opisane.
- Serwer działa, a testy API i UI sprawdzają rzeczywistą instancję.
- Rejestr zadań pokazuje completed wyłącznie przy istniejącym artefakcie; brak fikcyjnej telemetrii.
- Status MCP oddziela: kod / localhost / HTTPS / połączenie klienta.
- PR z opisem zmian, logami testów, ograniczeniami i planem uruchomienia.
- Raport docs/BASTILLA_OS_2_REPORT.md: co wykonano, co uruchomiono, co blokuje dalszą pracę.
- Nie obiecuj terminu ani procentu ukończenia bez mierzalnej checklisty.

Właściciel upoważnił do implementacji, uruchomienia, testowania, synchronizacji i końcowego przeniesienia do AI Studio. Nie usuwaj innych projektów w ramach tej misji.
