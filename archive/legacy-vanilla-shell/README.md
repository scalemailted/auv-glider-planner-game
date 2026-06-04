# Legacy Vanilla Shell

This directory contains the retired Canvas/DOM game shell that existed before the Phaser 3 migration.

It is preserved only as historical reference. Active browser routing starts at `src/game/main.js`, creates the Phaser app with `src/game/phaser/PhaserGame.js`, and uses scenes in `src/game/phaser/scenes/`.

Do not restore this shell as the active implementation. Core simulation, planning, generation, IO, schemas, and datasets remain in `src/core/` and are engine-independent.
