"""SVL agent identity registry: identities are local; connectivity is observed, never assumed."""
from __future__ import annotations
import math
import os
import pathlib
import hmac
from datetime import datetime, timezone

AGENT_NAMES = ("Aria", "Alex", "Astyria", "Aurelius", "System")

class VisualScope:
    def __init__(self, identifier, scope_mode="CAŁOŚĆ"):
        self.identifier = identifier
        self.scope_mode = scope_mode
        self.metadata = {"geometry": "Spherical-PXYZ", "visual_rendered": False}

class SVLProtectedVariable:
    """Local value wrapper, not encryption or a security boundary."""
    def __init__(self, name, initial_value, security_level="APPLICATION"):
        self.name = name
        self._value = initial_value
        self.security_level = security_level
        self.scope = VisualScope(name)
    @property
    def value(self):
        return self._value
    def update_protected_value(self, token, new_value):
        expected = os.environ.get("SVL_ADMIN_TOKEN")
        if not expected or not token or not hmac.compare_digest(token, expected):
            return False
        self._value = new_value
        return True

class TopologicalInfinityEngine:
    def __init__(self, x_start: float, x_end: float):
        self.compact_start = self._compactify(x_start)
        self.compact_end = self._compactify(x_end)
        self.domain_length = abs(self.compact_end - self.compact_start)
    @staticmethod
    def _compactify(x):
        if math.isnan(x):
            raise ValueError("NaN has no defined topological position")
        if x == float("-inf"):
            return -1.0
        if x == float("inf"):
            return 1.0
        return x / (1.0 + abs(x))
    def calculate_metric_c(self):
        return math.hypot(self.domain_length, abs(self.compact_start * self.compact_end) + 0.5)

class AIAgent:
    def __init__(self, name):
        self.name = name
        self.identity_matrix = SVLProtectedVariable(f"AGENT_{name.upper()}_ID", {"name": name})
    def get_profile(self, data_dir=None, freshness_seconds=180):
        directory = pathlib.Path(data_dir or os.getenv("DAEMON_DATA_DIR", "/var/lib/ubuntu-ai/daemons"))
        logfile = directory / (self.name.lower() + ".jsonl")
        try:
            stat = logfile.stat()
            age = datetime.now(timezone.utc).timestamp() - stat.st_mtime
            daemon_active = 0 <= age <= freshness_seconds and stat.st_size > 0
            evidence = "recent_daemon_log" if daemon_active else "stale_daemon_log"
        except OSError:
            daemon_active, evidence = False, "daemon_log_unavailable"
        # Local monitoring never proves an original external agent is connected.
        # System is a local Ollama agent; inference is checked separately.
        return {"name": self.name, "connection_status": "LOCAL_MODEL_NOT_VERIFIED" if self.name == "System" else "NOT_CONNECTED",
                "connection_label": "Model lokalny — wymaga weryfikacji" if self.name == "System" else "Niepodłączony — podłączę sam",
                "worker": {"type": "local_observation", "active": daemon_active},
                "daemon": {"active": daemon_active, "evidence": evidence},
                "integration": "ollama" if self.name == "System" else "manual_pending"}

class SVLSystemKernel:
    def __init__(self, data_dir=None):
        self.sys_version = SVLProtectedVariable("SYS_VERSION", "5.6.1-MultiAgentCore")
        self.agents = {name.lower(): AIAgent(name) for name in AGENT_NAMES}
        self.data_dir = data_dir
    def generate_system_status_report(self):
        return {
            "timestamp": datetime.now(timezone.utc).isoformat(),
            "system": self.sys_version.value,
            "compact_metric_c": round(TopologicalInfinityEngine(float("-inf"), float("inf")).calculate_metric_c(), 6),
            "agents": {name: agent.get_profile(self.data_dir) for name, agent in self.agents.items()},
            "note": "Four original agents are NOT_CONNECTED until manually integrated. Daemon activity is independent of AI connectivity."
        }
