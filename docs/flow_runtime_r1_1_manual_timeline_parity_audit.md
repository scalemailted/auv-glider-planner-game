# FLOW-RUNTIME-R1.1 Manual Planning Timeline Parity Audit

Date: 2026-06-23

## Scope

This pass validates the exact visible Planning timeline path used in the production app:

Product Hub / Generate Challenge / Planning visible Start, Prev, Next, End, and timeline input controls -> DOM handlers -> canonical Planning state -> current presentation seconds -> OceanCurrentField4D sampling -> render view-model invalidation -> Three current glyph GPU upload -> visible current arrows.

This pass does not change current equations, bathymetry, scalar fields, physics, scoring, shell ownership, WebGPU, tracers, or pathlines.

## Finding

The production Planning timeline stores mission time in display units, currently hours. The current field source uses `timeAxisSeconds`. Before this pass, visible Planning controls moved `planningTime` from `0` to `8` to `16`, but the current sampler received `8` and `16` seconds. That made the canonical and GPU digests move, but visible vector evolution was effectively near-static.

Existing helper tests passed because they supplied second-scale values directly to Planning helper fixtures. R1.1 preserves that helper contract by converting helper seconds back to visible Planning hours before using the production view model.

## Repair

`src/core/time/PlanningTimelineTimeBridge.js` is the single bridge from visible Planning timeline units to current source seconds. Planning keeps mission hours for heatmaps, labels, windows, and route timing. The water-column current presentation receives canonical seconds before `OceanCurrentField4D` sampling.

Runtime debug objects:

- `globalThis.ANCHOR_PLANNING_TIMELINE_DEBUG`
- `globalThis.ANCHOR_PLANNING_CURRENT_TRANSACTION_DEBUG`
- `globalThis.ANCHOR_CURRENT_PRESENTATION_DEBUG`

The debug payloads expose binding, dispatch, converted time, sampler time, refresh/upload counters, and `directDebugTimeMutationUsed: false`.

## Acceptance Boundary

R1.1 browser tests use the visible controls only for time changes. They do not call scene setters, mutate app state time, or mutate debug objects to advance current time.

Required visible-control tests are in `tests/e2e/flow_runtime_r1_1_manual_planning_timeline.spec.js`.

## Passing Test Path Compared With Owner Path

| Stage | Owner manual path | Passing test path | Same implementation? |
|---|---|---:|---:|
| Mission source | Product Hub generated deterministic regional Challenge | `createFlowRuntimeR1Fixture` helper | No |
| Time advance | Visible `#bottom-timeline` Start/Prev/Next/End/range controls | Helper passed second-scale values into a Planning fixture | No |
| DOM handler | `HtmlMissionWorkspaceOverlay` click/input listeners | Not exercised by the old helper tests | No |
| Scene state | `MissionWorkspaceScene.setPlanningTime` / `setTimelineFrame` from visible controls | Helper assigned fixture time before building a view model | No |
| Current time unit | Planning hours needed conversion to current seconds | Helper values were already seconds | No |
| Sampler | `OceanCurrentField4D` sampled through production water-column explorer | Same sampler after helper setup | Yes after setup |
| Renderer/GPU | Three instanced current glyph layer | Same glyph layer in focused tests | Yes |

The first broken production stage was the Planning-to-current time bridge. The owner path used visible Planning hours (`8`, `16`) as if they were current seconds, producing nearly static interpolation fractions. The focused tests bypassed this by providing second-scale times directly.

## Visible Binding Map

| Control | Selector | Event | Handler | Renderer effect |
|---|---|---|---|---|
| Start | `#bottom-timeline [data-action="time-start"]` | click | `setTimelineFrame(0)` | `CURRENT_TIME_DIRTY`, refresh Three renderer |
| Prev | `#bottom-timeline [data-action="window-prev"]` | click | `setTimelineFrame(prev)` | `CURRENT_TIME_DIRTY`, refresh Three renderer |
| Next | `#bottom-timeline [data-action="window-next"]` | click | `setTimelineFrame(next)` | `CURRENT_TIME_DIRTY`, refresh Three renderer |
| End | `#bottom-timeline [data-action="time-end"]` | click | `setTimelineFrame(final)` | `CURRENT_TIME_DIRTY`, refresh Three renderer |
| Timeline input | `#bottom-timeline [data-action="time-slider"]` | input | `setPlanningTime(value)` | `CURRENT_TIME_DIRTY`, refresh Three renderer |

`ANCHOR_PLANNING_TIMELINE_DEBUG` records bind/dispatch counters and accepted time. `ANCHOR_PLANNING_CURRENT_TRANSACTION_DEBUG` records dirty, refresh, and renderer-debug stages.

## Runtime Notes

Preflight baseline at phase start:

- Branch: `master`
- HEAD: `7593bd92c2f2bbbbf7938e591009a8fe4a2944bc`
- Entry point: `index.html -> src/game/main.js`
- Source serving mode used for validation: repository-root static server through Playwright `startStaticServer`
- Pages-style route validated: `/auv-glider-planner-game/`
- `_site` existed, but stale `_site` was not the root cause.
- No service worker was found in the repository scan.

## Go/No-Go

The R1.1 gate is intended to be a blocker for FLOW-PKG-R1. FLOW-PKG-R1 should remain blocked unless the exact visible Start, Prev, Next, End, and timeline input controls continue to update current vectors in a normal generated dynamic Challenge.
