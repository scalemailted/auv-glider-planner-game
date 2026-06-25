"""Planner-suite orchestration and timing helpers."""

from __future__ import annotations

import statistics
import time
from typing import Callable

from .model import PlannerResult, PlanningProblem
from .oracles import exact_small_instance_oracle
from .planners import astar_search, beam_search, dijkstra_search, greedy_value_per_cost, time_expanded_astar, weighted_astar_search


PlannerCallable = Callable[[PlanningProblem], PlannerResult]


PLANNER_REGISTRY: dict[str, PlannerCallable] = {
    "dijkstra": lambda problem: dijkstra_search(problem),
    "astar": lambda problem: astar_search(problem),
    "weightedAstar": lambda problem: weighted_astar_search(problem),
    "greedyValuePerCost": lambda problem: greedy_value_per_cost(problem),
    "beamSearch": lambda problem: beam_search(problem),
    "timeExpandedAstar": lambda problem: time_expanded_astar(problem),
    "exactSmallInstanceOracle": lambda problem: exact_small_instance_oracle(problem),
}


def run_planner_suite(problem: PlanningProblem, planner_ids: list[str] | None = None) -> list[PlannerResult]:
    selected = planner_ids or ["dijkstra", "astar", "weightedAstar", "greedyValuePerCost", "beamSearch", "timeExpandedAstar"]
    results: list[PlannerResult] = []
    for planner_id in selected:
        if planner_id not in PLANNER_REGISTRY:
            raise KeyError(f"Unknown planner id: {planner_id}")
        results.append(PLANNER_REGISTRY[planner_id](problem))
    return results


def repeated_timing(fn: Callable[[], PlannerResult], *, repeat_count: int = 3, warmup_count: int = 1) -> dict[str, float | bool | int]:
    for _ in range(max(0, warmup_count)):
        fn()
    samples = []
    timeout = False
    for _ in range(max(1, repeat_count)):
        start = time.perf_counter()
        result = fn()
        samples.append(time.perf_counter() - start)
        timeout = timeout or result.timeout
    return {
        "repeatCount": len(samples),
        "minimumSeconds": min(samples),
        "medianSeconds": statistics.median(samples),
        "maximumSeconds": max(samples),
        "timeout": timeout,
    }


def compare_results(results: list[PlannerResult]) -> list[dict[str, object]]:
    rows = []
    for result in results:
        rows.append({
            "plannerId": result.planner_id,
            "label": result.label,
            "optimalityStatus": result.optimality_status,
            "fairnessClass": result.fairness_class,
            "candidateIds": result.candidate_ids,
            "predictedCost": result.cost,
            "visibleValue": result.value,
            "solveTimeSeconds": result.solve_time_seconds,
            "nodesExpanded": result.nodes_expanded,
            "edgesEvaluated": result.edges_evaluated,
            "maximumFrontierSize": result.maximum_frontier_size,
            "timeout": result.timeout,
        })
    return sorted(rows, key=lambda row: (str(row["fairnessClass"]), float(row["predictedCost"]), str(row["plannerId"])))

