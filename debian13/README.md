# Nowy system oparty na Debianie 13

Ten katalog jest niezależnym obszarem prac nad nowym systemem. Nie importuj kodu aplikacji z katalogu głównego repozytorium. Nazwa repozytorium jest historyczna i nie określa nazwy nowego produktu.

Profil `.devcontainer/debian13/devcontainer.json` otwiera ten katalog. Instalacja zależności dotyczy wyłącznie lokalnego `package-lock.json`; nie uruchamiaj skryptów starej aplikacji z katalogu głównego.

Na tej gałęzi przygotowano środowisko, a nie działający system ani bootowalne ISO. Samo otwarcie Codespaces nie uruchamia agentów AI. Wyniki budowania, testów i startu systemu wymagają osobnych dowodów.
