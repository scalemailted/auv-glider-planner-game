# Deterministic Spatiotemporal Process Lab

Menu label: Process Lab. Legacy name: Sample / ROI Field Demo.

## Purpose

The Deterministic Spatiotemporal Process Lab visualizes `S(x,y,t)`: where and when a deterministic or seeded grid process creates value to sample. Unlike the Flow Fields Demo, which shows water motion `F(x,y,t)`, this pure lab shows objective value, reward value, hotspots, bursts, temporal patterns, cell states, rule updates, depletion, and recovery behavior.

It exposes a Source / Initial Field: a deterministic or seeded substrate that controls where process activity starts, recurs, is constrained, or has initial support. Legacy exports may still call this `eventLikelihoodField` or `likelihoodField`, but the user-facing concept is Source / Initial Field. Formal likelihood, uncertainty, belief, forecast error, and information gain are covered by the Uncertainty / Forecast Demo; current-driven sample movement is covered by the Coupled Fields Demo.

The lab is an Example Processes-first component composer. The normal first control is `Mode`: choose Example Processes, Custom Composer, Process Paint, or Rule Allocation Sandbox. Example Processes shows the Example Process selector grouped into Foundational CA Models and Observable Process Patterns; Custom Composer exposes direct primitive editing. Legacy behavior presets remain available only for compatibility/debug workflows. The primitive components are Source / Initial Field, Spatial Pattern / Geometry, Value Distribution, Temporal Pattern, Spatial Evolution / Motion Rule, Interaction Scale / Hierarchy, State / Update Rule, Sampling / Freshness Effect, Display / Diagnostic Layer, Process Paint / Rule Allocation, Seed / Scenario Identity, and Export.

It is not a mission, planner, leaderboard mode, uncertainty demo, forecast/truth demo, or scoring mode. It only visualizes how sample-value regions can be shaped.

## Layout

- Left Mission Console: compact component groups, sample-field configuration, display controls, playback speed, seed regeneration, export controls, and Main Menu navigation.
- Center Phaser viewport: heatmap, high-value markers, selected-cell highlight, and non-obstructive labels only.
- Right panel: Process Example View by default, with Cell Inspector after selecting a sample cell, Behavior Help after Explain actions, and Diagnostics for active-source/debug details.
- Bottom transport: compact infinite-time controls for Reset, Direction, Pause/Resume, Demo Time, Playback, temporal behavior, and Infinite timeline.

## Controls

- `Spatial Pattern`: selects the value-field pattern.
- `Cluster Count`: changes the number of target regions used by cluster-style patterns.
- `Cluster Size`: changes whether clustered value is tight, medium, or wide.
- `Seed`: controls deterministic field generation.
- `Regenerate`: advances the seed and rebuilds the field.
- `Noise / Texture`: adds seeded texture to the field.
- `Time Mode`: chooses Static or Dynamic field behavior.
- `Temporal Pattern`: controls static, sustained, periodic, bursty, intermittent, random-pulse, or long-cycle intensity changes.
- `Spatial Evolution`: controls stationary, continuous drift, discrete jump, random walk, neighbor propagation, expansion, contraction, divergence, convergence, morph/mutation, shear/stretch, rotational swirl, or branching growth behavior.

## Reference Observable Process Signatures

Process Lab includes Example Processes: Foundational CA Models such as Conway, Forest Fire, SIR, Greenberg-Hastings, Sandpile, Wa-Tor, Traffic CA, and Wireworld, plus Observable Process Patterns such as Propagating Fronts, Excitable Waves, Local Birth-Death Emergence, Recurrent Stationary Hotspots, Diffusive / Epidemic Spread, Directed Feature Transport, Cyclic Dominance, Domain / Cluster Formation, Threshold Cascades / Avalanches, Interacting Population Migration, Freshness / Recovery, Pattern Formation / Morphogenesis, Congestion / Density Waves, and Structured Signal Propagation. These are component recipes inspired by known CA/grid-process families, not exact reproductions. Applying an example updates the editable component controls and scenario exports preserve both new example metadata and legacy reference-signature metadata.

The right-panel Recipe / Signature view uses progressive disclosure: a short model list, grouped model-family counts, CA taxonomy tags, observable spatial/temporal/delta signatures, ROI meaning, QA expectations, genotype-like component setup, phenotype-like behavior notes, failure signs, and "what this is not." It remains a teaching/validation taxonomy, not a simulator library.
- `Interaction Scale`: labels whether behavior acts globally, by cluster/community, by cell/node, by edge/neighbor, or as a hybrid multi-scale process.
- `State Model`: selects Time-Indexed, State-Evolving, or History-Aware semantics.
- `Sampling Effects`: selects none, hard, soft, neighborhood depletion, or knowledge-decay / revisit-recovery behavior.
- `Display`: switches between Sample Value, Event Likelihood, Sample Value + Likelihood Overlay, Graph Communities, Node States, Graph Messages, Community + Messages, Diagnostics Overlay, Depleted Value, Freshness / Revisit Value, and Raw Base Value.
- `Time Speed`: controls playback speed for dynamic demo time.
- `Scenario Generation`: creates a compact seeded `anchor.syntheticRoiScenario` time-series from the active pattern source: reference signature, custom component recipe, or legacy preset metadata when using the compatibility path.
- Bottom `Pause / Resume`: pauses or resumes dynamic evolution.
- Bottom `Direction`: runs demo time forward or backward.
- Bottom `Reset`: returns demo time to zero.
- `Main Menu`: returns to the main menu.

## Scenario Generation

The Export controls include a Scenario Generation card for creating bounded synthetic ROI scenario JSON from the same demo controls already visible in the left panel. The source is the active pattern source shown in the summary card: Reference Observable Process Signature, Custom Component Recipe, or legacy preset metadata when using the compatibility/debug path. Scenario seed, difficulty, duration, frame count, and validation policy are explicit controls.

Generated scenarios use `src/core/demo/roi/RoiScenarioGenerator.js` and `src/core/demo/roi/RoiScenarioValidation.js`. The generator samples deterministic frames from the selected recipe, stores the process contract, sampled parameters, component recipe, graph/message layers, event likelihood `L(x,y,t)`, sample value `S(x,y,t)`, frame labels, diagnostics, and validation result. Validation checks for empty fields, full saturation, temporal variation, and family-specific observable signatures such as recurring basins, fronts, patch movement, or freshness recovery.

`Require PASS Before Export` blocks failed or warning scenarios from export. `Allow WARN Export` permits warning scenarios while preserving the warning summary in the file. These scenarios are simplified educational analog processes, not validated wildfire, rainfall, ecological, crime, or hydrodynamic simulators.

## Behavior Signatures and Isolation

Selecting an Example Process automatically opens Process Example View with observable signature, rule/update-function, and sampling interpretation sections. The example states the observable pattern, what should change over time, why cells become important, best display layers, and failure signs. Sampling interpretation distinguishes current sampling value, near-future value, low/depleted/dead regions, and sampling intuition.

The console also has Component Isolation Examples. These buttons load stable seeded recipes for comparing Temporal Patterns, Spatial Evolution, and Interaction Scale while holding most other components fixed. They are meant for teaching component effects; they do not create dataset batches or run planners.

## Spatial Patterns

- `Constant Field`: no spatial structure; pair it with Constant Value for a flat field or with Uniform Random / Gaussian / Normal for seeded value variation without clusters. It is not the event substrate; use Uniform Likelihood in Event Likelihood Field for unbiased event origins.
- `Gradient / Trend`: smooth value change across the domain.
- `Clustered Field`: one or more high-value sampling regions; use Cluster Count to create one-cluster, two-cluster, or multi-cluster cases.
- `Patchy / Correlated Field`: irregular grouped patches.
- `Sparse Targets`: small high-value targets in a mostly low-value field.
- `Linear Band`: band-like sample value.
- `Front / Boundary`: front-like value boundary without flow transport.
- `Boundary Band`: abstract edge-shaped value without implying shoreline currents.
- `Monitoring Stations`: repeated station-like targets.
- `Seeded Texture`: deterministic random-looking texture with spatially varying amplitude.

## Static vs Dynamic Sample Fields

Static mode samples the selected field at time zero. Dynamic mode passes advancing demo time into the shared sample-field generator through `createDemoRoiField({ time: demoTime, ... })`, so periodic, bursty, moving, diffusive, random, and neighbor-coupled sample-only fields visibly change over time. Current-advected sample behavior is demonstrated in the Coupled Fields Demo.

The default is intentionally dynamic and visually active: Clustered Field, Cluster Count 3, Medium Cluster Size, Bursty temporal pattern, Stationary spatial evolution, State-Evolving state model, Soft Depletion, and Sample Value + Likelihood Overlay display.

The left panel separates sample behavior into Source / Initial Field, Spatial Pattern / Geometry, Value Distribution, Temporal Pattern, Spatial Evolution, State Model / Memory, Sampling Effects, and Display. The inspector labels each selected cell as Time-Indexed, Frequency-Based, State-Evolving, or History-Aware so users can tell whether value is computed directly from `x,y,t`, follows a cycle, depends on current field state, or depends on longer sampling/observation history. See [legacy Sample / ROI notes](sample_fields_demo.md) for additional taxonomy history.

## Hierarchical Graph-Based Field Dynamics

A dynamic ROI field is represented as a hierarchical grid graph when the selected behavior needs local state. Clusters/communities represent regional likelihood `C_k(t)`, cells represent local likelihood/readiness `L_i(t)` and activation `A_i(t)`, and edges represent message influence between neighboring cells. Update rules use each node's current likelihood/sample/freshness state, incoming messages from neighbors, cluster forcing, temporal forcing, and sampling effects to produce the next `L(x,y,t)`, `S(x,y,t)`, and node state.

The graph layer supports memoryless generation, neighbor spread, cooldown/recovery hotspots, front propagation, ripple/wave activation, directed drift, freshness/revisit recovery, and life-like cellular-emergence inspired local rules. Cellular automata are one special case of this graph-message model, not the whole demo. These are simplified teaching analogs, not validated wildfire, ecological, rainfall, crime, or hydrodynamic simulators.

Graph display layers expose that hierarchy directly:

- `Graph Communities` tints cells by community/basin membership, draws community boundaries, and marks community centroids plus cluster centers.
- `Node States` shows inactive, active, cooling, recovering, susceptible, consumed, and inhibited node states over a muted sample-value heatmap.
- `Graph Messages` draws only filtered strong local influence edges instead of every graph edge.
- `Community + Messages` combines community membership, active nodes, strong message edges, and cluster centers.
- `Diagnostics Overlay` combines likelihood markers, filtered messages, node-state legend glyphs, and state-count proportions.

Each reference signature has a process contract. The Recipe / Signature view lists inspired-by models, observable signature, interaction scale, component recipe table, ROI interpretation, suggested display layers, what the signature is not, and failure signs. This keeps signatures transparent: a user can select a recipe, change one primitive component, and see why the heatmap changed.

When one primitive component is changed after selecting a signature, the left console marks the signature as modified and shows a component isolation hint with the expected effect and recommended views. Compatibility warnings are educational rather than blocking; for example, Event Likelihood view will warn that freshness affects sample value rather than latent likelihood.

## Cell Inspector

Click any heatmap cell to select it. The right panel updates live with:

- cell coordinates
- sample value and normalized value
- event likelihood mesh value `L(x,y,t)`, local mesh average, mesh trend, and nearest likelihood node/mode
- graph node id, update rule, cluster id, cluster likelihood `C_k(t)`, cell likelihood `L_i(t)`, activation `A_i(t)`, state, cooldown, recovery, freshness/age, community id, incoming/outgoing message totals, neighbor count, active-neighbor count, and dominant incoming direction
- strongest incoming/outgoing local message and inhibited-neighbor count for graph-backed fields
- trend over the previous simulated second
- field mode, displayed layer, spatial pattern, cluster count, cluster size, temporal pattern, spatial evolution, and display layer
- raw base value
- depleted value
- hotspot membership
- shared sample-field configuration metadata such as neighbor influence and depletion mode

## Visuals

The center viewport renders a heatmap over a fixed diagnostic grid. Cooler cells are lower value, warmer cells are higher value, and outlined markers show high-value cells that a greedy planner might be tempted to chase.

In overlay mode, the sample-value heatmap `S(x,y,t)` stays underneath a cell-centered likelihood mesh for `L(x,y,t)`. Each cell can render a likelihood dot at its center; dot size, brightness, and rings increase as likelihood approaches activation. Likelihood nodes or modes are sources/basins that influence this mesh, not the full field by themselves.

The status line reports spatial pattern, temporal pattern, spatial evolution, state model, sampling effect, display mode, seed, demo time when dynamic, sample-value statistics, likelihood mesh statistics, and graph diagnostics such as update rule, active node count, and message totals.

Graph views keep the old sample-value-only layer available, but default to Sample Value + Likelihood Overlay so `S(x,y,t)` and `L(x,y,t)` are visible together before switching into hierarchy diagnostics.

## Implementation

Relevant files:

- `src/game/phaser/scenes/RoiGeneratorDemoScene.js`
- `src/core/demo/DemoRoiFields.js`
- `src/core/demo/roi/RoiGraphField.js`
- `src/core/demo/roi/RoiGraphTopology.js`
- `src/core/demo/roi/RoiGraphUpdateRules.js`
- `src/core/demo/roi/RoiGraphDiagnostics.js`
- `src/core/generation/SampleFieldConfig.js`
- `src/core/generation/ROIFieldGenerator.js`
- `src/core/random/SeededRng.js`

The demo uses the shared sample-field config and ROI generator path where practical. `DemoRoiFields.js` normalizes pure sample controls into `SampleFieldConfig`, then calls `generateROI` / `generateSampleField` for cluster, burst, moving, diffuse, random, depletion, and neighbor-coupled sample-value behavior.

The demo uses seeded randomness and does not call `Math.random()` for per-frame field generation. The same seed, spatial pattern, cluster count, texture, time mode, temporal pattern, spatial evolution, depletion, display mode, and demo time reproduce the same heatmap.

Scenario APIs live in `src/core/demo/roi/RoiScenarioGenerator.js` and `src/core/demo/roi/RoiScenarioValidation.js`. They generate seeded time-series scenarios from the active pattern source and return recipe, process contract, reference metadata, sampled parameters, frame labels, diagnostics, and validation without adding a backend.

## Limitations

- Depletion/recovery views are deterministic visualization estimates; they do not simulate actual glider sampling.
- It does not run route planning or scoring.
- It does not create leaderboard entries.
- Dynamic mode is a visual generator diagnostic, not a full stochastic truth/forecast replay.
