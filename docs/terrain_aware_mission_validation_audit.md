# Terrain-Aware Mission Validation Audit

This audit documents the THREE-R1.2C ownership review across planning, terrain, simulation, renderer, exports, and debrief. It is a stabilization record, not a claim of operational validation.

| Concern | Current owner | Current severity | Current UI | Required result |
| ------- | ------------- | ---------------- | ---------- | --------------- |
| Continuous surface waypoint validity | Portable core TerrainAwareMissionValidation plus existing waypoint/navigability helpers | Hard error for outside-domain, land, invalid deployment | Placement rejection reason and Mission Readiness | Core remains authority; invalid click does not mutate plan |
| Route centerline land intersection | Portable core route/continuous geometry | Hard error | Mission Readiness, route issue marker, Execute disabled | Detect narrow land crossings with sampled continuous path |
| Route corridor shoreline risk | Portable core diagnostic | Warning | Mission Readiness and Three corridor/issue overlay | Keep diagnostic, not planner authority |
| Coastline crossing/touch | Portable core segment diagnostics | Warning unless hard land intersection also exists | Mission Readiness and issue marker | Preserve warning-vs-hard distinction |
| Current-aware terrain risk | Portable core shoreline/current diagnostic | Warning | Mission Readiness and issue marker | Forecast-based only; no hidden truth |
| Bottom clearance over predicted dive | Portable planned-dive/bottom-boundary core | Hard error for penetration, warning for low clearance/limited profile | Mission Readiness, clearance issue marker, Debrief metadata | Use canonical bathymetry, not mesh raycasts |
| Sampling target land/seabed validity | Portable core ContinuousScienceTarget and terrain validation | Hard for center in land/below seabed; warning for partial optional volume intersection | Mission Readiness and target issue marker | Validate target volume samples, not only center |
| Time and energy feasibility | Existing mission timing/energy metadata plus terrain validation | Warning or hard energy infeasible depending metadata | Mission Readiness | Do not mix warnings into terrain hard errors without explicit rule |
| Execute gating | Mission Workspace scene using route audit plus terrain readiness summary | Hard errors block; warnings allow | Execute disabled title and readiness panel | Execute only blocked by hard-invalid status |
| Browser/headless equivalence | Portable core and smoke/audit scripts | Matching issue code/severity for same inputs | Audit output | Same public inputs produce same public reasons |
| Renderer validity inference | Forbidden | N/A | Debug flags | Three mesh raycasts are never validity authority |
| Invalid placement mutation | Mission Workspace transaction/placement path | Rejected | Visible rejection and debug transaction | Invalid candidates do not add cards, timeline entries, or route segments |

## Findings

Existing continuous waypoint, route, bathymetry, and dive modules already owned most canonical checks. THREE-R1.2C adds a single report contract over those pieces instead of moving authority into the renderer. The main known gap is that full actual-clearance terrain-event generation during Simulation is still summarized conservatively as unsupported unless the simulation result already contains terrain events.

## Claim Boundary

The terrain stack is synthetic and educational. It is not an operational bathymetry product, calibrated ocean forecast, certified glider controller, or route optimizer.
