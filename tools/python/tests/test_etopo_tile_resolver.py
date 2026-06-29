import unittest

from tools.python.reference_bathymetry.etopo_tile_resolver import (
    TileResolutionError,
    resolve_etopo_2022_15s_tiles,
    validate_bounds,
)


class EtopoTileResolverTests(unittest.TestCase):
    def test_monterey_resolves_to_n45w135(self):
        tiles = resolve_etopo_2022_15s_tiles({
            "westLon": -123.0,
            "eastLon": -121.5,
            "southLat": 36.0,
            "northLat": 37.2,
        })
        self.assertEqual([tile["tileId"] for tile in tiles], ["N45W135"])
        self.assertEqual(tiles[0]["fileName"], "ETOPO_2022_v1_15s_N45W135_surface.tif")

    def test_gulf_segment_resolves_to_two_n30_tiles(self):
        tiles = resolve_etopo_2022_15s_tiles({
            "westLon": -94.0,
            "eastLon": -84.0,
            "southLat": 24.0,
            "northLat": 30.0,
        })
        self.assertEqual([tile["tileId"] for tile in tiles], ["N30W105", "N30W090"])

    def test_crossing_30n_adds_n45_row(self):
        tiles = resolve_etopo_2022_15s_tiles({
            "westLon": -94.0,
            "eastLon": -84.0,
            "southLat": 24.0,
            "northLat": 30.1,
        })
        self.assertEqual(
            [tile["tileId"] for tile in tiles],
            ["N45W105", "N45W090", "N30W105", "N30W090"],
        )

    def test_invalid_bounds_are_rejected(self):
        with self.assertRaises(TileResolutionError):
            validate_bounds(west=-90, east=-91, south=24, north=30)
        with self.assertRaises(TileResolutionError):
            validate_bounds(west=-94, east=-84, south=30, north=30)

    def test_antimeridian_crossing_is_unsupported(self):
        with self.assertRaises(TileResolutionError):
            validate_bounds(west=170, east=-170, south=-10, north=10)


if __name__ == "__main__":
    unittest.main()

