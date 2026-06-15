# Learning Labs + Simulation Sandbox Readiness Audit

Generated: 2026-06-12

Scope: audit-only. No production behavior, schema, Phaser scene, planner, scoring, or export behavior was changed.

## 1. Executive Summary

Learning Labs: **Ready**. The six-page sequence exists and is linked: index, deterministic spatiotemporal processes, dynamic flow fields, oracle coupled sampling, stochastic uncertainty, stochastic coupled sampling, and planner/mission evaluation. Each page has local interactive widgets, math/explanation blocks, sandbox links, no external dependencies, smoke coverage, and E2E coverage through the main Learning Labs flow.

Simulation Sandboxes: **Partial to Mostly Ready**. Flow Fields is mostly ready as the deterministic vector-field sandbox. The Sampling/ROI/Process Lab is mostly ready as the future Dynamic Spatiotemporal Process Sandbox, but it still carries legacy ROI/Sample naming and should receive a formal rename/spec pass before being used as the production-facing process sandbox. Coupled and Uncertainty demos are useful but still demo-oriented rather than production-mode-authoritative.

Dynamic Spatiotemporal Process Sandbox alignment: **Mostly Ready**. The core support is strong: deterministic/seeded terminology, Example Processes, CA/grid-process rules, Process Paint, Rule Allocation Sandbox, reference-signature catalog, process export builder, graph/message layers, validation scripts, and docs. The main gap is not raw capability; it is boundary clarity, naming, engine contract, and preventing CA/grid-process teaching models from being mistaken for ocean simulators.

Flow, Coupled, and Uncertainty demos: **Mostly Ready / Partial / Partial**. Flow has the strongest demo maturity. Coupled has the oracle/deterministic composition story but needs better production acquisition contract boundaries. Uncertainty has forecast/truth/update concepts but needs first-class hidden-discovery state and mission-manager diagnosis semantics before Adaptive/Full Autonomy modes.

Production game-mode pivot readiness: **Partial**. Planner Benchmark has many bones in place: waypoint planning, route validation, simulation, debrief, solver packets, plan import, fairness metadata, leaderboard records, and Greedy Planner baseline. Adaptive Benchmark and Full Autonomy Benchmark are not ready as product modes; they need objective-selection authority, mission-manager policy, surface-update diagnosis state, and solver interfaces that carry objective decisions as well as paths.

Biggest risks:

- Large Phaser scene files remain high-friction integration points: `MissionWorkspaceScene.js`, `RoiGeneratorDemoScene.js`, `FlowFieldDemoScene.js`, and `SimulationScene.js`.
- Legacy ROI/Sample terminology can obscure the intended Dynamic Spatiotemporal Process Sandbox role.
- CA/grid-process demos are excellent teaching tools but scientifically insufficient as ocean-process simulation.
- Expected-state vs hidden-discovery concepts are documented and demoed, but not first-class production state machines.
- Continuous glider routes exist conceptually and diagnostically, but depth, water-column layers, and continuous trajectory tensor export are incomplete.

Recommended next phase: **Phase A1 - Dynamic Spatiotemporal Process Sandbox Refactor Spec**, followed by **A2 - Simulator Engine Contract Implementation** and **A3 - Comparative Ocean Process Engine Sandbox**.

## 2. Current Product Map

| Area | Current Role | Classification | Readiness | Notes |
| --- | --- | --- | --- | --- |
| Challenge Mode | Playable challenge flow with mission modes, planning, simulation, debrief, leaderboard | Production Game Mode | Partial | Broad playable mode, not yet split into Planner/Adaptive/Full Autonomy benchmarks |
| Simulation Lab | Reproducible experiment entry point and demo launcher | Simulation Sandbox / Developer Tool | Mostly Ready | Good shell for focused demos and exports |
| Learning Labs | Static interactive concept pages | Learning Lab | Ready | Six-lab sequence now exists |
| Flow Fields Demo | Current/vector-field playground | Simulation Sandbox | Mostly Ready | Strongest isolated field sandbox |
| Sampling / ROI / Process demo | Dynamic scalar/process playground | Simulation Sandbox with Legacy Compatibility | Mostly Ready but naming-sensitive | Should become Dynamic Spatiotemporal Process Sandbox |
| Coupled Fields Demo | Process + flow + constraints composition playground | Simulation Sandbox | Partial | Useful oracle coupling demo; not full adaptive sampling |
| Uncertainty / Forecast Demo | Forecast/truth/uncertainty/update playground | Simulation Sandbox | Partial | Strong teaching scaffold; hidden discovery needs production state |
| Mission Workspace / Simulation / Debrief | Route planning, execution, scoring, review | Production Game Mode | Partial | Strong Planner Benchmark bones |
| Import/export/solver tools | JSON contracts for challenges, plans, results, solver packets | Developer Tool / Production Infrastructure | Mostly Ready | Needs future mode metadata for adaptive/full autonomy |
| Legacy ROI naming and aliases | Compatibility layer | Legacy Compatibility | Necessary but confusing | Must be preserved while UI/product language pivots |

## 3. Target Product Map

Learning Labs explain scientific concepts through article-style pages and standalone lightweight widgets.

Simulation Sandboxes isolate field/model behavior:

- Dynamic Spatiotemporal Process Sandbox
- Deterministic Dynamic Flow Fields Sandbox
- Oracle / Deterministic Coupled Sampling Space Sandbox
- Stochastic / Uncertainty Sandbox
- Comparative Ocean Process Engine Sandbox
- Planner / Mission Evaluation Sandbox

Game Modes evaluate playable or solver-provided mission behavior:

1. **Planner Benchmark**: science objective is given; player/solver chooses route.
2. **Adaptive Benchmark**: fixed mission-manager policy interprets observations and chooses next objective; player/solver chooses route.
3. **Full Autonomy Benchmark**: solver/agent chooses both objective and route.

Mission engine target: continuous-feeling glider movement over gridded hidden science fields, with forecast/belief fields, hidden truth, observations, surfacing updates, replanning, flow-aware movement, and regret/debrief metrics.

Export layer target: gridded tensors plus continuous trajectories, engine metadata, scientific claim labels, visible/hidden/oracle field separation, and fairness/objective-authority metadata.

## 4. Learning Labs Readiness Audit

| Page | Exists | Article | Widgets | Math/Explanations | Sandbox Links | Menu Link | No External Deps | Smoke | E2E | Gaps |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| `labs/index.html` | yes | Ready | static diagrams | Ready | yes | yes | yes | shared static | yes | None for current sequence |
| `deterministic-spatiotemporal-processes.html` | yes | Ready | CA/neighborhood/Life/domain widgets | Ready | yes | yes | yes | dedicated | yes | Production process sandbox still needs refactor spec |
| `deterministic-dynamic-flow-fields.html` | yes | Ready | vector/preset/particle widgets | Ready | yes | yes | yes | dedicated | yes | None blocking |
| `oracle-deterministic-coupled-sampling-space.html` | yes | Ready | flow-carried/constraint/layer widgets | Ready | yes | yes | yes | dedicated | yes | Production coupling contract still needed |
| `stochastic-uncertainty.html` | yes | Ready | uncertainty/Bayes/Markov/GP/regret widgets | Ready | yes | yes | yes | dedicated | yes | Does not make production inference claims |
| `stochastic-coupled-sampling-space.html` | yes | Ready | belief/oracle/acquisition/regret widgets | Ready | yes | yes | yes | dedicated | yes | Production acquisition engine still needed |
| `planner-mission-evaluation.html` | yes | Ready | route/greedy/debrief widgets | Ready | yes | yes | yes | dedicated | yes | Educational only; not a planner implementation |

Learning Labs are complete enough to support the production pivot. They should not be expanded before the sandbox/product-mode architecture work begins.

## 5. Simulation Sandbox Readiness Audit

| Sandbox | Status | Purpose | Claim Level | Teaches | Should Not Claim | Data/Export | UI/Test/Docs | Missing |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| Dynamic Spatiotemporal Process Sandbox | Mostly Ready under current Process Lab | Scalar process evolution | CA/grid-process-inspired teaching model | local rules, global evolution, process state, transitions | ocean simulator or estimator | Strong process demo exports | Strong docs/smokes | formal rename, engine contract, comparator |
| Deterministic Dynamic Flow Fields Sandbox | Mostly Ready | Vector current behavior | synthetic ocean-inspired vector field | direction, magnitude, topology, particles, dynamic evolution | validated HYCOM/ROMS/CFD | flow grids and demo exports | Strong docs/E2E | harden engine wrapper |
| Oracle / Deterministic Coupled Sampling Space Sandbox | Partial | Known process + flow + constraints | deterministic/oracle teaching model | true sampling objective and coupling | adaptive sampling or belief inference | coupled demo exports | Docs and E2E present | acquisition contract and oracle/belief boundary |
| Stochastic / Uncertainty Sandbox | Partial | Forecast/truth/uncertainty concepts | statistical belief teaching/demo model | observations, forecast error, uncertainty, update effects | production GP/GMRF inference | uncertainty demo exports | Docs and E2E present | hidden-event lifecycle, mission diagnosis state |
| Comparative Ocean Process Engine Sandbox | Missing | Compare scalar engine families | future synthetic/ocean-inspired model comparator | engine differences and metrics | production ocean forecast | none yet | none yet | all implementation |
| Planner / Mission Evaluation Sandbox | Partial | route planning/execution/debrief | benchmark execution environment | waypoint planning, preview, sim, debrief, fairness | full autonomy benchmark yet | plans/results/solver packets | strong game flow tests | explicit three benchmark modes |

## 6. Dynamic Spatiotemporal Process Sandbox Deep Audit

Current source: `RoiGeneratorDemoScene.js`, `DemoRoiFields.js`, `src/core/demo/sampling/*`, `src/core/demo/roi/*`, `docs/sample_fields_demo.md`, `docs/sampling_process_lab.md`.

Recommended product name: **Dynamic Spatiotemporal Process Sandbox**. If the UI needs an even clearer educational label, **Deterministic / Dynamic Spatiotemporal Process Sandbox** is acceptable. The shorter name is preferable once the docs clearly state that examples are deterministic or seeded unless explicitly stochastic.

Support audit:

- Visible title / terminology: **mostly ready**. `SAMPLING_PROCESS_LAB_TITLE` is already `Deterministic Spatiotemporal Process Lab`; menu label remains `Process Lab`; legacy demo name is preserved.
- Deterministic / seeded framing: **ready**. Terminology and docs explicitly say same recipe + seed + initial state gives same evolution.
- Foundational CA examples: **ready**. Example processes and model catalog cover CA/grid families.
- Observable process patterns: **ready**. Reference signatures and process examples cover fronts, waves, diffusion/spread, cascades, cyclic dominance, etc.
- Rule-to-update-function explanation: **mostly ready**. Export metadata includes rule statement, local update function, global update function.
- Local update rules: **ready** through `SamplingProcessRules` and paint model.
- Global field evolution: **ready for teaching**, through `SamplingProcessEvolution`, graph fields, likelihood fields, and component recipes.
- Non-uniform / domain rule allocation: **ready for teaching**, through Process Paint and Rule Allocation Sandbox.
- Process Paint: **ready** with canonical rules, aliases, state layers, transition layers.
- Rule Allocation Sandbox: **ready for teaching**, seeded non-uniform allocation exists.
- Reference/example process catalog: **strong**. `RoiReferenceModelCatalog` and `RoiReferenceSignatures` are substantial.
- CA/grid-process taxonomy metadata: **strong**.
- Validation of process behavior: **strong for teaching**, via audit and smoke scripts.
- Export of process state layers: **ready**.
- Export of transitions: **ready**.
- Export of rule layers: **ready**.
- Export of group/domain allocation: **ready**.
- Right-panel educational explanations: **mostly ready**.
- Left-panel authoring controls: **mostly ready**, mode-aware.
- Default display layer: **adequate**, though current `SAMPLING_PROCESS_DEFAULT_DISPLAY_MODE` is `sampleValue`; docs mention overlay defaults elsewhere. Verify live UI and docs stay aligned before refactor.
- Diagnostics layer: **ready**.
- Legacy ROI/Sampling compatibility: **strong**, but a source of naming risk.

Scientific limits:

- CA/grid-process is good for teaching local rules, event generation, fronts, waves, cascades, local propagation, and rule allocation.
- CA/grid-process is not enough for final ocean modeling.
- The final target needs future ocean-inspired continuous scalar engines: advection, diffusion, decay, source/sink plume, bloom/front dynamics, and stochastic ensembles.

What is already strong:

- Modular sampling-process core exists.
- Exports are rich and preserve legacy aliases.
- Reference model catalog and validation tools are unusually mature for a teaching sandbox.
- Docs already separate `F`, `L`, `S`, and `U` and route uncertainty concepts to the correct demos.

What is partial or missing:

- A common simulator engine contract.
- A clean product-facing rename plan that preserves legacy `anchor.demo.sample-roi-field` compatibility.
- Comparator sandbox to show why CA/grid process is one engine family rather than the whole model universe.
- Clear scientific claim labels inside every exported scenario/artifact.

Rename guidance:

- Rename product-facing sandbox to **Dynamic Spatiotemporal Process Sandbox**.
- Preserve legacy identifiers in exports and import compatibility.
- Keep internal aliases where necessary; move user-facing ROI/Sample wording into explanatory compatibility notes.

Refactor order:

1. Write the refactor spec first.
2. Introduce engine contract wrappers.
3. Build the Comparative Ocean Process Engine Sandbox.
4. Then complete the visible rename and UI polish.

## 7. Flow Fields Sandbox Audit

Flow Fields support:

- `F(x,y,t)` vector field: **ready**.
- Field presets: **ready**, including synthetic ocean-inspired/topology-aware modes.
- Particles: **ready**.
- Magnitude/direction: **ready**.
- Terrain/topology: **mostly ready**.
- Additive layers: **ready**.
- Dynamic evolution: **ready**; playback speed and flow evolution speed are separated.
- Boundary modes: **mostly ready**, with documented caveats.
- Export of flow grids: **ready** through demo artifacts and challenge/solver packets.
- Coupling readiness: **mostly ready**.
- Scientific limits: docs explicitly state synthetic fields are not HYCOM/ROMS/CFD.

Conclusion: good enough as the deterministic flow sandbox. It needs hardening and engine-contract wrapping, not a major refactor before coupled modes.

## 8. Oracle / Deterministic Coupled Sandbox Audit

Support:

- Process + flow overlay: **present**.
- Known/oracle sampling objective: **present in concept and demos**.
- Constraints/topology: **partial**.
- Flow-carried features: **present**.
- Reachable value: **partial**, stronger in learning labs than production sandbox.
- Deterministic shared clock: **present conceptually**.
- Export of coupled fields: **present**.
- Clear distinction from uncertainty: **mostly present** in docs/labs.
- Readiness for oracle-guided missions: **partial**.

Missing:

- Shared acquisition/priority engine contract.
- A clean oracle-vs-belief metadata boundary for future game modes.
- Route-aware coupled value integration tied to continuous mission execution.

## 9. Stochastic / Uncertainty Sandbox Audit

Support:

- Hidden truth: **present in demo**, educational/demo-only.
- Forecast / expected state: **present**.
- Posterior/belief: **partial**.
- Uncertainty field: **present**.
- Observations: **present**.
- Sensor noise: **present conceptually/demo**.
- Information gain: **present**.
- Forecast error: **present**.
- Hidden unknown / hidden-event probability: **partial**, stronger in labs than production code.
- Bayesian / Markovian / GP/GMRF-style concepts: **learning-lab ready**, demo implementation is lightweight.
- Export of belief/uncertainty layers: **partial**.
- Update cycle: **present for demo**, not yet production mission-manager state.

Missing:

- First-class hidden-event hypothesis state.
- Forecast-correction vs hidden-discovery diagnosis object.
- Objective switching after discovery.
- Adaptive Benchmark manager policy.

## 10. Comparative Ocean Process Engine Sandbox Audit

Status: **Missing**.

Target spec:

- Same initial scalar field across all engines.
- Same flow field where relevant.
- Side-by-side engine view.
- Difference view against a selected baseline.
- Metrics: mass, centroid displacement, spread, peak intensity, smoothness, front length, flow alignment, decay, stability warnings.

Potential engines:

- CA / grid-process.
- Advection only.
- Advection + diffusion.
- Advection + diffusion + decay.
- Source plume.
- Reaction-advection-diffusion.
- Stochastic ensemble.
- Belief/forecast update.

Implementation order: after A1 spec and A2 engine contract, before a full visible Process Sandbox rename. The comparator will make the rename scientifically safer.

## 11. Simulator Engine Contract Audit

Recommended common contract:

```js
{
  engineId,
  engineLabel,
  engineFamily,
  scientificClaimLevel,
  inputs,
  outputs,
  hiddenState,
  visibleState,
  parameters,
  step(),
  observe(),
  updateBelief(),
  computePriority(),
  diagnostics(),
  validationMetrics()
}
```

Engine classifications:

- teaching
- synthetic
- ocean-inspired
- belief-model
- benchmark-ready
- production-ready

Wrappability:

- CA/grid-process modules can be wrapped with moderate effort.
- Flow field modules can be wrapped with moderate effort.
- Uncertainty demo can be wrapped for teaching, but benchmark-ready belief updates need more state.
- Acquisition/priority is currently scattered across demos, metrics, planning guidance, and learning widgets; needs a first-class engine.
- Mission execution exists, but continuous trajectory/depth contract needs a cleaner interface.

## 12. Field/Data Model Audit

| Field | Status | Files/UI | Export/Test | Gaps |
| --- | --- | --- | --- | --- |
| `F(x,y,t)` flow/current | exists clearly | Flow demo, current generators, planning current cost | flow/demo/challenge/solver exports | engine wrapper and claim labels |
| `X(x,y,t)` process state | partially exists | graph state, paint state, process layers | process exports | formal engine output naming |
| `V(x,y,t)` observable process value | partially exists | sample value/value layer | process exports | distinguish value from reward in benchmark modes |
| `L(x,y,t)` likelihood/event-proneness | exists clearly in Process Lab | likelihood field, mesh, nodes | process exports | legacy naming clarity |
| `S(x,y,t)` sample value/reward | exists | sample value/ROI fields | process/challenge exports | relation to acquisition should be explicit |
| `T(x,y,t)` hidden truth | partial | stochastic challenge/uncertainty demo | oracle datasets, hidden bundles | hidden-discovery state lifecycle |
| `E(x,y,t)` expected/forecast state | partial | forecast generators, uncertainty demo | solver/challenge/demo exports | expected-vs-hidden diagnosis metadata |
| `mu(x,y,t)` belief/posterior mean | partial | learning labs, uncertainty concepts | limited | production belief engine |
| `U(x,y,t)` uncertainty | exists partially | uncertainty demo, stochastic mode | uncertainty exports/solver packets | uncertainty semantics per field family |
| `P_unknown(x,y,t)` hidden-event probability | mostly conceptual | L5, docs concepts | limited | first-class production field |
| `A(x,y,t)` acquisition/priority | partial | learning labs, planning guidance concepts | limited | priority engine contract |
| `C(x,y)` constraints/topology | exists | terrain/hazards/depth/connectivity | challenge/solver exports | more unified constraint tensor |
| depth layers | partial | depth generator and exposure | challenge/solver fields | real water-column/depth-state semantics |
| continuous trajectory x/y/depth/time | partial | simulation trajectories/results | result/oracle datasets | depth, interpolation, tensor alignment |

## 13. Expected-Field vs Hidden-Discovery Audit

Current support:

- Inaccurate expected state: **partial** through forecast error demos/docs.
- Forecast error: **present**.
- Innovation: **conceptual/demo**.
- Surprise score: **conceptual/demo**.
- Expected-state uncertainty: **present conceptually**.
- Hidden unknown state: **partial**.
- Hidden-event hypothesis: **mostly missing in production**.
- Hidden-event probability: **conceptual/learning-lab ready**.
- Hidden-event confidence: **conceptual/learning-lab ready**.
- Confirmation objective: **conceptual**.
- Forecast-correction objective: **conceptual**.
- Surfacing update diagnosis: **workflow scaffolded**.
- Objective switching after discovery: **missing**.

Conclusion: this is not first-class yet. It is scientifically well framed in docs/labs, partially demoed, but not production-authoritative.

## 14. Continuous Glider over Gridded Fields Audit

Support:

- Continuous waypoint placement: **mostly present**.
- Route segment geometry: **present**.
- Interpolating fields along continuous path: **partial**.
- Drift/current effect on route: **present**.
- Predicted path envelope: **partial**, through guidance/cone uncertainty.
- Actual path vs planned route: **present** in simulation/debrief concepts.
- Sampling along path: **partial**, cell/waypoint-oriented.
- Dive profiles: **partial/minimal**.
- Depth layers: **partial**.
- 2.5D water-column model: **missing**.
- Top-down collapsed sampling score: **present**.
- Continuous trajectory export: **partial** in result/oracle exports.
- Gridded tensor export: **present** for many fields.

Does the game still feel too grid-centered? **Partially**. Waypoint placement and route segments are continuous-feeling, but science fields and scoring remain primarily gridded/cell-centered. That is acceptable for near-term benchmarks if interpolation and trajectory export are formalized.

## 15. Three Game Modes Readiness Audit

### Planner Benchmark

Readiness: **medium**.

Present: fixed/stated objectives through mission modes, route planning, preview, validation, simulation, debrief, solver packet, imported plan, fairness labels, oracle comparison foundations.

Missing: explicit Planner Benchmark product mode, curated fixed benchmark packs, benchmark-specific leaderboard/debrief framing.

### Adaptive Benchmark

Readiness: **low**.

Present: surface observations, plan-segment import, surfacing semantics, uncertainty demos, docs.

Missing: fixed mission-manager policy, objective transitions, diagnosis state, forecast correction, hidden discovery, objective history, adaptive debrief.

### Full Autonomy Benchmark

Readiness: **low**.

Present: imported plan metadata, policy/contingency scaffolding, oracle dataset exports.

Missing: agent objective selection, objective+path action space, fair solver interface for objective authority, oracle dataset labels for objective decisions, leaderboard/debrief handling for autonomous agents.

## 16. Export/Schema Readiness Audit

Current support:

- `anchor.challenge`: **strong**, with replay seed metadata and hidden-truth handling.
- `anchor.solverPacket`: **strong for route planning**, partial for autonomy/objective authority.
- `anchor.oracleDataset`: **present**, suitable for research/training labels.
- `anchor.result`: **strong**, includes trajectories, sampled cells, score summaries, stochastic metadata.
- `anchor.leaderboard`: **present**, supports scope/source/fairness.
- `anchor.plan`: **strong for waypoint plans**, partial for policy/autonomy.
- Demo artifacts: **strong** for flow/process/coupled/uncertainty.
- Hidden truth separation: **mostly ready**.
- Visible forecast fields: **present**.
- Oracle-only fields: **present**.
- Fairness labels: **present**.

Missing or partial:

- Objective authority: fixed objective vs mission-manager vs autonomous objective selection.
- Mission-manager diagnosis metadata.
- Continuous trajectory + gridded tensor alignment contract.
- Depth-layer and 2.5D water-column metadata.
- Engine metadata and scientific claim metadata across all exports.
- Hidden-event hypothesis/probability lifecycle fields.

## 17. Test/Readiness Audit

Current tests cover:

- Learning Labs static pages and widgets.
- Flow Fields Demo E2E path.
- Sampling Process/Process Lab modes, UI, exports, paint model, randomizer, evolution, render layers, view models.
- ROI reference coverage/audits.
- Coupled Fields Demo E2E path.
- Uncertainty / Forecast Demo E2E path.
- Export/import basics.
- Solver packet/headless solver tooling.
- Planning/simulation/debrief smoke path.
- Stochastic mode controls.

Gaps:

- No comparative engine sandbox tests because sandbox does not exist.
- No production hidden-event hypothesis lifecycle tests.
- No Adaptive Benchmark objective-transition tests.
- No Full Autonomy objective-selection tests.
- Limited continuous trajectory/depth tensor export validation.
- No common engine-contract conformance tests.

## 18. Code Ownership / Futureproofing Audit

Hot files:

- `MissionWorkspaceScene.js` ~2225 lines.
- `RoiGeneratorDemoScene.js` ~1935 lines.
- `FlowFieldDemoScene.js` ~1520 lines.
- `SimulationScene.js` ~1517 lines.
- `CoupledFieldsDemoScene.js` ~1050 lines.
- `EnvironmentEditorScene.js` ~1046 lines.

Risks:

- Scene files still mix UI orchestration, rendering, and workflow control.
- Sampling process has strong core extraction but remains anchored by a large scene.
- Field generation and export are improved but need a formal engine metadata boundary.
- Legacy ROI naming remains necessary but can confuse future Dynamic Process work.
- Sandboxes use different field shapes and vocabularies; a common engine contract would reduce drift.

Targeted future extractions:

- Engine adapter layer for process/flow/belief/acquisition/mission execution.
- Scene-thin view-model contracts for each sandbox.
- Shared claim-level metadata constants.
- Objective-authority/fairness metadata helper.

## 19. Scientific Claim-Level Audit

| Model/Sandbox | Claim Level | Overclaim Risk |
| --- | --- | --- |
| Learning Lab widgets | classroom toy | Should not be interpreted as production algorithms |
| Dynamic Process / Process Lab CA examples | CA/grid-process-inspired teaching model | Not calibrated ocean, ecology, wildfire, or hydrodynamic simulator |
| Flow Fields Demo | ocean-inspired synthetic vector field | Not HYCOM, ROMS, CFD, or operational forecast |
| Coupled Fields Demo | deterministic/oracle coupled teaching model | Not full adaptive sampling unless uncertainty/update loop is active |
| Uncertainty / Forecast Demo | statistical belief teaching/demo layer | Not production GP/GMRF/Bayesian inference unless implemented |
| Mission Workspace / Simulation | benchmark-quality synthetic environment, partial | Not full 2.5D underwater navigation estimator |
| External solver templates | baseline/template | Not official optimizer or simulator |

Explicit flags:

- CA process rules should not claim to be calibrated ocean simulators.
- Flow fields should not claim to be HYCOM/ROMS forecast data.
- GP/GMRF-style widgets should not claim production inference.
- Coupled fields should not claim real adaptive sampling unless uncertainty and observation updates are present.

## 20. Gap Matrix

| Area | Current support | Missing | Risk | Next phase | Priority |
| --- | --- | --- | --- | --- | --- |
| Learning Labs | Six-page sequence complete | polish only | low | none required before sandbox work | low |
| Dynamic Spatiotemporal Process Sandbox | strong Process Lab bones | rename/spec, engine wrapper, comparator | terminology/scientific overclaim | A1 | high |
| Flow Fields Sandbox | mature demo | engine wrapper, claim metadata | synthetic field overclaim | A4 | medium |
| Oracle Coupled Sandbox | useful demo | acquisition contract, route-aware coupling | oracle/belief confusion | A5 | medium |
| Stochastic / Uncertainty Sandbox | good teaching demo | hidden-event lifecycle, belief engine | not first-class in game modes | A6 | high |
| Comparative Engine Sandbox | missing | all | CA/ocean conflation | A3 | high |
| Planner / Mission Evaluation | strong planning/debrief bones | explicit benchmark modes | broad modes lack clean contracts | A8 | high |
| Engine contract | missing formal layer | adapter API and conformance tests | incompatible field shapes | A2 | high |
| Expected-vs-hidden discovery | conceptual/partial | diagnosis state/objective switching | adaptive claims unsupported | A6/A9 | high |
| Continuous glider model | partial | depth, interpolation, tensor trajectory | grid-centered science scoring | A7 | high |
| Export schemas | strong base | objective authority, engine metadata, depth, hidden-event lifecycle | future schema churn | A2/A7/A9 | medium-high |
| Test coverage | broad smoke coverage | engine contract, adaptive/full autonomy tests | regression risk during pivot | each phase | medium |

## 21. Recommended Implementation Roadmap

Learning Labs are complete enough. Do not expand them before architecture work.

Recommended safest phase order:

1. **Phase A1 - Dynamic Spatiotemporal Process Sandbox Refactor Spec**  
   Define final name, UI vocabulary, legacy compatibility, claim levels, export labels, and exact Process Lab boundaries.

2. **Phase A2 - Simulator Engine Contract Implementation**  
   Add adapter interfaces and metadata wrappers for process, flow, belief, acquisition, and mission execution without changing behavior.

3. **Phase A3 - Comparative Ocean Process Engine Sandbox**  
   Build side-by-side scalar engine comparison: CA, advection, diffusion, decay, plume/source, reaction-advection-diffusion, stochastic ensemble.

4. **Phase A4 - Flow Fields Sandbox Hardening**  
   Wrap flow sampler in engine contract, add claim-level metadata and stronger export diagnostics.

5. **Phase A5 - Oracle Coupled Sandbox Refactor**  
   Clarify oracle objective, reachable value, deterministic clock, and route-aware coupled value without introducing belief claims.

6. **Phase A6 - Uncertainty Sandbox Hidden/Expected State Upgrade**  
   Add explicit forecast-error vs hidden-discovery diagnosis model, hidden-event probability/confidence, and update-cycle metadata.

7. **Phase A7 - Continuous Glider over Gridded Fields Model**  
   Formalize interpolation along continuous routes, trajectory/depth/time exports, depth-layer sampling, and top-down collapsed score semantics.

8. **Phase A8 - Planner Benchmark Mode Skeleton**  
   Create explicit Planner Benchmark mode around fixed objective, route choice, fair solver packet, simulation, debrief, and oracle comparison.

9. **Phase A9 - Adaptive Benchmark Mission Manager**  
   Add fixed mission-manager policy, surface observation diagnosis, objective transitions, objective history, and adaptive debrief.

10. **Phase A10 - Full Autonomy Solver Interface**  
   Extend solver contract so agents choose both objective and route, with fairness labels, policy metadata, oracle datasets, and leaderboard/debrief support.

Bottom line: the project has the right skeleton, especially in Learning Labs, field demos, process modules, and route/debrief infrastructure. The main gap is not a lack of features; it is the absence of a common engine contract and explicit benchmark-mode product boundaries.
