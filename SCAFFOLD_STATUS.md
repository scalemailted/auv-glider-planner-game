# Scaffold Status

Last documentation audit: 2026-06-05

ANCHOR is no longer a thin scaffold. The active project is a playable static-browser Phaser 3 game shell around framework-independent JavaScript core modules.

## Current State

- Browser-first static web app; normal play does not require npm, Python, a backend, or a build step.
- Phaser 3 owns the simulator viewport, map interaction, route overlays, and animation.
- HTML/CSS owns the left Mission Console, right Waypoint Timeline, and compact center overlays.
- Core simulation, planning, generation, storage, schema, and IO modules remain independent from Phaser scenes.
- External solvers communicate through JSON files: solver packet in, plan or plan segment out, browser validation and simulation remain authoritative.

## Current Validation

Use these development checks after code changes:

```bash
npm.cmd run check
npm.cmd run test:e2e
```

For normal local browser use:

```bash
python -m http.server 8000
```

Any static file server can replace Python.

## Active Scaffolds

These areas are intentionally labeled as scaffolded or experimental:

- Colab/Python solver template: useful teaching baseline, not a full optimizer or simulator.
- Node headless solver: portable baseline and validation path, not the official scorer.
- `surfaceUpdateBundle`: metadata scaffold; live recovery currently uses explicit `anchor.plan-segment`, `anchor.plan`, or waypoint-list imports.
- Shared-folder or local-bridge solver automation: future strategy, not the default workflow.
- Synthetic current fields: ocean-inspired gameplay fields, not validated CFD or operational ocean forecasts.

## Related Docs

- [README.md](README.md)
- [docs/development_versions.md](docs/development_versions.md)
- [docs/game_design.md](docs/game_design.md)
- [docs/solver_workflow.md](docs/solver_workflow.md)
- [docs/testing.md](docs/testing.md)
