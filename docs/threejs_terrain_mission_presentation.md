# Three.js Terrain Mission Presentation

Three.js presents terrain-aware validation but does not own it.

## Presentation Responsibilities

Three.js owns display of terrain mesh, landmass, coastline, contours, water-column context, live placement ghost state, visible rejection and warning hints, terrain validation issue markers, warning and invalid route sections, route-corridor diagnostics, clearance-related issue markers, selected-issue emphasis, camera focus hints, tactical/oblique/profile presentation aids, legends, scale cues, and vertical-exaggeration labels.

## Non-Authority Boundary

Three.js does not own route validity, collision, terrain validity, dive feasibility, sampling-target validity, simulation, scoring, replay, export truth, or hidden truth. The mesh is a visual projection of canonical bathymetry and must not be queried as the validity source.

## Visual Semantics

Invalid and warning states should be distinguishable without color alone. The terrain validation layer uses different marker shapes for hard errors, warnings, and advisories, route-line status, and public-safe issue metadata. Surface waypoints, sampling targets, predicted samples, actual observations, surface intent, predicted dives, and realized trajectories must remain visually distinct.

## Performance Boundary

Validation issue objects are reused by stable IDs and disposed when absent. Camera movement, vertical exaggeration, and quality changes are presentation-only and must not rebuild canonical validation or terrain data.

## Runtime Diagnostics Presentation

Three.js may display runtime terrain diagnostics, realized trajectories, actual observations, and terrain event markers emitted by canonical Simulation. It must not create canonical terrain events, recompute validation from visual interpolation, mutate official score, or use camera/quality state as validation input.

## THREE-R1.2C.2 Presentation Boundary

Three.js terrain-validation presentation reuses stable objects from canonical validation digests. Camera movement, vertical exaggeration, quality profile, labels, and layer opacity are presentation-only and must not rebuild canonical terrain validation, terrain diagnostics, replay, export, or scoring artifacts.
