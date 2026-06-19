# Continuous Mission UI Runtime Stabilization

Phase: THREE-R1.2A.3.1

## Reproduction Before Fix

Headed Chromium was used to follow the visible path: Main Menu -> Challenge Mode -> Quick Random Challenge -> Scenario Start -> Start Planning.

Before this pass, entering Planning triggered:

```text
ReferenceError: waypointSnapMode is not defined
at rendererBackendSection
at HtmlMissionWorkspaceOverlay.renderPlanningConsole
at HtmlMissionWorkspaceOverlay.refresh
at MissionWorkspaceScene.refreshPanels
at MissionWorkspaceScene.create
```

The scene did not finish mounting the Planning Console. The snapshot showed MissionWorkspaceScene inactive, no continuous mission debug object, an empty right panel/timeline, and a favicon request failure.

## Root Cause

`rendererBackendSection()` referenced `waypointSnapMode`, `coordinateProfile`, and `fieldSamplingProfile` as lexical variables that were not declared in that helper. The intended values lived in Planning/interaction state, but the overlay helpers were independently guessing defaults instead of receiving one normalized UI state.

## Fix

- Added `src/core/rendering/ContinuousMissionUiState.js` as the renderer-neutral normalized UI state contract.
- `HtmlMissionWorkspaceOverlay` now normalizes one continuous mission UI state and passes it to renderer, water-column, dive-planning, and field-rendering sections.
- `MissionWorkspaceScene` now creates and validates continuous UI state before the initial overlay render, publishes `ANCHOR_CONTINUOUS_UI_DEBUG` and `ANCHOR_CONTINUOUS_MISSION_DEBUG`, and marks `planningSceneCreateCompleted` after the first scene mount.
- Three interaction clicks now forward `continuousPoint` from hit tests so free-placement waypoints can remain fractional.
- The overlay catches fatal render errors and displays a Planning UI Error panel instead of leaving a blank workspace.
- A checked-in SVG favicon removes the previous favicon request failure.

## Current Browser Result

Focused Playwright coverage now passes for:

```text
Continuous Mission Planning Starts Without Overlay Errors
Continuous Mission Controls Are Visible and Functional
Continuous Mission Plan Executes Through Canonical 3D Dive
```

The visible workflow covers Scenario Start, Start Planning, Planning Console sections, deployment, free placement, snap-to-cell placement, dive profile and target-layer controls, smoothed/volumetric field mode controls, Execute, live 3D dive simulation, and Debrief.

## Claim Boundary

This pass does not add arbitrary XYZ route planning. Horizontal continuous waypoints plus optional dive profile and target-layer metadata remain the canonical route intent. The portable core owns planning, validation, simulation, scoring, observations, and exports. Three.js owns rendering and pointer-surface interaction only.

Human manual QA by the project owner remains pending.
