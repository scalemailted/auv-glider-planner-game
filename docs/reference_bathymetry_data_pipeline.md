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

The checked-in manifest currently reports `AVAILABLE` with two Monterey Canyon fixtures:

- fixture: `monterey_canyon_15s`
- role: `missionReadyPatch`
- source dataset: ETOPO 2022
- provider: NOAA NCEI
- source key: `etopo2022_15s_surface_non_ice_fallback`
- source variant: surface elevation, non-ice fallback
- source resolution: 15 arc-second
- actual raster resolution: 15 arc-second
- shape: 360 columns x 288 rows
- bounds: west -123.0, east -121.5, south 36.0, north 37.2

The preserved fallback fixture is:

- fixture: `monterey_canyon`
- role: `lowResolutionReferencePatch`
- source dataset: ETOPO 2022
- provider: NOAA NCEI
- source key: `etopo2022_60s_bed`
- source variant: bedrock elevation
- source resolution: 60 arc-second
- actual raster resolution: 60 arc-second
- shape: 90 columns x 72 rows
- bounds: west -123.0, east -121.5, south 36.0, north 37.2

Environment Studio prefers the 15 arc-second `missionReadyPatch` when present and keeps the 60 arc-second fixture available as a low-resolution fallback.

Synthetic benchmark variety should come later from provenance-preserving variants of real reference patches. Procedural synthetic worlds remain experimental.

## Field Regeneration

FIELD-REGEN-R1 adds the explicit browser/package path:

```text
public reference bathymetry patch -> bathymetry artifact -> synthetic bathymetry-conditioned fields -> environment artifact
```

The generated currents, scalars, hotspots, and hazard candidates are deterministic synthetic benchmark fields conditioned by the selected reference bathymetry, wet/land mask, coastline/open-boundary metadata, depth axis, and time axis. They are not operational forecast products, HYCOM, Marine Copernicus, calibrated ecological products, or hidden truth. Start/drop zones are candidates that still require mission validation, and benchmark bundle export / launch into Planning remain separate follow-ups.

## Boundaries

Reference bathymetry is a public source surface for `bottomDepthMeters = h(x, y)`.

It is not certified navigation data, a calibrated survey product, HYCOM, Copernicus, an operational ocean forecast, hidden truth, or a scoring/planner change.
