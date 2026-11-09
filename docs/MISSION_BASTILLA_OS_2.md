# Aktualna misja — Bastilla_10, 2026-11-09

Repozytorium docelowe: `Rush47/Bastilla_10`. Wcześniejsze raporty odzyskiwania Bastilla OS 2 są archiwalnym opisem, nie zgodą na ponowne uruchamianie autonomii.

Polecenie właściciela: pozostawić jako jedyny standard model `dolphin-llama3:8b` (8B uncensored), usunąć instalatory i automatyczne działania mogące zmieniać system oraz naprawić rozbieżność między synchronizacją AI Studio a modelem uruchomionego backendu.

- Polityka modelu jest w kodzie `src/kernel/modelPolicy.ts`; nie zastępuj jej autodetekcją, mniejszym modelem, Gemini/xAI ani szablonami.
- Nie dodawaj automatycznych instalatorów, pobierania modeli, samonaprawy, samomodyfikacji, aktualizacji npm, git pull/commit/push w tle ani wykonywania odpowiedzi modelu jako kodu.
- Zachowaj dane użytkownika, wagi istniejących modeli, archiwa i oryginalne repozytoria. Sam kod nie potwierdza obecności wag na hostingu.
- Odróżniaj model standardowy, pobrany i załadowany. Pokazuj faktyczny status usługi.
- Synchronizacja Git/AI Studio dotyczy źródeł. Zmiana działającego backendu wymaga ręcznego restartu podglądu/serwera. Nie deklaruj wdrożenia bez sprawdzenia tego konkretnego runtime.
- Używaj rzeczywistej delegacji dla niezależnych zakresów, osobnych worktree i jednego autora pliku. Przekazuj uzgodnione kontrakty API.
- Uruchom `npm ci`, `npm run verify`, kontrole API i przeglądarki. Mock transportu jest testem kontraktu, nie potwierdzeniem inferencji 8B. Wyniki i ograniczenia wpisz do `docs/BASTILLA_OS_2_REPORT.md`.
