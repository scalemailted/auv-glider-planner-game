# Sample / ROI Field Demo

## Purpose

The pure Sample / ROI Field Demo visualizes `S(x,y,t)`: sample value, reward value, or objective value at map location `x,y` and demo time `t`.

It teaches sample-value fields by separating field construction from process behavior. It answers:

- what spatial shape the sample-value field has
- where events are likely to originate before geometry and values are applied
- how intensity changes over time
- how the spatial distribution moves, jumps, wanders, or propagates over time
- whether the process is time-indexed, state-evolving, or history-aware
- how sampling, depletion, freshness, and recovery alter value

## Conceptual Model: S(x,y,t)

`S(x,y,t)` is a scalar field over map position and demo time.

The demo also exposes an Event Likelihood Field:

```text
L(x,y,t)
```

`L` is the generative substrate: where sample-value events, clusters, targets, bursts, or activations are likely to originate at time `t`. `S` is the observed sample value after likelihood, spatial pattern, value distribution, temporal behavior, spatial evolution, and sampling effects are composed.

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

The left console and Phaser status line include compact activity diagnostics:

```text
Activity: mean 0.42 | active 61% | max 0.94 | injected +0.12
```

Set `globalThis.ANCHOR_DEBUG_ROI_DYNAMICS = true` in the browser console to log detailed frame diagnostics, including min/mean/max, active cell count, total activity mass, injected activity, decay loss, depletion loss, boundary loss, regeneration amount, and whether normalization occurred.

## Why the Demo Separates Pattern, Parameters, and Process

Earlier versions exposed a long list of named examples, but many names mixed different concepts: spatial geometry, number of clusters, temporal behavior, statistical texture, and history-aware sampling effects.

The refactored demo separates these concepts. The Event Likelihood Field describes where event origins, sparse candidate sites, jump destinations, random-walk bias, and propagation likelihood come from. It can be static as `L(x,y)` or dynamic as `L(x,y,t)`. The spatial pattern describes how value is organized around that substrate. Spatial parameters describe how that pattern is shaped. Value Distribution describes how values are assigned. The temporal pattern describes how intensity changes over time. Spatial evolution describes how the spatial distribution stays fixed, drifts, jumps, wanders, or propagates. The state model explains whether the field is time-indexed, frequency-based, state-evolving, or history-aware.

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

- **Spatial Pattern:** where value appears.
- **Event Likelihood Field:** where event origins and future activity are likely.
- **Value Distribution:** how values are assigned within that spatial geometry.
- **Temporal Pattern:** how intensity changes over time.
- **Spatial Evolution:** how the spatial distribution moves, jumps, spreads, or propagates.
- **State Model:** whether the process is time-indexed, frequency-based, state-evolving, or history-aware.
- **Sampling Effect:** how observation changes future value.
- **Display Layer:** which value layer the heatmap is currently showing.

A bursty clustered field can behave differently depending on spatial evolution. With Stationary evolution, the same cluster grows and fades in place. With Discrete Jump, each burst can reappear elsewhere. With Continuous Drift, features move smoothly through the domain. With Random Walk, features move by local seeded steps. With Neighbor Propagation, activity spreads from active cells to nearby cells.

## Behavior Explainers

Every major component in the Sample / ROI Demo has behavior help. The left Mission Console stays compact and contains controls plus small `Explain ...` buttons. Clicking an Explain button opens the selected component's `About ...` explainer in the right panel, next to the Cell Inspector. The explainer covers meaning, expected heatmap behavior, important parameters, useful pairings, strategy implication, and demo boundary.

| Component Group | What it controls | Example question answered |
|---|---|---|
| Event Likelihood Field | Where event origins and future activity are likely | Where are events prone to start, jump, walk, or spread? |
| Spatial Pattern | Where value is organized in space | Where are the valuable cells? |
| Value Distribution | How values are assigned within that geometry | Are values constant, uniformly random, or mostly near a mean? |
| Temporal Pattern | How intensity changes over time | When does value rise, fade, pulse, or stay steady? |
| Spatial Evolution | How the spatial distribution changes over time | Does the pattern stay fixed, drift, jump, wander, or spread? |
| State Model | What the field depends on | Is value computed from time, cycles, current state, or longer history? |
| Sampling Effect | How visits change future value | Does sampling deplete, cool neighbors, or recover later? |
| Display Layer | Which value layer is visible | Am I viewing raw value, depleted value, freshness, or composed sample value? |

## Behavior Presets

Behavior presets are curated combinations of the primitive sample-field controls. They provide recognizable starting points for common spatiotemporal pattern families, such as recurring hotspots, migrating patches, expanding fronts, patchy rainfall, and freshness/revisit value.

Presets do not replace the primitive controls. Selecting a preset fills in the underlying Event Likelihood Field, Spatial Pattern, Value Distribution, Temporal Pattern, Spatial Evolution, State Model, Sampling Effect, and relevant parameters. Users can then modify those controls to create custom behavior. Changing any primitive control after selecting a preset marks it as modified from that preset; choosing `Custom` leaves the primitive controls editable without a preset label.

| Preset | What it demonstrates | Key composition |
|---|---|---|
| Recurring Hotspots | Repeated activity in preferred regions | Multi-modal likelihood + clustered field + bursty |
| Migrating Patch | Smooth feature movement | Gaussian likelihood + clustered field + continuous drift |
| Expanding Front | Spreading boundary | Front / Boundary + neighbor propagation |
| Patchy Rainfall | Irregular activity patches | Seeded texture likelihood + patchy field + random pulses |
| Drifting Storm Cells | Moving compact bursts | Clustered field + bursty + continuous drift |
| Freshness / Revisit Value | Value recovers after time | History-aware + freshness |
| Neighbor Spread | Local activation/spread | Patchy field + neighbor propagation |
| Oscillating Ecological Field | Phase-shifted cycles | Periodic + frequency-based |
| Forest Fire Front (inspired) | Advancing active front | Front + propagation + depleted residual |
| Life-Like Cellular Emergence (inspired) | Local-rule emergence | Neighbor propagation + state-evolving |

Some presets are inspired by real-world processes but are simplified educational examples. They are not validated process models and do not add current-field dependencies. Flow-driven examples belong in the Coupled Fields Demo.

Preset sanity checks can be run from Node:

```bash
node tools/js/audit_sample_field_presets.mjs
```

The script evaluates each preset over multiple demo times and reports active fraction, frame-to-frame delta, connected components, center-of-mass movement, spatial correlation, extinction warnings, saturation warnings, and static-dynamic warnings. In the browser console, set `globalThis.ANCHOR_DEBUG_ROI_PRESETS = true` to log a compact per-frame preset audit for the selected preset.

The right-panel Behavior Help view includes a `Current Composition` card that summarizes how the selected components combine, for example `Multi-Modal Likelihood + Clustered Field + Gaussian / Normal + Bursty + Discrete Jump + Time-Indexed + Soft Depletion + Sample Value`. Current-driven transport, plumes, flow-stretched patterns, forecast, truth, uncertainty, information gain, and forecast error are routed to the Coupled Fields Demo and Uncertainty / Forecast Demo.

## Viewing the Event Likelihood Field

The Display Layer selector can show either the realized sample value `S(x,y,t)`, the Event Likelihood Field `L(x,y,t)`, or `Sample Value + Likelihood Overlay`.

The Event Likelihood view shows the generative substrate that controls where events are likely to form. This is different from realized sample value. With Multi-Modal Likelihood and Bursty temporal behavior, likelihood may remain high in several preferred regions while the realized sample value activates in only one region during a burst. With Discrete Jump spatial evolution, the likelihood field can relocate between burst windows, causing future clusters to appear in different places.

Overlay mode keeps `S(x,y,t)` as the heatmap and draws high-likelihood cells as pale dots/rings on top. Use it to compare where events are likely to originate with where sample value is currently active. The Cell Inspector always reports both `L(x,y,t)` and `S(x,y,t)`, regardless of which display layer is selected.

## Demo Artifact Export

`Export Demo JSON` downloads an `anchor.demo.sample-roi-field` artifact for Colab/notebook rendering. Choose start time, end time, and timeframe count to include a `frames[]` series sampled from the current settings. It includes the current scene config, demo time, row-major displayed sample value, `L(x,y,t)` event likelihood, raw base value, evolved value when available, field stats, activity diagnostics, high-value cells, and selected-cell inspector state. Arrays are indexed as `field[row][col]` using top-left origin and cell-center coordinates.

Freshness / Age of Information values remain labeled as demo-only synthetic visit effects unless they are later tied to actual mission visits.

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

### Event Likelihood Dynamics

The likelihood substrate can be:

- `Static`: `L(x,y)` is fixed over time.
- `Dynamic`: `L(x,y,t)` changes over demo time.

When dynamic, Event Likelihood Field has its own controls:

- `Likelihood Temporal Pattern`: Static, Sustained, Periodic, Bursty, Intermittent, Random Pulses, or Long Cycle.
- `Likelihood Spatial Evolution`: Stationary, Continuous Movement, Discrete Jump, Random Walk, or Neighbor Propagation.

These controls affect `L`, not the already-realized sample-value layer. For example:

```text
Event Likelihood Field: Multi-Modal Likelihood
Likelihood Temporal Pattern: Bursty
Likelihood Spatial Evolution: Discrete Jump

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

The implemented Value Distribution options are Constant Value, Uniform Random, and Gaussian / Normal. Uniform Random means low, medium, and high values are approximately equally likely for the same seed. Gaussian / Normal means most cells fall near the middle value and fewer cells land near the low or high extremes.

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

The left Mission Console provides quick hover help and compact Explain buttons. The right panel shows the selected `About ...` explainer for Event Likelihood Field, Spatial Pattern, Value Distribution, Temporal Pattern, Spatial Evolution, State Model, Sampling Effect, and Display Layer.

## Value Distributions

Value Distribution answers: how are values assigned within the selected spatial pattern?

- `Constant Value`: every cell receives the same base value before other enabled processes.
- `Uniform Random`: each cell receives a deterministic seeded random draw from a uniform distribution over the allowed range.
- `Gaussian / Normal`: each cell receives a deterministic seeded draw from a bell-shaped distribution centered near the mean.

## Spatial Parameters

Spatial parameters tune how the selected pattern is drawn.

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
- `Random Pulses`: irregular but seeded pulses.
- `Long Cycle`: slow seasonal-style cycle.

A temporal pattern can be dynamic without being stateful. For example, a periodic field can be evaluated directly from `S(x,y,t)`.

## Spatial Evolution

Spatial Evolution answers: how does the spatial distribution itself change over time?

- `Stationary`: the pattern changes intensity but stays in the same location.
- `Continuous Drift`: features move smoothly through adjacent or intermediate locations.
- `Discrete Jump`: the feature fades, then reappears elsewhere without continuous travel.
- `Random Walk`: feature centers or active regions change by small seeded local steps over time.
- `Neighbor Propagation`: active cells influence nearby cells, spreading activity locally.

Current-advected movement is not part of this demo. Use Coupled Fields Demo when the sample pattern should move because of `F(x,y,t)`.

Spatial Pattern and Spatial Evolution are separate:

- `Clustered Field + Stationary`: a cluster changes intensity but stays in place.
- `Clustered Field + Continuous Drift`: a cluster moves smoothly through adjacent or intermediate positions.
- `Clustered Field + Discrete Jump`: a cluster fades and reappears elsewhere.
- `Patchy Field + Neighbor Propagation`: activity spreads locally from active cells.

### Motion Scope

Motion Scope controls whether spatial evolution is global, per-feature, or local:

| Motion Scope | Meaning | Typical use |
|---|---|---|
| Per Feature | Each cluster, band, target group, or patch region has its own seeded motion path | Default for Continuous Drift, Random Walk, and Discrete Jump |
| Local / Neighborhood | Small local regions evolve based on nearby cells or dense local motion | Patchy / Correlated Field, Seeded Texture, Neighbor Propagation |
| Global | The whole field shifts together as one image | Advanced/demo-only comparison or a moving single band/front |

`Continuous Drift` and `Random Walk` default to `Per Feature`, not `Global`. That means clustered fields move each cluster/region independently instead of sliding the entire heatmap. `Random Walk` is bounded and seeded, so the same seed produces the same local steps. `Discrete Jump` remains the mode where non-local relocation is allowed after fade/quiet windows. `Neighbor Propagation` remains local/neighborhood-based and does not use a whole-domain shift.

## State Model

State Model answers: what does the field depend on?

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

Click a heatmap cell to inspect it in the right panel. Clicking a cell switches the right panel back to Cell Inspector if Behavior Help was open. Clicking an Explain button in the left controls switches the right panel to Behavior Help while preserving the selected cell.

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
