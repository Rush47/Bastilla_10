# LibreChat — Ubuntu AI

## Jednorazowa instalacja
Uruchom w katalogu repozytorium:
```bash
bash scripts/install-librechat-once.sh
bash scripts/librechat.sh configure
bash scripts/librechat.sh start
```
Instalator przygotowuje pliki i usuwa **tylko własny plik lokalny** po powodzeniu. Nie usuwa instalacji, bazy danych ani pliku .env. Git może pokazać usunięty śledzony plik; kopia w repozytorium pozostaje. Ustaw `UBUNTU_AI_KEEP_INSTALLER=1`, jeśli chcesz zachować lokalny instalator.

## Zarządzanie bez ponownej instalacji
```bash
bash scripts/librechat.sh status
bash scripts/librechat.sh start
bash scripts/librechat.sh stop
bash scripts/librechat.sh logs
bash scripts/librechat.sh configure
```

## Utrzymanie
```bash
bash scripts/librechat-diagnose.sh
bash scripts/librechat-update.sh
```

Instalator nie instaluje automatycznie Dockera ani nie uruchamia usług przed skonfigurowaniem sekretów. Autostart po restarcie Ubuntu wymaga działającego demona Docker i odpowiednich zasad restartu usług Compose. Typowy port LibreChat to 3080 — zweryfikuj mapowanie portów.

**Status:** skrypty zarządzania są w repozytorium. Nie potwierdzono jeszcze działającej instancji, integracji z GUI ani połączenia z oryginalnymi agentami Aria, Alex, Astyria, Aurelius. Dane logowania i klucze API przechowuj poza Git.
