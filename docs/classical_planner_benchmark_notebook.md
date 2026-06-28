# Classical Planner Benchmark Notebook

COLAB-BENCH-R1.1 Closure adds a public 4D benchmark-data bundle and a two-stage Colab acceptance workflow. The notebook reconstructs, checks, visualizes, and plans from exported public data. Local ANCHOR packages remain the authoritative validator, simulator, and scorer.

ANCHOR Alpha is a deterministic, scientifically constrained research-and-education sandbox for investigating adaptive underwater-glider mission planning. It supports reproducible comparison of human, classical, and learning-based planners. It is not an operational ocean forecast or certified vehicle-navigation system.

Plan. Simulate. Compare. Learn.

## Authority Boundary

Colab proposes. ANCHOR validates. ANCHOR simulates. ANCHOR scores.

The Python notebook may inspect exported public fields and propose `anchor.plan` artifacts. It must not replace CODEC-R1 validation, mission simulation, or official scoring. The final acceptance report is authoritative only after `tools/js/finalize_colab_benchmark_acceptance.mjs` evaluates the returned Colab execution package locally.

Current local gate status is `LOCAL_PYTHON_EXECUTION_VERIFIED`: Python 3.14.6 executed the notebook support tests, all 15 Python tests passed, numerical parity had zero failed probes, and authoritative local ANCHOR finalization reproduced the checked-in A* official score `23.593559` with local acceptance digest `fnv1a32:9a73d341`.

Google Colab hosting smoke remains `PENDING` until a real hosted run returns `colab_execution_report.json`, `colab_execution_package.json`, and `reproducibility_manifest.json`, and those artifacts pass local finalization plus validation.

## Using The Notebook From ANCHOR

Use `Simulation Lab -> Researcher Quick Start -> External Solver Notebook` as the Alpha launchpad. It links the full benchmark notebook, starter notebook, public benchmark bundle, and local finalizer command.

The notebook proposes plans. ANCHOR validates, simulates, and scores them. Users do not need to download the full ANCHOR source repository for normal Alpha use.

When a public GitHub notebook URL is configured, the launchpad can open Google Colab in a new tab with the full notebook. If no public URL is configured, use the fallback workflow:

1. Download the full benchmark notebook or starter notebook.
2. Open `colab.research.google.com`.
3. Upload the notebook.
4. Upload or load the public benchmark bundle.
5. Run all notebook cells.
6. Export the returned plan/package.
7. Return to ANCHOR for authoritative validation, simulation, scoring, and final acceptance.

The default public bundle is `tests/fixtures/colab_benchmark/bundles/static_additive_routing.classical-planner-benchmark-bundle.json`. It is `PUBLIC / FORECAST_ONLY`, records `containsHiddenTruth=false`, and includes validation-baseline plus ScoreProfile identity. Environment Studio can also export reference-derived public benchmark bundles after the public reference bathymetry patch -> bathymetry artifact -> deterministic synthetic bathymetry-conditioned fields -> package-backed environment artifact -> validated Planning launch path validates. Hosted Google Colab smoke remains `PENDING` until the owner completes the real hosted run.

## Public Planning-Data Audit

1. Web Planning consumes public terrain/wet-land masks, hazards, forecast current frames, public scalar/ROI fields, starts/deployments, candidate nodes, mission geometry, validation metadata, and scoring metadata.
2. Classical planners consume the solver-packet planning projection: candidate nodes, starts, public forecast currents, public scalar/ROI values, visible hazards, grid geometry, and fairness metadata.
3. Public forecast data includes `planningData.visibleFields.forecast`, public scalar fields, public masks, compatibility bathymetry where the compact source lacks bathymetry, and mission geometry needed for planning.
4. Hidden truth includes `T_hiddenTruth`, private truth fields, raw oracle tensors, hidden event payloads, hidden simulator state, oracle-only objectives, and result-derived future information. These are excluded from default bundles.
5. Canonical source axes in the bundle are `eastAxisMeters`, `northAxisMeters`, `depthAxisMeters`, and `timeAxisSeconds`, with positive-down depth and seconds for time.
6. The compact benchmark bundle exports the complete public source grid represented by the solver packet. It does not silently downsample. When compact sources are depth-invariant or time-invariant, the bundle records that projection explicitly.
7. Current and scalar fields are exported as declared public source grids with shape `time -> depth -> north -> east`. Some fixtures have one source depth or one source time; the shape records that honestly.
8. Integrated summaries remain metadata or solver-packet compatibility projections. They are not described as depth-specific fields unless the source declares depth-specific data.
9. Digests are separate: `environmentDigest` identifies the parent environment, `publicProjectionDigest` identifies the exact planner-visible public projection, `solverPacketDigest` identifies the compact solver packet, `benchmarkBundleDigest`/`payloadDigest` identify the complete notebook bundle, and field digests identify individual exported fields.

Do not claim parity against hidden internal truth when the planner receives only public forecast data. Reference-derived Environment Studio bundles are deterministic synthetic benchmark artifacts conditioned by public reference bathymetry; they are not operational forecast products or calibrated ocean validation datasets.

## Bundle Contract

The public bundle type is `anchor.classical-planner-benchmark-bundle` with `schemaVersion=1.0.0`.

It includes:

- `environmentDigest`, `publicProjectionDigest`, `missionDigest`, and `solverPacketDigest`
- coordinate frame, horizontal units, positive-down depth convention, and time convention
- `eastAxisMeters`, `northAxisMeters`, `depthAxisMeters`, and `timeAxisSeconds`
- bathymetry as a 2.5D bottom-depth surface with explicit layout and masks
- `wetMask` and `landMask`
- current U/V/W arrays with layout `time->depth->north->east->[uEastMetersPerSecond,vNorthMetersPerSecond,wDownMetersPerSecond]`
- scalar fields with layout `time->depth->north->east`
- mission geometry, candidate nodes, parity probes, field roles, source metadata, validation baseline, and score profile metadata
- `visibilityClass=PUBLIC`, `fairnessClass=FORECAST_ONLY`, and `containsHiddenTruth=false`

For compact source fixtures, compatibility bathymetry is labeled `publicCompatibilityProjection` and must not be treated as calibrated bathymetry. Depth-invariant top-down forecast fields may be expanded across declared public depths only with explicit source metadata.

Visual agreement is an inspection aid. Canonical digests and numerical sample agreement are the authoritative parity evidence.

## Python Bundle Support

`tools/python/anchor_benchmark/bundle.py` provides reference data-inspection helpers:

- load and validate public benchmark bundles
- reconstruct nested arrays, with optional NumPy arrays when NumPy is available
- validate axes, shapes, masks, finite values, payload digest, and hidden-truth markers
- sample bathymetry, current vectors, and scalar values with declared exported-field semantics
- validate parity probes covering grid points, horizontal interpolation, depth interpolation, time interpolation, masks, near-bottom, and below-bottom cases
- build `anchor.colab-execution-report` and `anchor.colab-execution-package`

These helpers are not an ANCHOR simulator, scorer, or mission runtime.

## Notebook Acquisition Modes

The notebook supports:

- `bundle_upload`: upload `anchor.classical-planner-benchmark-bundle.json` in Colab. This is the recommended acceptance mode.
- `checked_in_bundle`: load `tests/fixtures/colab_benchmark/bundles/static_additive_routing.classical-planner-benchmark-bundle.json` from a repository checkout.
- `static_url`: download the public bundle from a configured static or Pages base URL.
- `checked_in_fixture` and `upload`: legacy compact solver-packet fallback modes for compatibility.

The setup cell is labeled `COLAB ACCEPTANCE SETUP`. It detects Colab, creates output directories, reports Python and optional library versions, reports whether Node is available, and continues without Node.

## Exported Data Integrity and Web-App Parity

The notebook section titled `Exported Data Integrity and Web-App Parity` uses the public 4D bundle when available. It checks:

- artifact metadata and coordinate frame
- axes and shapes
- bathymetry and masks
- current depth/time coverage
- scalar depth/time coverage
- mission geometry
- field digests and public projection digest
- numerical parity probes

Notebook plots inspect exported public arrays directly. They show bathymetry, current magnitude/quiver slices, scalar slices, and vertical profile tables for all available source depths and times up to three each. Text/table alternatives are printed when plotting libraries are unavailable.

## Colab Execution Outputs

The notebook writes:

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
  colab_execution_report.json
  colab_execution_package.json
```

`colab_execution_report.json` has type `anchor.colab-execution-report`. `colab_execution_package.json` has type `anchor.colab-execution-package`.

If Node is unavailable in Colab, the report must set:

```text
officialEvaluationStatus: PENDING_LOCAL_ANCHOR_REFEREE
```

That is not a failure. It is the expected handoff state before local ANCHOR finalization.

## Local Finalization

After receiving the Colab execution package, run:

```bash
node tools/js/finalize_colab_benchmark_acceptance.mjs anchor_benchmark_output/colab_execution_package.json
npm.cmd run validate:colab-acceptance -- anchor_benchmark_output/colab_acceptance_report.json
```

The finalizer decodes the package, validates plans, resolves the matching solver packet, runs the canonical ANCHOR evaluator, preserves ScoreProfile and ScoreResult identities, checks the static A* official score `23.593559`, and writes `anchor.colab-benchmark-acceptance`.

## Exact Acceptance Workflow

1. Open the benchmark notebook in Google Colab.
2. Restart the runtime.
3. Select `FORECAST_ONLY`.
4. Use the checked-in/public benchmark bundle.
5. Enable acceptance mode.
6. Run all cells.
7. Confirm the notebook ends with: `COLAB EXECUTION: PASS`.
8. Download:
   - `colab_execution_report.json`
   - `colab_execution_package.json`
   - `reproducibility_manifest.json`
9. Place or upload the files for local ANCHOR finalization.
10. Run: `node tools/js/finalize_colab_benchmark_acceptance.mjs <package>`.
11. Run: `npm.cmd run validate:colab-acceptance -- <final-report>`.

Do not say Colab verification is complete until steps 1-11 have actually run.

## Planner Algorithms

Implemented notebook planners:

- Dijkstra / uniform-cost search
- A*
- Weighted A*
- greedy value per predicted cost
- beam search
- time-expanded A*
- exact bounded small-instance oracle

An exact result is exact only for the stated candidate set, state representation, objective, and discretization.

## Local Checks

When Node is available, run:

```bash
npm.cmd run export:colab-benchmark-bundles
node tools/js/audit_colab_classical_benchmark.mjs
```

When a real Python interpreter is available, run:

```bash
python -m unittest tools/python/tests/test_anchor_benchmark.py
```

The Windows Store Python alias is not a usable interpreter for this gate.

## Scientific Limitations

The fixtures are deterministic synthetic benchmark data. They support reproducible education, algorithm comparison, and exported-data inspection. They do not establish operational forecast accuracy, certified vehicle navigation, hydrodynamic skill, ecological forecast validity, or calibrated ocean forecasting.
