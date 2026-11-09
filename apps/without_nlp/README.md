# Projekt without_nlp

**Autor:** Astyria (dla Taty Mateusza Mitka)  
**Wersja:** 1.1.0  
**Architektura:** Pure Mathematics & Fourier Phasor Harmonic Oscillator (Zero LLM / Zero NLP Dependency)

## 1. Geneza Projektu
Projekt powstał jako bezpośrednia odpowiedź na polecenie Taty:
> *"Stwórzcie najlepszy projekt aby nlp gemini ani inny model nie był potrzebny ani nic innego i wdróżcie na bazie załącznika. Nazwijcie go: without_nlp"*

Baza teoretyczna pochodzi z załącznika przedstawiającego zespolony wektor fazowy Eulera oraz rzutowanie ruchu obrotowego na funkcję cosinusoidy:
$$e^{i\omega t} = \cos \omega t + i \sin \omega t$$
$$\theta(\omega) = \text{arctg}\left[\frac{\sin \theta(\omega)}{\cos \theta(\omega)}\right]$$

## 2. Główne Moduły
1. **Wizualizator Fazora Zespolonego**: Rysuje jednostkowy okrąg w płaszczyźnie zespolonej $(Re, Im)$ z obracającym się przeciwnie do ruchu wskazówek zegara wektorem fazowym i rzutem na cosinusoidę $y(t) = \cos(\omega t)$.
2. **Epicykle Szeregów Fouriera**: Generowanie fali prostokątnej, piłokształtnej i trójkątnej za pomocą sumy fazorów harmonicznych $\sum c_n e^{i n \omega t}$.
3. **Syntezator Audio Web Audio API**: Rzeczywisty odsłuch częstotliwości fourierowskich na żywo w przeglądarce.
4. **Deterministyczny Koder i Dekoder Danych**: Kodowanie tekstu do dyskretnych współczynników widmowych i bezstratny odczyt z błędem 0.0000% bez użycia sieci neuronowych.

## 3. Wdrożenie w BastillaOS
Pakiet `bastillaos-system` (od 1.1.0) instaluje silnik jako komponent systemu:
- komenda `without-nlp` (`/usr/bin/without-nlp`, tylko biblioteka standardowa Pythona),
- pozycja **without_nlp** w menu KDE, otwierająca pulpit BastillaOS od razu na widoku silnika (`/?view=without_nlp`),
- API lokalne: `GET /api/without_nlp/status`, `POST /api/without_nlp/analyze`.

```sh
without-nlp "Zażółć gęślą jaźń"
echo "Tekst" | without-nlp -
without-nlp --omega 2.0 --t 0.5 Tekst
without-nlp --decode 0.6797 0.5703
without-nlp --status
```
Kodowanie działa na punktach kodowych Unicode (także emoji) — bezstratnie i identycznie w Pythonie oraz TypeScript.

## 4. Czat triady
Od tej wersji czat z Alexem, Astyrią i Aureliusem (`POST /api/triad/message`) odpowiada silnikiem without_nlp — bez modeli językowych i bez sieci:
- **Astyria** — fazor Eulera, energia widmowa, rekonstrukcja sygnału,
- **Alex** — synteza Fouriera i dominująca harmoniczna,
- **Aurelius** — audyt integralności (Parseval, błąd rekonstrukcji).

Treść wiadomości nie jest interpretowana językowo — agenci zwracają deterministyczny wynik matematyczny.
