# Ubuntu AI — zasada skryptów jednorazowych

Wszystkie **instalatory, migracje i skrypty wstępnej konfiguracji** są jednorazowe. Po zweryfikowaniu powodzenia usuwają własny plik **z lokalnego systemu**, nigdy z repozytorium GitHub. Nie wolno usuwać skryptu w razie błędu, aby można było wznowić instalację.

## Bezpieczny cykl
1. Sprawdź wymagania i istniejącą instalację.
2. Wykonaj instalację bez nadpisywania sekretów ani danych.
3. Zweryfikuj rezultat (np. stan usług i połączenie z aplikacją).
4. Zapisz znacznik ukończenia w trwałym katalogu danych.
5. Usuń lokalny instalator, jeśli jest zwykłym plikiem i zakończył się sukcesem.

**Wyjątki funkcjonalne:** sterowniki usług, moduły GUI, diagnostyka i aktualizatory muszą pozostać dostępne. Nie są skryptami jednorazowej instalacji. Jeśli są wdrażane przez skrypt bootstrap, sam bootstrap usuwa się, ale zainstalowany moduł pozostaje.

## Uwaga
Obecny `scripts/install-librechat-once.sh` usuwa się po przygotowaniu plików, a nie po teście działającej aplikacji. Do czasu wdrożenia pełnej walidacji nie należy traktować jego znacznika jako dowodu gotowości produkcyjnej. W systemach uruchamianych z Git lokalne samousunięcie śledzonego pliku pokaże się jako zmiana w katalogu roboczym. Nie wykonuj automatycznego `git add -A` po instalacji.

Nigdy nie usuwaj automatycznie plików .env, pamięci agentów, danych LibreChat ani backupów.
