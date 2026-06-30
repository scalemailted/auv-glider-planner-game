# Reference Bathymetry Data Pipeline

ANCHOR uses preprocessed public bathymetry/topography references as the default Environment Studio source.

The browser app does not download NOAA or GEBCO data at runtime. Raw source files live under gitignored `external_data/reference_bathymetry/`. Compact ANCHOR reference artifacts live under `assets/reference_bathymetry/`.

ANCHOR hosts curated app-ready reference bathymetry tiles as static assets. The browser does not download NOAA/GEBCO data at runtime. External public bathymetry data is downloaded and preprocessed offline, then registered as staged ANCHOR tile artifacts.

The raster/grid artifact remains authoritative for bathymetry sampling and environment generation. Derived low-poly meshes are visualization/inspection artifacts only.

Environment Studio is a staged workflow. The Global Atlas Staging Scene is used to select and inspect an operational boundary window. If the selected window matches an app-hosted mission-ready tile set, the user can continue to the Regional 3D Bathymetry Workspace. If the region is not staged, the user can open a coarse regional preview for inspection and export a patch request or multi-tile patch request. Coarse preview is not mission-ready and cannot generate fields, compose an environment, launch Planning, or produce official simulation/scoring artifacts.

The regional 3D mesh is a decimated visualization artifact. The reference raster/grid remains authoritative for bathymetry sampling, masks, environment generation, simulation, and benchmark export.

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

REF-TILE-LIB-R1A adds the static tile-library pipeline:

```powershell
python tools/python/download_reference_bathymetry_tiles.py dry-run --region monterey_canyon_15s
python tools/python/download_reference_bathymetry_tiles.py dry-run --region gulf_segment_15s
python tools/python/download_reference_bathymetry_tiles.py dry-run --region gulf_segment_demo_15s
python tools/python/download_reference_bathymetry_tiles.py download --region gulf_segment_15s
python tools/python/preprocess_reference_tile_library.py
python tools/python/preprocess_reference_tile_library.py --request-json path/to/exported.reference-bathymetry-multitile-patch-request.json
node tools/js/audit_reference_tile_library_static_assets.mjs
node tools/js/smoke_reference_tile_library_loader.mjs
node tools/js/smoke_reference_bathymetry_mesh_lod.mjs
node tools/js/smoke_reference_tile_library_atlas_coverage.mjs
node tools/js/smoke_multitile_operational_area_contract.mjs
node tools/js/audit_reference_tile_library_alpha_readiness.mjs
node tools/js/audit_multitile_operational_area_flow.mjs
npm.cmd run build:pages
node tools/js/audit_reference_tile_library_pages_delivery.mjs
npm.cmd run smoke:pages
```

`tools/reference_bathymetry/curated_regions.json` records curated operational regions. `download_reference_bathymetry_tiles.py` resolves ETOPO 2022 15 arc-second source tiles and downloads selected raw GeoTIFFs only into ignored `external_data/reference_bathymetry/`. `preprocess_reference_tile_library.py` creates staged browser artifacts under `assets/reference_bathymetry/tiles/<regionId>/` and registers them in `assets/reference_bathymetry/tile-library-manifest.json`. It can also consume an exported `anchor.reference-bathymetry-multitile-patch-request` through `--request-json`; if the required source tiles are not cached, it registers honest request-only metadata rather than downloading or fabricating data.

REF-TILE-LIB-R1A.1 adds readiness checks, not new data. `audit_reference_tile_library_alpha_readiness.mjs` opens Environment Studio in a browser, verifies hosted Monterey tile loading, exports a benchmark bundle, verifies Gulf requestOnly / multi-tile request behavior, and writes the owner-review package at `artifacts/owner-review/ref-tile-lib-r1a/`. `audit_reference_tile_library_pages_delivery.mjs` runs after `npm.cmd run build:pages` and verifies `_site` delivers the tile-library manifest, staged Monterey tile assets, mesh LODs, global overview artifacts, and loader files without raw `.tif`, `.tiff`, `.nc`, `.zip`, `external_data`, local absolute paths, hidden truth, or runtime NOAA/GEBCO URLs.

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

The global atlas allows arbitrary boundary selection, but live browser generation is budget-gated. The atlas operational window can be moved and resized directly. Drag inside the rectangle to move it, drag edges to resize one side, and drag corners to resize both connected sides. Large operational windows are valid selections, but live Alpha generation remains budget-gated; oversized regions export patch or multi-tile requests.

The static tile library currently registers two staged Monterey tile sets and two Gulf request-only entries. `monterey_canyon_15s` is the mission-ready tile set; `monterey_canyon` is a low-resolution fallback tile set. `gulf_segment_15s` and `gulf_segment_demo_15s` remain request-only until the owner runs the offline download and preprocessing commands. The demo region covers west -90.5, east -83.8, south 26.7, north 30.7 and resolves the four expected ETOPO source tiles crossing 30N: `N45W105`, `N45W090`, `N30W105`, and `N30W090`. The browser loader ignores request-only regions when choosing staged mission patches. The Pages build copies `assets/reference_bathymetry/` so hosted Alpha testers receive the same staged tile library as local static serving.

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

Environment Studio opens to the Global Atlas Staging Scene, supports deep zoom, direct rectangle editing, and typed operational-window editing, overlays available patch coverage, prefers the 15 arc-second `missionReadyPatch` when present, and keeps the 60 arc-second fixture available as a low-resolution fallback. Users continue from a staged mission-ready tile into the Regional 3D Bathymetry Workspace before confirming bathymetry and generating fields. If a selected region is not staged or is too large for live Alpha generation, the browser can open a coarse regional preview and exports an `anchor.reference-bathymetry-patch-request` or `anchor.reference-bathymetry-multitile-patch-request` with typed bounds, approximate size, local commands, and boundary-budget metadata instead of generating fake reference data. Coarse preview uses global overview or decimated atlas context only; it is not mission-resolution bathymetry and disables Generate Fields, Compose Environment, Launch Planning, and benchmark export.

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

The reference-derived Monterey Canyon path is ready for human alpha retest. Retest evidence lives in ignored local owner-review artifacts, including `artifacts/owner-review/ref-tile-lib-r1a/qa-summary.json` for the static tile-library workflow, while tester instructions and the feedback template are tracked in `docs/alpha_reference_environment_retest_protocol.md` and `alpha/reference-environment-retest-feedback-template.json`.

For MULTITILE-OPAREA-R1, large valid operational windows such as Gulf-scale selections are not rejected as tiny browser patches. The browser records the selected `OperationalWindow`, reports a separate `GenerationBudget` with `MULTI_TILE_REQUIRED`, enables `Open Coarse Regional Preview`, and exports `anchor.reference-bathymetry-multitile-patch-request` JSON containing typed bounds, approximate size, tile bounds, suggested fixture prefix, offline download/preprocess commands, claim-boundary flags, and a request digest. The artifact is still a request only: it does not include raw external paths, hidden truth, generated currents, generated scalar fields, or an operational forecast claim.

## Boundaries

Reference bathymetry is a public source surface for `bottomDepthMeters = h(x, y)`.

It is not certified navigation data, a calibrated survey product, HYCOM, Copernicus, an operational ocean forecast, hidden truth, or a scoring/planner change.
