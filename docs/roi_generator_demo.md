# Sample / ROI Field Demo

## Purpose

The Sample / ROI Field Demo visualizes `S(x,y,t)`: where and when the environment is valuable to sample. Unlike the Flow Fields Demo, which shows water motion `F(x,y,t)`, this demo shows objective value, information value, uncertainty, hotspots, bursts, temporal patterns, and depletion behavior.

It is not a mission, planner, leaderboard mode, or scoring mode. It only visualizes how value/probability regions can be shaped.

## Layout

- Left Mission Console: explanation, sample-field configuration, display controls, playback speed, seed regeneration, and Main Menu navigation.
- Center Phaser viewport: heatmap, high-value markers, selected-cell highlight, and non-obstructive labels only.
- Right panel: Cell Inspector for the selected sample cell.
- Bottom transport: compact infinite-time controls for Reset, Direction, Pause/Resume, Demo Time, Playback, temporal behavior, and Infinite timeline.

## Controls

- `Distribution`: selects the value-field pattern.
- `Spatial Pattern`: selects the shared sample-field spatial model.
- `Seed`: controls deterministic field generation.
- `Regenerate`: advances the seed and rebuilds the field.
- `Hotspot Count`: changes the number of target regions used by hotspot-style distributions.
- `Noise`: adds seeded texture to the field.
- `Time Mode`: chooses Static or Dynamic field behavior.
- `Temporal Behavior`: legacy label for the newer Temporal Pattern / Evolution Model split. Current sample-only behavior covers static, periodic, bursty, moving, diffusive, random, and neighbor-coupled styles where supported by the shared sampler. Current-advected behavior is reserved for the Coupled Fields Demo.
- `Forecast / Truth`: switches between forecast-biased, truth, uncertainty, and depleted-value views.
- `Time Speed`: controls playback speed for dynamic demo time.
- Bottom `Pause / Resume`: pauses or resumes dynamic evolution.
- Bottom `Direction`: runs demo time forward or backward.
- Bottom `Reset`: returns demo time to zero.
- `Main Menu`: returns to the main menu.

## Distributions

- `Uniform Random`: seeded per-cell value texture.
- `Gaussian Hotspots`: smooth high-value sampling regions.
- `Clustered Hotspots`: hotspot regions grouped near a seeded center.
- `Gradient / Front`: a smooth front-like transition across the domain.
- `Sparse Targets`: small high-value targets in a mostly low-value field.
- `Ridge / Corridor`: a sinuous high-value corridor.
- `Bimodal Hotspots`: two major high-value modes.
- `Moving Hotspot`: a high-value region that translates over time.
- `Bursty Bloom`: high-value regions that grow, peak, and decay.
- `Current-Advected Plume`: legacy coupled-field behavior. It is not shown in the sample-only distribution dropdown; use Coupled Fields Demo for plume-like value transported by a current field.
- `Nonuniform Random`: seeded random-looking texture with spatially varying amplitude.

## Static vs Dynamic Sample Fields

Static mode samples the selected field at time zero. Dynamic mode passes advancing demo time into the shared sample-field generator through `createDemoRoiField({ time: demoTime, ... })`, so periodic, bursty, moving, diffusive, random, and neighbor-coupled sample-only fields visibly change over time. Current-advected sample behavior is demonstrated in the Coupled Fields Demo.

The default is intentionally dynamic and visually active: Bursty Bloom distribution, Multi Hotspot spatial pattern, Bursty temporal behavior, and Forecast view.

The left panel now separates sample behavior into `Temporal Pattern`, `Spatial Pattern`, and `Evolution Model`. The inspector labels each selected cell as `prior-agnostic` or `evolutionary` so users can tell whether value is computed directly from `x,y,t` or whether prior activity is part of the concept. See [Sample / ROI Field Demo](sample_fields_demo.md) for the taxonomy.

## Cell Inspector

Click any heatmap cell to select it. The right panel updates live with:

- cell coordinates
- sample value and normalized value
- trend over the previous simulated second
- field mode, spatial pattern, temporal behavior, distribution, and view
- uncertainty estimate
- depleted-value estimate
- hotspot membership
- shared sample-field configuration metadata such as neighbor influence, current coupling, and depletion mode

## Visuals

The center viewport renders a heatmap over a fixed diagnostic grid. Cooler cells are lower value, warmer cells are higher value, and outlined markers show high-value cells that a greedy planner might be tempted to chase.

The status line reports distribution, seed, hotspot count, noise, demo time when dynamic, and basic field statistics such as max, mean, and total value.

## Implementation

Relevant files:

- `src/game/phaser/scenes/RoiGeneratorDemoScene.js`
- `src/core/demo/DemoRoiFields.js`
- `src/core/generation/SampleFieldConfig.js`
- `src/core/generation/ROIFieldGenerator.js`
- `src/core/random/SeededRng.js`

The demo uses the shared sample-field config and ROI generator path where practical. `DemoRoiFields.js` normalizes demo controls into `SampleFieldConfig`, then calls `generateROI` / `generateSampleField` for hotspot, burst, moving, current-coupled, random, and neighbor-coupled behavior.

The demo uses seeded randomness and does not call `Math.random()` for per-frame field generation. The same seed, distribution, hotspot count, noise, time mode, temporal behavior, forecast view, and demo time reproduce the same heatmap.

## Limitations

- The depleted view is a deterministic visualization estimate; it does not simulate actual glider sampling.
- It does not run route planning or scoring.
- It does not create leaderboard entries.
- Dynamic mode is a visual generator diagnostic, not a full stochastic truth/forecast replay.
