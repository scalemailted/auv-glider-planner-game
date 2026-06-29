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

`preprocess:reference-bathy` converts staged GeoTIFF patches into `anchor.reference-bathymetry-raster` JSON artifacts, writes a compact global overview raster when available, and updates `assets/reference_bathymetry/manifest.json`.

`audit:reference-bathy` verifies either:

- `AVAILABLE`: manifest paths exist, raster artifacts parse, source metadata, role, rows/columns, actual arc-second resolution, and bounds are present, elevation/depth/masks are finite, filenames do not contradict actual resolution, and no hidden-truth/current/scalar claims are present.
- `NO_REFERENCE_DATA_FIXTURE`: the blocked manifest is explicit, has no fake fixtures, and includes setup instructions.

## Current Checked-In State

The checked-in manifest currently reports `AVAILABLE` with a compact global overview raster and two Monterey Canyon fixtures. The overview is:

- overview: `etopo2022_global_overview_60s`
- role: `globalOverview`
- source dataset: ETOPO 2022
- provider: NOAA NCEI
- source resolution: 60 arc-second
- bounds: west -180, east 180, south -90, north 90
- path: `assets/reference_bathymetry/etopo2022_global_overview_60s.reference-bathymetry-overview.json`
- preview path: `assets/reference_bathymetry/etopo2022_global_overview_60s.reference-bathymetry-raster.json`
- preview kind: `compactRasterJson`

The global overview is a selection layer, not mission-resolution bathymetry. Mission-ready generation uses staged regional patches such as the ETOPO 2022 15 arc-second Monterey Canyon fixture. It does not contain raw source paths or hidden truth.

The global atlas allows arbitrary boundary selection, but live browser generation is budget-gated. Oversized selections can be exported as patch requests, but they are not generated live in Alpha.

The two Monterey Canyon fixtures are:

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

Environment Studio opens to the Global Atlas Selector, overlays available patch coverage, prefers the 15 arc-second `missionReadyPatch` when present, and keeps the 60 arc-second fixture available as a low-resolution fallback. Users load a staged patch into the Regional Patch Workspace before generating regional bathymetry. If a selected region is not staged or is too large for live Alpha generation, the browser exports an `anchor.reference-bathymetry-patch-request` with local commands and boundary-budget metadata instead of generating fake reference data.

Synthetic benchmark variety should come later from provenance-preserving variants of real reference patches. Procedural synthetic worlds remain experimental.

## Field Regeneration

The current browser/package path is:

```text
public reference bathymetry patch
-> bathymetry artifact
-> deterministic synthetic bathymetry-conditioned fields
-> package-backed environment artifact
-> validated Planning launch
-> public benchmark bundle
```

The generated currents, scalars, hotspots, and hazard candidates are deterministic synthetic benchmark fields conditioned by the selected reference bathymetry, wet/land mask, coastline/open-boundary metadata, depth axis, and time axis. They are not operational forecast products, HYCOM, Marine Copernicus, calibrated ecological products, or hidden truth. Launch validation checks candidate starts/drop zones, public hazards, package-backed artifact digests, and public-safety boundaries before a generated shell opens in Planning. Launch messages are classified; non-blocking warnings can allow launch, but blocking warnings and failures prevent launch. The public benchmark bundle exports only planner-visible forecast/public fields.

The reference-derived Monterey Canyon path is ready for human alpha retest. Retest evidence lives in ignored local owner-review artifacts, while tester instructions and the feedback template are tracked in `docs/alpha_reference_environment_retest_protocol.md` and `alpha/reference-environment-retest-feedback-template.json`.

## Boundaries

Reference bathymetry is a public source surface for `bottomDepthMeters = h(x, y)`.

It is not certified navigation data, a calibrated survey product, HYCOM, Copernicus, an operational ocean forecast, hidden truth, or a scoring/planner change.
