# Terrain-Aware Mission Validation

THREE-R1.2C adds a portable terrain-aware mission validation contract for continuous surface waypoints, route segments, dive clearance, current-risk diagnostics, sampling targets, and mission readiness.

The contract lives in src/core/planning/TerrainAwareMissionValidation.js. It is deterministic, browser-safe, Node/headless-safe, renderer-neutral, public-safe, and dependency-free. It must not import Three.js, Phaser, DOM APIs, localStorage, or Node filesystem APIs.

## Authority Boundary

Terrain-aware validation is owned by portable JavaScript core. The Three terrain mesh is never validity authority. Three.js may show placement previews, route corridors, issue markers, camera focus, terrain inspection rendering, labels, legends, and clearance presentation, but it must not decide whether a mission is valid.

Surface waypoints remain executable navigation/surfacing anchors. Sampling targets remain non-executable scientific objectives. Predicted samples never create score. Terrain diagnostics do not redesign official scoring. Current-aware terrain risk is forecast-based, not hidden truth. No arbitrary XYZ planner is implemented. No operationally calibrated bathymetry or glider model is claimed.

## Report Shape

Reports use type anchor.validation.terrain-aware-mission and include validation version, mission/scenario identifiers, public plan digest, terrain source digest, status, executable flag, agent/segment/target reports, hard errors, warnings, advisories, fleet summary counts, and boundary flags.

## Severity Semantics

HARD_ERROR prevents Execute. Examples include outside-domain waypoints, land surface waypoints, invalid deployment, route centerline land intersection, blocked-region intersection, target below seabed, target inside land, bottom-clearance violation, invalid profile, no valid required start, and required empty route.

WARNING preserves Execute. Examples include shoreline corridor risk, coastline touch/crossing diagnostics, current beaching risk, high cross-current, low bottom clearance, bathymetry-limited profile, target partial seabed intersection, target partial coverage, mission-time overrun, and low energy margin.

ADVISORY is informational. Examples include idle optional routes, unattached sampling targets, shelf-break/deep-basin diagnostics, and non-blocking science-layer notes.

## Browser and Headless Parity

The same portable module can be called from browser Planning, Simulation launch snapshots, export builders, and Node/headless audit scripts. Matching inputs should produce matching issue codes, severity, executable status, and public digests.

## Validation Caching

Validation is rebuilt when canonical plan, mission, level, active forecast frame, terrain source, or profile inputs change. Camera movement, vertical exaggeration, and visual quality changes must not rebuild canonical validation.

## Launch Prediction and Runtime Diagnostics

Launch validation is frozen at Execute and remains distinct from actual execution diagnostics. Runtime terrain diagnostics use canonical simulation state to track actual clearance, depth, per-agent/per-segment summaries, target coverage, and public terrain events. Visual interpolation cannot create terrain events. Terrain events explain feasibility outcomes and do not change official scoring.

## THREE-R1.2C.2 Terrain Validation Closure

Planning terrain validation is cached and event-driven, runtime terrain diagnostics are incremental, replay/export artifacts are not rebuilt per presentation frame, and Three validation layers update from canonical digests. Terrain diagnostics explain feasibility and execution outcomes but do not change official scoring. Headed browser performance is authoritative; headless timing is diagnostic. Human manual QA by the project owner remains pending.
