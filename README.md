# ANCHOR: Glider Command

**ANCHOR: Glider Command** is a browser-first AUV glider planning puzzle game and schema-driven simulator. Players plan waypoint missions, simulate glider behavior under currents, hazards, terrain, energy limits, and forecast uncertainty, then review scores and export data for external solvers.

The project is also an **AUV Glider Planner Game** for teaching long-horizon planning, energy tradeoffs, waypoint sequencing, forecast uncertainty, solver comparison, and dataset generation.

## Current Status

Version 2 is a playable static-web game built with vanilla JavaScript, HTML, CSS, Phaser 3, and schema-driven core modules. The active shell is a Mission Console + Phaser Simulator Viewport + Waypoint Timeline: HTML/CSS owns the left mission-control console for menus, forms, tables, imports/exports, and results, Phaser owns the center simulator viewport for map rendering, sprites, animation, overlays, and direct pointer interaction, and the right panel owns the selected-glider waypoint timeline. It has:

- main menu, campaign flow, mission briefing, planning, simulation, debrief, level editor, and dataset export scenes
- Phaser-native top-level modes for Tutorial, Deterministic Challenge, Stochastic Challenge, Environment Editor, and Load Level JSON
- isolated Static and Temporal Flow Field demos for current arrows and glider-like particle motion
- game-first mission planning workspace with a large Phaser map, HTML/CSS mission-control overlays, top selected-glider planning HUD, bottom mission-time slider, waypoint drawer/table, and non-executable planning markers
- Phaser 3 scene shell with Main Menu, Mission Briefing, Mission Workspace, Simulation, Debrief, Environment Editor, and Dataset Export scenes
- fourteen staged tutorial lessons built from handcrafted tutorial scenarios
- guided tutorial prompts in the Planning scene
- waypoint placement, timeline/list editing, deletion, reordering, import, and export
- same-cell waypoint stacking for repeated visits at different route times
- guidance cone, approximate-reach, preview-path, and predicted-surfacing planning overlays
- generated level UUID/instance identity for solver packets, plans, results, and datasets
- temporal Gold Star / priority targets for high-value, time-limited risk/reward objectives
- generated-challenge setup controls for agents, map size, duration, surfacing interval, fuel, varied glider specs, current-field presets, current strength, temporal variability, multiple drop zones, difficulty, hazards, ROI, forecast decay, and Gold Star frequency
- planning-map camera controls for large maps: zoom, pan, fit, and reset
- simulation playback and scoring
- bounded simulation safety guards for invalid starts, invalid waypoints, stalled targets, surfacing waits, and synchronous finish loops
- simulation watchdog instrumentation that records debug snapshots and exposes a debug-result export when playback stalls
- Slocum-style surfacing pauses and replanning decisions
- campaign ratings and objective feedback
- stochastic forecast mode with forecast ensembles, visible forecast fields, hidden truth scoring, probabilistic ROI, mobile hazards, and depth/bathymetry
- local browser leaderboard records for completed challenge attempts, grouped by level instance
- typed export products for replayable challenges, solver packets, oracle datasets, structured results, plans, and leaderboard records
- topology-aware synthetic ocean-inspired U/V current generation with seeded parametric presets for generated challenge, demo, and dataset levels
- generated deterministic/stochastic challenge levels with temporal ROI hotspot and current-field evolution
- generated-map connectivity validation and repair so deployment zones connect to navigable water and high-value ROI
- active render-time synchronization: planning uses the scrubber time, simulation uses `SimulationEngine.t`, and generated levels store temporal-frame validation metadata
- current preview, legend, magnitude stats, and gameplay warnings for fluid presets
- solver packet export and plan import
- a dependency-light Python external solver example
- optional Playwright smoke tests for development

Normal browser use does not require npm, Playwright, a build step, or a backend. Phaser is vendored locally at `vendor/phaser.min.js`; `npm install` is only needed for development dependencies and refreshing vendor assets.

The visible page shell uses three bounded regions: `#mission-console` on the left, `#center-column` / `#game-root` in the center, and `#waypoint-timeline` on the right. Phaser is mounted only inside the center viewport shell, and the canvas is resized to fill that shell instead of preserving a fixed 1280x820 page aspect ratio. Scenario Setup and Mission Briefing use responsive HTML overlays inside the same center shell, so their cards stretch, wrap, and scroll within the available center space instead of rendering as tiny fixed cards or overlapping the side panels. Idle, JSON import, planning, simulation, editor, and debrief scenes follow the same center-region contract: center content is sized from the Phaser scale or center shell, not the full browser window. On narrow or portrait screens, the right waypoint panel hides and the left console stacks above the center viewport. Map bounds are recomputed from the visible top selected-glider HUD and bottom timeline, so the board scales uniformly into the usable simulator area. The map may letterbox inside the full-size canvas when the grid and viewport aspect ratios differ, but grid cells remain square and the map is never stretched independently on x/y. The console is the only main menu surface; the Phaser Main Menu scene renders an idle "Awaiting Mission Launch" simulator viewport rather than duplicate buttons. The right panel shows a quiet waypoint placeholder until a mission is loaded, then becomes the authoritative executable waypoint timeline for the selected glider. The center viewport also has compact HTML overlays: a top selected-glider planning HUD and a bottom mission-time slider/playhead. Planning and Simulation both use the bottom DOM timeline panel; Phaser no longer renders playback buttons or a timeline track over the map. Selected-glider performance details now live in the left Mission Console.

The left Mission Console uses collapsible accordion sections for menus, setup, briefing, planning, simulation, editor, import, dataset, saved-level, and debrief controls. Section headers stay visible when collapsed, controls remain mounted inside the section body, and session state is saved in `localStorage` under `anchorGliderCommand.ui.accordions.v1` with mode-specific defaults.

## Run Locally

From the project root:

```bash
python -m http.server 8000
```

Open:

```text
http://localhost:8000
```

If Python is unavailable, any static file server can serve the repository root. The browser app loads `index.html`, CSS, JavaScript modules, level JSON, mission JSON, and other static assets directly.

## How To Play

See [HOWPLAY.md](HOWPLAY.md) for complete player instructions, tutorial guidance, scoring explanations, solver workflows, and classroom usage notes.

Quick loop:

1. Open the game.
2. Choose `Static Flow Field Demo`, `Temporal Flow Field Demo`, `Tutorial Mode`, `Deterministic Challenge`, `Stochastic Challenge`, `Environment Editor`, or `Load Level JSON`.
3. For generated challenges, configure the scenario setup, then click `Generate Mission`.
3. Start a tutorial, generate a challenge, import a level JSON, or use an editor/custom level.
4. Read Mission Briefing, then click `Start Planning`.
5. Place waypoint plans directly on the map.
6. Click `Execute`.
7. Review Debrief score, objectives, rating, and suggestions.
8. Retry, revise, continue to the next tutorial, generate another challenge, return to the editor, or export data for solver experiments.

## Documentation Index

- [Game design](docs/game_design.md)
- [Solver workflow](docs/solver_workflow.md)
- [Export formats](docs/export_formats.md)
- [Plan format](docs/plan_format.md)
- [Temporal Greedy](docs/temporal_greedy.md)
- [Testing](docs/testing.md)
- [Leaderboard and best paths](docs/leaderboard.md)
- [Development versions and project state](docs/development_versions.md)
- [JavaScript headless solver tools](tools/js/README.md)
- [Python and Colab solver tools](tools/python/README.md)

## Gameplay Features

### Flow Field Demos

The Main Menu includes `Static Flow Field Demo` and `Temporal Flow Field Demo` above Tutorial Mode. These demos are isolated Phaser scenes for teaching current vectors: the map shows an arrow grid, glider-like particles drift through the field, and particle heading follows the resulting movement. Static uses one fixed synthetic field; Temporal evolves the field over time. They do not create missions, waypoints, scores, leaderboard entries, or route-validation state.

### Campaign And Tutorials

Tutorial Mode is a fourteen-step campaign that unlocks planning concepts gradually. It opens a center Tutorial Browser: the left Mission Console holds search/filter/progress controls, the center viewport shows scrollable tutorial cards, and the right panel shows details for the selected lesson. Starting a lesson opens Mission Briefing first, then `Start Planning` enters the Mission Planning workspace. The workspace shows only the controls needed for that lesson, plus concise guidance prompts and a tutorial-focused debrief.

1. `Tutorial 01: First Deployment` - choose a deployment cell, place one waypoint, execute.
2. `Tutorial 02: Ride the Current` - read current arrows and use flow-assisted routes.
3. `Tutorial 03: Energy and Travel Cost` - compare route cost against energy budget.
4. `Tutorial 04: Time Slider and Temporal Fields` - scrub mission time and plan by window.
5. `Tutorial 05: Priority Gold Stars` - chase time-limited priority targets.
6. `Tutorial 06: Planning Markers / Explorer Mode` - pin ideas without changing the executable route.
7. `Tutorial 07: Remaining Value and Duplicate Sampling` - avoid spending effort on already claimed value.
8. `Tutorial 08: Hazards and Blocked Routes` - route around hazards and read failure feedback.
9. `Tutorial 09: Surfacing and Replanning` - update waypoints after surfaced reports.
10. `Tutorial 10: Multi-Agent Coordination` - split coverage between gliders.
11. `Tutorial 11: Stochastic Forecast` - plan with probability and expected value.
12. `Tutorial 12: Forecast Horizon Decay` - treat later forecasts as less reliable.
13. `Tutorial 13: Full Mission Challenge` - combine deployment, currents, energy, hazards, markers, surfacing, and forecast uncertainty.
14. `Tutorial 14: Import / Export Workflow` - load a premade JSON waypoint plan, validate the route, and execute it.

The campaign definitions live in `src/core/tutorial/TutorialDefinitions.js`. They reuse the handcrafted `anchor.level` JSON files in `levels/tutorial_01_currents.json` through `levels/tutorial_05_forecast.json`, then layer tutorial metadata, feature gates, success criteria, and mission overrides on top. Tutorial 14 also uses `tutorials/import-demo/import-demo-waypoints.json` as a packaged importable demo plan.

### Mission Briefing

Every playable scenario now passes through a compact Mission Briefing before planning. This applies to tutorials, deterministic challenges, stochastic challenges, imported JSON levels, saved UUID levels, and editor/custom levels. The briefing is a mission dossier: it shows the objective, challenge mode, drop-zone or fixed-start rule, end condition, sampling mode, agent count/fuel, duration, planning window, high-level hazard/current conditions, and stochastic/forecast note. It does not reveal the tactical map, ROI hotspot positions, current vectors, hazard cells, terrain layout, or deployment-zone geometry. `More Details` expands scoring and tutorial guidance without showing the planning board. `Start Planning` marks the briefing as seen and opens the main workspace where the spatial domain is revealed.

### Mission Planning Workspace

Planning is the main game workspace. Phaser renders the mission board, gliders, waypoints, global planning markers, currents, Gold Star priority targets, route overlays, guidance cone, and map hit targets. The left Mission Console renders planning controls, status, route/cost estimate, solver/export actions, layer toggles, selected-glider performance details, and execute controls. The right Waypoint Timeline panel renders agent tabs and only the selected glider's executable waypoint sequence with pending/active/completed/missed status. The center viewport includes a top selected-glider planning HUD for projected route cost, estimated remaining fuel, planning window/time, expected ROI estimate, current assist/opposition, next surface estimate, likely reachability, route validity, and compact warnings. The bottom center is reserved for the mission-time slider in Planning and the mission-time playhead during Simulation.

Generated challenge setup opens before the map is created. Presets include Small, Medium, Large, and Huge/Experimental. Player settings include agent count, duration, surfacing interval, fuel per glider, glider speed, uniform or varied fleet specs, single or multiple drop zones, difficulty, current-field preset, current strength, temporal variability, hazard density, terrain density, ROI hotspot count, and Gold Star frequency. Stochastic setup also exposes ensemble count and forecast horizon decay controls. The selected setup is stored in `level.meta.generationConfig.scenarioSetup` and `mission.meta.scenarioSetup`.

Advanced generated missions can use synthetic vector presets: `calm`, `uniformDrift`, `shearFlow`, `currentCorridor`, `eddyField`, `doubleGyre`, `tidalOscillation`, `meanderingJet`, `westernBoundaryCurrent`, `stormPulse`, `islandWake`, `curlNoise`, `gulfInspired`, `hycomInspiredComposite`, and `chaotic`. These are synthetic ocean-inspired gameplay fields, not operational ocean-model products or validated HYCOM forecasts. Preset variation is seeded from the challenge UUID / replay seed anchor plus preset and generation config, so one challenge replays the same currents while different challenge UUIDs get different repeatable current patterns. The shared sampler applies terrain-aware shoreline interpretation when terrain is available, so current into land is damped/deflected and exposed as risk metadata for hover diagnostics, Travel Cost, Risk/Safety, simulation drift, and Temporal Greedy scoring. Stochastic missions can enable forecast decay so confidence and ROI probabilities decrease farther into the future; the Planning tooltip and confidence overlay show the decayed forecast confidence, and guidance cones widen through the existing confidence path. Varied fleets assign per-agent speed, fuel, energy-rate, drift-gain, and sampling-radius specs. Multiple-drop-zone missions allow a glider to pick any allowed deployment zone before planning.

Completed simulations are saved to a browser-local leaderboard under `anchorGliderCommand.leaderboard.v1` when `localStorage` is available. Main Menu `Leaderboard` opens a dedicated mode: the left Mission Console holds filters and import/export actions, the center viewport shows scrollable saved challenge cards, and the right panel shows selected-record details. It can load a saved challenge, load/export the best plan, export the saved level, delete attempts, and clear local records. In Planning, the Analysis section also exposes the best prior run for the current challenge instance with show/hide ghost path, rerun, load-as-plan, and export controls. No backend or account is used.

Export formats are intentionally separated. `anchor.challenge` reloads playable challenges, `anchor.solverPacket` gives external algorithms only allowed planning information, `anchor.oracleDataset` includes hidden truth for research/training, `anchor.result` preserves one attempt, and `anchor.leaderboard` shares local challenge records. Public stochastic challenge exports omit plain hidden truth and may carry an opaque reload bundle that is cheat-resistant only; solver exports omit hidden truth by default. Oracle exports include hidden truth and are not for fair player planning. See `docs/export_formats.md` and `docs/stochastic_hidden_truth.md`.

External solvers interact through files rather than a backend: export a challenge or solver packet, run A*/Dijkstra/ML/RL tooling outside the browser, import the returned `anchor.plan`, simulate it, then export `anchor.result`. Plan import supports `openLoop` and `timedOpenLoop` route execution now, preserves `surfaceUpdateBundle` metadata with a warning, and treats `policy` / `contingencyTable` as non-executable metadata. Lightweight local storage uses `localStorage` keys for challenges, saved attempts, leaderboard records, settings, and a storage index; the storage API is isolated so IndexedDB can be added later.

Simulation surface and route-failure menus also support the same file workflow. Export `anchor.surface-observation`, run an external recovery planner, then import `anchor.plan-segment`, a complete `anchor.plan`, or a simple waypoint list. The browser validates the data and replaces future waypoints for the surfaced/failed agent without overwriting completed past waypoints.

Large maps support camera controls in the Planning workspace. Use mouse wheel to zoom, right/middle drag or Space+drag to pan, `+`/`-` to zoom, WASD or arrow keys to pan, `F` to fit, and `R` to reset. The camera affects the map layer only; Mission Console, Waypoint Timeline, HUDs, modals, and timeline controls stay fixed.

The workspace supports:

- selected glider control
- visible `Main Menu` return from the planning console
- planning window selection
- grouped `Plan`, `Analysis`, `View`, and `Execute` menus
- left-side mission identity, selected glider, active time/window, legend, and route estimate
- Phaser-native bottom mission-time slider with planning-window markers and an exact mission-end frame
- surfacing markers for surface-only communication missions, including the final surface/end frame
- future planning-marker ticks on the bottom timeline
- click-to-place waypoints
- marker mode for placing non-executable future planning references
- default waypoint action: `sample`
- waypoint up/down reordering
- right-panel waypoint selection and deletion
- deleting individual waypoints
- plan import/export as `anchor.plan`
- compact level/instance/seed identity display
- saving the active level to the local saved-level registry
- copying the active instance ID
- solver packet export as `anchor.solverPacket`
- temporal greedy plan generation for a browser-native comparison route

Planning HUD values are fast estimates, not exact simulation results. `Projected Cost`, `Estimated Fuel`, `Expected ROI Est`, `Realized Preview`, guidance cones, and approximate reach overlays use visible planning fields, speed/time assumptions, current assist/opposition, cross-current drift, forecast confidence, and simple terrain checks. The actual path, fuel used, hazards contacted, and stochastic ROI outcome are computed during Simulation and summarized in Debrief. If a planning preview differs from the simulation result, treat it as model uncertainty and a planning lesson rather than a game error.

Reachability ovals, drift cones, hover ETA/energy labels, arrival previews, and predicted-surface markers are planning-only overlays. Pressing `Execute` clears their transient anchor/hover state; Simulation shows planned path, actual path, glider state, and events instead. Debrief owns the fullscreen result view and does not retain planning guidance overlays behind it.

Waypoint placement is sequential. After a waypoint is added, the game estimates travel time from the previous planning anchor, writes `estimatedArrivalTime`, `segmentTravelTime`, `segmentEnergy`, `cumulativeEnergy`, `remainingFuelEstimate`, and `arrivalUncertainty` onto the waypoint, advances the time slider to that estimate, and recenters guidance from the new reachable anchor. Multiple waypoints may share the same cell when the route revisits that location at different times; the map fans their markers slightly and shows an `xN` stack badge while import/export and simulation preserve waypoint array order. If the direct segment is blocked by terrain, the warning is kept on the waypoint and the guidance anchor stays at the previous reachable point. Guidance cones are current-aware: assisting current extends and narrows the cone, opposing current shortens and warns, cross-current shifts and widens the expected arrival oval, and low confidence or ensemble disagreement widens the forecast envelope.

Planning markers are separate from route waypoints and are global by default. Use the `Mode: Waypoint` / `Mode: Planning Marker` button in the Mission Console to switch placement mode, scrub to a future time, then click the map to leave a marker for a future target, Gold Star timing note, or tactical reminder. Markers render differently from waypoints, show as diamond ticks/icons on the bottom timeline, and can be hidden with `Show/Hide Planning Markers`. Each future marker shows an estimate badge in the selected-marker HUD: `Reachable`, `Tight`, `Risky`, or `Impossible`, plus target time, travel-time slack, estimated energy, remaining fuel, route risk, and a backfill hint for roughly how many planning windows/intermediate waypoints may be needed. They are preserved by plan import/export and included in solver packets as notes, but they are not connected by route lines, executed, sampled, or scored unless absorbed by placing a waypoint on the same marker cell/time.

Marker Mode is free exploration and annotation. It does not require a selected glider, deployment cell, selected start, planning anchor, or route feasibility. Hovering a cell shows a floating map tooltip plus Mission Console inspection data for the current timeline time: coordinates, ROI value, current vector/magnitude, water/terrain, hazard, depth, forecast confidence when available, and active priority target value. Route guidance, drift cones, reachable ovals, ETA labels, and energy previews are suppressed until the player switches back to Waypoint Mode.

The bottom time slider acts as a planning ruler. It shows planning-window and surfacing ticks, gold-star target icons, marker icons at pinned future times, numbered waypoint icons at estimated arrival times, and a distinct final mission-end frame. `Prev` and `Next` step through the frame list, so missions like `0, 3, 6, 9, 10 hr` can reach the exact `10 hr` end frame instead of stopping at the last full planning window. Click a waypoint icon to select/focus that waypoint, click a marker icon to focus its time and estimate, or click a star icon to scrub to the star window. Marker icons carry early/on-time/late/unconnected timing hints by comparing nearby waypoint arrival time to the marker target time.

Planning enforces mission limits. New waypoint placement is blocked with a warning if the proposed segment would exceed mission duration, exceed the selected glider's estimated fuel, or cross blocked terrain. Existing plans imported from JSON are recomputed and invalid waypoints are marked with `validity` reasons instead of silently producing repeated clamped times.

Before `Execute`, the game validates that the level, mission, starts, deployment selections, time settings, waypoint coordinates, route segments, estimated arrival time, and estimated fuel are executable. Invalid plans stay in Planning, disable the visible Execute controls, mark the affected waypoint in the right timeline, color invalid bottom-timeline waypoint icons, and highlight blocked map segments with a breach marker. The simulation engine also has max-step and invalid-position abort guards so direct imports or edge cases stop with a visible result rather than freezing the browser.
- forecast/perfect-knowledge display toggle
- confidence overlay in forecast mode
- planning guidance toggle for map overlays
- view-layer toggles for water, ROI heatmap, current vectors, hazards, terrain, guidance cone, approximate reach, cost preview, planned path, actual path, and best prior path overlay
- stateful `ROI Mode` planning perspectives: Value, Probability, Expected, Remaining, merged Risk / Safety, and Travel Cost
- stronger planned-route, predicted-drift, drift-cone, and predicted-surfacing feedback
- glider triangle heading follows planned preview direction and actual simulation movement
- smoother blue-to-yellow ROI heatmap, terrain-masked land, orange-red hazard markings, and white current arrows scaled by magnitude
- terrain-aware route preview that clips at land breaches and reports route/energy warnings in the route summary
- Phaser-native help/briefing modal with tutorial guidance
- prominent `Execute` button to run the mission

Waypoint array order is execution order. The `window` and `t` fields are planning-time metadata for the UI and timeline; imported/exported plans preserve waypoint order instead of sorting by window.

Direct map interaction model:

- click valid water cell: add waypoint, even when another waypoint already exists there
- Shift-click or Alt-click a waypoint cell: select an existing waypoint on that cell
- select, delete, and reorder existing waypoints from the right waypoint timeline/list
- click blocked terrain: reject with warning
- click hazard: allow with warning
- click a glider sprite: select that glider
- drag glider start: supported only when mission rules enable start/drop placement

The Phaser mission board and waypoint drawer both write to the same `anchor.plan` object. Map clicks, global marker placement, drawer reorder/delete controls, import, and export stay synchronized through the core planning helpers.

`ROI Mode` changes what the heatmap means without changing simulation scoring. `Value` shows raw sample value, `Probability` shows likelihood, `Expected` shows value times probability, and `Remaining` shows raw value still available after currently planned fleet routes are considered. `Risk` highlights hazards, shallow water, strong currents, mobile hazard proximity, and low-confidence forecast cells; `Safety` shows the inverse; `Travel Cost` estimates difficulty from the current selected glider planning anchor. Remaining mode covers each agent's selected start or fixed start, every route segment between waypoints, explicit sample waypoint cells, and the configured sampling radius when applicable. In deterministic missions, Probability mode reports available ROI cells as probability 1.0 unless probabilistic fields are configured. These modes are planning-only and do not mutate the raw ROI field or replace simulation-time depletion rules.

The planned route line starts at the fixed start, selected deployment cell, or surfaced replanning position, then connects to waypoint 1 and onward through the waypoint list. Multi-agent and imported plans use each agent's own anchor, and the game does not draw a fake first segment if a deployment start has not been chosen.

Glider triangle orientation uses standard path angles. In Planning, the selected glider points from its current planning/start position toward the hovered target when previewing, otherwise toward the first route segment when a route exists. In Simulation, the glider points along recent actual movement, then latest velocity, then the active waypoint if stationary.

Temporal Greedy plans run the same route validity audit before they are accepted. If validation finds a blocked generated segment, the browser keeps the shorter valid prefix and records the validation stop reason in plan metadata.

Generated challenge missions use deployment/drop zones. Before ordinary waypoint placement begins, the selected glider enters deployment-selection mode: the drop zone is highlighted, the map prompts you to choose a deployment cell, and the waypoint panel shows `Start: not selected`. During this state, guidance cones, route previews, ETA/energy labels, reachability ovals, fake origin markers, overlapping base/station markers, and real glider/start icons are suppressed. A temporary ghost marker can appear only under a valid hovered deployment cell. Click a valid highlighted cell to lock the start marker, then place route waypoints. After deployment, the reachability oval and guidance anchor center on the locked `selectedStart`; after each reachable waypoint, they center on the latest waypoint rather than on hover previews or a default grid cell. The selected start is not a sample waypoint. Tutorial missions keep fixed starts. Exported plans may include `agentPlans[].selectedStart`, and solver packets include each agent's allowed deployment cells plus the chosen `selectedStart` when one exists.

Generated challenge maps run a connectivity validation pass. The generator checks that each deployment zone has water cells, at least one deployment cell connects to navigable water, high-value ROI cells are reachable, and required recovery/communication zones are reachable when configured. If terrain isolates the drop zone, generation first clears nearby water and carves a small corridor toward the largest navigable region and ROI targets; if validation still fails, it retries with a derived seed. The result is recorded in `level.meta.connectivity` and included in solver packets so external planners can detect map-playability warnings.

The active Mission Workspace no longer uses visible DOM side panels. A hidden DOM file input remains for browser-safe plan import, and exports still use the normal browser download helper.

During Simulation, the same bottom timeline readout advances with engine time. The active window and visible map frame update from playback time so current/ROI fields and mobile hazards track the simulated mission clock instead of staying fixed at the planning time.

If simulation stops after blocked movement, unreachable waypoints, time/fuel failure, or a missed-waypoint cascade, the simulation pauses into a Route Failure modal instead of appearing frozen. The modal explains the failed waypoint, reason, last successful waypoint, current glider position/time, and suggested fix. Recovery choices are `Replan`, `Skip WP`, `Continue`, `Debrief`, and `Main Menu` when safe for that failure type. The left Simulation Console also shows fallback recovery buttons. The right waypoint timeline marks missed waypoints with reason labels such as `MISSED: ROUTE BLOCKED`, `MISSED: UNREACHABLE`, `MISSED: TIME EXCEEDED`, or `MISSED: FUEL EXCEEDED`.

Debrief uses the same bounded three-region shell as planning. The left Mission Console switches to Debrief actions, the center viewport shows a clean HTML/CSS results view, and the right Waypoint Timeline remains visible as the original mission-plan artifact with final waypoint status when available.

### Simulation

Simulation resolves the waypoint plan under simplified educational physics. Playback controls live outside the Phaser map in the bottom timeline panel: Start, Prev, Next, End, Play/Pause, Step, and Finish. The left Simulation Console keeps primary recovery/navigation actions, while the canvas remains focused on terrain, currents, hazards, gliders, planned route, actual path, and route/failure overlays.

```text
actual motion = commanded motion + driftGain * current velocity
```

Missions can optionally enable seeded stochastic drift with `rules.drift.stochasticDrift: true`, `rules.drift.noiseScale`, and `rules.drift.seed`. This does not make water randomly matter; currents always affect the glider. The optional noise represents forecast/current uncertainty during stochastic simulation. The same seed repeats the same perturbation pattern, while a different seed can produce a different actual drift trace. Result JSON and Debrief include compact drift metrics such as average current assist, average cross-current, and stochastic drift seed when available.

Simulation tracks:

- actual glider path
- surfaced/submerged/surfacing comms state
- battery and energy use
- current waypoint progress
- waypoint completion and missed waypoints
- ROI samples collected
- duplicate samples
- depleted/cooldown/persistent sampling metrics, when enabled
- hazard events
- elapsed time
- event log
- surfacing and replanning decisions

### Scoring And Debrief

Debrief is a Phaser-native fullscreen score screen with metric cards, comparison rows, seed history, and action buttons. It hides the planning map and side timeline so results are not visually mixed with the spatial domain. It shows:

- final score
- sample score
- energy used
- hazards hit
- elapsed time
- duplicate samples
- sampling mode and duplicate/depleted/cooldown metrics
- recovery/surface end-condition success, bonus, and penalty when configured
- completed/missed waypoints
- objective completion
- bronze/silver/gold/perfect rating
- performance suggestions
- event summary
- forecast regret when available
- side-by-side comparison for manual/player, temporal greedy, and imported solver results when available
- winner notes explaining likely score differences such as realized value, energy, hazards, risk, and forecast regret

The Debrief buttons handle `Revise Plan`, `Retry From Briefing`, context-aware next actions, reruns, Temporal Greedy simulation, result export, after-action report export, comparison export, and return to Main Menu. Tutorial debriefs offer `Next Tutorial`, generated challenge debriefs offer `New Challenge`, and editor/custom debriefs offer `Return To Editor`. JSON and Markdown exports still use the browser download bridge internally.

Simulation has safety guards for invalid time steps, invalid waypoint coordinates, terrain-blocked targets, stalled waypoint pursuit, and maximum step count. If a plan cannot be executed safely, the simulator stops with a warning and result JSON records `aborted` and `abortReason` instead of locking the browser.

For surface-only missions, scheduled surfacing pauses now use an explicit surface-decision state. The Phaser modal appears above the simulation map with Continue, Update, and Finish actions. If the modal cannot be shown, keyboard fallbacks are available: `C` continues, `U` returns to waypoint planning from the surfaced position, and `F` finishes to Debrief.

Route failure recovery uses a similar explicit decision state. `Replan` returns to Planning from the current actual glider position and simulation time, preserving completed/missed waypoint status. `Skip WP` keeps the failed waypoint marked missed and resumes with the next waypoint. `Continue` resumes without editing when safe. `Debrief` ends the mission and records the recovery choice in result events.

Ratings are defined by level campaign metadata. Progress is stored in browser memory and, when available, `localStorage`.

## Modes

### Perfect Knowledge

Planning shows the same truth fields used by simulation. This mode teaches core routing, current use, hazards, energy, and waypoint sequencing.

### Forecast

Planning shows forecast fields while simulation scores against hidden truth. Stochastic Mode can generate multiple forecast members, show an ensemble mean, visualize ensemble disagreement, and switch ROI display between expected value, reward value, and probability.

Forecast packets include visible forecast data and hide truth unless explicitly included for benchmarking.

### Stochastic Environment Layers

Stochastic levels may include:

- forecast ensembles in `layers.forecasts`
- probabilistic ROI cells with `value`, `probability`, and `expectedValue`
- mobile hazards that move over mission time
- depth/bathymetry grids where shallow water can cost more energy or block cells

The planning HUD includes compact controls for forecast member, ROI view mode, and ensemble uncertainty. Debrief shows expected sample value, realized sample value, expected-value regret, mobile-hazard contacts, and the forecast member/ROI view used.

Probabilistic ROI supports two scoring modes:

- `expectedValue`: scoring uses `value * probability`.
- `realizedStochastic`: each sampled ROI cell manifests once per run using a deterministic seed; manifested cells award reward value and missed cells award zero.

Result exports record the ROI scoring mode, stochastic seed, per-cell stochastic outcomes, explicit `probabilityOutcome` events, expected sample value, realized sample value, probability success/failure counts, mobile-hazard exposure, depth energy contribution, and approximate ensemble regret when forecast ensembles exist.

Mission JSON can configure end conditions and sampling behavior. By default, older missions use `rules.endCondition.mode: "none"` and `rules.sampling.mode: "unique"` with zero-value duplicates. Recovery/pickup/surface/communication missions can reward or require ending near a target zone or surfacing by mission end. Sampling modes include `unique`, `diminishing`, `cooldown`, and `persistent`; Debrief and result exports show the active mode and duplicate/depleted/cooldown metrics. The ROI heatmap is rendered cell-by-cell, not as a smoothed blob, so each sampleable cell remains visually distinct.

Levels can also include temporal Gold Star Targets in `layers.priorityTargets`. These are separate from ROI cells: they appear only in active time windows, can move between windows, and award a large bonus when a glider passes within the target radius while active. Generated challenges are not guaranteed to show a star at mission start, and some planning windows intentionally have no active star. Missed targets have no penalty by default. Debrief, result JSON, solver packets, and datasets report available, captured, missed, duplicate, and scored target metrics.

In Stochastic Challenge mode, the Mission Workspace HUD shows a compact stochastic test panel. It displays the active seed, ROI scoring mode, selected forecast member, and buttons for `Rerun Same Plan` and `Rerun New Seed`. Same-seed reruns keep the exact level, mission, and waypoint plan and reproduce the same stochastic ROI outcomes. New-seed reruns keep the same plan but change the deterministic ROI manifestation seed so students can test robustness. Debrief stores seed-specific run summaries for the current plan and shows a compact seed comparison table when available.

### Debug Reveal

Planning can reveal truth in forecast mode for debugging. This is not intended for normal challenge play.

## Import And Export

The game can export/import:

- level JSON
- mission JSON
- plan JSON
- result JSON
- after-action report Markdown
- solver packet JSON
- level dataset JSON
- solver packet dataset JSON
- training examples JSONL

When browser storage is available, generated/custom levels can also be saved and recalled locally by instance ID. The versioned localStorage key is:

```text
anchorGliderCommand.savedLevels.v1
```

Stored shape:

```json
{
  "levels": {
    "instanceId": {
      "savedAt": "ISO timestamp",
      "level": {}
    }
  }
}
```

`Load Level JSON` is the primary recall flow. The Phaser-native import screen opens a hidden browser file picker, imports an exported `anchor.level` file, validates and normalizes it, then shows a compact in-game summary with level name, level ID, instance ID, grid, duration, challenge mode, truth/forecast data, and mission defaults. From that summary the player can choose `Play Deterministic`, `Play Stochastic`, `Open Editor`, or return to the menu. Play choices open Mission Briefing before planning. UUIDs and instance IDs remain embedded in level, plan, solver packet, result, and dataset JSON for identity and comparison, but players do not need to type IDs to load a level.

A legacy saved-level registry remains available internally for local browser saves and UUID recall. If localStorage is unavailable, the game warns gracefully and JSON import/export still works.

Core schemas are documented in `schemas/`:

- `schemas/level.schema.json`
- `schemas/mission.schema.json`
- `schemas/plan.schema.json`
- `schemas/result.schema.json`
- `schemas/solver-packet.schema.json`
- `schemas/dataset.schema.json`

The schemas are readable schema-like documentation. Runtime validation is intentionally lightweight.

## Solver Bridge

Planning can export an `anchor.solverPacket` containing:

- level ID and mission ID
- full level and mission objects
- challenge mode
- visible planning fields
- terrain and hazards
- forecast fields when available
- forecast ensemble members when available
- selected forecast member and ROI view mode
- stochastic config: seed, ROI scoring mode, and selected forecast member
- probabilistic ROI data
- mobile hazards and depth/bathymetry
- truth fields only when visible or explicitly included
- expected `anchor.plan` shape

External solvers can read this packet, generate an `anchor.plan`, then import the plan back into Planning for simulation and scoring.

The repository includes a standard-library Python example solver:

```bash
python tools/python/example_greedy_solver.py anchor_solver_packet.json anchor_solver_plan.json
```

Supported example strategies:

- `value_per_distance`
- `greedy_roi`
- `nearest_roi`

The solver ranks visible ROI cells by expected value, avoids blocked terrain and hazard targets at a basic level, applies lightweight mobile-hazard, shallow-depth, ensemble-disagreement, and current-assist terms, and writes one waypoint list per mission agent. It is a readable baseline for students, not an optimal planner.

The repository also includes a Google Colab external-solver template:

```text
tools/python/notebooks/anchor_external_solver_template.ipynb
```

The notebook loads an exported `anchor.solver-packet.json`, reconstructs a lightweight forecast-only headless planning world, runs a starter greedy solver, writes `anchor.plan.json`, and documents the import loop. It is not live browser control and not a Python port of the simulator:

```text
Colab proposes. Game validates. Game simulates. Game scores.
```

The default notebook fairness metadata is `usesForecast: true`, `usesTruth: false`, and `usesOracle: false`.

For a higher-fidelity external-solver path, Node.js can run portable ANCHOR core modules headlessly:

```bash
node tools/js/headless_solver.mjs anchor.solver-packet.json anchor.plan.json
node tools/js/headless_validate_plan.mjs anchor.solver-packet.json anchor.plan.json
```

This path is documented in `tools/js/README.md` and is also shown as an optional Colab notebook cell. It avoids Phaser and DOM imports and keeps the browser game as the official referee.

Debrief stores comparison results for the current browser session in slots for `manual`, `temporalGreedy`, and `importedSolver`, with legacy compatibility for older `greedyBaseline` records. Run or import each plan, simulate it, then Debrief shows available rows side by side and includes the comparison in result JSON and after-action Markdown exports. Temporal Greedy is the browser-native selected-glider baseline planner; see `docs/temporal_greedy.md` for algorithm scope, scoring, validation, and limitations.

More details:

- `docs/solver_workflow.md`
- `docs/export_formats.md`
- `docs/plan_format.md`
- `docs/temporal_greedy.md`
- `docs/testing.md`
- `docs/development_versions.md`
- `tools/js/README.md`
- `tools/python/README.md`
- `tools/python/example_solver_readme.md`

## Dataset Export

Dataset Export generates deterministic browser-safe batches for solver and ML experiments:

- synthetic levels
- solver packets
- training examples JSONL

Controls include count, seed start, grid size, difficulty, current preset, current strength, temporal variability, hazard density, ROI hotspots, challenge mode, forecast noise, and hidden-truth inclusion. Forecast-mode datasets include ensemble forecasts, probabilistic ROI, mobile hazards, and depth fields by default.

Dataset current presets include `calm`, `uniformDrift`, `shearFlow`, `currentCorridor`, `eddyField`, `doubleGyre`, `tidalOscillation`, `stormPulse`, `islandWake`, `gulfInspired`, and `chaotic`. They produce deterministic synthetic temporal U/V current frames for gameplay and solver testing; they are not real ocean-model data.

This is intended for offline experiments, classroom assignments, and benchmark generation. It does not train ML models in the browser.

## Environment Editor

The Environment Editor can generate, import, edit, and export custom levels. Controls include:

- Phaser-native grouped editor HUD with Terrain, Water/Depth, Currents, Hazards, ROI, Deploy, Agents, Time, and Import/Export groups
- width and height
- seed
- difficulty preset
- duration, `dt`, planning window, and selected time frame
- current pattern/preset, strength, and temporal variability where generated
- synthetic fluid preset, viscosity, iterations, and vorticity controls
- current editing tool, Phaser-native radius/intensity steppers, synchronized DOM brush controls, and frame scope
- current preview panel with a temporal frame scrubber, previous/next/play/reset controls, and weak/moderate/strong legend
- per-frame and whole-sequence magnitude stats: min, max, mean, median, standard deviation, calm-cell ratio, strong-cell ratio, qualitative classification, and intense/calm frame markers
- ROI pattern and hotspot count
- hazard density
- terrain density
- forecast mode
- challenge mode
- ensemble count
- forecast noise
- ROI probability mode
- mobile hazard count
- depth variation
- number of agents
- battery/fuel and glider max speed

Brushes support:

- terrain
- hazard
- depth/deep water
- shallow water
- clear
- ROI boost
- base/deployment zone
- agent start
- U/V current vector brush

The Phaser editor HUD includes compact numeric steppers for brush radius and intensity. These settings persist while switching tool groups, stay synchronized with the legacy DOM inputs, and update brush behavior immediately. Radius affects terrain, hazard, depth, shallow, clear, ROI, and current/vector edits; intensity controls ROI boost and current/vector strength.

The current brush supports directional flow, vortex/eddy, current corridor, and calm/clear tools. Edits can apply to the selected frame or every frame. Generated fluid presets are synthetic ocean-inspired fields and can be manually edited after generation.

Generated challenge levels use a 24-hour default mission horizon with 3-hour planning windows. Deterministic challenges use moving/pulsing ROI hotspots and shifting parametric current presets by default. Stochastic challenges generate evolving hidden truth fields plus evolving forecast and ensemble fields, so scrubbing the planning timeline changes ROI heatmap cells, current arrows, and forecast uncertainty overlays.

The scenario setup screen can override those defaults. Medium and Large presets increase grid size, duration, agent count, and fuel. Huge/Experimental maps can use 48x48 grids and show a performance warning. Current-vector rendering automatically uses a coarser stride on larger maps.

For current edits, click and drag on the map to preview a vector before applying it. The preview shows an arrow, brush radius, affected cells, magnitude label, and current/all-frame scope. Releasing the pointer applies the synthetic vector edit; Escape or right click cancels the preview.

Use the current preview scrubber to inspect generated dynamic current frames before committing them. The mini preview can step, scrub, or play at a low frame rate without regenerating fields. Changing the preset, seed, strength, viscosity, iterations, vorticity, duration, planning window, or terrain regenerates the preview sequence and resets it to the first frame. `Apply To Level` commits the full generated frame sequence, not only the visible preview frame.

Generated and edited levels remain static-host compatible and export as `anchor.level`. Custom exports may include `missionDefaults` so imported levels can create a playable mission without a separate mission file.

Generated levels store current preset metadata and current magnitude stats in `meta.generationConfig.currentGenerator`. Supported parametric presets are `calm`, `uniformDrift`, `shearFlow`, `currentCorridor`, `eddyField`, `doubleGyre`, `tidalOscillation`, `stormPulse`, `islandWake`, `gulfInspired`, and `chaotic`. Each generated preset evolves over mission time; `calm` evolves only weakly for early training. The resulting level frames still use the normal `truth.frames[].current` grid of `[u, v]` vectors, so Travel Cost mode, drift cones, reachability, simulation, solver packets, and dataset exports do not need a separate format.

## Optional Development Tests

Playwright smoke tests are available for development only. They are not required to run the browser game.

Install optional dev dependencies:

```bash
npm install
npx playwright install
```

Run smoke tests:

```bash
npm run test:e2e
```

Run headed:

```bash
npm run test:e2e:headed
```

The e2e tests start a small Node static server on `127.0.0.1:9321` only while tests run. See `docs/testing.md`.

Current smoke coverage:

- app loads
- main menu appears
- level select opens
- Tutorial 01 starts
- planning scene appears
- waypoint can be placed
- Phaser-native HUD, waypoint drawer, timeline, and surfacing modal appear
- simulation can run
- debrief appears
- plan export button exists
- stochastic mode exposes ensemble/risk controls
- saved level registry can save, recall, and delete by instance ID
- level generator opens

## Development Commands

```bash
npm.cmd run check
npm.cmd run test:e2e
```

`npm.cmd run check` runs `node tools/check-js.mjs` for repository JavaScript syntax/import checks. Playwright requires optional npm setup. On non-Windows shells, use `npm run check` and `npm run test:e2e`.

## Architecture

The project is intentionally static and dependency-light.

```text
index.html
css/
src/
  game/
    main.js
    phaser/
      PhaserGame.js
      PhaserCoreAdapter.js
      scenes/
        BootScene.js
        MainMenuScene.js
        LoadLevelJsonScene.js
        LoadLevelByIdScene.js   # legacy local saved-level registry, not the primary load flow
        MissionBriefingScene.js
        MissionWorkspaceScene.js
        SimulationScene.js
        DebriefScene.js
        EnvironmentEditorScene.js
        DatasetExportScene.js
      ui/
        Button.js
        FileBridge.js
        FocusManager.js
        MissionWorkspaceHud.js
        Modal.js
        Panel.js
        TimelineSlider.js
        WaypointDrawer.js
    state/
      GameState.js
  core/
    campaign/
    evaluation/
    fluids/
    generation/
    io/
    math/
    planning/
    schemas/
    sim/
  ui/
    Toast.js
archive/
  legacy-vanilla-shell/
levels/
missions/
plans/
experiments/
schemas/
docs/
tools/
tests/e2e/
```

### Architecture Rules

- Game scenes call into core simulation, planning, generation, campaign, IO, and evaluation modules.
- Core simulation, planning, generation, campaign, and evaluation modules do not depend on scenes, DOM APIs, Phaser, or Canvas rendering.
- Core IO/storage modules may use browser-safe APIs such as `fetch`, download anchors, and `localStorage`, but they must not depend on Phaser scenes or local filesystem paths.
- Rendering/game UI does not own scientific logic.
- The browser version remains self-contained and static-host compatible.
- No React, TypeScript, Vue, Svelte, Angular, Next.js, or backend is required. Phaser 3 is used as a vendored static browser library.

## Key Files

### Game Flow

- `src/game/phaser/PhaserGame.js`
- `src/game/phaser/PhaserCoreAdapter.js`
- `src/game/phaser/scenes/BootScene.js`
- `src/game/phaser/scenes/MainMenuScene.js`
- `src/game/phaser/scenes/LoadLevelJsonScene.js`
- `src/game/phaser/scenes/MissionWorkspaceScene.js`
- `src/game/phaser/scenes/SimulationScene.js`
- `src/game/phaser/scenes/DebriefScene.js`
- `src/game/phaser/scenes/EnvironmentEditorScene.js`
- `src/game/phaser/scenes/DatasetExportScene.js`
- `src/game/phaser/scenes/LoadLevelByIdScene.js` exists as a legacy local saved-level registry. `Load Level JSON` is the primary user-facing recall flow.

### Core Simulation And Planning

- `src/core/sim/SimulationEngine.js`
- `src/core/sim/TruthWorld.js`
- `src/core/sim/Physics.js`
- `src/core/sim/Scoring.js`
- `src/core/sim/ROIValue.js`
- `src/core/sim/MobileHazards.js`
- `src/core/sim/DepthLayer.js`
- `src/core/generation/ForecastGenerator.js`
- `src/core/fluids/FluidField2D.js`
- `src/core/fluids/FluidPresets.js`
- `src/core/fluids/FluidFieldExporter.js`
- `src/core/generation/DepthGenerator.js`
- `src/core/planning/WaypointPlan.js`
- `src/core/planning/PlanExecutor.js`
- `src/core/planning/BaselineSolvers.js`

### Campaign And Tutorials

- `src/core/campaign/CampaignLevels.js`
- `src/core/campaign/LevelObjectives.js`
- `src/core/campaign/RatingSystem.js`
- `src/core/tutorial/TutorialDefinitions.js`
- `src/core/tutorial/TutorialFeatureGates.js`
- `levels/tutorial_01_currents.json`
- `levels/tutorial_02_energy.json`
- `levels/tutorial_03_hazards.json`
- `levels/tutorial_04_long_horizon.json`
- `levels/tutorial_05_forecast.json`
- `missions/tutorial_sampling.json`

### Phaser UI And Shell Utilities

- `src/game/phaser/ui/MissionWorkspaceHud.js`
- `src/game/phaser/ui/WaypointDrawer.js`
- `src/game/phaser/ui/TimelineSlider.js`
- `src/game/phaser/ui/Modal.js`
- `src/game/phaser/ui/Button.js`
- `src/game/phaser/ui/FileBridge.js`
- `src/game/phaser/ui/FocusManager.js`
- `src/ui/Toast.js`

### Legacy Reference

- `archive/legacy-vanilla-shell/`

The archived vanilla Canvas/DOM shell is retained only as historical reference. It is not imported by `src/game/main.js`, not part of active routing, and should not be described as the active implementation.

### IO And Data

- `src/core/io/ImportExport.js`
- `src/core/io/SaveGame.js`
- `src/core/io/SolverPacketExporter.js`
- `src/core/io/DatasetExporter.js`
- `src/core/io/ReportExporter.js`
- `src/core/storage/LevelRegistry.js`
- `tools/python/example_greedy_solver.py`

## Known Limitations

- The simulation is simplified for education and gameplay. It is not a full ocean or vehicle physics model.
- Current and forecast fields are synthetic and ocean-inspired, not Navier-Stokes, HYCOM, or operational ocean-model output.
- Greedy baseline and Python example solver are simple benchmarks, not optimal planners.
- Forecast regret uses a lightweight greedy truth-baseline reference; it is approximate unless full ensemble re-simulation is added.
- Realized stochastic ROI uses deterministic seeded Bernoulli outcomes, but it is still an educational approximation.
- Mobile hazard collision and depth effects are simple educational approximations.
- There is no real HYCOM or external ocean-model ingestion yet.
- There is no programmatic in-browser solver mode; solver examples run outside the browser and can be imported as plan JSON.
- Progress is browser-local and may reset if `localStorage` is unavailable or cleared.
- There is no backend, shared online leaderboard, account system, multiplayer, or in-browser ML training.
- Optional Python tools require a Python-enabled environment. Python is not required for normal browser play.
- Optional Playwright tests require npm development dependencies. npm is not required for normal browser play.

## Future Ideas

- More tutorial variants and challenge levels.
- Stronger planner examples and benchmark tooling.
- Richer multi-agent missions.
- More robust forecast ensembles and risk metrics.
- Better pathfinding baselines.
- Classroom analytics or optional backend leaderboard.
- Browser automation tests for broader full-playthrough coverage.
