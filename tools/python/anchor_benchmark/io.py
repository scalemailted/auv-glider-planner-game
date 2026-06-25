"""I/O, lightweight validation, and deterministic digests."""

from __future__ import annotations

import json
import platform
import shutil
import subprocess
from pathlib import Path
from typing import Any


NOTEBOOK_VERSION = "colab-bench-r1"
BENCHMARK_BOUNDARY = "Colab proposes. ANCHOR validates. ANCHOR simulates. ANCHOR scores."


def load_json(path: str | Path) -> dict[str, Any]:
    with Path(path).open("r", encoding="utf-8") as handle:
        value = json.load(handle)
    if not isinstance(value, dict):
        raise ValueError(f"{path} must contain a JSON object")
    return value


def write_json(path: str | Path, value: Any) -> Path:
    output = Path(path)
    output.parent.mkdir(parents=True, exist_ok=True)
    output.write_text(json.dumps(value, indent=2, sort_keys=True) + "\n", encoding="utf-8")
    return output


def stable_json(value: Any) -> str:
    return json.dumps(_normalize(value), separators=(",", ":"), sort_keys=True)


def stable_digest(value: Any, prefix: str = "fnv1a32") -> str:
    return f"{prefix}:{_fnv1a32(stable_json(value)):08x}"


def validate_solver_packet(packet: dict[str, Any], *, allow_oracle: bool = False) -> dict[str, Any]:
    errors: list[str] = []
    warnings: list[str] = []
    if packet.get("type") != "anchor.solverPacket":
        errors.append("Expected type anchor.solverPacket.")
    if str(packet.get("schemaVersion", "")) != "2.0":
        errors.append("Expected schemaVersion 2.0 for the current ANCHOR solver-packet contract.")
    if not isinstance(packet.get("level"), dict):
        errors.append("Missing level object.")
    if not isinstance(packet.get("mission"), dict):
        errors.append("Missing mission object.")

    visibility = packet.get("visibility") or {}
    fairness_class = packet.get("fairnessClass") or visibility.get("fairnessClass") or "FORECAST_ONLY"
    visible_fields = ((packet.get("planningData") or {}).get("visibleFields") or {})
    hidden_markers = json.dumps(visible_fields, sort_keys=True)
    contains_hidden = any(marker in hidden_markers for marker in ("T_hiddenTruth", "hiddenTruth", "hiddenFields"))
    if contains_hidden and not allow_oracle:
        errors.append("Solver-visible fields contain hidden-truth markers without explicit oracle opt-in.")
    if fairness_class == "ORACLE_HIDDEN_TRUTH" and not allow_oracle:
        errors.append("ORACLE_HIDDEN_TRUTH fairness requires explicit oracle opt-in.")
    if not visible_fields.get("forecast", {}).get("frames") and not allow_oracle:
        warnings.append("No forecast frames found in planningData.visibleFields.forecast.frames.")

    return {
        "ok": not errors,
        "status": "FAIL" if errors else ("WARN" if warnings else "PASS"),
        "errors": errors,
        "warnings": warnings,
        "schemaVersion": packet.get("schemaVersion"),
        "artifactType": packet.get("type"),
        "fairnessClass": fairness_class,
        "visibilityClass": packet.get("visibilityClass") or visibility.get("visibilityClass") or "FORECAST_ONLY",
        "solverPacketDigest": stable_digest(packet),
    }


def artifact_summary(value: dict[str, Any]) -> dict[str, Any]:
    return {
        "type": value.get("type") or value.get("artifactType"),
        "schemaVersion": value.get("schemaVersion") or value.get("version"),
        "digest": stable_digest(value),
    }


def python_runtime_summary() -> dict[str, str]:
    return {
        "pythonVersion": platform.python_version(),
        "platform": platform.platform(),
    }


def node_version() -> str:
    node = shutil.which("node")
    if not node:
        return "UNAVAILABLE"
    try:
        completed = subprocess.run([node, "--version"], check=True, capture_output=True, text=True)
        return completed.stdout.strip() or "UNKNOWN"
    except Exception:
        return "UNAVAILABLE"


def _normalize(value: Any) -> Any:
    if value is None or isinstance(value, (str, bool)):
        return value
    if isinstance(value, (int, float)):
        return value if value == value and value not in (float("inf"), float("-inf")) else None
    if isinstance(value, (list, tuple)):
        return [_normalize(item) for item in value]
    if isinstance(value, dict):
        return {str(key): _normalize(val) for key, val in sorted(value.items(), key=lambda item: str(item[0]))}
    return str(value)


def _fnv1a32(text: str) -> int:
    digest = 0x811C9DC5
    for char in text:
        digest ^= ord(char)
        digest = (digest * 0x01000193) & 0xFFFFFFFF
    return digest

