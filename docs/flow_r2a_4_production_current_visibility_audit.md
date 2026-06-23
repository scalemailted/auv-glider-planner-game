# FLOW-R2A.4 Production Current Visibility Audit

FLOW-R2A.4 is a production-path stabilization pass. It restores visible current vectors in the normal generated Challenge workflow and keeps focused FLOW-R2A fixtures from being the only path with visible glyphs.

## Findings

| Area | Finding | Resolution |
| --- | --- | --- |
| Normal generated Challenge | Canonical `OceanCurrentField4D` fields were valid, but renderer sampling used raw grid indices against physical-meter current axes, making regional current layers appear empty. | `WaterColumnLayerExplorerViewModel` now maps grid x/y to the current cube east/north axes before sampling. |
| Default shell | Planning and Simulation had volumetric current debug but no shared presentation debug contract. | Both scenes publish `globalThis.ANCHOR_CURRENT_PRESENTATION_DEBUG`. |
| Next shell | `?runtimeShell=next` built a flat mission view model and skipped volumetric current augmentation. | `RouteViewFactory` now augments with the volumetric water-column model and publishes shared current debug. |
| Current controls | Display mode, density, magnitude scale, color mode, active layer, layer visibility, and safe mode were not part of the renderer current cache signature. | `currentPresentationCacheSignature` is included in current field frame signatures. |
| Idle optional gliders | Zero-waypoint optional Glider 2/3 controls could block execute through deployment/start validation. | Plan validation, route audit, and simulation state allow zero-waypoint optional agents to idle surfaced without fabricated observations. |
| Safe mode | Safe current display must be an explicit query, not a sticky fallback. | `CurrentPresentationState` centralizes explicit `?currentDisplay=safe` detection. |

## Runtime Matrix

| Runtime path | Planning currents | Simulation currents | Notes |
| --- | --- | --- | --- |
| Default shell normal generated Challenge | Expected visible | Expected visible | Glider 1 routed; Glider 2/3 may be idle. |
| Default shell compact/generated fixture | Expected visible | Expected visible | Confirms visibility is not limited to the regional benchmark fixture. |
| `?runtimeShell=next` | Expected visible | Parity debug only in current DOM shell | Next shell reuses the same volumetric presentation contract; it does not become canonical simulation authority. |
| `?currentDisplay=safe` | Hidden with explicit reason | Hidden with explicit reason | Canonical current physics remains active. |
| GitHub Pages subpath | Expected visible | Expected visible | Covered by focused E2E. |

## Claim Boundary

This pass does not add FLOW-R2B tracers/pathlines, WebGPU, new equations, stochastic uncertainty, planner changes, scoring changes, calibrated forecast claims, or Phaser removal. Three.js remains a presentation layer over canonical current, route, simulation, and scoring state.

## Validation Assets

- `tools/js/smoke_normal_generated_mission_current_activation.mjs`
- `tools/js/smoke_current_execute_handoff.mjs`
- `tools/js/smoke_current_runtime_shell_parity.mjs`
- `tools/js/audit_current_production_path_plumbing.mjs`
- `tools/js/audit_current_pixel_evidence_production_path.mjs`
- `tests/e2e/flow_r2a_4_production_current_visibility.spec.js`

Human manual QA by the project owner remains pending until the FLOW-R2A.4 normal-production current-visibility screenshot package is reviewed.
