# Sample / ROI Field Demo

## Purpose

The Sample / ROI Field Demo visualizes `S(x,y,t)`: where and when the environment is valuable to sample. Unlike the Flow Fields Demo, which shows water motion `F(x,y,t)`, this pure demo shows objective value, reward value, hotspots, bursts, temporal patterns, depletion, and recovery behavior.

It also exposes `L(x,y,t)`, the event likelihood field that controls where sample-value events tend to originate. `L` is not uncertainty. Uncertainty and information gain are covered by the Uncertainty / Forecast Demo; current-driven sample movement is covered by the Coupled Fields Demo.

It is not a mission, planner, leaderboard mode, uncertainty demo, forecast/truth demo, or scoring mode. It only visualizes how sample-value regions can be shaped.

## Layout

- Left Mission Console: explanation, sample-field configuration, display controls, playback speed, seed regeneration, and Main Menu navigation.
- Center Phaser viewport: heatmap, high-value markers, selected-cell highlight, and non-obstructive labels only.
- Right panel: Cell Inspector for the selected sample cell.
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
- `Spatial Evolution`: controls stationary, continuous drift, discrete jump, random walk, or neighbor propagation behavior.
- `State Model`: selects Time-Indexed, State-Evolving, or History-Aware semantics.
- `Sampling Effects`: selects none, hard, soft, neighborhood depletion, or knowledge-decay / revisit-recovery behavior.
- `Display`: switches between Sample Value, Depleted Value, Freshness / Revisit Value, and Raw Base Value.
- `Time Speed`: controls playback speed for dynamic demo time.
- Bottom `Pause / Resume`: pauses or resumes dynamic evolution.
- Bottom `Direction`: runs demo time forward or backward.
- Bottom `Reset`: returns demo time to zero.
- `Main Menu`: returns to the main menu.

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

The left panel separates sample behavior into Event Likelihood / Spawn Distribution, Spatial Pattern / Geometry, Value Distribution, Temporal Pattern, Spatial Evolution, State Model / Memory, Sampling Effects, and Display. The inspector labels each selected cell as Time-Indexed, Frequency-Based, State-Evolving, or History-Aware so users can tell whether value is computed directly from `x,y,t`, follows a cycle, depends on current field state, or depends on longer sampling/observation history. See [Sample / ROI Field Demo](sample_fields_demo.md) for the taxonomy and motivation.

## Cell Inspector

Click any heatmap cell to select it. The right panel updates live with:

- cell coordinates
- sample value and normalized value
- trend over the previous simulated second
- field mode, displayed layer, spatial pattern, cluster count, cluster size, temporal pattern, spatial evolution, and display layer
- raw base value
- depleted value
- hotspot membership
- shared sample-field configuration metadata such as neighbor influence and depletion mode

## Visuals

The center viewport renders a heatmap over a fixed diagnostic grid. Cooler cells are lower value, warmer cells are higher value, and outlined markers show high-value cells that a greedy planner might be tempted to chase.

The status line reports spatial pattern, temporal pattern, spatial evolution, state model, sampling effect, display mode, seed, demo time when dynamic, and basic field statistics such as max, mean, and total value.

## Implementation

Relevant files:

- `src/game/phaser/scenes/RoiGeneratorDemoScene.js`
- `src/core/demo/DemoRoiFields.js`
- `src/core/generation/SampleFieldConfig.js`
- `src/core/generation/ROIFieldGenerator.js`
- `src/core/random/SeededRng.js`

The demo uses the shared sample-field config and ROI generator path where practical. `DemoRoiFields.js` normalizes pure sample controls into `SampleFieldConfig`, then calls `generateROI` / `generateSampleField` for cluster, burst, moving, diffuse, random, depletion, and neighbor-coupled sample-value behavior.

The demo uses seeded randomness and does not call `Math.random()` for per-frame field generation. The same seed, spatial pattern, cluster count, texture, time mode, temporal pattern, spatial evolution, depletion, display mode, and demo time reproduce the same heatmap.

## Limitations

- Depletion/recovery views are deterministic visualization estimates; they do not simulate actual glider sampling.
- It does not run route planning or scoring.
- It does not create leaderboard entries.
- Dynamic mode is a visual generator diagnostic, not a full stochastic truth/forecast replay.
