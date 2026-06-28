"""Small provenance helpers for offline reference bathymetry tooling."""

from __future__ import annotations

from dataclasses import dataclass


@dataclass(frozen=True)
class RasterResolution:
    longitude_degrees: float
    latitude_degrees: float
    arc_seconds: float
    source_resolution: str


def infer_arc_second_resolution(x_degrees: float, y_degrees: float | None = None) -> RasterResolution:
    """Infer an honest nominal arc-second resolution from GeoTIFF degree spacing."""

    x_res = abs(float(x_degrees))
    y_res = abs(float(y_degrees if y_degrees is not None else x_degrees))
    mean_degrees = (x_res + y_res) / 2
    raw_arc_seconds = mean_degrees * 3600
    nominal = min((15, 30, 60), key=lambda candidate: abs(candidate - raw_arc_seconds))
    if abs(nominal - raw_arc_seconds) <= max(0.01, nominal * 0.02):
        arc_seconds = float(nominal)
    else:
        arc_seconds = round(raw_arc_seconds, 6)
    label = format_arc_seconds(arc_seconds)
    return RasterResolution(
        longitude_degrees=x_res,
        latitude_degrees=y_res,
        arc_seconds=arc_seconds,
        source_resolution=f"{label} arc-second",
    )


def format_arc_seconds(value: float) -> str:
    number = float(value)
    return str(int(round(number))) if abs(number - round(number)) < 0.000001 else f"{number:.6g}"


def role_for_arc_seconds(arc_seconds: float) -> str:
    return "missionReadyPatch" if float(arc_seconds) <= 15.1 else "lowResolutionReferencePatch"

