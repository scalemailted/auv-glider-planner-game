"""Public 4D benchmark bundle loading and data-inspection samplers.

This module inspects exported public benchmark data. It is not an ANCHOR
mission simulator, official scorer, or authoritative runtime sampler.
"""

from __future__ import annotations

import math
import platform
import time
from typing import Any

from .io import BENCHMARK_BOUNDARY, NOTEBOOK_VERSION, load_json, stable_digest


BUNDLE_TYPE = "anchor.classical-planner-benchmark-bundle"
BUNDLE_VERSION = "1.0.0"
EXECUTION_REPORT_TYPE = "anchor.colab-execution-report"
EXECUTION_PACKAGE_TYPE = "anchor.colab-execution-package"
FORBIDDEN_PUBLIC_MARKERS = (
    "T_hiddenTruth",
    "hiddenTruth",
    "hiddenFields",
    "rawOracleTensor",
    "oracleState",
)


def load_benchmark_bundle(path: str) -> dict[str, Any]:
    bundle = load_json(path)
    findings = validate_benchmark_bundle(bundle)
    if findings["status"] == "FAIL":
        raise ValueError("; ".join(finding["message"] for finding in findings["failures"]))
    return bundle


def validate_benchmark_bundle(bundle: dict[str, Any], *, allow_hidden: bool = False) -> dict[str, Any]:
    failures: list[dict[str, Any]] = []
    warnings: list[dict[str, Any]] = []

    def fail(code: str, message: str, path: str = "$") -> None:
        failures.append({"code": code, "message": message, "path": path})

    def warn(code: str, message: str, path: str = "$") -> None:
        warnings.append({"code": code, "message": message, "path": path})

    if bundle.get("type") != BUNDLE_TYPE:
        fail("BUNDLE_TYPE", f"Expected {BUNDLE_TYPE}.", "$.type")
    if str(bundle.get("schemaVersion")) != BUNDLE_VERSION:
        fail("BUNDLE_VERSION", f"Expected schemaVersion {BUNDLE_VERSION}.", "$.schemaVersion")
    if bundle.get("visibilityClass") != "PUBLIC":
        fail("VISIBILITY_CLASS", "Public benchmark bundle must use visibilityClass PUBLIC.", "$.visibilityClass")
    if bundle.get("fairnessClass") != "FORECAST_ONLY":
        fail("FAIRNESS_CLASS", "Default benchmark bundle must be FORECAST_ONLY.", "$.fairnessClass")
    if bundle.get("containsHiddenTruth") is not False:
        fail("HIDDEN_TRUTH_FLAG", "containsHiddenTruth must be false.", "$.containsHiddenTruth")
    if not allow_hidden and _contains_forbidden_marker(bundle):
        fail("HIDDEN_TRUTH_MARKER", "Bundle contains hidden-truth marker text.")

    axes = {
        "eastAxisMeters": bundle.get("eastAxisMeters"),
        "northAxisMeters": bundle.get("northAxisMeters"),
        "depthAxisMeters": bundle.get("depthAxisMeters"),
        "timeAxisSeconds": bundle.get("timeAxisSeconds"),
    }
    for name, axis in axes.items():
        if not isinstance(axis, list) or not axis:
            fail("AXIS_MISSING", f"{name} must be a non-empty list.", f"$.{name}")
        elif not all(_finite_number(value) for value in axis):
            fail("AXIS_NONFINITE", f"{name} contains non-finite values.", f"$.{name}")
        elif not _monotonic(axis):
            fail("AXIS_ORDER", f"{name} must be monotonic.", f"$.{name}")

    shape = [
        len(bundle.get("timeAxisSeconds") or []),
        len(bundle.get("depthAxisMeters") or []),
        len(bundle.get("northAxisMeters") or []),
        len(bundle.get("eastAxisMeters") or []),
    ]
    if bundle.get("currents", {}).get("shape") != shape:
        fail("CURRENT_SHAPE", "Current field shape does not match bundle axes.", "$.currents.shape")
    for field in bundle.get("scalarFields") or []:
        if field.get("shape") != shape:
            fail("SCALAR_SHAPE", f"Scalar field {field.get('fieldId')} shape does not match bundle axes.", "$.scalarFields")

    bathymetry = bundle.get("bathymetry") or {}
    if bathymetry.get("sourceRole") == "publicCompatibilityProjection":
        warn("COMPATIBILITY_BATHYMETRY", "Compact fixture uses public compatibility bathymetry, not calibrated bathymetry.", "$.bathymetry")
    if not _matches_grid_shape(bathymetry.get("bottomDepthMeters"), shape[2], shape[3]):
        fail("BATHYMETRY_SHAPE", "Bathymetry bottomDepthMeters grid shape does not match horizontal axes.", "$.bathymetry.bottomDepthMeters")
    if not _matches_grid_shape(bundle.get("wetMask"), shape[2], shape[3]):
        fail("WET_MASK_SHAPE", "wetMask shape does not match horizontal axes.", "$.wetMask")
    if not _matches_grid_shape(bundle.get("landMask"), shape[2], shape[3]):
        fail("LAND_MASK_SHAPE", "landMask shape does not match horizontal axes.", "$.landMask")
    if not _all_finite_nested(bundle.get("currents", {}).get("values")):
        fail("CURRENT_NONFINITE", "Current values must be finite.", "$.currents.values")
    for field in bundle.get("scalarFields") or []:
        if not _all_finite_nested(field.get("values")):
            fail("SCALAR_NONFINITE", f"Scalar field {field.get('fieldId')} contains non-finite values.", "$.scalarFields")

    expected_digest = _bundle_digest_without_self(bundle)
    if bundle.get("payloadDigest") != expected_digest:
        fail("PAYLOAD_DIGEST", "payloadDigest does not match stable bundle digest without self-digest fields.", "$.payloadDigest")

    return {
        "status": "FAIL" if failures else ("WARN" if warnings else "PASS"),
        "failures": failures,
        "warnings": warnings,
        "axisCounts": {
            "east": len(bundle.get("eastAxisMeters") or []),
            "north": len(bundle.get("northAxisMeters") or []),
            "depth": len(bundle.get("depthAxisMeters") or []),
            "time": len(bundle.get("timeAxisSeconds") or []),
        },
        "payloadDigest": expected_digest,
        "publicProjectionDigest": bundle.get("publicProjectionDigest"),
        "containsHiddenTruth": _contains_forbidden_marker(bundle),
    }


def reconstruct_public_bundle_arrays(bundle: dict[str, Any], *, prefer_numpy: bool = False) -> dict[str, Any]:
    """Return nested public arrays and optional NumPy arrays when available."""
    arrays: dict[str, Any] = {
        "bathymetry": (bundle.get("bathymetry") or {}).get("bottomDepthMeters"),
        "wetMask": bundle.get("wetMask"),
        "landMask": bundle.get("landMask"),
        "currents": (bundle.get("currents") or {}).get("values"),
        "scalars": {field.get("fieldId"): field.get("values") for field in bundle.get("scalarFields") or []},
    }
    if prefer_numpy:
        try:
            import numpy as np  # type: ignore
            arrays["numpy"] = {
                "bathymetry": np.array(arrays["bathymetry"], dtype=float),
                "wetMask": np.array(arrays["wetMask"], dtype=bool),
                "landMask": np.array(arrays["landMask"], dtype=bool),
                "currents": np.array(arrays["currents"], dtype=float),
                "scalars": {key: np.array(value, dtype=float) for key, value in arrays["scalars"].items()},
            }
        except Exception as exc:
            arrays["numpyUnavailable"] = str(exc)
    return arrays


def solver_packet_from_benchmark_bundle(bundle: dict[str, Any]) -> dict[str, Any]:
    """Build a solver-packet-like public planning projection from the bundle.

    This exists so the notebook planners can consume uploaded bundle data
    without a repository checkout. It is not a simulator input authority; local
    ANCHOR finalization still evaluates exported plans against the canonical
    checked-in/exported solver packet identified by digest.
    """
    east_axis = bundle.get("eastAxisMeters") or [0.0]
    north_axis = bundle.get("northAxisMeters") or [0.0]
    cell_size = float(east_axis[1] - east_axis[0]) if len(east_axis) > 1 else 1.0
    width = len(east_axis)
    height = len(north_axis)
    current_2d = [
        [[cell[0], cell[1]] for cell in row]
        for row in (((bundle.get("currents") or {}).get("values") or [[[[[0.0, 0.0, 0.0]]]]])[0][0])
    ]
    scalar_field = _find_scalar_field(bundle, "science-value") or {}
    roi_2d = ((scalar_field.get("values") or [[[[0.0]]]])[0][0])
    terrain = [[0 if (bundle.get("wetMask") or [[True]])[y][x] else 1 for x in range(width)] for y in range(height)]
    hazards = (((bundle.get("missionGeometry") or {}).get("hazards") or {}).get("values") or [[0 for _ in range(width)] for _ in range(height)])
    starts = (bundle.get("missionGeometry") or {}).get("starts") or [{"agentId": "glider_01", "eastMeters": 0.0, "northMeters": 0.0}]
    start = starts[0]
    start_cell = {
      "x": int(round(float(start.get("eastMeters", 0.0)) / cell_size)),
      "y": int(round(float(start.get("northMeters", 0.0)) / cell_size)),
    }
    return {
        "schemaVersion": "2.0",
        "type": "anchor.solverPacket",
        "packetId": f"{bundle.get('bundleId', 'bundle')}-public-planning-projection",
        "levelId": bundle.get("bundleId"),
        "missionId": "bundle-public-planning-mission",
        "visibilityClass": "FORECAST_ONLY",
        "fairnessClass": "FORECAST_ONLY",
        "environmentDigest": bundle.get("environmentDigest"),
        "missionDigest": bundle.get("missionDigest"),
        "validationBaselineDigest": bundle.get("validationBaselineDigest"),
        "scoreProfileId": bundle.get("scoreProfileId"),
        "scoreProfileVersion": bundle.get("scoreProfileVersion"),
        "scoreProfileDigest": bundle.get("scoreProfileDigest"),
        "visibility": {
            "truthIncluded": False,
            "forecastIncluded": True,
            "oracleMode": False,
            "publicChallenge": True,
            "visibilityClass": "FORECAST_ONLY",
            "fairnessClass": "FORECAST_ONLY",
        },
        "level": {
            "schemaVersion": "2.0",
            "type": "anchor.level",
            "levelId": bundle.get("bundleId"),
            "world": {
                "grid": {"width": width, "height": height, "cellSizeMeters": cell_size},
                "time": {"dt": 1, "duration": max(1.0, max(bundle.get("timeAxisSeconds") or [1.0])), "planningWindow": 3},
                "waterColumnConfig": {"depthAxisMeters": bundle.get("depthAxisMeters") or [0.0]},
            },
            "layers": {
                "terrain": terrain,
                "hazards": hazards,
                "forecast": {"frames": [{"t": 0, "current": current_2d, "roi": roi_2d}]},
            },
        },
        "mission": {
            "schemaVersion": "2.0",
            "type": "anchor.mission",
            "missionId": "bundle-public-planning-mission",
            "agents": [{"id": start.get("agentId", "glider_01"), "start": start_cell, "battery": 30, "maxSpeed": 1.5}],
            "rules": {"roiThreshold": 0.1},
            "physics": {"driftGain": 0, "energyPerCell": 1},
            "scoring": {"sampleWeight": 100},
        },
        "deployment": {"agents": [{"agentId": start.get("agentId", "glider_01"), "mode": "fixed", "selectedStart": start_cell, "allowedCells": []}]},
        "planningData": {
            "hiddenTruthIncluded": False,
            "forecastAvailable": True,
            "candidateNodes": [
                {
                    "id": node.get("id"),
                    "x": node.get("x", int(round(float(node.get("eastMeters", 0.0)) / cell_size))),
                    "y": node.get("y", int(round(float(node.get("northMeters", 0.0)) / cell_size))),
                    "source": node.get("source", "benchmarkBundleCandidate"),
                }
                for node in bundle.get("candidateNodes") or []
            ],
            "visibleFields": {
                "terrain": terrain,
                "hazards": hazards,
                "forecast": {"frames": [{"t": 0, "current": current_2d, "roi": roi_2d}]},
            },
            "waterColumnConfig": {"depthAxisMeters": bundle.get("depthAxisMeters") or [0.0]},
        },
        "benchmarkBundleDigest": bundle.get("benchmarkBundleDigest") or bundle.get("payloadDigest"),
        "publicProjectionDigest": bundle.get("publicProjectionDigest"),
        "solverPacketDigest": bundle.get("solverPacketDigest"),
    }


def sample_benchmark_bundle(
    bundle: dict[str, Any],
    *,
    east_meters: float,
    north_meters: float,
    depth_meters: float,
    time_seconds: float,
    scalar_field_id: str = "science-value",
) -> dict[str, Any]:
    """Reference data-inspection sampler for exported public arrays."""
    x = _axis_position(bundle["eastAxisMeters"], east_meters)
    y = _axis_position(bundle["northAxisMeters"], north_meters)
    z = _axis_position(bundle["depthAxisMeters"], depth_meters)
    t = _axis_position(bundle["timeAxisSeconds"], time_seconds, (bundle.get("currents") or {}).get("temporalBoundaryBehavior", "clamp"))
    bottom = _bilinear((bundle.get("bathymetry") or {}).get("bottomDepthMeters") or [], x, y)
    wet = _sample_mask(bundle.get("wetMask") or [], x, y)
    land = _sample_mask(bundle.get("landMask") or [], x, y)
    below_bottom = depth_meters > bottom
    current = _sample_current(bundle, t, z, y, x)
    scalar_field = _find_scalar_field(bundle, scalar_field_id)
    scalar_value = _sample_scalar(scalar_field, t, z, y, x) if scalar_field else None
    hazard = _bilinear((((bundle.get("missionGeometry") or {}).get("hazards") or {}).get("values") or []), x, y)
    return {
        "eastMeters": east_meters,
        "northMeters": north_meters,
        "depthMeters": depth_meters,
        "timeSeconds": time_seconds,
        "wet": wet,
        "land": land,
        "belowBottom": below_bottom,
        "bottomDepthMeters": _round(bottom),
        "hazardValue": _round(hazard),
        "current": {
            "uEastMetersPerSecond": _round(current[0]),
            "vNorthMetersPerSecond": _round(current[1]),
            "wDownMetersPerSecond": _round(current[2]),
            "magnitudeMetersPerSecond": _round(math.sqrt(current[0] ** 2 + current[1] ** 2 + current[2] ** 2)),
        },
        "scalars": {scalar_field_id: _round(scalar_value) if scalar_value is not None else None},
    }


def validate_bundle_parity_probes(bundle: dict[str, Any]) -> dict[str, Any]:
    rows = []
    failures = []
    for probe in bundle.get("parityProbes") or []:
        actual = sample_benchmark_bundle(
            bundle,
            east_meters=float(probe.get("eastMeters", 0.0) or 0.0),
            north_meters=float(probe.get("northMeters", 0.0) or 0.0),
            depth_meters=float(probe.get("depthMeters", 0.0) or 0.0),
            time_seconds=float(probe.get("timeSeconds", 0.0) or 0.0),
        )
        row = _compare_probe(probe, actual)
        rows.append(row)
        if row["status"] == "FAIL":
            failures.append(row)
    return {
        "status": "FAIL" if failures else ("PASS" if rows else "NOT_EVALUATED"),
        "probeCount": len(rows),
        "failedProbeCount": len(failures),
        "rows": rows,
    }


def build_bundle_parity_summary(bundle: dict[str, Any]) -> dict[str, Any]:
    validation = validate_benchmark_bundle(bundle)
    probes = validate_bundle_parity_probes(bundle)
    current = bundle.get("currents") or {}
    scalar_fields = bundle.get("scalarFields") or []
    return {
        "schema": "PASS" if bundle.get("type") == BUNDLE_TYPE else "FAIL",
        "coordinates": "PASS",
        "axes": "PASS" if validation["axisCounts"]["east"] and validation["axisCounts"]["depth"] and validation["axisCounts"]["time"] else "FAIL",
        "bathymetry": "PASS" if not validation["failures"] else "FAIL",
        "masks": "PASS",
        "currents": "PASS" if current.get("values") else "FAIL",
        "currentDepths": "PASS" if len(bundle.get("depthAxisMeters") or []) >= 1 else "FAIL",
        "currentTimes": "PASS" if len(bundle.get("timeAxisSeconds") or []) >= 1 else "FAIL",
        "scalars": "PASS" if scalar_fields else "FAIL",
        "scalarDepths": "PASS" if len(bundle.get("depthAxisMeters") or []) >= 1 else "FAIL",
        "scalarTimes": "PASS" if len(bundle.get("timeAxisSeconds") or []) >= 1 else "FAIL",
        "missionGeometry": "PASS" if bundle.get("missionGeometry") else "FAIL",
        "fieldDigests": "PASS" if current.get("fieldDigest") and all(field.get("fieldDigest") for field in scalar_fields) else "FAIL",
        "publicProjectionDigest": bundle.get("publicProjectionDigest"),
        "probeCount": probes["probeCount"],
        "failedProbeCount": probes["failedProbeCount"],
        "probeStatus": probes["status"],
        "warnings": validation["warnings"],
    }


def build_colab_execution_report(
    *,
    bundle: dict[str, Any],
    parity_result: dict[str, Any],
    algorithms: dict[str, Any],
    exported_plan_digests: list[str],
    notebook_digest: str,
    repository_commit: str = "UNKNOWN",
    official_evaluation_status: str = "PENDING_LOCAL_ANCHOR_REFEREE",
    warnings: list[str] | None = None,
    failures: list[str] | None = None,
    library_versions: dict[str, str] | None = None,
) -> dict[str, Any]:
    failures = list(failures or [])
    if parity_result.get("failedProbeCount", 0) != 0:
        failures.append("data parity probes failed")
    if not algorithms:
        failures.append("no planner results recorded")
    report = {
        "reportType": EXECUTION_REPORT_TYPE,
        "reportVersion": "1.0.0",
        "status": "FAIL" if failures else "PASS",
        "notebookDigest": notebook_digest,
        "repositoryCommit": repository_commit,
        "pythonVersion": platform.python_version(),
        "libraryVersions": library_versions or {},
        "validationBaselineId": bundle.get("validationBaselineId"),
        "validationBaselineDigest": bundle.get("validationBaselineDigest"),
        "benchmarkBundleDigest": bundle.get("benchmarkBundleDigest") or bundle.get("payloadDigest"),
        "environmentDigest": bundle.get("environmentDigest"),
        "publicProjectionDigest": bundle.get("publicProjectionDigest"),
        "missionDigest": bundle.get("missionDigest"),
        "dataParity": parity_result,
        "algorithms": algorithms,
        "exportedPlanDigests": exported_plan_digests,
        "officialEvaluationStatus": official_evaluation_status,
        "warnings": warnings or [],
        "failures": failures,
        "createdAtEpochSeconds": int(time.time()),
        "boundary": BENCHMARK_BOUNDARY,
        "notebookVersion": NOTEBOOK_VERSION,
    }
    report["reportDigest"] = stable_digest(_without_digest(report, "reportDigest"))
    return report


def build_colab_execution_package(
    *,
    execution_report: dict[str, Any],
    bundle: dict[str, Any],
    plans: list[dict[str, Any]],
    planner_metrics: dict[str, Any],
    parity_probe_results: dict[str, Any],
    reproducibility_manifest: dict[str, Any],
) -> dict[str, Any]:
    package = {
        "packageType": EXECUTION_PACKAGE_TYPE,
        "packageVersion": "1.0.0",
        "executionReport": execution_report,
        "benchmarkBundleIdentity": {
            "benchmarkBundleDigest": bundle.get("benchmarkBundleDigest") or bundle.get("payloadDigest"),
            "publicProjectionDigest": bundle.get("publicProjectionDigest"),
            "environmentDigest": bundle.get("environmentDigest"),
            "missionDigest": bundle.get("missionDigest"),
            "solverPacketDigest": bundle.get("solverPacketDigest"),
        },
        "plans": plans,
        "plannerMetrics": planner_metrics,
        "parityProbeResults": parity_probe_results,
        "reproducibilityManifest": reproducibility_manifest,
    }
    package["packageDigest"] = stable_digest(_without_digest(package, "packageDigest"))
    return package


def validate_colab_execution_package(package: dict[str, Any]) -> dict[str, Any]:
    failures = []
    if package.get("packageType") != EXECUTION_PACKAGE_TYPE:
        failures.append("packageType must be anchor.colab-execution-package")
    if package.get("packageVersion") != "1.0.0":
        failures.append("packageVersion must be 1.0.0")
    report = package.get("executionReport") or {}
    if report.get("reportType") != EXECUTION_REPORT_TYPE:
        failures.append("executionReport.reportType must be anchor.colab-execution-report")
    if report.get("officialEvaluationStatus") == "COMPLETED":
        failures.append("Colab execution package must not claim official evaluation unless local ANCHOR actually ran")
    if _contains_forbidden_marker(package):
        failures.append("execution package contains hidden-truth marker text")
    expected = stable_digest(_without_digest(package, "packageDigest"))
    if package.get("packageDigest") != expected:
        failures.append("packageDigest mismatch")
    return {
        "status": "FAIL" if failures else "PASS",
        "failures": failures,
        "packageDigest": expected,
    }


def _compare_probe(probe: dict[str, Any], actual: dict[str, Any]) -> dict[str, Any]:
    checks = []
    failures = []
    tolerances = probe.get("tolerances") or {}

    def add(name: str, expected: Any, observed: Any, tolerance: float = 0.0) -> None:
        if expected is None:
            return
        if isinstance(expected, bool):
            ok = bool(observed) == expected
            delta = 0.0 if ok else 1.0
        else:
            delta = abs(float(observed) - float(expected))
            ok = delta <= tolerance
        row = {"name": name, "expected": expected, "actual": observed, "delta": delta, "tolerance": tolerance, "status": "PASS" if ok else "FAIL"}
        checks.append(row)
        if not ok:
            failures.append(row)

    expected = probe.get("expected") or {}
    add("wet", expected.get("wet"), actual.get("wet"))
    add("land", expected.get("land"), actual.get("land"))
    add("belowBottom", expected.get("belowBottom"), actual.get("belowBottom"))
    add("bottomDepthMeters", expected.get("bottomDepthMeters"), actual.get("bottomDepthMeters"), float(tolerances.get("bottomDepthMeters", 1e-6)))
    add("hazardValue", expected.get("hazardValue"), actual.get("hazardValue"), float(tolerances.get("hazardValue", 1e-9)))
    current_tolerance = float(tolerances.get("currentMetersPerSecond", 1e-9))
    for key in ("uEastMetersPerSecond", "vNorthMetersPerSecond", "wDownMetersPerSecond"):
        add(f"current.{key}", (expected.get("current") or {}).get(key), (actual.get("current") or {}).get(key), current_tolerance)
    scalar_tolerance = float(tolerances.get("scalarValue", 1e-9))
    for key, expected_value in (expected.get("scalars") or {}).items():
        add(f"scalar.{key}", expected_value, (actual.get("scalars") or {}).get(key), scalar_tolerance)
    return {
        "probeId": probe.get("probeId"),
        "status": "FAIL" if failures else "PASS",
        "checks": checks,
        "actual": actual,
        "failureCount": len(failures),
    }


def _find_scalar_field(bundle: dict[str, Any], field_id: str) -> dict[str, Any] | None:
    for field in bundle.get("scalarFields") or []:
        if field.get("fieldId") == field_id:
            return field
    return (bundle.get("scalarFields") or [None])[0]


def _sample_current(bundle: dict[str, Any], t: dict[str, Any], z: dict[str, Any], y: dict[str, Any], x: dict[str, Any]) -> tuple[float, float, float]:
    values = (bundle.get("currents") or {}).get("values") or []
    return _interp_time_vector(values, t, z, y, x)


def _sample_scalar(field: dict[str, Any], t: dict[str, Any], z: dict[str, Any], y: dict[str, Any], x: dict[str, Any]) -> float:
    return _interp_time_scalar(field.get("values") or [], t, z, y, x)


def _interp_time_scalar(values: list[Any], t: dict[str, Any], z: dict[str, Any], y: dict[str, Any], x: dict[str, Any]) -> float:
    return _lerp(_interp_depth_scalar(values[t["lower"]], z, y, x), _interp_depth_scalar(values[t["upper"]], z, y, x), t["fraction"])


def _interp_time_vector(values: list[Any], t: dict[str, Any], z: dict[str, Any], y: dict[str, Any], x: dict[str, Any]) -> tuple[float, float, float]:
    a = _interp_depth_vector(values[t["lower"]], z, y, x)
    b = _interp_depth_vector(values[t["upper"]], z, y, x)
    return tuple(_lerp(a[index], b[index], t["fraction"]) for index in range(3))


def _interp_depth_scalar(values_by_depth: list[Any], z: dict[str, Any], y: dict[str, Any], x: dict[str, Any]) -> float:
    return _lerp(_bilinear(values_by_depth[z["lower"]], x, y), _bilinear(values_by_depth[z["upper"]], x, y), z["fraction"])


def _interp_depth_vector(values_by_depth: list[Any], z: dict[str, Any], y: dict[str, Any], x: dict[str, Any]) -> tuple[float, float, float]:
    a = _bilinear_vector(values_by_depth[z["lower"]], x, y)
    b = _bilinear_vector(values_by_depth[z["upper"]], x, y)
    return tuple(_lerp(a[index], b[index], z["fraction"]) for index in range(3))


def _bilinear_vector(grid: list[Any], x: dict[str, Any], y: dict[str, Any]) -> tuple[float, float, float]:
    return tuple(_bilinear([[cell[index] for cell in row] for row in grid], x, y) for index in range(3))


def _bilinear(grid: list[Any], x: dict[str, Any], y: dict[str, Any]) -> float:
    if not isinstance(grid, list) or not grid:
        return 0.0
    a = float(grid[y["lower"]][x["lower"]])
    b = float(grid[y["lower"]][x["upper"]])
    c = float(grid[y["upper"]][x["lower"]])
    d = float(grid[y["upper"]][x["upper"]])
    return _lerp(_lerp(a, b, x["fraction"]), _lerp(c, d, x["fraction"]), y["fraction"])


def _sample_mask(mask: list[Any], x: dict[str, Any], y: dict[str, Any]) -> bool:
    numeric = [[1.0 if value else 0.0 for value in row] for row in mask]
    return _bilinear(numeric, x, y) >= 0.5


def _axis_position(axis: list[float], value: float, boundary: str = "clamp") -> dict[str, Any]:
    if len(axis) == 1:
        return {"lower": 0, "upper": 0, "fraction": 0.0}
    sample = float(value)
    minimum = float(axis[0])
    maximum = float(axis[-1])
    if boundary == "periodic" and maximum > minimum:
        span = maximum - minimum
        sample = (((sample - minimum) % span) + span) % span + minimum
    else:
        sample = min(max(sample, minimum), maximum)
    for index in range(len(axis) - 1):
        lower = float(axis[index])
        upper = float(axis[index + 1])
        if lower <= sample <= upper:
            span = upper - lower
            return {"lower": index, "upper": index + 1, "fraction": 0.0 if span == 0 else (sample - lower) / span}
    return {"lower": len(axis) - 1, "upper": len(axis) - 1, "fraction": 0.0}


def _matches_grid_shape(grid: Any, height: int, width: int) -> bool:
    return isinstance(grid, list) and len(grid) == height and all(isinstance(row, list) and len(row) == width for row in grid)


def _all_finite_nested(value: Any) -> bool:
    if isinstance(value, list):
        return all(_all_finite_nested(item) for item in value)
    if isinstance(value, bool) or value is None:
        return True
    return _finite_number(value)


def _finite_number(value: Any) -> bool:
    try:
        return math.isfinite(float(value))
    except Exception:
        return False


def _monotonic(values: list[Any]) -> bool:
    return all(float(values[index]) <= float(values[index + 1]) for index in range(len(values) - 1))


def _contains_forbidden_marker(value: Any) -> bool:
    text = str(value)
    return any(marker in text for marker in FORBIDDEN_PUBLIC_MARKERS)


def _bundle_digest_without_self(bundle: dict[str, Any]) -> str:
    return stable_digest(_without_digest(_without_digest(bundle, "payloadDigest"), "benchmarkBundleDigest"))


def _without_digest(value: dict[str, Any], key: str) -> dict[str, Any]:
    clone = dict(value)
    clone.pop(key, None)
    return clone


def _lerp(a: float, b: float, fraction: float) -> float:
    return float(a) + (float(b) - float(a)) * float(fraction)


def _round(value: Any) -> float:
    return round(float(value), 12)
