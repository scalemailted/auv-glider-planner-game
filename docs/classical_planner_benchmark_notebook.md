# Classical Planner Benchmark Notebook

COLAB-BENCH-R1 adds a reproducible external notebook workflow for transparent classical planner comparison.
COLAB-BENCH-R1.1 adds exported-data parity probes, acceptance-report generation, and a Node validator for real notebook outputs. Static audits, browser delivery, and Node interoperability are useful preflight checks, but they are not substitutes for executing the notebook in Python/Colab.

Classical planners propose plans using a declared planning representation.
ANCHOR validates, simulates, and scores those plans using the same canonical
packages used by the browser and headless runtime.

An exact result is exact only for the stated candidate set, state
representation, objective, and discretization.

## Authority Boundary

Colab proposes.
ANCHOR validates.
ANCHOR simulates.
ANCHOR scores.

The Python notebook may approximate graph costs while searching. It may not approximate or replace the official final result. Final benchmark evaluation must flow through CODEC-R1 plan validation and the existing ANCHOR headless/browser referee path.

## Current Workflow Audit

| Responsibility | Current owner | Notebook need | R1 action |
|---|---|---|---|
| Solver-packet authority | ANCHOR export and `schemas/solver-packet.schema.json` | Load uploaded, checked-in, or public solver packets | Added validation and fixture loading in `tools/python/anchor_benchmark/io.py` and the notebook |
| Candidate-node authority | Notebook-declared planning representation from solver-visible fields | Stable candidate IDs, coordinates, source reasons, values | Added deterministic candidate construction in `graph.py` |
| Graph-edge authority | Notebook approximation only | Transparent cost terms and units | Added distance/current/hazard/value cost adapter with documented terms |
| Route-cost approximation | Notebook support package | Planner search guidance, not official outcome | Notebook states search costs are approximate |
| Segment-profile metadata | `anchor.plan` and mission runtime | Preserve waypoint-as-horizontal-destination semantics | Plan export writes segment/profile metadata without free-flight XYZ planning |
| Plan export authority | CODEC-R1 plan schema and ANCHOR imports | Produce valid `anchor.plan` artifacts | Added `exports.py` and checked-in A* plan fixture |
| Plan validation authority | ANCHOR Node/browser validators | Validate submitted plans after export | Notebook and evaluator call existing Node validation/runtime paths |
| Simulator authority | `packages/mission-simulator` through ANCHOR runtime | No Python simulator | Python package contains no simulation engine |
| Score authority | `packages/scoring` through ANCHOR runtime | Official score only from ANCHOR | Evaluator wraps the authoritative headless roundtrip and score report |
| Benchmark-record authority | CODEC-R1 benchmark record kind | Store planner, search, artifact, and outcome metadata | Added Python and Node benchmark-record builders |
| Fairness metadata | Solver packet, plan, codec visibility/fairness classes | Default forecast-only and explicit oracle labeling | Fixtures and notebook default to `FORECAST_ONLY` |
| Existing duplicated solver logic | Starter greedy Python example | Keep starter simple and add reusable benchmark helpers | Existing template remains; new notebook imports `anchor_benchmark` |
| Existing notebook limitations | Starter external solver template | Multi-planner comparison, exact small cases, timing, visualization | Added comprehensive benchmark notebook |
| Python/Node bridge limitations | Node is canonical non-browser runtime | Call Node when repo is available; skip honestly otherwise | Notebook reports skipped Node/Python gates instead of fabricating results |

## Data Acquisition

The notebook supports three paths:

- `checked_in_fixture`: load compact deterministic fixtures from `tests/fixtures/colab_benchmark/`.
- `upload`: upload an exported `anchor.solverPacket` in Colab.
- `static_url`: fetch a public fixture from a user-configured Pages/static base URL.

No private local path is hardcoded.

## Exported Data Integrity And Web-App Parity

The notebook section titled `Exported Data Integrity and Web-App Parity` reconstructs only solver-visible public data and samples it numerically before planner execution. Visual agreement is an inspection aid. Canonical digest and numerical sample agreement are the authoritative parity evidence.

The current compact solver-packet fixtures expose public terrain/wet-land masks, hazard grids, forecast current frames, forecast scalar/ROI frames, mission geometry, candidate nodes, deployment/start metadata, visibility/fairness metadata, and validation/scoring metadata. They do not expose hidden truth. They also do not expose calibrated bathymetry arrays or full depth-resolved 4D current/scalar cubes; depth metadata is present only where the fixture declares it. A richer benchmark bundle remains future work for full depth/time field parity.

Each COLAB-BENCH-R1.1 fixture includes `parityProbes` with fixed x/y/depth/time sample expectations. The Python notebook validates those probes from the solver-visible packet, writes `tables/parity_probe_results.json`, `tables/parity_table.json`, and includes the result in `colab_acceptance_report.json`.

After a real notebook run, validate the exported acceptance report from the repository root:

```bash
node tools/js/validate_colab_benchmark_acceptance.mjs anchor_benchmark_output/colab_acceptance_report.json
```

The report is accepted only when it records `status=PASS`, the expected validation baseline digest, forecast-only default fairness, official ANCHOR evaluation metadata, no hidden-truth leakage, successful parity probes, and stable artifact digests.

## Artifact Versions

The R1 fixtures use:

- solver packet: `type=anchor.solverPacket`, `schemaVersion=2.0`
- plan: `type=anchor.plan`, `schemaVersion=2.0`
- benchmark run record: `type=anchor.benchmark.run-record`, `schemaVersion=benchmark-run-record-p2`
- validation baseline digest: `fnv1a32:dd016175`

## Fairness Classes

The notebook recognizes:

- `FORECAST_ONLY`
- `BELIEF_AWARE`
- `PUBLIC_OBSERVATION_ONLY`
- `ORACLE_HIDDEN_TRUTH`

Default execution is `FORECAST_ONLY`. Hidden truth is excluded from fixtures and is rejected unless the user explicitly enables oracle/debug behavior. Oracle-assisted records must be separated from forecast-only records in comparison tables.

## Candidate Discretization

Candidate nodes may come from explicit solver-packet hints or visible ROI/science hotspots. Invalid terrain, hazards, duplicates, and out-of-domain points are removed. Candidate discretization constrains the search space and therefore constrains every optimality claim.

## Graph Costs

R1 planning costs are declared approximations. Terms include:

- horizontal distance in meters;
- visible forecast current opposition;
- visible hazard risk;
- visible science/ROI value credit.

These costs guide plan construction. They are not the official simulator transition model and do not define official score.

## Planner Algorithms

Implemented planners:

- Dijkstra / uniform-cost search;
- A*;
- Weighted A*;
- greedy value per predicted cost;
- beam search;
- time-expanded A*;
- exact bounded small-instance oracle.

Dijkstra is exact for the declared nonnegative graph. A* is exact when its heuristic is admissible on the same graph. Weighted A*, greedy, and beam search are heuristic unless a separate proof is supplied. Time-expanded A* is exact only for declared time bins and assumptions. The small oracle is exact only over its bounded candidate set, route depth, objective, and discretization.

## Timing Methodology

Planner solve time is recorded separately from:

- data loading;
- graph construction;
- plan encoding;
- ANCHOR validation;
- ANCHOR simulation;
- ANCHOR scoring;
- notebook visualization.

Timing uses monotonic clocks and repeated summaries where available. Colab timing should be treated as shared-runtime evidence, not a definitive performance benchmark.

## Authoritative Evaluation

The Node evaluator `tools/js/evaluate_colab_benchmark_plan.mjs`:

1. codec-validates the solver packet and submitted plan;
2. calls the existing headless solver-packet roundtrip;
3. exports a public headless bundle and roundtrip report;
4. writes a benchmark run record;
5. suppresses hidden truth unless explicitly requested.

It does not generate a plan, implement simulation, or implement scoring.

## Score Interpretation

A planner's benchmark result is meaningful only with its environment digest, mission digest, fairness class, simulator version, scoring profile, and validation baseline.

Planner identity is metadata. It must not alter official score.

## Visualization

The notebook provides optional `matplotlib` views for:

- environment overview;
- visible current field;
- scalar/science field;
- candidate routes;
- vertical profile table.

Charts require titles, labels, units, and table/text alternatives. Three.js/browser rendering remains visualization only; it does not create canonical science values.

## Reproducibility

The notebook exports:

```text
anchor_benchmark_output/
  plans/
  results/
  benchmark_records/
  figures/
  tables/
  benchmark_summary.json
  benchmark_results.csv
  reproducibility_manifest.json
```

The reproducibility manifest records notebook version, repository commit when available, Python/Node versions, validation baseline digest, solver-packet/environment/mission digests, score profile metadata, planner seeds, planner parameters, benchmark-record digests, fairness classes, and generated artifact paths.

COLAB-BENCH-R1.1 also exports:

```text
anchor_benchmark_output/
  colab_acceptance_report.json
  tables/
    public_environment_summary.json
    parity_probe_results.json
    parity_table.json
```

`colab_acceptance_report.json` is the required handoff artifact for marking the Colab execution gate as verified. If Python/Colab has not executed the notebook, the correct project status is `BLOCKED_WAITING_FOR_COLAB_EXECUTION`.

## Colab Execution

The notebook can run from checked-in fixtures without network access when the repository is present. In Colab, users can upload solver packets or configure a public static fixture URL. `google.colab.files.download` is used only behind guarded imports.

## Local Execution

When Python is available, run:

```bash
python -m unittest tools/python/tests/test_anchor_benchmark.py
python -m tools.python.anchor_benchmark.cli --solver-packet tests/fixtures/colab_benchmark/static_additive_routing_solver_packet.json --out anchor_benchmark_output
```

When Node is available, run:

```bash
node tools/js/evaluate_colab_benchmark_plan.mjs --solver-packet tests/fixtures/colab_benchmark/static_additive_routing_solver_packet.json --plan tests/fixtures/colab_benchmark/plans/static_additive_astar.anchor.plan.json --out tmp/colab-benchmark-eval
node tools/js/audit_colab_classical_benchmark.mjs
```

## Scientific Limitations

The R1 fixtures are synthetic and deterministic. They support reproducible education and benchmark comparison. They do not establish operational forecast accuracy, certified vehicle navigation, SeaExplorer validation, hydrodynamic skill, or ecological forecast validity.

## Starter Template Compatibility

The existing `tools/python/notebooks/anchor_external_solver_template.ipynb` remains the starter notebook: one readable greedy baseline and import loop.

The new `tools/python/notebooks/anchor_classical_planner_benchmark.ipynb` is the comprehensive benchmark notebook: multiple algorithms, exact bounded cases, timing, official evaluation, visualization, benchmark records, and reproducibility artifacts.
