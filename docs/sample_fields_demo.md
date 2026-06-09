# Sample / ROI Field Demo

## Purpose

The pure Sample / ROI Field Demo visualizes `S(x,y,t)`: sample value, reward value, or objective value at map location `x,y` and demo time `t`.

This demo focuses only on sample-value behavior:

- where value is located
- when value rises, falls, appears, or fades
- how a spatial pattern evolves
- how depletion and recovery change value

It does not show forecast/truth switching, uncertainty, information gain, current vectors, current-advected transport, or flow-stretched sample behavior. Those concepts belong in the Uncertainty / Forecast Demo and Coupled Fields Demo.

## Conceptual Model

`S(x,y,t)` is a scalar field over map position and demo time.

The center viewport renders this field as a cell heatmap. Cooler cells have lower sample value; warmer cells have higher sample value. The field is deterministic from the demo seed and controls, so random-looking texture and pulses are replayable rather than unseeded page-load randomness.

## Spatial Pattern

Spatial Pattern answers: where is sample value located?

Options are sample-value shapes, not flow structures:

- `Uniform Field`
- `Gradient Field`
- `Single Cluster`
- `Multiple Clusters`
- `Patchy Field`
- `Sparse Targets`
- `Front / Boundary`
- `Linear Band`
- `Coastal Band`
- `Monitoring Stations`
- `Random Texture`

`Multiple Clusters` plus `Cluster Count = 2` replaces the older dedicated bimodal top-level option. Plume or channel language is avoided here when it would imply transport by currents.

## Spatial Parameters

Spatial parameters tune how the selected pattern is drawn.

- `Cluster Count`: number of sample-value clusters or station-like targets.
- `Texture`: seeded local variation added to the field.
- `Seed`: deterministic replay seed for the visual pattern.

The pure demo keeps these parameters simple so users can see how location and value interact before adding uncertainty or flow coupling.

## Temporal Pattern

Temporal Pattern answers: how does sample value intensity change over time?

- `Static`: value does not change over time.
- `Sustained`: long active window with gradual change.
- `Periodic`: regular rise/fall cycle.
- `Bursty`: short intense activity followed by quiet periods.
- `Intermittent`: repeated on/off windows.
- `Random Pulses`: irregular but seeded pulses.
- `Long Cycle`: slow seasonal-style cycle.

A temporal pattern can be dynamic without being stateful. For example, a periodic field can be evaluated directly from `S(x,y,t)`.

## Pattern Evolution

Pattern Evolution answers: how does the spatial pattern itself change over time?

- `Fixed in Place`: the spatial pattern stays put while intensity may change.
- `Moving Feature`: clusters move independently of flow vectors.
- `Grow / Fade`: clusters intensify and decay.
- `Diffuse / Spread`: value spreads to nearby cells.
- `Neighbor Activation`: nearby activity can activate future value.
- `Split / Merge`: patches separate or recombine.
- `Revisit / Recover`: station-like value returns over time.

Current-advected movement is not part of this demo. Use Coupled Fields Demo when the sample pattern should move because of `F(x,y,t)`.

## State Model

State Model answers: what does the field depend on?

- **Time-Indexed / Memoryless:** `S(x,y,t)` is computed directly from position and time. The field does not need to remember a previous state.
- **State-Evolving / Markovian:** the next field state depends on the current field state, often written as `S_{t+1} = f(S_t, inputs_t)`.
- **History-Aware / Non-Markovian:** the field depends on longer sampling or observation history, such as time since last sample or cumulative depletion.

Markovian is not a synonym for any time-varying behavior. Seeded irregular pulses can be deterministic and replayable. Visit-dependent depletion or monitoring recovery is history-aware when the visit history affects value.

## Depletion and Recovery

Depletion / Recovery belongs in the pure Sample / ROI Demo because it directly changes sample value.

- `None`: no depletion overlay.
- `Hard Depletion`: sampled cells lose most value.
- `Soft Depletion`: sampled cells lose part of their value.
- `Neighborhood Depletion`: nearby cells partially lose value too.
- `Revisit Recovery`: value returns after enough time has passed.

The demo uses deterministic synthetic sample markers rather than actual glider visits. Full mission simulation remains the authoritative source for scored duplicate sampling, cooldown, and recovery rules.

## Display

Display controls which sample-value layer is shown:

- `Sample Value`: the current sample-value field.
- `Depleted Value`: the deterministic depleted-value layer.
- `Raw Base Value`: the base value before depletion display adjustments.

Forecast, truth, uncertainty, and information-gain views are intentionally not available in this pure demo.

## Cell Inspector

Click a heatmap cell to inspect it in the right panel.

The inspector reports:

- cell coordinate
- displayed layer
- sample value and normalized value
- spatial pattern
- temporal pattern
- pattern evolution
- state model
- depletion mode
- cluster/high-value membership
- trend
- raw base value
- depleted value
- recovery status when relevant

It uses the same generated field that draws the heatmap.

## Relationship to Mission Modes

The pure Sample / ROI Demo helps explain mission modes where sample value itself is the lesson:

- `Survey Sweep`: coverage plus depletion.
- `Fleet Split`: multiple clusters plus duplicate/depleted value.
- `Watch Stations`: monitoring stations plus revisit/recovery.
- `Plume Intercept`: bursty or moving sample-value features when movement is independent of flow.
- `Long Glide`: sparse targets plus route economy.

Uncertainty-specific modes such as Signal Hunt, Uncertain Waters, Surface & Adapt, and Forecast Chase should point to an uncertainty/forecast experience. Current-coupled sample behavior should point to Coupled Fields Demo.

## What Belongs in Other Demos

Use Flow Fields Demo for:

- current vectors `F(x,y,t)`
- flow magnitude and direction
- topology-aware currents
- particles passively following current

Use Coupled Fields Demo for:

- current-advected sample value
- flow-stretched hotspots
- eddy-carried value
- shoreline runoff shaped by visible currents

Use Uncertainty / Forecast Demo when available for:

- forecast vs truth
- uncertainty
- information gain
- forecast error
- update effects

## Developer Notes

Primary files:

- `src/game/phaser/scenes/RoiGeneratorDemoScene.js`
- `src/core/demo/DemoRoiFields.js`
- `src/core/generation/SampleFieldConfig.js`
- `src/core/generation/ROIFieldGenerator.js`

The demo maps friendly pure-sample controls onto existing seeded sample-field generator utilities. Shared current-coupled and forecast-capable generator paths are preserved for missions and other demos, but the pure Sample / ROI Demo hides those concepts.

## Limitations

- Depletion and recovery are deterministic visual diagnostics, not actual glider visit history.
- State-Evolving and History-Aware demo behavior is lightweight synthetic post-processing, not a full ecological or stochastic process model.
- The demo does not validate waypoint routes, compute score, save attempts, or export leaderboard records.
- It should not be used as evidence that a route is executable; use Planning, route validation, simulation, and Debrief for that.
