# Headless Solver Packet Roundtrip

H3.1 normalizes the browser/headless solver workflow:

```text
solver packet -> submitted plan -> Node/OceanBox-JS episode -> bundle -> browser viewer -> Colab analysis
```

The canonical report type is `anchor.headless.solver-roundtrip-report`. Loaders also accept the H3 legacy alias `anchor.headless.roundtrip-report`. A combined roundtrip bundle uses `anchor.headless.solver-roundtrip-bundle`, and the browser viewer can export `anchor.browser.headless-roundtrip-summary`.

## Commands

Validate the packet:

```bash
node tools/js/headless_oceanbox.mjs validate-solver-packet --solver-packet docs/examples/headless_solver_packet.example.json
```

Validate a submitted plan against the packet mission/glider context:

```bash
node tools/js/headless_oceanbox.mjs validate-plan --solver-packet docs/examples/headless_solver_packet.example.json --plan docs/examples/headless_solver_plan.example.json
```

Run the public roundtrip:

```bash
node tools/js/headless_oceanbox.mjs roundtrip --solver-packet docs/examples/headless_solver_packet.example.json --plan docs/examples/headless_solver_plan.example.json --out runs/h3-roundtrip --combined-json --no-hidden-export
```

The older wrapper remains valid:

```bash
node tools/js/headless_roundtrip.mjs docs/examples/headless_solver_packet.example.json docs/examples/headless_solver_plan.example.json --out runs/h3-roundtrip
```

## Checked-In Examples

The deterministic examples live in `docs/examples/`:

- `headless_solver_packet.example.json`
- `headless_solver_plan.example.json`
- `headless_solver_roundtrip_report.example.json`
- `headless_solver_roundtrip_bundle.example.json`

Regenerate them with:

```bash
node tools/js/generate_headless_solver_roundtrip_examples.mjs
```

The public examples omit hidden field export, keep `T_hiddenTruth` out of solver-visible fields and browser summary artifacts, and mark headless scoring as educational. Browser ANCHOR remains the official visual referee and scoring UI. This workflow does not add a route planner, Python simulator, backend, calibrated ocean forecast, or MARL/RL.
## P9 Science Diagnostics

Roundtrip reports may include `scienceDiagnosticsSummary`, and roundtrip bundles may include `scienceDiagnostics` / `science_diagnostics.json`. These summaries distinguish forecast correction from hidden-event hypotheses for browser and Colab inspection. They are public-safe, omit `T_hiddenTruth`, and do not change the submitted-plan execution or score.

## P10 Adaptive Science-Diagnosis Handoff

Science diagnosis informs the mission-manager objective recommendation. It does not generate a route. Forecast correction means the expected field existed but was wrong. Hidden event hypothesis means observations may indicate a phenomenon not represented in the forecast. The player or solver still plans the route.

P10 adds adaptive science-diagnosis context, mission-manager rationale, next-leg handoff metadata, objective-history display fields, and public-safe headless/browser summaries. It does not implement a new planner, scoring redesign, production data assimilation, GP/GMRF production inference, calibrated ocean forecast, Python simulator, or MARL/RL. Node/OceanBox-JS remains the canonical non-browser runtime; Python/Colab analyze artifacts or call Node.