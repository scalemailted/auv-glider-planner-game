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
node tools/js/headless_oceanbox.mjs roundtrip --solver-packet docs/examples/headless_solver_packet.example.json --plan docs/examples/headless_solver_plan.example.json --out runs/h3-roundtrip --depth-layers surface,thermocline,deep --dive-profile sawtoothProfile --combined-json --no-hidden-export
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

## P11 Water-Column Roundtrip

Solver packets may include `waterColumnConfig`, and submitted plans may include optional `diveProfileId` at the plan, agent-plan, or waypoint level. Older plans without depth metadata remain valid and normalize to the default 2.5D profile.

Roundtrip reports include `waterColumnSummary`; combined roundtrip bundles include `waterColumnSummary` and `depthLayerPrioritySummary`. Public roundtrips still omit hidden fields and keep hidden truth out of solver-visible artifacts. P11 adds depth-layer sampling context only; it does not add full 3D planning, a new planner, production data assimilation, Python simulation, calibrated vertical ocean modeling, or MARL/RL.

## MOTION-R1 Motion-Aware Roundtrip

Solver-packet roundtrips can opt into motion-aware execution. Old plans remain valid; plans may additionally provide `desiredSpeedThroughWater`, `diveProfileId`, `sampleIntervalSeconds`, `surfaceAtEnd`, or `motionIntent`. Reports may include `motionSummary`, `missionFeasibilitySummary`, `plannedVsRealized`, `motionDiagnostics`, and `motionModelId`. The roundtrip still executes a submitted plan through Node/OceanBox-JS; it does not add a route planner, WebGPU fluid runtime, Python simulator, official browser scoring, or MARL/RL.

ENV-R1 roundtrip bundles may include public-safe `bathymetrySummary` and `missionGeometrySummary`; they do not expose hidden truth arrays and do not change browser official scoring.

## SIM-R1 Feasibility Roundtrip Target

Motion-aware roundtrip reports can attach mission-feasibility summaries for the submitted plan. SIM-R1 now supports optional simulator-derived cost graph / adjacency matrix exports for mission duration, distance traveled, energy/battery, payload/sensor cost, planned vs realized trajectory, waypoint arrival status, bathymetry/depth warnings, and surfacing/communication events. These support solver benchmarking, not route generation, official browser scoring replacement, Python simulation, or calibrated ocean forecasting. See `docs/mission_feasibility_simulator_requirements.md`.

## SIM-R1 Motion Cost Graph Roundtrip

Roundtrip commands accept the same `--cost-graph` and `--cost-matrix-format` options as simulation. Public roundtrip bundles may include `motionCostGraph`, `motionCostMatrix`, `motionCostGraphSummary`, and `motionCostMatrixSummary`. These artifacts inspect public-safe directed/asymmetric motion costs. They do not choose a route, optimize waypoints, expose hidden truth, replace browser scoring, add a Python simulator, or implement MARL/RL.
## SCORE-R1 Shadow Mission Outcome Scoring

SCORE-R1 is shadow benchmark scoring. It does not replace official browser scoring, Challenge Mode scoring, leaderboard ranking, or existing debrief totals. Profiles are objective-aware and versioned; missing data is explicit; regret requires a compatible reference, and best-known attempt does not mean optimal. The Node/OceanBox-JS runtime remains the canonical headless runtime. Python/Colab analyzes exported artifacts or invokes Node; no Python simulator, planner, optimizer, MARL/RL, operational certification, SeaExplorer validation, or calibrated ocean forecast is added.

See [Mission Scoring and Regret](mission_scoring_and_regret.md) for the SCORE-R1 artifact contract and boundaries.

## H4.1 Replay Roundtrip Verification

Roundtrip bundles can be verified with `node tools/js/headless_oceanbox.mjs verify-replay --bundle <bundle.json> --report <report.json>`. H4.1 verification emits stable issue codes and remains public-state playback only; it does not add a solver, planner, Python simulator, or authoritative hidden-truth resimulation.
