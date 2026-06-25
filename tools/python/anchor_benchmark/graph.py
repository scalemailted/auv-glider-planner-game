"""Build a small declared planning graph from solver-visible ANCHOR data."""

from __future__ import annotations

import math
from typing import Any

from .model import CandidateNode, CostTerm, PlanningProblem


def build_planning_problem(
    packet: dict[str, Any],
    *,
    candidate_node_limit: int = 24,
    profile_policy: str = "mission/default",
) -> PlanningProblem:
    level = packet.get("level") or {}
    mission = packet.get("mission") or {}
    visible = ((packet.get("planningData") or {}).get("visibleFields") or {})
    frame = _choose_visible_frame(visible, level)
    terrain = visible.get("terrain") or (level.get("layers") or {}).get("terrain") or []
    hazards = visible.get("hazards") or (level.get("layers") or {}).get("hazards") or []
    roi = frame.get("roi") or visible.get("roi") or []
    current = frame.get("current") or []
    grid = ((level.get("world") or {}).get("grid") or {})
    time = ((level.get("world") or {}).get("time") or {})
    width = int(grid.get("width") or (len(terrain[0]) if terrain else 0))
    height = int(grid.get("height") or len(terrain))
    cell_size = float(grid.get("cellSizeMeters") or grid.get("cellSize") or 1000.0)
    duration = float(time.get("duration") or 1.0)
    time_bin = float(time.get("planningWindow") or max(1.0, duration))

    candidates = construct_candidate_nodes(
        packet,
        width=width,
        height=height,
        roi=roi,
        terrain=terrain,
        hazards=hazards,
        cell_size_meters=cell_size,
        candidate_node_limit=candidate_node_limit,
    )
    if not candidates:
        raise ValueError("No valid candidate nodes were found in the solver-visible fixture.")
    start = _start_node(packet, cell_size)
    all_nodes = [start] + [node for node in candidates if not (node.x == start.x and node.y == start.y)]
    goal = max(candidates, key=lambda node: (node.value, -node.y, -node.x))
    return PlanningProblem(
        packet=packet,
        level=level,
        mission=mission,
        width=width,
        height=height,
        cell_size_meters=cell_size,
        duration_seconds=duration,
        time_bin_seconds=time_bin,
        start_node_id=start.candidate_id,
        goal_node_id=goal.candidate_id,
        candidates=all_nodes,
        cost_terms=default_cost_terms(),
        frame=frame,
        terrain=terrain,
        hazards=hazards,
        current=current,
        roi=roi,
        fairness_class=packet.get("fairnessClass") or (packet.get("visibility") or {}).get("fairnessClass") or "FORECAST_ONLY",
        visibility_class=packet.get("visibilityClass") or (packet.get("visibility") or {}).get("visibilityClass") or "FORECAST_ONLY",
        profile_policy=profile_policy,
    )


def construct_candidate_nodes(
    packet: dict[str, Any],
    *,
    width: int,
    height: int,
    roi: list[list[Any]],
    terrain: list[list[Any]],
    hazards: list[list[Any]],
    cell_size_meters: float,
    candidate_node_limit: int,
) -> list[CandidateNode]:
    explicit = (((packet.get("planningData") or {}).get("candidateNodes") or []) or
                ((packet.get("solverHints") or {}).get("candidateNodes") or []))
    nodes: list[CandidateNode] = []
    seen: set[tuple[int, int]] = set()
    for item in explicit:
        x = int(round(float(item.get("x", item.get("gridX", 0)))))
        y = int(round(float(item.get("y", item.get("gridY", 0)))))
        if not _valid_cell(x, y, width, height, terrain, hazards) or (x, y) in seen:
            continue
        seen.add((x, y))
        nodes.append(_candidate(f"cand_{len(nodes):03d}", x, y, cell_size_meters, _roi_value(_value_at(roi, x, y, 0)), "explicit"))
    if nodes:
        return nodes[:candidate_node_limit]

    hotspots: list[CandidateNode] = []
    for y in range(height):
        for x in range(width):
            if not _valid_cell(x, y, width, height, terrain, hazards):
                continue
            value = _roi_value(_value_at(roi, x, y, 0))
            if value <= 0:
                continue
            hotspots.append(_candidate(f"cand_{len(hotspots):03d}", x, y, cell_size_meters, value, "roiHotspot"))
    hotspots.sort(key=lambda node: (-node.value, node.y, node.x))
    return hotspots[:candidate_node_limit]


def default_cost_terms() -> list[CostTerm]:
    return [
        CostTerm("distance", "meters", "minimize", 1.0, "Horizontal edge distance on the declared candidate graph.", "solver-visible graph"),
        CostTerm("currentOpposition", "dimensionless", "minimize", 120.0, "Penalty when visible forecast current opposes the edge direction.", "forecast frame"),
        CostTerm("hazardRisk", "dimensionless", "minimize", 250.0, "Penalty for edges crossing visible hazard cells.", "visible hazard grid"),
        CostTerm("scienceValue", "expected scalar units", "maximize", 80.0, "Reward for arriving at visible ROI/science hotspots.", "forecast-visible scalar frame"),
    ]


def edge_cost(problem: PlanningProblem, source: CandidateNode, target: CandidateNode) -> float:
    if source.candidate_id == target.candidate_id:
        return 0.0
    distance_m = euclidean_distance(problem, source, target)
    current_penalty = _current_opposition(problem.current, source, target) * 120.0
    hazard_penalty = _line_hazard_count(problem.hazards, source.x, source.y, target.x, target.y) * 250.0
    science_credit = max(0.0, target.value) * 80.0
    return max(0.0, distance_m + current_penalty + hazard_penalty - science_credit)


def euclidean_distance(problem: PlanningProblem, source: CandidateNode, target: CandidateNode) -> float:
    return math.hypot(source.x - target.x, source.y - target.y) * problem.cell_size_meters


def heuristic(problem: PlanningProblem, node: CandidateNode, goal: CandidateNode | None) -> float:
    if goal is None:
        return 0.0
    return euclidean_distance(problem, node, goal)


def node_by_id(problem: PlanningProblem, candidate_id: str) -> CandidateNode:
    for node in problem.candidates:
        if node.candidate_id == candidate_id:
            return node
    raise KeyError(candidate_id)


def neighbors(problem: PlanningProblem, node: CandidateNode) -> list[CandidateNode]:
    return [candidate for candidate in problem.candidates if candidate.candidate_id != node.candidate_id]


def route_value(nodes: list[CandidateNode]) -> float:
    seen: set[str] = set()
    total = 0.0
    for node in nodes:
        if node.candidate_id in seen:
            continue
        seen.add(node.candidate_id)
        total += max(0.0, node.value)
    return total


def _start_node(packet: dict[str, Any], cell_size: float) -> CandidateNode:
    mission = packet.get("mission") or {}
    agent = (mission.get("agents") or [{}])[0]
    deployment = (((packet.get("deployment") or {}).get("agents") or [{}])[0] if (packet.get("deployment") or {}).get("agents") else {})
    start = deployment.get("selectedStart") or agent.get("start") or {"x": 0, "y": 0}
    x = int(round(float(start.get("x", 0))))
    y = int(round(float(start.get("y", 0))))
    return _candidate("start", x, y, cell_size, 0.0, "deploymentStart")


def _candidate(candidate_id: str, x: int, y: int, cell_size: float, value: float, source: str) -> CandidateNode:
    return CandidateNode(candidate_id, x, y, x * cell_size, y * cell_size, float(value), source, {"cell": {"x": x, "y": y}})


def _choose_visible_frame(visible: dict[str, Any], level: dict[str, Any]) -> dict[str, Any]:
    for source in (visible.get("forecast"), *((visible.get("forecasts") or [])), (level.get("layers") or {}).get("forecast")):
        frames = (source or {}).get("frames") or []
        if frames:
            return frames[0]
    return {}


def _valid_cell(x: int, y: int, width: int, height: int, terrain: list[list[Any]], hazards: list[list[Any]]) -> bool:
    return 0 <= x < width and 0 <= y < height and not bool(_value_at(terrain, x, y, 1)) and float(_value_at(hazards, x, y, 0) or 0) <= 0


def _value_at(grid: list[list[Any]], x: int, y: int, default: Any = None) -> Any:
    if not isinstance(grid, list) or y < 0 or x < 0 or y >= len(grid) or x >= len(grid[y]):
        return default
    return grid[y][x]


def _roi_value(cell: Any) -> float:
    if isinstance(cell, dict):
        value = float(cell.get("value", cell.get("rewardValue", cell.get("expectedValue", 0.0))) or 0.0)
        probability = max(0.0, min(1.0, float(cell.get("probability", 1.0) or 1.0)))
        return float(cell.get("expectedValue", value * probability) or 0.0)
    return float(cell or 0.0)


def _current_opposition(current: list[list[Any]], source: CandidateNode, target: CandidateNode) -> float:
    vector = _value_at(current, source.x, source.y, [0.0, 0.0])
    if isinstance(vector, dict):
        u, v = float(vector.get("u", 0.0) or 0.0), float(vector.get("v", 0.0) or 0.0)
    elif isinstance(vector, (list, tuple)) and len(vector) >= 2:
        u, v = float(vector[0] or 0.0), float(vector[1] or 0.0)
    else:
        u, v = 0.0, 0.0
    dx, dy = target.x - source.x, target.y - source.y
    length = math.hypot(dx, dy) or 1.0
    along = (u * dx + v * dy) / length
    return max(0.0, -along)


def _line_hazard_count(hazards: list[list[Any]], x0: int, y0: int, x1: int, y1: int) -> int:
    return sum(1 for x, y in _bresenham(x0, y0, x1, y1) if float(_value_at(hazards, x, y, 0) or 0) > 0)


def _bresenham(x0: int, y0: int, x1: int, y1: int):
    dx = abs(x1 - x0)
    dy = -abs(y1 - y0)
    sx = 1 if x0 < x1 else -1
    sy = 1 if y0 < y1 else -1
    error = dx + dy
    while True:
        yield x0, y0
        if x0 == x1 and y0 == y1:
            break
        twice = 2 * error
        if twice >= dy:
            error += dy
            x0 += sx
        if twice <= dx:
            error += dx
            y0 += sy

