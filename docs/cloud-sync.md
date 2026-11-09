# Bastilla Cloud Sync — etap 1

Widok **Zdjęcia i Notatki** dostępny z nawigacji BastillaOS (również mobilnej, w menu „Więcej”).

## Aktualne możliwości
- Lokalny wybór JPG, PNG i WebP pobranych z Google Photos.
- Lokalny wybór PDF, TXT i Markdown wyeksportowanych z Samsung Notes.
- Walidacja typu i limitu 20 MB na plik; lista maksymalnie 100 pozycji.
- Wyłącznie metadane w pamięci karty przeglądarki: nazwa, rozmiar, typ. Nie ma uploadu, przechowywania plików ani udostępniania agentom.

## Ograniczenia i kolejne etapy
- **Nie ma jeszcze integracji kont Google Photos OAuth, synchronizacji ani dostępu do galerii przez API.** Google Photos API ma ograniczenia dotyczące dostępu do istniejącej biblioteki. Należy rozważyć Google Photos Picker API i autoryzację użytkownika, weryfikując aktualną dokumentację Google.
- **Samsung Notes nie udostępnia ogólnego publicznego API do pełnej dwukierunkowej synchronizacji.** Eksport PDF/TXT jest najbezpieczniejszym punktem startowym.
- Przed udostępnianiem treści agentom należy dodać serwerowy magazyn z kontrolą dostępu, szyfrowaniem, limitami, skanowaniem plików, zgodami per agent i możliwością usunięcia danych.
- Nie przechowywać tokenów OAuth w repozytorium ani w localStorage. Użyć sesji serwerowych i minimalnych zakresów dostępu.

## Weryfikacja
Po pobraniu gałęzi: `npm ci && npm run lint && npm run build && npm test`. Zmiany nie są automatycznie wdrażane na produkcję.
