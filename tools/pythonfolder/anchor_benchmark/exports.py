"""Export ANCHOR-compatible candidate plans and benchmark records."""

from __future__ import annotations

from datetime import datetime, timezone
from typing import Any

from .io import BENCHMARK_BOUNDARY, NOTEBOOK_VERSION, stable_digest
from .model import CandidateNode, PlannerResult, PlanningProblem


MIN_RUNTIME_WAYPOINTS = 4


def build_anchor_plan(problem: PlanningProblem, result: PlannerResult, *, agent_id: str | None = None) -> dict[str, Any]:
    packet = problem.packet
    agent = (problem.mission.get("agents") or [{}])[0]
    resolved_agent = agent_id or str(agent.get("id") or agent.get("agentId") or "glider_01")
    expanded_nodes = _runtime_waypoint_nodes(problem, result)
    waypoints = []
    for index, node in enumerate(expanded_nodes, start=1):
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
            "runtimeWaypointExpansion": {
                "minimumWaypointCount": MIN_RUNTIME_WAYPOINTS,
                "sourceRouteCandidateIds": result.candidate_ids,
                "exportedWaypointCount": len(waypoints),
                "policy": "expand declared graph route to executable grid waypoints; continue through visible candidates when route is shorter than runtime contract",
            },
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


def _runtime_waypoint_nodes(problem: PlanningProblem, result: PlannerResult) -> list[CandidateNode]:
    nodes: list[CandidateNode] = []
    current = _first_route_node(problem, result)
    for target in result.route[1:]:
        for x, y in _bresenham_cells(current.x, current.y, target.x, target.y)[1:]:
            nodes.append(_waypoint_node(problem, x, y, source=f"{result.planner_id}:routeExpansion"))
        current = target
    used = {(node.x, node.y) for node in nodes}
    used.add((_first_route_node(problem, result).x, _first_route_node(problem, result).y))
    while len(nodes) < MIN_RUNTIME_WAYPOINTS:
        destination = _next_visible_candidate(problem, used, current)
        if destination is None:
            destination = _next_valid_neighbor(problem, used, current)
        if destination is None:
            break
        path = _manhattan_cells(current.x, current.y, destination.x, destination.y)
        for x, y in path[1:]:
            if (x, y) in used:
                continue
            waypoint = _waypoint_node(problem, x, y, source=f"{result.planner_id}:runtimeContinuation")
            nodes.append(waypoint)
            used.add((x, y))
            current = waypoint
        if (current.x, current.y) != (destination.x, destination.y):
            current = destination
        used.add((current.x, current.y))
    return nodes


def _first_route_node(problem: PlanningProblem, result: PlannerResult) -> CandidateNode:
    if result.route:
        return result.route[0]
    for node in problem.candidates:
        if node.candidate_id == problem.start_node_id:
            return node
    raise ValueError("Cannot export a plan without a route or start node.")


def _next_visible_candidate(problem: PlanningProblem, used: set[tuple[int, int]], current: CandidateNode) -> CandidateNode | None:
    candidates = [
        node for node in problem.candidates
        if node.candidate_id != problem.start_node_id and (node.x, node.y) not in used
    ]
    if not candidates:
        return None
    candidates.sort(key=lambda node: (-node.value, _distance(current, node), node.y, node.x, node.candidate_id))
    return candidates[0]


def _next_valid_neighbor(problem: PlanningProblem, used: set[tuple[int, int]], current: CandidateNode) -> CandidateNode | None:
    options = []
    for dy, dx in ((0, 1), (1, 0), (0, -1), (-1, 0), (1, 1), (1, -1), (-1, 1), (-1, -1)):
        x = current.x + dx
        y = current.y + dy
        if (x, y) in used or not _valid_cell(problem, x, y):
            continue
        options.append(_waypoint_node(problem, x, y, source="runtimeNeighborFill"))
    options.sort(key=lambda node: (-node.value, node.y, node.x))
    return options[0] if options else None


def _waypoint_node(problem: PlanningProblem, x: int, y: int, *, source: str) -> CandidateNode:
    return CandidateNode(
        f"wp_{x}_{y}",
        int(x),
        int(y),
        float(x) * problem.cell_size_meters,
        float(y) * problem.cell_size_meters,
        _cell_value(problem, x, y),
        source,
        {"cell": {"x": int(x), "y": int(y)}},
    )


def _valid_cell(problem: PlanningProblem, x: int, y: int) -> bool:
    if x < 0 or y < 0 or x >= problem.width or y >= problem.height:
        return False
    terrain_value = _grid_value(problem.terrain, x, y, 1)
    hazard_value = _grid_value(problem.hazards, x, y, 0)
    return not bool(terrain_value) and float(hazard_value or 0) <= 0


def _cell_value(problem: PlanningProblem, x: int, y: int) -> float:
    value = _grid_value(problem.roi, x, y, 0)
    if isinstance(value, dict):
        raw = float(value.get("value", value.get("rewardValue", value.get("expectedValue", 0.0))) or 0.0)
        probability = max(0.0, min(1.0, float(value.get("probability", 1.0) or 1.0)))
        return float(value.get("expectedValue", raw * probability) or 0.0)
    return float(value or 0.0)


def _grid_value(grid: list[list[Any]], x: int, y: int, default: Any = None) -> Any:
    if not isinstance(grid, list) or y < 0 or x < 0 or y >= len(grid) or x >= len(grid[y]):
        return default
    return grid[y][x]


def _distance(source: CandidateNode, target: CandidateNode) -> float:
    return ((source.x - target.x) ** 2 + (source.y - target.y) ** 2) ** 0.5


def _bresenham_cells(x0: int, y0: int, x1: int, y1: int) -> list[tuple[int, int]]:
    cells = []
    dx = abs(x1 - x0)
    dy = -abs(y1 - y0)
    sx = 1 if x0 < x1 else -1
    sy = 1 if y0 < y1 else -1
    error = dx + dy
    x = x0
    y = y0
    while True:
        cells.append((x, y))
        if x == x1 and y == y1:
            break
        twice = 2 * error
        if twice >= dy:
            error += dy
            x += sx
        if twice <= dx:
            error += dx
            y += sy
    return cells


def _manhattan_cells(x0: int, y0: int, x1: int, y1: int) -> list[tuple[int, int]]:
    cells = [(x0, y0)]
    x = x0
    y = y0
    while x != x1:
        x += 1 if x < x1 else -1
        cells.append((x, y))
    while y != y1:
        y += 1 if y < y1 else -1
        cells.append((x, y))
    return cells


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
