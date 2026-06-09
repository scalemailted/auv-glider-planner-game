# Sample / ROI Field Demo

## Purpose

The Sample / ROI Field Demo visualizes `S(x,y,t)`: where and when the environment is valuable to sample. Unlike the Flow Fields Demo, which shows water motion `F(x,y,t)`, this pure demo shows objective value, reward value, hotspots, bursts, temporal patterns, depletion, and recovery behavior.

It is not a mission, planner, leaderboard mode, uncertainty demo, forecast/truth demo, or scoring mode. It only visualizes how sample-value regions can be shaped.

## Layout

- Left Mission Console: explanation, sample-field configuration, display controls, playback speed, seed regeneration, and Main Menu navigation.
- Center Phaser viewport: heatmap, high-value markers, selected-cell highlight, and non-obstructive labels only.
- Right panel: Cell Inspector for the selected sample cell.
- Bottom transport: compact infinite-time controls for Reset, Direction, Pause/Resume, Demo Time, Playback, temporal behavior, and Infinite timeline.

## Controls

- `Spatial Pattern`: selects the value-field pattern.
- `Cluster Count`: changes the number of target regions used by cluster-style patterns.
- `Seed`: controls deterministic field generation.
- `Regenerate`: advances the seed and rebuilds the field.
- `Texture`: adds seeded texture to the field.
- `Time Mode`: chooses Static or Dynamic field behavior.
- `Temporal Pattern`: controls static, sustained, periodic, bursty, intermittent, random-pulse, or long-cycle intensity changes.
- `Pattern Evolution`: controls fixed, moving, grow/fade, diffuse/spread, neighbor activation, split/merge, or revisit/recover behavior.
- `State Model`: selects Time-Indexed, State-Evolving, or History-Aware semantics.
- `Depletion / Recovery`: selects none, hard, soft, neighborhood depletion, or revisit recovery.
- `Display`: switches between Sample Value, Depleted Value, and Raw Base Value.
- `Time Speed`: controls playback speed for dynamic demo time.
- Bottom `Pause / Resume`: pauses or resumes dynamic evolution.
- Bottom `Direction`: runs demo time forward or backward.
- Bottom `Reset`: returns demo time to zero.
- `Main Menu`: returns to the main menu.

## Spatial Patterns

- `Uniform Field`: broad value across the domain.
- `Gradient Field`: smooth value change across the domain.
- `Single Cluster`: one high-value sampling region.
- `Multiple Clusters`: several high-value regions; use Cluster Count to create two-cluster or multi-cluster cases.
- `Patchy Field`: irregular grouped patches.
- `Sparse Targets`: small high-value targets in a mostly low-value field.
- `Front / Boundary`: front-like value boundary without flow transport.
- `Linear Band`: band-like sample value.
- `Coastal Band`: shoreline-style band without current transport.
- `Monitoring Stations`: repeated station-like targets.
- `Random Texture`: seeded random-looking texture with spatially varying amplitude.

## Static vs Dynamic Sample Fields

Static mode samples the selected field at time zero. Dynamic mode passes advancing demo time into the shared sample-field generator through `createDemoRoiField({ time: demoTime, ... })`, so periodic, bursty, moving, diffusive, random, and neighbor-coupled sample-only fields visibly change over time. Current-advected sample behavior is demonstrated in the Coupled Fields Demo.

The default is intentionally dynamic and visually active: Multiple Clusters, Cluster Count 3, Bursty temporal pattern, Grow / Fade pattern evolution, State-Evolving state model, Soft Depletion, and Sample Value display.

The left panel now separates sample behavior into Spatial Pattern, Temporal Pattern, Pattern Evolution, State Model, Depletion / Recovery, and Display. The inspector labels each selected cell as Time-Indexed, State-Evolving, or History-Aware so users can tell whether value is computed directly from `x,y,t`, depends on the current field state, or depends on longer sampling/observation history. See [Sample / ROI Field Demo](sample_fields_demo.md) for the taxonomy.

## Cell Inspector

Click any heatmap cell to select it. The right panel updates live with:

- cell coordinates
- sample value and normalized value
- trend over the previous simulated second
- field mode, spatial pattern, temporal pattern, pattern evolution, and display layer
- raw base value
- depleted value
- hotspot membership
- shared sample-field configuration metadata such as neighbor influence and depletion mode

## Visuals

The center viewport renders a heatmap over a fixed diagnostic grid. Cooler cells are lower value, warmer cells are higher value, and outlined markers show high-value cells that a greedy planner might be tempted to chase.

The status line reports spatial pattern, temporal pattern, pattern evolution, state model, depletion, display mode, seed, demo time when dynamic, and basic field statistics such as max, mean, and total value.

## Implementation

Relevant files:

- `src/game/phaser/scenes/RoiGeneratorDemoScene.js`
- `src/core/demo/DemoRoiFields.js`
- `src/core/generation/SampleFieldConfig.js`
- `src/core/generation/ROIFieldGenerator.js`
- `src/core/random/SeededRng.js`

The demo uses the shared sample-field config and ROI generator path where practical. `DemoRoiFields.js` normalizes pure sample controls into `SampleFieldConfig`, then calls `generateROI` / `generateSampleField` for cluster, burst, moving, diffuse, random, depletion, and neighbor-coupled sample-value behavior.

The demo uses seeded randomness and does not call `Math.random()` for per-frame field generation. The same seed, spatial pattern, cluster count, texture, time mode, temporal pattern, pattern evolution, depletion, display mode, and demo time reproduce the same heatmap.

## Limitations

- Depletion/recovery views are deterministic visualization estimates; they do not simulate actual glider sampling.
- It does not run route planning or scoring.
- It does not create leaderboard entries.
- Dynamic mode is a visual generator diagnostic, not a full stochastic truth/forecast replay.
