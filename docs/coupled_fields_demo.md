# Coupled Fields Demo

## Purpose

ANCHOR has three field demos. Flow Fields Demo isolates `F(x,y,t)`, the current vector field. Sample / ROI Field Demo isolates `S(x,y,t)`, the science/sample value field. Coupled Fields Demo overlays both fields to show current-advected plumes, moving hotspots, shoreline sources, uncertainty drift, and other interactions where sampling strategy depends on the underlying flow.

The individual demos remain separate because they teach different concepts. The coupled demo is for inspecting interaction.

## Layout

- Left Mission Console: flow controls, sample controls, coupling mode, layer toggles, playback speed, and Main Menu navigation.
- Center Phaser viewport: land/water base, sample heatmap, flow arrows, optional flow particles, selected-cell highlight, and compact labels.
- Right panel: Cell Inspector with Flow, Sample / ROI, and Coupling sections.
- Bottom transport: Reset, Direction, Pause/Resume, Demo Time, Playback, Coupling, and Infinite timeline.

## Layer Toggles

Implemented toggles:

- Flow arrows
- Flow particles
- Sample heatmap
- Land / topology

Flow arrows and sample heatmap are enabled by default. Flow particles are optional to avoid visual overload.

## Coupling Modes

- `Off`: sample field evolves independently.
- `Current-Advected`: sample value is backtraced along the same visible current vectors rendered on the canvas.
- `Current-Stretched`: hotspots are boosted by local current magnitude to suggest elongation along energetic flow.
- `Shoreline Source / Runoff`: near-shore sample value is boosted and transported by the current.
- `Eddy-Carried`: moving value is modulated by rotating flow direction.

These are lightweight visual approximations for teaching and debugging. They use the shared flow sampler and shared sample-field generator rather than a separate incompatible demo model.

## Cell Inspector

Click a cell to inspect:

- terrain and topology region
- flow `u`, `v`, magnitude, direction, dominant behavior, and shoreline risk
- sample value, temporal trend, and hotspot membership
- coupling mode, current influence, advection direction, and whether visible flow is used

## Relationship To Mission Modes

The coupled demo does not create missions, score routes, mutate sample depletion from actual glider visits, or write leaderboard entries. It is a visualization tool for understanding when sample-field behavior depends on the current field.
