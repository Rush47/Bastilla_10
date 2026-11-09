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

Agent **System** jest piątym, niezależnym agentem na liście. Nie tworzy konta Linux, nie nadaje uprawnień sudo i nie uruchamia usług automatycznie.

## Model i uruchamianie ręczne

Jedyny standardowy model to istniejący `dolphin-llama3:8b` (uncensored). Aplikacja nie instaluje Ollamy, nie pobiera modelu i nie przełącza się na inny lub mniejszy model. Brak wymaganego modelu jest błędem konfiguracji, a nie powodem do instalacji wariantu zastępczego.

Po przygotowaniu środowiska i uruchomieniu Ollamy przez operatora można jawnie uruchomić API poleceniem podanym wyżej i sprawdzić:

```bash
curl http://127.0.0.1:8000/api/health
curl -sS -X POST http://127.0.0.1:8000/api/agents/system/chat -H 'Content-Type: application/json' -d '{"message":"Cześć, System!"}'
```

Instalatory, instalacja konta systemowego i automatyczne włączanie daemonów zostały usunięte. Ta zmiana źródeł nie usuwa istniejących danych, wag modeli ani usług z docelowej maszyny.

## Lokalna konsola Python + Bash + root

Uruchom w interaktywnym terminalu Ubuntu:

```bash
python3 ubuntu/python-console.py
```

Przykłady: `shell("pwd")`, `shell("id", root=True)`, `root_shell()`.
Polecenia z `root=True` i `root_shell()` używają sudo; wymagają autoryzacji. Nie uruchamiaj tej konsoli jako usługi sieciowej ani nie udostępniaj jej agentom bez kontroli dostępu. Konsola nie jest jeszcze wbudowana w GUI.

## Polecenia naturalnym językiem — edytowalne skrypty Python

Po zainstalowaniu zależności `ubuntu/requirements.txt` i uruchomieniu Ollamy z modelem `dolphin-llama3:8b`:

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

Wymagane: lokalny Git checkout źródeł Linux, Ollama z modelem `dolphin-llama3:8b`, edytor tekstowy oraz środowisko Python projektu.

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
