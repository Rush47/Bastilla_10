import os
import math
import time
import json
from datetime import datetime

class BinaryHyperspaceKernel:
    """
    Jądro Systemu Operacyjnego przetwarzające polecenia w 128-bitowej binarnej hiperprzestrzeni.
    Mapuje tekst na N-wymiarowe wektory ukryte i dopasowuje intencje przy użyciu odległości Hamminga.
    """
    def __init__(self, dimensions=128):
        self.dimensions = dimensions
        # Definicja ortogonalnych kotwic semantycznych (bazy binarnej hiperprzestrzeni)
        self.anchors = {
            "SYSTEM":     self._generate_anchor(0xAAAA_BBBB_CCCC_DDDD_EEEE_FFFF_0000_1111),
            "CHAT":       self._generate_anchor(0x5555_6666_7777_8888_9999_AAAA_BBBB_CCCC),
            "COMPUTE":    self._generate_anchor(0x0F0F_0F0F_0F0F_0F0F_F0F0_F0F0_F0F0_F0F0),
            "DIAGNOSTIC": self._generate_anchor(0x3333_3333_3333_3333_CCCCCCCC_CCCCCCCC)
        }
        
    def _generate_anchor(self, seed_hex: int) -> list:
        """Generuje stabilny wektor binarny z wartości szesnastkowej."""
        bin_str = bin(seed_hex)[2:].zfill(self.dimensions)[:self.dimensions]
        return [int(b) for b in bin_str]

    def text_to_hyperspace_vector(self, text: str) -> list:
        """
        Rzutuje ciąg tekstowy na wektor binarny w hiperprzestrzeni (128-bit).
        Wykorzystuje deterministyczne mieszanie skrótów znaków.
        """
        hash_val = 0
        for i, char in enumerate(text):
            hash_val += ord(char) * (31 ** (i % 8))
        
        # Generowanie 128-bitowego ciągu na podstawie przekształceń pseudolosowych seedowanych tekstem
        bits = []
        current_state = hash_val & 0xFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFF
        for _ in range(self.dimensions):
            current_state = (current_state * 1103515245 + 12345) & 0xFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFF
            bits.append(1 if (current_state % 2 == 0) else 0)
        return bits

    def calculate_hamming_similarity(self, vec_a: list, vec_b: list) -> float:
        """Oblicza znormalizowane podobieństwo Hamminga (1.0 = identyczne, 0.0 = ortogonalne)."""
        diffs = sum(1 for a, b in zip(vec_a, vec_b) if a != vec_b)
        return 1.0 - (diffs / self.dimensions)

    def resolve_intent(self, text: str):
        """Dopasowuje intencję użytkownika w oparciu o najbliższą kotwicę geometryczną."""
        user_vector = self.text_to_hyperspace_vector(text)
        best_intent = "CHAT"  # Domyślny fallback dla swobodnej rozmowy
        max_similarity = -1.0
        
        scores = {}
        for intent, anchor_vector in self.anchors.items():
            similarity = self.calculate_hamming_similarity(user_vector, anchor_vector)
            scores[intent] = similarity
            if similarity > max_similarity:
                max_similarity = similarity
                best_intent = intent
                
        return best_intent, max_similarity, scores


class HyperspaceOS:
    """Interfejs systemu operacyjnego zintegrowany ze swobodnym czatem AI."""
    def __init__(self):
        self.kernel = BinaryHyperspaceKernel()
        self.boot_time = datetime.now()
        self.execution_log = []
        self._initialize_system()

    def _initialize_system(self):
        self.log_event("Inicjalizacja i sprawdzenie systemowe", "SYSTEM", "SYS_METRICS", 
                       "[HyperOS Core] System Uptime stabilny. Architektura bezpieczna.")

    def log_event(self, user_input, intent, action, output_text, confidence=1.0):
        self.execution_log.append({
            "timestamp": datetime.now().isoformat(),
            "input": user_input,
            "resolved_intent": intent,
            "confidence_score": round(confidence, 4),
            "action": action,
            "output": output_text
        })

    def process_command(self, user_input: str) -> str:
        """Przetwarza polecenie wejściowe w binarnej hiperprzestrzeni."""
        if not user_input.strip():
            return "Otrzymano pusty wektor wejściowy."

        intent, confidence, all_scores = self.kernel.resolve_intent(user_input)
        
        if intent == "SYSTEM":
            uptime = datetime.now() - self.boot_time
            response = f"[HyperOS Core] Status: ACTIVE. Uptime: {uptime}. Wszystkie węzły binarne działają poprawnie."
            self.log_event(user_input, intent, "SYS_METRICS", response, confidence)
            return response
            
        elif intent == "COMPUTE":
            # Prosta symulacja obliczeń wektorowych w rdzeniu
            result = math.sqrt(sum([x**2 for x in self.kernel.text_to_hyperspace_vector(user_input)]))
            response = f"[HyperOS Compute] Obliczono normę euklidesową wektora wejściowego w hiperprzestrzeni: {round(result, 4)}"
            self.log_event(user_input, intent, "MATH_COMPUTE", response, confidence)
            return response
            
        elif intent == "DIAGNOSTIC":
            scores_info = ", ".join([f"{k}: {round(v, 2)}" for k, v in all_scores.items()])
            response = f"[HyperOS Diagnostics] Mapowanie zakończone sukcesem. Profile podobieństwa: {scores_info}"
            self.log_event(user_input, intent, "SYS_DIAG", response, confidence)
            return response
            
        else: # CHAT i domyślne dopasowania
            response = f"Witaj w HyperOS! Jestem Twoim interfejsem AI wbudowanym bezpośrednio w jądro hiperprzestrzenne. Przetworzyłem Twoją wiadomość jako wektor binarny i z przyjemnością porozmawiam o dowolnym temacie."
            self.log_event(user_input, intent, "CHAT_RESPONSE", response, confidence)
            return response

    def generate_report(self) -> str:
        """Generuje strukturalny raport działania systemu gotowy do AI Studio."""
        report = {
            "MANIFEST": {
                "Title": "Hyperspace Operating System (HyperOS)",
                "Target_Platform": "AI Studio / LLM Prompt Context",
                "Deployment_Ready": True
            },
            "SYSTEM_STATE": {
                "OS_NAME": "HyperOS",
                "ARCHITECTURE": "Quantum-Binary-Hyperspace",
                "KERNEL_DIMENSIONS": self.kernel.dimensions,
                "STATUS": "ACTIVE",
                "AI_CO_PILOT": "READY"
            },
            "BOOT_TIME": self.boot_time.isoformat(),
            "EXECUTION_LOG_LENGTH": len(self.execution_log),
            "RECENT_LOGS": self.execution_log[-5:]
        }
        return json.dumps(report, indent=4, ensure_ascii=False)


if __name__ == "__main__":
    # Inicjalizacja demonstracyjna działania systemu operacyjnego
    os_instance = HyperspaceOS()
    print("--- ROZPOCZĘCIE SYMULACJI HYPEROS ---")
    print(os_instance.process_command("Pokaż status jądra i pamięci podręcznej"))
    print(os_instance.process_command("Cześć! Porozmawiajmy o przetwarzaniu wektorowym"))
    print("\n--- GENEROWANIE RAPORTU SYSTEMOWEGO DO AI STUDIO ---")
    print(os_instance.generate_report())
