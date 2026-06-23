# FLOW-R2A.1 Launch Acceptance

This checklist records the narrow launch-stability gate for FLOW-R2A.1.

## Automated Acceptance

Required focused commands:

```powershell
node tools/js/smoke_simulation_launch_profiler.mjs
node tools/js/smoke_current_field_session_cache.mjs
node tools/js/smoke_current_sampler_hot_path.mjs
node tools/js/smoke_current_render_sample_cache.mjs
node tools/js/smoke_current_glyph_buffer_reuse.mjs
node tools/js/smoke_current_presentation_fail_soft.mjs
node tools/js/smoke_current_canonical_launch_failure.mjs
node tools/js/audit_current_launch_hot_paths.mjs
node tools/js/audit_no_full_current_cube_hot_loop_clone.mjs
node tools/js/audit_no_current_digest_in_sample_loop.mjs
node tools/js/audit_current_renderer_single_raf.mjs
node tools/js/audit_current_launch_memory.mjs
node node_modules/@playwright/test/cli.js test tests/e2e/flow_r2a_1_launch_stability.spec.js --reporter=line --workers=1
```

The focused Playwright spec covers:

- interactive Simulation launch with volumetric currents
- one current cube build per mission launch
- no current rebuild during hot sampling
- current glyph presentation fail-soft behavior
- malformed canonical current field clean abort
- regional and legacy compatibility launches
- camera/layer toggles without current-cube reallocation
- GitHub Pages subpath launch
- headed-style launch, play, replan, relaunch, and cleanup walkthrough

## Manual Smoke Notes

Use the generated screenshots in `test-results/flow-r2a-1-launch-review/` after running the walkthrough:

1. `01-before-execute.png` shows Planning ready with the routed glider.
2. `02-first-interactive-simulation-frame.png` shows the first Simulation frame.
3. `03-current-glyphs-loaded.png` shows current glyph presentation initialized.
4. `04-simulation-running.png` shows Simulation advancement.
5. `05-depth-current-change.png` shows depth/current display changes without a relaunch.
6. `06-return-replan.png` shows return to Planning.
7. `07-second-launch.png` shows relaunch from the same planning state.
8. `08-main-menu-cleanup.png` shows renderer cleanup after returning to Main Menu.

## Launch Debug Object

Inspect `globalThis.ANCHOR_SIMULATION_LAUNCH_DEBUG` for launch status, stage timings, current counters, renderer counts, estimated current memory, warnings, and clean failure state.

## Release Boundary

Do not proceed to FLOW-R2B unless FLOW-R2A.1 launch checks remain green and human review confirms the screenshots are visually acceptable.