# Bastilla OS 2 — Prototyp Wykonawczy

## Opis Systemu
Bastilla OS 2 to odrębna implementacja interfejsu operacyjnego w eleganckiej palecie kości słoniowej i złota (*Ivory & Gold*), inspirowanej estetyką Bastili Shan (Jedi Sentinel). 

Główne zasady architektury:
1. **Prawdziwe wykonanie i artefakty**: Zadania agentów w rejestrze posiadają stan `running` tylko przy faktycznie aktywnym wykonawcy, a stan `completed` jest bezwzględnie weryfikowany fizyczną obecnością pliku artefaktu na dysku.
2. **Zero fałszywych deklaracji**: Eliminacja zmyślonych zasobów orbitalnych („ORBITAL_CORE”), fikcyjnych kont/funduszy i urojonego postępu. System działa w lokalnym środowisku Linux (~5 GiB RAM, Node.js/Python).
3. **Prawdziwa telemetria modeli**: Brak udawania obecności `qwen3:14b` na maszynie o 5 GiB RAM. Status Ollama odzwierciedla faktyczne modele zwrócone przez lokalne API.
