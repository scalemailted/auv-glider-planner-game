# Production UI Parity Specification

MIG-R2.2 restores the user-facing product while replacing Phaser internals. Route existence is not parity; each production phase must preserve the visible information architecture, major controls, shell regions, and cleanup behavior from the legacy production scenes.

| Surface | Legacy source | Required content | New owner | Status | Notes |
|---|---|---|---|---|---|
| Main Menu | `MainMenuScene` | Product Hub with Challenge Mode, Simulation Lab, Learning Labs, runtime boundary note, no mission workspace panels | `MainMenuView` | Partial | DOM route exists; must keep Product Hub styling and hide waypoint/timeline regions. |
| Mission Setup | `MainMenuScene` setup flows | Experience/mode controls, deterministic/stochastic selection, objective/config, seed, generate/reset, continue/back | `MissionSetupView` | Partial | Current DOM setup has core controls and needs continued enrichment from old setup groups. |
| Mission Briefing | `MissionBriefingScene` | Mission title/objective, scenario summary, duration, planning window, fleet, constraints, hazards, begin planning/back | `MissionBriefingView` | Partial | Briefing is separate; content density still trails the legacy scene. |
| Mission Planning | `MissionWorkspaceScene` | Left mission console, center Three viewport, right waypoint panel, timeline, performance strip, waypoint/start/marker controls, launch validation | `MissionPlanningView` + Three renderer | Partial | Three renderer is active; shell placement and mature panel reuse are the critical parity target. |
| Mission Simulation | `SimulationScene` | Simulation status/transport, center Three simulation viewport, right execution status, mission performance, warnings/failures | `MissionSimulationView` | Partial | Uses shared engine; must keep planning edit controls absent. |
| Mission Debrief | `DebriefScene` | Official score, route/science/safety metrics, per-glider result, exports, rerun, planning/menu, benchmark/adaptive panels | `MissionDebriefView` | Partial | Textual result exists; mature score/export panels still need broader reuse. |
| Challenge Mode submenu | `MainMenuScene` | Distinct route to setup, deterministic/stochastic challenge options | `MainMenuView` -> `MissionSetupView` | Partial | Must not embed setup forms in menu. |
| Simulation Lab submenu | `MainMenuScene` | Planner/adaptive entries plus legacy science sandboxes | `MainMenuView` + legacy island | Partial | Legacy labs remain comparison/reference routes. |
| Learning Labs submenu | `MainMenuScene` | Static lesson links and tutorial launch path | `MainMenuView` + `TutorialBrowserView` | Partial | Static content remains regular HTML. |
| Planner Benchmark entry | `BenchmarkModeOverviewScene` | Setup/briefing/planning/simulation/debrief through normal phases with benchmark metadata | DOM lifecycle metadata | Partial | No schema/scoring changes in this phase. |
| Adaptive Benchmark entry | `BenchmarkModeOverviewScene`/adaptive panels | Setup/briefing/planning/simulation/debrief and surfacing continuation panel | DOM lifecycle metadata + debrief panel | Partial | Surfacing loop parity remains a known gap. |
| Import flow | `LoadLevelJsonScene` | Separate import route, validation status, back navigation, successful challenge enters briefing | `ImportExportView` | Partial | Lightweight route restored; parser behavior delegates to existing core helpers. |
| Leaderboard/rerun | `DebriefScene` panels | Separate saved attempts route, rerun/load-as-plan, metadata warnings | `LeaderboardView` | Partial | Local attempt persistence is minimal and should be expanded from legacy panel behavior. |

## Acceptance Notes

- Production routes must progress as `#/menu -> #/setup -> #/briefing -> #/planning -> #/simulation -> #/debrief`.
- One route-scoped root may be mounted at a time.
- One Three mission canvas may be mounted at a time on production routes.
- Setup, briefing, planning, simulation, and debrief content must not overlap.
- Phaser production scenes remain available only as reference during this phase and are not deleted.
