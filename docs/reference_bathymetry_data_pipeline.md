# Reference Bathymetry Data Pipeline

ANCHOR uses preprocessed public bathymetry/topography references as the default Environment Studio source.

The browser app does not download NOAA or GEBCO data at runtime. Raw source files live under gitignored `external_data/reference_bathymetry/`. Compact ANCHOR reference artifacts live under `assets/reference_bathymetry/`.

## Commands

```powershell
npm.cmd run download:reference-bathy
npm.cmd run preprocess:reference-bathy
npm.cmd run audit:reference-bathy
```

`download:reference-bathy` stages ETOPO 2022 source data under `external_data/reference_bathymetry/`.

`preprocess:reference-bathy` converts staged GeoTIFF patches into `anchor.reference-bathymetry-raster` JSON artifacts and updates `assets/reference_bathymetry/manifest.json`.

`audit:reference-bathy` verifies either:

- `AVAILABLE`: manifest paths exist, raster artifacts parse, source metadata, role, rows/columns, actual arc-second resolution, and bounds are present, elevation/depth/masks are finite, filenames do not contradict actual resolution, and no hidden-truth/current/scalar claims are present.
- `NO_REFERENCE_DATA_FIXTURE`: the blocked manifest is explicit, has no fake fixtures, and includes setup instructions.

## Current Checked-In State

The checked-in manifest currently reports `AVAILABLE` with one `lowResolutionReferencePatch`:

- fixture: `monterey_canyon`
- source dataset: ETOPO 2022
- provider: NOAA NCEI
- source resolution: 60 arc-second
- actual raster resolution: 60 arc-second
- shape: 90 columns x 72 rows
- bounds: west -123.0, east -121.5, south 36.0, north 37.2

This is intentionally not labeled as a 15 arc-second mission-ready patch. A true 15 arc-second Monterey Canyon patch should be approximately 360 x 288 cells for the same bounding box and remains pending until a suitable source tile or extract is staged.

Synthetic benchmark variety should come later from provenance-preserving variants of real reference patches. Procedural synthetic worlds remain experimental.

## Boundaries

Reference bathymetry is a public source surface for `bottomDepthMeters = h(x, y)`.

It is not certified navigation data, a calibrated survey product, HYCOM, Copernicus, an operational ocean forecast, hidden truth, or a scoring/planner change.
