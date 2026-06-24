# Repository Cleanup R2

## Scope

REPO-CLEAN-R2 is a maintenance pass. It changes validation ownership, Pages packaging, and documentation ownership records. It does not change bathymetry, currents, scalar processes, dive profiles, mission physics, scoring, schemas, public artifacts, runtime shell defaults, or supported mission workflows.

## Metrics

| Metric | R1 baseline | R2 current |
|---|---:|---:|
| tracked files | 1765 | 1765 |
| source files | 569 | 569 |
| Markdown docs | 255 | 224 |
| Playwright smoke profile | 15 | 15 |
| Playwright release profile | 58 | 48 |
| Playwright full nonvisual profile | 229 | 76 |
| Playwright visual profile | 12 | 12 |
| Pages files | 881 | 684 |
| Pages bytes | 28225773 | 21679928 |

## Test Architecture

- Capability matrix: `tests/e2e/capability_manifest.mjs`.
- Release profile target: 35-50 browser tests; current selection is capability-owned and explicit.
- Full profile target: <=120 nonvisual browser tests; current selection is bounded and excludes visual acceptance.
- Pure deterministic contracts remain in package/science Node gates; browser tests are kept for DOM, canvas, route, pointer, Pages, and lifecycle behavior.

## Documentation

- Canonical document ownership is summarized in `docs/history.md` and `docs/architecture.md`.
- Superseded visual acceptance records removed in this pass are listed in `node tools/maintenance/repo_declutter.mjs docs`.
- Large historical documentation is excluded from Pages unless it is current user-facing documentation or a browser-required example.

## Phaser and Legacy Source

- Active Phaser lifecycle, scene routing, and Learning Lab ownership remain intact.
- No active Phaser runtime or lab source is removed by R2.
- Deferred Phaser review candidates are classified by `node tools/maintenance/repo_declutter.mjs phaser`.

## Pages Policy

- Pages copies runtime source, packages, vendor runtime, CSS/assets, levels/missions/plans/tutorials/schemas, labs, and allowlisted current docs/examples.
- Pages excludes internal phase audits, visual acceptance reports, tests, owner-review artifacts, maintenance tools, and unreferenced large docs/examples.
