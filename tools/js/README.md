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
