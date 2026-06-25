# Scoring and Benchmark Contract

SCORE-PKG-R1 makes `packages/scoring` the canonical authority for versioned ANCHOR mission scoring while preserving current numerical behavior.

ANCHOR Alpha is a deterministic, scientifically constrained research-and-education sandbox for investigating adaptive underwater-glider mission planning. It supports reproducible comparison of human, classical, and learning-based planners. It is not an operational ocean forecast or certified vehicle-navigation system.

Tagline: Plan. Simulate. Compare. Learn.

## Authoritative Chain

```text
EnvironmentArtifact
+ canonical plan
+ canonical mission-simulator outcome
-> raw mission metrics
-> versioned ScoreProfile
-> deterministic score components
-> official ScoreResult
-> result, benchmark, Debrief, leaderboard, and dataset adapters
```

The mission-simulator package owns raw mission outcomes. The scoring package owns official score calculation. UI displays score but does not calculate it. Browser, headless, and benchmark adapters use the same scoring implementation.

Official scoring is independent of planner class. Benchmark provenance does not alter score. Old results retain their historical score profile and must not be silently rescored with a new profile.

Official mission score is not automatically an ideal RL training reward; future ML datasets may export it alongside separately versioned training rewards.

## Ownership Table

| Responsibility | Current owner | Pure | Runtime coupled | SCORE-PKG-R1 action |
|---|---|---:|---:|---|
| raw metric authority | `packages/mission-simulator` | yes | yes | Consume only; no reverse dependency |
| official score authority | `packages/scoring` | yes | no | `summarizeScore`, ScoreResult, digests |
| score profile authority | `packages/scoring` | yes | no | Versioned ScoreProfile contract |
| score weight authority | `packages/scoring` | yes | no | Preserve SCORE-R1 weights and official summary terms |
| normalization authority | `packages/scoring` | yes | no | Preserve existing normalizer behavior |
| score cap/floor authority | `packages/scoring` | yes | no | Declared in profile/component contracts |
| bonus authority | `packages/scoring` | yes | no | Official summary bonuses copied into ScoreResult |
| penalty authority | `packages/scoring` | yes | no | Official summary penalties copied into ScoreResult |
| per-agent score authority | mission simulator raw metrics, scored by `packages/scoring` | partial | yes | Package consumes compact raw summaries |
| fleet score authority | mission simulator raw metrics, scored by `packages/scoring` | partial | yes | Fleet metrics remain optional and explicit |
| mission-objective score authority | `packages/scoring` | yes | no | Objective-aware profiles preserved |
| depth-science score authority | `packages/mission-simulator` produces events; `packages/scoring` aggregates official summary | yes | yes | Uses package depth helpers, no `src` import |
| result score authority | `packages/scoring` via `ResultExporter` adapter | yes | no | Result exports include ScoreResult metadata |
| Debrief score authority | `packages/scoring`; UI panel only renders | no | yes | `MissionScorecardViewModel` forwards to package |
| headless score authority | `packages/scoring` compatibility report | yes | no | `HeadlessScoring.js` forwards to package |
| benchmark score authority | `packages/scoring`; benchmark stores provenance | yes | no | No benchmark-specific score implementation |
| leaderboard authority | storage adapter | no | yes | Stores profile/result digests; does not score |
| regret authority | evaluation/benchmark adapter | yes | no | Remains comparison-set-dependent, outside official total |
| UI formatting authority | UI modules | no | yes | Formatting only; no canonical values |

## ScoreProfile Contract

`ScoreProfile` includes profile id, version, label, description, mission mode, score scale, component definitions, aggregation policy, caps/floors, terminal adjustment metadata, objective rules, rounding policy, source metadata, provenance, claim boundary, and deterministic `profileDigest`.

Every component declares source metric id, units, direction, normalization, parameters, weight, cap/floor, category, public visibility, data-source classification, and educational explanation.

Changing weights, normalization, component meaning, or numerical semantics requires a new profile version. Wording-only UI corrections do not necessarily require a new numerical version.

## ScoreInput Contract

`ScoreInput` is built from canonical simulator raw outputs and compact metadata. It includes environment, plan, simulation-input, simulation-result, raw-metric, and input digests. It contains no renderer data, camera state, wall-clock timing, planner-specific score advantage, or hidden truth fields in public scoring.

Planner provenance is recorded outside score digests. The same raw metrics and profile produce the same official score regardless of whether a plan is human, classical, heuristic, exact, learned, or imported.

## ScoreResult Contract

`ScoreResult` includes profile identity, input digest, component results, bonuses, penalties, terminal adjustment, official score, score digest, result digest, warnings, and failures. Values are finite numbers and stable JSON-safe structures; UI formatting remains outside the package.

Public summaries pass through package public-safety filtering and must not leak hidden-truth arrays or oracle-only tensors.

## Regret Boundary

Official score answers: how well did this mission perform under this score profile?

Regret answers: how much worse was this result than a declared comparison result?

Regret must identify the comparison result, compatibility assumptions, fairness class, and whether the baseline is heuristic, best-known, oracle-labelled, or proven. It is not absolute truth unless a proof is explicitly attached.

## Package Dependency Graph

```text
contracts
-> bathymetry
-> currents
-> scalar-processes
-> environment
-> mission-simulator
-> scoring
```

`packages/scoring` may depend on contracts and stable mission-simulator raw/score-event contracts. It must not import `src/`, DOM APIs, Three.js, Phaser, UI modules, scenes, planners, localStorage, replay controllers, Python, network APIs, or debug globals.

## Public Safety

Normal public Challenge scoring must not leak hidden truth through labels, raw values, explanations, exports, Debrief, replay, or leaderboard metadata. Referee-only and oracle-derived components must be explicitly labelled and filtered from public summaries when needed.

## CODEC-R1 Score Artifact Metadata

Result exports and Debrief now surface codec-backed score identity metadata: artifact type/version, official score, ScoreProfile ID/version, ScoreResult digest, ScoreDigest, environment digest, plan digest, simulation result digest, terminal reason, planner provenance, fairness class, and visibility class. This metadata is consumed from the existing ScoreResult/export payload and does not recalculate or alter official score.

## COLAB-BENCH-R1 External Planner Benchmark Records

The classical planner benchmark notebook writes `anchor.plan` and optional `anchor.benchmark.run-record` artifacts. Planner search cost, nodes expanded, frontier size, exactness label, and Python timing are benchmark metadata only. They do not change score inputs, score profiles, score weights, bonuses, penalties, normalization, or official totals.

Official comparison rows must use ANCHOR validation, simulation, and scoring output. `tools/js/evaluate_colab_benchmark_plan.mjs` wraps that existing referee path and records the result for Colab analysis; it does not implement a planner, simulator, or scorer.
