# JavaScript Headless Solver Tools

These optional Node.js tools run outside the browser and import portable ANCHOR core modules. They do not import Phaser, DOM UI, panels, buttons, or browser scenes.

```bash
node tools/js/headless_solver.mjs anchor.solver-packet.json anchor.plan.json
```

Sample repository packet:

```bash
node tools/js/headless_solver.mjs tools/js/examples/sample_solver_packet.json anchor.plan.json
node tools/js/headless_validate_plan.mjs tools/js/examples/sample_solver_packet.json anchor.plan.json
```

Optional flags:

```bash
node tools/js/headless_solver.mjs anchor.solver-packet.json anchor.plan.json --planner greedy
node tools/js/headless_solver.mjs anchor.solver-packet.json anchor.plan.json --debug
node tools/js/headless_solver.mjs anchor.solver-packet.json anchor.plan.json --oracle
```

Default mode is fair forecast-visible planning:

```json
{
  "usesForecast": true,
  "usesTruth": false,
  "usesOracle": false
}
```

`--oracle` must be explicit. Oracle-assisted outputs are labeled with `usesTruth: true` and `usesOracle: true` and should be used only for benchmarking/research.

To validate a generated plan with the same portable pre-simulation route checks used by the game:

```bash
node tools/js/headless_validate_plan.mjs anchor.solver-packet.json anchor.plan.json
```

This validation is still not the official score. ANCHOR browser import and simulation remain authoritative:

```text
Node proposes. Game validates. Game simulates. Game scores.
```

The Node tools are useful for CI-style contract checks and external solver prototyping. They do not replace browser Debrief, leaderboard scoring, stochastic replay, or route-failure recovery UI.

## OceanBox-JS Headless Runtime

H1 adds a deterministic Node runtime and CLI:

```bash
node tools/js/headless_oceanbox.mjs simulate --seed demo-001 --out tmp/oceanbox-js-demo
node tools/js/headless_oceanbox.mjs simulate --seed demo-001 --out tmp/oceanbox-js-public --no-hidden-export
```

Node headless runtime over portable ANCHOR core logic. Browser ANCHOR remains the official visual referee and scoring UI. This runtime writes JSON/CSV bundles for Colab-style analysis; it is not a Python simulator, a new planner, calibrated ocean forecast, or MARL/RL environment.

## H2 Browser Bundle Loader

Use `--combined-json` to write `bundle.json`, then open Simulation Lab / Headless Bundle Viewer to inspect the bundle and export `anchor.browser.headless-bundle-summary`:

```bash
node tools/js/headless_oceanbox.mjs simulate --seed demo-001 --out tmp/oceanbox-js-public --no-hidden-export --combined-json
```

The viewer is browser-side inspection only; it is not official scoring and not a Python simulator.

## H2.1 Example Bundle Fixtures

Regenerate the checked-in public and oracle/debug example bundles with:

```bash
node tools/js/generate_headless_example_bundles.mjs
```

The script writes `docs/examples/headless_oceanbox_js_public_bundle.example.json` and `docs/examples/headless_oceanbox_js_bundle.example.json`, verifies that the public fixture omits hidden truth, and verifies that the debug fixture marks hidden fields as hidden/oracle/debug. Run `smoke_headless_example_bundle_fixture.mjs` and `smoke_headless_browser_fixture_roundtrip.mjs` after fixture changes.
