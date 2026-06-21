# Three.js Mission Editor Architecture Audit

Phase: THREE-R2B
Date: 2026-06-21

## Decision

The normal Mission Editor world presentation now uses the shared Three.js mission world renderer. `EnvironmentEditorScene` remains a Phaser scene because Phaser is still the transitional lifecycle shell, but Phaser no longer calls `drawMissionMap()` for the editor world.

## Authority Flow

The implemented authority path is:

1. Editor UI intent or canvas pointer event.
2. Renderer-neutral editor interaction intent.
3. Canonical editor command in `src/core/editor/MissionEditorCommand.js`.
4. Canonical editor document in `src/core/editor/MissionEditorDocument.js`.
5. Validation through `src/core/editor/MissionEditorValidation.js`.
6. Derived editor render view model through `src/core/rendering/EditorWorldStateAdapter.js`.
7. Three.js presentation through `src/game/three/ThreeMissionEditorController.js` and `ThreeMissionWorldRenderer.js`.

Three meshes are never the source of exported mission state.

## Supported Parity

The editor preserves existing generation/export behavior while adding Three presentation for:

- terrain/land editing
- hazards
- deployment zones
- glider starts
- ROI/objective cells
- current vector edits
- export/reimport roundtrip
- validation-gated preview and export

## Boundaries

This phase does not add scoring changes, planner integration, stochastic uncertainty, WebGPU fluid simulation, or a new route optimizer.

The editor metadata explicitly marks current fields as synthetic, educational/gameplay fields, not calibrated ocean forecasts.
