"""Readable deterministic classical planners for declared benchmark graphs."""

from __future__ import annotations

import heapq
import itertools
import math
import time

from .graph import edge_cost, heuristic, neighbors, node_by_id, route_value
from .model import CandidateNode, PlannerResult, PlanningProblem


def dijkstra_search(problem: PlanningProblem, *, goal_id: str | None = None) -> PlannerResult:
    start_time = time.perf_counter()
    start = node_by_id(problem, problem.start_node_id)
    goal = node_by_id(problem, goal_id or problem.goal_node_id or problem.start_node_id)
    route, cost, expanded, edges, frontier = _shortest_path(problem, start, goal, weight=0.0)
    return PlannerResult("dijkstra", "Dijkstra / Uniform-Cost Search", "EXACT_FOR_DECLARED_GRAPH", problem.fairness_class, route, cost, route_value(route), time.perf_counter() - start_time, expanded, edges, frontier, assumptions=["nonnegative edge costs", "fixed declared candidate graph"])


def astar_search(problem: PlanningProblem, *, goal_id: str | None = None) -> PlannerResult:
    start_time = time.perf_counter()
    start = node_by_id(problem, problem.start_node_id)
    goal = node_by_id(problem, goal_id or problem.goal_node_id or problem.start_node_id)
    route, cost, expanded, edges, frontier = _shortest_path(problem, start, goal, weight=1.0)
    return PlannerResult("astar", "A*", "EXACT_IF_HEURISTIC_ADMISSIBLE", problem.fairness_class, route, cost, route_value(route), time.perf_counter() - start_time, expanded, edges, frontier, assumptions=["Euclidean lower-bound heuristic", "fixed declared candidate graph"])


def weighted_astar_search(problem: PlanningProblem, *, goal_id: str | None = None, weight: float = 1.5) -> PlannerResult:
    start_time = time.perf_counter()
    start = node_by_id(problem, problem.start_node_id)
    goal = node_by_id(problem, goal_id or problem.goal_node_id or problem.start_node_id)
    route, cost, expanded, edges, frontier = _shortest_path(problem, start, goal, weight=max(0.0, float(weight)))
    status = "EXACT_IF_HEURISTIC_ADMISSIBLE" if abs(float(weight) - 1.0) < 1e-9 else "HEURISTIC"
    return PlannerResult("weightedAstar", f"Weighted A* w={weight:g}", status, problem.fairness_class, route, cost, route_value(route), time.perf_counter() - start_time, expanded, edges, frontier, assumptions=["weighted heuristic may trade exactness for speed"])


def greedy_value_per_cost(problem: PlanningProblem, *, max_depth: int = 5) -> PlannerResult:
    start_time = time.perf_counter()
    current = node_by_id(problem, problem.start_node_id)
    route = [current]
    cost = 0.0
    expanded = 0
    edges = 0
    seen = {current.candidate_id}
    for _ in range(max_depth):
        expanded += 1
        scored: list[tuple[float, float, str, CandidateNode, float]] = []
        for candidate in neighbors(problem, current):
            if candidate.candidate_id in seen:
                continue
            step = max(1e-9, edge_cost(problem, current, candidate))
            edges += 1
            scored.append((candidate.value / step, candidate.value, candidate.candidate_id, candidate, step))
        if not scored:
            break
        scored.sort(reverse=True)
        _, _, _, current, step = scored[0]
        route.append(current)
        seen.add(current.candidate_id)
        cost += step
    return PlannerResult("greedyValuePerCost", "Greedy Value per Predicted Cost", "HEURISTIC", problem.fairness_class, route, cost, route_value(route), time.perf_counter() - start_time, expanded, edges, len(route), assumptions=["locally maximizes visible value divided by approximate graph cost"])


def beam_search(problem: PlanningProblem, *, beam_width: int = 3, max_depth: int = 5) -> PlannerResult:
    start_time = time.perf_counter()
    start = node_by_id(problem, problem.start_node_id)
    beam = [(0.0, [start])]
    expanded = 0
    edges = 0
    pruned = 0
    max_frontier = 1
    for _ in range(max_depth):
        next_beam: list[tuple[float, list[CandidateNode]]] = []
        for cost, route in beam:
            expanded += 1
            current = route[-1]
            seen = {node.candidate_id for node in route}
            for candidate in neighbors(problem, current):
                if candidate.candidate_id in seen:
                    continue
                edges += 1
                next_cost = cost + edge_cost(problem, current, candidate)
                score = next_cost - route_value(route + [candidate]) * 80.0
                next_beam.append((score, route + [candidate]))
        if not next_beam:
            break
        next_beam.sort(key=lambda item: (item[0], item[1][-1].candidate_id))
        pruned += max(0, len(next_beam) - beam_width)
        beam = next_beam[:beam_width]
        max_frontier = max(max_frontier, len(next_beam))
    best_score, best_route = min(beam, key=lambda item: (item[0], item[1][-1].candidate_id))
    cost = _route_cost(problem, best_route)
    return PlannerResult("beamSearch", f"Beam Search width={beam_width}", "HEURISTIC", problem.fairness_class, best_route, cost, route_value(best_route), time.perf_counter() - start_time, expanded, edges, max_frontier, pruned_state_count=pruned, assumptions=["bounded beam prunes candidate routes"])


def time_expanded_astar(problem: PlanningProblem, *, goal_id: str | None = None) -> PlannerResult:
    start_time = time.perf_counter()
    start = node_by_id(problem, problem.start_node_id)
    goal = node_by_id(problem, goal_id or problem.goal_node_id or problem.start_node_id)
    time_bins = max(1, math.ceil(problem.duration_seconds / max(1e-9, problem.time_bin_seconds)))
    queue: list[tuple[float, int, str, int, float, list[str]]] = [(heuristic(problem, start, goal), 0, start.candidate_id, 0, 0.0, [start.candidate_id])]
    best: dict[tuple[str, int], float] = {(start.candidate_id, 0): 0.0}
    expanded = 0
    edges = 0
    max_frontier = 1
    while queue:
        _, _, node_id, bin_index, cost, route_ids = heapq.heappop(queue)
        expanded += 1
        if node_id == goal.candidate_id:
            route = [node_by_id(problem, candidate_id) for candidate_id in route_ids]
            return PlannerResult("timeExpandedAstar", "Time-Expanded A*", "EXACT_FOR_DECLARED_TIME_EXPANDED_GRAPH_IF_HEURISTIC_ADMISSIBLE", problem.fairness_class, route, cost, route_value(route), time.perf_counter() - start_time, expanded, edges, max_frontier, assumptions=["fixed time bins", "forecast-visible time-dependent edge estimates"])
        if bin_index >= time_bins:
            continue
        node = node_by_id(problem, node_id)
        for candidate in neighbors(problem, node):
            next_bin = bin_index + 1
            next_cost = cost + edge_cost(problem, node, candidate)
            key = (candidate.candidate_id, next_bin)
            edges += 1
            if next_cost >= best.get(key, float("inf")):
                continue
            best[key] = next_cost
            priority = next_cost + heuristic(problem, candidate, goal)
            heapq.heappush(queue, (priority, next_bin, candidate.candidate_id, next_bin, next_cost, route_ids + [candidate.candidate_id]))
            max_frontier = max(max_frontier, len(queue))
    return PlannerResult("timeExpandedAstar", "Time-Expanded A*", "INCOMPLETE_NO_ROUTE", problem.fairness_class, [start], float("inf"), 0.0, time.perf_counter() - start_time, expanded, edges, max_frontier, timeout=False)


def _shortest_path(problem: PlanningProblem, start: CandidateNode, goal: CandidateNode, *, weight: float) -> tuple[list[CandidateNode], float, int, int, int]:
    queue: list[tuple[float, str, float, list[str]]] = [(heuristic(problem, start, goal) * weight, start.candidate_id, 0.0, [start.candidate_id])]
    best = {start.candidate_id: 0.0}
    expanded = 0
    edges = 0
    max_frontier = 1
    while queue:
        _, node_id, cost, route_ids = heapq.heappop(queue)
        expanded += 1
        if node_id == goal.candidate_id:
            return [node_by_id(problem, item) for item in route_ids], cost, expanded, edges, max_frontier
        node = node_by_id(problem, node_id)
        for candidate in neighbors(problem, node):
            next_cost = cost + edge_cost(problem, node, candidate)
            edges += 1
            if next_cost >= best.get(candidate.candidate_id, float("inf")):
                continue
            best[candidate.candidate_id] = next_cost
            priority = next_cost + heuristic(problem, candidate, goal) * weight
            heapq.heappush(queue, (priority, candidate.candidate_id, next_cost, route_ids + [candidate.candidate_id]))
            max_frontier = max(max_frontier, len(queue))
    return [start], float("inf"), expanded, edges, max_frontier


def _route_cost(problem: PlanningProblem, route: list[CandidateNode]) -> float:
    return sum(edge_cost(problem, source, target) for source, target in itertools.pairwise(route))

