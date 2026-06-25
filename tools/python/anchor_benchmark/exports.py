"""Export ANCHOR-compatible candidate plans and benchmark records."""

from __future__ import annotations

from datetime import datetime, timezone
from typing import Any

from .io import BENCHMARK_BOUNDARY, NOTEBOOK_VERSION, stable_digest
from .model import PlannerResult, PlanningProblem


def build_anchor_plan(problem: PlanningProblem, result: PlannerResult, *, agent_id: str | None = None) -> dict[str, Any]:
    packet = problem.packet
    agent = (problem.mission.get("agents") or [{}])[0]
    resolved_agent = agent_id or str(agent.get("id") or agent.get("agentId") or "glider_01")
    waypoints = []
    for index, node in enumerate(result.route):
        if node.candidate_id == problem.start_node_id:
            continue
        waypoints.append({
            "id": f"{result.planner_id}_wp_{index:03d}",
            "waypointId": f"{result.planner_id}_wp_{index:03d}",
            "x": node.x,
            "y": node.y,
            "window": min(index - 1, max(0, int(problem.duration_seconds // max(1.0, problem.time_bin_seconds)))),
            "action": "sample",
            "diveProfileId": _profile_for_policy(problem.profile_policy),
            "note": f"{result.planner_id} candidate={node.candidate_id} visibleValue={node.value:.3f}",
        })
    plan = {
        "schemaVersion": "2.0",
        "type": "anchor.plan",
        "planId": f"colab-bench-r1-{result.planner_id}",
        "levelId": packet.get("levelId") or packet.get("level", {}).get("levelId"),
        "instanceId": packet.get("instanceId"),
        "missionId": packet.get("missionId") or problem.mission.get("missionId"),
        "challengeId": packet.get("challengeId") or packet.get("instanceId"),
        "executionMode": "openLoop",
        "diveProfileId": _profile_for_policy(problem.profile_policy),
        "planner": {
            "name": result.planner_id,
            "label": result.label,
            "type": "importedSolver",
            "plannerClass": "classical",
            "optimalityStatus": result.optimality_status,
            "usesForecast": True,
            "usesTruth": False,
            "usesOracle": problem.fairness_class == "ORACLE_HIDDEN_TRUTH",
            "source": "tools/python/anchor_benchmark",
        },
        "fairnessClass": problem.fairness_class,
        "visibilityClass": problem.visibility_class,
        "meta": {
            "name": f"COLAB-BENCH-R1 {result.label} Plan",
            "createdAt": datetime.now(timezone.utc).isoformat(),
            "notebookVersion": NOTEBOOK_VERSION,
            "solverPacketDigest": stable_digest(packet),
            "plannerResultDigest": stable_digest(_result_record(result)),
            "boundary": BENCHMARK_BOUNDARY,
        },
        "agentPlans": [{
            "agentId": resolved_agent,
            "diveProfileId": _profile_for_policy(problem.profile_policy),
            "waypoints": waypoints,
        }],
    }
    plan["meta"]["planDigest"] = stable_digest(plan)
    return plan


def build_benchmark_record(
    problem: PlanningProblem,
    result: PlannerResult,
    *,
    plan: dict[str, Any],
    official_evaluation: dict[str, Any] | None = None,
) -> dict[str, Any]:
    official_evaluation = official_evaluation or {}
    return {
        "schemaVersion": "benchmark-run-record-p2",
        "type": "anchor.benchmark.run-record",
        "benchmarkVersion": NOTEBOOK_VERSION,
        "benchmarkId": "colab-classical-planner-benchmark",
        "runId": f"colab-bench-r1-{result.planner_id}",
        "planner": {
            "plannerId": result.planner_id,
            "plannerLabel": result.label,
            "plannerClass": "classical",
            "optimalityStatus": result.optimality_status,
            "fairnessClass": result.fairness_class,
        },
        "problem": {
            "solverPacketDigest": stable_digest(problem.packet),
            "environmentDigest": problem.packet.get("environmentDigest") or problem.packet.get("meta", {}).get("environmentDigest"),
            "missionDigest": problem.packet.get("missionDigest") or problem.packet.get("meta", {}).get("missionDigest"),
            "validationBaselineDigest": problem.packet.get("validationBaselineDigest") or "fnv1a32:dd016175",
            "candidateCount": len(problem.candidates),
            "candidateDiscretization": "visible ROI hotspots plus selected deployment start",
            "profilePolicy": problem.profile_policy,
        },
        "timing": {
            "plannerSolveTimeSeconds": result.solve_time_seconds,
            "validationTimeSeconds": official_evaluation.get("validationTimeSeconds"),
            "simulationTimeSeconds": official_evaluation.get("simulationTimeSeconds"),
            "scoringTimeSeconds": official_evaluation.get("scoringTimeSeconds"),
            "totalEvaluationTimeSeconds": official_evaluation.get("totalEvaluationTimeSeconds"),
        },
        "search": {
            "nodesExpanded": result.nodes_expanded,
            "edgesEvaluated": result.edges_evaluated,
            "maximumFrontierSize": result.maximum_frontier_size,
            "prunedStateCount": result.pruned_state_count,
            "timeout": result.timeout,
        },
        "artifacts": {
            "planDigest": stable_digest(plan),
            "simulationInputDigest": official_evaluation.get("simulationInputDigest"),
            "simulationResultDigest": official_evaluation.get("simulationResultDigest"),
            "scoreProfileId": official_evaluation.get("scoreProfileId"),
            "scoreProfileVersion": official_evaluation.get("scoreProfileVersion"),
            "scoreResultDigest": official_evaluation.get("scoreResultDigest"),
        },
        "outcome": {
            "officialScore": official_evaluation.get("officialScore"),
            "scienceScore": official_evaluation.get("scienceScore"),
            "missionDurationSeconds": official_evaluation.get("missionDurationSeconds"),
            "energyUsed": official_evaluation.get("energyUsed"),
            "waypointCompletion": official_evaluation.get("waypointCompletion"),
            "hazardCount": official_evaluation.get("hazardCount"),
            "minimumTerrainClearanceMeters": official_evaluation.get("minimumTerrainClearanceMeters"),
            "depthCoverage": official_evaluation.get("depthCoverage"),
            "sampleCount": official_evaluation.get("sampleCount"),
            "terminalReason": official_evaluation.get("terminalReason"),
        },
        "boundary": BENCHMARK_BOUNDARY,
        "notes": [
            "Planner search costs are approximate and guide plan construction.",
            "Official benchmark outcomes must come from ANCHOR validation, simulation, and scoring.",
        ],
    }


def build_reproducibility_manifest(
    problem: PlanningProblem,
    records: list[dict[str, Any]],
    *,
    repository_commit: str = "UNKNOWN",
    python_version: str = "UNKNOWN",
    node_version: str = "UNKNOWN",
    generated_paths: list[str] | None = None,
) -> dict[str, Any]:
    return {
        "notebookVersion": NOTEBOOK_VERSION,
        "repositoryCommit": repository_commit,
        "pythonVersion": python_version,
        "nodeVersion": node_version,
        "validationBaselineId": "scientific-validation-baseline-sci-valid-r2a",
        "validationBaselineDigest": problem.packet.get("validationBaselineDigest") or "fnv1a32:dd016175",
        "solverPacketDigest": stable_digest(problem.packet),
        "environmentDigest": problem.packet.get("environmentDigest"),
        "missionDigest": problem.packet.get("missionDigest"),
        "scoreProfileId": problem.packet.get("scoreProfileId") or "balancedMission",
        "scoreProfileVersion": problem.packet.get("scoreProfileVersion") or "score-pkg-r1",
        "scoreProfileDigest": problem.packet.get("scoreProfileDigest"),
        "plannerSeeds": [problem.packet.get("seed", "fixture-seed")],
        "plannerParameters": {"profilePolicy": problem.profile_policy, "candidateCount": len(problem.candidates)},
        "benchmarkRecordDigests": [stable_digest(record) for record in records],
        "fairnessClasses": sorted({record.get("planner", {}).get("fairnessClass", "FORECAST_ONLY") for record in records}),
        "generatedArtifactPaths": generated_paths or [],
        "boundary": BENCHMARK_BOUNDARY,
    }


def _profile_for_policy(policy: str) -> str:
    mapping = {
        "surface-only": "surfaceTransitProfile",
        "shallow survey": "shallowSurveyProfile",
        "deep survey": "deepSurveyProfile",
        "multi-yo": "sawtoothProfile",
    }
    return mapping.get(policy, "sawtoothProfile")


def _result_record(result: PlannerResult) -> dict[str, Any]:
    return {
        "plannerId": result.planner_id,
        "candidateIds": result.candidate_ids,
        "cost": result.cost,
        "value": result.value,
        "optimalityStatus": result.optimality_status,
    }

