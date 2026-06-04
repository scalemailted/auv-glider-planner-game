# How To Play ANCHOR: Glider Command

This guide explains how to play the game, what the screens mean, how scoring works, and how to use exports and solvers.

## Goal

You are a mission planner for an autonomous underwater glider. Your job is to place waypoints before the mission runs.

A good plan should:

- collect high-value ROI samples
- use currents instead of fighting them
- avoid hazards
- conserve energy
- complete waypoints in a sensible order
- handle forecast uncertainty when truth is hidden

You do not steer the glider in real time. You create a plan, run the simulation, then evaluate the result.

If a plan cannot run safely, the game blocks execution or records a safe aborted result instead of freezing. Invalid deployment starts are rejected before simulation, and unreachable or blocked waypoints can be marked missed during playback. If the simulation watchdog stops playback, use `Export Debug Result` from the Simulation Console; the exported JSON includes the watchdog reason, active waypoint, glider state, surfacing wait state, and render object count.

## Start The Game

From the project root:

```bash
python -m http.server 8000
```

Open:

```text
http://localhost:8000
```

Any static server can be used if Python is not available.

## Screen Overview

### Main Menu

The Main Menu is the starting screen. It links to:

- `Tutorial Mode`
- `Deterministic Challenge`
- `Stochastic Challenge`
- `Environment Editor`
- `Load Level JSON`
- `Dataset Export`
- `Leaderboard`

For first-time play, choose `Tutorial Mode`.

`Deterministic Challenge` opens a scenario setup screen, then generates a fresh perfect-knowledge mission where planning shows true terrain, hazards, ROI, and currents.

`Stochastic Challenge` opens the same setup flow, then generates a forecast-mode mission where planning shows forecast/belief fields and simulation scores against hidden truth.

Scenario setup controls include map size, agent count, duration, surfacing interval, fuel per glider, glider speed, uniform or varied glider specs, single or multiple drop zones, difficulty, current-field preset, current strength, temporal variability, hazard/terrain density, ROI hotspots, Gold Star frequency, and ensemble count for stochastic challenges. Stochastic setup can also enable forecast decay, which makes future forecast confidence lower than near-term confidence. Click `Generate Mission` to create the level and enter Planning.

Generated challenges use temporal fields. Scrub the bottom time slider to inspect how ROI cells warm/cool or move, how Gold Star Targets appear/disappear, and how current arrows shift direction/magnitude before committing a plan. Stochastic challenges also evolve hidden truth and visible forecast/ensemble frames over the same mission horizon.

Current-field presets are synthetic gameplay patterns: calm, uniform drift, shear flow, current corridor, eddy field, double gyre, tidal oscillation, storm pulse, island wake, Gulf-inspired circulation, and chaotic. Strength controls magnitude; Temporal Variability controls how much the field changes over mission time. These create distinct planning challenges but are not real ocean-model forecasts.

During simulation, the map uses the simulator clock rather than the planning scrubber. The bottom time readout, ROI heatmap, current arrows, mobile hazards, and visible forecast/truth field advance from the same simulation time source.

`Load Level JSON` opens a Phaser-native import screen. Its `Choose Level JSON` button uses a hidden browser file picker, then the game shows an in-game summary before you choose deterministic play, stochastic play, or editing. UUIDs still identify generated instances in JSON exports, but normal loading is done by importing JSON instead of typing an ID.

### Tutorial Mode

Tutorial Mode opens a center Tutorial Browser with fourteen staged lessons in order. The left Mission Console provides search, difficulty, status, and focus filters; the center viewport shows readable tutorial cards; the right panel shows the selected tutorial's objectives, mechanics, success criteria, progress, and `Start Tutorial` button.

Click `Play` on a tutorial level to open its Mission Briefing. From there, click `Start Planning` to enter the Mission Planning workspace.

Later lessons are locked until earlier tutorials are completed. Progress is stored in browser memory and, when available, browser `localStorage`.

Tutorial lessons intentionally hide advanced controls until they are useful. For example, early lessons focus on deployment, waypoints, currents, and execution; later lessons introduce travel-cost ROI mode, planning markers, remaining-value mode, surfacing updates, multi-agent planning, stochastic forecasts, solver import/export, and imported demo plans.

### Leaderboard

Completed challenge attempts are saved locally in this browser when `localStorage` is available. Leaderboard is a Main Menu mode: filters and actions stay in the left Mission Console, saved challenge cards scroll in the center viewport, and the right panel shows details for the selected record. It can load a saved challenge, load/export the best plan, export the saved level, import/export leaderboard JSON, delete attempts, and clear local attempts for a map. When you revisit the same challenge, Planning Analysis can show the best prior run, draw its ghost path, rerun it, load it as the active editable plan, or export it. This is local-only: there are no accounts, backend service, or shared online rankings.

### Export / Import Data

Planning exports include replayable `anchor.challenge` files, `anchor.plan` waypoint plans, solver packets for external algorithms, oracle datasets for research/training, structured result files, and local leaderboard JSON. Import `anchor.challenge` from Load Level JSON to replay the same challenge, and import `anchor.plan` from Planning to test a saved or solver-generated route.

For stochastic challenges, public challenge and solver exports use visible forecast/belief data. Challenge files omit plain hidden truth and may include an opaque reload bundle that is not secure against determined users. Oracle dataset exports contain hidden truth and are for training or offline benchmark evaluation, not fair player planning.

Plan import shows a summary with planner name, execution mode, agent count, waypoint count, forecast/truth/oracle flags, surface segment count, and validation status. `openLoop` and `timedOpenLoop` plans load as routes. `surfaceUpdateBundle` is recognized and preserved, but automatic surfacing segment application is scaffolded only. `policy` and `contingencyTable` imports are summarized but not executed.

### Mission Briefing

Mission Briefing appears before every playable scenario: tutorials, deterministic challenges, stochastic challenges, imported JSON levels, saved UUID levels, and editor/custom levels. It explains:

- level name
- challenge mode
- concept
- objective
- deployment or drop-zone rule
- end condition
- sampling mode
- agent count and fuel
- hazards and currents
- stochastic/forecast conditions
- scoring notes

Mission Briefing does not show the mission map. It intentionally hides ROI hotspot locations, current-vector directions, hazard cells, terrain layout, and exact deployment-zone geometry until Planning begins.

Read this screen before planning. `More Details` expands scoring notes and tutorial prompts. `Start Planning` opens the workspace and reveals the tactical planning map; `Back` returns to the Main Menu.

### Planning

Planning is where you create the waypoint plan. It is the main workspace: the left Mission Console shows mission controls, status, layer toggles, route/cost estimate, selected-glider performance, imports/exports, and Execute; the center Phaser Simulator Viewport shows the map, gliders, waypoints, global planning markers, currents, guidance cone, direct map interaction, a top selected-glider planning HUD, and a bottom mission-time slider; the right Waypoint Timeline panel shows agent tabs and only the selected glider's executable waypoint sequence.

For large maps, use camera controls in Planning:

- mouse wheel: zoom
- right or middle drag: pan
- Space + left drag: pan
- `+` / `-`: zoom
- WASD or arrow keys: pan
- `F`: fit map
- `R`: reset camera
- on-screen `Zoom +`, `Zoom -`, `Fit`, and `Reset` buttons: quick camera controls

The camera moves only the map. The Mission Console, Waypoint Timeline, HUDs, modals, and bottom time slider stay fixed.

The Phaser canvas fills the center viewport between the side panels. Scenario Setup, Mission Briefing, and Debrief use responsive center panels that stretch to the available center width, wrap cards as needed, and scroll vertically inside the center region. On narrow or portrait screens, the right waypoint panel hides and the console stacks above the center view so the simulator remains usable.

The left Mission Console is organized as collapsible sections. Click a section header such as `Launch`, `Plan`, `Analysis`, `View Layers`, `Playback`, or `Export` to collapse or expand it. Collapsed sections keep their headers visible, and the browser remembers section state during the current local session.

The simulator map scales inside the canvas between the top selected-glider HUD and the bottom timeline. Grid cells stay square; if the viewport shape does not match the mission grid, the map leaves balanced empty space inside the canvas instead of stretching.

Generated challenge missions may show highlighted deployment/drop-zone cells. If the selected glider has no start yet, the map prompts you to choose a deployment cell and the waypoint panel says `Start: not selected`. In this state, the game hides route guidance, drift cones, reachability, ETA, energy previews, overlapping base/station markers, and real glider/start icons so it does not imply a false start at the corner of the grid. Hover a valid drop-zone cell to preview a temporary ghost start marker, then click it to lock the glider's start. After that, ordinary route waypoint placement begins from the selected start, and the reachability oval centers on that locked start until the first reachable waypoint becomes the next planning anchor. Tutorial missions usually use fixed starts and skip this deployment selection step.

Generated maps are checked for deployment connectivity before play. If terrain would trap the drop zone, the generator repairs the map or retries with a derived seed. In custom/editor maps, Planning and the Environment Editor can warn if deployment water, ROI targets, or required recovery zones are disconnected.

The canvas shows:

- map grid
- terrain or blocked land
- hazard cells
- ROI value field
- current arrows
- base/start marker
- planned waypoint path
- waypoint order labels
- planning marker glyphs
- forecast or truth planning source label

The Mission Console and Waypoint Timeline show:

- selected glider
- selected planning window
- challenge view controls
- grouped `Plan`, `Analysis`, `View`, and `Execute` controls
- solver/export/import controls
- tutorial guidance, when defined by the level
- Main Menu return control
- right-side agent tabs
- waypoint list with select/reorder/delete controls
- global planning-marker icons on the map and bottom timeline
- timeline strip

The top selected-glider planning HUD shows route energy, fuel remaining, waypoint count, expected ROI, current assist/opposition, next surface time, reachability, route validity, and compact warnings for the active glider. The left Mission Console also shows the selected glider's compact performance card so the bottom of the simulator can stay dedicated to mission time and playback controls. Use the right agent tabs or the Mission Console `Next Glider` control to switch gliders.

Planning HUD numbers are estimates. `Projected Cost`, `Estimated Fuel`, `Likely Reach`, `Guidance Cone`, and `Realized Preview` are fast planning aids based on visible currents, speed/time, terrain, and ROI forecasts. The guidance cone is current-aware: with-current routes tend to look longer/narrower and cheaper, against-current routes shorten and warn, and cross-current routes shift/widen sideways. Low forecast confidence or high ensemble disagreement widens the cone because the forecast is less certain. These are not guarantees. Simulation computes the actual path, fuel use, hazard contacts, drift metrics, and stochastic realized outcome. A mismatch between a preview and the Debrief is expected when drift, terrain, hazards, or stochastic fields resolve differently.

Guidance overlays only belong to Planning. When you press `Execute`, the reachability oval, drift cone, hover ETA/energy label, and arrival previews are cleared. Simulation shows the committed plan, actual track, glider state, and mission events; Debrief shows results without planning preview overlays.

Waypoint planning is stepwise. When you place a waypoint, the game estimates when the selected glider would arrive, advances the time slider to that estimated arrival time, and recenters the guidance cone and likely reachable region from that waypoint. Your next click is therefore planned from the newly expected position/time. The guidance cone is a widening origin-to-target corridor, and committed waypoints keep soft arrival uncertainty ovals. If the segment crosses land, the waypoint receives a blocked-route warning and the planning anchor stays at the previous reachable point.

Future planning markers are global notes, not route commands. Click `Mode: Waypoint` in the Mission Console to switch to `Mode: Planning Marker`, scrub the bottom time slider to the future window you care about, then click a map cell. The marker stores `x`, `y`, `t`, `window`, `type`, `label`, and an optional linked target ID when it is near an active Gold Star target. Markers appear as separate glyphs on the map and diamond ticks/icons on the bottom timeline. Click a marker icon to focus its time and estimate. Simulation ignores markers unless a waypoint is placed on top of the marker and absorbs it.

Marker Mode is exploration-first. You can use it before choosing a deployment cell in drop-zone missions. Hovering a cell shows ROI, current, terrain/water, hazard, depth, confidence, and active priority target information for the selected time. Clicking water places a marker at that time. Hazard cells are allowed with a warning; land/terrain is rejected. Marker Mode hides route guidance, drift cones, reachability, ETA, and energy previews because it is not executable route planning.

Marker estimates are planning aids. The game looks from the latest connected waypoint before the marker time, or from the selected start if no waypoint exists yet, then estimates available time, travel time, slack, energy, remaining fuel, route risk, and likely backfill steps. `Reachable` means the estimate has comfortable time and fuel. `Tight` means the marker may be possible but has little slack. `Risky` means hazards, current, cross-current, or forecast uncertainty are concerning. `Impossible` means the estimated route is blocked, late, out of fuel, or lacks a valid start. The game does not build the connecting route for you.

The bottom timeline shows the plan structure above the slider. Numbered yellow circles are executable waypoint arrival estimates, diamond icons are future planning markers, gold stars are priority-target windows, and the final mission-end frame is always marked. Use `Prev` and `Next` to step through timeline frames, including the exact final time even when the mission duration is not a full planning-window multiple. Hover an icon for time, window, coordinate, and estimate details. Click a waypoint icon to select that waypoint. Click a marker icon to focus its target time and estimate. Marker colors indicate whether the route currently looks early, on time, late, or unconnected relative to nearby waypoint arrivals.

The committed route line starts at the fixed start, selected deployment cell, or surfaced replanning position. It then connects to waypoint 1 and continues through the rest of the waypoint list. If no deployment cell has been chosen, the game does not draw a fake route from the corner of the map.

The deployment start is separate from the waypoint list. It is not counted as waypoint 1 and does not sample ROI. In drop-zone missions, use the `Change` control in the waypoint panel or click another valid drop-zone cell before execution to move the start.

If the next waypoint would exceed mission time, exceed estimated fuel, or cross blocked terrain, the game blocks the placement and shows a warning. You can repair the plan by deleting waypoints, moving them closer, reordering them, or clearing the selected glider's route.

When you press `Execute`, the game checks that every required deployment start is selected, every fixed start is valid, mission time settings are usable, waypoint coordinates are finite and inside water cells, route segments do not cross terrain, and the estimated route stays within mission time and fuel. If something is invalid, Planning stays open, the visible Execute control is blocked, and the affected waypoint/segment is highlighted before simulation starts.

### Simulation

Simulation executes the current plan. The glider tries to follow the waypoint list under currents, terrain, hazards, battery limits, and sampling rules. The bottom timeline advances during playback, and the visible map frame follows the simulated mission time.

You can:

- `Play`
- `Pause`
- `Step`
- `Reset Simulation`
- `Finish Instantly`
- return to Planning
- go to Debrief

For quick testing, use `Finish Instantly`.

In surface-only missions, the simulation pauses when the glider surfaces. The pause dialog shows expected and actual position. Choose `Continue Mission` to keep the plan, `Update Waypoints` to return to Planning from the surfaced position, or `Finish Simulation` to run through the remaining mission.

The surface dialog and route-failure recovery dialog also support external solver updates. Use `Export Observation Data`, run your solver, then use `Import Waypoint Data` with an `anchor.plan`, `anchor.plan-segment`, or compatible waypoint list. Valid imports replace only future waypoints for the surfaced or failed agent; completed past waypoints are preserved.

If a surface dialog ever fails to appear, use the keyboard fallback: `C` continues, `U` updates waypoints from the surfaced position, and `F` finishes the mission and opens Debrief.

If a route fails during playback, the game opens a `Route Failure` prompt. It shows the failed waypoint, reason, last successful waypoint, current glider position/time, and a suggested fix. Choose `Replan` to return to Planning from the current actual position, `Skip WP` to mark the failed waypoint missed and try the next waypoint, `Continue` to resume without editing when safe, `Debrief` to end the mission, or `Main Menu` to leave the run. The Simulation Console shows the same recovery controls as a fallback.

### Debrief

Debrief keeps the mission shell visible. The left Mission Console contains Debrief actions and exports, the center shows a responsive HTML/CSS results view, and the right Waypoint Timeline remains visible as the plan artifact with final waypoint status when available. It separates planning estimates from actual simulation results. It shows the outcome:

- final score
- sample score
- energy used
- hazards hit
- duplicate samples
- depleted or cooldown-suppressed samples, when a mission uses those rules
- recovery/surface success, bonus, or penalty, when a mission requires it
- completed waypoints
- missed waypoints
- elapsed time
- objectives
- rating
- score components

Labels such as `Actual Final`, `Actual ROI`, and `Actual Energy` come from the completed simulation. `Planned EV` is the expected value implied by the plan and visible/forecast fields. `Stochastic Realized` is the ROI outcome resolved during simulation for the active seed.
- event summary
- forecast regret when available
- manual-vs-temporal-greedy comparison when available
- manual-vs-solver comparison when available

Use Debrief to decide what to improve, then click `Revise Plan` or `Retry From Briefing`. Tutorial missions also offer `Next Tutorial`; generated challenges offer `New Challenge`; editor/custom missions offer `Return To Editor`. Export, rerun, Temporal Greedy, comparison, and main-menu controls are in-game buttons; downloads still use the browser download bridge behind those buttons.

If the simulator detects an invalid or unreachable plan, it stops with a warning and recovery choices instead of freezing. Move or delete the problem waypoint, replan from the current actual position, or end to Debrief. Exported results include the stop reason and recovery decision for debugging.

During Simulation, Start, Prev, Next, End, Play/Pause, Step, and Finish live in the bottom timeline panel instead of inside the map viewport. The Phaser map stays focused on terrain, currents, hazards, planned path, actual path, and glider playback.

## Tutorial Sequence

### Tutorial 01: First Deployment

Concept: choose a valid start, place a waypoint, and execute.

What to learn:

- highlighted deployment cells are legal launch choices
- a selected start is not a sample waypoint
- clicking a water cell adds a waypoint for the selected glider
- Execute runs the simulation from the route you built

Try:

1. Click one highlighted deployment cell.
2. Place one waypoint in nearby sample water.
3. Execute and read the debrief.

### Tutorial 02: Ride the Current

Concept: currents affect actual path.

What to learn:

- current arrows show water movement
- a glider may drift away from a direct commanded path
- using the current can reduce effort
- the ROI hotspot is easy to reach if you account for drift

Try:

1. Place a waypoint downstream from the base.
2. Place another waypoint near the bright ROI hotspot.
3. Simulate and compare planned path vs actual path.

### Tutorial 03: Energy And Travel Cost

Concept: shorter paths are not always better if currents fight the glider.

What to learn:

- direct routes can cost more energy when current opposes motion
- a slightly longer route can be better if it rides a helpful current lane
- score can improve when energy use drops
- Travel Cost mode gives an approximate route-cost field from the planning anchor

Try:

1. Cycle ROI Mode to `Travel Cost`.
2. Avoid forcing the glider straight through opposing current.
3. Use the lower assisted lane.
4. Turn back toward the ROI hotspot.

### Tutorial 04: Time Slider And Temporal Fields

Concept: mission fields change over time.

What to learn:

- the bottom slider scrubs mission time
- ROI and current fields can change by planning window
- new waypoints inherit the active planning window

Try:

1. Move the bottom time slider.
2. Watch ROI/current conditions change.
3. Place waypoints in more than one planning window.

### Tutorial 05: Priority Gold Stars

Concept: some targets are time-limited and high value.

What to learn:

- Gold Star targets can reward timing, not just distance
- a high-value star may not be worth the energy if it is too far away
- the time slider helps find the useful window

Try:

1. Scrub time until a priority target is relevant.
2. Decide whether the route cost is worth the reward.
3. Execute and compare score against energy used.

### Tutorial 06: Planning Markers / Explorer Mode

Concept: mark ideas before committing executable waypoints.

What to learn:

- planning markers are notes, not glider commands
- marker mode is useful for comparing future target candidates
- waypoint mode builds the actual route

Try:

1. Switch to Marker Mode.
2. Mark two possible future targets.
3. Switch back to Waypoint Mode and choose the better route.

### Tutorial 07: Remaining Value And Duplicate Sampling

Concept: repeated samples may be worth less than first observations.

What to learn:

- Remaining mode estimates value still available after planned coverage
- duplicate sampling can waste time and energy
- later waypoints should often move to unclaimed value

Try:

1. Place a waypoint on a high-value cell.
2. Switch ROI Mode to `Remaining`.
3. Send later waypoints toward remaining bright areas.

### Tutorial 08: Hazards And Blocked Routes

Concept: route around hazards.

What to learn:

- hazards add score penalties
- current drift can push a glider into hazards
- safe routes may be longer but score better

Try:

1. Identify the hazard wall between base and ROI.
2. Place waypoints around the hazard wall.
3. Keep enough margin from hazard cells.

### Tutorial 09: Surfacing And Replanning

Concept: gliders can surface, report actual position, and accept updated waypoints.

What to learn:

- surface windows are marked on the timeline
- simulation can pause when a glider surfaces
- replanning continues from the actual surfaced position

Try:

1. Plan a short first leg.
2. Execute until the surface prompt appears.
3. Choose `Update Waypoints` and revise from the actual position.

### Tutorial 10: Multi-Agent Coordination

Concept: divide mission work across multiple gliders.

What to learn:

- each glider has its own waypoint list
- the active glider receives new map clicks
- Remaining mode helps avoid duplicate coverage

Try:

1. Select each glider tab.
2. Send each glider toward a different region.
3. Use Remaining mode to reduce overlap.

### Tutorial 11: Stochastic Forecast

Concept: forecast planning is useful but not exact.

What to learn:

- Probability and Expected ROI modes describe forecast likelihood
- simulation scores against hidden truth
- robust routes can beat brittle routes aimed at one forecast peak

Try:

1. Compare `Probability` and `Expected` ROI modes.
2. Avoid relying on one uncertain cell.
3. Simulate and review actual outcome.

### Tutorial 12: Forecast Horizon Decay

Concept: long-horizon forecasts become less reliable.

What to learn:

- confidence is lower farther into the mission
- surfaced updates can reduce commitment to stale forecasts
- later waypoints should leave room for adjustment

Try:

1. Move the time slider to a later window.
2. Inspect forecast confidence.
3. Plan to re-check after surfacing.

### Tutorial 13: Full Mission Challenge

Concept: combine the complete planning loop.

What to learn:

- deployment, currents, energy, hazards, markers, surfacing, and forecast uncertainty interact
- no single overlay tells the full story
- debrief is part of the planning loop

Try:

1. Choose deployment carefully.
2. Use ROI modes and markers before committing waypoints.
3. Execute once, read debrief, revise, and improve.

### Tutorial 14: Import / Export Workflow

Concept: load a route from a JSON waypoint plan.

What to learn:

- an external file can create route waypoints automatically
- imported plans use the same map, timeline, waypoint panel, and validation audit as manual routes
- demo plans, external solver plans, and manual exports share the `anchor.plan` format

Try:

1. Click `Load Built-In Demo Plan` in the `Import Demo` section.
2. Inspect the route lines, right waypoint panel, and timeline arrivals.
3. Clear the imported route, then use `Download Demo Plan JSON` and `Import Waypoint Data` to practice manual upload.
4. Execute the imported route and read the imported-plan note in Debrief.

Several tutorial lessons reuse the same handcrafted spatial scenario while exposing different controls, goals, and success criteria. That keeps the early maps familiar while the required planning idea changes.

## Planning Controls In Detail

### Select A Glider

Use the `Glider` HUD button or click a glider marker on the map to choose which agent receives new waypoints. Most tutorials use one glider, but imported or generated missions may include more.

### Select A Planning Window

Use the bottom Phaser time slider, the Start/Prev/Next/End buttons, or the timeline window markers. New waypoints receive an estimated arrival time and planning window based on the previous planning anchor, then the slider advances to that estimate.

The waypoint list execution order is what the simulator follows. The window and time values help you organize when each decision belongs in the mission.

### ROI Mode And Heatmap Meaning

The `ROI Mode` button in Analysis changes what the heatmap represents:

- `ROI Mode: Value`: raw sample value.
- `ROI Mode: Probability`: likelihood that the opportunity exists. In deterministic missions this is normally 1.0 for available ROI cells.
- `ROI Mode: Expected`: value times probability.
- `ROI Mode: Remaining`: raw value still available after current planned fleet route coverage is considered.
- `ROI Mode: Risk / Safety`: one navigability spectrum. High values mark dangerous cells from hazards, shallow water, shoreline-current risk, nearby mobile hazards, or low confidence; low-risk areas are safer.
- `ROI Mode: Travel Cost`: estimated route cost from the current selected glider planning anchor.

Remaining mode is useful in multi-glider missions. If Glider 01 already has a route segment or sample waypoint crossing valuable cells, those cells are dimmed/marked in Remaining mode when planning Glider 02. This is a planning preview only; the simulator still applies the mission's actual sampling rules during execution.

Travel Cost mode needs a real route anchor. In drop-zone missions, choose a deployment cell first. After waypoints are placed, the cost field follows the latest connected planning anchor for the selected glider. The hover tooltip reports estimated cost, energy, ETA, and whether the target is reachable.

### Planning Guidance Overlays

With a glider selected, the map can show approximate guidance: likely reachable cells, a guidance cone, a terrain-aware preview path, a predicted surfacing marker, and hover cost estimates. Use the `View` menu to toggle guidance, ROI heatmap, current vectors, hazards, terrain, guidance cone, approximate reach, cost preview layers, and the best prior path overlay when a saved benchmark exists.

If a hover or target route crosses land, the preview clips before the terrain breach and the route summary reports that the route is blocked. Energy preview estimates distance, current assist/opposition, and shallow/depth penalty when available; it is a teaching estimate, not an optimal-control calculation.

Gold Star Targets are time-limited priority samples. They are drawn as gold star icons, not as brighter ROI cells, and generated challenges may have no active star at mission start or in some later windows. Scrub the time slider to discover when a star appears and whether it moves. If a star is active at the current timeline time, it can be captured during simulation by passing within its radius. Capturing a star adds its bonus score once; repeated captures are logged as duplicates and do not add score unless a mission explicitly allows sharing.

### Add Waypoints By Clicking

Click a water cell on the canvas. A waypoint is added for the selected glider using action `sample`.

Blocked terrain cannot receive waypoints. Hazard cells are allowed but show a warning because they are risky.

### Select, Move, And Delete On The Map

Use the map directly:

- click an empty water cell to add a waypoint
- click an existing waypoint to select it
- drag the selected waypoint to move it
- click the selected waypoint again to delete it
- click a glider start marker to select that glider

Selected waypoints get a bright ring. The selected glider route is emphasized, while inactive routes are dimmed.

If simulation stops because a route is blocked or waypoints cascade into misses, the Route Failure prompt and Simulation Console explain the stop reason, the last successful waypoint, the first failed waypoint, and a suggested fix. The waypoint timeline labels missed steps with reasons such as `ROUTE BLOCKED`, `UNREACHABLE`, `TIME EXCEEDED`, or `FUEL EXCEEDED`.

### Edit Waypoints

Use direct map interaction for coordinate edits: drag a waypoint marker to a new valid water cell. The waypoint drawer updates immediately.

### Reorder Waypoints

Use `Up` and `Down` buttons in the waypoint list.

Reordering changes execution order. The map number labels update immediately, exported plans preserve the order, and simulation follows the new order.

When you move, delete, or reorder a waypoint, the game recomputes estimated arrival times, windows, segment energy, cumulative energy, and remaining fuel estimates for that glider's downstream waypoints.

### Drag Waypoints

Drag an existing waypoint marker on the canvas to move it to a new cell.

Invalid drag targets:

- outside grid: ignored
- blocked terrain: warning and rejected
- hazard cell: warning but allowed

Drag support is intentionally simple. It moves waypoint coordinates; it does not perform pathfinding.

### Delete Waypoints

Click `Remove` on a waypoint row.

### Clear Plans

Use:

- `Clear Selected Glider Plan`
- `Clear All Waypoints`

### Export Plans

Use `Export Plan JSON` to download the current `anchor.plan`.

Use `Export Manual Plan JSON` when comparing manual and solver plans.

### Import Plans

Use `Import Plan JSON` and select an `anchor.plan` file.

In `Tutorial 14: Import / Export Workflow`, the `Import Demo` section can load `tutorials/import-demo/import-demo-waypoints.json` directly with `Load Built-In Demo Plan`. It can also download that same file so you can re-import it manually with `Import Waypoint Data`.

The game checks:

- plan JSON parses
- `type` is `anchor.plan`
- agent IDs are valid or reported as warnings
- waypoint coordinates are numeric
- actions are valid
- route validity audit passes before simulation

Imported solver plans with `meta.solver` are labeled as solver plans.

## Challenge View Controls

### Perfect Knowledge

Planning shows truth fields. This is the default for Tutorials 01-04.

### Forecast / Uncertain

Planning shows forecast fields. Simulation still uses truth fields. This is the default for Tutorial 05.

### Show Confidence Overlay

In forecast mode, this overlays lower-confidence areas. Lower confidence means the forecast may be less reliable.

### Reveal Hidden Truth

This debug option shows truth during forecast mode. Use it for debugging or teaching demonstrations, not normal challenge play.

## Map Legend

Common visual cues:

- dark/blue cells: lower ROI
- warmer/brighter cells: higher ROI
- white arrows: currents
- red cells: hazards
- cyan circle/marker: base or start
- yellow markers/path: planned waypoints
- white path during simulation: actual glider path
- green highlight: active or sampled cells

The exact colors are stylized for gameplay and teaching.

## Waypoint Actions

Valid actions:

- `sample`
- `transit`
- `return`
- `hold`

The current simulator primarily uses waypoints as movement targets. `sample` is the usual action for collecting ROI value.

## Scoring

Final score combines rewards and penalties.

Rewards:

- collecting high-value ROI samples
- capturing active Gold Star priority targets

Penalties:

- energy use
- hazards hit
- elapsed time
- missed waypoints
- duplicate sampling, depending on scoring details
- update penalties, when applicable
- recovery or pickup failure, when a mission requires it

The exact weights come from mission JSON and level campaign metadata.

Mission styles can differ:

- Sampling-only missions end normally when the plan completes or mission time expires.
- Surface/transmit missions may reward or require surfacing or reaching a communication zone.
- Recovery/pickup missions may reward or require ending near a recovery zone.

Sampling rules can also differ:

- `unique`: the first observation gives full value; duplicates usually give little or no value.
- `diminishing`: sampled hotspots remain visible but nearby value is reduced.
- `cooldown`: a hotspot loses value temporarily and recovers after a configured number of planning windows.
- `persistent`: monitoring-style hotspots can remain valuable once per planning window.

ROI color is cell-based. Treat each colored square as its own sampleable target; color does not bleed into neighboring cells. During simulation, sampled or depleted cells can be dimmed or marked so repeated visits are easier to interpret.

In the tutorial mission:

- sample value is heavily rewarded
- energy is penalized lightly
- hazards are penalized
- elapsed time is penalized lightly

In stochastic missions, ROI scoring can use either `expectedValue` or `realizedStochastic`.

- `expectedValue`: probabilistic ROI awards `value * probability`.
- `realizedStochastic`: each probabilistic ROI cell is deterministically sampled by seed. If it manifests, the sample awards reward value; if not, it awards zero.

Debrief and result export show expected value, realized value, probability successes, probability misses, stochastic seed, mobile-hazard exposure, depth exposure, and approximate ensemble regret when available.

### Rerun A Stochastic Plan

In Stochastic Challenge mode, use the Mission Workspace stochastic panel:

- `Seed`: step the deterministic stochastic seed up or down.
- `Random`: choose a new seed.
- `Copy`: copy or display the active seed.
- `Expected` / `Realized`: switch ROI scoring mode.
- `Forecast`: cycle forecast members when an ensemble is available.
- `Rerun Same Plan`: run the exact current waypoint plan with the same seed.
- `Rerun New Seed`: run the exact current waypoint plan with a new seed.

Same-seed reruns reproduce the same probabilistic ROI outcomes. If a mission enables optional seeded stochastic drift, the same drift seed also repeats the current perturbation pattern used during simulation; a new seed can change the actual drift trace. Debrief shows a seed comparison table for the current plan so you can see whether the plan is stable or seed-sensitive.

## Ratings

Debrief converts final score into:

- Bronze
- Silver
- Gold
- Perfect, when defined

Ratings are level-specific. A plan that works well in one tutorial may not earn the same rating in another.

## Objectives

Objectives are shown in Mission Briefing and Debrief. Examples:

- collect valuable samples
- avoid hazards
- reach target score
- stay under an energy budget

Debrief shows whether each objective was completed.

The Gold Star section reports captured targets, missed opportunities, star score, duplicate attempts, and which glider captured each target.

## Forecast Regret

Forecast regret appears after completing a forecast-mode simulation when a reference baseline is available.

It compares your score against lightweight truth-reference signals when available. These are teaching signals, not proofs of optimality.

Use it to ask:

- Did my forecast-based plan lose score because truth differed?
- Was my plan too brittle?
- Would a more robust route work better?

## Solver Workflow

The game can connect manual play to external algorithms.

### Export A Solver Packet

In Planning:

1. Click `Export Solver Packet JSON`.
2. Save the downloaded file.

The packet contains the level, mission, visible planning fields, challenge mode, and expected plan format.

In forecast mode, hidden truth is excluded unless you check `Include hidden truth in solver packet`.

### Run The Python Example Solver

From the project root:

```bash
python tools/python/example_greedy_solver.py anchor_solver_packet.json anchor_solver_plan.json
```

Optional strategy:

```bash
python tools/python/example_greedy_solver.py anchor_solver_packet.json anchor_solver_plan.json value_per_distance
python tools/python/example_greedy_solver.py anchor_solver_packet.json anchor_solver_plan.json greedy_roi
python tools/python/example_greedy_solver.py anchor_solver_packet.json anchor_solver_plan.json nearest_roi
```

The Python example:

- uses only the Python standard library
- reads visible ROI/current planning data
- avoids blocked terrain and hazard targets at a basic level
- uses expected value for probabilistic ROI and penalizes simple mobile-hazard/depth risk
- writes valid `anchor.plan`
- supports one or more mission agents
- is not optimal

### Import The Solver Plan

Back in Planning:

1. Click `Import Plan JSON`.
2. Select `anchor_solver_plan.json`.
3. Simulate the imported plan.
4. Open Debrief.

If you already ran a manual plan in the same session, Debrief can compare manual and imported solver results. It reports expected value, realized value, final score, energy, hazards, mobile hazards, depth exposure, risk exposure, forecast regret, and completed/missed waypoints when those metrics are available. Missing metrics show `N/A`.

## Environment Editor

Open `Environment Editor` from the Main Menu.

You can configure:

- Phaser-native tool groups for Terrain, Water/Depth, Currents, Hazards, ROI, Deploy, Agents, Time, and Import/Export
- Validate Connectivity and Repair Connectivity controls for checking whether drop zones connect to navigable water and scoring ROI
- width and height
- seed
- difficulty
- duration, `dt`, planning window, and selected frame
- current pattern
- current strength
- synthetic fluid preset, viscosity, iterations, and vorticity
- current editing tool, Phaser-native brush radius/intensity steppers, synchronized DOM brush controls, and frame scope
- current preview with a frame scrubber, weak/moderate/strong legend, speed stats, and gameplay notes
- ROI pattern
- ROI hotspots
- hazard density
- land density
- forecast mode
- challenge mode
- number of agents
- battery/fuel and max speed

Click `Generate Level` to preview a new level.

Click `Use This Level` to play it.

Click `Export Level JSON` to save it.

Click `Import Level JSON` to load an existing `anchor.level` into the editor, preserve its UUID/instance ID, modify it, and export it again.

### Editing With Brushes

Brushes:

- `terrain`: adds blocked land
- `hazard`: adds hazard cells
- `depth`: paints deeper water
- `shallow`: paints shallow water
- `clear`: clears terrain/hazard
- `roi`: boosts ROI value
- `base`: moves the deployment/base marker
- `agentStart`: moves a glider start
- `current`: edits the U/V current field

Click cells on the canvas to apply the selected brush. Base cells are protected from terrain/hazard edits. Use the Phaser-native `Radius` and `Intensity` steppers in the editor HUD to tune the active brush without leaving the map. Radius affects terrain, hazard, depth, shallow, clear, ROI, and current edits. Intensity controls ROI boost and current/vector strength.

For the `current` brush, drag from one cell to another to inject direction and intensity. Current tools include directional flow, vortex/eddy, current corridor, and calm/clear. Edits can apply to the selected frame or all frames. The fields are synthetic ocean-inspired teaching fields, not real ocean-model output.

While dragging a current brush, the editor shows a preview arrow, affected brush radius, approximate magnitude, and whether the edit applies to the current frame or all frames. Release to apply. Press Escape or right click to cancel without changing the field.

Use `Preview Preset` to inspect the selected synthetic current preset before changing the level. The preview shows direction arrows, a frame/time label, mean and max speed, strong-current cell percent, near-calm cell percent, and a label such as `Calm`, `Gentle`, `Moderate`, `Strong`, or `Chaotic`.

Use the preview scrubber, `Prev`, `Next`, `Play`, and `Reset` controls to inspect dynamic current presets over mission time. The preview animates the generated frames at a low rate and does not regenerate while playing. Use `Apply To Level` when the full sequence looks useful for gameplay; it applies every generated current frame, not just the frame currently visible in the preview.

### Load Level JSON

Open `Load Level JSON` from the Main Menu.

1. Click `Choose Level JSON`.
2. Choose an exported `anchor.level` JSON file from the hidden browser file picker.
3. Review the in-game summary: name, level ID, instance ID, grid, duration, challenge mode, truth/forecast data, and mission defaults.
4. Choose `Play Deterministic`, `Play Stochastic`, or `Open Editor`.

If the imported level does not include mission defaults, the game creates a simple default sampling mission from the level base and grid metadata.

## Dataset Export

Open `Dataset Export` from the Main Menu.

Use this screen to generate small batches of synthetic levels and solver packets.

Controls:

- number of levels
- seed start
- width and height
- difficulty
- current strength
- hazard density
- ROI hotspots
- challenge mode
- forecast noise
- hidden truth inclusion

Exports:

- `anchor_level_dataset.json`
- `anchor_solver_packet_dataset.json`
- `anchor_training_examples.jsonl`

This is useful for classroom assignments, solver benchmarking, or offline ML experiments.

## Recommended First Playthrough

1. Start Tutorial 01.
2. Read the briefing concept.
3. In Planning, open `Briefing and guidance` if you want the level hints.
4. Place two waypoints: one with the current, one near the ROI hotspot.
5. Simulate.
6. Go to Debrief.
7. Revise the plan if hazards, missed waypoints, or energy are poor.
8. Continue to Tutorial 02.

## Tips

- Do not place every waypoint directly on the brightest ROI cell; currents may move the glider.
- Leave margin around hazards.
- Use intermediate waypoints for long routes.
- Reorder waypoints when the map labels show a route that does not make sense.
- In forecast mode, use confidence as a warning sign.
- Export plans before trying a risky revision.
- Use Temporal Greedy as a quick browser-native comparison route; Debrief reports why it stopped if it ends before mission time runs out.
- Compare a manual plan with an imported solver plan.

## Common Problems

### I clicked the map but no waypoint appeared.

Make sure you clicked inside the grid and on a water cell. Terrain cells reject waypoints.

### My waypoint went into a hazard.

Hazard waypoints are allowed but risky. The game warns you because simulation may penalize the plan.

### Simulation missed a waypoint.

The glider may have drifted, hit blocked movement, or run out of battery. Use closer intermediate waypoints and account for current.

### My forecast plan scored poorly.

The forecast may not match truth. Pick targets and paths that remain useful if the forecast is wrong.

### My imported plan did not work.

Check that:

- `type` is `anchor.plan`
- `levelId` and `missionId` match or are intentionally different
- `agentId` matches the active mission
- waypoints have numeric `x`, `y`, and `window`
- actions are valid
- waypoint cells are not blocked

## Classroom Workflow

Suggested lesson flow:

1. Students play Tutorial 01 manually.
2. Discuss currents and actual vs planned path.
3. Students improve their manual plans.
4. Export a solver packet.
5. Inspect the packet JSON.
6. Run or edit the Python example solver.
7. Import solver plans.
8. Compare manual vs solver debriefs.
9. Move to forecast uncertainty.
10. Generate a small dataset for extra experiments.

## What The Game Is Not

The game is educational and simplified.

It is not:

- a full ocean model
- a full vehicle dynamics model
- a real glider command system
- a Navier-Stokes solver
- a HYCOM ingest tool
- an optimal planner
- an ML training platform inside the browser

It is a teaching bridge from interactive planning to computational autonomy.
