# Current Runtime Shell Parity

FLOW-R2A.4 audits current visualization in both runtime shells without changing the default runtime.

## Default Shell

The active production entry remains `index.html` -> `src/game/main.js`. Phaser owns scene lifecycle during this migration stage, while Three.js owns the production mission-world renderer for Planning and Simulation.

Planning and Simulation both use the shared volumetric mission-world view model and the shared `CurrentPresentationState` contract. The launch handoff preserves canonical current source identity and display preferences independently.

## Gated Next Shell

The `?runtimeShell=next` shell is still gated. Where it exposes the production route/mission view, it must reuse the same mission-world view-model augmentation and current presentation debug contract. It must not own a separate current model, field authority, or renderer-specific current substitute.

## Boundary

This parity work does not remove Phaser, switch the default shell, add a new current implementation, add tracers/pathlines, or change scoring. Runtime shells consume current contracts; they do not define current physics.