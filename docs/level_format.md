# Level Format

A level defines the world, terrain, hazards, truth fields, forecast fields, and bases. `truth` is used by the simulator. `forecast` is what a player or solver may see in stochastic mode.

Generated levels are deterministic by seed and use ocean-inspired synthetic current fields. They do not solve Navier-Stokes and are not HYCOM or other real ocean-model output.

Every level may include an `instanceId`. Generated levels use a stable ID derived from seed and generation config when possible, plus `meta.generationConfig` so solver packets, plans, results, and datasets can be tied back to a specific game instance.

Built-in levels receive stable identities based on their `levelId` and tutorial metadata when loaded. Imported levels that do not already contain an `instanceId` are assigned a stable generated ID before saving, planning, solver-packet export, or result export.

Locally saved levels are stored, when browser storage is available, under:

```text
anchorGliderCommand.savedLevels.v1
```

The stored shape is:

```json
{
  "levels": {
    "GID-example": {
      "savedAt": "2026-06-02T00:00:00.000Z",
      "level": {}
    }
  }
}
```

If localStorage is unavailable, the game reports the issue and still allows level JSON import/export.

The primary player-facing recall flow is `Load Level JSON`: import an exported `anchor.level`, review the summary, then play deterministically, play stochastically, or open it in the Environment Editor. UUIDs and instance IDs remain inside JSON for identity, solver linkage, result comparison, local saves, and datasets; users normally do not need to type an ID to load a level.

The campaign tutorials in `levels/tutorial_01_currents.json` through `levels/tutorial_05_forecast.json` are handcrafted `anchor.level` files. Each includes campaign metadata and `tutorial.planningPrompts` so the briefing, planning guidance, simulation, and debrief can teach one concept at a time.

Supported challenge display modes:

- `perfectKnowledge`: the player sees truth fields.
- `forecast`: the player sees forecast fields when available; simulation still runs against truth.
- `revealTruth`: a debug UI option that shows truth during forecast-mode planning. It should not be used for normal challenge play.

Generated level controls currently include grid size, seed, difficulty preset, current preset, current strength, temporal variability, ROI pattern and hotspot count, hazard density, terrain density, duration, planning window, forecast mode, forecast ensemble count, ROI probability mode, mobile hazard count, and depth variation.

Generated temporal frame lists include the exact mission end time. For example, `duration: 10` and `dt: 3` produces frame times `0, 3, 6, 9, 10`, not only `0, 3, 6, 9`. The final frame lets Planning, Simulation, solver packets, datasets, and forecast exports inspect the end/surface state without inventing a fallback field.

Generated challenge setup from the player-facing briefing flow is preserved in `meta.generationConfig.scenarioSetup`:

```json
{
  "mode": "deterministic",
  "agentCount": 3,
  "grid": { "width": 32, "height": 32 },
  "durationHours": 48,
  "surfaceIntervalHours": 6,
  "fuelPerAgent": 150,
  "gliderSpeed": 1.25,
  "difficulty": "medium",
  "terrainDensity": 0.08,
  "hazardDensity": 0.06,
  "currentStrength": 0.85,
  "priorityTargetFrequency": 0.35,
  "forecastNoise": 0.22,
  "ensembleCount": 3
}
```

Generated challenges may also include `navigationUncertainty` in `meta.generationConfig`, `meta.generationConfig.scenarioSetup`, `mission.meta.navigationUncertainty`, and `mission.rules.navigationUncertainty`:

```json
{
  "level": "medium",
  "seeded": true,
  "showCone": true,
  "gpsCorrectionOnSurface": true
}
```

The setting models dead-reckoning uncertainty while gliders are underwater. Planning and result diagnostics can estimate a cone that grows with underwater duration/current exposure, warn when the cone overlaps land or hazards, and derive smooth reproducible offset samples from the challenge replay seed contract. Surfacing acts as the intended GPS correction/replan point when `gpsCorrectionOnSurface` is true.

## Current Generation Metadata

`meta.generationConfig.currentGenerator` records how generated current frames were made.

`meta.generationConfig.sampleFieldConfig` records how generated sample-value frames were made. It keeps the legacy `truth.frames[].roi` numeric grid format, but the generator can now produce static, periodic, bursty, moving, current-advected, random, neighbor-coupled, bimodal, plume, channel, gradient, and texture-like sample fields. Replays should preserve this config with the challenge UUID seed contract so the same challenge ID and generation config reproduce the same sample-value evolution.

Parametric current modes use:

```json
{
  "type": "parametric",
  "preset": "doubleGyre",
  "pattern": "doubleGyre",
  "strength": 1,
  "variability": 0.5,
  "seed": 1001,
  "temporalEvolution": true,
  "notes": "Synthetic ocean-inspired current field for gameplay.",
  "synthetic": true
}
```

Supported parametric presets are:

- `calm`: weak currents for early training.
- `uniformDrift`: whole-field downstream push.
- `shearFlow`: horizontal bands with different speeds or directions.
- `currentCorridor`: a stronger navigable current lane.
- `eddyField`: scattered rotating eddies.
- `doubleGyre`: two counter-rotating circulation cells.
- `tidalOscillation`: reversing/oscillating flow over time.
- `stormPulse`: temporary strong current events.
- `islandWake`: wake-like disturbance around terrain.
- `gulfInspired`: loop-current-like circulation plus detached eddies.
- `chaotic`: mixed eddies/noise for advanced challenges.

All generated parametric presets write multiple temporal current frames. `calm` changes only slightly; the other presets shift, pulse, reverse, drift, or meander enough that timeline scrubbing and simulation playback show different current vectors across the mission.

Fluid-inspired modes use:

```json
{
  "type": "fluid",
  "preset": "eddyField",
  "seed": 1001,
  "strength": 0.9,
  "viscosity": 0.0008,
  "iterations": 8,
  "vorticityConfinement": 0.08,
  "vorticity": true,
  "stats": {
    "minSpeed": 0,
    "maxSpeed": 1.2,
    "meanSpeed": 0.42,
    "medianSpeed": 0.37,
    "stdSpeed": 0.18,
    "calmCellRatio": 0.12,
    "strongCellRatio": 0.08,
    "classification": "Moderate",
    "warnings": []
  },
  "synthetic": true
}
```

Supported fluid/editor presets are:

- `eddyField`: scattered swirling eddies for route-choice puzzles.
- `shearFlow`: layered currents that reward crossing or riding bands.
- `currentCorridor`: a stronger stream corridor through the map.
- `islandWake`: through-flow with wake eddies downstream of an obstacle-like region.
- `stormPulse`: time-varying pulse that changes across the mission horizon.

The exported `truth.frames[].current` shape is unchanged: each frame stores a grid of `[u, v]` vectors. Forecast generation, solver packets, simulation, and datasets consume those frames the same way they consume any other generated currents. Generated `truth.frames`, `forecast.frames`, and forecast ensemble member frames preserve the exact final mission time when generated from the browser challenge flow.

The Environment Editor current preview computes magnitude statistics from those `[u, v]` vectors:

- `minSpeed`, `maxSpeed`, `meanSpeed`, `medianSpeed`, and `stdSpeed`.
- `calmCellRatio`: percent of cells below the near-calm threshold, default `0.05`.
- `strongCellRatio`: percent of cells above the strong-current threshold, default `0.75`.
- `classification`: `Calm`, `Gentle`, `Moderate`, `Strong`, or `Chaotic`.
- `warnings`: gameplay notes such as fields being too calm, too strong, too uniform, or high-variation.

These statistics describe gameplay/planning difficulty. They are not oceanographic validation metrics.

The Environment Editor current preview stores generated frames in preview state with `selectedFrameIndex`, playback state, per-frame stats, and whole-sequence stats. Scrubbing the preview changes only the visible frame. Applying a preset writes the full generated current frame sequence into `truth.frames[].current`, preserving normal level JSON shape and export compatibility.

Stochastic generated levels may also include:

- `layers.forecasts`: forecast ensemble members shaped as `{ id, label, frames }`.
- `layers.mobileHazards`: moving hazards with timed `{ t, x, y, radius }` frames and optional `penalty`.
- `layers.priorityTargets`: Gold Star / priority targets with timed activity, position, value, radius, and capture mode.
- `layers.depth`: a bathymetry grid where low values are shallow and high values are deep.
- probabilistic ROI cells shaped as `{ value, probability, expectedValue }`.

Numeric ROI cells remain valid and are interpreted as certain ROI: `{ value: number, probability: 1, expectedValue: number }`.

## Waypoint, Timeline, and Route-Quality Metadata

Level JSON normally describes the environment rather than an executable plan, but generated challenges, solver packets, plans, results, and leaderboard records may preserve waypoint and route-quality metadata tied to that environment.

Executable waypoint kinds are:

- `navigation`: a commanded underwater navigation intent. This is the backward-compatible default when old plans omit a kind.
- `surface`: a GPS/communication/update point where replanning may occur.
- `samplingTarget`: a science objective or marker. It is not automatically an executable hard checkpoint unless converted into a route waypoint.
- `terminalCarryThrough`: a final command that may extend beyond mission duration so the glider remains commanded until the clock expires.

Simulation events preserve legacy `waypointReached` and `missedWaypoint` records, and may also include semantic companion events such as `navigation_intent`, `surface_update`, `sampling_target`, and `terminal_carry_through`. Surface/update events may include GPS correction/replan metadata when mission rules enable it.

Result exports may include `routeQuality` with segment contribution grades, 3-hour block summaries, component values, role labels, and diagnostics from `SegmentContributionGrader`. These grades explain route value and risk; they are not required fields for loading a bare `anchor.level`.

## Priority Targets

Priority targets are separate from the ROI heatmap. They represent temporary high-value science events that appear, move, and disappear over mission time.

Frame-based shape:

```json
{
  "layers": {
    "priorityTargets": [
      {
        "id": "star_001",
        "label": "Gold Star Target",
        "value": 250,
        "radius": 0.75,
        "captureMode": "once",
        "frames": [
          { "t": 3, "x": 6, "y": 4, "active": true },
          { "t": 6, "x": 7, "y": 5, "active": true },
          { "t": 9, "active": false }
        ]
      }
    ]
  }
}
```

Interval-based shape is also accepted for static temporary targets:

```json
{ "id": "star_002", "x": 9, "y": 3, "startTime": 6, "endTime": 9, "value": 200, "radius": 0.75 }
```

The map shows only active targets by default. The simulator captures a target when a glider is inside its radius while the target is active.

Generated levels record schedule settings in `meta.generationConfig.priorityTargets`. Defaults intentionally allow no star at mission start, spread targets across later planning windows, and leave some windows empty:

```json
{
  "enabled": true,
  "count": 2,
  "valueRange": [180, 320],
  "probabilityNoStarPerWindow": 0.45,
  "allowNoStarAtStart": true,
  "minFirstAppearanceWindow": 1,
  "activeWindowDuration": 1,
  "movementMode": "jumping"
}
```

Custom editor exports may include `missionDefaults`, a default `anchor.mission` object generated from editor settings such as agent count, battery, speed, base position, and communication interval. Import still works when this field is absent; the Load Level JSON scene creates a simple default mission from level metadata.

Environment Editor edits are synthetic gameplay edits. The Phaser HUD can apply current-vector edits to the selected frame or all frames, and its numeric brush steppers write the active `radius` and `intensity` into `meta.editorConfig`. Edited levels preserve `levelId` and `instanceId`, mark `meta.generated` as false, and update `meta.editorConfig` plus current-generator stats where available.

`world.time` supports `dt`, `duration`, `planningWindow`, and optional `displayUnits`. Tutorial levels use mission hours for display. Truth and forecast frames may include a `t` value; the planning renderer chooses the frame closest to the current time-slider value.

Forecast frames may contain `current`, `roi`, and `confidence`. Confidence values range from 0 to 1 and can be rendered as an uncertainty overlay.

Forecast ensemble frames use the same frame shape as `layers.forecast.frames`. The planning UI can show a selected forecast member or an ensemble mean. When multiple members are available, disagreement is estimated from ROI expected-value spread and rendered as a subtle uncertainty overlay.

Depth rules are intentionally simple. Shallow cells increase energy use, very shallow cells may be treated as blocked if mission rules configure a minimum depth, and deeper cells use the normal or lower energy multiplier.

## Zones

Levels may define top-level `zones` for deployment and recovery regions:

```json
{
  "zones": [
    {
      "id": "drop_alpha",
      "type": "deployment",
      "label": "Deployment Zone Alpha",
      "cells": [{ "x": 2, "y": 4 }]
    }
  ]
}
```

Deployment zones are rendered in the Mission Workspace. Agents with `deployment.mode: "chooseFromZone"` must select a valid water cell inside their assigned zone before waypoints can be placed.

Generated levels may include `meta.connectivity`, a lightweight playability summary produced by a 4-neighbor flood fill from valid deployment cells. It records whether deployment is connected, the reachable navigable-water ratio, ROI reachability, recovery reachability, isolated-region count, warnings, whether terrain was repaired, the repair method, and generation/repair attempts. Generated challenges enable connectivity repair by default through `meta.generationConfig.connectivity`.
