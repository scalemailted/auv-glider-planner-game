"""Lightweight headless helpers for ANCHOR external solver examples.

These helpers intentionally mirror only the JSON planning contract. They do
not simulate the browser game; ANCHOR remains the official validator, simulator,
and scorer.
"""

from .my_io import load_solver_packet, write_plan_json
from .world import build_headless_world, summarize_packet
from .solvers import greedy_forecast_plan
from .validation import sanity_check_plan
from .export import build_plan_json

__all__ = [
    "build_headless_world",
    "build_plan_json",
    "greedy_forecast_plan",
    "load_solver_packet",
    "sanity_check_plan",
    "summarize_packet",
    "write_plan_json",
]
