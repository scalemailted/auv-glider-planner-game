# Project History

This document keeps durable decisions from completed cleanup, renderer, current, bathymetry, water-column, replay, headless, and benchmark phases. Git history remains the complete archive for phase-by-phase reports and removed visual acceptance notes.

## SCORE-PKG-R1

SCORE-PKG-R1 introduced packages/scoring as the canonical owner for official score calculation, score profiles, ScoreInput/ScoreResult contracts, deterministic score digests, public-safe score summaries, benchmark score metadata, and result/leaderboard score identity. It preserved existing simulator raw metrics, scoring formulas, bonuses, penalties, official scores, planner behavior, scientific models, and public result compatibility.

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
- REPO-CLEAN-R3 physically retired the historical `tests/e2e/smoke.spec.js` monolith and moved its tests into capability-owned E2E files.
- REPO-CLEAN-R3 audited compatibility forwarders, renderer paths, and Phaser UI utilities without deleting active supported runtime paths.
- R2 superseded phase records removed: docs/dive_r1_1_visual_acceptance.md, docs/flow_r2a_3_visual_acceptance.md, docs/flow_r2a_4_visual_acceptance.md, docs/flow_r2a_5_visual_acceptance.md, docs/three_r1_2c_visual_acceptance.md, docs/world_r1_1_visual_acceptance.md.

## ENV-PKG-R1 Environment Package Boundary

ENV-PKG-R1 makes `packages/environment` an active package boundary for composition, identity, validation, provenance, role metadata, and unified physical-coordinate sampling across bathymetry, current, and scalar artifacts. It preserves existing generation equations, visibility decisions, observation noise, mission execution, scoring, rendering, and synthetic claim boundaries.
## SIM-PKG-R2 Mission Simulator Runtime Authority

SIM-PKG-R2 makes `packages/mission-simulator` the authoritative mission-state transition package for browser, Node headless, and benchmark execution adapters. Legacy runtime paths remain compatibility forwarders where required. The cutover preserves environment generation, route planning, glider dynamics semantics, sampling values, observation behavior, terrain and hazard rules, terminal outcomes, official scoring, rendering, replay semantics, and public schemas. Browser and headless adapters still own scheduling, UI/artifact orchestration, and debug publication around the package.
