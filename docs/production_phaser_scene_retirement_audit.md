# Production Phaser Scene Retirement Audit

Phase: THREE-R2B
Date: 2026-06-21

## Result

The legacy Phaser-rendered Mission Editor world is retired from the normal production editor path. The production entry remains `src/game/main.js`, and Phaser remains loaded as the transitional scene shell.

## Not Removed

- `phaser` package dependency
- vendored/runtime Phaser loading from `index.html`
- Phaser scene registry
- production routing

Final Phaser removal is not approved in this phase.

## Active Replacement

`EnvironmentEditorScene` mounts a `.three-mission-editor-host` and uses:

- `src/core/editor/MissionEditorDocument.js`
- `src/core/editor/MissionEditorCommand.js`
- `src/core/editor/MissionEditorSession.js`
- `src/core/rendering/EditorWorldRenderViewModel.js`
- `src/game/three/ThreeMissionEditorController.js`
- `src/game/three/ThreeMissionWorldRenderer.js`

## Debug Contract

`globalThis.ANCHOR_PHASER_RETIREMENT_DEBUG` reports:

- `phaserDependencyStillRequired: true`
- `readyForFinalPhaserRemoval: false`
- `activeLegacyPhaserEditorWorldRendererCount: 0`
- `normalEditorUsesThree: true`

## Remaining Phaser Role

Phaser still owns scene lifecycle, boot/routing, and transitional UI scene hosting. It no longer owns normal Mission Editor world rendering.
