# Sample / ROI Field Demo

## Purpose

The Sample / ROI Field Demo is the isolated diagnostic view for sample value `S(x,y,t)`: where the environment is valuable to observe, how that value changes over mission time, and which field families are useful for planning puzzles.

It is the sample-side companion to the Flow Fields Demo. It does not create a mission, run a planner, execute gliders, score a route, or save leaderboard attempts. Its job is to make sample-field behavior visible before the same ideas are used in Challenge Mode, Simulation Lab, solver packets, and datasets.

## Conceptual Model

`S(x,y,t)` is a scalar field over map position and mission time.

Depending on the selected view, `S` can represent:

- raw science value
- expected sample reward
- forecast-biased value
- hidden truth value
- uncertainty
- depleted or remaining-looking value
- a diagnostic value field used to teach planner behavior

The demo renders this as a cell heatmap. Cooler cells are lower-value sample opportunities, and warmer cells are higher-value opportunities. The field is deterministic from the selected seed, pattern controls, forecast/truth view, and demo time.

## Sample Field vs Flow Field

The sample field is not the current field.

`S(x,y,t)` answers:

- What is worth sampling here?
- When does the opportunity appear or fade?
- Is the planner chasing forecast value, true value, uncertainty, or apparent remaining value?
- Does revisiting this region matter?

`F(x,y,t)` answers:

- Which way is the water moving?
- How fast is the current?
- Does the current help, oppose, or drift a glider off route?

The Sample / ROI Field Demo is sample-only. Current-dependent behavior such as flow-carried plumes, eddy-stretched blooms, shoreline runoff, and current-shaped fronts is reserved for the Coupled Fields Demo, where `F(x,y,t)` and `S(x,y,t)` are rendered together and the sample layer can use the visible flow sampler.

## State Model

The Sample / ROI Field Demo distinguishes how a sample field depends on time and prior behavior. The UI uses friendly labels; the docs include the technical language.

- **Time-Indexed / Memoryless:** `S(x,y,t)` is computed directly from position and time. The field does not need to remember a previous state. Static hotspots, direct periodic cycles, seeded time functions, and deterministic moving features defined by `t` are examples.

- **State-Evolving / Markovian:** the next field state depends on the current field state, often written as `S_{t+1} = f(S_t, inputs_t)`. Diffusion, growth/decay, neighbor activation, and active/inactive cell transitions are examples when the next state depends only on the current state and current inputs.

- **History-Aware / Non-Markovian:** the field depends on longer history, such as time since last sample, cumulative depletion, persistent monitoring, trend estimates, revisit rewards, or longer forecast-error accumulation.

Markovian is not a synonym for any time-varying behavior. A periodic field can be dynamic and still memoryless because it can be evaluated directly at time `t`. A seeded irregular pulse can be deterministic and replayable rather than stochastic in the simulation sense. A revisit-recovery process becomes history-aware when visits or observation history affect the value.

The right Cell Inspector labels the selected behavior as Time-Indexed, State-Evolving, or History-Aware.

## Temporal Patterns

Temporal Pattern controls how value changes over time before the selected process model is applied.

- `Static`: value remains fixed over demo time.
- `Sustained`: value stays active with slow mild variation.
- `Periodic / Cyclic`: value rises and falls on a regular cycle.
- `Bursty`: quiet periods alternate with high-value pulses. The current demo uses a deterministic burst centered in a repeating daily-style cycle.
- `Seasonal / Long Cycle`: slower cyclic variation over a longer window.
- `Random Pulses`: seeded time buckets produce irregular-looking pulses.
- `Intermittent Activity`: seeded time buckets switch activity on and off.

These are deterministic. Replaying the same seed and configuration at the same demo time gives the same heatmap.

## Spatial Patterns

Spatial Pattern controls where value appears in the domain.

- `Uniform`: broad value across the domain.
- `Gradient`: a directional value front or smooth transition.
- `Single Hotspot`: one dominant high-value region.
- `Multi Hotspot`: several high-value regions.
- `Bimodal`: two major modes that encourage assignment and sequencing decisions.
- `Coastal Band`: value concentrated along a band-like region.
- `Channel Corridor`: value concentrated along a corridor.
- `Plume`: plume-shaped value without requiring flow transport in this sample-only demo.
- `Random Texture`: seeded heterogeneous value.

The separate Distribution control is a diagnostic preset layer over these spatial ideas. It includes uniform random, Gaussian hotspots, clustered hotspots, gradient/front, sparse targets, ridge/corridor, bimodal hotspots, moving hotspot, bursty bloom, and nonuniform random. The sample-only distribution list intentionally excludes the current-advected plume option; use Coupled Fields Demo for current-dependent plume behavior.

## Process Models

Process Model controls how the selected base field is transformed through time.

- `Time-Indexed`: uses the selected field and temporal envelope directly. This preserves compatibility with older saved demo configurations while displaying the clearer educational label.
- `Growth / Decay`: adds seeded cell pulses so regions intensify, peak, and fade.
- `Diffusion`: blurs value into neighboring cells through deterministic blur passes.
- `Neighbor Activation`: combines blur with seeded block activation by time bucket.
- `Moving Feature`: shifts the field through time so hotspots or fronts translate.
- `Split / Merge`: mixes shifted copies so a patch can separate or recombine.
- `Revisit / Recovery`: adds station-like recovery boosts that suggest returning later can regain value. In full mission contexts, visit-dependent recovery is History-Aware.
- `Forecast Error Drift`: adds seeded bias that increases with time, representing a forecast drifting from the base truth-like field.

These are lightweight educational approximations. They are meant to expose strategy differences, not to claim a physical biological or ocean model.

## Forecast, Truth, And Uncertainty

The Forecast / Truth selector changes which value layer the demo displays.

- `Truth`: shows the raw generated sample field.
- `Forecast`: shows the field with deterministic per-cell forecast bias.
- `Uncertainty`: shows a deterministic uncertainty diagnostic with blocky spatial structure and temporal variation.
- `Depleted`: shows a deterministic moving depletion visualization.

Forecast and uncertainty are useful for teaching robust planning: a route may chase a high forecast, hedge toward a lower-uncertainty region, or intentionally sample uncertain cells for information value.

The depleted view is illustrative in this demo. It does not know about actual glider visits because the demo does not run mission simulation.

## Depletion, Recovery, And Revisit Value

In full missions, sampling rules such as unique, diminishing, cooldown, and persistent determine whether repeated visits keep value, deplete value, or recover across windows.

In the Sample / ROI Field Demo:

- `Depleted` view is a visualization of what depleted-looking value can look like.
- `Revisit / Recovery` is an evolution-model concept that shows station-like recovery.
- No glider route is executed.
- No sampled-cell history is recorded.
- No score is changed.

Use this demo to understand what revisit and recovery fields look like. Use Challenge Mode or Simulation Lab missions to test actual route scoring and duplicate-sampling rules.

## Cell Inspector

Click a heatmap cell to inspect it in the right panel. The inspector is the authoritative readout for the selected cell in this demo.

It reports the selected coordinates, current sample value, normalized value, recent trend, distribution, view, temporal pattern, spatial pattern, state model, process model, uncertainty estimate, depleted-value estimate, hotspot membership, and relevant sample-field metadata.

The inspector updates from the same field generation path used to render the heatmap, so it is the best way to verify whether a visual change is a value change, an uncertainty change, or a depleted-view change.

## Relationship To Mission Modes

Mission Modes use sample-field ideas as objective presets, not as separate engines.

- `Survey Sweep`: broad coverage, remaining value, and depletion.
- `Signal Hunt`: high-value hotspots, uncertainty, and information gain.
- `Surface & Adapt`: forecast/truth mismatch and later correction.
- `Fleet Split`: bimodal or multimodal sample regions.
- `Uncertain Waters`: uncertainty, forecast drift, and robust planning.
- `Forecast Chase`: time windows, forecast decay, and changing expected value.
- `Plume Intercept`: moving or bursty value; current-shaped plume details belong in Coupled Fields Demo.
- `Watch Stations`: revisit and recovery.
- `Danger Run`: valuable regions near risk.
- `Long Glide`: sparse targets and route economy.

Generated missions may export ordinary temporal ROI frames plus `sampleFieldConfig` metadata so solver packets and datasets can describe the behavior family behind the values.

## Relationship To Coupled Fields Demo

The Coupled Fields Demo is the interaction view for `F(x,y,t)` and `S(x,y,t)`.

Use it when the sample field should depend on currents:

- current-advected plumes
- eddy-carried blooms
- flow-stretched hotspots
- shoreline runoff
- fronts shaped by the visible current sampler

The Sample / ROI Field Demo intentionally stays useful without current vectors. That keeps the sample taxonomy clear: temporal pattern, spatial pattern, state model, and process model can be understood before flow coupling is introduced.

## Strategy Examples

Static multi-hotspot fields reward straightforward route ordering and fleet splitting.

Bursty hotspot fields reward waiting, sequencing, and scrubbing time before committing waypoints.

Bimodal fields reward assigning different gliders to different modes instead of sending the whole fleet to one bright patch.

Forecast error drift rewards robust plans that avoid over-committing to late, uncertain forecast value.

Revisit recovery fields reward monitoring-style routes where returning later can be better than immediately sweeping every cell.

Uncertainty views reward information-seeking behavior when the mission objective values reducing uncertainty, not only collecting high raw value.

## Developer Notes

Primary files:

- `src/game/phaser/scenes/RoiGeneratorDemoScene.js`
- `src/core/demo/DemoRoiFields.js`
- `src/core/generation/SampleFieldConfig.js`
- `src/core/generation/ROIFieldGenerator.js`
- `src/core/random/SeededRng.js`

The demo normalizes UI controls into sample-field configuration and creates a deterministic field for the current demo time. Random-looking values use seeded helpers, not per-frame `Math.random()` calls.

Important implementation details:

- Sample-only distributions exclude `currentAdvectedPlume`.
- Temporal Pattern provides the time envelope.
- Spatial Pattern provides the base spatial layout.
- State Model describes whether the sample value is Time-Indexed, State-Evolving, or History-Aware.
- Process Model applies deterministic synthetic time transforms.
- Forecast/truth/uncertainty/depleted view is applied after base field generation.
- The bottom transport changes demo time, not mission simulation time.
- The demo can run forward or backward because the field is sampled from time, not advanced by mutating persistent simulation state.

## Limitations

- This is a visualization and taxonomy demo, not a mission simulation.
- Depletion is illustrative and not based on actual glider visits.
- State-Evolving and History-Aware demo behavior is deterministic synthetic post-processing, not a full ecological, fluid, or stochastic process model.
- Current-dependent transport belongs in the Coupled Fields Demo.
- The demo does not validate waypoint routes, compute score, save attempts, or export leaderboard records.
- It should not be used as evidence that a particular route is executable; use Planning, route validation, simulation, and Debrief for that.
