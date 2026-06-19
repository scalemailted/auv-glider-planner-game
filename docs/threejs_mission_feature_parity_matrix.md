# Three.js Mission Feature Parity Matrix

Status values: `PARITY`, `ADAPTED_FOR_3D`, `MISSING`, `BUG`, `NOT_APPLICABLE`.

## Planning Visuals

| Feature | Three status | Notes |
| --- | --- | --- |
| Drop zones | ADAPTED_FOR_3D | Rendered as 3D cell overlays from canonical deployment state. |
| Starts | ADAPTED_FOR_3D | Selected starts remain canonical mission/deployment state. |
| Gliders | ADAPTED_FOR_3D | Pose adapter and quaternion orientation added in THREE-R1.1E. |
| Planned routes | ADAPTED_FOR_3D | Route layer consumes render view model. |
| Waypoint statuses | PARITY | Right panel/timeline use canonical waypoint plan/status. |
| Current vectors | ADAPTED_FOR_3D | Rendered from vector field layer. |
| Scalar heatmap | ADAPTED_FOR_3D | Rendered from scalar field layer. |
| Hazards | ADAPTED_FOR_3D | Rendered from scenario hazard layer. |
| Gold Stars | ADAPTED_FOR_3D | Priority targets rendered from canonical active targets. |
| Hover cell | ADAPTED_FOR_3D | Three interaction view model owns hover presentation only. |
| Invalid placement | PARITY | Hard invalid preview/rejection uses canonical guard. |
| Warning placement | PARITY | Mission-window overrun is accepted with warning metadata. |
| Guidance/drift cone | ADAPTED_FOR_3D | Dedicated layer renders canonical PlanningGuidance data. |
| Reachable region | ADAPTED_FOR_3D | Dedicated layer renders canonical reachable region. |
| ETA/energy warnings | ADAPTED_FOR_3D | Existing panels show route/guard warning metadata. |

## Simulation Visuals

| Feature | Three status | Notes |
| --- | --- | --- |
| Body orientation | ADAPTED_FOR_3D | Quaternion pose update added; browser turn QA pending. |
| Planned route | ADAPTED_FOR_3D | Rendered during simulation from plan state. |
| Realized trajectory | ADAPTED_FOR_3D | Rendered from canonical engine agent history. |
| Active waypoint | ADAPTED_FOR_3D | Right panel and simulation status layers consume engine status. |
| Completed waypoint | PARITY | Existing engine status is surfaced in UI. |
| Missed waypoint | PARITY | Mission-time expiration records missed waypoints. |
| Observations | ADAPTED_FOR_3D | Rendered from public events. |
| Surfacing | ADAPTED_FOR_3D | Surfacing events rendered from public events. |
| Route failure | ADAPTED_FOR_3D | Existing route failure status layer remains canonical. |
| Energy/status | PARITY | Existing HUD/panel surfaces remain canonical. |
| Event timeline | PARITY | Timeline remains HTML/UI state, not Three-owned. |

## Scene Lifecycle

| Transition | Status | Notes |
| --- | --- | --- |
| Planning -> Simulation | PARITY | Planning cleanup is event-bound and idempotent. |
| Simulation -> Debrief | PARITY | Simulation cleanup is event-bound and idempotent. |
| Any mission scene -> Main Menu | PARITY | Main Menu stops mission scenes and resets stale shell DOM. |
| Rerun | ADAPTED_FOR_3D | Resource growth should be checked by focused E2E. |
| Return to Planning | ADAPTED_FOR_3D | Canonical plan/result state is preserved; renderer recreated once. |

## Remaining Gaps

- Pixel/visual QA for guidance cone size and glider nose direction remains pending.
- Terrain/depth slab overhaul is intentionally deferred to THREE-R1.2.
- Replay/debrief/editor parity is intentionally deferred to THREE-R2.
