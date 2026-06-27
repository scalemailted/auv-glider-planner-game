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

- `AVAILABLE`: manifest paths exist, raster artifacts parse, source metadata and bounds are present, elevation/depth/masks are finite, and no hidden-truth/current/scalar claims are present.
- `NO_REFERENCE_DATA_FIXTURE`: the blocked manifest is explicit, has no fake fixtures, and includes setup instructions.

## Current Checked-In State

The checked-in manifest currently reports `NO_REFERENCE_DATA_FIXTURE`. Environment Studio must show blocked instructions and must not present procedural placeholder bathymetry as reference data.

Synthetic benchmark variety should come later from provenance-preserving variants of real reference patches. Procedural synthetic worlds remain experimental.

## Boundaries

Reference bathymetry is a public source surface for `bottomDepthMeters = h(x, y)`.

It is not certified navigation data, a calibrated survey product, HYCOM, Copernicus, an operational ocean forecast, hidden truth, or a scoring/planner change.
