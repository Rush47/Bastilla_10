## Ubuntu worker backend (pierwszy etap)

Na Ubuntu 24.04:

```bash
sudo apt-get update && sudo apt-get install -y python3-venv
python3 -m venv .venv
. .venv/bin/activate
pip install -r ubuntu/requirements.txt
uvicorn ubuntu.api:app --host 127.0.0.1 --port 8000
python3 -m unittest discover -s ubuntu/tests
```

Dostępne `/api/health`, `/api/observe`, `/api/tasks`. Obserwacja obejmuje rzeczywiste dane procesów, pamięci i modeli Ollama; pozostałe wymiary uczciwie zwracają `not_connected`. Zadania są zapisywane na dysku. To nie jest jeszcze pełny orkiestrator, czat ani ISO. API nasłuchuje lokalnie; nie wystawiaj bez uwierzytelnienia do Internetu.

Agent **System** jest piątym, niezależnym agentem na liście. Instalator tworzy też osobne konto Linux `System` z dostępem sudo. Docelowy silnik: lokalna Ollama; obecny rejestr nie potwierdza jeszcze sesji inferencji.\n
## Instalacja na Ubuntu (systemd)

W sklonowanym repozytorium:

```bash
sudo bash ubuntu/install-production.sh
sudo passwd System
```

Instalator tworzy **konto Linux System** z prawem sudo; druga komenda ustawia mu hasło. Osobno istnieje **agent AI System**. Wszystkich pięć daemonów uruchamia systemd, ale obecnie realizują obserwację systemu, a nie samodzielną inferencję agentów źródłowych.

Aby aktywować odpowiedzi agenta System, zainstaluj Ollamę zgodnie z https://ollama.com/download/linux, następnie:

```bash
ollama pull dolphin3:8b
sudo systemctl restart ubuntu-ai-api.service
curl http://127.0.0.1:8000/api/health
curl -sS -X POST http://127.0.0.1:8000/api/agents/system/chat -H 'Content-Type: application/json' -d '{"message":"Cześć, System!"}'
sudo systemctl status ubuntu-ai-api.service
```

Domyślny model `dolphin3:8b` jest wariantem Dolphin 3.0 opisywanym jako uncensored. Jeśli chcesz inny model, pobierz go w Ollamie i ustaw `OLLAMA_MODEL` w `/etc/ubuntu-ai/daemon.env`. Instalator nie uruchamia niezweryfikowanego zdalnego skryptu instalacyjnego. Lokalny endpoint API nie ma uwierzytelniania: **nie wystawiaj portu 8000 do Internetu**.

Uwaga: konfiguracja i testy zostały zapisane w repozytorium, ale nie potwierdzono ich działania na docelowej maszynie.

Model domyślny: **dolphin3:8b** (Dolphin 3.0, uncensored). Instalacja modelu: `ollama pull dolphin3:8b`.\n
## Lokalna konsola Python + Bash + root

Uruchom w interaktywnym terminalu Ubuntu:

```bash
python3 ubuntu/python-console.py
```

Przykłady: `shell("pwd")`, `shell("id", root=True)`, `root_shell()`.
Polecenia z `root=True` i `root_shell()` używają sudo; wymagają autoryzacji. Nie uruchamiaj tej konsoli jako usługi sieciowej ani nie udostępniaj jej agentom bez kontroli dostępu. Konsola nie jest jeszcze wbudowana w GUI.

## Polecenia naturalnym językiem — edytowalne skrypty Python

Po zainstalowaniu zależności `ubuntu/requirements.txt` i uruchomieniu Ollamy z modelem `dolphin3:8b`:

```bash
PYTHONPATH=. .venv/bin/python ubuntu/natural-language-console.py
```

W instalacji produkcyjnej:

```bash
cd /opt/ubuntu-ai
/opt/ubuntu-ai/.venv/bin/python ubuntu/natural-language-console.py
```

Wpisz polecenie naturalnym językiem. Ollama wygeneruje **projekt** kodu, który zapisze się do `~/ubuntu-ai-scripts/system-*.py`. Program otworzy plik w edytorze `$EDITOR` (domyślnie `nano`); możesz zmienić cały kod. Po zamknięciu edytora wybierz `n` (nie wykonuj), `u` (uruchom jako użytkownik) lub `r` (root przez sudo i dodatkowe potwierdzenie). Kod nie uruchamia się automatycznie. Przed uruchomieniem jako root przejrzyj wszystkie polecenia.

## Modyfikacja źródeł kernela Linux przez Ollamę

Wymagane: lokalny Git checkout źródeł Linux, Ollama z modelem `dolphin3:8b`, edytor tekstowy oraz środowisko Python projektu.

```bash
cd /opt/ubuntu-ai
/opt/ubuntu-ai/.venv/bin/python ubuntu/kernel-source-editor.py \
  --kernel-tree /home/System/linux \
  --file kernel/sched/core.c
```

Program prosi o opis zmiany naturalnym językiem, generuje propozycję przez Ollamę, otwiera edytor i pokazuje różnice. Zachowuje kopię oryginału `*.ollama-backup`; wpisz `KEEP`, aby zachować zmiany. Nie wykonuje kodu i nie instaluje kernela.

Po sprawdzeniu zmian można osobno zbudować kernel:

```bash
bash ubuntu/build-kernel.sh /home/System/linux
```

Skrypt kompiluje w oddzielnym katalogu, wymaga potwierdzenia `BUILD` i nie wykonuje `make install`, `modules_install`, zmian GRUB ani restartu. Kompilacja wymaga odpowiednich pakietów i miejsca na dysku. Nie jest to modyfikacja pamięci działającego jądra ani gwarancja, że wygenerowana zmiana jest bezpieczna. Zachowaj oryginalny kernel jako opcję rozruchową; niepotwierdzone zmiany mogą uniemożliwić uruchomienie systemu.

## Lokalny czat root — automatyczne wykonywanie poleceń

Po zainstalowaniu Ollamy i pobraniu `dolphin3:8b`, uruchom w lokalnym interaktywnym terminalu:

```bash
cd /opt/ubuntu-ai
sudo /opt/ubuntu-ai/.venv/bin/python ubuntu/root-chat.py
```

Wpisz polecenie po polsku. Ollama generuje komendę Bash, a sesja uruchomiona jako root wykonuje ją bez osobnego potwierdzenia każdego polecenia, pokazując komendę i rzeczywisty wynik procesu. `/exit` kończy sesję. **Uwaga:** model może wygenerować błędne lub destrukcyjne polecenie, a wykonanie następuje natychmiast. Funkcja przeznaczona wyłącznie do zaufanego lokalnego terminala; nie udostępniaj jej przez sieć i wykonaj kopię ważnych danych.
