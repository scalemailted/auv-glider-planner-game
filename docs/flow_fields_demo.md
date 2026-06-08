# Flow Fields Demo

## 1. Purpose

The Flow Fields Demo isolates vector-field behavior from the full mission planner. It lets developers, students, researchers, external solver users, and future contributors inspect static currents, dynamic currents, additive field layers, layer influence regions, passive particle drift, and terrain boundary effects before those behaviors are used inside full missions.

This demo validates current behavior. It is not a scored mission, a route planner, a waypoint execution mode, or a leaderboard mode.

It sits in the Main Menu `Demos` section alongside the ROI Generator Demo. Demos validate core mechanics; tutorials teach players how to play missions.

## 2. Why the Demo Exists

Current-field behavior affects glider drift, route validation, Travel Cost, Risk / Safety, Greedy Planner, stochastic safety, shoreline risk, current rendering, and future solver/import workflows.

The demo provides a controlled scene for questions like:

- Do arrows point the right way?
- Does the field evolve over time?
- Do particles drift as expected?
- Do headings follow motion?
- Do land boundaries affect currents and risk?
- Do additive layers and layer influence regions produce understandable combined behavior?

## 3. User-Facing Controls

- `Field Mode`: chooses Static or Dynamic behavior.
- `Base Flow Field`: selects the main synthetic ocean-inspired current preset. `Topology-Aware Composite` uses terrain when available to blend open-water, shoreline, channel, bay/pocket, and island-wake behaviors; with `No Land` it behaves as an open-water synthetic fallback.
- `+ Add Flow Layer`: appends an optional additive field behavior over the same domain.
- `Layer Field`: selects a layer's current preset.
- `Layer Weight`: controls that layer's contribution to the final vector.
- `Layer Influence`: chooses Global Blend, Spatial Pocket, or Partitioned Region.
- `Enabled / Remove Layer`: keeps a layer card without influence or removes it from the stack.
- `Terrain`: selects Blended Coastal Map, Coast + Islands, Coastal Estuary, Channel + Islands, Random Islands, Coastline, Channel, Bay / Pocket, Island Chain, or No Land.
- `Reset Terrain`: advances the deterministic terrain seed and rebuilds the land mask.
- `Direction Variation`: chooses Off, Low, Medium, or High smooth rotation/bending of the dynamic field.
- `Magnitude Variation`: chooses Off, Low, Medium, or High smooth strengthening/weakening of the dynamic field.
- `Dynamic Complexity`: chooses Low, Medium, or High regional and temporal structure in topology-aware fields.
- `Evolution Behavior`: chooses Continuous, Looping / Cyclic, One-Shot Pulse, or Meandering / Translating.
- `Evolution Pattern`: chooses Tidal Cycle, Meandering Jet, Eddy Drift, Storm Pulse, or Composite dynamic modulation.
- `Cycle Duration`: controls intentional Looping cycle length or One-Shot Pulse timing.
- `Spatial Motion`: chooses Off, directional drift, Circular Drift, or Meander.
- `Spatial Motion Speed`: scales the selected spatial translation.
- `Playback Speed`: scales how fast demo time moves from 0.25x to 10x. Evolution behavior/pattern controls how the field changes per unit demo time.
- `Boundary Mode`: chooses None, Risk Only, Dampen Into Land, or Deflect Along Shore.
- `Magnitude Scale`: changes how strongly arrow length visualizes sampled magnitude from 0.5x to 2x.
- `Particle Speed`: changes passive particle speed through the sampled field from 0.5x to 4x without changing field evolution.
- Bottom transport `Reset`: resets demo time and respawns particles with the current configuration.
- Bottom transport `Direction`: toggles demo time between Forward and Reverse playback.
- Bottom transport `Pause / Resume`: pauses or resumes demo time and particle motion.
- Bottom transport `Demo Time`: shows the unbounded demo-time clock, playback direction, read-only playback speed, and evolution behavior. Continuous behavior is labeled as an infinite timeline; Looping shows the active cycle duration.
- Left footer `Main Menu`: returns to the main menu / Simulation Lab launcher.
- `Cell Inspector`: click any map cell to populate the right panel with current vector behavior for that cell.

Particle count is currently fixed by mode: static mode uses fewer particles than dynamic/composite modes.

## 4. Field Mode

### Static

Static mode samples the selected field at time zero. Arrows remain stable, while particles move through the fixed current.

### Dynamic

Dynamic mode passes advancing demo time into the shared current sampler and applies a deterministic demo evolution layer. The demo evolution uses raw continuous `demoTime`, not a discrete frame index, so arrows, magnitudes, directions, and particle drift change smoothly as simulated time advances. The default setup is Dynamic `Topology-Aware Composite` over a Blended Coastal Map with High dynamic complexity, High direction variation, High magnitude variation, Composite pattern, Meander spatial motion, and Deflect Along Shore boundary handling.

Dynamic controls affect the sampled field itself:

- `Evolution Behavior`: controls whether evolution is continuous, intentionally looping, pulse-shaped, or spatially translating.
- `Dynamic Complexity`: scales how much secondary regional motion, temporal structure, direction bending, and magnitude pulsing are visible.
- `Direction Variation`: rotates or bends vectors coherently over time.
- `Magnitude Variation`: changes vector strength coherently over time.
- `Evolution Pattern`: controls the water-like modulation shape.
- `Spatial Motion`: translates the sampled field coordinates so structures move through the domain.
- `Playback Speed`: advances demo field time faster or slower. This is a UI time multiplier, not a separate current-field model.

These controls do not normalize vectors. Normal magnitude differences remain visible in arrow length, opacity, thickness, and particle drift speed.

Evolution behavior semantics:

- `Continuous`: uses multiple incommensurate phase rates so the field keeps changing without an obvious short repeat.
- `Looping / Cyclic`: intentionally repeats after the selected Cycle Duration.
- `One-Shot Pulse`: applies a single smooth growth/fade envelope over the selected timing window.
- `Meandering / Translating`: moves field structures spatially; if Spatial Motion is Off, it defaults to Meander internally.

## 5. Additive Flow Layers

The demo opens in Dynamic mode with one Base Flow Field and no additive layers. The layer stack uses that same base-field-first model: each `+ Add Flow Layer` click appends a weighted layer over the same spatial domain:

```text
finalVector = baseField + sum(layerWeight * layerField for enabled layers)
```

The demo clamps combined vector magnitude so stacked fields remain visually bounded. Disabled layers contribute nothing, so the default remains one selected field behavior.

Additive composition preserves magnitude. It clamps only vectors that exceed the demo cap; it does not normalize every arrow to the same length.

Layer influence controls where a layer applies:

- `Global Blend`: layer affects the whole domain.
- `Spatial Pocket`: layer is strongest in a deterministic local pocket and fades outward.
- `Partitioned Region`: layer applies to a deterministic region such as a side or center pocket.

Layer data supports the same evolution behavior, variation, cycle duration, and spatial motion fields as the base field. The current UI exposes those controls for the base field first; new layers default to Continuous / Composite / no spatial motion unless their layer data is edited/imported with explicit evolution settings.

## 6. Synthetic Field Presets

Implemented demo presets:

- `Calm`: near-zero baseline flow.
- `Uniform Drift`: broad directional current.
- `Shear Flow`: banded flow where velocity and magnitude change across the domain.
- `Eddy / Vortex Field`: seeded rotating eddies with weaker centers/edges and stronger rotating bands.
- `Double Gyre`: two counter-rotating circulation cells.
- `Tidal Oscillation`: time-varying oscillatory flow that strengthens, slackens, reverses, and strengthens again.
- `Meandering Jet`: a bending stream/current corridor with stronger flow near the jet centerline.
- `Storm Pulse`: localized high-energy current pulse that grows, peaks, and fades.
- `Curl Noise Texture`: synthetic turbulent texture from stream-function-like math.
- `HYCOM-Inspired Composite`: seeded composite of background drift, jet, eddies, shear, tide, and texture.

These are synthetic ocean-inspired fields, not validated HYCOM forecasts. The HYCOM-inspired composite is a gameplay and diagnostic pattern, not real HYCOM data.

## 7. Terrain Modes

### Blended Coastal Map

Blended Coastal Map is the default. It combines shoreline, a water channel, a bay/pocket, and an island chain so topology-aware current behavior is visible immediately.

### Coast + Islands

Coast + Islands combines an irregular coastline with small islands for mixed shoreline and obstacle behavior.

### Coastal Estuary

Coastal Estuary carves branching water channels into a coastal land mass and adds a small island chain.

### Channel + Islands

Channel + Islands combines a constrained passage with small islands for corridor acceleration and wake-like behavior.

### No Land

No Land is pure open-water vector-field behavior with no obstacles. Use it to inspect the base math and particle drift.

### Random Islands

Random Islands generates 2-5 smooth deterministic land masses from the demo seed. It is useful for testing shoreline interaction, obstacle risk, and island/wake-like behavior.

### Coastline

Coastline generates an irregular land/water boundary along one side of the domain. It is useful for inspecting current into shore, along shore, and away from shore.

### Channel / Narrow Passage

Channel creates land on both sides with a water corridor through the center. It is useful for testing boundary effects in constrained passages.

### Bay / Pocket

Bay / Pocket generates a coastal indentation so weak recirculation and flushing-like topology effects can be inspected.

### Island Chain

Island Chain creates a diagonal chain of deterministic islands for repeated obstacle-adjacent current behavior.

Terrain modes help validate how currents behave near land and how passive glider icons respond to blocked areas.

## 8. Topology-Aware Current Behavior

When terrain is available, the shared current sampler applies a lightweight topology-aware postprocess:

- estimate distance to nearest land
- estimate direction to nearest land
- compute current component pointing into land
- preserve current along shoreline
- damp and deflect current that points into nearby land
- expose shoreline risk metadata

Expected interpretation:

```text
near land + current into land       = high risk / high cost
near land + current along shore     = moderate risk
near land + current away from land  = lower risk
land cell                           = invalid / blocked
```

This is a lightweight topology-aware approximation, not full CFD.

The generated `Topology-Aware Composite` preset is not just a static boundary-deflected field. Generated challenge configs store a seeded `dynamicComplexity` value (`low`, `medium`, or `high`) and a region assignment contract. The sampler blends multiple continuous regional behaviors:

- open water: moving/meandering jets, drifting gyres, rotating background drift, and advected curl texture
- shoreline: variable along-shore flow, weak onshore/offshore pulses, and deflection/risk when current points into land
- channels: accelerated flow aligned with the detected passage axis, with time-varying or reversing strength
- bays/pockets: weak recirculation plus periodic flushing pulses
- islands/obstacles: wake-like downstream flow, paired vortices, and texture tied to the dominant background direction

Low complexity keeps these effects smoother and slower. Medium is the default challenge setting. High increases active secondary behaviors, moving structures, wake strength, pulse strength, domain-scale direction rotation, and magnitude pulse range without using random jitter inside sampling. High mode is intentionally obvious in current-arrow views: vectors rotate over mission time, strong/calm bands pulse, and meanders/eddies translate across the grid.

Debugging flags:

- `globalThis.ANCHOR_DEBUG_CURRENT_COMPLEXITY = true` logs generated topology composite configuration and sample contributor breakdowns.
- `globalThis.ANCHOR_DEBUG_CURRENT_VARIATION = true` logs `[CurrentField][VariationStats]` with magnitude min/mean/max, direction variance, mean angular delta between frames, active components, and clamp counts.
- `globalThis.ANCHOR_DEBUG_TOPOLOGY_CURRENT_AUDIT = true` logs `[CurrentAudit][RegionStats]` buckets by time and region type, including mean magnitude, max magnitude, direction variance, mean shoreline risk, topology-adjusted count, and dominant behaviors. It also warns `[CurrentAudit][SuspiciousSample]` for cases such as nonzero land current, strong into-land current with low risk, unadjusted near-shore into-land current, channel flow mostly perpendicular to its estimated axis, or unusually strong bay/pocket flow.

## 8.1 Sampled Current Metadata

Mission systems consume sampled current objects rather than raw arrows. The shared sampler can report:

```text
u, v
magnitude
directionRadians
fieldMode
preset
evolutionBehavior
dynamicComplexity
topologyRegion
dominantBehavior
shoreDistance
directionToLand
normalTowardLand / currentTowardLand
tangentialComponent
shorelineRisk
topologyAdjusted
boundaryMode
hazardExposure
confidence
contributors
```

Hover tooltips, Travel Cost, Risk/Safety, Greedy Planner, simulation drift, and route diagnostics should agree because they use the same sampler. A current pointing into land is risk and boundary-condition input, not free safe motion through land.

## 9. Particle / Demo Glider Behavior

Demo particles are passive flow visualizers. They sample the active field, move according to field velocity plus a small display bias, orient heading with `atan2(v, u)`, and leave trails.

Particles reset when they leave the domain, exceed their lifetime, or hit land. Arrows over land are hidden.

Mission gliders are not passive particles. Mission gliders have commanded waypoint motion plus current drift, fuel/energy limits, terrain interaction, route validation, sampling, and scoring.

## 10. Playback Speed, Particle Speed, And Magnitude Scale

Playback Speed changes simulated demo time, not browser frame rate or particle advection speed.

Examples:

- `0.5x`: slower evolving field
- `1.0x`: normal demo time
- `5.0x`: faster evolving field
- `10.0x`: rapid stress-test evolution

Playback Speed affects Dynamic arrows, dynamic sampled layers, displayed demo time, and dynamic field phase. Static mode pins base samples to time zero, so its base arrows remain stable while particles move through the fixed field.

Particle Speed only scales passive particle advection after the field is sampled. Magnitude Scale only changes arrow visualization. Neither control changes the underlying current values.

The Flow Fields Demo transport actions live in the bottom timeline slot rather than inside the Phaser visualization. The center viewport remains reserved for the current-field map, arrows, particles, and non-obstructive readouts. Because the demo is not a finite mission, the bottom strip presents `Reset`, `Direction`, `Play/Pause`, `Demo Time`, read-only `Playback Speed`, and an `Infinite timeline` summary instead of a mission-time scrubber. Use the direction control to run time forward or backward, and use Play/Pause to start or stop playback. Playback Speed is controlled from the left panel. This is separate from evolution behavior/pattern controls, which define how rapidly and in what form the field changes per unit demo time.

## 10.1 Click-To-Inspect Cell Behavior

Click any cell in the Flow Fields Demo to inspect its current vector behavior. The selected cell remains highlighted until another cell is clicked or the same cell is clicked again.

The right panel shows:

- selected cell coordinates and land/water status
- vector components `u` and `v`
- magnitude
- direction in degrees plus a compass label that matches the rendered arrow orientation
- topology region and dominant behavior when the shared sampler provides them
- boundary mode, shoreline risk, shore distance, current-toward-land, tangential component, and topology-adjusted status when available
- temporal trend over the previous second, including magnitude trend and angular change

The inspector samples the same composed current field as the arrow grid:

```text
sampleDemoFlow({ ...fieldConfig, x, y, time: demoTime })
```

It updates while dynamic time advances, freezes while paused, and returns to `t = 0.0s` when Reset is pressed. Land cells are selectable too; they show that no navigable water current is applied at that location while nearby water may still be damped, deflected, or marked risky depending on boundary mode.

## 11. Magnitude Diagnostics

The demo reports min / mean / max current magnitude for the current arrow grid. Use this to verify that non-uniform presets are not accidentally flattened:

- Uniform Drift may be mostly constant.
- Eddy / Vortex Field should show different center, ring, and far-field magnitudes.
- Meandering Jet should show a strong corridor and weaker surrounding water.
- Storm Pulse should show a localized energetic region whose strength changes over time.
- Additive flow layers should change local magnitude when layers are enabled or their weights change.

## 12. Relationship to Mission Currents

The demo and missions use the same shared current sampling path where possible:

```text
Flow Fields Demo -> visualizes current behavior
Mission simulation -> uses current for glider drift
Travel Cost -> uses current for movement cost
Risk / Safety -> uses current and topology for danger
Greedy Planner -> uses current/risk for scoring
Hover tooltips -> report sampled current metadata
```

The shared sampler lives in `src/core/currents/CurrentFieldSampler.js`. Synthetic presets are defined in `src/core/generation/VectorFieldPresets.js` and sampled/generated through `src/core/generation/CurrentFieldGenerator.js`.

## 13. Limitations

The field model is synthetic and planning-oriented. It is useful for teaching and solver benchmarking because it is deterministic, topology-aware, and mechanically connected to route cost. It is not validated CFD, real HYCOM forecast data, an operational ocean model, or a Navier-Stokes solver. Region classification for channels, bays, islands, and shoreline is heuristic and should be audited with the debug tools when new terrain-generation patterns are added.

## 13. Implementation Notes

Relevant source files:

- `src/game/phaser/scenes/FlowFieldDemoScene.js`
- `src/core/demo/FlowFieldDemo.js`
- `src/core/currents/CurrentFieldSampler.js`
- `src/core/generation/VectorFieldPresets.js`
- `src/core/generation/CurrentFieldGenerator.js`
- `src/core/random/SeededRng.js`
- `src/core/fluids/FluidField2D.js`
- `src/core/fluids/FluidPresets.js`
- `src/core/fluids/FluidFieldStats.js`

Field functions are pure samplers where practical. Seeded randomness comes from `createSeededRng`. Do not use `Math.random()` for reproducible demo state or current-field variation. Dynamic demo modulation derives stable phase offsets from preset IDs and evaluates smooth functions of continuous time.

The demo uses normalized `[0, 1]` coordinates. The shared sampler converts those to the demo grid before sampling. Mission systems use grid coordinates in cell units.

## 14. Debugging Checklist

If arrows do not change in Dynamic mode:

- check demo time is advancing
- check `evolutionSpeedScale`
- check Direction Variation and Magnitude Variation are not both Off
- check Evolution Pattern is selected
- check the sampler receives `time`
- check the arrow grid redraws
- check the selected preset and demo evolution controls are time-varying

If arrow lengths look too uniform:

- check the selected field is not Uniform Drift
- check `Magnitude Scale`
- check min / mean / max magnitude in the console
- check sampled vectors are not normalized before rendering
- enable `globalThis.ANCHOR_DEBUG_FLOW_DEMO = true` and inspect `[FlowDemo][DynamicFieldSample]`, `[FlowDemo][FixedPointEvolution]`, and `[FlowDemo][ContinuousEvolution]`

If particles do not move:

- check vector magnitude
- check particle speed scale
- check pause state
- check terrain collisions are not immediately resetting particles

If particles pass through land:

- check terrain mode is not `No Land`
- check terrain mask generation
- check land collision/reset logic in `advanceDemoParticles`
- check topology-aware sampler receives `terrain`

If mission currents differ from demo:

- check both paths use `CurrentFieldSampler`
- check coordinate conversion
- check preset id, seed, strength, variability, and generation version
- check whether one path is sampling a saved frame while the demo is sampling a live preset

## 15. Limitations

- Synthetic fields are not real ocean forecasts.
- HYCOM-inspired composite is not actual HYCOM data.
- Topology-aware behavior is approximate and not full CFD.
- Demo particles are passive visualizers.
- Mission gliders use commanded waypoint physics plus current drift, not passive particle motion.
- Partitioned Region layer boundaries are intentionally sharp.
- Terrain generation is a compact diagnostic mask, not the full mission terrain generator.
