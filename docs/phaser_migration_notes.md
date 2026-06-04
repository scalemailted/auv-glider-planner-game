# Phaser Migration Notes

The current release uses Phaser 3 as the active browser game shell. `src/game/main.js` creates the Phaser app through `src/game/phaser/PhaserGame.js`, and active scenes live in `src/game/phaser/scenes/`.

The previous vanilla Canvas/DOM scene shell has been moved to `archive/legacy-vanilla-shell/` for reference only. It is not part of active routing and should not be restored as the primary game shell.

Keep `src/core/` engine-independent: simulation, scoring, generation, planning, schemas, solver packets, datasets, and storage should not import Phaser or DOM scene modules.
