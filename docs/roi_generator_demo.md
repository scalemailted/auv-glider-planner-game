# ROI Generator Demo

## Purpose

The ROI Generator Demo is an isolated concept scene for inspecting sample-value fields before they are used by missions, planners, scoring, datasets, or external solvers.

It is not a mission, planner, leaderboard mode, or scoring mode. It only visualizes how value/probability regions can be shaped.

## Controls

- `Distribution`: selects the value-field pattern.
- `Seed`: controls deterministic field generation.
- `Regenerate`: advances the seed and rebuilds the field.
- `Hotspot Count`: changes the number of target regions used by hotspot-style distributions.
- `Noise`: adds seeded texture to the field.
- `Time Mode`: chooses Static or Dynamic field behavior.
- `Time Speed`: controls dynamic field evolution speed.
- `Pause / Play`: pauses or resumes dynamic evolution.
- `Main Menu`: returns to the main menu.

## Distributions

- `Uniform Random`: seeded per-cell value texture.
- `Gaussian Hotspots`: smooth high-value sampling regions.
- `Clustered Hotspots`: hotspot regions grouped near a seeded center.
- `Gradient / Front`: a smooth front-like transition across the domain.
- `Sparse Targets`: small high-value targets in a mostly low-value field.
- `Ridge / Corridor`: a sinuous high-value corridor.

## Visuals

The center viewport renders a heatmap over a fixed diagnostic grid. Cooler cells are lower value, warmer cells are higher value, and outlined markers show high-value cells that a greedy planner might be tempted to chase.

The status line reports distribution, seed, hotspot count, noise, demo time when dynamic, and basic field statistics such as max, mean, and total value.

## Implementation

Relevant files:

- `src/game/phaser/scenes/RoiGeneratorDemoScene.js`
- `src/core/demo/DemoRoiFields.js`
- `src/core/generation/ROIFieldGenerator.js`
- `src/core/random/SeededRng.js`

The demo uses seeded randomness and does not call `Math.random()` for field generation. The same seed, distribution, hotspot count, noise, time mode, and demo time reproduce the same heatmap.

## Limitations

- The demo does not simulate depletion from actual glider sampling.
- It does not run route planning or scoring.
- It does not create leaderboard entries.
- Dynamic mode is a visual generator diagnostic, not a full stochastic truth/forecast replay.
