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
- Google Colab Hosting Smoke: `PENDING`
- Local acceptance digest: `fnv1a32:9a73d341`
- Checked-in A* official score: `23.593559`

Colab proposes. ANCHOR validates. ANCHOR simulates. ANCHOR scores.

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

## Feedback And Diagnostics

Use Product Hub `Feedback & Diagnostics` to create a local JSON feedback package. The package includes safe context such as release id, version, route, browser/platform, viewport, scenario/mission identifiers, public digests, validation baseline digest, package versions, quality profile, and structured warnings.

The package excludes hidden truth, oracle fields, local absolute paths, imported file contents, user identity, cookies, localStorage contents, browser history, and clipboard content. ANCHOR Alpha does not automatically transmit feedback.

## Browser Support

Current Alpha support statement:

- Chromium / Chrome / Edge current: `SUPPORTED`
- Firefox current: `NOT_TESTED`
- WebKit / Safari current: `NOT_TESTED`
- Mobile/tablet browsers: `SUPPORTED_WITH_LIMITATIONS`

WebGL is required. Compact desktop layout is tested at 1366 by 768; touch-first mobile workflow is not certified.

## Release Manifest

The compact release manifest is:

```text
alpha/release-manifest.json
```

Release id: `alpha-r1-external-research-education-preview`

Release version: `0.1.0-alpha.1`

Release digest: `fnv1a32:4e23931e`

The manifest records package versions, validation baseline identity, local notebook acceptance identity, ScoreProfile identity, supported browsers/viewports, curated scenario ids, known limitations, claim boundary, and documentation links. It intentionally keeps Google Colab hosting smoke as `PENDING` until owner-hosted execution occurs.
