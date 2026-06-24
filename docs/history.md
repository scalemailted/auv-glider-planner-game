# Project History

This document keeps durable decisions from completed cleanup, renderer, current, bathymetry, water-column, replay, headless, and benchmark phases. Git history remains the complete archive for phase-by-phase reports and removed visual acceptance notes.

## Current Runtime Boundary

- `index.html` boots `src/game/main.js`.
- The default runtime is the Phaser lifecycle and scene shell.
- `runtimeShell=next` remains gated.
- Three.js owns normal mission-world planning, simulation, replay, and editor rendering.
- Phaser remains active for route/scene lifecycle and Learning Labs.
- Final Phaser package/vendor removal is deferred.

## Cleanup History

- REPO-CLEAN-R1 removed the legacy vanilla shell archive and tracked Python bytecode after reachability checks.
- REPO-CLEAN-R2 moved validation tier ownership to production capabilities, constrained the full browser profile, and made Pages documentation copying explicit.
- R2 superseded phase records removed: docs/dive_r1_1_visual_acceptance.md, docs/flow_r2a_3_visual_acceptance.md, docs/flow_r2a_4_visual_acceptance.md, docs/flow_r2a_5_visual_acceptance.md, docs/three_r1_2c_visual_acceptance.md, docs/world_r1_1_visual_acceptance.md.
