# ANCHOR Alpha Release

ANCHOR Alpha is a deterministic, scientifically constrained research-and-education sandbox for investigating adaptive underwater-glider mission planning. It supports reproducible comparison of human, classical, and learning-based planners. It is not an operational ocean forecast or certified vehicle-navigation system.

Plan. Simulate. Compare. Learn.

## Intended Users

Player / Student:

- plan missions;
- inspect currents and depth-dependent science;
- execute glider routes;
- replan at surfacing;
- compare outcomes;
- learn why a plan succeeded or failed.

Researcher / Instructor:

- inspect scientific methods and limitations;
- export solver packets and public benchmark bundles;
- run classical planners externally;
- import candidate plans;
- evaluate every plan with the canonical ANCHOR referee;
- reproduce scores, metrics, versions, and digests.

Both audiences use the same canonical environment, simulator, scoring, codec, and validation packages.

## Guided First Mission

From Product Hub, use `Start Alpha Tour`, then choose `Play a Guided Mission`.

The guided path uses the existing tutorial and mission workspace controls. It teaches deployment, surface waypoints, incoming-segment dive profiles, target layers/depths, predicted 3D paths, currents at depth, execution, realized sampling, surfacing decisions, replanning, and Debrief interpretation. Guidance can be skipped and resumed from Product Hub without changing scientific state.

## Researcher Workflow

From Product Hub, open `Simulation Lab`, then `Researcher Quick Start`.

The workflow is:

1. Select the Alpha Research Benchmark.
2. Review `FORECAST_ONLY` fairness.
3. Export a solver packet or public benchmark bundle.
4. Download the starter or full classical-planner notebook.
5. Run the planner outside the browser.
6. Import the returned `anchor.plan`.
7. Let ANCHOR validate, simulate, score, and export provenance.

Status:

- Local Python Execution: `VERIFIED`
- Authoritative ANCHOR Finalization: `VERIFIED`
- Pages Notebook Delivery: `VERIFIED`
- Google Colab Hosting Smoke: `PENDING`
- Local acceptance digest: `fnv1a32:9a73d341`
- Checked-in A* official score: `23.593559`

Colab proposes. ANCHOR validates. ANCHOR simulates. ANCHOR scores.

## Using The External Solver Notebook

From `Simulation Lab -> Researcher Quick Start`, use the `External Solver Notebook` launchpad. The notebook proposes plans. ANCHOR validates, simulates, and scores them.

Users do not need to download the full ANCHOR source repository for normal Alpha use. The launchpad provides:

- the full benchmark notebook;
- the starter notebook;
- the public benchmark bundle;
- the local ANCHOR finalizer command;
- status for local Python execution, ANCHOR finalization, hosted Google Colab smoke, and `FORECAST_ONLY` fairness.

If a public GitHub notebook URL is configured, the Colab button opens Google Colab in a new browser tab. If it is not configured, use the fallback workflow: download the notebook, open `colab.research.google.com`, upload the notebook, upload or load the public benchmark bundle, run all cells, export the plan/package, and return to ANCHOR for official validation, simulation, and scoring.

The public bundle shown in the launchpad is `tests/fixtures/colab_benchmark/bundles/static_additive_routing.classical-planner-benchmark-bundle.json`. It is `PUBLIC / FORECAST_ONLY`, records `containsHiddenTruth=false`, and carries validation-baseline and ScoreProfile identity.

## Google Colab Hosted Smoke Owner Checklist

Codex cannot mark hosted Google Colab as verified without a real authenticated hosted runtime. The owner-run checklist is:

1. Open the distributed notebook through the Pages URL template: `https://<owner>.github.io/<repo>/tools/python/notebooks/anchor_classical_planner_benchmark.ipynb`.
2. Start a fresh Google Colab runtime.
3. Use the `FORECAST_ONLY` benchmark mode.
4. Load `tests/fixtures/colab_benchmark/bundles/static_additive_routing.classical-planner-benchmark-bundle.json`.
5. Run all cells from a clean runtime.
6. Confirm the final visible status text is `FINAL_VISIBLE_EXECUTION_PASS`.
7. Download `colab_execution_report.json` and `colab_execution_package.json`.
8. Run local ANCHOR finalization:

```powershell
npm.cmd run finalize:colab-acceptance
```

9. Run local acceptance validation:

```powershell
npm.cmd run validate:colab-acceptance
npm.cmd run audit:colab-benchmark
```

Expected identities remain: official score `23.593559`, local acceptance digest `fnv1a32:9a73d341`, and hosted smoke `PENDING` until the owner records the hosted result.

## Methods And Validation

Use Product Hub `Methods & Validation` for the current evidence baseline. The Alpha release surfaces the official validation baseline instead of defining a new validity score:

- baseline id: `sci-valid-r2a-pre-alpha-baseline`
- baseline digest: `fnv1a32:dd016175`
- report count: `9`
- current status summary: `PASS=90`, `WARN=1`, `NOT_EVALUATED=5`

This evidence supports deterministic software behavior, numerical checks, physical-plausibility checks, and explicit limitations. It does not certify operational ocean prediction or vehicle navigation.

## Known Limitations

ANCHOR Alpha is a controlled external pilot. Current limitations include:

- deterministic synthetic benchmark environments;
- no operational ocean forecast;
- no certified vehicle navigation or vehicle command;
- no calibrated named-region prediction;
- external-comparison and operational-validation gaps;
- browser/device performance limits;
- exact-oracle notebook limits bounded to declared graph, objective, candidate set, and discretization;
- Google Colab hosting smoke remains pending until a real hosted `Run all` is completed.

## External Pilot Task Tracks

Student / Player Track:

1. Complete onboarding.
2. Complete Guided Mission.
3. Explain why the selected dive profile was used.
4. Inspect two current depth layers.
5. Resolve one surfacing decision.
6. Interpret the final score.
7. Identify one confusing control.
8. Export a feedback package.

Researcher / Instructor Track:

1. Inspect Methods & Validation.
2. Identify one physically plausible claim and one not-yet-evaluated claim.
3. Export a public benchmark bundle.
4. Download the benchmark notebook.
5. Import the checked-in external plan.
6. Reproduce the official result.
7. Inspect planner provenance and fairness class.
8. Export a benchmark/diagnostic package.
9. Identify one reproducibility or scientific concern.

No pilot participant is required to reveal personal information. Feedback packages are downloaded locally and are not transmitted automatically.

## Pilot Feedback Classification

Use the existing feedback categories and map them to roadmap severity or concern tags:

- `P0`: Application cannot load, mission cannot complete, data corruption, hidden-truth leak, or authoritative result mismatch.
- `P1`: Serious incorrect behavior, major scientific misrepresentation, major accessibility blocker, or reproducibility failure.
- `P2`: Significant usability, teaching, performance, or workflow friction.
- `P3`: Polish, preference, wording, or minor layout concern.
- `SCI`: Model, scientific assumption, evidence, units, or claim concern.
- `EDU`: Teaching sequence, terminology, explanation, or misconception concern.
- `BENCH`: Artifact, fairness, notebook, timing, plan import, or result parity concern.
- `UX`: Navigation, discoverability, layout, interaction, or workflow-friction concern.
- `OPS`: Pilot operations, feedback intake, checklist, release, or support process concern.
- `PERF`: Rendering, boot, frame timing, memory, or resource-lifecycle concern.
- `ACCESS`: Keyboard, focus, contrast, semantics, reduced motion, or screen-reader concern.

The structured feedback ledger is:

```text
alpha/feedback-ledger.json
```

Initial tracked items are `ALPHA-FB-001` Environment Studio authoring, `ALPHA-FB-002` Researcher Notebook Launchpad, `ALPHA-FB-003` hosted Google Colab smoke pending, `ALPHA-FB-004` feedback/diagnostic taxonomy, `ALPHA-FB-006` regional 3D bathymetry authoring, `ALPHA-FB-008` Synthetic Ocean Atlas operational-window selection, `ALPHA-FB-009` procedural atlas field engine plus window-conditioned bathymetry generation, `ALPHA-FB-010` package-backed synthetic current/scalar/hotspot regeneration, `ALPHA-FB-011` world-map-first Environment Studio reauthoring, `ALPHA-FB-012` pan/zoom procedural synthetic world-map authoring, `ALPHA-FB-013` world-map visual acceptance, `ALPHA-FB-014` high-resolution synthetic globe selector, `ALPHA-FB-015` reference bathymetry atlas / real patch selection, `ALPHA-FB-017` reference-bathymetry-conditioned environment field generation, `ALPHA-FB-018` reference-derived environment composition, launch validation, and benchmark export, `ALPHA-FB-019` launch-warning closure plus owner acceptance evidence, and `ALPHA-FB-020` reference-derived workflow alpha retest readiness. P0/P1 items must not be ignored.

## Environment Authoring Feedback

Alpha tester requests for custom environment authoring are tracked as Environment Studio feedback: `P2`, `BENCH`, `EDU`, and `SCI`, not as a current core Alpha gameplay claim. The product decision is one unified **Environment Studio** under `Simulation Lab`, rather than separate bathymetry/current/scalar editors or a fifth Product Hub pillar.

Current Environment Studio status: contracts, validation helpers, digests, hidden-truth checks, and documentation are defined, and the browser Studio opens to a Reference Bathymetry Atlas workflow. ANCHOR uses compact preprocessed public bathymetry/topography fixtures as the default source; raw NOAA/GEBCO files are not runtime assets and belong under gitignored `external_data/reference_bathymetry/`. The checked-in manifest is labeled `AVAILABLE` with an ETOPO 2022 15 arc-second Monterey Canyon `missionReadyPatch` from the NOAA surface-elevation non-ice fallback tile and a preserved ETOPO 2022 60 arc-second `lowResolutionReferencePatch`. The browser prefers the 15s fixture but still labels source variant, role, and actual resolution rather than presenting the data as calibrated survey bathymetry or operational forecast data. The procedural synthetic world/globe workflow remains an experimental sandbox / compatibility path. BATHY-DATA-R1 owner-review evidence is written to `test-results/bathy-data-r1-owner-review/` by the focused browser workflow. ENV-COMPOSE-LAUNCH-R1.1 owner acceptance evidence is written to `test-results/env-compose-launch-r1-1-owner-review/` or an explicit local override; ALPHA-ENV-RETEST-R1 keeps a stable ignored local copy at `artifacts/owner-review/env-compose-launch-r1-1/`. The current implemented path is public reference bathymetry patch -> bathymetry artifact -> deterministic synthetic bathymetry-conditioned fields -> package-backed environment artifact -> validated Planning launch -> public benchmark bundle. Launch warnings are classified, non-blocking warnings may allow launch, and blocking warnings or failures prevent launch. The workflow is ready for human alpha retest using `docs/alpha_reference_environment_retest_protocol.md` and `alpha/reference-environment-retest-feedback-template.json`. Generated currents, scalars, hotspots, and hazards remain deterministic synthetic benchmark artifacts, not operational forecast products. Mission simulation, official scoring, planner behavior, benchmark fairness, and existing Alpha workflows remain unchanged. See `docs/feedback_r1_environment_studio.md`, `docs/environment_studio_architecture.md`, and `docs/reference_bathymetry_data_pipeline.md`.

## Feedback And Diagnostics

Use Product Hub `Feedback & Diagnostics` to create a local JSON feedback package. The package includes safe context such as release id, version, route, browser/platform, viewport, scenario/mission identifiers, public digests, validation baseline digest, package versions, quality profile, and structured warnings.

The package excludes hidden truth, oracle fields, local absolute paths, imported file contents, user identity, cookies, localStorage contents, browser history, and clipboard content. ANCHOR Alpha does not automatically transmit feedback.

## Browser Support

Current Alpha support statement:

- Chromium / Chrome / Edge current: `SUPPORTED`
- Firefox current: `SUPPORTED`
- WebKit current: `NOT_TESTED`
- Safari current: `NOT_TESTED`
- Mobile/tablet browsers: `NOT_TESTED`

WebGL is required. Compact desktop layout is tested at 1366 by 768; touch-first mobile and tablet workflows are not certified. Safari support is not inferred from Playwright WebKit. ALPHA-R1.1 compact critical path passed in Chromium and Firefox; WebKit was attempted but remains unverified.

## Release Manifest

The compact release manifest is:

```text
alpha/release-manifest.json
```

Release id: `alpha-r1-external-research-education-preview`

Release version: `0.1.0-alpha.1`

Release digest: `fnv1a32:ba01ca3c`

The manifest records package versions, validation baseline identity, local notebook acceptance identity, ScoreProfile identity, supported browsers/viewports, curated scenario ids, known limitations, claim boundary, and documentation links. It intentionally keeps Google Colab hosting smoke as `PENDING` until owner-hosted execution occurs.
