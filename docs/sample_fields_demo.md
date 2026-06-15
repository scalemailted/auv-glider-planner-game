# Deterministic Spatiotemporal Process Lab

Menu label: Process Lab. Legacy name: Sample / ROI Field Demo. See also [Deterministic Spatiotemporal Process Lab](sampling_process_lab.md).

## Purpose

The Deterministic Spatiotemporal Process Lab visualizes `S(x,y,t)`: sampling value, reward value, or objective value at map location `x,y` and demo time `t`.

Source / Initial Field is the primary substrate in this lab. It is deterministic or seeded process support, not uncertainty, belief, forecast probability, or Bayesian likelihood. ROI is the output interpretation: cells or regions currently or prospectively important to sample.

It is now organized as a mode-aware, context-based spatiotemporal field composer. The normal first controls are `Mode` and a context-specific model or analog selector: an Example Process applies an editable deterministic process recipe, while `Custom Composer` exposes the same primitive controls directly for user-authored/global component recipes. The two guided example contexts are Foundational CA Models and Ocean-Relevant Process Analogs. The primary modes are Foundational CA Models, Ocean-Relevant Process Analogs, Custom Composer, Process Paint, and Rule Allocation Sandbox. Diagnostics is available through Display / Diagnostic Layer and the right-panel Diagnostics tab rather than as a primary workflow mode. Guided process examples now use discrete generation playback and semantic rule displays by default. Foundational CA Models and Ocean-Relevant Process Analogs advance on the process tick clock, not the render loop. The default rate is 1 generation per second, with Step Generation, Run/Pause, Reset, and tick-rate controls. Their default displays explain state, rule metric, transition class, sampling interpretation, or source/initial field rather than generic heat. The right panel explains the selected process automatically, including its rule/update-function framing. Internal and exported fields may still use `referenceSignature` names for compatibility. Legacy behavior presets remain in code for compatibility and debugging, but they are not the normal UI entry point. The demo answers:

- where events can originate or recur
- what spatial shape the sample-value field has
- how values are assigned inside that shape
- how intensity changes over time
- how the spatial distribution moves, jumps, wanders, or propagates over time
- at what scale the process acts
- whether the process is time-indexed, state-evolving, or history-aware
- how sampling, depletion, freshness, and recovery alter value

## Conceptual Model: S(x,y,t)

`S(x,y,t)` is a scalar field over map position and demo time.

The demo also exposes an Event Likelihood Field:

```text
L(x,y,t)
```

`L` is the generative substrate: where sample-value events, clusters, targets, bursts, or activations are likely to originate at time `t`. `S` is the observed sample value after likelihood, spatial pattern, value distribution, temporal behavior, spatial evolution, and sampling effects are composed.

Concept boundary:

```text
F(x,y,t): physical flow/current vector field
L(x,y,t): event likelihood scalar field
S(x,y,t): realized sample value scalar field
U(x,y,t): uncertainty / forecast-error scalar field
```

`L` can pulse, recover, walk, jump, ripple, or propagate as likelihood dynamics, but it is not a physical current and does not move water or gliders.

## Hierarchical Graph-Based Field Dynamics

A dynamic ROI field can be represented as a hierarchical grid graph:

```text
C_k(t): cluster/community likelihood
L_i(t): cell likelihood/readiness
A_i(t): cell activation state
S_i(t): realized sample value/reward
```

Clusters or communities represent regional event-proneness such as hotspot basins, monitoring stations, rainfall cells, front regions, or source basins. Cells represent local readiness and activation. Edges represent how activation spreads, inhibits, cools, ignites, recovers, drifts, or propagates through neighboring cells. Sample value is the realized reward generated from cluster likelihood, cell likelihood, activation state, temporal forcing, and sampling effects.

A dynamic ROI field can therefore be represented as a grid graph. Each cell is a node and neighboring cells are connected by edges. Update rules use each node's current state, incoming messages from neighbors, cluster influence, temporal forcing, and sampling effects to produce the next likelihood and sample-value fields.

Graph nodes can carry likelihood `L_i(t)`, sample value `S_i(t)`, activation state, cooldown, recovery, freshness/age, phase, susceptibility, community id, and synthetic last-sampled time. Edges carry neighbor influence, distance, direction, drift bias, spread probability, and community-boundary penalties. Cellular automata are one special case of this graph-message model; the ROI demo also uses graph rules for cooldown/recovery hotspots, neighbor spread, front propagation, ripple activation, directed drift, and freshness/revisit recovery.

These are simplified analog dynamics for teaching sampling strategy. They are not validated wildfire, ecological, rainfall, crime, or hydrodynamic simulators.

Process Paint and Rule Allocation Sandbox use the canonical deterministic rule-family catalog `sampling-process-rule-families-v1`: `inert`, `propagatingFront`, `excitableWave`, `localBirthDeath`, `diffusiveSpread`, `directedTransport`, `cyclicDominance`, `domainFormation`, `thresholdCascade`, `interactingPopulation`, `freshnessRecovery`, `morphogenesis`, `congestionWave`, `structuredSignal`. Older saved IDs such as `frontPropagation`, `birthDeath`, `diffusionSpread`, `driftTransport`, `clusterFormation`, `cascade`, `predatorPreyMigration`, `signalPropagation`, and `none` remain aliases, but new paint layers and exports write canonical IDs.

When Process Paint is running, the lab advances painted cells through a deterministic CA-style stepper. Each frame emits `stateLayer`, nullable `ruleLayer` cell overrides, canonical `resolvedRuleLayer`, `groupLayer`, `sourceField`, `samplingValueField`, `transitionLayer`, `roiRoleLayer`, and `processMessages`. A `null`/`inherit` rule slot means "use the group rule"; explicit `inert` means "do not update this cell." Movement-like rules use deterministic proposed writes that are resolved after the scan loop, so transported cells are not overwritten by later cell processing. Time-series exports use `initial-frame-then-steps-v1`: frame 0 is the painted initial state, frame 1 is the first update, and later frames continue stepping. Browser playback for discrete process contexts uses `discrete-generations-v1`: render frames are separate from logical generations, and exports record `processTiming` plus `processDisplayMetric`. The right-panel cell editor reports the canonical rule label, transition record, ROI role, group, source value, and sampling value for the selected cell.

Feature-evolution patterns describe how scalar structures move, spread, rotate, deform, or activate:

```text
V_L(x,y,t): likelihood evolution / propagation influence
V_S(x,y,t): sample-value motion / deformation influence
```

These are teaching analogs for dynamic sampling strategy. They are not validated wildfire, rainfall, ecology, crime, or hydrodynamic simulators, and they are not the Flow Field Demo's physical current field.

The center viewport renders this field as a cell heatmap. Cooler cells have lower sample value; warmer cells have higher sample value. The field is deterministic from the demo seed and controls, so random-looking texture and pulses are replayable rather than unseeded page-load randomness.

The ROI demo is a persistent sample-opportunity process by default. Decay is balanced by regeneration from the Event Likelihood Field unless a future explicit finite/one-shot behavior is selected. This keeps the demo useful for exploring ongoing sampling strategies instead of letting ordinary bursty, periodic, random-walk, or propagation modes collapse into an empty field.

## Activity Balance

Sample value can fade, move, spread, and deplete, but new activity is injected from the Event Likelihood Field. This prevents the field from becoming empty by default and reflects the idea that operational sampling environments continue to produce new opportunities over time.

The time-indexed activity update is deterministic from the same seed and settings:

```text
retained value
+ likelihood-driven new activity
+ local propagation
- temporal decay
- synthetic visit depletion
```

`Bursty` means activity appears in active windows and quiets between them; future bursts regenerate from `L(x,y,t)`. `Discrete Jump` means the next event source is reseeded or relocated from likelihood-biased regions. `Random Walk` keeps active regions bounded while they move by local seeded steps. `Neighbor Propagation` spreads activity locally and can activate likely nearby cells instead of only smearing values downward.

The lab uses progressive disclosure: the left Mission Console stays compact and control-focused, the Phaser status line shows a short mode/recipe/metric summary, and detailed diagnostics live in the right Diagnostics panel.

```text
Recurrent Stationary Hotspots · Bursty · Stationary · Sample Value + Likelihood Overlay · t=49.8s · Mean 0.42 · Active 24% · High 8% · Max 0.94
```

Set `globalThis.ANCHOR_DEBUG_ROI_DYNAMICS = true` in the browser console to log detailed frame diagnostics, including min/mean/max, variance, p10/p50/p90, active and high-value cell fractions, active bounding-box coverage, connected components, quadrant occupancy, total activity mass, injected activity, decay loss, depletion loss, boundary loss, regeneration amount, graph update rule, graph node state counts, edge message totals, dynamic range before/after contrast shaping, and whether normalization occurred.

Set `globalThis.ANCHOR_DEBUG_ROI_COMPOSER = true` while inspecting Recurring Hotspots to log persistent likelihood mode centers, pairwise separation, mode-center bounding box, active recurring basin count, high-value component count, likelihood/sample correlation, and temporal phase.

## Why the Demo Separates Pattern, Parameters, and Process

Earlier versions exposed a long list of named examples, but many names mixed different concepts: spatial geometry, number of clusters, temporal behavior, statistical texture, and history-aware sampling effects.

The refactored demo separates these concepts. The Event Likelihood Field describes where event origins, sparse candidate sites, jump destinations, random-walk bias, and propagation likelihood come from. It can be static as `L(x,y)` or dynamic as `L(x,y,t)`. The spatial pattern describes how value is organized around that substrate. Spatial parameters describe how that pattern is shaped. Value Distribution describes how values are assigned. The temporal pattern describes how intensity changes over time. Spatial evolution describes how the spatial distribution stays fixed, drifts, jumps, wanders, propagates, expands, contracts, deforms, swirls, mutates, or branches. The state model explains whether the field is time-indexed, frequency-based, state-evolving, or history-aware.

A two-cluster field is not a separate theory from a three-cluster field. Both are instances of a clustered field with a different cluster count. This is why the demo uses `Clustered Field` plus `Cluster Count` rather than separate Single Cluster, Bimodal, and Multi-Hotspot modes.

Linear Band and Front / Boundary remain in the pure Sample / ROI Demo because they are generic spatial geometries. Domain-specific mechanisms such as current-advected plumes, coastal runoff, and channel transport are demonstrated in the Coupled Fields Demo.

Knowledge decay and revisit recovery are history-aware sample-value behaviors. They model the idea that recently sampled regions have lower immediate value, while unvisited or stale regions become valuable again over time.

## What This Demo Does Not Cover

This demo does not show:

- current vectors or water-flow particles
- current-advected sample transport
- flow-stretched sample value
- forecast vs truth
- uncertainty
- information gain
- forecast error
- update assimilation

Use Flow Fields Demo for `F(x,y,t)`, Coupled Fields Demo for current-dependent sample behavior, and Uncertainty / Forecast Demo for forecast/truth/uncertainty concepts.

## Observable Pattern Composition

The demo builds sample-value behavior from independent axes:

- **Event Likelihood Field:** where event origins and future activity are likely.
- **Spatial Pattern / Geometry:** where value appears.
- **Value Distribution:** how values are assigned within that spatial geometry.
- **Temporal Pattern:** how intensity changes over time.
- **Spatial Evolution:** how the spatial distribution moves, jumps, spreads, or propagates.
- **Interaction Scale / Hierarchy:** whether the behavior acts on the global field, cluster/community, cell/node, edge/neighbor, or a hybrid of scales.
- **State Model / Memory:** whether the process is time-indexed, frequency-based, state-evolving, or history-aware.
- **Sampling Effect:** how observation changes future value.
- **Display Layer:** which value layer the heatmap is currently showing.

A bursty clustered field can behave differently depending on spatial evolution. With Stationary evolution, the same cluster grows and fades in place. With Discrete Jump, each burst can reappear elsewhere. With Continuous Drift, features move smoothly through the domain. With Random Walk, features move by local seeded steps. With Neighbor Propagation, activity spreads from active cells to nearby cells.

## Behavior Explainers

Every major component in Process Lab has behavior help. The left Mission Console stays compact and contains controls plus small `Explain ...` buttons for primitive components. The selected Example Process explains itself automatically in the right panel; it does not need a separate left-panel Explain button. Component explainers cover meaning, expected heatmap behavior, important parameters, useful pairings, strategy implication, and demo boundary.

| Component Group | What it controls | Example question answered |
|---|---|---|
| Event Likelihood Field | Where event origins and future activity are likely | Where are events prone to start, jump, walk, or spread? |
| Spatial Pattern / Geometry | Where value is organized in space | Where are the valuable cells? |
| Value Distribution | How values are assigned within that geometry | Are values constant, uniformly random, near a mean, skewed, bimodal, heavy-tailed, or rare-extreme? |
| Temporal Pattern | How intensity changes over time | When does value rise, fade, pulse, or stay steady? |
| Spatial Evolution | How the spatial distribution changes over time | Does the pattern stay fixed, drift, jump, wander, spread, deform, swirl, mutate, or branch? |
| Interaction Scale / Hierarchy | The scale where the process acts | Is behavior global, basin-level, cell-level, edge-level, or hybrid? |
| State Model / Memory | What the field depends on | Is value computed from time, cycles, current state, or longer history? |
| Sampling Effect | How visits change future value | Does sampling deplete, cool neighbors, or recover later? |
| Display Layer | Which value layer is visible | Am I viewing raw value, depleted value, freshness, or composed sample value? |

Each Behavior Help page also includes `This component changes`, `This component should not change`, `Look for this in the heatmap`, `Useful display layers`, and `Common confusion`. After changing one primitive from a selected preset, the left console shows a component isolation hint with the expected effect and recommended diagnostic views. Lightweight compatibility warnings call out educationally confusing combinations, such as static temporal forcing with neighbor propagation or freshness effects while viewing only Event Likelihood.

## Process Contexts and Legacy Presets

The top-level Mode selector decides the workflow:

- `Foundational CA Models` and `Ocean-Relevant Process Analogs`: show one context-specific selector, apply an editable example recipe, and preserve legacy `referenceSignature` metadata for compatibility.
- `Custom Composer`: hides the Example Process selector and lets users edit primitive controls directly. Imported custom recipes, if supported later, belong here.

Guided process examples do not replace primitive controls. Selecting an example fills in the underlying Source / Initial Field, Spatial Pattern, Value Distribution, Temporal Pattern, Spatial Evolution, State Model, Sampling Effect, and relevant parameters. Users can then modify those controls to create custom behavior; the example remains marked as modified so the result can still be compared against the original guided process.

Legacy behavior presets are curated combinations of the primitive sample-field controls. They remain available for compatibility, internal mapping, and optional debug workflows, but the normal left-panel UI no longer starts from a visible preset dropdown.

| Preset | What it demonstrates | Key composition |
|---|---|---|
| Recurring Hotspots | Repeated activity in separated preferred regions | Multi-modal likelihood basins + out-of-phase recurring sample flares |
| Migrating Patch | Smooth feature movement | Gaussian likelihood + clustered field + continuous drift |
| Expanding Front | Spreading boundary | Front / Boundary + neighbor propagation |
| Patchy Rainfall | Irregular activity patches | Seeded texture likelihood + patchy field + random pulses |
| Drifting Storm Cells | Moving compact rapid-pulse cells | Clustered field + rapid pulses + continuous drift |
| Freshness / Revisit Value | Value recovers after time | History-aware + freshness |
| Wandering Hotspot | Mobile coherent source | Gaussian likelihood + bounded random walk |
| Neighbor Spread | Local activation/spread | Patchy field + neighbor propagation |
| Ripple Activation | Traveling activation band | Patchy likelihood + wave/ripple propagation |
| Oscillating Ecological Field | Phase-shifted cycles | Periodic + frequency-based |
| Forest Fire Front (inspired) | Advancing active front | Front + propagation + depleted residual |
| Life-Like Cellular Emergence (inspired) | Local-rule emergence | Neighbor propagation + state-evolving |

Some guided process examples and legacy presets are inspired by real-world processes but are simplified educational examples. They are not validated process models and do not add current-field dependencies. Flow-driven examples belong in the Coupled Fields Demo.

Preset sanity checks can be run from Node:

```bash
node tools/js/audit_sample_field_presets.mjs
```

The legacy audit script evaluates each preset over multiple demo times and reports active fraction, frame-to-frame delta, connected components, center-of-mass movement, spatial correlation, extinction warnings, saturation warnings, and static-dynamic warnings. In the browser console, set `globalThis.ANCHOR_DEBUG_ROI_PRESETS = true` to log compact legacy-preset audit output when using the debug path.

The right-panel Behavior Help view includes a `Current Composition` card that summarizes how the selected components combine, for example `Multi-Modal Likelihood + Clustered Field + Gaussian / Normal + Bursty + Discrete Jump + Time-Indexed + Soft Depletion + Sample Value`. Current-driven transport, plumes, flow-stretched patterns, forecast, truth, uncertainty, information gain, and forecast error are routed to the Coupled Fields Demo and Uncertainty / Forecast Demo.

## Viewing the Event Likelihood Field

The Display Layer selector opens on `Sample Value + Likelihood Overlay` by default, and can also show the realized sample value `S(x,y,t)` or the Event Likelihood Field `L(x,y,t)` on its own.

The Event Likelihood view shows the generative substrate that controls where events are likely to form. This is different from realized sample value. With Multi-Modal Likelihood and Bursty temporal behavior, likelihood may remain high in several preferred regions while the realized sample value activates in only one region during a burst. With Discrete Jump spatial evolution, the likelihood field can relocate between burst windows, causing future clusters to appear in different places.

Overlay mode keeps `S(x,y,t)` as the heatmap and draws high-likelihood cells as pale dots/rings on top. Use it to compare where events are likely to originate with where sample value is currently active. The Cell Inspector always reports both `L(x,y,t)` and `S(x,y,t)`, regardless of which display layer is selected.

## Reading the Graph Views

Graph-backed ROI fields expose the hierarchy behind `S(x,y,t)`. `Graph Topology` shows the structural neighbor graph and community boundaries. `Graph Communities` tints cells by community or basin membership, draws community boundaries, and marks cluster/centroid centers. `Node States` shows inactive, active, cooling, recovering, susceptible, consumed, and inhibited cells over a muted heatmap. `Graph Messages` filters to the strongest local influence edges so the display shows meaningful message flow rather than every neighbor edge. `Community + Messages` combines community regions, active nodes, cluster centers, and strong messages. `State Transitions` highlights nodes that changed state and shows transition causes when the update rule emits them. `ROI Meaning` derives current ROI, near-future ROI, low/depleted/dead cells, and transition boundaries from `S`, `L`, node state, messages, and transitions. `Diagnostics Overlay` adds likelihood markers, filtered messages, node-state legend glyphs, and state-count proportions.

Layered view filters can hide inactive nodes, show transition nodes only, choose message types, threshold or cap messages, select same-community or cross-community edges, and focus incoming/outgoing messages for the selected cell. Dynamic `edgeMessages` are preferred; inferred message edges are labeled as diagnostic fallback. The Cell Inspector reports the selected cell's graph node, community, filter status, `C_k(t)`, `L_i(t)`, `A_i(t)`, node state, incoming/outgoing message totals, strongest local incoming/outgoing message, filtered causal messages, transition record, derived ROI roles, depleted/dead status, inhibited-neighbor count, and nearest cluster. These messages are abstract ROI influence, not physical current vectors.

## Process Contracts and Recipes

Guided process examples are recipes, not opaque models. Each example has related models, an observable pattern, sampling interpretation, expected failure signs, best display layers, and a component recipe. The right panel opens on `Process Example View` by default so users see Current Lab State before selecting a cell. Process Example View shows which component controls source support, geometry, value distribution, timing, evolution, memory, sampling effect, display, and the local rule/update-function framing.

Legacy presets also carry process contracts for backward compatibility and debug comparison. They are documented as internal examples rather than the primary UI.

The Process Example and Sampling Interpretation cards explain the observable heatmap pattern, what should change over time, what makes cells important, best display layers, and failure signs that would make the behavior unrepresentative. Sampling Interpretation separates current sample value, near-future value, low/depleted/dead regions, and the sampling intuition for the selected process.

## Component Isolation Examples

The left console includes Component Isolation Examples for comparing one component while holding the rest of the recipe stable:

- `Compare Temporal Patterns` keeps event likelihood and spatial geometry fixed while cycling sustained, periodic, bursty, intermittent, and pulse-then-silence timing.
- `Compare Spatial Evolution` keeps value shape and timing fixed while cycling stationary, continuous drift, discrete jump, random walk, neighbor propagation, expansion, contraction, divergence, convergence, morph/mutation, shear/stretch, rotational swirl, and branching growth.
- `Compare Interaction Scale` keeps a graph-backed patch recipe fixed while cycling global, cluster, cell, edge, and hybrid interpretation.

These examples are teaching controls, not a dataset generator. They use stable seeds so students can watch what changed and what stayed fixed.

## Analytic vs State-Evolving Rules

Recipe View labels the simplified implementation type. Some behaviors are analytic time-indexed analogs, some use state-evolving graph updates, some are local cellular transition rules, and freshness modes are history-aware recovery rules. Analytic analogs are valid teaching tools, but they should not be mistaken for validated domain simulators or physical current models.

## Interaction Scale / Hierarchy

Interaction Scale answers: at what scale does behavior act?

| Interaction Scale | Meaning |
|---|---|
| Global Field | The whole field acts as one process. |
| Cluster / Community | Basins or communities can activate independently. |
| Cell / Node | Per-cell readiness, activation, cooldown, and recovery matter. |
| Edge / Neighbor | Neighbor influence and graph messages are central. |
| Hybrid Multi-Scale | The behavior combines field, community, node, and edge cues. |

Some Phase 2 options are explanatory metadata for analytic rules rather than separate numerical update paths. Graph-backed local rules expose the strongest scale-specific effects through Graph Communities, Node States, Graph Messages, Community + Messages, and Diagnostics Overlay. If a selected combination is only partially supported or potentially confusing, the console reports an educational compatibility warning instead of blocking the configuration.

Graph-backed fields emit causal `edgeMessages` and `nodeTransitions` where available. The Graph Messages display uses emitted messages first and falls back to inferred diagnostic messages only for older/missing graph metadata. Inspector rows label whether message data is emitted or inferred.

## Likelihood Mesh Overlay

The likelihood mesh renders `L(x,y,t)` at every cell. Dot size and brightness indicate how close a cell is to becoming event-active. This is different from the sample-value heatmap `S(x,y,t)`, which shows currently realized sampling value.

Likelihood nodes or modes are sources, basins, attractors, or controllers that influence the mesh. They are not the field by themselves. The mesh is the full cell-centered likelihood field. In propagation-style presets, subtle cell-to-cell links can show local high-likelihood neighbor relationships without turning the ROI demo into a physical flow visualization.

## Demo Artifact Export

`Export Demo JSON` downloads an `anchor.demo.sample-roi-field` artifact for Colab/notebook rendering. Choose start time, end time, and timeframe count to include a `frames[]` series sampled from the current settings. It includes the current scene config, active `viewFilters`, active `patternSource`, reference signature metadata when active, component recipe, legacy preset metadata when applicable, process contract, active component recipe after modifications, modified component hint, compatibility warnings, ROI interpretation, demo time, row-major displayed sample value, `L(x,y,t)` event likelihood, likelihood mesh thresholds, likelihood field metadata/nodes/diagnostics, `graphField` metadata, graph state/message layers, graph community-id layers, filtered top graph messages, node transitions, raw base value, evolved value when available, field stats, activity diagnostics, high-value cells, and selected-cell inspector state. Arrays are indexed as `field[row][col]` using top-left origin and cell-center coordinates.

Freshness / Age of Information values remain labeled as demo-only synthetic visit effects unless they are later tied to actual mission visits.

## Synthetic Scenario Export

The same Export section also offers Scenario Generation. This creates a compact `anchor.syntheticRoiScenario` artifact from the active pattern source: reference signature, custom component recipe, or legacy preset metadata when using the compatibility path. Controls choose the scenario seed, difficulty, duration, frame count, and validation policy. The exported file includes `S(x,y,t)` sample-value frames, `L(x,y,t)` event-likelihood frames, graph state/message layers when available, process contract metadata, sampled parameters, scenario labels, per-frame labels, diagnostics, and validation summaries.

Scenario validation is observable-pattern validation, not domain-model certification. It checks that the synthetic process is non-empty, not saturated, changes over time, and matches family-specific signatures such as recurring hotspots, propagating fronts, drifting/patchy activity, or freshness recovery. The component toybox remains available for visual exploration; scenario export is the compact seeded handoff format for notebooks and downstream experiments.

## Event Likelihood Field

Event Likelihood Field is the primitive substrate. It answers: where are events likely to originate or move next?

It is not the displayed value distribution and it is not a current, terrain, or land model. It biases:

- cluster and event origins
- sparse target candidate sites
- discrete jump destinations
- random-walk movement direction
- neighbor-propagation activation and spread

The implemented Event Likelihood options are:

| Event Likelihood Field | What it means | Typical effect |
|---|---|---|
| Uniform Likelihood | Every cell is equally event-prone | Neutral baseline |
| Gaussian Likelihood | One smooth seeded event-prone region | Events favor one broad basin |
| Multi-Modal Likelihood | Several seeded event-prone regions | Clusters and jumps favor several basins |
| Gradient Likelihood | Event-proneness increases along a seeded direction | Activity favors the high-likelihood side |
| Patchy Likelihood | Irregular spatially correlated event-prone patches | Propagation and targets favor patch neighborhoods |
| Seeded Texture Likelihood | Fine/coarse replayable texture | Irregular event-prone pockets |
| Sparse Candidate Sites | Small seeded candidate locations | Sparse targets and jumps favor candidate neighborhoods |

`Constant Field` is not the event substrate. Constant Field remains a Spatial Pattern that adds no geometry. Use `Uniform Likelihood` when event origins should be unbiased.

## Field-Evolution Analog Patterns

The demo uses simplified feature-evolution patterns as validation targets:

| Pattern | Expected signature | Sampling lesson |
|---|---|---|
| Uniform Drift | centroid moves smoothly with high frame overlap | intercept the future location |
| Radial Source / Expansion | active area grows in a bounded way | target the active edge |
| Radial Sink / Contraction | activity concentrates toward a basin | anticipate accumulation zones |
| Rotational / Vortex | features recur around a bounded path | time arrivals around circulation |
| Shear / Stretching | aspect ratio or elongation changes | adapt to deformation, not only translation |
| Wave / Ripple | activation crest moves locally | sample the next wave band |
| Front / Boundary Motion | active front advances with residual behind it | sample the transition boundary |
| Multi-Source Pulsing | separated modes pulse out of phase | choose the currently useful basin |
| Random-Walk / Wandering Center | displacement is local and bounded | track mobile sources without assuming teleportation |
| Birth-Death / Cellular Activation | cells activate, cool, recover, or trigger neighbors | exploit state transitions |

### Source Field Dynamics

The Source / Initial Field substrate can be:

- `Static`: `L(x,y)` is fixed over time.
- `Dynamic`: `L(x,y,t)` changes over demo time.

When dynamic, Source Field has its own controls:

- `Source Temporal Pattern`: Static, Sustained, Periodic, Bursty, Intermittent, Rapid Pulse, Pulse Then Silence, Long-Tail Decay, Gaussian Time Envelope, Random Pulses, Wavy / Multi-Frequency, or Long Cycle.
- `Source Spatial Evolution`: Stationary, Continuous Movement, Discrete Jump, Random Walk, or Neighbor Propagation.

These controls affect `L`, not the already-realized sample-value layer. For example:

```text
Event Likelihood Field: Multi-Modal Likelihood
Source Temporal Pattern: Bursty
Source Spatial Evolution: Discrete Jump

Spatial Pattern: Clustered Field
Temporal Pattern: Bursty
Spatial Evolution: Stationary
```

This means the likelihood substrate chooses which region is event-prone during each burst window. Once a cluster appears during that burst, the cluster can grow and fade in place. The next burst can form elsewhere because `L(x,y,t)` changed.

`Continuous Movement` changes likelihood smoothly through adjacent or intermediate locations. `Discrete Jump` is the mode for discontinuous relocation between event windows. `Random Walk` moves likelihood peaks by local seeded steps. `Neighbor Propagation` spreads high-likelihood influence into nearby cells.

## Event Likelihood vs Spatial Pattern vs Value Distribution

The demo separates event-proneness, geometry, and assigned values.

- Event Likelihood Field is where events are likely to originate or move next.
- Spatial Pattern is the geometry used to organize value around that substrate.
- Value Distribution is how values are assigned within the resulting geometry.

A Constant Field with Constant Value is flat. A Constant Field with Uniform Random values has no spatial structure, but each cell receives a seeded random value from a uniform distribution. A Gaussian / Normal distribution produces values mostly near a mean, with fewer extremes.

A uniform likelihood field does not mean every cell has the same sample value. It means every cell is equally likely to host an event. The realized value still depends on the spatial pattern, value distribution, temporal pattern, spatial evolution, and sampling effects.

Examples:

- `Uniform Likelihood + Uniform Random`: events can originate anywhere, and realized values are seeded draws across the value range.
- `Gaussian Likelihood + Uniform Random`: events tend to originate near a center, but realized values are still spread across the value range.
- `Multi-Modal Likelihood + Clustered Field`: clusters tend to form near several preferred regions.

- Clustered Field + Cluster Count 2 creates two spatial clusters.
- Bimodal Values would create two preferred value ranges.
- These are different concepts.

The implemented Value Distribution options are Constant Value, Uniform Random, Gaussian / Normal, Skewed Low, Skewed High, Bimodal Values, Heavy-Tailed, and Rare Extreme Events. Uniform Random means low, medium, and high values are approximately equally likely for the same seed. Gaussian / Normal means most cells fall near the middle value and fewer cells land near the low or high extremes. Skewed Low and Skewed High bias the magnitude distribution without moving the geometry. Bimodal Values separates cells into low and high value bands. Heavy-Tailed creates occasional large values. Rare Extreme Events keeps most values low while preserving sparse replayable extreme cells.

## Spatial Patterns

Spatial Pattern answers: where is sample value located?

| Spatial Pattern | What it shows | Key parameters | Strategy |
|---|---|---|---|
| Constant Field | No spatial structure; every cell starts from the same base value before value distribution is applied | Value distribution, seed | Coverage efficiency / baseline |
| Gradient / Trend | Smooth spatial trend | Direction, strength, smoothness | Travel vs reward |
| Clustered Field | `k` coherent value clusters | Cluster count, cluster size, separation | Target selection / assignment |
| Patchy / Correlated Field | Spatially correlated irregular patches | Correlation length, smoothness, contrast | Local exploration |
| Sparse Targets | Isolated valuable targets | Target count, radius, value | Objective routing |
| Linear Band | Long narrow value strip | Orientation, width, softness | Follow/cross band |
| Front / Boundary | Transition between value regions | Sharpness, contrast, boundary mode | Edge sampling |
| Boundary Band | Value near domain boundary | Side, width, softness | Boundary coverage |
| Monitoring Stations | Fixed revisit locations | Station count, recovery | Persistent monitoring |
| Seeded Texture | Deterministic irregular values | Scale, smoothness, seed | Irregular landscape planning |

- `Constant Field`: no spatial structure is added; Constant Value stays flat, while Uniform Random or Gaussian / Normal can vary values without introducing clusters, bands, fronts, or gradients.
- `Gradient / Trend`: value changes smoothly across the domain.
- `Clustered Field`: one or more localized high-value regions.
- `Patchy / Correlated Field`: locally correlated texture with broad patches.
- `Sparse Targets`: isolated high-value sample targets.
- `Linear Band`: a long narrow region of elevated sample value for transects, ridge-like value fields, and corridor-shaped reward fields.
- `Front / Boundary`: a sharp or soft transition between low-value and high-value regions for boundary-following and edge-sampling strategies.
- `Boundary Band`: an abstract edge-shaped value band, not a coastal or current mechanism.
- `Monitoring Stations`: fixed station-like targets that support revisit strategy.
- `Seeded Texture`: deterministic fine/coarse value texture with spatial coherence.

The left Mission Console provides quick hover help and compact Explain buttons for primitive controls. The right panel shows the selected `About ...` explainer for Event Likelihood Field, Spatial Pattern, Value Distribution, Temporal Pattern, Spatial Evolution, State Model, Sampling Effect, and Display Layer.

## Value Distributions

Value Distribution answers: how are values assigned within the selected spatial pattern?

- `Constant Value`: every cell receives the same base value before other enabled processes.
- `Uniform Random`: each cell receives a deterministic seeded random draw from a uniform distribution over the allowed range.
- `Gaussian / Normal`: each cell receives a deterministic seeded draw from a bell-shaped distribution centered near the mean.
- `Skewed Low`: most cells receive lower values while the selected spatial geometry remains unchanged.
- `Skewed High`: most cells receive higher values, which can make broad active regions look more saturated.
- `Bimodal Values`: cells tend to fall into low or high value bands rather than mid-range values.
- `Heavy-Tailed`: most values are modest, with a replayable high-value tail.
- `Rare Extreme Events`: most values remain low, with sparse deterministic extreme cells.

## Guided Process Examples

Guided process examples are deterministic recipes inspired by known cellular automata and grid-process families. They are not exact reproductions. Their purpose is to connect a recognizable process behavior to the Process Lab component system:

```text
known process model or pattern -> process example -> editable component recipe -> dynamic heatmap
```

The visible mode selector exposes Foundational CA Models and Ocean-Relevant Process Analogs directly. Observable Process Patterns are bridge metadata, not a primary selector.

Foundational CA Models:

- Conway's Game of Life
- Forest Fire
- SIR / Epidemic CA
- Greenberg-Hastings / Excitable Media
- Sandpile / Avalanche
- Wa-Tor / Predator-Prey
- Traffic CA
- Wireworld

Observable Process Patterns:

- Propagating Fronts
- Excitable Waves
- Local Birth-Death Emergence
- Recurrent Stationary Hotspots
- Diffusive / Epidemic Spread
- Directed Feature Transport
- Cyclic Dominance
- Domain / Cluster Formation
- Threshold Cascades / Avalanches
- Interacting Population Migration
- Freshness / Recovery
- Pattern Formation / Morphogenesis
- Congestion / Density Waves
- Structured Signal Propagation

Each Example Process sets Source / Initial Field, Spatial Pattern, Value Distribution, Temporal Pattern, Spatial Evolution, Interaction Scale, State Model, Sampling Effect, and Display Layer. Users can modify any component afterward; the example remains marked as modified so the changed recipe can still be discussed against the original guided process. The right-panel Process Example View / Behavior Help panel shows related models, observable pattern, sampling interpretation, best display layers, failure signs, and what the example is not.

Examples:

- `frontPropagation` is inspired by forest-fire CA, Eden growth, and invasion percolation. The ROI abstraction is active boundary, near-future susceptible region, and depleted or consumed trail. It is not a wildfire simulator.
- `waveExcitableMedia` is inspired by Brian's Brain, Greenberg-Hastings, cyclic CA, and reaction-diffusion wave analogs. The ROI abstraction is crest, recovering trail, and near-future activation band.
- `birthDeathEmergence` is inspired by Conway's Game of Life and Life-like rules. The ROI abstraction is local birth/death, emergent patches, and transition regions.

Future tutorial pages may compare a related CA/grid-process animation with the ROI abstraction heatmap, but this phase does not add GIFs or full CA simulators.

## Example Process Coverage

The comprehensive catalog maps known CA/grid-process models into guided process examples. Foundational models appear directly in the selector; related known models also appear in the right panel, exports, and coverage audits. Internal/export compatibility still uses `referenceSignature` field names.

| Signature | Reference model families | Observable behavior | ROI meaning | CA mechanism tags |
|---|---|---|---|---|
| Propagating Fronts | forest-fire, Eden growth, percolation, DLA | active boundary and consumed trail | sample the front or susceptible region ahead | stochastic, multi-state, extended-neighbourhood, non-uniform |
| Excitable Waves | Brian's Brain, Greenberg-Hastings, reaction-diffusion waves | crest, refractory wake, recovery | sample crests or near-future activation bands | multi-state, extended-neighbourhood |
| Local Birth-Death Emergence | Game of Life, Life-like rules, Generations CA | local births/deaths and emergent patches | inspect transition regions and active components | multi-state, extended-neighbourhood |
| Recurrent Stationary Hotspots | bursty reports, contact-process-like patches | fixed basins with temporal pulses | time visits around active and recovering basins | asynchronous, stochastic, non-uniform |
| Diffusive / Epidemic Spread | SIR/SIS/SEIR, contact process, percolation spread | local spread and recovery | watch active cells and neighbors receiving influence | stochastic, multi-state, extended-neighbourhood |
| Directed Feature Transport | lattice gas, Lattice-Boltzmann analogs, patch transport | coherent scalar feature movement | lead moving ROI features without treating them as current | continuous scalar, extended-neighbourhood |
| Cyclic Dominance | rock-paper-scissors, cyclic CA, cyclic ecology | phase-shifted regions and rotating fronts | schedule visits by phase | multi-state, extended-neighbourhood |
| Domain / Cluster Formation | Ising, voter, majority-rule, Schelling | domains, clusters, and boundaries | sample coherent domains or changing boundaries | stochastic, multi-state, non-uniform |
| Threshold Cascades / Avalanches | BTW/Manna sandpile, threshold cascades | quiet buildup and sudden cascades | react to rare high-value cascade windows | asynchronous, stochastic, multi-state |
| Interacting Population Migration | Wa-Tor, lattice Lotka-Volterra, pursuit waves | interacting moving population patches | route between migrating activity basins | multi-state, extended-neighbourhood |
| Freshness / Recovery | age-of-information, cooldown/recovery, revisit value | sampled cells cool and stale cells recover | avoid repeats and revisit when value recovers | history-aware, multi-state, non-uniform |
| Pattern Formation / Morphogenesis | Turing/Gray-Scott analogs, spot/stripe formation | spots, stripes, splitting, merging | sample emerging structures and boundaries | continuous scalar, extended-neighbourhood |
| Congestion / Density Waves | Nagel-Schreckenberg, BML, stop-go waves | moving density clusters and jam/release fronts | sample density fronts before they move on | stochastic, multi-state, extended-neighbourhood |
| Structured Signal Propagation | Wireworld, signal grids, branching relays | pulses along paths or branching networks | sample active relays or likely next path cells | multi-state, graph/extended, non-uniform |

Run the structural coverage audit with:

```bash
node tools/js/audit_roi_reference_coverage.mjs
```

## CA Taxonomy Framing

The local reference paper, `docs/references/2401.08408v2.pdf`, is used as mechanism framing rather than as a model library. The ROI demo uses the distinction:

```text
component recipe = genotype-like setup
generated heatmap = phenotype-like observable behavior
```

The CA mechanism tags map into the ROI composer this way:

- `asynchronous`: irregular or staggered update timing, intermittent activation, and partial update schedules.
- `stochastic`: seeded random pulses, probabilistic activation, rare events, heavy-tailed values, and rare extremes.
- `multi-state`: active/cooling/recovering/consumed/susceptible graph states plus continuous `L(x,y,t)` and `S(x,y,t)`.
- `extended-neighbourhood`: graph edges, interaction scale, local/extended influence, community interactions, and message diagnostics.
- `non-uniform`: likelihood basins, cluster-specific behavior, heterogeneous substrate, spatially varying parameters, and hybrid updates.

These tags describe scientific grounding and QA expectations. They do not mean the demo implements exact CA rules, exact domain simulators, or validated ecological/traffic/wildfire/epidemic models.

## Spatial Pattern / Geometry

Spatial pattern and geometry parameters tune how the selected realized sample-value pattern is drawn.

- `Cluster Count`: number of cluster centers or station-like targets.
- `Cluster Size`: tight, medium, or wide cluster spread.
- `Noise / Texture`: seeded local variation added to the field.
- `Seed`: deterministic replay seed for the visual pattern. Seeded Texture is random-looking, but it is not arbitrary per-frame noise.

Additional scientific parameters such as correlation length, anisotropy, edge softness, band orientation, and front sharpness can be added later without changing the taxonomy.

## Temporal Patterns

Temporal Pattern answers: how does sample value intensity change over time?

- `Static`: value does not change over time.
- `Sustained`: long active window with gradual change.
- `Periodic`: regular rise/fall cycle.
- `Bursty`: short intense activity followed by quiet periods.
- `Intermittent`: repeated on/off windows.
- `Rapid Pulse`: fast repeated activation that remains seeded and coherent.
- `Pulse Then Silence`: explicit finite one-shot behavior; this is the mode that may intentionally die out.
- `Long-Tail Decay`: semi-finite behavior with slow fade after activation.
- `Gaussian Time Envelope`: smooth rise and fall around a peak window.
- `Random Pulses`: irregular but seeded pulses.
- `Wavy / Multi-Frequency`: smooth mixed-frequency modulation rather than random blinking.
- `Long Cycle`: slow seasonal-style cycle.

A temporal pattern can be dynamic without being stateful. For example, a periodic field can be evaluated directly from `S(x,y,t)`.

## Spatial Evolution

Spatial Evolution answers: how does the spatial distribution itself change over time?

- `Stationary`: the pattern changes intensity but stays in the same location.
- `Continuous Drift`: features move smoothly through adjacent or intermediate locations.
- `Discrete Jump`: the feature fades, then reappears elsewhere without continuous travel.
- `Random Walk`: feature centers or active regions change by small seeded local steps over time.
- `Neighbor Propagation`: active cells influence nearby cells, spreading activity locally.
- `Expansion`: activity grows outward from seeded centers.
- `Contraction`: activity concentrates inward toward seeded centers.
- `Divergence`: activity separates away from seeded centers.
- `Convergence`: activity pulls toward seeded centers.
- `Morph / Mutation`: local seeded changes reshape the field without per-frame random flicker.
- `Shear / Stretch`: the scalar field deforms by synthetic shear or stretch.
- `Rotational Swirl`: the scalar field rotates around seeded centers.
- `Branching Growth`: activity spreads along seeded branch-like local paths.

Current-advected movement is not part of this demo. Shear / Stretch and Rotational Swirl are scalar ROI deformation primitives, not physical flow. Use Coupled Fields Demo when the sample pattern should move because of `F(x,y,t)`.

Spatial Pattern and Spatial Evolution are separate:

- `Clustered Field + Stationary`: a cluster changes intensity but stays in place.
- `Clustered Field + Continuous Drift`: a cluster moves smoothly through adjacent or intermediate positions.
- `Clustered Field + Discrete Jump`: a cluster fades and reappears elsewhere.
- `Patchy Field + Neighbor Propagation`: activity spreads locally from active cells.
- `Front / Boundary + Expansion`: a boundary-like active region grows outward.
- `Seeded Texture + Morph / Mutation`: local regions reshape while remaining deterministic.
- `Linear Band + Shear / Stretch`: a band deforms without becoming current-coupled transport.

### Motion Scope

Motion Scope controls whether spatial evolution is global, per-feature, or local:

| Motion Scope | Meaning | Typical use |
|---|---|---|
| Per Feature | Each cluster, band, target group, or patch region has its own seeded motion path | Default for Continuous Drift, Random Walk, and Discrete Jump |
| Local / Neighborhood | Small local regions evolve based on nearby cells or dense local motion | Patchy / Correlated Field, Seeded Texture, Neighbor Propagation |
| Global | The whole field shifts together as one image | Advanced/demo-only comparison or a moving single band/front |

`Continuous Drift` and `Random Walk` default to `Per Feature`, not `Global`. That means clustered fields move each cluster/region independently instead of sliding the entire heatmap. `Random Walk` is bounded and seeded, so the same seed produces the same local steps. `Discrete Jump` remains the mode where non-local relocation is allowed after fade/quiet windows. `Neighbor Propagation` remains local/neighborhood-based and does not use a whole-domain shift.

## State Model / Memory

State Model / Memory answers: what does the field depend on?

- **Time-Indexed / Memoryless:** `S(x,y,t)` is computed directly from position and time. The field does not need to remember a previous state.
- **Frequency-Based:** future behavior follows repeated cycles or frequency structure, useful for periodic, cyclic, and long-cycle patterns.
- **State-Evolving / Markovian:** the next field state depends on the current field state, often written as `S_{t+1} = f(S_t, inputs_t)`.
- **History-Aware / Non-Markovian:** the field depends on longer sampling or observation history, such as time since last sample or cumulative depletion.

Markovian is not a synonym for any time-varying behavior. Seeded irregular pulses can be deterministic and replayable. Visit-dependent depletion or monitoring recovery is history-aware when visit history affects value.

State model terms:

- `Time-Indexed`: `S` or `L` can be computed directly from `x,y,t`; it is memoryless.
- `Frequency-Based`: behavior follows cycles, frequencies, or seasonal patterns.
- `State-Evolving`: the next state depends on the current state; it is Markovian when only the current state is needed.
- `History-Aware`: behavior depends on longer sampling or observation history, such as time since last visit or cumulative sampling.

## Depletion, Freshness, and Revisit Value

Sampling effects model sample visits:

- `None`: no depletion overlay.
- `Hard Depletion`: sampled cells lose most value.
- `Soft Depletion`: sampled cells lose part of their value.
- `Neighborhood Depletion`: nearby cells partially lose value too.
- `Freshness / Age of Information`: recently visited cells cool down; stale or unvisited cells warm over time.
- `Knowledge Decay / Revisit Recovery`: places become valuable again after enough time passes.

The `Freshness / Revisit Value` display emphasizes age-of-information behavior. Recently visited cells have lower immediate value; unvisited or stale cells warm up over time. Nearby cells may also partially cool due to spatial correlation.

The demo uses deterministic synthetic sample markers rather than actual glider visits. Full mission simulation remains the authoritative source for scored duplicate sampling, cooldown, and recovery rules.

## Observer Particles and Sample Visits

If observer particles are enabled in this demo, they represent sample visits or simulated sampler paths, not water-flow particles. They should move through the sample field, cool visited cells, partially cool nearby cells, and let stale regions recover.

The current implementation uses deterministic synthetic visit markers and freshness fields instead of rendered observer particles.

## Cell Inspector

Click a heatmap cell to inspect it in the right panel. Clicking a cell switches the right panel back to Cell Inspector if Behavior Help was open. Clicking a primitive-control Explain button in the left controls switches the right panel to Behavior Help while preserving the selected cell.

The inspector reports:

- cell coordinate
- event likelihood model and selected-cell likelihood
- displayed layer
- sample value and normalized value
- spatial pattern
- cluster count and cluster size
- temporal pattern
- spatial evolution
- motion scope
- feature motion summary
- state model
- sampling effect
- cluster/high-value membership
- trend
- raw base value
- depleted value
- recovery status when relevant
- neighbor influence

It uses the same generated field that draws the heatmap.

## Relationship to Mission Modes

The pure Sample / ROI Demo helps explain mission modes where sample value itself is the lesson:

- `Survey Sweep`: coverage plus depletion.
- `Fleet Split`: multiple cluster centers plus duplicate/depleted value.
- `Watch Stations`: monitoring stations plus revisit/recovery.
- `Plume Intercept`: bursty or moving sample-value features when movement is independent of flow; current-driven plume behavior belongs in Coupled Fields Demo.
- `Long Glide`: sparse targets plus route economy.

Uncertainty-specific modes such as Signal Hunt, Uncertain Waters, Surface & Adapt, and Forecast Chase should point to an uncertainty/forecast experience. Current-coupled sample behavior should point to Coupled Fields Demo.

## Relationship to Coupled Fields Demo

Use Coupled Fields Demo for:

- current-advected sample value
- flow-stretched hotspots
- eddy-carried value
- shoreline runoff shaped by visible currents
- channel transport
- terrain-constrained fronts

The pure Sample / ROI Demo keeps Linear Band and Front / Boundary only as abstract value-field geometries.

## Strategy Examples

- `Clustered Field + Cluster Count 2`: compare splitting the fleet between two reward regions.
- `Clustered Field + Cluster Count 5`: teach prioritization when many targets compete for limited time.
- `Front / Boundary + Fixed`: teach edge-following and boundary-crossing sample strategies.
- `Clustered Field + Bursty + Stationary`: teach fixed cluster bursts.
- `Clustered Field + Bursty + Discrete Jump`: teach reappearing event patterns.
- `Clustered Field + Sustained + Continuous Drift`: teach migrating patches without current coupling.
- `Patchy / Correlated Field + Sustained + Neighbor Propagation`: teach local spread.
- `History-Aware + Knowledge Decay / Revisit Recovery`: teach freshness, revisits, and avoiding immediate resampling.

## Limitations

- Depletion and recovery are deterministic visual diagnostics, not actual glider visit history.
- State-Evolving and History-Aware demo behavior is lightweight synthetic post-processing, not a full ecological or stochastic process model.
- Observer particles are not currently rendered in the pure sample demo.
- The demo does not validate waypoint routes, compute score, save attempts, or export leaderboard records.
- It should not be used as evidence that a route is executable; use Planning, route validation, simulation, and Debrief for that.

## Process Example Contexts

Foundational CA Models are known local-rule models used to teach cells, states, neighborhoods, update rules, and emergent behavior. Ocean-Relevant Process Analogs are simplified CA/grid-process-inspired event or process layers that resemble environmental behaviors important for AUV sampling, but they are not physical flow models or calibrated ocean simulations.

Observable Process Patterns are bridge metadata rather than the primary selector. For example, Forest Fire maps to Propagating Fronts, which bridges to River Plume Front and Shoreline Runoff Pulse analogs. Greenberg-Hastings maps to Excitable Waves. Sandpile maps to Threshold Cascades, which bridges to turbidity or episodic discharge analogs.

Science boundary: the deterministic process demo teaches local process evolution S(x,y,t). Flow Fields teaches current vectors F(x,y,t). Coupled Dynamic Sampling Space combines process plus flow plus constraints. Uncertainty / Forecast adds hidden truth, forecast, belief, observations, and uncertainty. Ocean-relevant analogs in this demo are not calibrated ocean models.
## Active Example State

The visible Process Lab mode plus the context-specific model or analog selector is the primary identity for the Deterministic Spatiotemporal Process Lab. The mode selector, context-specific model or analog selector, center subtitle, right-panel Current Lab State, debug object, scenario metadata, and exports should agree on the same selected example.

`referenceSignature*` fields remain for compatibility and represent the mapped observable pattern, not the primary selected example. New consumers should prefer the `processExample` block in demo/scenario exports. `processExample.mappedReferenceSignatureId` should match the legacy flat `referenceSignatureId`.

Ocean-Relevant Process Analogs are educational event/process-layer analogs. They are not calibrated flow models, ocean forecasts, uncertainty models, or mission planners; flow coupling and uncertainty realism belong in the coupled and uncertainty demos.
