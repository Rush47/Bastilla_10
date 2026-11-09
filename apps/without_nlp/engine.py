#!/usr/bin/env python3
"""
without_nlp — Deterministyczny Silnik Harmoniczny Eulera & Fouriera
Autor: Astyria dla Taty Mateusza Mitka
Brak zależności od LLM / NLP — Czysta Matematyka i Zespolone Fazory Eulera

W BastillaOS dostępny jako komenda systemowa `without-nlp`:

    without-nlp "Tekst"                # analiza sygnału (JSON)
    echo "Tekst" | without-nlp -       # tekst ze standardowego wejścia
    without-nlp --omega 2.0 --t 0.5 X  # własne parametry fazora
    without-nlp --decode 0.6797 0.5703 # odczyt ze współczynników
    without-nlp --status               # metryki silnika

Wynik jest zgodny z silnikiem TypeScript (punkty kodowe Unicode) (src/lib/withoutNlpEngine.ts).
Tylko biblioteka standardowa Pythona — brak sieci, brak modeli.
"""
import argparse
import cmath
import json
import math
import sys

VERSION = "8.6.0-WithoutNLP-PureMath"
FORMULA = "e^(i*omega*t) = cos(omega*t) + i*sin(omega*t)"
MODEL_NEEDED = "NONE — 100% PURE MATHEMATICS"
MAX_HARMONICS = 8


def _r(value: float, digits: int = 4) -> float:
    """Zaokrąglenie zgodne z Math.round w silniku TypeScript."""
    scale = 10 ** digits
    return math.floor(value * scale + 0.5) / scale


def euler_phasor(omega: float, t: float) -> complex:
    """Oblicza wektor zespolony e^(i*omega*t) = cos(omega*t) + i*sin(omega*t)"""
    return cmath.exp(1j * omega * t)


def phase_angle(phasor: complex) -> float:
    """Kąt fazowy theta(omega) = arctg(sin/cos)"""
    return math.atan2(phasor.imag, phasor.real)


def fourier_encode(text: str):
    """Deterministyczne kodowanie tekstu (punkty kodowe Unicode) w współczynniki widmowe"""
    return [_r(ord(ch) / 128.0) for ch in text]


def fourier_decode(coeffs):
    """Bezstratny deterministyczny odczyt ze współczynników"""
    return "".join(chr(math.floor(float(c) * 128.0 + 0.5)) for c in coeffs)


def compute_harmonics(coeffs, omega: float, t: float, max_harmonics: int = MAX_HARMONICS):
    """Składowe szeregu Fouriera (epicykle fazowe) sum c_n e^(i n omega t)"""
    count = min(max(len(coeffs), 1), max_harmonics)
    harmonics = []
    for idx in range(count):
        n = idx + 1
        amp = coeffs[idx] if idx < len(coeffs) else 1.0 / n
        freq = n * omega
        z = amp * euler_phasor(freq, t)
        harmonics.append({
            "n": n,
            "frequency": _r(freq, 3),
            "amplitude": _r(amp),
            "phase": _r(phase_angle(z)),
            "real": _r(z.real),
            "imag": _r(z.imag),
        })
    return harmonics


def analyze_signal(text: str, omega: float = 1.5, t: float = 1.0):
    clean = (text or "").strip() or "WITHOUT_NLP"
    encoded = fourier_encode(clean)
    decoded = fourier_decode(encoded)
    phasor = euler_phasor(omega, t)
    theta = phase_angle(phasor)
    return {
        "project": "without_nlp",
        "version": VERSION,
        "formula": FORMULA,
        "input_text": clean,
        "fundamental_omega": omega,
        "t": t,
        "phasor_sample": {
            "real": _r(phasor.real),
            "imag": _r(phasor.imag),
            "theta_rad": _r(theta),
            "theta_deg": _r(math.degrees(theta), 2),
            "magnitude": _r(abs(phasor)),
        },
        "encoded_coefficients": encoded,
        "decoded_text": decoded,
        "harmonics": compute_harmonics(encoded, omega, t),
        "spectral_energy": _r(sum(c * c for c in encoded)),
        "error_rate": 0.0 if decoded == clean else 0.0001,
        "model_needed": MODEL_NEEDED,
    }


def status():
    return {
        "project": "without_nlp",
        "status": "ACTIVE_PURE_MATH",
        "version": VERSION,
        "architecture": "Euler Complex Phasor e^(i*omega*t) + Fourier Harmonic Series (Zero-NLP)",
        "runtime": "python3 (stdlib only)",
        "nlp_dependency": "ZERO",
        "model_needed": MODEL_NEEDED,
    }


def _finite(value: str) -> float:
    number = float(value)
    if not math.isfinite(number):
        raise argparse.ArgumentTypeError("wartość musi być skończoną liczbą")
    return number


def main(argv=None) -> int:
    parser = argparse.ArgumentParser(
        prog="without-nlp",
        description="Deterministyczny silnik harmoniczny Eulera & Fouriera (bez NLP/LLM).",
    )
    parser.add_argument("text", nargs="*", help="tekst do analizy; '-' czyta ze stdin")
    parser.add_argument("--omega", type=_finite, default=1.5, help="częstość podstawowa ω (domyślnie 1.5)")
    parser.add_argument("--t", type=_finite, default=1.0, help="czas t (domyślnie 1.0)")
    parser.add_argument("--decode", action="store_true", help="odczytaj tekst ze współczynników")
    parser.add_argument("--status", action="store_true", help="pokaż metryki silnika")
    parser.add_argument("--version", action="version", version=f"without_nlp {VERSION}")
    args = parser.parse_args(argv)

    if args.status:
        result = status()
    elif args.decode:
        try:
            coeffs = [_finite(c) for c in args.text]
            result = {"project": "without_nlp", "decoded_text": fourier_decode(coeffs)}
        except (ValueError, OverflowError, argparse.ArgumentTypeError) as error:
            parser.error(f"nieprawidłowe współczynniki: {error}")
    else:
        if args.text == ["-"]:
            text = sys.stdin.read()
        else:
            text = " ".join(args.text)
        result = analyze_signal(text, args.omega, args.t)

    print(json.dumps(result, indent=2, ensure_ascii=False))
    return 0


if __name__ == "__main__":
    sys.exit(main())
