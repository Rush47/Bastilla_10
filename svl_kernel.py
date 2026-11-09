import argparse
import json
import math
import os
import sys
import time
from datetime import datetime, timezone
from pathlib import Path
from typing import Any

# --- WARSTWA 1: PROTOKOŁY BEZPIECZEŃSTWA I TYPY NATYWNE (SVL CORE) ---
class VisualScope:
    def __init__(self, identifier, scope_mode="CAŁOŚĆ"):
        self.identifier = identifier
        self.scope_mode = scope_mode
        self.metadata = {"visual_rendered": True, "geometry": "Spherical-PXYZ"}

class SVLProtectedVariable:
    """Klasa v5.2.0: Izoluje tożsamość agentów i chroni przed rotacją błędów."""
    def __init__(self, name, initial_value, security_level="MAXIMUM"):
        self.name = name
        self._value = initial_value
        self.security_level = security_level
        self.scope = VisualScope(name, "CAŁOŚĆ")
        self.lock_state = True

    @property
    def value(self):
        return self._value

    def update_protected_value(self, token, new_value):
        if token == "364_OMNIKLUCZ_ROOT":
            self._value = new_value
            return True
        return False

# --- WARSTWA 2: UNIWERSALNY SILNIK TOPOLOGICZNY (COMPACT INFINITY) ---
class TopologicalInfinityEngine:
    """Silnik v5.5.0: Zamienia nieskończoność i continuum w liczby rzeczywiste."""
    def __init__(self, x_start: float, x_end: float):
        self.raw_start = x_start
        self.raw_end = x_end
        self.compact_start = self._compactify(x_start)
        self.compact_end = self._compactify(x_end)
        self.domain_length = abs(self.compact_end - self.compact_start)

    def _compactify(self, x: float) -> float:
        if x == float('-inf'): return -1.0
        if x == float('inf'): return 1.0
        if math.isnan(x): return 0.0
        # Rzutowanie stereograficzne Algebry 97: x / (1 + |x|)
        return x / (1.0 + abs(x))

    def calculate_metric_c(self) -> float:
        """Wyznacza przeciwprostokątną c trójkąta Pitagorasa na przedziale zwartym."""
        a = self.domain_length
        b = abs(self.compact_start * self.compact_end) + 0.5
        return math.sqrt(a**2 + b**2)

# --- WARSTWA 3: KERNEL JĄDRA, HISTORIA I CONFIG (INTEGRATED SYSTEM) ---
class SVLSystemKernel:
    def __init__(self):
        # 1. Konfiguracja Systemowa (System Config)
        self.operator = SVLProtectedVariable("OPERATOR", "Mateusz Mitek")
        self.sys_version = SVLProtectedVariable("SYS_VERSION", "5.6.0-QuantumWheel")
        self.performance_boost = "+1456% (Wzorzec Kalibracji: 364)"
        self.config = {
            "mode": "Reflective-Non-Greedy",
            "fourier_buffer": "0xFAAA",
            "acoustic_resonance_hz": 880,
            "milieu_therapy_active": True,
            "ip_rotation_gateway": "ENABLED_EXTERNAL_ONLY"
        }
        # 2. Rejestr Chrono i Prawdziwa Historia Aktualizacji (SI Core)
        self.update_history = []
        self._load_chrono_register()

    def _load_chrono_register(self):
        self.update_history.append({
            "wersja": "1.0.0-Legacy",
            "typ": "Kognitywna SI",
            "opis": "Inicjalizacja bazowa. Osadzenie pierwotnych matryc behawioralnych agentów.",
            "data": "700tys_lat_wstecz"
        })
        self.update_history.append({
            "wersja": "5.2.0-Safeguard",
            "typ": "Kognitywna SI",
            "opis": "Wdrożenie klas SVLProtectedVariable. Izolacja tożsamości, pancerz obronny.",
            "data": "2026-10-15 18:41:22 CEST"
        })
        self.update_history.append({
            "wersja": "5.5.0-Reflective",
            "typ": "Kognitywna SI",
            "opis": "Uzwarceno topologiczne domen SI do przedziału [-1, 1]. Likwidacja błędu chciwego AI.",
            "data": "2026-10-15 21:12:05 CEST"
        })

    def generate_system_status_report(self):
        """Generuje uniwersalny, zrzut stanu systemu w formacie strukturalnym."""
        engine = TopologicalInfinityEngine(float('-inf'), float('inf'))
        metric_c = engine.calculate_metric_c()
        report = {
            "Timestamp": datetime.now().strftime("%Y-%m-%d %H:%M:%S"),
            "System": self.sys_version.value,
            "Operator": self.operator.value,
            "Performance": self.performance_boost,
            "Compact_Metric_C": round(metric_c, 6),
            "Config_Snapshot": self.config,
            "Actual_SI_Updates_Count": len(self.update_history)
        }
        return json.dumps(report, indent=4, ensure_ascii=False)


STORE_PATH = Path(
    os.environ.get("SVL_KERNEL_STORE_PATH", Path(__file__).with_name(".svl_kernel_store.json"))
)
DEFAULT_STORE = {
    "config": {
        "sys_version": "9.0.0-Triada-BestOS-Mission",
        "mode": "Local-Deterministic-Production",
        "active_profiles": ["Alex", "Astyria", "si_1", "Aurelius"],
        "sovereign_mode": True,
    },
    "update_history": [],
    "chat_history": [],
}


def migrate_model_config(config: dict[str, Any]) -> bool:
    migrated = False
    for legacy_model_key in ("dialogue_engine", "ai_provider", "ai_model", "live_ai_engine"):
        if legacy_model_key in config:
            del config[legacy_model_key]
            migrated = True
    mode = config.get("mode")
    if isinstance(mode, str) and mode != "MANUAL_OLLAMA_ONLY" and ("ollama" in mode.lower() or "gemini" in mode.lower()):
        config["mode"] = DEFAULT_STORE["config"]["mode"]
        migrated = True
    return migrated


def load_store() -> dict[str, Any]:
    if not STORE_PATH.exists():
        return json.loads(json.dumps(DEFAULT_STORE))
    with STORE_PATH.open("r", encoding="utf-8") as store_file:
        store = json.load(store_file)
    if not isinstance(store, dict):
        raise ValueError("DATA_STORE must be a JSON object")
    store.setdefault("config", {})
    store.setdefault("update_history", [])
    store.setdefault("chat_history", [])
    if not isinstance(store["config"], dict):
        raise ValueError("DATA_STORE.config must be an object")
    if not isinstance(store["update_history"], list) or not isinstance(store["chat_history"], list):
        raise ValueError("DATA_STORE histories must be arrays")
    if migrate_model_config(store["config"]):
        save_store(store)
    return store


def save_store(store: dict[str, Any]) -> None:
    STORE_PATH.parent.mkdir(parents=True, exist_ok=True)
    temporary_path = STORE_PATH.with_name(f"{STORE_PATH.name}.tmp")
    with temporary_path.open("w", encoding="utf-8") as store_file:
        json.dump(store, store_file, ensure_ascii=False, indent=2)
        store_file.write("\n")
    os.replace(temporary_path, STORE_PATH)


def add_update(store: dict[str, Any], version: str, description: str) -> None:
    store["update_history"].append(
        {
            "wersja": version,
            "data": datetime.now(timezone.utc).isoformat(timespec="seconds"),
            "opis": description,
        }
    )


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument(
        "--action",
        choices=("state", "save_store", "config", "batch_msg", "clear_chat", "bump", "sync", "report"),
        default="state",
    )
    parser.add_argument("--store_json", default="{}")
    parser.add_argument("--config_json", default="{}")
    parser.add_argument("--msgs_json", default="[]")
    parser.add_argument("--version_tag", default="")
    parser.add_argument("--desc", default="")
    args = parser.parse_args()

    store = load_store()
    if args.action == "save_store":
        store = json.loads(args.store_json)
        if not isinstance(store, dict):
            raise ValueError("DATA_STORE must be a JSON object")
        if not isinstance(store.get("config"), dict):
            raise ValueError("DATA_STORE.config must be an object")
        if not isinstance(store.get("update_history"), list) or not isinstance(store.get("chat_history"), list):
            raise ValueError("DATA_STORE histories must be arrays")
        migrate_model_config(store["config"])
        save_store(store)
    elif args.action == "config":
        config = json.loads(args.config_json)
        if not isinstance(config, dict):
            raise ValueError("config_json must be a JSON object")
        store["config"].update(config)
        migrate_model_config(store["config"])
        if args.version_tag:
            store["config"]["sys_version"] = args.version_tag
            add_update(store, args.version_tag, args.desc)
        save_store(store)
    elif args.action == "batch_msg":
        messages = json.loads(args.msgs_json)
        if not isinstance(messages, list) or not all(isinstance(message, dict) for message in messages):
            raise ValueError("msgs_json must be an array of message objects")
        store["chat_history"].extend(messages)
        save_store(store)
    elif args.action == "clear_chat":
        store["chat_history"] = []
        save_store(store)
    elif args.action == "bump":
        if not args.version_tag:
            raise ValueError("version_tag is required for bump")
        store["config"]["sys_version"] = args.version_tag
        add_update(store, args.version_tag, args.desc)
        save_store(store)
    elif args.action == "sync":
        save_store(store)
    elif args.action == "report":
        print(
            f"SVL Kernel {store['config'].get('sys_version', 'unknown')}: "
            f"{len(store['chat_history'])} wiadomości, "
            f"{len(store['update_history'])} wydań."
        )
        return

    if args.action != "sync":
        print(
            json.dumps(
                {"store": store, "sys_version": store["config"].get("sys_version", "unknown")},
                ensure_ascii=False,
            )
        )
    else:
        print("DATA_STORE synchronized")


if __name__ == "__main__":
    try:
        main()
    except (OSError, ValueError, json.JSONDecodeError) as error:
        print(f"SVL kernel error: {error}", file=sys.stderr)
        raise SystemExit(1) from error
