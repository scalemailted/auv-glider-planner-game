#!/usr/bin/env python3
"""Download and stage public reference bathymetry for ANCHOR.

This tool is intentionally offline/runtime-adjacent: the browser app never calls
it and never depends on Python, rasterio, or raw NOAA/GEBCO source files.
"""

from __future__ import annotations

import argparse
import hashlib
import json
import math
import shutil
import sys
import warnings
from pathlib import Path

from reference_bathymetry_provenance import (
    format_arc_seconds,
    infer_arc_second_resolution,
    role_for_arc_seconds,
)


ROOT = Path(__file__).resolve().parents[2]
RAW_ROOT = ROOT / "external_data" / "reference_bathymetry"
ETOPO_60S_TIF_URL = (
    "https://www.ngdc.noaa.gov/mgg/global/relief/ETOPO2022/data/60s/"
    "60s_bed_elev_gtif/ETOPO_2022_v1_60s_N90W180_bed.tif"
)
ETOPO_15S_GTIF_BASE_URL = (
    "https://www.ngdc.noaa.gov/mgg/global/relief/ETOPO2022/data/15s/"
    "15s_bed_elev_gtif"
)
ETOPO_CITATION = (
    "NOAA National Centers for Environmental Information. 2022: ETOPO 2022 "
    "Global Relief Model. NOAA National Centers for Environmental Information. "
    "https://doi.org/10.25921/fd45-gt74"
)


def main() -> int:
    parser = argparse.ArgumentParser(description="Download ANCHOR reference bathymetry source files.")
    subparsers = parser.add_subparsers(dest="command", required=True)

    overview = subparsers.add_parser("overview", help="Download ETOPO 2022 60 arc-second bedrock GeoTIFF and build a preview.")
    overview.add_argument("--resolution", default="60s", choices=["60s"], help="ETOPO resolution for overview.")
    overview.add_argument("--preview-width", type=int, default=4096, help="Downsampled overview width in pixels.")
    overview.add_argument("--force", action="store_true", help="Redownload/rewrite existing files.")

    patch = subparsers.add_parser("patch", help="Crop a regional reference patch from an already downloaded source file.")
    patch.add_argument("--name", required=True)
    patch.add_argument("--west", type=float, required=True)
    patch.add_argument("--east", type=float, required=True)
    patch.add_argument("--south", type=float, required=True)
    patch.add_argument("--north", type=float, required=True)
    patch.add_argument("--source-file", type=Path, default=None, help="Local GeoTIFF to crop. Defaults to staged ETOPO 60s overview source if present.")
    patch.add_argument("--resolution", default="auto", choices=["auto", "60s", "15s"], help="Requested source resolution. 15s attempts a NOAA tile download for the bbox.")
    patch.add_argument("--force", action="store_true")

    gebco = subparsers.add_parser("gebco-full", help="Guarded placeholder for full GEBCO global download.")
    gebco.add_argument("--i-know-this-is-huge", action="store_true")

    args = parser.parse_args()
    if args.command == "overview":
        return download_overview(args)
    if args.command == "patch":
        return crop_patch(args)
    if args.command == "gebco-full":
        return guarded_gebco(args)
    return 2


def download_overview(args: argparse.Namespace) -> int:
    requests = require_module("requests", "pip install requests")
    rasterio = require_module("rasterio", "pip install rasterio")
    numpy = require_module("numpy", "pip install numpy")
    if requests is None or rasterio is None or numpy is None:
        return 1

    raw_path = RAW_ROOT / "etopo2022" / "global" / "ETOPO_2022_v1_60s_N90W180_bed.tif"
    overview_dir = RAW_ROOT / "etopo2022" / "overview"
    overview_path = overview_dir / f"ETOPO_2022_60s_overview_{args.preview_width}px.tif"
    summary_path = overview_path.with_suffix(".summary.json")
    raw_path.parent.mkdir(parents=True, exist_ok=True)
    overview_dir.mkdir(parents=True, exist_ok=True)

    if args.force or not raw_path.exists():
        try:
            stream_download(requests, ETOPO_60S_TIF_URL, raw_path)
        except Exception as exc:  # noqa: BLE001 - CLI must print actionable fallback.
            print("ETOPO 2022 60s direct download failed.", file=sys.stderr)
            print(str(exc), file=sys.stderr)
            print_manual_noaa_fallback()
            return 1

    try:
        with rasterio.open(raw_path) as dataset:
            preview_width = max(256, int(args.preview_width))
            preview_height = max(128, round(dataset.height * preview_width / dataset.width))
            data = dataset.read(
                1,
                out_shape=(preview_height, preview_width),
                resampling=rasterio.enums.Resampling.average,
            )
            transform = dataset.transform * dataset.transform.scale(
                dataset.width / preview_width,
                dataset.height / preview_height,
            )
            profile = dataset.profile.copy()
            profile.update({
                "height": preview_height,
                "width": preview_width,
                "transform": transform,
                "compress": "deflate",
                "tiled": True,
            })
            with rasterio.open(overview_path, "w", **profile) as dst:
                dst.write(data, 1)
            summary = source_summary(raw_path, overview_path, dataset.bounds, preview_width, preview_height)
            summary_path.write_text(json.dumps(summary, indent=2) + "\n", encoding="utf-8", newline="\n")
    except Exception as exc:  # noqa: BLE001
        print(f"Failed to build overview GeoTIFF: {exc}", file=sys.stderr)
        return 1

    print(json.dumps({
        "status": "ok",
        "rawPath": rel(raw_path),
        "overviewPath": rel(overview_path),
        "summaryPath": rel(summary_path),
    }, indent=2))
    return 0


def crop_patch(args: argparse.Namespace) -> int:
    rasterio = require_module("rasterio", "pip install rasterio")
    if rasterio is None:
        return 1
    from rasterio.windows import from_bounds

    source = args.source_file
    if source is None and args.resolution == "15s":
        source = ensure_etopo_15s_tile_for_bounds(args)
        if source is None:
            return 1
    if source is None:
        source = RAW_ROOT / "etopo2022" / "global" / "ETOPO_2022_v1_60s_N90W180_bed.tif"
    if not source.exists():
        print("BLOCKED_WAITING_FOR_MANUAL_ETopo_OR_GEBCO_PATCH_DOWNLOAD", file=sys.stderr)
        print("No local source GeoTIFF is available for cropping.", file=sys.stderr)
        print("Run `npm.cmd run download:reference-bathy` first, or place a NOAA Grid Extract / GEBCO GeoTIFF at:", file=sys.stderr)
        print(f"  {RAW_ROOT / 'patch_sources'}", file=sys.stderr)
        print_manual_noaa_fallback()
        return 1

    if args.east <= args.west or args.north <= args.south:
        print("Patch bounds must satisfy east > west and north > south.", file=sys.stderr)
        return 2

    try:
        with rasterio.open(source) as dataset:
            resolution = infer_arc_second_resolution(dataset.res[0], dataset.res[1])
            arc_label = format_arc_seconds(resolution.arc_seconds)
            patch_dir = RAW_ROOT / "patches"
            patch_dir.mkdir(parents=True, exist_ok=True)
            patch_path = patch_dir / f"{safe_id(args.name)}.etopo2022_{arc_label}s_bed.patch.tif"
            summary_path = patch_path.with_suffix(".summary.json")
            if patch_path.exists() and not args.force:
                print(json.dumps({"status": "exists", "patchPath": rel(patch_path), "summaryPath": rel(summary_path)}, indent=2))
                return 0
            window = from_bounds(args.west, args.south, args.east, args.north, transform=dataset.transform)
            window = window.round_offsets().round_lengths()
            with warnings.catch_warnings():
                warnings.filterwarnings(
                    "ignore",
                    message="Setting the shape on a NumPy array has been deprecated.*",
                    category=DeprecationWarning,
                )
                data = dataset.read(1, window=window)
            transform = dataset.window_transform(window)
            profile = dataset.profile.copy()
            profile.update({
                "height": data.shape[0],
                "width": data.shape[1],
                "transform": transform,
                "compress": "deflate",
                "tiled": True,
            })
            with rasterio.open(patch_path, "w", **profile) as dst:
                dst.write(data, 1)
            summary = source_summary(source, patch_path, {
                "left": args.west,
                "right": args.east,
                "bottom": args.south,
                "top": args.north,
            }, data.shape[1], data.shape[0], resolution=resolution, role=role_for_arc_seconds(resolution.arc_seconds))
            summary["sourceResolutionNote"] = (
                "Cropped from local GeoTIFF source. This summary records actual source resolution; "
                "do not infer resolution from requested CLI flags."
            )
            summary_path.write_text(json.dumps(summary, indent=2) + "\n", encoding="utf-8", newline="\n")
    except Exception as exc:  # noqa: BLE001
        print(f"Patch crop failed: {exc}", file=sys.stderr)
        return 1

    print(json.dumps({"status": "ok", "patchPath": rel(patch_path), "summaryPath": rel(summary_path)}, indent=2))
    return 0


def guarded_gebco(args: argparse.Namespace) -> int:
    if not args.i_know_this_is_huge:
        print("GEBCO global download is intentionally guarded because full archives are several GB.", file=sys.stderr)
        print("Re-run with --i-know-this-is-huge only when you explicitly intend to stage that source outside git.", file=sys.stderr)
        return 2
    print("GEBCO full download is not automated in BATHY-DATA-R1. Use provider instructions and stage files under external_data/reference_bathymetry/.", file=sys.stderr)
    return 1


def ensure_etopo_15s_tile_for_bounds(args: argparse.Namespace) -> Path | None:
    requests = require_module("requests", "pip install requests")
    if requests is None:
        return None
    tile_name = etopo_15s_tile_name(args.west, args.east, args.south, args.north)
    tile_url = f"{ETOPO_15S_GTIF_BASE_URL}/{tile_name}"
    tile_path = RAW_ROOT / "etopo2022" / "tiles15s" / tile_name
    tile_path.parent.mkdir(parents=True, exist_ok=True)
    if tile_path.exists() and not args.force:
        return tile_path
    try:
        stream_download(requests, tile_url, tile_path)
        return tile_path
    except Exception as exc:  # noqa: BLE001 - print exact attempted source.
        part = tile_path.with_suffix(tile_path.suffix + ".part")
        if part.exists():
            part.unlink()
        print("BLOCKED_WAITING_FOR_TRUE_15S_REFERENCE_PATCH", file=sys.stderr)
        print(f"Attempted NOAA 15s tile URL: {tile_url}", file=sys.stderr)
        print(f"Requested bbox: west={args.west} east={args.east} south={args.south} north={args.north}", file=sys.stderr)
        print(f"Download detail: {exc}", file=sys.stderr)
        print("Keep any existing lower-resolution fixture honestly labeled until a true 15 arc-second source is staged.", file=sys.stderr)
        return None


def etopo_15s_tile_name(west: float, east: float, south: float, north: float) -> str:
    # ETOPO 15s GeoTIFF tiles are named by the northwest 15-degree tile corner.
    del east, south
    lon_west = int(math.floor(float(west) / 15) * 15)
    lat_north = int(math.ceil(float(north) / 15) * 15)
    ns = f"N{abs(lat_north):02d}" if lat_north >= 0 else f"S{abs(lat_north):02d}"
    ew = f"E{abs(lon_west):03d}" if lon_west >= 0 else f"W{abs(lon_west):03d}"
    return f"ETOPO_2022_v1_15s_{ns}{ew}_bed.tif"


def stream_download(requests, url: str, target: Path) -> None:
    part = target.with_suffix(target.suffix + ".part")
    with requests.get(url, stream=True, timeout=60) as response:
        response.raise_for_status()
        with part.open("wb") as handle:
            for chunk in response.iter_content(chunk_size=1024 * 1024):
                if chunk:
                    handle.write(chunk)
    shutil.move(str(part), str(target))


def source_summary(source: Path, output: Path, bounds, columns: int, rows: int, resolution=None, role: str = "overview") -> dict:
    actual_resolution = resolution or infer_arc_second_resolution(1 / 60, 1 / 60)
    return {
        "sourceDataset": {
            "name": "ETOPO_2022",
            "provider": "NOAA NCEI",
            "version": "v1",
            "sourceResolution": actual_resolution.source_resolution,
            "verticalUnits": "meters relative to sea level",
            "horizontalCoordinateFrame": "EPSG:4326 lon/lat",
            "citation": ETOPO_CITATION,
            "licenseOrTermsNote": "See source provider terms",
        },
        "role": role,
        "sourceResolution": actual_resolution.source_resolution,
        "actualRasterResolutionArcSeconds": actual_resolution.arc_seconds,
        "degreeResolution": {
            "longitudeDegrees": actual_resolution.longitude_degrees,
            "latitudeDegrees": actual_resolution.latitude_degrees,
        },
        "sourceFileName": source.name,
        "sourceFileDigest": digest_file(source),
        "outputFileName": output.name,
        "outputFileDigest": digest_file(output),
        "bounds": bounds_to_dict(bounds),
        "grid": {"columns": columns, "rows": rows},
        "localAbsolutePathsIncluded": False,
    }


def bounds_to_dict(bounds) -> dict:
    if isinstance(bounds, dict):
        return {
            "westLon": float(bounds["left"] if "left" in bounds else bounds["westLon"]),
            "eastLon": float(bounds["right"] if "right" in bounds else bounds["eastLon"]),
            "southLat": float(bounds["bottom"] if "bottom" in bounds else bounds["southLat"]),
            "northLat": float(bounds["top"] if "top" in bounds else bounds["northLat"]),
        }
    return {
        "westLon": float(bounds.left),
        "eastLon": float(bounds.right),
        "southLat": float(bounds.bottom),
        "northLat": float(bounds.top),
    }


def digest_file(path: Path) -> str:
    sha = hashlib.sha256()
    with path.open("rb") as handle:
        for chunk in iter(lambda: handle.read(1024 * 1024), b""):
            sha.update(chunk)
    return "sha256:" + sha.hexdigest()


def require_module(name: str, install_hint: str):
    try:
        return __import__(name)
    except ImportError:
        print(f"Missing Python dependency `{name}` for offline bathymetry preprocessing.", file=sys.stderr)
        print(f"Install hint: {install_hint}", file=sys.stderr)
        print("Browser runtime does not require this dependency.", file=sys.stderr)
        return None


def print_manual_noaa_fallback() -> None:
    print("Manual fallback:", file=sys.stderr)
    print("1. Open NOAA NCEI ETOPO 2022 Grid Extract or GeoTIFF downloads.", file=sys.stderr)
    print("2. Download Bedrock elevation GeoTIFF for the needed overview/patch.", file=sys.stderr)
    print(f"3. Place source files under {RAW_ROOT}", file=sys.stderr)
    print("4. Run `npm.cmd run preprocess:reference-bathy`.", file=sys.stderr)


def safe_id(value: str) -> str:
    return "".join(ch.lower() if ch.isalnum() else "_" for ch in value).strip("_") or "reference_patch"


def rel(path: Path) -> str:
    try:
        return path.resolve().relative_to(ROOT).as_posix()
    except ValueError:
        return path.name


if __name__ == "__main__":
    raise SystemExit(main())
