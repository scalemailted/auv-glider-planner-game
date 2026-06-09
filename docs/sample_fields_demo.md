# Sample / ROI Field Demo

## Purpose

The pure Sample / ROI Field Demo visualizes `S(x,y,t)`: sample value, reward value, or objective value at map location `x,y` and demo time `t`.

It teaches sample-value fields by separating field construction from process behavior. It answers:

- what spatial shape the sample-value field has
- how intensity changes over time
- how the spatial distribution moves, jumps, wanders, or propagates over time
- whether the process is time-indexed, state-evolving, or history-aware
- how sampling, depletion, freshness, and recovery alter value

## Conceptual Model: S(x,y,t)

`S(x,y,t)` is a scalar field over map position and demo time.

The center viewport renders this field as a cell heatmap. Cooler cells have lower sample value; warmer cells have higher sample value. The field is deterministic from the demo seed and controls, so random-looking texture and pulses are replayable rather than unseeded page-load randomness.

## Why the Demo Separates Pattern, Parameters, and Process

Earlier versions exposed a long list of named examples, but many names mixed different concepts: spatial geometry, number of clusters, temporal behavior, statistical texture, and history-aware sampling effects.

The refactored demo separates these concepts. The spatial pattern describes where value appears. Spatial parameters describe how that pattern is shaped. The temporal pattern describes how intensity changes over time. Spatial evolution describes how the spatial distribution stays fixed, drifts, jumps, wanders, or propagates. The state model explains whether the field is time-indexed, frequency-based, state-evolving, or history-aware.

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
- **Temporal Pattern:** how intensity changes over time.
- **Spatial Evolution:** how the spatial distribution moves, jumps, spreads, or propagates.
- **State Model:** whether the process is time-indexed, frequency-based, state-evolving, or history-aware.
- **Sampling Effect:** how observation changes future value.

A bursty clustered field can behave differently depending on spatial evolution. With Stationary evolution, the same cluster grows and fades in place. With Discrete Jump, each burst can reappear elsewhere. With Continuous Drift, the cluster moves smoothly through the domain. With Random Walk, it moves by local seeded steps. With Neighbor Propagation, activity spreads from active cells to nearby cells.

## Spatial Patterns

Spatial Pattern answers: where is sample value located?

- `Uniform Field`: value is broadly distributed.
- `Gradient / Trend`: value changes smoothly across the domain.
- `Clustered Field`: one or more localized high-value regions.
- `Patchy / Correlated Field`: locally correlated texture with broad patches.
- `Sparse Targets`: isolated high-value sample targets.
- `Linear Band`: a long narrow region of elevated sample value for transects, ridge-like value fields, and corridor-shaped reward fields.
- `Front / Boundary`: a sharp or soft transition between low-value and high-value regions for boundary-following and edge-sampling strategies.
- `Edge Band`: an abstract edge-shaped value band, not a coastal or current mechanism.
- `Monitoring Stations`: fixed station-like targets that support revisit strategy.
- `Random Texture`: seeded fine/coarse value texture.

## Spatial Parameters

Spatial parameters tune how the selected pattern is drawn.

- `Cluster Count`: number of cluster centers or station-like targets.
- `Cluster Size`: tight, medium, or wide cluster spread.
- `Noise / Texture`: seeded local variation added to the field.
- `Seed`: deterministic replay seed for the visual pattern.

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
- `Continuous Drift`: the feature moves smoothly through adjacent or intermediate locations.
- `Discrete Jump`: the feature fades, then reappears elsewhere without continuous travel.
- `Random Walk`: the feature center changes by small seeded local steps over time.
- `Neighbor Propagation`: active cells influence nearby cells, spreading activity locally.

Current-advected movement is not part of this demo. Use Coupled Fields Demo when the sample pattern should move because of `F(x,y,t)`.

## State Model

State Model answers: what does the field depend on?

- **Time-Indexed / Memoryless:** `S(x,y,t)` is computed directly from position and time. The field does not need to remember a previous state.
- **Frequency-Based:** future behavior follows repeated cycles or frequency structure, useful for periodic, cyclic, and long-cycle patterns.
- **State-Evolving / Markovian:** the next field state depends on the current field state, often written as `S_{t+1} = f(S_t, inputs_t)`.
- **History-Aware / Non-Markovian:** the field depends on longer sampling or observation history, such as time since last sample or cumulative depletion.

Markovian is not a synonym for any time-varying behavior. Seeded irregular pulses can be deterministic and replayable. Visit-dependent depletion or monitoring recovery is history-aware when visit history affects value.

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

Click a heatmap cell to inspect it in the right panel.

The inspector reports:

- cell coordinate
- displayed layer
- sample value and normalized value
- spatial pattern
- cluster count and cluster size
- temporal pattern
- spatial evolution
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
