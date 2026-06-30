# Environment Studio Product Handoff

ENV-STUDIO-HANDOFF-R0 records the product direction for Environment Studio so future implementation passes do not drift into one-off terrain demos or untracked data claims.

## Product Thesis

Environment Studio is the browser product surface for choosing an operational ocean region, inspecting staged bathymetry availability, previewing regional bathymetry, and eventually generating deterministic benchmark environments from explicit bathymetry authority. It is not a data downloader, operational forecast portal, route planner, simulator, or scoring engine.

The intended user flow is:

```text
Global Atlas Setup Scene
-> select or preselect an operational boundary
-> inspect status and availability
-> open 3D bathymetry preview for any valid boundary
-> use mission-ready workflow only when staged bathymetry exists
-> otherwise export a staging request
-> generate currents/scalars/fields later from the selected bathymetry mode
```

## User Story

A researcher or instructor should be able to choose a familiar ocean region, see an editable operational window on the atlas, understand whether app-hosted bathymetry is available, preview the regional terrain, and export a request or proceed through the staged mission-ready path without the browser downloading NOAA/GEBCO data or implying hidden data exists.

## Scene Model

The product model remains:

- Global Atlas Setup Scene: region selection, staged availability, boundary editing, LOD/status, and request export.
- Regional 3D Bathymetry Workspace: interactive bathymetry viewport and region inspector.
- Mission Workspace: glider routes, dive profiles, execution, replanning, scoring, and debrief.

Environment Studio must not silently switch mission authority. Display mode is what the user sees. Simulation bathymetry authority is what downstream environment/mission artifacts use.

## Panel Responsibilities

The left panel is dynamic and action-oriented. It shows only controls available for the current scene mode: curated region, bathymetry mode scaffold, atlas tools, window presets/editing, boundary actions, import/export, and advanced diagnostics.

The center panel is the primary visual workspace: global atlas map in the setup scene, and the interactive 3D bathymetry viewport in the regional scene.

The right panel owns detailed inspection: selected bounds, source, curated preset, bathymetry mode recommendation, staged availability, LOD/provenance, generation budget, claim boundary, and launch readiness.

## Bathymetry Modes

Environment Studio must support three product modes:

- Real Reference: reference-derived bathymetry using staged public/reference artifacts directly. Mission authority: `referenceRaster`. Current status: implemented through the existing reference path.
- Reference-Enhanced Synthetic: deterministic synthetic benchmark bathymetry conditioned by public reference bathymetry. Mission authority: `enhancedSyntheticRaster`. Current status: visible scaffold only.
- Fully Synthetic Sandbox: synthetic bathymetry only, with no real bathymetry source. Mission authority: `syntheticRaster`. Current status: visible scaffold only in the selector; older synthetic sandbox paths remain separate compatibility tools.

Future mission authoring should prefer Reference-Enhanced Synthetic, but this handoff phase does not implement enhancement.

Future regional display modes may include Reference Mesh, Enhanced Synthetic Mesh, Difference View, and Split Compare. These are display modes only. They must stay separate from simulation bathymetry authority.

## Curated Region Selector

The Global Atlas Setup Scene includes a Curated Region selector that defaults to None. Selecting a preset places an editable lon/lat operational window and focuses the atlas. It does not download source data and does not claim mission readiness unless matching app-hosted staged tiles exist.

Current presets:

- Monterey Canyon
- Hawaii / Island Slope
- Puerto Rico Trench / Island Shelf
- Florida Straits
- Gulf Shelf / Canyon Segment
- Northeast US Shelf Break
- California Shelf Break
- Alaska Fjord / Shelf Region

The seed bounds are UI/product testing windows, not certified scientific region definitions. Monterey may report mission-ready only when the current tile library exposes the staged Monterey tile set. Other presets remain request-only, not-staged, or multi-tile-required until app-hosted tile artifacts exist.

## Claim Boundaries

Reference bathymetry is public source bathymetry/topography transformed into compact ANCHOR runtime artifacts. The raster/grid artifact remains authoritative. The 3D mesh is visualization-only unless explicitly documented otherwise.

Reference-Enhanced Synthetic and Fully Synthetic Sandbox are benchmark-environment claims, not operational-ocean claims. Generated currents, scalars, hotspots, hazards, starts, and benchmark bundles remain deterministic synthetic artifacts unless a later phase explicitly documents a different source.

No browser workflow may expose hidden truth, raw `external_data` paths, local absolute paths, or runtime NOAA/GEBCO downloads.

## Mission Readiness Gating

Mission-ready generation and Planning launch require staged browser-safe bathymetry artifacts. Request-only and multi-tile-required regions can be previewed and exported as staging requests, but Generate Fields, Compose Environment, Launch Planning, and benchmark export remain disabled or hidden until staged bathymetry exists.

## Offline Staging Boundary

Public bathymetry source data is downloaded and preprocessed offline. Runtime assets live under `assets/reference_bathymetry/`. The browser loads only app-hosted ANCHOR artifacts: global overview, staged regional rasters, mesh LODs, tile-library metadata, and request metadata.

## Future Backlog

- Implement Reference-Enhanced Synthetic raster generation from reference bathymetry.
- Add regional display modes: Reference Mesh, Enhanced Synthetic Mesh, Difference View, Split Compare.
- Add explicit authority selector only when multiple implemented authorities exist.
- Stage owner-reviewed non-Monterey tile sets.
- Add enhanced synthetic provenance and comparison exports.
- Expand owner-review workflows for curated preset bounds.
- Keep Mission Workspace as the owner of routes, glider count, dive profiles, execution, replanning, and scoring.
