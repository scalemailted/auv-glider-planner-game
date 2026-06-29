#!/usr/bin/env python3
"""Build the static ANCHOR reference bathymetry tile library.

The pipeline consumes ignored raw source data when available, but the generated
browser artifacts never expose raw external_data paths or require NOAA/GEBCO
runtime fetches.
"""

from __future__ import annotations

import argparse
import copy
import hashlib
import json
import math
from pathlib import Path
from typing import Any

from reference_bathymetry.etopo_tile_resolver import resolve_etopo_2022_15s_tiles


ROOT = Path(__file__).resolve().parents[2]
REGION_CONFIG = ROOT / "tools" / "reference_bathymetry" / "curated_regions.json"
ASSET_ROOT = ROOT / "assets" / "reference_bathymetry"
TILE_ROOT = ASSET_ROOT / "tiles"
LEGACY_MANIFEST = ASSET_ROOT / "manifest.json"
TILE_LIBRARY_MANIFEST = ASSET_ROOT / "tile-library-manifest.json"
RAW_TILE_ROOT = ROOT / "external_data" / "reference_bathymetry" / "etopo2022" / "15s_tiles"

PREPROCESSOR_VERSION = "anchor-reference-tile-library-preprocessor-r1a"
TILE_LIBRARY_VERSION = "reference-tile-library-r1a"
RASTER_TYPE = "anchor.reference-bathymetry-raster"
MESH_TYPE = "anchor.reference-bathymetry-mesh-lod"
TILE_SET_TYPE = "anchor.reference-bathymetry-tile-set"
TILE_LIBRARY_TYPE = "anchor.reference-bathymetry-tile-library"


def main() -> int:
    parser = argparse.ArgumentParser(description="Create app-hosted reference bathymetry tile-library assets.")
    parser.add_argument("--region", action="append", default=[], help="Optional curated region ID to preprocess/register.")
    parser.add_argument("--coarse-columns", type=int, default=64)
    parser.add_argument("--coarse-rows", type=int, default=48)
    parser.add_argument("--medium-columns", type=int, default=128)
    parser.add_argument("--medium-rows", type=int, default=96)
    args = parser.parse_args()

    ASSET_ROOT.mkdir(parents=True, exist_ok=True)
    TILE_ROOT.mkdir(parents=True, exist_ok=True)

    curated = read_json(REGION_CONFIG)
    selected_region_ids = set(args.region)
    legacy_manifest = read_json(LEGACY_MANIFEST) if LEGACY_MANIFEST.exists() else {}
    legacy_fixtures = legacy_manifest.get("fixtures") if isinstance(legacy_manifest.get("fixtures"), list) else []

    tile_sets: list[dict] = []
    staged_ids: set[str] = set()
    for fixture in legacy_fixtures:
      if selected_region_ids and fixture.get("fixtureId") not in selected_region_ids:
          continue
      raster_path = fixture.get("rasterPath")
      if not raster_path:
          continue
      absolute_raster = ROOT / raster_path
      if not absolute_raster.exists():
          continue
      tile_sets.append(stage_existing_fixture(
          fixture,
          absolute_raster,
          coarse_shape=(args.coarse_columns, args.coarse_rows),
          medium_shape=(args.medium_columns, args.medium_rows),
      ))
      staged_ids.add(str(fixture.get("fixtureId")))

    for region in curated:
        region_id = str(region["regionId"])
        if region_id in staged_ids:
            continue
        if selected_region_ids and region_id not in selected_region_ids:
            continue
        generated = stage_region_from_raw_tiles(region, args)
        tile_sets.append(generated if generated else request_only_tile_set(region))

    tile_sets.sort(key=tile_set_sort_key)
    manifest = build_tile_library_manifest(legacy_manifest, tile_sets)
    write_json(TILE_LIBRARY_MANIFEST, manifest)
    print(json.dumps({
        "status": "ok",
        "tileLibraryManifest": rel(TILE_LIBRARY_MANIFEST),
        "digest": manifest["digest"],
        "tileSetCount": len(tile_sets),
        "stagedTileSetCount": sum(1 for tile_set in tile_sets if tile_set.get("staged") is True),
        "requestOnlyTileSetCount": sum(1 for tile_set in tile_sets if tile_set.get("coverageRole") == "requestOnly"),
    }, indent=2))
    return 0


def stage_existing_fixture(fixture: dict, source_path: Path, *, coarse_shape: tuple[int, int], medium_shape: tuple[int, int]) -> dict:
    artifact = read_json(source_path)
    fixture_id = str(fixture.get("fixtureId") or artifact.get("fixtureId"))
    tile_dir = TILE_ROOT / fixture_id
    tile_dir.mkdir(parents=True, exist_ok=True)

    raster = normalize_raster_artifact(artifact, fixture)
    raster_path = tile_dir / f"{fixture_id}.reference-bathymetry-raster.json"
    write_json(raster_path, raster)

    coarse = build_mesh_lod_artifact(raster, "coarse", coarse_shape)
    medium = build_mesh_lod_artifact(raster, "medium", medium_shape)
    coarse_path = tile_dir / f"{fixture_id}.mesh-lod-coarse.json"
    medium_path = tile_dir / f"{fixture_id}.mesh-lod-medium.json"
    write_json(coarse_path, coarse)
    write_json(medium_path, medium)

    metadata = build_tile_set_metadata({
        "tileSetId": fixture_id,
        "label": fixture.get("label") or label_from_id(fixture_id),
        "role": role_to_tile_set_role(fixture.get("role")),
        "sourceDataset": fixture.get("sourceDataset") or source_dataset_name(raster),
        "provider": fixture.get("provider") or raster.get("sourceDataset", {}).get("provider") or "NOAA NCEI",
        "sourceVariant": fixture.get("sourceVariant") or raster.get("sourceVariant") or raster.get("sourceDataset", {}).get("sourceVariant"),
        "sourceResolution": fixture.get("sourceResolution") or raster.get("sourceResolution"),
        "actualRasterResolutionArcSeconds": number_or_none(fixture.get("actualRasterResolutionArcSeconds") or raster.get("actualRasterResolutionArcSeconds")),
        "bounds": raster["bounds"],
        "rasterTiles": {
            "kind": "singleRasterJson",
            "path": rel(raster_path),
            "rows": raster["rows"],
            "columns": raster["columns"],
            "digest": raster["digest"],
        },
        "meshLods": [
            mesh_lod_reference(coarse, coarse_path),
            mesh_lod_reference(medium, medium_path),
        ],
        "coverageRole": "stagedMissionRegion" if fixture.get("role") == "missionReadyPatch" else "stagedFallback",
        "recommendedUse": "Mission-ready reference bathymetry tile set." if fixture.get("role") == "missionReadyPatch" else "Lower-resolution staged fallback for preview and continuity.",
        "budgetClass": "singlePatch",
        "digests": {
            "raster": raster["digest"],
            "meshCoarse": coarse["digest"],
            "meshMedium": medium["digest"],
        },
        "tags": sorted(set([*(fixture.get("tags") or []), "app-hosted-tile-library", "static-reference-bathymetry"])),
    })
    metadata_path = tile_dir / f"{fixture_id}.tile-set.json"
    metadata["metadataPath"] = rel(metadata_path)
    metadata = with_digest(metadata, "digest")
    metadata["digests"]["metadata"] = metadata["digest"]
    write_json(metadata_path, metadata)
    return metadata


def stage_region_from_raw_tiles(region: dict, args: argparse.Namespace) -> dict | None:
    required_tiles = resolve_etopo_2022_15s_tiles(region["bounds"], variant="surface")
    raw_paths = [RAW_TILE_ROOT / tile["fileName"] for tile in required_tiles]
    if not raw_paths or not all(path.exists() for path in raw_paths):
        return None
    try:
        import rasterio  # type: ignore
        from rasterio.merge import merge  # type: ignore
    except Exception:
        return None

    datasets = []
    try:
        datasets = [rasterio.open(path) for path in raw_paths]
        bounds = region["bounds"]
        mosaic, transform = merge(
            datasets,
            bounds=(bounds["westLon"], bounds["southLat"], bounds["eastLon"], bounds["northLat"]),
        )
        data = mosaic[0]
        raster = raster_artifact_from_array(region, data, transform, required_tiles, raw_paths)
    finally:
        for dataset in datasets:
            dataset.close()

    fixture = {
        "fixtureId": region["regionId"],
        "label": region.get("label") or label_from_id(region["regionId"]),
        "role": "missionReadyPatch",
        "sourceDataset": "ETOPO_2022",
        "provider": "NOAA NCEI",
        "sourceResolution": "15 arc-second",
        "sourceVariant": "surface elevation, non-ice fallback",
        "actualRasterResolutionArcSeconds": 15.0,
        "tags": ["reference-bathymetry", "mission-ready"],
    }
    tile_dir = TILE_ROOT / region["regionId"]
    tile_dir.mkdir(parents=True, exist_ok=True)
    raster_path = tile_dir / f"{region['regionId']}.reference-bathymetry-raster.json"
    write_json(raster_path, raster)
    coarse = build_mesh_lod_artifact(raster, "coarse", (args.coarse_columns, args.coarse_rows))
    medium = build_mesh_lod_artifact(raster, "medium", (args.medium_columns, args.medium_rows))
    coarse_path = tile_dir / f"{region['regionId']}.mesh-lod-coarse.json"
    medium_path = tile_dir / f"{region['regionId']}.mesh-lod-medium.json"
    write_json(coarse_path, coarse)
    write_json(medium_path, medium)
    metadata = build_tile_set_metadata({
        "tileSetId": region["regionId"],
        "label": region.get("label") or label_from_id(region["regionId"]),
        "role": "missionReadyTileSet",
        "sourceDataset": "ETOPO_2022",
        "provider": "NOAA NCEI",
        "sourceVariant": "15s_surface_elevation",
        "sourceResolution": "15 arc-second",
        "actualRasterResolutionArcSeconds": 15.0,
        "bounds": raster["bounds"],
        "rasterTiles": {
            "kind": "singleRasterJson",
            "path": rel(raster_path),
            "rows": raster["rows"],
            "columns": raster["columns"],
            "digest": raster["digest"],
        },
        "meshLods": [
            mesh_lod_reference(coarse, coarse_path),
            mesh_lod_reference(medium, medium_path),
        ],
        "coverageRole": "stagedMissionRegion",
        "recommendedUse": "Mission-ready reference bathymetry tile set generated from downloaded source tiles.",
        "budgetClass": "multiTileStaged" if len(required_tiles) > 1 else "singlePatch",
        "digests": {
            "raster": raster["digest"],
            "meshCoarse": coarse["digest"],
            "meshMedium": medium["digest"],
        },
        "tags": ["reference-bathymetry", "static-reference-bathymetry", "app-hosted-tile-library", "mission-ready"],
    })
    metadata_path = tile_dir / f"{region['regionId']}.tile-set.json"
    metadata["metadataPath"] = rel(metadata_path)
    metadata = with_digest(metadata, "digest")
    metadata["digests"]["metadata"] = metadata["digest"]
    write_json(metadata_path, metadata)
    return metadata


def request_only_tile_set(region: dict) -> dict:
    required_tiles = resolve_etopo_2022_15s_tiles(region["bounds"], variant="surface")
    tile_set = build_tile_set_metadata({
        "tileSetId": region["regionId"],
        "label": region.get("label") or label_from_id(region["regionId"]),
        "role": "previewOnlyTileSet",
        "sourceDataset": "ETOPO_2022",
        "provider": "NOAA NCEI",
        "sourceVariant": region.get("sourceVariant") or "15s_surface_elevation",
        "sourceResolution": "15 arc-second",
        "actualRasterResolutionArcSeconds": 15.0,
        "bounds": region["bounds"],
        "rasterTiles": None,
        "meshLods": [],
        "coverageRole": "requestOnly",
        "recommendedUse": "Offline tile request only; not staged for browser mission loading.",
        "budgetClass": "multiTileRequest" if len(required_tiles) > 1 else "singleTileRequest",
        "requiredSourceTiles": [
            {
                "tileId": tile["tileId"],
                "fileName": tile["fileName"],
                "bounds": tile["bounds"],
            }
            for tile in required_tiles
        ],
        "offlineCommands": {
            "dryRun": f"python tools/python/download_reference_bathymetry_tiles.py dry-run --region {region['regionId']}",
            "download": f"python tools/python/download_reference_bathymetry_tiles.py download --region {region['regionId']}",
            "preprocess": f"python tools/python/preprocess_reference_tile_library.py --region {region['regionId']}",
        },
        "digests": {},
        "tags": ["reference-bathymetry", "request-only", "requires-offline-download"],
        "staged": False,
        "artifactStatus": "REQUIRES_REGENERATION",
    })
    return with_digest(tile_set, "digest")


def normalize_raster_artifact(artifact: dict, fixture: dict) -> dict:
    raster = copy.deepcopy(artifact)
    fixture_id = str(fixture.get("fixtureId") or raster.get("fixtureId") or "reference-bathymetry-fixture")
    grid = raster.get("grid") or {}
    elevation = raster.get("elevationOrDepthGrid") or grid.get("elevationMeters") or raster.get("elevationMeters") or []
    rows = int(fixture.get("rows") or grid.get("rows") or len(elevation) or 0)
    columns = int(fixture.get("columns") or grid.get("columns") or (len(elevation[0]) if elevation else 0))
    raster.update({
        "artifactType": RASTER_TYPE,
        "artifactVersion": str(raster.get("artifactVersion") or "1.0.0"),
        "fixtureId": fixture_id,
        "sourceDataset": raster.get("sourceDataset") or {
            "name": fixture.get("sourceDataset") or "ETOPO_2022",
            "provider": fixture.get("provider") or "NOAA NCEI",
        },
        "provider": fixture.get("provider") or raster.get("sourceDataset", {}).get("provider") or "NOAA NCEI",
        "sourceVariant": fixture.get("sourceVariant") or raster.get("sourceVariant") or raster.get("sourceDataset", {}).get("sourceVariant"),
        "sourceResolution": fixture.get("sourceResolution") or raster.get("sourceResolution"),
        "actualRasterResolutionArcSeconds": number_or_none(fixture.get("actualRasterResolutionArcSeconds") or raster.get("actualRasterResolutionArcSeconds")),
        "bounds": fixture.get("bounds") or raster.get("bounds"),
        "rows": rows,
        "columns": columns,
        "elevationOrDepthGrid": elevation,
        "verticalUnits": raster.get("verticalUnits") or raster.get("sourceDataset", {}).get("verticalUnits") or "meters relative to sea level",
        "frame": raster.get("frame") or raster.get("sourceDataset", {}).get("horizontalCoordinateFrame") or "EPSG:4326 lon/lat",
        "provenance": {
            **(raster.get("provenance") or {}),
            "tileLibraryPreprocessor": PREPROCESSOR_VERSION,
            "sourceAppArtifact": fixture.get("rasterPath"),
            "localAbsolutePathsIncluded": False,
            "rawExternalDataPathsIncluded": False,
            "hiddenTruthExposed": False,
        },
        "claimBoundary": {
            **(raster.get("claimBoundary") or {}),
            "referenceBathymetryPatch": True,
            "rasterAuthoritativeForBathymetrySampling": True,
            "meshAuthoritativeForSimulation": False,
            "currentField4DGenerated": False,
            "scalarField4DGenerated": False,
            "certifiedForNavigation": False,
            "operationalOceanForecast": False,
            "hiddenTruthExposed": False,
        },
    })
    return with_shared_digest(raster, ["digest", "rasterDigest"])


def raster_artifact_from_array(region: dict, data: Any, transform: Any, source_tiles: list[dict], raw_paths: list[Path]) -> dict:
    rows = int(data.shape[0])
    columns = int(data.shape[1])
    bounds = region["bounds"]
    elevation = [[round_float(float(value)) for value in row] for row in data.tolist()]
    depth = [[round_float(max(0.0, -float(value))) for value in row] for row in elevation]
    wet = [[float(value) < 0.0 for value in row] for row in elevation]
    artifact = {
        "artifactType": RASTER_TYPE,
        "artifactVersion": "1.0.0",
        "fixtureId": region["regionId"],
        "role": "missionReadyPatch",
        "sourceDataset": {
            "name": "ETOPO_2022",
            "provider": "NOAA NCEI",
            "version": "v1",
            "sourceResolution": "15 arc-second",
            "sourceVariant": "15s_surface_elevation",
            "verticalUnits": "meters relative to sea level",
            "horizontalCoordinateFrame": "EPSG:4326 lon/lat",
        },
        "provider": "NOAA NCEI",
        "sourceVariant": "15s_surface_elevation",
        "sourceResolution": "15 arc-second",
        "actualRasterResolutionArcSeconds": 15.0,
        "bounds": bounds,
        "rows": rows,
        "columns": columns,
        "grid": {
            "rows": rows,
            "columns": columns,
            "lonAxis": [round_float(bounds["westLon"] + (bounds["eastLon"] - bounds["westLon"]) * x / max(1, columns - 1), 8) for x in range(columns)],
            "latAxis": [round_float(bounds["northLat"] - (bounds["northLat"] - bounds["southLat"]) * y / max(1, rows - 1), 8) for y in range(rows)],
            "elevationMeters": elevation,
        },
        "derived": {
            "depthMetersPositiveDown": depth,
            "wetMask": wet,
            "landMask": [[not cell for cell in row] for row in wet],
        },
        "elevationOrDepthGrid": elevation,
        "verticalUnits": "meters relative to sea level",
        "frame": "EPSG:4326 lon/lat",
        "summaries": summarize_raster(elevation),
        "provenance": {
            "preprocessor": PREPROCESSOR_VERSION,
            "sourceTileNames": [tile["fileName"] for tile in source_tiles],
            "sourceTileDigests": [digest_file(path) for path in raw_paths],
            "sourceTransform": [round_float(value, 12) for value in transform.to_gdal()],
            "localAbsolutePathsIncluded": False,
            "rawExternalDataPathsIncluded": False,
            "hiddenTruthExposed": False,
        },
        "claimBoundary": {
            "referenceBathymetryPatch": True,
            "rasterAuthoritativeForBathymetrySampling": True,
            "meshAuthoritativeForSimulation": False,
            "currentField4DGenerated": False,
            "scalarField4DGenerated": False,
            "certifiedForNavigation": False,
            "operationalOceanForecast": False,
            "hiddenTruthExposed": False,
        },
    }
    return with_shared_digest(artifact, ["digest", "rasterDigest"])


def build_mesh_lod_artifact(raster: dict, lod: str, target_shape: tuple[int, int]) -> dict:
    elevation = raster.get("elevationOrDepthGrid") or raster.get("grid", {}).get("elevationMeters") or []
    source_rows = len(elevation)
    source_columns = len(elevation[0]) if source_rows else 0
    if source_rows <= 0 or source_columns <= 0:
        raise ValueError(f"Raster {raster.get('fixtureId')} has no elevation grid.")
    mesh_columns = min(source_columns, max(2, int(target_shape[0])))
    mesh_rows = min(source_rows, max(2, int(target_shape[1])))
    lon_axis = raster.get("grid", {}).get("lonAxis") or axis_from_bounds(raster["bounds"], "lon", source_columns)
    lat_axis = raster.get("grid", {}).get("latAxis") or axis_from_bounds(raster["bounds"], "lat", source_rows)

    sampled_indices = []
    vertices = []
    sampled_elevations = []
    sampled_depths = []
    for row in range(mesh_rows):
        source_row = round(row * (source_rows - 1) / max(1, mesh_rows - 1))
        row_elevations = []
        for column in range(mesh_columns):
            source_column = round(column * (source_columns - 1) / max(1, mesh_columns - 1))
            elevation_value = float(elevation[source_row][source_column])
            depth_value = max(0.0, -elevation_value)
            vertices.append([
                round_float(float(lon_axis[source_column]), 8),
                round_float(float(lat_axis[source_row]), 8),
                round_float(elevation_value),
                round_float(depth_value),
            ])
            row_elevations.append(elevation_value)
            sampled_depths.append(depth_value)
            sampled_indices.append((source_row, source_column))
        sampled_elevations.append(row_elevations)

    triangles = []
    for row in range(mesh_rows - 1):
        for column in range(mesh_columns - 1):
            a = row * mesh_columns + column
            b = a + 1
            c = a + mesh_columns
            d = c + 1
            triangles.append([a, c, b])
            triangles.append([b, c, d])

    errors = approximation_errors(elevation, sampled_elevations)
    depth_summary = summary_stats(sampled_depths)
    wet_values = [depth > 0 for depth in sampled_depths]
    artifact = {
        "artifactType": MESH_TYPE,
        "artifactVersion": "1.0.0",
        "meshRole": "previewLOD",
        "lod": lod,
        "derivedFromRasterDigest": raster.get("digest") or raster.get("rasterDigest"),
        "sourceFixtureId": raster["fixtureId"],
        "sourceDataset": source_dataset_name(raster),
        "bounds": raster["bounds"],
        "sourceRows": source_rows,
        "sourceColumns": source_columns,
        "meshRows": mesh_rows,
        "meshColumns": mesh_columns,
        "vertexCount": len(vertices),
        "triangleCount": len(triangles),
        "vertices": vertices,
        "triangles": triangles,
        "verticalUnits": raster.get("verticalUnits") or "meters relative to sea level",
        "horizontalFrame": raster.get("frame") or "EPSG:4326 lon/lat",
        "verticalExaggerationDefault": 18,
        "depthSummary": depth_summary,
        "approximationSummary": {
            "sourceCellStrideX": round_float((source_columns - 1) / max(1, mesh_columns - 1)),
            "sourceCellStrideY": round_float((source_rows - 1) / max(1, mesh_rows - 1)),
            "meanAbsElevationErrorMeters": round_float(sum(errors) / max(1, len(errors))),
            "maxAbsElevationErrorMeters": round_float(max(errors) if errors else 0),
            "sampling": "nearest-source-cell deterministic decimation",
        },
        "conservativeMaskSummary": {
            "sourceWetFraction": round_float(wet_fraction_from_elevation(elevation)),
            "sampledWetFraction": round_float(sum(1 for value in wet_values if value) / max(1, len(wet_values))),
            "sampledLandOrDryVertexCount": sum(1 for value in wet_values if not value),
            "sampledShallowVertexCount": sum(1 for depth in sampled_depths if 0 < depth < 20),
        },
        "isAuthoritativeForSimulation": False,
        "claimBoundary": {
            "visualizationOnly": True,
            "rasterGridAuthoritative": True,
            "simulationInput": False,
            "certifiedForNavigation": False,
            "operationalOceanForecast": False,
            "hiddenTruthExposed": False,
        },
    }
    return with_digest(artifact, "digest")


def approximation_errors(source: list[list[float]], sampled: list[list[float]]) -> list[float]:
    source_rows = len(source)
    source_columns = len(source[0]) if source_rows else 0
    mesh_rows = len(sampled)
    mesh_columns = len(sampled[0]) if mesh_rows else 0
    errors = []
    for row in range(source_rows):
        mesh_row = round(row * (mesh_rows - 1) / max(1, source_rows - 1))
        for column in range(source_columns):
            mesh_column = round(column * (mesh_columns - 1) / max(1, source_columns - 1))
            errors.append(abs(float(source[row][column]) - float(sampled[mesh_row][mesh_column])))
    return errors


def build_tile_set_metadata(base: dict) -> dict:
    return {
        "artifactType": TILE_SET_TYPE,
        "artifactVersion": "1.0.0",
        "tileSetId": base["tileSetId"],
        "label": base["label"],
        "role": base["role"],
        "staged": base.get("staged", bool(base.get("rasterTiles"))),
        "sourceDataset": base["sourceDataset"],
        "provider": base["provider"],
        "sourceVariant": base.get("sourceVariant"),
        "sourceResolution": base.get("sourceResolution"),
        "actualRasterResolutionArcSeconds": base.get("actualRasterResolutionArcSeconds"),
        "bounds": base["bounds"],
        "rasterTiles": base.get("rasterTiles"),
        "meshLods": base.get("meshLods") or [],
        "coverageRole": base["coverageRole"],
        "recommendedUse": base["recommendedUse"],
        "budgetClass": base["budgetClass"],
        "requiredSourceTiles": base.get("requiredSourceTiles") or [],
        "offlineCommands": base.get("offlineCommands") or None,
        "digests": base.get("digests") or {},
        "tags": base.get("tags") or [],
        "artifactStatus": base.get("artifactStatus") or ("STAGED" if base.get("rasterTiles") else "REQUIRES_REGENERATION"),
        "localAbsolutePathsIncluded": False,
        "rawExternalDataPathsIncluded": False,
        "externalRuntimeFetchRequired": False,
        "hiddenTruthExposed": False,
        "claimBoundary": {
            "referenceBathymetryTileSet": True,
            "rasterGridAuthoritativeForBathymetrySampling": bool(base.get("rasterTiles")),
            "derivedMeshLodsVisualizationOnly": True,
            "browserDownloadsPublicSourceData": False,
            "currentField4DGenerated": False,
            "scalarField4DGenerated": False,
            "certifiedForNavigation": False,
            "operationalOceanForecast": False,
            "hiddenTruthExposed": False,
        },
    }


def build_tile_library_manifest(legacy_manifest: dict, tile_sets: list[dict]) -> dict:
    staged = [tile_set for tile_set in tile_sets if tile_set.get("staged") is True]
    request_only = [tile_set for tile_set in tile_sets if tile_set.get("coverageRole") == "requestOnly"]
    source_variants = sorted(set(str(tile_set.get("sourceVariant")) for tile_set in tile_sets if tile_set.get("sourceVariant")))
    manifest = {
        "artifactType": TILE_LIBRARY_TYPE,
        "artifactVersion": "1.0.0",
        "libraryVersion": TILE_LIBRARY_VERSION,
        "sourceDatasets": [
            {
                "name": "ETOPO_2022",
                "provider": "NOAA NCEI",
                "sourceVariants": source_variants,
                "offlineSourceOnly": True,
            }
        ],
        "claimBoundary": {
            "appHostedStaticAssets": True,
            "browserDownloadsNoaaOrGebcoData": False,
            "rasterGridAuthoritativeForBathymetrySampling": True,
            "derivedMeshLodsVisualizationOnly": True,
            "currentField4DGenerated": False,
            "scalarField4DGenerated": False,
            "certifiedForNavigation": False,
            "operationalOceanForecast": False,
            "hiddenTruthExposed": False,
        },
        "globalOverview": compact_overview(legacy_manifest.get("overview") or {}),
        "tileSets": tile_sets,
        "coverageSummary": {
            "tileSetCount": len(tile_sets),
            "stagedTileSetCount": len(staged),
            "missionReadyTileSetCount": sum(1 for tile_set in staged if tile_set.get("role") == "missionReadyTileSet"),
            "fallbackTileSetCount": sum(1 for tile_set in staged if tile_set.get("role") == "lowResolutionFallbackTileSet"),
            "requestOnlyTileSetCount": len(request_only),
            "stagedRegionIds": [tile_set["tileSetId"] for tile_set in staged],
            "requestOnlyRegionIds": [tile_set["tileSetId"] for tile_set in request_only],
        },
        "provenance": {
            "generatedBy": PREPROCESSOR_VERSION,
            "source": "tools/python/preprocess_reference_tile_library.py",
            "sourceManifestDigest": legacy_manifest.get("manifestDigest"),
            "localAbsolutePathsIncluded": False,
            "rawExternalDataPathsIncluded": False,
            "hiddenTruthExposed": False,
        },
        "hiddenTruthExposed": False,
        "localAbsolutePathsIncluded": False,
        "rawExternalDataPathsIncluded": False,
        "externalRuntimeFetchRequired": False,
    }
    return with_digest(manifest, "digest")


def compact_overview(overview: dict) -> dict | None:
    if not overview:
        return None
    keep = {
        "overviewId",
        "label",
        "role",
        "sourceDataset",
        "provider",
        "sourceResolution",
        "sourceVariant",
        "actualRasterResolutionArcSeconds",
        "bounds",
        "overviewPath",
        "previewPath",
        "previewKind",
        "previewRasterDigest",
        "digest",
    }
    return {key: overview.get(key) for key in keep if overview.get(key) is not None}


def mesh_lod_reference(mesh: dict, path: Path) -> dict:
    return {
        "lod": mesh["lod"],
        "path": rel(path),
        "digest": mesh["digest"],
        "meshRows": mesh["meshRows"],
        "meshColumns": mesh["meshColumns"],
        "vertexCount": mesh["vertexCount"],
        "triangleCount": mesh["triangleCount"],
        "isAuthoritativeForSimulation": False,
    }


def role_to_tile_set_role(role: str | None) -> str:
    if role == "missionReadyPatch":
        return "missionReadyTileSet"
    if role == "lowResolutionReferencePatch":
        return "lowResolutionFallbackTileSet"
    return "previewOnlyTileSet"


def tile_set_sort_key(tile_set: dict) -> tuple:
    role_order = {
        "missionReadyTileSet": 0,
        "lowResolutionFallbackTileSet": 1,
        "previewOnlyTileSet": 2,
    }
    coverage_order = 3 if tile_set.get("coverageRole") == "requestOnly" else 0
    return (
        coverage_order,
        role_order.get(tile_set.get("role"), 9),
        number_or_none(tile_set.get("actualRasterResolutionArcSeconds")) or 99999,
        str(tile_set.get("tileSetId")),
    )


def axis_from_bounds(bounds: dict, axis: str, count: int) -> list[float]:
    if axis == "lon":
        return [bounds["westLon"] + (bounds["eastLon"] - bounds["westLon"]) * index / max(1, count - 1) for index in range(count)]
    return [bounds["northLat"] - (bounds["northLat"] - bounds["southLat"]) * index / max(1, count - 1) for index in range(count)]


def summarize_raster(elevation: list[list[float]]) -> dict:
    values = [float(value) for row in elevation for value in row if math.isfinite(float(value))]
    depths = [max(0.0, -value) for value in values]
    return {
        "elevationMeters": summary_stats(values),
        "depthMetersPositiveDown": summary_stats(depths),
        "wetFraction": round_float(sum(1 for value in values if value < 0) / max(1, len(values))),
    }


def summary_stats(values: list[float]) -> dict:
    finite_values = [float(value) for value in values if math.isfinite(float(value))]
    if not finite_values:
        return {"min": 0, "max": 0, "mean": 0}
    return {
        "min": round_float(min(finite_values)),
        "max": round_float(max(finite_values)),
        "mean": round_float(sum(finite_values) / len(finite_values)),
    }


def wet_fraction_from_elevation(elevation: list[list[float]]) -> float:
    values = [float(value) for row in elevation for value in row if math.isfinite(float(value))]
    return sum(1 for value in values if value < 0) / max(1, len(values))


def source_dataset_name(raster: dict) -> str:
    source = raster.get("sourceDataset")
    if isinstance(source, dict):
        return str(source.get("name") or "ETOPO_2022")
    return str(source or "ETOPO_2022")


def read_json(path: Path) -> Any:
    return json.loads(path.read_text(encoding="utf-8"))


def write_json(path: Path, value: Any) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(json.dumps(value, indent=2) + "\n", encoding="utf-8", newline="\n")


def canonical_bytes(value: Any) -> bytes:
    return json.dumps(value, sort_keys=True, separators=(",", ":"), ensure_ascii=True).encode("utf-8")


def digest_value(value: Any) -> str:
    return f"sha256:{hashlib.sha256(canonical_bytes(value)).hexdigest()}"


def digest_file(path: Path) -> str:
    digest = hashlib.sha256()
    with path.open("rb") as handle:
        for chunk in iter(lambda: handle.read(1024 * 1024), b""):
            digest.update(chunk)
    return f"sha256:{digest.hexdigest()}"


def with_digest(value: dict, digest_key: str) -> dict:
    payload = copy.deepcopy(value)
    payload.pop(digest_key, None)
    result = copy.deepcopy(value)
    result[digest_key] = digest_value(payload)
    return result


def with_shared_digest(value: dict, digest_keys: list[str]) -> dict:
    payload = copy.deepcopy(value)
    for key in digest_keys:
        payload.pop(key, None)
    digest = digest_value(payload)
    result = copy.deepcopy(value)
    for key in digest_keys:
        result[key] = digest
    return result


def rel(path: Path) -> str:
    return path.resolve().relative_to(ROOT).as_posix()


def label_from_id(value: str) -> str:
    return str(value).replace("_", " ").replace("-", " ").title()


def round_float(value: float, digits: int = 6) -> float:
    number = float(value)
    return round(number, digits) if math.isfinite(number) else 0.0


def number_or_none(value: Any) -> float | None:
    try:
        number = float(value)
    except (TypeError, ValueError):
        return None
    return number if math.isfinite(number) else None


if __name__ == "__main__":
    raise SystemExit(main())
