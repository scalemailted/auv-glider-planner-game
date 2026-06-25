"""Bounded exact search for small declared candidate sets."""

from __future__ import annotations

import itertools
import time

from .graph import edge_cost, node_by_id, route_value
from .model import PlannerResult, PlanningProblem


def exact_small_instance_oracle(problem: PlanningProblem, *, candidate_limit: int = 6, route_depth: int = 4) -> PlannerResult:
    start_time = time.perf_counter()
    start = node_by_id(problem, problem.start_node_id)
    choices = [node for node in problem.candidates if node.candidate_id != problem.start_node_id][:candidate_limit]
    if len(choices) > candidate_limit:
        raise ValueError("candidate set exceeds the declared exact oracle bound")
    best_route = [start]
    best_objective = float("-inf")
    best_cost = 0.0
    expanded = 0
    edges = 0
    for depth in range(1, min(route_depth, len(choices)) + 1):
        for perm in itertools.permutations(choices, depth):
            route = [start, *perm]
            cost = sum(edge_cost(problem, route[index], route[index + 1]) for index in range(len(route) - 1))
            value = route_value(route)
            objective = value * 1000.0 - cost
            expanded += 1
            edges += len(route) - 1
            if objective > best_objective or (objective == best_objective and [n.candidate_id for n in route] < [n.candidate_id for n in best_route]):
                best_objective = objective
                best_route = list(route)
                best_cost = cost
    return PlannerResult(
        "exactSmallInstanceOracle",
        "Exact Bounded Small-Instance Oracle",
        "EXACT_FOR_DECLARED_BOUNDED_CANDIDATE_SET",
        problem.fairness_class,
        best_route,
        best_cost,
        route_value(best_route),
        time.perf_counter() - start_time,
        expanded,
        edges,
        1,
        assumptions=[
            f"candidate_limit={candidate_limit}",
            f"route_depth={route_depth}",
            "objective=value*1000-predicted_graph_cost",
            "exact only for this declared candidate set, state representation, objective, and discretization",
        ],
    )

