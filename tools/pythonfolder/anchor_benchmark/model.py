"""Data models used by the optional classical benchmark planners."""

from __future__ import annotations

from dataclasses import dataclass, field
from typing import Any


@dataclass(frozen=True)
class CandidateNode:
    candidate_id: str
    x: int
    y: int
    east_meters: float
    north_meters: float
    value: float
    source: str
    metadata: dict[str, Any] = field(default_factory=dict)


@dataclass(frozen=True)
class CostTerm:
    name: str
    units: str
    direction: str
    coefficient: float
    explanation: str
    source: str


@dataclass
class PlanningProblem:
    packet: dict[str, Any]
    level: dict[str, Any]
    mission: dict[str, Any]
    width: int
    height: int
    cell_size_meters: float
    duration_seconds: float
    time_bin_seconds: float
    start_node_id: str
    goal_node_id: str | None
    candidates: list[CandidateNode]
    cost_terms: list[CostTerm]
    frame: dict[str, Any]
    terrain: list[list[Any]]
    hazards: list[list[Any]]
    current: list[list[Any]]
    roi: list[list[Any]]
    fairness_class: str
    visibility_class: str
    profile_policy: str


@dataclass
class PlannerResult:
    planner_id: str
    label: str
    optimality_status: str
    fairness_class: str
    route: list[CandidateNode]
    cost: float
    value: float
    solve_time_seconds: float
    nodes_expanded: int
    edges_evaluated: int
    maximum_frontier_size: int
    pruned_state_count: int = 0
    timeout: bool = False
    assumptions: list[str] = field(default_factory=list)
    metadata: dict[str, Any] = field(default_factory=dict)

    @property
    def candidate_ids(self) -> list[str]:
        return [node.candidate_id for node in self.route]

