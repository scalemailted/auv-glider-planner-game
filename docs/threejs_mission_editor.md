# Three.js Mission Editor

THREE-R2B moves the Mission Editor center-world presentation to Three.js while keeping the existing educational editor controls.

## What Works

- Open an existing or generated level in the editor.
- Edit terrain, hazards, deployment zones, glider starts, ROI/objective cells, and current vectors.
- Export a level JSON with `meta.threeMissionEditor` metadata.
- Reimport exported editor levels without schema drift.
- Preview a valid edited mission through the normal production mission lifecycle.
- Block invalid preview/export when validation finds a hard error.

## Authority Rule

The canonical document in `src/core/editor/` is the source of truth. Three.js renders a derived view model and does not own editor state, scoring, simulation, or planning semantics.

## Debug Objects

- `globalThis.ANCHOR_MISSION_EDITOR_DEBUG`
- `globalThis.ANCHOR_PHASER_RETIREMENT_DEBUG`

## Claim Boundary

Generated currents and fields are synthetic ocean-inspired gameplay fields. They are not calibrated ocean forecast output.
