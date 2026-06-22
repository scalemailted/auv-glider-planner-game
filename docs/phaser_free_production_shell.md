# Phaser-Free Production Shell

R3A introduces a gated production shell at `?runtimeShell=next`.

Default behavior remains unchanged: `index.html` loads `src/game/main.js`, and the runtime selector loads `src/game/phaser/PhaserProductionBootstrap.js` unless `runtimeShell=next` is requested. The default bootstrap loads `vendor/phaser.min.js` before importing Phaser scene modules.

Next-shell behavior: `src/game/main.js` dynamically imports `src/app/production/AnchorProductionBootstrap.js`. The next shell uses framework-neutral route, lifecycle, and session modules under `src/app/production/` and does not load or instantiate Phaser for production mission routes.

Boundary flags published in `ANCHOR_PRODUCTION_SHELL_DEBUG` state that the shell uses canonical Planning, Simulation, Replay, and Editor systems and does not change official scoring or add a planner.

Learning Labs remain a lazy legacy island in R3A. Selecting the retained lab island loads Phaser on demand and destroys the isolated instance on return. Full Learning Lab migration is deferred to R3B.
