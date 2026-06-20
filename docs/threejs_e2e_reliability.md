# Three.js E2E Reliability

THREE-R1.2A.4.2 closes the renderer stabilization pass with package-local Playwright scripts, focused performance/usability tests, and a static-server cleanup smoke.

## Commands

Use the package-local CLI through npm scripts:

```bash
npm.cmd run test:e2e
npm.cmd run test:e2e:focused
npm.cmd run test:e2e:headed -- --grep "Three Mission Interaction Performance Invariants|Three Sampling Target and Dive Planning Headed Workflow"
```

The ordinary `test:e2e` command must not depend on a globally installed Playwright binary.

## Focused Tests

- `Three Mission Interaction Performance Invariants`
- `Three Sampling Target and Dive Planning Headed Workflow`

These tests use visible UI and real pointer input. Debug APIs are used for assertions and non-state-changing performance-window reset/refresh only.

Current focused results from 2026-06-20:

| Command | Result | Notes |
|---|---|---|
| `npm.cmd run test:e2e:focused` | PASS, 2 tests, 2.7m | Headless Chromium; validates camera invariant and simulation workflow. |
| `node ./node_modules/@playwright/test/cli.js test tests/e2e/smoke.spec.js --grep "Three Mission Interaction Performance Invariants|Three Sampling Target and Dive Planning Headed Workflow" --headed --reporter=line --workers=1` | PASS, 2 tests, 49.8s | Headed Chromium; validates visible UX path and screenshots. |

The sampling-target workflow deploys all required mission gliders before Execute. This preserves execution validation instead of bypassing multi-agent deployment requirements.


## Grouped Full-Suite Evidence

| Group | Tests | Result | Duration |
|---|---:|---|---:|
| Labs, benchmark, headless bundle, campaign | 9 | PASS | 5.1m |
| Continuous mission, sampling targets, performance | 15 | PASS | 9.6m |
| Workspace, pointer planning, scenario setup | 12 | PASS | 3.1m |
| Execution, water column, cleanup, simulation parity | 11 | PASS | 4.4m |

The grouped commands use `node ./node_modules/@playwright/test/cli.js` directly and `--grep` expressions over `tests/e2e/smoke.spec.js`; they do not require a global Playwright install.
## Static Server

`tools/js/smoke_e2e_static_server_cleanup.mjs` starts the local static server, verifies `index.html`, closes the server, confirms the port is released, and starts/stops it a second time. It must not kill unrelated processes.

## Current Reliability Policy

A full-suite result is authoritative only when `npm.cmd run test:e2e` completes with pass/fail output. In this pass, the monolithic command timed out after 15 minutes without pass/fail output. The same 47-test file was then run as four grep-based groups with explicit results: 9/9 pass, 15/15 pass, 12/12 pass, and 11/11 pass. Treat the grouped result as the current reliability evidence, and treat the monolithic command timeout as a remaining tooling limitation.

Human manual QA by the project owner remains pending.
## THREE-R1.2A.4.3 Grouped E2E Authority

`npm.cmd run test:e2e` now invokes `node tools/js/run_playwright_groups.mjs`. The runner first executes `tools/js/audit_playwright_group_coverage.mjs`, which uses package-local Playwright `--list` and fails if any test is unassigned or assigned to multiple groups. Grouped E2E is full coverage only when that audit passes.

`npm.cmd run test:e2e:monolithic` remains available as a diagnostic raw Playwright run. `npm.cmd run test:e2e:list` prints the current Playwright inventory. Focused diagnostics can still pass `--grep` through `npm.cmd run test:e2e -- --grep "..."`.

Human manual QA by the project owner remains separate from headed automated QA and remains pending.
