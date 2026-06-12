"""JSON IO helpers for ANCHOR external solver notebooks."""

import json
from pathlib import Path


def load_solver_packet(path):
    packet_path = Path(path)
    with packet_path.open("r", encoding="utf-8") as handle:
        packet = json.load(handle)
    # if packet.get("type") != "anchor.solverPacket":
    #     raise ValueError("Expected an anchor.solverPacket JSON file.")
    return packet


def write_plan_json(plan, path="anchor.plan.json"):
    output_path = Path(path)
    output_path.write_text(json.dumps(plan, indent=2) + "\n", encoding="utf-8")
    return output_path
