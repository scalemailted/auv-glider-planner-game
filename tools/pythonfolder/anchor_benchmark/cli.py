#!/usr/bin/env python3
"""Run optional classical planners and write ANCHOR plan artifacts."""

from __future__ import annotations

import argparse
import csv
import platform
import subprocess
from pathlib import Path

from .benchmark import compare_results, run_planner_suite
from .exports import build_anchor_plan, build_benchmark_record, build_reproducibility_manifest
from .graph import build_planning_problem
from .io import load_json, node_version, stable_digest, validate_solver_packet, write_json


def main() -> int:
    parser = argparse.ArgumentParser(description="Run optional COLAB-BENCH-R1 classical planners.")
    parser.add_argument("--solver-packet", required=True)
    parser.add_argument("--out", default="anchor_benchmark_output")
    parser.add_argument("--planners", default="dijkstra,astar,weightedAstar,greedyValuePerCost,beamSearch,timeExpandedAstar")
    parser.add_argument("--candidate-node-limit", type=int, default=24)
    parser.add_argument("--profile-policy", default="mission/default")
    parser.add_argument("--allow-oracle", action="store_true")
    args = parser.parse_args()

    packet = load_json(args.solver_packet)
    validation = validate_solver_packet(packet, allow_oracle=args.allow_oracle)
    if not validation["ok"]:
        raise SystemExit(f"Solver packet validation failed: {validation['errors']}")

    root = Path(args.out)
    plan_dir = root / "plans"
    record_dir = root / "benchmark_records"
    table_dir = root / "tables"
    for directory in (plan_dir, record_dir, table_dir, root / "results", root / "figures"):
        directory.mkdir(parents=True, exist_ok=True)

    problem = build_planning_problem(packet, candidate_node_limit=args.candidate_node_limit, profile_policy=args.profile_policy)
    planner_ids = [item.strip() for item in args.planners.split(",") if item.strip()]
    results = run_planner_suite(problem, planner_ids)
    records = []
    generated_paths = []
    for result in results:
        plan = build_anchor_plan(problem, result)
        plan_path = write_json(plan_dir / f"{result.planner_id}.anchor.plan.json", plan)
        record = build_benchmark_record(problem, result, plan=plan)
        record_path = write_json(record_dir / f"{result.planner_id}.benchmark-record.json", record)
        generated_paths.extend([str(plan_path), str(record_path)])
        records.append(record)

    rows = compare_results(results)
    csv_path = table_dir / "planner_search_summary.csv"
    with csv_path.open("w", encoding="utf-8", newline="") as handle:
        writer = csv.DictWriter(handle, fieldnames=list(rows[0].keys()))
        writer.writeheader()
        writer.writerows(rows)
    generated_paths.append(str(csv_path))

    summary = {"solverPacketDigest": stable_digest(packet), "plannerRows": rows, "validation": validation}
    write_json(root / "benchmark_summary.json", summary)
    manifest = build_reproducibility_manifest(
        problem,
        records,
        repository_commit=_git_commit(),
        python_version=platform.python_version(),
        node_version=node_version(),
        generated_paths=generated_paths,
    )
    write_json(root / "reproducibility_manifest.json", manifest)
    print(f"Wrote {root} ({len(results)} planner result(s)).")
    return 0


def _git_commit() -> str:
    try:
        completed = subprocess.run(["git", "rev-parse", "HEAD"], check=True, capture_output=True, text=True)
        return completed.stdout.strip() or "UNKNOWN"
    except Exception:
        return "UNKNOWN"


if __name__ == "__main__":
    raise SystemExit(main())

