# Bathymetry Demo Mission Path Audit

THREE-R1.2A.4 inspected the standalone Bathymetric World View before reusing its visual ideas in the production Mission Workspace.

## Findings

The Bathymetric World View route is illustrative fixture geometry. `BathymetryWorldViewScene` builds local waypoints with explicit `depthLayerId` and `depthMeters` values, then passes them as `plannedWaypoints` into `BathymetryWorldRenderViewModel`. It does not call the canonical dive profile model, the glider dive state machine, or `PlannedDiveSegmentViewModel`.

The demo is useful because it demonstrates readable terrain context, water surface framing, oblique/side-profile camera composition, and path/sample marker conventions. It is not scientifically authoritative for production mission prediction.

| Concern | Bathymetry demo | Active mission renderer | Required convergence |
| ------- | --------------- | ----------------------- | -------------------- |
| Route source | Local fixture waypoints in `BathymetryWorldViewScene` | Canonical plan, mission state, and render view models | Production must use canonical plan/view-model state, not demo fixtures |
| Waypoint meaning | Explicit route points can include depth | Surface waypoints remain horizontal/surfacing anchors | Keep surface anchors; place depth on segment profile prediction |
| Depth values | Supplied directly as `depthMeters` | Derived from dive profile, target layer, feasibility, and bottom clearance | Use `PlannedDiveSegmentViewModel` for predicted depth |
| Dive profile | Not used | Dive profile metadata preserved on waypoint/agent plan | Segment prediction consumes profile metadata |
| Prediction vs realization | Illustrative line | Predicted path plus actual realized path | Keep predicted and actual visually distinct |
| Currents | Flow overlay is diagnostic and marked not ocean current | Public current vectors can produce expected current-corrected path | Do not create a Three-only current model |
| Bathymetry | Uses synthetic bathymetry field for terrain context | Uses canonical bottom-boundary view model | Align preview path to canonical bottom boundary |
| Coordinate transform | Uses the bathymetry renderer transform | Uses mission coordinate model and volumetric display mapping | Share coordinate sign/scale conventions where possible |
| Camera framing | Oblique/side view makes vertical motion readable | Mission camera presets now include segment and route dive views | Continue converging camera fit behavior |
| Reusable pieces | Terrain/water conventions, path materials, sample marker ideas, camera framing | Mission renderer consumes shared view models and Three layers | Share modules; do not import demo scene state |

## Classification

- Route is a hard-coded fixture: yes.
- Route comes from actual waypoint data: no, only local demo data.
- Route points are arbitrary depth-supplied demo points: yes.
- Depth values are supplied explicitly: yes.
- Dive profile is used: no.
- Line is predicted/realized: neither; it is illustrative.
- Currents are used for route prediction: no.
- Production depends on demo fixture: no.

The production mission renderer now reuses the visual lesson, not the fixture route.