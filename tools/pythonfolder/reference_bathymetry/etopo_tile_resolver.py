"""Resolve NOAA ETOPO 2022 15 arc-second GeoTIFF tiles for lon/lat bounds.

The browser never imports this module. It is used by offline scripts to plan
which public source tiles are needed before ANCHOR creates app-hosted assets.
"""

from __future__ import annotations

from dataclasses import dataclass
import math
from typing import Iterable


ETOPO_2022_15S_SURFACE_BASE_URL = (
    "https://www.ngdc.noaa.gov/mgg/global/relief/ETOPO2022/data/15s/"
    "15s_surface_elev_gtif/"
)
ETOPO_2022_15S_BED_BASE_URL = (
    "https://www.ngdc.noaa.gov/mgg/global/relief/ETOPO2022/data/15s/"
    "15s_bed_elev_gtif/"
)

SUPPORTED_VARIANTS = {
    "surface": {
        "suffix": "surface",
        "sourceVariant": "15s_surface_elevation",
        "baseUrl": ETOPO_2022_15S_SURFACE_BASE_URL,
    },
    "bed": {
        "suffix": "bed",
        "sourceVariant": "15s_bed_elevation",
        "baseUrl": ETOPO_2022_15S_BED_BASE_URL,
    },
}


class TileResolutionError(ValueError):
    """Raised when R1A cannot resolve a bbox to ETOPO source tiles."""


@dataclass(frozen=True)
class LonLatBounds:
    west_lon: float
    east_lon: float
    south_lat: float
    north_lat: float

    @classmethod
    def from_mapping(cls, value: dict) -> "LonLatBounds":
        return validate_bounds(
            west=value.get("westLon", value.get("west")),
            east=value.get("eastLon", value.get("east")),
            south=value.get("southLat", value.get("south")),
            north=value.get("northLat", value.get("north")),
        )

    def to_dict(self) -> dict:
        return {
            "westLon": self.west_lon,
            "eastLon": self.east_lon,
            "southLat": self.south_lat,
            "northLat": self.north_lat,
        }


def validate_bounds(*, west: float, east: float, south: float, north: float) -> LonLatBounds:
    try:
        west_lon = float(west)
        east_lon = float(east)
        south_lat = float(south)
        north_lat = float(north)
    except (TypeError, ValueError) as exc:
        raise TileResolutionError("Bounds must be finite numeric lon/lat values.") from exc

    values = [west_lon, east_lon, south_lat, north_lat]
    if not all(math.isfinite(value) for value in values):
        raise TileResolutionError("Bounds must be finite numeric lon/lat values.")
    if west_lon < -180 or east_lon > 180 or south_lat < -90 or north_lat > 90:
        raise TileResolutionError("Bounds must stay within EPSG:4326 lon/lat limits.")
    if east_lon <= west_lon:
        raise TileResolutionError("Antimeridian-crossing or reversed bounds are unsupported in R1A.")
    if north_lat <= south_lat:
        raise TileResolutionError("Bounds must satisfy north > south.")
    return LonLatBounds(
        west_lon=round(west_lon, 8),
        east_lon=round(east_lon, 8),
        south_lat=round(south_lat, 8),
        north_lat=round(north_lat, 8),
    )


def resolve_etopo_2022_15s_tiles(bounds: LonLatBounds | dict, variant: str = "surface") -> list[dict]:
    resolved_bounds = bounds if isinstance(bounds, LonLatBounds) else LonLatBounds.from_mapping(bounds)
    variant_info = _variant_info(variant)
    tiles: list[dict] = []
    for tile_north in _overlapping_latitude_tile_norths(resolved_bounds.south_lat, resolved_bounds.north_lat):
        tile_south = tile_north - 15
        for tile_west in _overlapping_longitude_tile_wests(resolved_bounds.west_lon, resolved_bounds.east_lon):
            tile_east = tile_west + 15
            tile_id = format_tile_id(tile_north, tile_west)
            file_name = etopo_2022_15s_file_name(tile_id, variant_info["suffix"])
            tiles.append({
                "tileId": tile_id,
                "tileNorthLat": tile_north,
                "tileSouthLat": tile_south,
                "tileWestLon": tile_west,
                "tileEastLon": tile_east,
                "bounds": {
                    "westLon": tile_west,
                    "eastLon": tile_east,
                    "southLat": tile_south,
                    "northLat": tile_north,
                },
                "fileName": file_name,
                "url": f"{variant_info['baseUrl']}{file_name}",
                "sourceDataset": "ETOPO_2022",
                "sourceVariant": variant_info["sourceVariant"],
                "sourceResolution": "15 arc-second",
            })
    return tiles


def etopo_2022_15s_file_name(tile_id: str, variant_suffix: str = "surface") -> str:
    suffix = "surface" if str(variant_suffix) == "surface" else "bed"
    return f"ETOPO_2022_v1_15s_{tile_id}_{suffix}.tif"


def format_tile_id(tile_north_lat: int, tile_west_lon: int) -> str:
    lat_prefix = "N" if tile_north_lat >= 0 else "S"
    lon_prefix = "E" if tile_west_lon >= 0 else "W"
    return f"{lat_prefix}{abs(int(tile_north_lat)):02d}{lon_prefix}{abs(int(tile_west_lon)):03d}"


def _variant_info(variant: str) -> dict:
    key = str(variant or "surface").replace("_elevation", "").replace("15s_", "")
    if key not in SUPPORTED_VARIANTS:
        supported = ", ".join(sorted(SUPPORTED_VARIANTS))
        raise TileResolutionError(f"Unsupported ETOPO 2022 15s variant {variant!r}. Supported: {supported}.")
    return SUPPORTED_VARIANTS[key]


def _overlapping_latitude_tile_norths(south: float, north: float) -> Iterable[int]:
    # ETOPO 15-degree names use the northern latitude edge, e.g. N45 covers 30..45.
    for tile_north in range(90, -91, -15):
        tile_south = tile_north - 15
        if north > tile_south and south < tile_north:
            yield tile_north


def _overlapping_longitude_tile_wests(west: float, east: float) -> Iterable[int]:
    for tile_west in range(-180, 180, 15):
        tile_east = tile_west + 15
        if east > tile_west and west < tile_east:
            yield tile_west

