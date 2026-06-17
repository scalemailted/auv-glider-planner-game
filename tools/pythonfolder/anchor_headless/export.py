"""Build ANCHOR-compatible plan JSON from headless solver output."""

from datetime import datetime, timezone


def build_plan_json(packet, agent_plans, planner_label="colab-template-greedy-v1"):
    challenge_id = packet.get("challengeId") or packet.get("instanceId")
    return {
        "schemaVersion": "2.0",
        "type": "anchor.plan",
        "levelId": packet.get("levelId"),
        "instanceId": packet.get("instanceId"),
        "challengeId": challenge_id,
        "missionId": packet.get("missionId"),
        "executionMode": "timedOpenLoop",
        "planner": {
            "name": planner_label,
            "label": planner_label,
            "type": "importedSolver",
            "usesForecast": True,
            "usesTruth": False,
            "usesOracle": False,
            "source": "external",
        },
        "meta": {
            "name": "Colab Template Greedy Plan",
            "createdAt": datetime.now(timezone.utc).isoformat(),
            "source": "importedSolver",
            "solver": planner_label,
            "strategy": "forecast-visible ROI value per distance",
            "fairness": {
                "usesForecast": True,
                "usesTruth": False,
                "usesOracle": False,
                "note": "Colab proposes. Game validates. Game simulates. Game scores.",
            },
            "visiblePlanningSource": packet.get("visiblePlanningSource"),
            "replaySeedAnchor": packet.get("replaySeedAnchor") or challenge_id,
            "generationVersion": packet.get("generationVersion"),
        },
        "agentPlans": agent_plans,
    }
