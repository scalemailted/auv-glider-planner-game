# Flow Fields Demo

## 1. Purpose

The Flow Fields Demo isolates vector-field behavior from the full mission planner. It lets developers, students, researchers, external solver users, and future contributors inspect static currents, dynamic currents, additive field layers, partitioned fields, passive particle drift, and terrain boundary effects before those behaviors are used inside full missions.

This demo validates current behavior. It is not a scored mission, a route planner, a waypoint execution mode, or a leaderboard mode.

It sits in the Main Menu `Demos` section alongside the ROI Generator Demo. Demos validate core mechanics; tutorials teach players how to play missions.

## 2. Why the Demo Exists

Current-field behavior affects glider drift, route validation, Travel Cost, Risk / Safety, Temporal Greedy, stochastic safety, shoreline risk, current rendering, and future solver/import workflows.

The demo provides a controlled scene for questions like:

- Do arrows point the right way?
- Does the field evolve over time?
- Do particles drift as expected?
- Do headings follow motion?
- Do land boundaries affect currents and risk?
- Do additive or partitioned fields produce understandable combined behavior?

## 3. User-Facing Controls

- `Field Mode`: chooses Static, Dynamic, Additive Layers, or Partitioned behavior.
- `Base Field`: selects the main synthetic ocean-inspired current preset.
- `Additive Layer 1 / 2`: optionally adds extra field behaviors over the same domain.
- `Layer Weight`: controls each additive layer's contribution to the final vector.
- `Region Field`: selects the secondary preset used by Partitioned mode.
- `Partition`: chooses how Partitioned mode divides the domain: vertical split, horizontal split, quadrants, or radial center.
- `Terrain`: selects No Land, Random Islands, Coastline, or Channel.
- `Reset Terrain`: advances the deterministic terrain seed and rebuilds the land mask.
- `Time Speed`: scales simulated field time from 0.1x to 10x.
- `Magnitude Scale`: changes how strongly arrow length visualizes sampled magnitude.
- `Particle Speed`: changes passive particle speed through the sampled field without changing field evolution.
- `Pause / Play`: pauses or resumes demo animation.
- `Reset Particles`: respawns particles with the current configuration.
- `Main Menu`: returns to the main menu.

Particle count is currently fixed by mode: static mode uses fewer particles than dynamic/composite modes.

## 4. Field Modes

### Static

Static mode samples the selected field at time zero. Arrows remain stable, while particles move through the fixed current.

### Dynamic

Dynamic mode passes advancing demo time into the shared current sampler. Arrows, magnitudes, directions, and particle drift can change as simulated time advances.

### Additive Layers

Additive Layers mode starts with one base field and optionally sums extra field behaviors over the same spatial domain:

```text
finalVector = baseField + layer1Weight * layer1 + layer2Weight * layer2
```

The demo clamps combined vector magnitude so stacked fields remain visually bounded. Disabled layers contribute nothing, so the default remains one selected field behavior.

Additive composition preserves magnitude. It clamps only vectors that exceed the demo cap; it does not normalize every arrow to the same length.

### Partitioned

Partitioned mode samples different presets in different regions. The current implementation supports:

- vertical left/right split
- horizontal top/bottom split
- quadrants
- radial center region

Partition boundaries are currently sharp. This makes region transitions easy to inspect, but it is not a smooth physical boundary model.

## 5. Synthetic Field Presets

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

## 6. Terrain Modes

### No Land

No Land is pure open-water vector-field behavior with no obstacles. Use it to inspect the base math and particle drift.

### Random Islands

Random Islands generates 2-5 smooth deterministic land masses from the demo seed. It is useful for testing shoreline interaction, obstacle risk, and island/wake-like behavior.

### Coastline

Coastline generates an irregular land/water boundary along one side of the domain. It is useful for inspecting current into shore, along shore, and away from shore.

### Channel / Narrow Passage

Channel creates land on both sides with a water corridor through the center. It is useful for testing boundary effects in constrained passages.

Terrain modes help validate how currents behave near land and how passive glider icons respond to blocked areas.

## 7. Topology-Aware Current Behavior

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

## 8. Particle / Demo Glider Behavior

Demo particles are passive flow visualizers. They sample the active field, move according to field velocity plus a small display bias, orient heading with `atan2(v, u)`, and leave trails.

Particles reset when they leave the domain, exceed their lifetime, or hit land. Arrows over land are hidden.

Mission gliders are not passive particles. Mission gliders have commanded waypoint motion plus current drift, fuel/energy limits, terrain interaction, route validation, sampling, and scoring.

## 9. Time Speed Scale

Time Speed changes simulated field time, not browser frame rate.

Examples:

- `0.5x`: slower evolving field
- `1.0x`: normal demo time
- `5.0x`: faster evolving field
- `10.0x`: rapid stress-test evolution

Time speed affects Dynamic and Additive Layers arrows, particle drift, displayed demo time, and dynamic field phase. Static mode pins samples to time zero, so its arrows remain stable while particles move through the fixed field.

Magnitude Scale only changes arrow visualization. Particle Speed only changes passive particle advection speed. Neither control changes the underlying current values.

## 10. Magnitude Diagnostics

The demo reports min / mean / max current magnitude for the current arrow grid. Use this to verify that non-uniform presets are not accidentally flattened:

- Uniform Drift may be mostly constant.
- Eddy / Vortex Field should show different center, ring, and far-field magnitudes.
- Meandering Jet should show a strong corridor and weaker surrounding water.
- Storm Pulse should show a localized energetic region whose strength changes over time.
- Additive Layers should change local magnitude when layers are enabled or their weights change.

## 11. Relationship to Mission Currents

The demo and missions use the same shared current sampling path where possible:

```text
Flow Fields Demo -> visualizes current behavior
Mission simulation -> uses current for glider drift
Travel Cost -> uses current for movement cost
Risk / Safety -> uses current and topology for danger
Temporal Greedy -> uses current/risk for scoring
Hover tooltips -> report sampled current metadata
```

The shared sampler lives in `src/core/currents/CurrentFieldSampler.js`. Synthetic presets are defined in `src/core/generation/VectorFieldPresets.js` and sampled/generated through `src/core/generation/CurrentFieldGenerator.js`.

## 12. Implementation Notes

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

Field functions are pure samplers where practical. Seeded randomness comes from `createSeededRng`. Do not use `Math.random()` for reproducible demo state or current-field variation.

The demo uses normalized `[0, 1]` coordinates. The shared sampler converts those to the demo grid before sampling. Mission systems use grid coordinates in cell units.

## 13. Debugging Checklist

If arrows do not change in Dynamic mode:

- check demo time is advancing
- check `timeSpeedScale`
- check the sampler receives `time`
- check the arrow grid redraws
- check the selected preset is time-varying

If arrow lengths look too uniform:

- check the selected field is not Uniform Drift
- check `Magnitude Scale`
- check min / mean / max magnitude in the console
- check sampled vectors are not normalized before rendering
- enable `globalThis.ANCHOR_DEBUG_FLOW_DEMO = true` and inspect `[FlowDemo][MagnitudeSample]`

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

## 14. Limitations

- Synthetic fields are not real ocean forecasts.
- HYCOM-inspired composite is not actual HYCOM data.
- Topology-aware behavior is approximate and not full CFD.
- Demo particles are passive visualizers.
- Mission gliders use commanded waypoint physics plus current drift, not passive particle motion.
- Partition boundaries are currently sharp.
- Terrain generation is a compact diagnostic mask, not the full mission terrain generator.
