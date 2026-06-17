# Export Formats

ANCHOR uses separate JSON products for different workflows.

The app remains static. These files are the data API: export JSON from the browser, run external tools, import `anchor.plan`, simulate/score it, then export `anchor.result` or leaderboard records.

## `anchor.challenge.json`

`type: "anchor.challenge"` is the replayable challenge format. It contains level identity, mission identity, challenge mode, generation config, visible map data, terrain/depth/hazards, deployment/recovery zones, agents, mission/scoring rules, time config, leaderboard identity, and visibility metadata.

Deterministic challenges include truth fields because there is no hidden state. Public stochastic challenge exports omit plain hidden truth and include a non-cryptographic checksum. They may include an opaque browser-obfuscation bundle for reload convenience, with a warning that browser-only secrecy is cheat-resistant only.

Generated challenge exports should preserve replay seed metadata when available:

```json
{
  "challengeId": "CHALLENGE-...",
  "replaySeedAnchor": "CHALLENGE-...",
  "generationVersion": "anchor-generator-v1",
  "generationConfig": {},
  "derivedSeeds": {
    "terrain": "...",
    "currents": "...",
    "roi": "...",
    "hazards": "...",
    "depth": "...",
    "targets": "...",
    "forecast": "...",
    "truth": "...",
    "mission": "..."
  }
}
```

Generated challenge exports also preserve `currentFieldConfig`. This records the selected static/dynamic current mode, base flow preset, evolution behavior and speed, explicit `timeMode`, `cycleDurationHours`, `frameInterpolation`, `dynamicComplexity`, variation levels, additive layer presets/weights/influence masks, and stochastic forecast-confidence settings when present. The generated challenge default is `Topology-Aware Composite`, a synthetic topology-aware ocean-inspired field that stores seeded `topologyComposite` region metadata for open water, shoreline, channel, bay/pocket, island-wake influences, assigned regional behaviors, and complexity-scaled evolution settings. It is not validated CFD or HYCOM forecast data. Continuous synthetic fields use scaled mission time without exhausting a finite frame list; looping fields wrap by cycle duration; clamped/frame fields declare that finite timeline behavior. The exported temporal current frames remain the authoritative solver input, while the config explains and reproduces how those frames were generated from the replay seed anchor.

When a setup imports `anchor.flow-field`, challenge exports preserve `importedFlowField` as well. Imported fields may embed validated static/dynamic vector frames or a synthetic `currentFieldConfig`; challenge terrain still supplies the land/water boundary mask for topology-aware risk and deflection.

Exact replay prefers a saved challenge snapshot. If no snapshot is available, replay may be exact via UUID only when the UUID seed anchor, compatible generator version, generation config, and required derived seeds are present. Older records missing these fields should be labeled unavailable or approximate rather than silently regenerated with a new seed.

## `anchor.solver-packet.json`

`type: "anchor.solverPacket"` is input for external planners. It contains the information an algorithm is allowed to use: grid/layers, deployment options and selected starts, agent specs, duration/surfacing windows, scoring/sampling rules, ROI/current forecast data, priority targets, cost-model notes, end conditions, stochastic metadata, and an `algorithmSupport` section for graph search, multi-agent planning, RL, supervised learning, and neural planners.

In stochastic mode, ordinary solver packets include forecast/belief fields, not hidden truth. Oracle-mode packets are only for benchmarking.

Solver packets include `currentFieldConfig` and `currentFieldVisibility`. Fair stochastic packets expose the forecast-visible current frames/config and confidence metadata, including current time behavior, but withhold hidden truth unless oracle export is explicitly requested. For topology-aware generated fields, packets may expose source/config metadata such as `fieldMode`, `timeMode`, `evolutionBehavior`, `dynamicComplexity`, `topologyAware`, `boundaryMode`, region assignments, and fairness/source labels. The visible temporal current frames remain the numerical input solvers should plan against.

Solver packets also include `importedFlowField` when a challenge used one, plus the generated visible temporal current frames. Imported field source metadata declares whether the field is forecast-visible, truth-visible, or oracle.

## `anchor.flow-field.json`

`type: "anchor.flow-field"` is an optional current-field import format for challenge setup. It supports frame-based currents with finite `{u,v}` vectors and strictly increasing frame times, or a synthetic config using the same presets/layers/evolution controls as challenge setup. Sampling metadata declares `timeMode` (`continuous`, `looping`, `clamped`, or `frames`) and `linear`/`nearest` frame interpolation. Boundary conditions can request `none`, `riskOnly`, `dampenIntoLand`, `deflectAlongShore`, or scaffolded `wakeApproximation`. Imports must match the setup grid size; challenge terrain remains authoritative for coastlines and land boundaries.

Imported flow fields should declare whether they are forecast-visible, truth-visible, or oracle-only. If they include synthetic topology-aware config, preserve `topologyComposite`, `dynamicComplexity`, region behavior metadata, and boundary settings so replay and solver comparison remain explainable.

Google Colab is supported through `tools/python/notebooks/anchor_external_solver_template.ipynb`. The notebook loads this packet, builds a lightweight headless planning world from visible fields, writes `anchor.plan.json`, and leaves validation/simulation/scoring to the browser game.

The notebook can also call the Node.js headless solver:

```bash
node tools/js/headless_solver.mjs anchor.solver-packet.json anchor.plan.json
```

That script reads the same solver packet, uses visible forecast fields by default, imports portable core JavaScript helpers, and writes an importable `anchor.plan`.

## `anchor.demo.*.json`

`type: "anchor.demo.flow-field"`, `"anchor.demo.sampling-process-field"`, `"anchor.demo.coupled-fields"`, `"anchor.demo.uncertainty-forecast"`, `"anchor.demo.sampling-priority"`, and `"anchor.demo.flow-coupled-sampling"` are single-frame demo artifact exports for notebooks, Colab, slides, and external visualization. Sampling-process exports preserve legacy `legacyType: "anchor.demo.sample-roi-field"` for compatibility.

Each demo console has an `Export Demo JSON` button and an `Export Mode` selector. `Current Frame` exports the field state at the current demo time. `Time Window` reveals start time, end time, and timeframe count controls, then exports a `frames[]` series sampled from the current demo settings. The export captures schema version, artifact type, demo name, generation timestamp, scene config, row-major grid metadata, current demo time, field sampling time, displayed field arrays for the current visible frame, selected-cell inspector payload when a cell is selected, units/coordinate notes, and sampled frames for the requested time range. Process Lab exports include the active `viewFilters`, `processMode`, `statusLabel`, `patternSource`, `componentRecipe`, `sourceField`, legacy `eventLikelihoodField` aliases, `stateLayer`, nullable `ruleLayer` cell overrides, canonical `resolvedRuleLayer`, `groupLayer`, `parameterLayer`, `valueLayer`, `transitionLayer`, `roiRoleLayer`, `processMessages`, `processRuleCatalogVersion`, `canonicalRuleIds`, `ruleAliases`, Example Process metadata when active, legacy Reference Observable Process Signature metadata, and legacy `behaviorPreset` metadata when a compatibility/debug preset is active or mapped. Example metadata includes `exampleProcessId`, `exampleProcessLabel`, `exampleType`, `foundationalModelId`, `observableProcessPatternId`, `ruleFamilyId`, `ruleStatement`, and local/global update-function text. Process Paint exports use `sampling-process-rule-families-v1`; old paint IDs such as `frontPropagation` and `none` are accepted as aliases but new resolved rule outputs write canonical IDs such as `propagatingFront` and `inert`. Process Paint diagnostics include rule inheritance counts, proposed/resolved write counts, conflict count, and `frameSemantics: "initial-frame-then-steps-v1"`. Discrete Process Lab exports also include `processTiming` with `generationIndex`, `tickRate`, `tickIntervalSeconds`, and `frameSemantics: "discrete-generations-v1"`, plus `processDisplayMetric` with the current metric id, label, caption, and legend. Frame fields may include compact `metricLayers` such as `neighborCount`, `ruleSupport`, `transitionClass`, `ignitionPressure`, `infectionPressure`, `thresholdProximity`, `congestionPressure`, and signal/recovery layers. Legacy reference metadata includes signature id, label, modified state, inspired-by reference models, observable signature, ROI interpretation, best display layers, failure signs, and "not a" boundary text. Frame counts are capped at 240 in the browser to avoid accidental huge downloads.

Coordinates use top-left origin and row-major indexing. Array access is `field[row][col]`; the cell-center sample point is `x=(col+0.5)/width`, `y=(row+0.5)/height`. Time is in demo seconds. `schemaVersion` is `1.1`. `timeSampling.kind` is `singleFrame` for Current Frame and `timeSeries` for Time Window. `timeSampling.timesSeconds` lists the exact sampled times. Flow exports include `u`, `v`, `magnitude`, `directionRadians`, `landMask`, topology/boundary diagnostics, top-level `flowFieldDiagnostics`, top-level `flowFieldModel`, and per-frame `flowFieldDiagnostics` when frames are exported. `flowFieldDiagnostics` reports speed, divergence, vorticity, strain, invalid vectors, terrain masking, assist/cross-current examples, validation status, and warnings. `flowFieldModel` records preset id/label, claim level, equation, parameters, evolution settings, terrain mode, boundary mode, and what the field is not. Sample/ROI exports include pattern source, reference signature metadata when active, component recipe, process contract, active component recipe after user modifications, modified component hint, compatibility warnings, ROI interpretation, displayed sample value, event likelihood `L(x,y,t)`, a first-class `likelihoodField` object with `values` for the cell-centered likelihood mesh, `mesh` thresholds, type, temporal behavior, spatial evolution, nodes, state/cooldown metadata, entropy/spread diagnostics, a top-level `clusters` array for regional `C_k(t)` likelihood basins, a `graphField` object with hierarchy, topology, node/edge counts, update rule, process metadata, emitted edge messages when available, node transitions, node state fields, diagnostics, compact node summaries, community count, edge-message field names, community-id grid, and filtered top message summaries, plus per-frame `graphState`, `graphActivation`, `graphCommunityId`, `graphClusterLikelihood`, `graphIncomingMessage`, `graphTopMessages`, and `graphNodeTransitions` layers, raw base value, evolved value when available, activity diagnostics, contrast/range diagnostics, high-value fraction, active bounding-box coverage, connected component count, quadrant occupancy, percentile stats, diagnostic warnings, and legacy behavior preset metadata when a preset is selected or modified through the compatibility path. Coupled exports include composed flow, legacy sample grids, deterministic process fields, future process fields, constraint masks, gradient/boundary layers, oracle objective fields, `coupledProcessEngine` metadata, and `oracleObjective` metadata. The oracle metadata explicitly marks `deterministic: true`, `usesBelief: false`, `usesUncertainty: false`, and `usesHiddenTruth: false`. Uncertainty exports include top-level `uncertaintyModel`, `observationModel`, `beliefState`, and `diagnostics`, plus displayed value, hidden truth, forecast, observations, belief, expected-state uncertainty, innovation, surprise, forecast error, unknown-event probability, sampling-priority preview, and legacy aliases. Fairness metadata marks truth as educational/demo-only. Sampling Priority artifact notes: `samplingPriorityModel` records method, weights, formula, claim level, and `notA`; `candidateSamplePoints` records reason-labeled proposed sample locations; `priorityDiagnostics` records validation checks plus `usesRoutePlanning: false` and `usesFlowCoupling: false`. Flow-Coupled Sampling artifact notes: `flowCoupledSamplingModel` records scenario, action method, weights, formula, claim level, and `notA`; `gliderActionContext` records selected glider, gliders, speed, time budget, and energy budget; `fields` include global priority, future priority, flow U/V, current assist/opposition, cross-current risk, travel distance, arrival time, energy cost, reachable mask, hazard, redundancy, and action value; `candidateTargets` records direct-leg target rationales; `actionValueDiagnostics` records validation checks plus `usesFlowCoupling: true` and `usesRoutePlanning: false`.

Minimal notebook loader:

```python
import json
import matplotlib.pyplot as plt

with open("anchor-flow-field-demo-20260609-120000Z.json", "r", encoding="utf-8") as f:
    artifact = json.load(f)

grid = artifact["grid"]
fields = artifact["fields"]
plt.imshow(fields.get("magnitude") or fields["sample"]["displayedValue"])
plt.title(f'{artifact["source"]["demo"]} at t={artifact["timeSampling"]["timeSeconds"]}s')
plt.colorbar()
plt.show()

for frame in artifact["frames"]:
    print(frame["demoTimeSeconds"], frame["fields"].keys())
```

Time-window sample/ROI loading:

```python
import json
import numpy as np
import matplotlib.pyplot as plt

with open("anchor-sample-roi-field-demo-timeseries-20260609-120000Z.json", "r", encoding="utf-8") as f:
    data = json.load(f)

times = data["timeSampling"]["timesSeconds"]
frames = [np.array(frame["fields"]["sampleValue"]) for frame in data["frames"]]

plt.imshow(frames[0])
plt.title(f"t={times[0]} seconds")
plt.colorbar()
plt.show()
```

Schema documentation lives at [`../schemas/demo-artifact.schema.json`](../schemas/demo-artifact.schema.json). Demo artifacts are visualization/research snapshots; solver validation should still use solver packets, challenge exports, plans, results, and oracle datasets as appropriate.

## `anchor.syntheticRoiScenario.json`

`type: "anchor.syntheticRoiScenario"` is the compact seeded scenario export from the Process Lab Scenario Generation card. It is separate from legacy `anchor.demo.sample-roi-field`: demo artifacts preserve the current visualization snapshot or bounded demo time window, while synthetic ROI scenarios package the active example process, custom component recipe, or legacy preset compatibility metadata as a validated time-series process for notebooks and teaching replay.

The scenario export stores `scenarioVersion: "roi-scenario-v1"`, scenario id, family, seed, difficulty, grid, duration, sampled times, source mode, recipe, active component recipe, process contract, behavior signature, sampled parameters, frame labels, scenario labels, diagnostics, validation, and `exportAllowed`. Each frame includes row-major `sampleValue` / `S`, `eventLikelihood` / `L`, displayed value, raw/evolved values where available, likelihood-field metadata, graph metadata, graph state/activation/community/message layers, emitted edge messages, node transitions, activity diagnostics, graph diagnostics, and labels such as active cell count, high-value cell count, centroid, top hotspots, state counts, and process class.

Validation reports `PASS`, `WARN`, or `FAIL`, with human summary, observable pattern note, ROI meaning, reference-signature context when present, warnings/failures, signature checks, metrics, preset-audit results, and recommended fixes. Reference-aware scenarios preserve `referenceSignatureId`, `referenceSignatureLabel`, aliases, category, reference catalog version, `referenceModels`, coverage tags, CA taxonomy metadata, `expectedObservableSignature`, `qaExpectations`, `phenotypeMetrics`, `genotypeNotes`, `taxonomyJustification`, component defaults, `referenceRoiInterpretation`, and `referenceFailureSigns`. `Require PASS Before Export` blocks warning and failed scenarios; `Allow WARN Export` permits warnings while preserving diagnostics. These files are deterministic synthetic analog processes, not validated domain simulators. Batch datasets and algorithm evaluation are intentionally out of scope for this format.

## `anchor.benchmark.mode-config.json`

`type: "anchor.benchmark.mode-config"` is the Benchmark Modes architecture export. It records a benchmark-mode configuration, objective taxonomy version, run-record version, authority split, information-access tier, world-model tier, fairness label, implemented systems, missing systems, visible layers, debug flags, and P1 adapter-only boundary notes.

Planner Benchmark, Adaptive Benchmark, and Full Autonomy Benchmark mode-config exports are contract metadata. P1 adds optional `anchor.benchmark.episode-config`, `anchor.benchmark.run-record`, `anchor.benchmark.route-execution`, and `anchor.benchmark.attempt-set` exports. P6 adds Adaptive Benchmark mission-manager exports: `anchor.benchmark.adaptive-manager-config`, `anchor.benchmark.adaptive-manager-state`, `anchor.benchmark.adaptive-objective-transition`, `anchor.benchmark.adaptive-surfacing-event`, and `anchor.benchmark.adaptive-manager-preview`.

`anchor.benchmark.episode-config` describes one benchmark episode: benchmark mode, objective, authority split, information access, world-model tier, fairness label, ids, seed, allowed attempt sources, and required exports. `anchor.benchmark.route-execution` normalizes an existing route attempt with validation, segment summaries, nullable metrics, diagnostics, and export references. `anchor.benchmark.run-record` wraps a BenchmarkRunRecord-compatible `anchor.benchmark.run`. `anchor.benchmark.attempt-set` compares portable attempt records for best score, lowest energy, highest sample score, fewest hazards, and least duplicate sampling.

P1 does not implement a new planner, does not redesign scoring, and does not add adaptive objective switching, solver training, RL, or MARL. P6 adds adaptive objective preview records only; it still does not execute adaptive routes, add a planner, redesign scoring, or train MARL/RL. It normalizes existing planning, simulation, and debrief data. `anchor.result` may include optional `benchmarkMetadata` only when benchmark metadata was attached before export.

## `anchor.plan.json`

`type: "anchor.plan"` is the imported/exported route format. It supports executable `openLoop` and `timedOpenLoop` plans now, preserves `surfaceUpdateBundle` metadata with a safe import warning, and recognizes `policy` / `contingencyTable` as non-executable scaffolds. Planner metadata declares whether the route used forecast, truth, or oracle data.

Invalid imported plans receive shared route diagnostics in import metadata and headless validation output. Each diagnostic has `type: "route_validation_diagnostic"`, `schemaVersion: "1.0"`, `severity`, `category`, segment cells, blocked/reported cells when available, a human explanation, and a solver-oriented `fixHint` plus `plannerFeedback`.

`waypoint_exceeds_mission_duration` is a warning when the segment is otherwise legal. A final over-duration waypoint may be a terminal carry-through instruction with `runtimeBehavior: "truncate_at_mission_end"`. The browser simulation travels toward it until mission time expires and debriefs normally. Do not treat this category as a hard route failure by itself.

External-solver plans should include:

```json
{
  "executionMode": "timedOpenLoop",
  "planner": {
    "name": "colab-template-greedy-v1",
    "type": "importedSolver",
    "usesForecast": true,
    "usesTruth": false,
    "usesOracle": false,
    "source": "external"
  }
}
```

The fair default is forecast-only and non-oracle. Colab proposes; ANCHOR validates, simulates, and scores.

## `anchor.plan-segment.json`

`type: "anchor.plan-segment"` is a recovery/update segment for a surfaced or failed glider. It includes `agentId`, `startTime`, optional `endTime`, `anchorMode`, future `waypoints`, and planner fairness metadata. Simulation imports validate it and replace future waypoints for that agent after the current simulation time.

## `anchor.surface-observation.json`

`type: "anchor.surfaceObservation"` is exported from surfacing and route-failure menus. It captures current time, agent positions/battery/status, the active plan, and the decision context so an external solver can return `anchor.plan-segment` or `anchor.plan`.

## `anchor.oracle-dataset.json`

`type: "anchor.oracleDataset"` is a research/training artifact. It includes the public challenge data plus hidden truth, forecast fields, truth/forecast metadata, terrain/reachability masks, ROI/current arrays, priority target states, optional trajectories, attempts, result labels, and a feature spec.

This export is labeled: Research/oracle export. Contains hidden truth. Do not use for fair player planning.

## `anchor.result.json`

`type: "anchor.result"` preserves one run: challenge identity, label/source, submitted plan, selected starts, planning markers, execution frames, trajectories, sampled cells, score/energy/hazard summaries, route failure decisions, stochastic seed/run data, debrief metrics, event log, and raw result payload.

Result exports include replay metadata when available: `challengeId`, `replaySeedAnchor`, `generationVersion`, `generationConfig`, `derivedSeeds`, `replaySeedContract`, and `exactReplay`. They also preserve planner fairness metadata and imported-plan validation metadata when present.

## `anchor.leaderboard.json`

`type: "anchor.leaderboard"` stores local challenge records by instance id. Records include attempts, best score, best plan, full saved plan/result blobs when available, per-attempt `pathSummary`, timestamps, labels, challenge reference, and optional embedded challenge data for replay. Planning uses those records to draw the best prior path overlay and to rerun, load, or export the top saved plan for the current challenge.

Best-path exports are derived from the saved leaderboard/best-attempt record. They should carry the saved plan/result blobs when available, replay seed contract metadata, exact replay availability, planned-path and actual-path availability, and route diagnostics if the saved attempt contains imported-plan validation feedback or route-failure events.

Related schemas live in [`../schemas/`](../schemas/). The schema files are documentation-oriented and runtime validation remains intentionally lightweight.

## Process Example Contexts

Foundational CA Models are known local-rule models used to teach cells, states, neighborhoods, update rules, and emergent behavior. Ocean-Relevant Process Analogs are simplified CA/grid-process-inspired event or process layers that resemble environmental behaviors important for AUV sampling, but they are not physical flow models or calibrated ocean simulations.

Observable Process Patterns are bridge metadata rather than the primary selector. For example, Forest Fire maps to Propagating Fronts, which bridges to River Plume Front and Shoreline Runoff Pulse analogs. Greenberg-Hastings maps to Excitable Waves. Sandpile maps to Threshold Cascades, which bridges to turbidity or episodic discharge analogs.

Science boundary: the deterministic process demo teaches local process evolution S(x,y,t). Flow Fields teaches current vectors F(x,y,t). Coupled Dynamic Sampling Space combines process plus flow plus constraints. Uncertainty / Forecast adds hidden truth, forecast, belief, observations, and uncertainty. Sampling Priority computes global vehicle-independent acquisition value A_global(x,y,t), not route planning or flow-coupled action value. Flow-Coupled Sampling computes glider-specific direct-leg action value Q_glider(g,x,y,t) from A_global plus flow, reachability, energy, timing, hazards, and redundancy; it is still not full route planning, mission scoring, calibrated glider dynamics, or a calibrated ocean forecast. Ocean-relevant analogs in this demo are not calibrated ocean models.
## Active Example State

The visible Process Lab mode plus the context-specific model or analog selector is the primary identity for the Deterministic Spatiotemporal Process Lab. The mode selector, context-specific model or analog selector, center subtitle, right-panel Current Lab State, debug object, scenario metadata, and exports should agree on the same selected example.

`referenceSignature*` fields remain for compatibility and represent the mapped observable pattern, not the primary selected example. New consumers should prefer the `processExample` block in demo/scenario exports. `processExample.mappedReferenceSignatureId` should match the legacy flat `referenceSignatureId`.

Ocean-Relevant Process Analogs are educational event/process-layer analogs. They are not calibrated flow models, ocean forecasts, uncertainty models, or mission planners; flow coupling and uncertainty realism belong in the coupled and uncertainty demos.

## `anchor.benchmark.*.json`

Planner Benchmark Debrief exports three benchmark JSON products in P2: `anchor.benchmark.run-record`, `anchor.benchmark.route-execution`, and `anchor.benchmark.attempt-set`. They are normalized records built from the existing planner, simulator, and debrief result. They include fixed objective authority, player-or-solver route authority, information-access/fairness metadata, nullable metrics, and boundary flags such as `usesExistingSimulation: true`, `usesExistingDebrief: true`, `usesNewPlanner: false`, and `usesMissionScoringRedesign: false`.

## `anchor.benchmark.comparison`

P3 adds `anchor.benchmark.comparison` for Planner Benchmark Debrief. It includes attempts, rankings, comparison summary, route review, fairness labels, available benchmark export types, and boundary flags showing existing simulator/debrief, no new planner, no scoring redesign, and no MARL/RL.

P4 adds `anchor.benchmark.route-overlay`. It includes selected overlay layer, normalized route geometry, overlay summary, legend, warnings, notes, and the same benchmark boundary flags. The route overlay export records visualization state for an existing planned/executed path; it does not compute a new path or score.

## Planner Benchmark Attempt Sessions

`anchor.benchmark.attempt-session` is a P5 consolidated Planner Benchmark export. It contains compact attempts for one benchmark episode, comparison summary metadata, route-geometry availability, boundary flags, and notes that scores are not recomputed. It is importable by the Debrief import panel when the episode and benchmark mode are compatible. It stores compact route geometry and metrics, not full hidden ocean fields or full simulator frame tensors.

## `anchor.benchmark.adaptive-manager-preview`

P6 adds Adaptive Benchmark mission-manager preview exports. The main preview file uses `type: "anchor.benchmark.adaptive-manager-preview"` and contains benchmark mode, objective authority `missionManager`, route authority `playerOrSolver`, fixture id, manager config, manager state, evidence snapshot, diagnosis, objective transition, view model, summary, and boundary flags.

Related adaptive exports are:

- `anchor.benchmark.adaptive-manager-config`
- `anchor.benchmark.adaptive-manager-state`
- `anchor.benchmark.adaptive-objective-transition`
- `anchor.benchmark.adaptive-surfacing-event`

These files document transparent mission-manager objective updates. They are not route-execution records, do not contain optimized routes, do not recompute scores, do not implement full autonomy, and do not train RL/MARL policies.

## Adaptive Benchmark P7 Exports

P7 adds these export types:

- `anchor.benchmark.adaptive-surfacing-decision`
- `anchor.benchmark.adaptive-next-leg-config`
- `anchor.benchmark.adaptive-episode-trace`
- `anchor.benchmark.adaptive-launch-config`

P6 adaptive manager config, state, objective transition, surfacing event, and manager preview exports remain supported. P7 exports do not contain generated routes unless a future phase explicitly adds them.

## Adaptive Benchmark P8 Exports

P8 adds `anchor.benchmark.adaptive-episode-session`, `anchor.benchmark.adaptive-objective-history`, `anchor.benchmark.adaptive-leg-record`, and `anchor.benchmark.adaptive-session-summary`. These exports store compact session, leg, objective-history, and summary records. They do not contain generated routes unless a future phase explicitly adds them.
## H0 `anchor.headless.*` Contracts

H0 defines future headless / Colab / OceanBox schema contracts: `anchor.headless.mission-config`, `anchor.headless.field-pack`, `anchor.headless.episode`, and `anchor.headless.manifest`. Current browser artifacts are mapped to these contracts by `BrowserHeadlessSchemaMap.js`. H0 does not write a full bundle, implement a Python package, implement a new simulator, or add route planning/MARL/RL.

## H1 Node Headless Bundle

The Node headless runtime writes a Colab-ready bundle with `manifest.json`, `mission_config.json`, `visible_fields.json`, optional `hidden_fields.json`, `observations.json`, `observations.csv`, `glider_tracks.json`, `glider_tracks.csv`, `score_report.json`, `replay.json`, and `episode.json`.

`visible_fields.json` must not contain `T_hiddenTruth`. Hidden truth appears only in `hidden_fields.json` when hidden export is enabled and the manifest marks it as `hiddenTruth`/`oracle` visibility.

Node headless runtime over portable ANCHOR core logic. Browser ANCHOR remains the official visual referee and scoring UI. H1 does not implement Python OceanBox, a new planner, calibrated ocean forecasting, or MARL/RL.

## `anchor.headless.bundle.json`

`type: "anchor.headless.bundle"` is the H2 combined Node/OceanBox-JS headless bundle format for browser and Colab inspection. It embeds the H0 manifest, H1 mission config, visible fields, optional hidden fields, observations, glider tracks, score report, replay metadata, and episode record.

Create it with:

```bash
node tools/js/headless_oceanbox.mjs simulate --seed demo-001 --out runs/public-demo --no-hidden-export --combined-json
```

The browser Headless Bundle Viewer loads `bundle.json` or the separate JSON/CSV files and exports `anchor.browser.headless-bundle-summary`. It does not run official browser scoring, does not create a new route planner, and does not claim calibrated ocean forecasts.

## H2.1 `anchor.headless.bundle` Fixtures

Two deterministic example combined bundles live in `docs/examples/` for docs, tests, browser screenshots, and Colab snippets. The public fixture omits `hiddenFields`, omits a `hidden_fields.json` file reference, and keeps `T_hiddenTruth` out of visible fields and browser summary exports. The debug fixture includes `T_hiddenTruth` only as hidden/oracle/debug data.

Both fixtures are regenerated by `node tools/js/generate_headless_example_bundles.mjs`. The combined bundle keeps `observations` and `gliderTracks` as top-level arrays so Python standard-library loaders can inspect counts without reconstructing separate files.

## `anchor.headless.solver-roundtrip-report.json`

`type: "anchor.headless.solver-roundtrip-report"` is the H3.1 canonical report for solver-packet / submitted-plan / Node-headless bundle compatibility. Loaders also accept the legacy H3 alias `anchor.headless.roundtrip-report`. It records packet identity, plan identity, selected agent, visibility validation, plan validation, adapted runtime-plan metadata, headless episode summary, output files, hidden-truth leak checks, and explicit boundary flags.

The report can be written as `roundtrip_report.json` next to a headless bundle and embedded in `bundle.json` as `roundtripReport`. A combined roundtrip bundle uses `type: "anchor.headless.solver-roundtrip-bundle"`. Public default roundtrips omit hidden fields and keep `T_hiddenTruth` out of solver-visible and browser-summary artifacts. The Headless Bundle Viewer can export `anchor.browser.headless-roundtrip-summary`. The report documents an educational headless execution; it is not official browser scoring and does not add a route planner or Python simulator.

## `anchor.headless.science-diagnostics.json`

P9 headless bundles may include `science_diagnostics.json` and combined bundles may embed `scienceDiagnostics`. The record type is `anchor.headless.science-diagnostics`. It contains compact public-safe summaries for observation surprise, evidence coherence, forecast-correction state, hidden-event hypothesis state, primary diagnosis, confidence, and recommended next objective.

The artifact distinguishes forecast correction from hidden-event hypotheses. It must not include `T_hiddenTruth` or hidden field arrays. It is not production data assimilation, not a calibrated ocean forecast, not a planner, not a scoring redesign, and not MARL/RL.

## P11 Water-Column / Depth-Layer Artifacts

P11 adds public-safe 2.5D water-column artifacts for headless bundles and solver roundtrips:

- `water_column_summary.json` with `type: "anchor.headless.water-column-summary"`
- `depth_layer_priority.json` with `type: "anchor.headless.depth-layer-priority"`
- combined-bundle fields `waterColumnSummary` and `depthLayerPrioritySummary`
- observation/track fields `depthLayerId`, `depthMeters`, and `diveProfileId`

Depth-layer priority summarizes `A_global_depth[layer][row][col]` and a top-down collapse. It excludes route travel cost and path optimization. P11 is synthetic top-down 2.5D sampling context, not full 3D planning, a calibrated vertical ocean model, production data assimilation, a new planner, Python simulation, or MARL/RL.

## P10 Adaptive Science-Diagnosis Handoff

Science diagnosis informs the mission-manager objective recommendation. It does not generate a route. Forecast correction means the expected field existed but was wrong. Hidden event hypothesis means observations may indicate a phenomenon not represented in the forecast. The player or solver still plans the route.

P10 adds adaptive science-diagnosis context, mission-manager rationale, next-leg handoff metadata, objective-history display fields, and public-safe headless/browser summaries. It does not implement a new planner, scoring redesign, production data assimilation, GP/GMRF production inference, calibrated ocean forecast, Python simulator, or MARL/RL. Node/OceanBox-JS remains the canonical non-browser runtime; Python/Colab analyze artifacts or call Node.
ENV-R1 headless exports may include `bathymetry_summary.json` and `mission_geometry_summary.json`. These are public-safe summaries of environmental geometry and route/sample counts, not calibrated bathymetric survey data or full 3D routes.
