#!/usr/bin/env python3
"""Download selected NOAA ETOPO 2022 15s tiles for offline ANCHOR preprocessing.

This script is intentionally not used by the browser. Runtime ANCHOR pages load
only app-hosted JSON assets under assets/reference_bathymetry/.
"""

from __future__ import annotations

import argparse
from concurrent.futures import ThreadPoolExecutor, as_completed
import hashlib
import json
import sys
import time
from pathlib import Path
from urllib.error import HTTPError, URLError
from urllib.request import Request, urlopen

from reference_bathymetry.etopo_tile_resolver import (
    TileResolutionError,
    resolve_etopo_2022_15s_tiles,
    validate_bounds,
)


ROOT = Path(__file__).resolve().parents[2]
REGION_CONFIG = ROOT / "tools" / "reference_bathymetry" / "curated_regions.json"
RAW_TILE_ROOT = ROOT / "external_data" / "reference_bathymetry" / "etopo2022" / "15s_tiles"
DOWNLOAD_MANIFEST_ROOT = ROOT / "external_data" / "reference_bathymetry" / "download_manifests"
USER_AGENT = "ANCHOR-ref-tile-lib-r1a/1.0 (offline preprocessing)"


def main() -> int:
    parser = argparse.ArgumentParser(description="Resolve and download selected ETOPO 2022 15s source tiles.")
    subparsers = parser.add_subparsers(dest="command", required=True)

    dry_run = subparsers.add_parser("dry-run", help="Print required source tiles without downloading.")
    dry_run.add_argument("--region", help="Curated region ID.")
    add_bbox_args(dry_run, require_all=False)

    download = subparsers.add_parser("download", help="Download raw source tiles for a curated region.")
    download.add_argument("--region", required=True)
    download.add_argument("--concurrency", type=int, default=2)
    download.add_argument("--retries", type=int, default=3)
    download.add_argument("--force", action="store_true")
    download.add_argument("--all-global-tiles", action="store_true", help="Explicit large-cache guard. Not used by default.")

    bbox = subparsers.add_parser("download-bbox", help="Download raw source tiles for explicit lon/lat bounds.")
    bbox.add_argument("--name", required=True)
    add_bbox_args(bbox, require_all=True)
    bbox.add_argument("--resolution", default="15s", choices=["15s"])
    bbox.add_argument("--concurrency", type=int, default=2)
    bbox.add_argument("--retries", type=int, default=3)
    bbox.add_argument("--force", action="store_true")

    args = parser.parse_args()
    try:
        if args.command == "dry-run":
            plan = plan_for_args(args)
            print(json.dumps(plan, indent=2))
            return 0
        if args.command == "download":
            if args.all_global_tiles:
                print("Large-cache warning: --all-global-tiles would plan hundreds of ETOPO 15s tiles.", file=sys.stderr)
                print("R1A does not download the global tile library by default. Remove this flag and use --region or download-bbox.", file=sys.stderr)
                return 2
            return download_plan(plan_for_args(args), args)
        if args.command == "download-bbox":
            return download_plan(plan_for_args(args), args)
    except TileResolutionError as exc:
        print(f"Tile resolution failed: {exc}", file=sys.stderr)
        return 2
    except Exception as exc:  # noqa: BLE001 - CLI must be actionable.
        print(f"Download planning failed: {exc}", file=sys.stderr)
        return 1
    return 2


def add_bbox_args(parser: argparse.ArgumentParser, *, require_all: bool) -> None:
    parser.add_argument("--west", type=float, required=require_all)
    parser.add_argument("--east", type=float, required=require_all)
    parser.add_argument("--south", type=float, required=require_all)
    parser.add_argument("--north", type=float, required=require_all)


def plan_for_args(args: argparse.Namespace) -> dict:
    if getattr(args, "region", None):
        region = curated_region(args.region)
        region_id = region["regionId"]
        label = region.get("label", region_id)
        bounds = region["bounds"]
    else:
        region_id = getattr(args, "name", None) or "custom_region"
        label = region_id.replace("_", " ").title()
        bounds = validate_bounds(
            west=args.west,
            east=args.east,
            south=args.south,
            north=args.north,
        ).to_dict()

    tiles = []
    for tile in resolve_etopo_2022_15s_tiles(bounds, variant="surface"):
        output_path = RAW_TILE_ROOT / tile["fileName"]
        tiles.append({
            **tile,
            "knownSizeBytes": None,
            "outputPath": rel(output_path),
            "cached": output_path.exists(),
        })

    resolution_degrees = 15 / 3600
    estimated_columns = max(1, round((bounds["eastLon"] - bounds["westLon"]) / resolution_degrees))
    estimated_rows = max(1, round((bounds["northLat"] - bounds["southLat"]) / resolution_degrees))
    return {
        "type": "anchor.reference-bathymetry-download-plan",
        "phase": "REF-TILE-LIB-R1A",
        "regionId": region_id,
        "label": label,
        "bounds": bounds,
        "sourceDataset": "ETOPO_2022",
        "sourceVariant": "15s_surface_elevation",
        "sourceResolution": "15 arc-second",
        "estimatedColumns": estimated_columns,
        "estimatedRows": estimated_rows,
        "estimatedSourceCells": estimated_columns * estimated_rows,
        "tileCount": len(tiles),
        "tiles": tiles,
        "downloadRoot": rel(RAW_TILE_ROOT),
        "downloadPerformed": False,
        "browserRuntimeFetchRequired": False,
        "hiddenTruthExposed": False,
    }


def download_plan(plan: dict, args: argparse.Namespace) -> int:
    RAW_TILE_ROOT.mkdir(parents=True, exist_ok=True)
    DOWNLOAD_MANIFEST_ROOT.mkdir(parents=True, exist_ok=True)
    concurrency = max(1, min(3, int(getattr(args, "concurrency", 2) or 2)))
    retries = max(1, int(getattr(args, "retries", 3) or 3))
    force = bool(getattr(args, "force", False))
    results = []
    with ThreadPoolExecutor(max_workers=concurrency) as executor:
        futures = [
            executor.submit(download_tile, tile, retries=retries, force=force)
            for tile in plan["tiles"]
        ]
        for future in as_completed(futures):
            results.append(future.result())
    results.sort(key=lambda item: item["fileName"])
    manifest = {
        **plan,
        "downloadPerformed": True,
        "downloadedAt": time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime()),
        "concurrency": concurrency,
        "retries": retries,
        "tiles": results,
        "allTilesReady": all(item["status"] in {"downloaded", "cached"} for item in results),
    }
    manifest_path = DOWNLOAD_MANIFEST_ROOT / f"{safe_id(plan['regionId'])}.download-manifest.json"
    manifest_path.write_text(json.dumps(manifest, indent=2) + "\n", encoding="utf-8", newline="\n")
    print(json.dumps({
        "status": "ok" if manifest["allTilesReady"] else "partial",
        "regionId": plan["regionId"],
        "tileCount": len(results),
        "downloadManifest": rel(manifest_path),
        "tiles": results,
    }, indent=2))
    return 0 if manifest["allTilesReady"] else 1


def download_tile(tile: dict, *, retries: int, force: bool) -> dict:
    output_path = RAW_TILE_ROOT / tile["fileName"]
    part_path = output_path.with_suffix(output_path.suffix + ".part")
    if output_path.exists() and not force:
        return {
            **tile,
            "status": "cached",
            "sizeBytes": output_path.stat().st_size,
            "sha256": digest_file(output_path),
        }

    last_error = None
    for attempt in range(1, retries + 1):
        try:
            resume_from = part_path.stat().st_size if part_path.exists() and not force else 0
            headers = {"User-Agent": USER_AGENT}
            if resume_from > 0:
                headers["Range"] = f"bytes={resume_from}-"
            request = Request(tile["url"], headers=headers)
            with urlopen(request, timeout=60) as response:  # noqa: S310 - trusted configured public data URL.
                status = getattr(response, "status", response.getcode())
                mode = "ab" if resume_from > 0 and status == 206 else "wb"
                if mode == "wb" and part_path.exists():
                    part_path.unlink()
                with part_path.open(mode + "") as handle:
                    while True:
                        chunk = response.read(1024 * 1024)
                        if not chunk:
                            break
                        handle.write(chunk)
            part_path.replace(output_path)
            return {
                **tile,
                "status": "downloaded",
                "sizeBytes": output_path.stat().st_size,
                "sha256": digest_file(output_path),
            }
        except (HTTPError, URLError, TimeoutError, OSError) as exc:
            last_error = exc
            if attempt < retries:
                time.sleep(min(8, attempt * 1.5))
    return {
        **tile,
        "status": "failed",
        "error": str(last_error),
    }


def curated_region(region_id: str) -> dict:
    regions = json.loads(REGION_CONFIG.read_text(encoding="utf-8"))
    for region in regions:
        if region.get("regionId") == region_id:
            return region
    known = ", ".join(region.get("regionId", "?") for region in regions)
    raise TileResolutionError(f"Unknown curated region {region_id!r}. Known regions: {known}.")


def digest_file(path: Path) -> str:
    digest = hashlib.sha256()
    with path.open("rb") as handle:
        for chunk in iter(lambda: handle.read(1024 * 1024), b""):
            digest.update(chunk)
    return f"sha256:{digest.hexdigest()}"


def rel(path: Path) -> str:
    return path.resolve().relative_to(ROOT).as_posix()


def safe_id(value: str) -> str:
    return "".join(char.lower() if char.isalnum() else "_" for char in str(value)).strip("_") or "region"


if __name__ == "__main__":
    raise SystemExit(main())
