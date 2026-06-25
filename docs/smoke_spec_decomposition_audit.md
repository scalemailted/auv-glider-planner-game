# Smoke Spec Decomposition Audit

REPO-CLEAN-R3 decomposed the former `tests/e2e/smoke.spec.js` file by production capability while preserving the original browser assertions. Shared helper functions moved to `tests/e2e/helpers/SmokeSpecShared.js`.

## Source Snapshot

- Original file: `tests/e2e/smoke.spec.js`
- Original line count: 7296
- Original test count: 68
- Shared helper declarations extracted: 80

## Destination Files

- product_hub_and_labs.spec.js: 9 tests
- mission_planning.spec.js: 12 tests
- environment_rendering.spec.js: 17 tests
- workspace_and_challenge_setup.spec.js: 12 tests
- simulation_and_terrain.spec.js: 18 tests

## Shared Mutable Assumptions

- Each split file owns its own static-server setup and teardown on port 9321. The grouped runner uses one Playwright worker, so files do not run concurrently in the release profiles.
- Browser contexts remain per test; no intentional localStorage or global debug state is shared between tests.
- Download assertions remain browser-owned where they validate user-visible export behavior.
- Generated artifacts and screenshots remain under Playwright output directories and are not tracked.
- Scene/debug APIs are still read for assertions, but visible-control workflows continue to use visible controls for interaction capabilities.

## Test Map

| Title | Original Line | Destination | Tier Note | Decision |
| --- | ---: | --- | --- | --- |
| learning labs static page is linked from the main menu | 24 | product_hub_and_labs.spec.js | smoke | retain browser workflow; moved unchanged |
| Benchmark modes overview opens from Simulation Lab | 252 | product_hub_and_labs.spec.js | release/full/extended | retain browser workflow; moved unchanged |
| Motion Planning Demo opens from Simulation Lab and preserves benchmark/headless routes | 364 | product_hub_and_labs.spec.js | release/full/extended | retain browser workflow; moved unchanged |
| Bathymetric World View opens from Simulation Lab and preserves adjacent routes | 413 | product_hub_and_labs.spec.js | release/full/extended | retain browser workflow; moved unchanged |
| Renderer Architecture Preview opens from Simulation Lab | 493 | product_hub_and_labs.spec.js | release/full/extended | retain browser workflow; moved unchanged |
| Headless Bundle Viewer opens from Simulation Lab and exports browser summary | 519 | product_hub_and_labs.spec.js | smoke | retain browser workflow; moved unchanged |
| Planner Benchmark debrief exports benchmark records from synthetic result | 725 | product_hub_and_labs.spec.js | release/full/extended | retain browser workflow; moved unchanged |
| Adaptive Benchmark synthetic debrief shows surfacing review and exports P8 session records | 911 | product_hub_and_labs.spec.js | release/full/extended | retain browser workflow; moved unchanged |
| campaign planning smoke flow reaches debrief | 1074 | product_hub_and_labs.spec.js | release/full/extended | retain browser workflow; moved unchanged |
| Continuous Mission Planning Starts Without Overlay Errors | 2757 | mission_planning.spec.js | smoke | retain browser workflow; moved unchanged |
| Continuous Mission Controls Are Visible and Functional | 2809 | mission_planning.spec.js | release/full/extended | retain browser workflow; moved unchanged |
| Continuous Mission Plan Executes Through Canonical 3D Dive | 2865 | mission_planning.spec.js | release/full/extended | retain browser workflow; moved unchanged |
| Surface Waypoints Produce a Predicted Three-Dimensional Dive | 2921 | mission_planning.spec.js | release/full/extended | retain browser workflow; moved unchanged |
| Three Camera Reveals Full Water-Column Dive | 2987 | mission_planning.spec.js | release/full/extended | retain browser workflow; moved unchanged |
| Surface Waypoints and Sampling Targets Have Distinct Semantics | 3019 | mission_planning.spec.js | release/full/extended | retain browser workflow; moved unchanged |
| Sampling Target Drives Predicted Dive Without Becoming a Navigation Point | 3048 | mission_planning.spec.js | release/full/extended | retain browser workflow; moved unchanged |
| Predicted Multi-Yo Profile Executes Through Canonical Simulation | 3084 | mission_planning.spec.js | release/full/extended | retain browser workflow; moved unchanged |
| Three Camera Interaction Does Not Rebuild Mission Models | 3120 | mission_planning.spec.js | release/full/extended | retain browser workflow; moved unchanged |
| Three Mission Renderer Resources Remain Stable | 3154 | mission_planning.spec.js | release/full/extended | retain browser workflow; moved unchanged |
| Three Mission Interaction Performance Invariants | 3192 | mission_planning.spec.js | release/full/extended | retain browser workflow; moved unchanged |
| Three Sampling Target and Dive Planning Headed Workflow | 3281 | mission_planning.spec.js | release/full/extended | retain browser workflow; moved unchanged |
| Three Simulation Uses Incremental Presentation Updates | 3342 | environment_rendering.spec.js | release/full/extended | retain browser workflow; moved unchanged |
| Finish Instantly Avoids Per-Step Three Rebuilds | 3384 | environment_rendering.spec.js | release/full/extended | retain browser workflow; moved unchanged |
| Three Quality Profiles Preserve Canonical Simulation Result | 3402 | environment_rendering.spec.js | release/full/extended | retain browser workflow; moved unchanged |
| Three Context Slabs Reduce Cost Without Losing Dive Context | 3452 | environment_rendering.spec.js | release/full/extended | retain browser workflow; moved unchanged |
| Three Mission Uses Continuous Bathymetric Terrain | 3501 | environment_rendering.spec.js | release/full/extended | retain browser workflow; moved unchanged |
| Three Terrain Camera Gestures Do Not Rebuild Bathymetry Mesh | 3549 | environment_rendering.spec.js | release/full/extended | retain browser workflow; moved unchanged |
| Bathymetry Limits Predicted and Realized Dive Depth | 3602 | environment_rendering.spec.js | release/full/extended | retain browser workflow; moved unchanged |
| Continuous Coastline Blocks Invalid Surface Waypoints | 3675 | environment_rendering.spec.js | release/full/extended | retain browser workflow; moved unchanged |
| Water-Column Layers Respect Continuous Seabed | 3705 | environment_rendering.spec.js | release/full/extended | retain browser workflow; moved unchanged |
| Bathymetric Demo and Mission Renderer Share Terrain Geometry | 3745 | environment_rendering.spec.js | release/full/extended | retain browser workflow; moved unchanged |
| All Production Mission Phases Share One Bathymetry Contract | 3782 | environment_rendering.spec.js | release/full/extended | retain browser workflow; moved unchanged |
| Three Bathymetry Resources Dispose Across Scene Transitions | 3840 | environment_rendering.spec.js | release/full/extended | retain browser workflow; moved unchanged |
| Three Bathymetric Terrain Preserves Render-Cost Gate | 3862 | environment_rendering.spec.js | release/full/extended | retain browser workflow; moved unchanged |
| Three Camera Remains Responsive Under Live Simulation Load | 3958 | environment_rendering.spec.js | release/full/extended | retain browser workflow; moved unchanged |
| Segment Distance Changes Predicted Dive Geometry | 4027 | environment_rendering.spec.js | release/full/extended | retain browser workflow; moved unchanged |
| Predicted and Realized Dive Paths Remain Distinct | 4054 | environment_rendering.spec.js | release/full/extended | retain browser workflow; moved unchanged |
| Bathymetry Demo and Mission Dive Paths Share Coordinates | 4080 | environment_rendering.spec.js | release/full/extended | retain browser workflow; moved unchanged |
| Three Mission Workspace Stabilization | 4104 | workspace_and_challenge_setup.spec.js | release/full/extended | retain browser workflow; moved unchanged |
| Three Mission renderer preserves live Mission Planning state | 4171 | workspace_and_challenge_setup.spec.js | release/full/extended | retain browser workflow; moved unchanged |
| Three Planning Pointer Interaction dispatches canonical workspace commands | 4267 | workspace_and_challenge_setup.spec.js | release/full/extended | retain browser workflow; moved unchanged |
| Three Waypoint Pipeline and Standard Camera Gestures | 4416 | workspace_and_challenge_setup.spec.js | release/full/extended | retain browser workflow; moved unchanged |
| Three Mission Planning Tools and Camera Controls | 4566 | workspace_and_challenge_setup.spec.js | release/full/extended | retain browser workflow; moved unchanged |
| Three Simulation Selection inspects canonical public simulation objects | 4634 | workspace_and_challenge_setup.spec.js | release/full/extended | retain browser workflow; moved unchanged |
| scenario setup stays inside the center viewport | 4721 | workspace_and_challenge_setup.spec.js | release/full/extended | retain browser workflow; moved unchanged |
| challenge setup uses left navigator and selected briefing | 4737 | workspace_and_challenge_setup.spec.js | release/full/extended | retain browser workflow; moved unchanged |
| level generator opens from main menu | 4765 | workspace_and_challenge_setup.spec.js | release/full/extended | retain browser workflow; moved unchanged |
| deterministic challenge generates a fresh perfect-knowledge level | 4799 | workspace_and_challenge_setup.spec.js | smoke | retain browser workflow; moved unchanged |
| load level json imports a level and offers play/edit actions | 4819 | workspace_and_challenge_setup.spec.js | release/full/extended | retain browser workflow; moved unchanged |
| stochastic mode exposes ensemble and risk controls | 4836 | workspace_and_challenge_setup.spec.js | release/full/extended | retain browser workflow; moved unchanged |
| Execute Mission Through Three Simulation | 5049 | simulation_and_terrain.spec.js | smoke | retain browser workflow; moved unchanged |
| Three Volumetric Water Column Planning | 5164 | simulation_and_terrain.spec.js | release/full/extended | retain browser workflow; moved unchanged |
| Three Depth-Aware Dive and Sampling | 5229 | simulation_and_terrain.spec.js | release/full/extended | retain browser workflow; moved unchanged |
| Three Mission Scene Isolation | 5277 | simulation_and_terrain.spec.js | release/full/extended | retain browser workflow; moved unchanged |
| Three Scene Cleanup Is Null-Safe and Idempotent | 5301 | simulation_and_terrain.spec.js | release/full/extended | retain browser workflow; moved unchanged |
| Generated Mission Opens a Visible Volumetric Water Column | 5335 | simulation_and_terrain.spec.js | release/full/extended | retain browser workflow; moved unchanged |
| Legacy Mission Uses Explicit Surface Compatibility Mode | 5385 | simulation_and_terrain.spec.js | release/full/extended | retain browser workflow; moved unchanged |
| Three Vehicle Pose Guidance and Grid Alignment | 5437 | simulation_and_terrain.spec.js | release/full/extended | retain browser workflow; moved unchanged |
| Three Waypoint Validation and Mission Window Semantics | 5505 | simulation_and_terrain.spec.js | release/full/extended | retain browser workflow; moved unchanged |
| Terrain-Aware Placement Preview Prevents Invalid Mission Mutation | 5604 | simulation_and_terrain.spec.js | release/full/extended | retain browser workflow; moved unchanged |
| Continuous Route Validation Detects Coastline and Clearance Risks | 5649 | simulation_and_terrain.spec.js | release/full/extended | retain browser workflow; moved unchanged |
| Sampling Targets Respect Canonical Seabed and Reachability | 5688 | simulation_and_terrain.spec.js | release/full/extended | retain browser workflow; moved unchanged |
| Mission Readiness Separates Errors Warnings and Advisories | 5721 | simulation_and_terrain.spec.js | release/full/extended | retain browser workflow; moved unchanged |
| Planned and Realized Paths Share Terrain Validation | 5770 | simulation_and_terrain.spec.js | release/full/extended | retain browser workflow; moved unchanged |
| Terrain Validation Persists Through Export Headless and Replay | 5815 | simulation_and_terrain.spec.js | release/full/extended | retain browser workflow; moved unchanged |
| Three Terrain Presentation Clearly Distinguishes Mission Semantics | 5854 | simulation_and_terrain.spec.js | release/full/extended | retain browser workflow; moved unchanged |
| Legacy and Three Simulation Produce Identical Canonical Result | 5885 | simulation_and_terrain.spec.js | release/full/extended | retain browser workflow; moved unchanged |
| legacy saved level registry scene still opens | 5903 | simulation_and_terrain.spec.js | release/full/extended | retain browser workflow; moved unchanged |

## Deferred Conversions

Pure-value assertions remain inside several browser workflows where splitting them would require new focused Node harnesses. R3 records them for a later pure-contract pass rather than weakening browser assertions.
