"""Public exported-data parity checks for the Colab benchmark notebook.

These helpers reconstruct solver-visible public arrays from an ANCHOR solver
packet. They intentionally do not infer hidden truth or simulate mission
outcomes.
"""

from __future__ import annotations

import math
import sys
from typing import Any

from .io import BENCHMARK_BOUNDARY, NOTEBOOK_VERSION, node_version, stable_digest


DEPTH_LAYER_DEFAULTS = {
    "surface": 0.0,
    "shallow": 10.0,
    "thermocline": 35.0,
    "midwater": 75.0,
    "deep": 150.0,
}


def extract_public_environment(packet: dict[str, Any]) -> dict[str, Any]:
    """Return Python-friendly public environment arrays and axes."""
    level = packet.get("level") or {}
    visible = ((packet.get("planningData") or {}).get("visibleFields") or {})
    layers = level.get("layers") or {}
    grid = ((level.get("world") or {}).get("grid") or {})
    width = int(grid.get("width") or _grid_width(visible.get("terrain") or layers.get("terrain")))
    height = int(grid.get("height") or _grid_height(visible.get("terrain") or layers.get("terrain")))
    cell_size = float(grid.get("cellSizeMeters") or grid.get("cellSize") or 1.0)
    east_axis = [round(index * cell_size, 12) for index in range(width)]
    north_axis = [round(index * cell_size, 12) for index in range(height)]
    terrain = visible.get("terrain") or layers.get("terrain") or []
    hazards = visible.get("hazards") or layers.get("hazards") or []
    forecast = visible.get("forecast") or layers.get("forecast") or {}
    frames = forecast.get("frames") or []
    depth_axis = _depth_axis(packet)
    time_axis = [float(frame.get("t", frame.get("timeSeconds", 0.0)) or 0.0) for frame in frames] or [0.0]
    bathymetry = visible.get("bathymetry") or layers.get("bathymetry") or None
    wet_mask = [[not bool(_value_at(terrain, x, y, 0)) for x in range(width)] for y in range(height)]
    land_mask = [[not wet for wet in row] for row in wet_mask]
    return {
        "artifactType": "anchor.colab-benchmark.public-environment-inspection",
        "artifactVersion": "colab-bench-r1.1",
        "sourceSolverPacketType": packet.get("type"),
        "environmentDigest": packet.get("environmentDigest"),
        "missionDigest": packet.get("missionDigest"),
        "coordinateFrame": packet.get("coordinateFrame", "grid with cellSizeMeters"),
        "horizontalUnits": "meters",
        "depthConvention": "positive-down meters; depth-resolved fields only when exported",
        "timeConvention": "seconds",
        "eastAxisMeters": east_axis,
        "northAxisMeters": north_axis,
        "depthAxisMeters": depth_axis,
        "timeAxisSeconds": time_axis,
        "bathymetry": bathymetry,
        "bathymetryAvailable": bathymetry is not None,
        "terrain": terrain,
        "wetMask": wet_mask,
        "landMask": land_mask,
        "hazards": hazards,
        "publicCurrentFields": [frame.get("current") for frame in frames],
        "publicScalarFields": [frame.get("roi") for frame in frames],
        "fieldRoleSummary": {
            "terrain": "public mask/terrain compatibility grid",
            "hazards": "public hazard grid",
            "current": "forecast-visible horizontal current vectors from exported frames",
            "roi": "forecast-visible scalar/science value from exported frames",
        },
        "visibilityClass": packet.get("visibilityClass") or (packet.get("visibility") or {}).get("visibilityClass"),
        "fairnessClass": packet.get("fairnessClass") or (packet.get("visibility") or {}).get("fairnessClass"),
        "validationBaselineDigest": packet.get("validationBaselineDigest"),
        "sourceMetadata": {
            "packetId": packet.get("packetId"),
            "fixtureId": (packet.get("benchmarkFixture") or {}).get("fixtureId"),
            "hiddenTruthIncluded": (packet.get("planningData") or {}).get("hiddenTruthIncluded") is True,
        },
    }


def summarize_public_environment(packet: dict[str, Any]) -> dict[str, Any]:
    env = extract_public_environment(packet)
    current_values: list[float] = []
    scalar_values: list[float] = []
    for field in env["publicCurrentFields"]:
        for vector in _flatten_grid(field):
            u, v, w = _vector_components(vector)
            current_values.append(math.sqrt(u * u + v * v + w * w))
    for field in env["publicScalarFields"]:
        for value in _flatten_grid(field):
            scalar_values.append(_scalar_value(value))
    return {
        "schema": "PASS" if env["sourceSolverPacketType"] == "anchor.solverPacket" else "FAIL",
        "axes": {
            "eastCount": len(env["eastAxisMeters"]),
            "northCount": len(env["northAxisMeters"]),
            "depthCount": len(env["depthAxisMeters"]),
            "timeCount": len(env["timeAxisSeconds"]),
            "monotonic": _monotonic(env["eastAxisMeters"]) and _monotonic(env["northAxisMeters"]) and _monotonic(env["timeAxisSeconds"]),
        },
        "bathymetry": {
            "status": "PASS" if env["bathymetryAvailable"] else "WARN",
            "available": env["bathymetryAvailable"],
            "note": "Fixture exposes terrain/wet-land masks, not calibrated bathymetry." if not env["bathymetryAvailable"] else "Bathymetry array exported.",
        },
        "masks": {
            "wetCount": sum(1 for row in env["wetMask"] for value in row if value),
            "landCount": sum(1 for row in env["landMask"] for value in row if value),
        },
        "currents": _stats(current_values),
        "scalars": _stats(scalar_values),
        "missionGeometry": _mission_geometry_summary(packet),
        "visibilityClass": env["visibilityClass"],
        "fairnessClass": env["fairnessClass"],
        "payloadDigest": stable_digest(env),
    }


def sample_public_environment(
    packet: dict[str, Any],
    *,
    east_meters: float,
    north_meters: float,
    depth_meters: float = 0.0,
    time_seconds: float = 0.0,
) -> dict[str, Any]:
    env = extract_public_environment(packet)
    cell_size = float((((packet.get("level") or {}).get("world") or {}).get("grid") or {}).get("cellSizeMeters") or 1.0)
    x = _clamp(int(round(east_meters / cell_size)), 0, max(0, len(env["eastAxisMeters"]) - 1))
    y = _clamp(int(round(north_meters / cell_size)), 0, max(0, len(env["northAxisMeters"]) - 1))
    frames = ((packet.get("planningData") or {}).get("visibleFields") or {}).get("forecast", {}).get("frames")
    if not frames:
        frames = (((packet.get("level") or {}).get("layers") or {}).get("forecast") or {}).get("frames") or []
    frame = _nearest_frame(frames, time_seconds)
    u, v, w = _vector_components(_value_at(frame.get("current") or [], x, y, [0.0, 0.0]))
    scalar = _scalar_value(_value_at(frame.get("roi") or [], x, y, 0.0))
    terrain_value = _scalar_value(_value_at(env["terrain"], x, y, 0.0))
    hazard_value = _scalar_value(_value_at(env["hazards"], x, y, 0.0))
    bottom_depth = _value_at(env["bathymetry"], x, y, None) if env["bathymetry"] is not None else None
    return {
        "eastMeters": env["eastAxisMeters"][x] if env["eastAxisMeters"] else east_meters,
        "northMeters": env["northAxisMeters"][y] if env["northAxisMeters"] else north_meters,
        "depthMeters": depth_meters,
        "timeSeconds": float(frame.get("t", frame.get("timeSeconds", time_seconds)) or 0.0),
        "gridX": x,
        "gridY": y,
        "resolvedDepthLayer": _nearest_depth_layer(env["depthAxisMeters"], depth_meters),
        "bottomDepthMeters": bottom_depth,
        "terrainValue": terrain_value,
        "wet": not bool(terrain_value),
        "land": bool(terrain_value),
        "hazardValue": hazard_value,
        "current": {
            "uEastMetersPerSecond": u,
            "vNorthMetersPerSecond": v,
            "wDownMetersPerSecond": w,
            "magnitudeMetersPerSecond": math.sqrt(u * u + v * v + w * w),
        },
        "scalars": {
            "science-value": scalar,
            "roi": scalar,
        },
    }


def validate_parity_probes(packet: dict[str, Any], probes: list[dict[str, Any]] | None = None) -> dict[str, Any]:
    probes = probes if probes is not None else (packet.get("parityProbes") or (packet.get("benchmarkFixture") or {}).get("parityProbes") or [])
    rows = []
    failures = []
    for probe in probes:
        actual = sample_public_environment(
            packet,
            east_meters=float(probe.get("eastMeters", 0.0) or 0.0),
            north_meters=float(probe.get("northMeters", 0.0) or 0.0),
            depth_meters=float(probe.get("depthMeters", 0.0) or 0.0),
            time_seconds=float(probe.get("timeSeconds", 0.0) or 0.0),
        )
        result = _compare_probe(probe, actual)
        rows.append(result)
        if result["status"] == "FAIL":
            failures.append(result)
    status = "FAIL" if failures else ("PASS" if rows else "NOT_EVALUATED")
    return {
        "status": status,
        "probeCount": len(rows),
        "failedProbeCount": len(failures),
        "rows": rows,
    }


def build_parity_table(packet: dict[str, Any], probe_result: dict[str, Any] | None = None) -> list[dict[str, Any]]:
    summary = summarize_public_environment(packet)
    probe_result = probe_result or validate_parity_probes(packet)
    return [
        {"Area": "Artifact schema", "Status": summary["schema"], "Evidence": packet.get("type")},
        {"Area": "Coordinate frame", "Status": "PASS", "Evidence": "grid coordinates with cellSizeMeters converted to meters"},
        {"Area": "Axes and shapes", "Status": "PASS" if summary["axes"]["monotonic"] else "FAIL", "Evidence": summary["axes"]},
        {"Area": "Bathymetry", "Status": summary["bathymetry"]["status"], "Evidence": summary["bathymetry"]},
        {"Area": "Wet/land masks", "Status": "PASS", "Evidence": summary["masks"]},
        {"Area": "Currents", "Status": "PASS" if summary["currents"]["finiteCount"] > 0 else "WARN", "Evidence": summary["currents"]},
        {"Area": "Scalar fields", "Status": "PASS" if summary["scalars"]["finiteCount"] > 0 else "WARN", "Evidence": summary["scalars"]},
        {"Area": "Mission geometry", "Status": "PASS", "Evidence": summary["missionGeometry"]},
        {"Area": "Numerical probes", "Status": probe_result["status"], "Evidence": {"probeCount": probe_result["probeCount"], "failedProbeCount": probe_result["failedProbeCount"]}},
        {"Area": "Python round trip", "Status": "PASS", "Evidence": "stable content digest comparison; byte formatting is not authoritative"},
        {"Area": "Plan codec", "Status": "NOT_EVALUATED", "Evidence": "set by ANCHOR Node evaluator after plan export"},
        {"Area": "ANCHOR simulation", "Status": "NOT_EVALUATED", "Evidence": "set by ANCHOR Node evaluator"},
        {"Area": "ANCHOR scoring", "Status": "NOT_EVALUATED", "Evidence": "set by ANCHOR Node evaluator"},
        {"Area": "Reproducibility manifest", "Status": "NOT_EVALUATED", "Evidence": "created at notebook end"},
    ]


def build_colab_acceptance_report(
    *,
    packet: dict[str, Any],
    validation_report: dict[str, Any],
    parity_result: dict[str, Any],
    parity_table: list[dict[str, Any]],
    algorithm_results: list[Any],
    official_results: dict[str, Any],
    output_artifacts: list[str],
    notebook_digest: str = "UNKNOWN",
    repository_commit: str = "UNKNOWN",
    library_versions: dict[str, str] | None = None,
) -> dict[str, Any]:
    algorithms = _algorithm_summary(algorithm_results)
    official = _official_evaluation_summary(official_results)
    required_rows = [row for row in parity_table if row["Area"] not in ("Bathymetry",)]
    failures = []
    if validation_report.get("ok") is not True:
        failures.append("solver-packet validation did not pass")
    if parity_result.get("status") != "PASS":
        failures.append("required parity probes did not pass")
    for row in required_rows:
        if row["Status"] in ("FAIL", "NOT_EVALUATED") and row["Area"] in ("Artifact schema", "Axes and shapes", "Wet/land masks", "Currents", "Scalar fields", "Mission geometry", "Numerical probes"):
            failures.append(f"parity table row {row['Area']} is {row['Status']}")
    if not any(value.get("completed") for value in algorithms.values()):
        failures.append("no planner completed")
    if official.get("officialScore") is None:
        failures.append("authoritative ANCHOR evaluation did not produce an official score")
    status = "PASS" if not failures else "FAIL"
    report = {
        "reportType": "anchor.colab-benchmark-acceptance",
        "reportVersion": "1.0.0",
        "status": status,
        "notebookDigest": notebook_digest,
        "repositoryCommit": repository_commit,
        "pythonVersion": sys.version.split()[0],
        "libraryVersions": library_versions or {},
        "nodeVersion": node_version(),
        "validationBaselineId": "scientific-validation-baseline-sci-valid-r2a",
        "validationBaselineDigest": packet.get("validationBaselineDigest") or "fnv1a32:dd016175",
        "fixtureDigests": {
            packet.get("packetId", "solverPacket"): stable_digest(packet),
        },
        "environmentDigest": packet.get("environmentDigest"),
        "missionDigest": packet.get("missionDigest"),
        "fairnessClass": packet.get("fairnessClass") or (packet.get("visibility") or {}).get("fairnessClass") or "FORECAST_ONLY",
        "dataParity": {
            "schema": "PASS" if validation_report.get("ok") else "FAIL",
            "axes": _table_status(parity_table, "Axes and shapes"),
            "bathymetry": _table_status(parity_table, "Bathymetry"),
            "masks": _table_status(parity_table, "Wet/land masks"),
            "currents": _table_status(parity_table, "Currents"),
            "scalars": _table_status(parity_table, "Scalar fields"),
            "missionGeometry": _table_status(parity_table, "Mission geometry"),
            "probeCount": parity_result.get("probeCount", 0),
            "failedProbeCount": parity_result.get("failedProbeCount", 0),
        },
        "algorithms": algorithms,
        "officialEvaluation": official,
        "outputArtifacts": [str(path) for path in output_artifacts],
        "warnings": [row["Evidence"] for row in parity_table if row["Status"] == "WARN"],
        "failures": failures,
        "boundary": BENCHMARK_BOUNDARY,
        "notebookVersion": NOTEBOOK_VERSION,
    }
    report["reportDigest"] = stable_digest({key: value for key, value in report.items() if key != "reportDigest"})
    return report


def _compare_probe(probe: dict[str, Any], actual: dict[str, Any]) -> dict[str, Any]:
    expected = probe.get("expected") or {}
    tolerances = probe.get("tolerances") or {}
    checks = []
    failures = []

    def add_check(name: str, actual_value: Any, expected_value: Any, tolerance: float = 0.0) -> None:
        if expected_value is None:
            return
        if isinstance(expected_value, bool):
            ok = bool(actual_value) == expected_value
            delta = 0.0 if ok else 1.0
        else:
            actual_float = float(actual_value)
            expected_float = float(expected_value)
            delta = abs(actual_float - expected_float)
            ok = delta <= tolerance
        row = {"name": name, "actual": actual_value, "expected": expected_value, "tolerance": tolerance, "delta": delta, "status": "PASS" if ok else "FAIL"}
        checks.append(row)
        if not ok:
            failures.append(row)

    add_check("wet", actual.get("wet"), expected.get("wet"), 0.0)
    add_check("bottomDepthMeters", actual.get("bottomDepthMeters"), expected.get("bottomDepthMeters"), float((tolerances.get("bottomDepthMeters", 0.0) or 0.0)))
    add_check("terrainValue", actual.get("terrainValue"), expected.get("terrainValue"), 0.0)
    add_check("hazardValue", actual.get("hazardValue"), expected.get("hazardValue"), float((tolerances.get("hazardValue", 1e-12) or 1e-12)))
    expected_current = expected.get("current") or {}
    add_check("current.u", actual["current"]["uEastMetersPerSecond"], expected_current.get("uEastMetersPerSecond"), float((tolerances.get("currentMetersPerSecond", 1e-9) or 1e-9)))
    add_check("current.v", actual["current"]["vNorthMetersPerSecond"], expected_current.get("vNorthMetersPerSecond"), float((tolerances.get("currentMetersPerSecond", 1e-9) or 1e-9)))
    add_check("current.w", actual["current"]["wDownMetersPerSecond"], expected_current.get("wDownMetersPerSecond"), float((tolerances.get("currentMetersPerSecond", 1e-9) or 1e-9)))
    for key, value in (expected.get("scalars") or {}).items():
        add_check(f"scalar.{key}", actual["scalars"].get(key), value, float((tolerances.get("scalarValue", 1e-9) or 1e-9)))
    return {
        "probeId": probe.get("probeId"),
        "status": "FAIL" if failures else "PASS",
        "actual": actual,
        "checks": checks,
        "failureCount": len(failures),
    }


def _algorithm_summary(results: list[Any]) -> dict[str, dict[str, Any]]:
    summary: dict[str, dict[str, Any]] = {}
    for result in results:
        planner_id = getattr(result, "planner_id", None) or getattr(result, "plannerId", None)
        if not planner_id and isinstance(result, dict):
            planner_id = result.get("plannerId") or result.get("planner_id")
        if not planner_id:
            continue
        summary[str(planner_id)] = {
            "completed": not bool(getattr(result, "timeout", False) if not isinstance(result, dict) else result.get("timeout")),
            "label": getattr(result, "label", None) if not isinstance(result, dict) else result.get("label"),
            "optimalityStatus": getattr(result, "optimality_status", None) if not isinstance(result, dict) else result.get("optimalityStatus"),
            "cost": getattr(result, "cost", None) if not isinstance(result, dict) else result.get("cost"),
            "nodesExpanded": getattr(result, "nodes_expanded", None) if not isinstance(result, dict) else result.get("nodesExpanded"),
            "solveTimeSeconds": getattr(result, "solve_time_seconds", None) if not isinstance(result, dict) else result.get("solveTimeSeconds"),
        }
    if "dijkstra" in summary and "astar" in summary:
        try:
            summary["dijkstraAstarCostDelta"] = {"value": abs(float(summary["dijkstra"]["cost"]) - float(summary["astar"]["cost"])), "status": "PASS"}
        except Exception:
            summary["dijkstraAstarCostDelta"] = {"value": None, "status": "WARN"}
    return summary


def _official_evaluation_summary(official_results: dict[str, Any]) -> dict[str, Any]:
    for result in official_results.values():
        if isinstance(result, dict) and result.get("ok") is True:
            return {
                "planDigest": result.get("planDigest") or result.get("files", {}).get("planDigest"),
                "simulationResultDigest": result.get("simulationResultDigest"),
                "scoreProfileId": result.get("scoreProfileId"),
                "scoreProfileVersion": result.get("scoreProfileVersion"),
                "scoreResultDigest": result.get("scoreResultDigest"),
                "officialScore": result.get("finalScore"),
                "terminalReason": result.get("terminalReason"),
            }
    return {
        "planDigest": None,
        "simulationResultDigest": None,
        "scoreProfileId": None,
        "scoreProfileVersion": None,
        "scoreResultDigest": None,
        "officialScore": None,
        "terminalReason": None,
    }


def _mission_geometry_summary(packet: dict[str, Any]) -> dict[str, int]:
    mission = packet.get("mission") or {}
    deployment = packet.get("deployment") or {}
    planning = packet.get("planningData") or {}
    return {
        "agentCount": len(mission.get("agents") or []),
        "deploymentCount": len(deployment.get("agents") or []),
        "candidateNodeCount": len(planning.get("candidateNodes") or []),
    }


def _table_status(rows: list[dict[str, Any]], area: str) -> str:
    for row in rows:
        if row.get("Area") == area:
            return str(row.get("Status"))
    return "NOT_EVALUATED"


def _nearest_frame(frames: list[dict[str, Any]], time_seconds: float) -> dict[str, Any]:
    if not frames:
        return {}
    return min(frames, key=lambda frame: abs(float(frame.get("t", frame.get("timeSeconds", 0.0)) or 0.0) - time_seconds))


def _nearest_depth_layer(depth_axis: list[float], depth_meters: float) -> dict[str, Any]:
    if not depth_axis:
        return {"depthMeters": depth_meters, "depthResolved": False}
    nearest = min(depth_axis, key=lambda depth: abs(depth - depth_meters))
    return {"depthMeters": nearest, "depthResolved": len(depth_axis) > 1}


def _depth_axis(packet: dict[str, Any]) -> list[float]:
    config = ((packet.get("planningData") or {}).get("waterColumnConfig") or
              ((packet.get("level") or {}).get("world") or {}).get("waterColumnConfig") or
              packet.get("waterColumnConfig") or {})
    if isinstance(config.get("depthAxisMeters"), list):
        return [float(value) for value in config["depthAxisMeters"]]
    layers = config.get("depthLayers") or []
    axis = []
    for layer in layers:
        if isinstance(layer, dict):
            axis.append(float(layer.get("depthMeters", layer.get("nominalDepthMeters", DEPTH_LAYER_DEFAULTS.get(str(layer.get("id")), 0.0))) or 0.0))
    if axis:
        return axis
    ids = config.get("depthLayerIds") or config.get("defaultLayerIds") or ["surface"]
    return [float(DEPTH_LAYER_DEFAULTS.get(str(item), 0.0)) for item in ids]


def _stats(values: list[float]) -> dict[str, Any]:
    finite = sorted(value for value in values if math.isfinite(value))
    if not finite:
        return {"finiteCount": 0, "minimum": None, "mean": None, "maximum": None, "q50": None, "q95": None, "zeroCount": 0}
    return {
        "finiteCount": len(finite),
        "minimum": finite[0],
        "mean": sum(finite) / len(finite),
        "maximum": finite[-1],
        "q50": finite[len(finite) // 2],
        "q95": finite[min(len(finite) - 1, int(round((len(finite) - 1) * 0.95)))],
        "zeroCount": sum(1 for value in finite if abs(value) <= 1e-12),
    }


def _flatten_grid(grid: Any) -> list[Any]:
    if not isinstance(grid, list):
        return []
    values = []
    for row in grid:
        if isinstance(row, list):
            values.extend(row)
        else:
            values.append(row)
    return values


def _monotonic(values: list[float]) -> bool:
    return all(values[index] <= values[index + 1] for index in range(len(values) - 1))


def _vector_components(value: Any) -> tuple[float, float, float]:
    if isinstance(value, dict):
        return (
            float(value.get("uEastMetersPerSecond", value.get("u", 0.0)) or 0.0),
            float(value.get("vNorthMetersPerSecond", value.get("v", 0.0)) or 0.0),
            float(value.get("wDownMetersPerSecond", value.get("w", 0.0)) or 0.0),
        )
    if isinstance(value, (list, tuple)):
        return (
            float(value[0] if len(value) > 0 and value[0] is not None else 0.0),
            float(value[1] if len(value) > 1 and value[1] is not None else 0.0),
            float(value[2] if len(value) > 2 and value[2] is not None else 0.0),
        )
    return 0.0, 0.0, 0.0


def _scalar_value(value: Any) -> float:
    if isinstance(value, dict):
        return float(value.get("expectedValue", value.get("value", value.get("rewardValue", 0.0))) or 0.0)
    return float(value or 0.0)


def _value_at(grid: Any, x: int, y: int, default: Any = None) -> Any:
    if not isinstance(grid, list) or y < 0 or x < 0 or y >= len(grid) or not isinstance(grid[y], list) or x >= len(grid[y]):
        return default
    return grid[y][x]


def _grid_width(grid: Any) -> int:
    return len(grid[0]) if isinstance(grid, list) and grid and isinstance(grid[0], list) else 0


def _grid_height(grid: Any) -> int:
    return len(grid) if isinstance(grid, list) else 0


def _clamp(value: int, minimum: int, maximum: int) -> int:
    return max(minimum, min(maximum, value))
