# Three.js Simulation Feature Parity

| Legacy feature | Legacy owner | Canonical state/command | Three presentation | Status | Gap |
| --- | --- | --- | --- | --- | --- |
| Start | SimulationScene timeline | `goToSimulationFrame(0)` | Simulation Console and bottom timeline | PARITY | None |
| Play/Pause | SimulationScene | `togglePlay()` / engine `play()` / `pause()` | Console and timeline buttons | PARITY | None |
| Step | SimulationScene | `stepOnce()` | Console and timeline buttons | PARITY | None |
| Finish | SimulationScene | `finishSimulation()` | Console and timeline buttons | PARITY | None |
| Reset | SimulationScene | `resetSimulation()` | Console button | PARITY | None |
| Mission-time timeline | SimulationScene | `seekSimulationTime`, frame helpers | Bottom timeline/playhead | PARITY | None |
| Active window | MissionTime core | selected window/time state | Timeline readout | PARITY | None |
| Selected glider | App state / panels | `selectedAgentId` | Three selection plus panels | PARITY | None |
| Planned route | Canonical `anchor.plan` | executable waypoint sequence | Three route layer | PARITY | None |
| Actual path | SimulationEngine agent history | engine trajectory/history | Three realized trajectory layer | PARITY | None |
| Current target waypoint | PlanExecutor / engine agent state | active waypoint/progress | Route/status layers and panels | ADAPTED_FOR_3D | Visual styling remains simple |
| Completed waypoint | SimulationEngine events/agent state | completed waypoint arrays/events | Three route/status and panels | PARITY | None |
| Missed waypoint | SimulationEngine events/route failure | missed waypoint arrays/events | Three route/failure overlays | PARITY | None |
| Route failure | SimulationEngine route failure decision | recovery commands | Failure markers and console actions | PARITY | None |
| Energy/fuel | SimulationEngine summary | engine summary/agent energy | HUD/console/panels | PARITY | None |
| ROI samples | SimulationEngine events | sample/duplicate events | Observation layer | PARITY | None |
| Observations | SimulationEngine events | public observation events | Observation markers | PARITY | None |
| Duplicate samples | SimulationEngine summary/events | duplicate sample metrics | Console/debrief metrics | PARITY | None |
| Hazards | Level layers and engine events | hazard layers/events | Hazard layer and summaries | PARITY | None |
| Gold Stars | Priority target engine state | priority target captures | Priority/score UI | PARITY | None |
| Surfacing | Glider comms / engine decisions | surface decision state | Surfacing markers and fallback actions | PARITY | None |
| Communication | Engine events | comm/surface events | Surfacing/communication markers | PARITY | None |
| Adaptive objective transition | Adaptive benchmark core | surfacing/debrief handoff | Existing panels/modals | PARITY | None |
| Recovery/replan | SimulationScene | route failure/surface actions | Console/modal actions | PARITY | None |
| Event log | SimulationScene | engine events | Recent Events console | PARITY | None |
| Score/progress | SimulationEngine/scoring | engine summary/result | HUD/debrief | PARITY | None |
| Terminal state | SimulationEngine | complete/abort/route-failure terminal state | Console plus Debrief transition | PARITY | None |
| Transition to Debrief | Phaser scene lifecycle | canonical result in app state | DebriefScene | PARITY | None |

Three may adapt spatial presentation from flat 2D to 3D. It may not remove controls, mission information, recovery paths, or canonical state visibility needed for play.