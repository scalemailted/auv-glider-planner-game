"""Optional classical-planner benchmark helpers for ANCHOR Colab workflows.

The package proposes plans and benchmark records. It intentionally does not
simulate missions or compute official scores; ANCHOR Node/browser tooling owns
validation, simulation, and scoring.
"""

from .benchmark import PLANNER_REGISTRY, compare_results, repeated_timing, run_planner_suite
from .exports import build_anchor_plan, build_benchmark_record, build_reproducibility_manifest
from .graph import build_planning_problem
from .io import BENCHMARK_BOUNDARY, NOTEBOOK_VERSION, load_json, stable_digest, validate_solver_packet, write_json
from .oracles import exact_small_instance_oracle
from .planners import (
    astar_search,
    beam_search,
    dijkstra_search,
    greedy_value_per_cost,
    time_expanded_astar,
    weighted_astar_search,
)

__all__ = [
    "BENCHMARK_BOUNDARY",
    "NOTEBOOK_VERSION",
    "PLANNER_REGISTRY",
    "astar_search",
    "beam_search",
    "build_anchor_plan",
    "build_benchmark_record",
    "build_planning_problem",
    "build_reproducibility_manifest",
    "compare_results",
    "dijkstra_search",
    "exact_small_instance_oracle",
    "greedy_value_per_cost",
    "load_json",
    "repeated_timing",
    "run_planner_suite",
    "stable_digest",
    "time_expanded_astar",
    "validate_solver_packet",
    "weighted_astar_search",
    "write_json",
]

