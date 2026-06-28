#!/usr/bin/env python3
"""Preprocess staged bathymetry GeoTIFFs into compact ANCHOR browser fixtures."""

from __future__ import annotations

import argparse
import hashlib
import json
import math
import sys
import warnings
from pathlib import Path

from reference_bathymetry_provenance import (
    infer_arc_second_resolution,
    role_for_arc_seconds,
)


ROOT = Path(__file__).resolve().parents[2]
RAW_ROOT = ROOT / "external_data" / "reference_bathymetry"
ASSET_ROOT = ROOT / "assets" / "reference_bathymetry"
MANIFEST_PATH = ASSET_ROOT / "manifest.json"
PREPROCESSOR_VERSION = "anchor-reference-bathy-preprocessor-v1"
ETOPO_CITATION = (
    "NOAA National Centers for Environmental Information. 2022: ETOPO 2022 "
    "Global Relief Model. NOAA National Centers for Environmental Information. "
    "https://doi.org/10.25921/fd45-gt74"
)


def main() -> int:
    parser = argparse.ArgumentParser(description="Build ANCHOR reference bathymetry JSON fixtures from staged GeoTIFF files.")
    parser.add_argument("--input", type=Path, action="append", default=[], help="GeoTIFF patch to preprocess. Defaults to external_data/reference_bathymetry/patches/*.tif.")
    parser.add_argument("--max-width", type=int, default=513, help="Maximum fixture columns after decimation.")
    parser.add_argument("--max-height", type=int, default=513, help="Maximum fixture rows after decimation.")
    args = parser.parse_args()

    inputs = [path for path in args.input if path.exists()]
    if not inputs:
        patch_dir = RAW_ROOT / "patches"
        inputs = sorted(patch_dir.glob("*.tif")) if patch_dir.exists() else []

    ASSET_ROOT.mkdir(parents=True, exist_ok=True)
    if not inputs:
        manifest = blocked_manifest()
        write_json(MANIFEST_PATH, with_digest(manifest, "manifestDigest"))
        print(json.dumps({
            "status": "NO_REFERENCE_DATA_FIXTURE",
            "manifestPath": rel(MANIFEST_PATH),
            "message": "No staged GeoTIFF patches found. Reference bathymetry remains blocked.",
        }, indent=2))
        return 0

    rasterio = require_module("rasterio", "pip install rasterio")
    numpy = require_module("numpy", "pip install numpy")
    if rasterio is None or numpy is None:
        return 1

    fixtures = []
    for source in inputs:
        artifact = build_fixture_artifact(rasterio, numpy, source, args.max_width, args.max_height)
        artifact_path = ASSET_ROOT / f"{artifact['fixtureId']}.reference-bathymetry-raster.json"
        write_json(artifact_path, artifact)
        fixtures.append({
            "fixtureId": artifact["fixtureId"],
            "label": label_from_id(artifact["fixtureId"]),
            "role": artifact["role"],
            "sourceDataset": artifact["sourceDataset"]["name"],
            "provider": artifact["sourceDataset"]["provider"],
            "sourceResolution": artifact["sourceResolution"],
            "actualRasterResolutionArcSeconds": artifact["actualRasterResolutionArcSeconds"],
            "columns": artifact["grid"]["columns"],
            "rows": artifact["grid"]["rows"],
            "bounds": artifact["bounds"],
            "rasterPath": rel(artifact_path),
            "digest": artifact["rasterDigest"],
            "tags": infer_tags(artifact),
        })

    overview = fixtures[0] if fixtures else None
    manifest = {
        "artifactType": "anchor.reference-bathymetry-manifest",
        "artifactVersion": "1.0.0",
        "fixtureStatus": "AVAILABLE",
        "overview": {
            "fixtureId": overview["fixtureId"],
            "label": "Reference Bathymetry Overview",
            "role": "overview",
            "sourceDataset": overview["sourceDataset"],
            "provider": overview["provider"],
            "sourceResolution": overview["sourceResolution"],
            "actualRasterResolutionArcSeconds": overview["actualRasterResolutionArcSeconds"],
            "columns": overview["columns"],
            "rows": overview["rows"],
            "resolution": overview["sourceResolution"],
            "rasterPath": overview["rasterPath"],
            "digest": overview["digest"],
            "bounds": overview["bounds"],
        },
        "fixtures": fixtures,
        "instructions": available_instructions(fixtures),
        "provenance": {
            "generatedBy": PREPROCESSOR_VERSION,
            "source": "tools/python/preprocess_reference_bathymetry.py",
            "localAbsolutePathsIncluded": False,
            "hiddenTruthExposed": False,
        },
        "claimBoundary": {
            "referenceBathymetryAvailable": True,
            "placeholderPresentedAsReferenceData": False,
            "currentField4DGenerated": False,
            "scalarField4DGenerated": False,
            "certifiedForNavigation": False,
            "operationalOceanForecast": False,
            "hiddenTruthExposed": False,
        },
    }
    manifest = with_digest(manifest, "manifestDigest")
    write_json(MANIFEST_PATH, manifest)
    print(json.dumps({
        "status": "AVAILABLE",
        "manifestPath": rel(MANIFEST_PATH),
        "fixtureCount": len(fixtures),
        "manifestDigest": manifest["manifestDigest"],
    }, indent=2))
    return 0


def build_fixture_artifact(rasterio, numpy, source: Path, max_width: int, max_height: int) -> dict:
    with rasterio.open(source) as dataset:
        resolution = infer_arc_second_resolution(dataset.res[0], dataset.res[1])
        role = role_for_arc_seconds(resolution.arc_seconds)
        width_factor = max(1, math.ceil(dataset.width / max(1, max_width)))
        height_factor = max(1, math.ceil(dataset.height / max(1, max_height)))
        factor = max(width_factor, height_factor)
        rows = max(1, math.ceil(dataset.height / factor))
        columns = max(1, math.ceil(dataset.width / factor))
        with warnings.catch_warnings():
            warnings.filterwarnings(
                "ignore",
                message="Setting the shape on a NumPy array has been deprecated.*",
                category=DeprecationWarning,
            )
            elevation = dataset.read(
                1,
                out_shape=(rows, columns),
                resampling=rasterio.enums.Resampling.average,
            ).astype(float)
        nodata = dataset.nodata
        if nodata is not None:
            elevation = numpy.where(elevation == nodata, numpy.nan, elevation)
        elevation = numpy.where(numpy.isfinite(elevation), elevation, 0.0)
        bounds = {
            "westLon": round(float(dataset.bounds.left), 8),
            "eastLon": round(float(dataset.bounds.right), 8),
            "southLat": round(float(dataset.bounds.bottom), 8),
            "northLat": round(float(dataset.bounds.top), 8),
        }

    lon_axis = [round(bounds["westLon"] + (bounds["eastLon"] - bounds["westLon"]) * x / max(1, columns - 1), 8) for x in range(columns)]
    lat_axis = [round(bounds["northLat"] - (bounds["northLat"] - bounds["southLat"]) * y / max(1, rows - 1), 8) for y in range(rows)]
    elevation_list = [[round_float(value) for value in row] for row in elevation.tolist()]
    depth = [[round_float(max(0.0, -float(value))) for value in row] for row in elevation_list]
    wet = [[float(value) < 0.0 for value in row] for row in elevation_list]
    land = [[not cell for cell in row] for row in wet]
    summaries = summarize(elevation_list, depth, wet)
    fixture_id = fixture_id_from_source(source)
    artifact = {
        "artifactType": "anchor.reference-bathymetry-raster",
        "artifactVersion": "1.0.0",
        "fixtureId": fixture_id,
        "role": role,
        "sourceResolution": resolution.source_resolution,
        "actualRasterResolutionArcSeconds": resolution.arc_seconds,
        "degreeResolution": {
            "longitudeDegrees": resolution.longitude_degrees,
            "latitudeDegrees": resolution.latitude_degrees,
        },
        "sourceDataset": {
            "name": "ETOPO_2022",
            "provider": "NOAA NCEI",
            "version": "v1",
            "sourceResolution": resolution.source_resolution,
            "verticalUnits": "meters relative to sea level",
            "horizontalCoordinateFrame": "EPSG:4326 lon/lat",
            "citation": ETOPO_CITATION,
            "licenseOrTermsNote": "See source provider terms",
        },
        "bounds": bounds,
        "grid": {
            "columns": columns,
            "rows": rows,
            "lonAxis": lon_axis,
            "latAxis": lat_axis,
            "elevationMeters": elevation_list,
        },
        "derived": {
            "depthMetersPositiveDown": depth,
            "wetMask": wet,
            "landMask": land,
        },
        "summaries": summaries,
        "provenance": {
            "preprocessor": PREPROCESSOR_VERSION,
            "sourceFileName": source.name,
            "sourceFileDigest": digest_file(source),
            "sourceResolution": resolution.source_resolution,
            "actualRasterResolutionArcSeconds": resolution.arc_seconds,
            "degreeResolution": {
                "longitudeDegrees": resolution.longitude_degrees,
                "latitudeDegrees": resolution.latitude_degrees,
            },
            "role": role,
            "claimBoundary": "reference bathymetry patch; not certified navigation data",
            "localAbsolutePathsIncluded": False,
            "hiddenTruthExposed": False,
        },
    }
    return with_digest(artifact, "rasterDigest")


def blocked_manifest() -> dict:
    return {
        "artifactType": "anchor.reference-bathymetry-manifest",
        "artifactVersion": "1.0.0",
        "fixtureStatus": "NO_REFERENCE_DATA_FIXTURE",
        "overview": None,
        "fixtures": [],
        "instructions": {
            "summary": "No preprocessed public reference bathymetry fixture is available.",
            "downloadCommand": "npm.cmd run download:reference-bathy",
            "preprocessCommand": "npm.cmd run preprocess:reference-bathy",
            "auditCommand": "npm.cmd run audit:reference-bathy",
            "rawDataDirectory": "external_data/reference_bathymetry/",
            "artifactDirectory": "assets/reference_bathymetry/",
            "note": "The browser app does not download NOAA or GEBCO data at runtime.",
        },
        "provenance": {
            "generatedBy": PREPROCESSOR_VERSION,
            "source": "assets/reference_bathymetry/manifest.json",
            "localAbsolutePathsIncluded": False,
            "hiddenTruthExposed": False,
        },
        "claimBoundary": {
            "referenceBathymetryAvailable": False,
            "placeholderPresentedAsReferenceData": False,
            "currentField4DGenerated": False,
            "scalarField4DGenerated": False,
            "certifiedForNavigation": False,
            "operationalOceanForecast": False,
            "hiddenTruthExposed": False,
        },
    }


def available_instructions(fixtures: list[dict]) -> dict:
    has_mission_ready = any(fixture.get("role") == "missionReadyPatch" for fixture in fixtures)
    if has_mission_ready:
        summary = "Preprocessed public reference bathymetry fixture is available, including a mission-ready 15 arc-second patch."
    else:
        summary = "Preprocessed public reference bathymetry fixture is available. High-resolution 15 arc-second mission-ready patch remains pending."
    return {
        "summary": summary,
        "downloadCommand": "npm.cmd run download:reference-bathy",
        "preprocessCommand": "npm.cmd run preprocess:reference-bathy",
        "auditCommand": "npm.cmd run audit:reference-bathy",
        "rawDataDirectory": "external_data/reference_bathymetry/",
        "artifactDirectory": "assets/reference_bathymetry/",
        "note": "The browser app does not download NOAA or GEBCO data at runtime.",
    }


def summarize(elevation, depth, wet) -> dict:
    elevation_values = [float(value) for row in elevation for value in row]
    depth_values = [float(value) for row in depth for value in row if float(value) > 0]
    wet_values = [cell for row in wet for cell in row]
    slopes = []
    for y, row in enumerate(depth):
        for x, value in enumerate(row):
            if not wet[y][x]:
                continue
            if x + 1 < len(row) and wet[y][x + 1]:
                slopes.append(abs(float(depth[y][x + 1]) - float(value)))
            if y + 1 < len(depth) and wet[y + 1][x]:
                slopes.append(abs(float(depth[y + 1][x]) - float(value)))
    shallow = [value for value in depth_values if value <= 200]
    basin = [value for value in depth_values if value >= 1500]
    return {
        "minElevationMeters": round_float(min(elevation_values) if elevation_values else 0),
        "maxElevationMeters": round_float(max(elevation_values) if elevation_values else 0),
        "minDepthMeters": round_float(min(depth_values) if depth_values else 0),
        "maxDepthMeters": round_float(max(depth_values) if depth_values else 0),
        "meanDepthMeters": round_float(sum(depth_values) / len(depth_values) if depth_values else 0),
        "landFraction": round_float(1 - (sum(1 for value in wet_values if value) / len(wet_values) if wet_values else 0)),
        "oceanFraction": round_float(sum(1 for value in wet_values if value) / len(wet_values) if wet_values else 0),
        "wetConnectedFraction": round_float(1 if any(wet_values) else 0),
        "slopeStats": {
            "min": round_float(min(slopes) if slopes else 0),
            "mean": round_float(sum(slopes) / len(slopes) if slopes else 0),
            "max": round_float(max(slopes) if slopes else 0),
            "finite": True,
        },
        "shelfFraction": round_float(len(shallow) / len(depth_values) if depth_values else 0),
        "basinFraction": round_float(len(basin) / len(depth_values) if depth_values else 0),
    }


def infer_tags(artifact: dict) -> list[str]:
    summaries = artifact.get("summaries", {})
    tags = ["reference-bathymetry"]
    if summaries.get("shelfFraction", 0) > 0.1:
        tags.append("shelf")
    if summaries.get("slopeStats", {}).get("max", 0) > 100:
        tags.append("slope")
    if summaries.get("basinFraction", 0) > 0.1:
        tags.append("basin")
    if summaries.get("landFraction", 0) > 0.02 and summaries.get("oceanFraction", 0) > 0.1:
        tags.append("coastal")
    return tags


def with_digest(value: dict, digest_key: str) -> dict:
    payload = dict(value)
    payload.pop(digest_key, None)
    payload[digest_key] = digest_json(payload)
    return payload


def digest_json(value: dict) -> str:
    text = json.dumps(value, sort_keys=True, separators=(",", ":"), ensure_ascii=True)
    return "sha256:" + hashlib.sha256(text.encode("utf-8")).hexdigest()


def digest_file(path: Path) -> str:
    sha = hashlib.sha256()
    with path.open("rb") as handle:
        for chunk in iter(lambda: handle.read(1024 * 1024), b""):
            sha.update(chunk)
    return "sha256:" + sha.hexdigest()


def write_json(path: Path, value: dict) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(json.dumps(value, indent=2, sort_keys=False) + "\n", encoding="utf-8", newline="\n")


def require_module(name: str, install_hint: str):
    try:
        return __import__(name)
    except ImportError:
        print(f"Missing Python dependency `{name}` for offline bathymetry preprocessing.", file=sys.stderr)
        print(f"Install hint: {install_hint}", file=sys.stderr)
        print("Browser runtime does not require this dependency.", file=sys.stderr)
        return None


def fixture_id_from_source(path: Path) -> str:
    text = path.stem
    for suffix in (".etopo2022_15s_bed.patch", ".etopo2022_30s_bed.patch", ".etopo2022_60s_bed.patch"):
        text = text.replace(suffix, "")
    safe = "".join(ch.lower() if ch.isalnum() else "_" for ch in text).strip("_")
    return safe or "reference_bathymetry_patch"


def label_from_id(value: str) -> str:
    return " ".join(part.capitalize() for part in value.replace("-", "_").split("_") if part)


def round_float(value: float) -> float:
    number = float(value)
    return round(number, 6) if math.isfinite(number) else 0.0


def rel(path: Path) -> str:
    try:
        return path.resolve().relative_to(ROOT).as_posix()
    except ValueError:
        return path.name


if __name__ == "__main__":
    raise SystemExit(main())
