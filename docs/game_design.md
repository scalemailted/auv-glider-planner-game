# Game Design

Version 2 is a mission-planning puzzle game. The player plans glider waypoint tours over a time horizon, then simulates the plan under currents, hazards, terrain, and energy limits.

## Challenge Mode vs Simulation Lab

ANCHOR has two user-facing experiences built on the same mission engine.

Challenge Mode is the playable planning-puzzle experience. It emphasizes score, stars, medals, route quality, risk warnings, leaderboard comparison, and learning strategy through play.

Simulation Lab is the reproducible experiment sandbox. It emphasizes exact configuration, deterministic/stochastic setup, dynamic current-field metadata, solver packets, replay seeds, external solver workflows, JSON import/export, and auditability.

Both modes use the same terrain, current fields, hazards, glider physics, scoring core, route validation, planner APIs, and replay/export system. `experienceMode` controls UI framing and metadata, not mission mechanics.

Challenge Mode starts from a mission-mode navigator instead of a full technical form. The left Mission Console lists curated objectives, and the center viewport shows the focused briefing for the selected mission before generating the map. Survey Sweep, Signal Hunt, Surface & Adapt, Fleet Split, Uncertain Waters, Forecast Chase, Plume Intercept, Watch Stations, Danger Run, and Long Glide map player-facing objectives to shared sample-field, current-field, scoring, route-grade, mission-rule, replay, and export presets. Simulation Lab exposes the underlying knobs directly for experiments.

## Concept Boundaries

ANCHOR keeps four educational field concepts distinct:

| Field | Meaning | Answers | Primary homes |
|---|---|---|---|
| `F(x,y,t)` | Flow/current vector `<u,v>` at position and time | How does water move, and how does it push the glider? | Flow Fields Demo, Coupled Fields Demo, mission simulation, route cost |
| `L(x,y,t)` | Event likelihood: where sample-value events tend to originate | Where should clusters, bursts, targets, or future opportunities tend to form? | Sample / ROI Field Demo, sample-field generation, mission objective generation |
| `S(x,y,t)` | Realized sample value, reward, or objective value | Where and when is it valuable to sample? | Sample / ROI Field Demo, scoring, route grading, Greedy Planner reward, Challenge objectives |
| `U(x,y,t)` | Uncertainty, lack of confidence, or expected information gain | Where do we not know enough, and where would sampling teach us most? | Uncertainty / Forecast Demo, forecast/truth workflows, stochastic challenges |

Likelihood is not uncertainty. Event likelihood describes where events tend to occur; uncertainty describes what the planner does not know. Only uncertainty about a likelihood model belongs in the Uncertainty / Forecast Demo. The event likelihood field itself belongs in the Sample / ROI Demo as the generative substrate for sample-value events.

Flow-value interactions belong in Coupled Fields Demo. The pure Sample / ROI Demo shows abstract value-field construction without water-motion coupling; the Coupled Fields Demo shows current-advected plumes, flow-stretched fronts, eddy-carried blooms, shoreline/runoff transport, channel transport, and terrain-constrained flow-value interactions.

## Mission Modes

Mission Modes are Challenge Mode objective presets, not separate simulation engines. A Mission Mode chooses player-facing goals and default technical settings for sample-field behavior, current-field behavior, sampling rules, scoring weights, route-grade weights, mission rules, replay metadata, and export metadata.

The purpose is to turn research concepts such as coverage planning, informative path planning, event interception, adaptive sampling, fleet splitting, uncertain navigation, and energy-aware routing into playable challenge goals. Simulation Lab keeps the same fields visible as individual controls for experiment design and solver testing.

The Challenge Mode UI intentionally separates mission selection from technical setup. The left Mission Console is the mission-mode navigator with compact mission names, concepts, and selected state. The center viewport shows only the selected mission briefing: objective, strategy, recommended lenses, setup summary, environment summary, knowledge mode, and `Generate Mission`. Challenge Setup does not duplicate the full mission list in the center and does not show waypoint-planning UI before a mission is generated.

## Dynamic Sample Fields

The sample field describes where and when science value exists. Generated missions can preserve `sampleFieldConfig` metadata for spatial patterns, temporal behavior, stochasticity, current coupling, depletion, and objective-model settings while still exporting ordinary temporal ROI frames for playback, scoring, solver packets, and datasets.

Implemented generated behaviors include static value, hotspot-style value, burst/periodic temporal value, moving value, current-coupled value, neighbor-coupled value, gradients, bands, fronts, clustered fields, sparse targets, monitoring stations, and seeded texture-like fields where configured. Mission Modes choose sensible presets; Simulation Lab exposes the underlying controls.

The pure Sample / ROI Field Demo intentionally presents sample-value behavior rather than physical formation mechanisms. Event Likelihood / Spawn Distribution is the primitive substrate for event origins, sparse candidate sites, jump destinations, random-walk bias, and propagation likelihood. Its spatial taxonomy is Constant Field, Gradient / Trend, Clustered Field, Patchy / Correlated Field, Sparse Targets, Linear Band, Front / Boundary, Boundary Band, Monitoring Stations, and Seeded Texture. Value Distribution is separate and controls assigned values, including Constant Value, Uniform Random, and Gaussian / Normal. Constant Field is a no-geometry spatial pattern, not the event substrate; Uniform Likelihood is the neutral event substrate. Cluster count is a parameter of Clustered Field, so single-cluster, bimodal, and multi-cluster cases are not separate top-level theories. Bimodal value distributions are different from two spatial clusters. Flow-specific sample behavior such as current-advected plumes, shoreline runoff, and flow-stretched value belongs in the Coupled Fields Demo.

Behavior Presets in the pure Sample / ROI Demo are curated compositions over those primitives, not separate engines. Presets such as Recurring Hotspots, Migrating Patch, Expanding Front, Patchy Rainfall, Drifting Storm Cells, Freshness / Revisit Value, Neighbor Spread, Oscillating Ecological Field, Forest Fire Front (inspired), and Life-Like Cellular Emergence (inspired) fill in Event Likelihood / Spawn Distribution, Spatial Pattern / Geometry, Value Distribution, Temporal Pattern, Spatial Evolution, State Model / Memory, Sampling Effect, and relevant parameters. Users can then adjust primitives; the UI marks the selected preset as modified. Inspired presets are simplified educational examples and are not validated physical or ecological process models.

The Sample / ROI Demo also has behavior explainers for every observable-pattern component: Behavior Preset, Event Likelihood / Spawn Distribution, Spatial Pattern / Geometry, Value Distribution, Temporal Pattern, Spatial Evolution, State Model / Memory, Sampling Effect, and Display Layer. The Display Layer can show `S(x,y,t)`, show the generative likelihood substrate `L(x,y,t)`, or overlay high-likelihood regions on the sample-value heatmap. The left Mission Console stays compact with controls and Explain buttons. Clicking Explain switches the right panel from Cell Inspector to Behavior Help, where the selected component shows meaning, expected heatmap behavior, parameters, pairings, strategy implications, demo boundaries, and a Current Composition summary. Clicking a heatmap cell switches the right panel back to Cell Inspector.

Spatial Evolution uses Motion Scope to avoid treating every dynamic field as a global image transform. `Per Feature` is the default: clusters, bands, target groups, and patch regions get independent seeded motion paths. `Local / Neighborhood` is used for dense local spread or texture-like evolution. `Global` preserves whole-field shifting only as an explicit advanced/demo option.

## Sampling Objectives

Sampling objectives combine the sample field with temporal Gold Star / priority targets and mission sampling rules. ROI cells represent gridded science value. Gold Star targets are separate timed objectives that can appear, move, and disappear. Sampling rules such as unique, diminishing, cooldown, and persistent determine whether repeated visits keep value, deplete value, or recover across windows.

## Phaser Game Shell

The active browser shell is a Mission Console + Phaser Simulator Viewport + Waypoint Timeline. Phaser 3 owns scene lifecycle, map rendering, sprites, visual waypoint stacks, drift/current/route overlays, pointer interaction, transitions, and simulation playback visuals. HTML/CSS owns the left mission-control console for main menu, scene-aware controls, form controls, import/export panels, and debrief/editor-style data surfaces. HTML/CSS also owns the right waypoint timeline for agent tabs, waypoint status, waypoint selection, deletion, reordering, and list actions, plus compact center-viewport overlays for selected-glider planning feedback and mission/agent performance. The scientific/data core remains framework-independent: schemas, truth/forecast fields, physics, sampling, scoring, solver packets, datasets, and UUID identity stay in `src/core`.

The Phaser Main Menu scene is not a button menu. It renders an idle simulator viewport with sonar/water styling and an "Awaiting Mission Launch" prompt. The actual main menu options live only in `#mission-console`. Generated Challenge Mode routes to a pre-mission selection screen where the left console lists mission modes, the center shows the selected briefing, and the right panel shows a compact Mission Snapshot instead of waypoint UI. Simulation Lab starts route to the technical Scenario Setup screen where the user can tune agents, map size, duration, surfacing interval, fuel, speed, difficulty, current/hazard/terrain/ROI/star settings, and stochastic ensemble count before generation. Tutorial and loaded JSON levels still route through the read-only mission dossier briefing. In planning, Phaser renders the dominant mission map while the Mission Console renders `Plan`, `Analysis`, `View`, and `Execute` controls, route/cost estimate, selected-glider performance, and status. The top center HUD is a compact, single-line mission strip for active glider, phase/mode, time/window, waypoint count, fuel, score/EV, and alert count; detailed route cost, deployment names, warnings, and estimates live in the console, waypoint panel, bottom timeline, tooltips, and debrief. The bottom center DOM panel is reserved for temporal controls in both Planning and Simulation: Planning shows the mission-time scrubber and route icons, while Simulation shows the playback playhead and compact Start/Prev/Next/End/Play/Step/Finish controls. Phaser does not render timeline tracks or playback buttons over the map. The right `#waypoint-timeline` renders a quiet idle placeholder until a mission is loaded, then shows tabs for each glider and only the selected glider's executable waypoint sequence. Global non-executable planning markers live on the map and bottom timeline. Load Level JSON uses console buttons for import/play/edit and the Phaser viewport for level preview. Debrief takes over the full viewport with Phaser-native result cards and actions while hiding the map, console, and waypoint timeline.

Planning HUD and guidance overlays deliberately use estimate language. Projected route cost, estimated fuel, likely reachability, guidance cones, and realized previews are fast planning aids derived from visible fields and simplified current/speed/time assumptions. Simulation remains authoritative for actual fuel, trajectory, hazards, and stochastic ROI realization. Debrief labels actual simulation results separately from planned expected value so estimate/result differences read as uncertainty and model error, not as implementation bugs.

Planning guidance overlays have an explicit lifecycle gate. Reachability ellipses, drift cones, hover ETA/energy labels, arrival previews, and predicted-surface markers render only in active planning mode with a selected glider, valid planning anchor, guidance enabled, and no simulation engine/debrief/surface-decision playback owning the view. Drift cones use current-aware planning estimates: along-track assist/opposition changes projected length and energy, cross-current shifts and widens the expected arrival oval, and forecast confidence or ensemble current disagreement widens the uncertainty envelope. Entering Simulation or Debrief clears transient hover, selected-waypoint, and planning-anchor overlay state before the next scene renders.

Sequential temporal planning advances the player's planning anchor after each reachable waypoint. The browser estimates segment travel time from distance, glider max speed, current alignment, and drift gain, writes optional waypoint metadata such as `estimatedArrivalTime`, `segmentTravelTime`, `segmentEnergy`, `cumulativeEnergy`, `remainingFuelEstimate`, and `arrivalUncertainty`, then moves the planning slider to that estimated arrival. Guidance overlays use this planning anchor for the next widening origin-to-target guidance cone, likely reachable region, preview path, hover cost estimate, and committed waypoint arrival ovals. Blocked terrain segments keep warnings and do not advance the anchor past the breach.

Waypoint placement is append-first. A normal map click in Waypoint Mode creates a new waypoint for the selected glider, even when the clicked cell already contains an earlier waypoint. Same-cell revisits are legal route entries when they have different sequence positions, times, or windows. Existing waypoints are selected, deleted, and reordered from the right Waypoint Timeline; modifier map selection such as Shift-click or Alt-click is allowed as a convenience but existing waypoint markers do not intercept default placement clicks. Stacked same-cell waypoints render with slight marker offsets plus a compact stack indicator, while route execution, import, and export preserve the original waypoint array order.

Waypoint data includes semantic `kind` metadata. `navigation` is the default for old and new ordinary route waypoints and represents commanded submerged intent. `surface` represents a GPS/communication/update point and emits `surface_update` semantics during simulation. `samplingTarget` is reserved for science objectives and planning markers, not for ordinary hard route checkpoints. `terminalCarryThrough` marks a final over-duration command that is intentionally truncated at mission end. This keeps player intent separate from GPS-confirmed truth correction.

Mission timeline navigation is frame-based rather than only planning-window-based. The core timeline builder always includes mission start, all configured surfacing/update frames, and the exact mission duration as a final surface/end frame. `Prev`, `Next`, marker clicks, and `End` therefore work for both even horizons such as `0, 3, 6, 9, 12 hr` and uneven horizons such as `0, 3, 6, 9, 10 hr`.

Full-route rendering and route estimates use a shared route-segment builder. The committed route always begins at the agent's fixed start, selected deployment cell, or surfaced replanning position, then draws a `startToWaypoint` segment into waypoint 1 and `waypointToWaypoint` segments for the rest of the route. The ordinary next-placement planning anchor is not used as the origin for the full committed route, so selecting or adding a waypoint cannot hide the first edge.

ANCHOR's grid is an environmental sampling layer, not a Manhattan movement graph. Waypoints are continuous route commands in map space. Route preview, Greedy Planner, Travel Cost, Play validation, and simulation diagnostics validate the continuous waypoint-to-waypoint segment by sampling/intersecting it against grid-derived terrain, depth, hazard, current, and risk fields. A segment is invalid when the continuous line enters blocked terrain or violates safety/time/fuel constraints, not because a 4-neighbor cell path cannot be found.

Glider triangle orientation is based on path direction rather than a fixed or left/right-only facing. Planning renders the selected glider toward the hovered waypoint target when previewing, then toward the first route segment when no hover target is active. Simulation renders the glider along recent actual movement, falling back to stored velocity, active waypoint direction, and finally the last known heading.

Drop-zone missions have an explicit pre-planning deployment-selection state. When an agent has `deployment.mode: "chooseFromZone"` and no `selectedStart`, waypoint placement is blocked, the assigned deployment zone is emphasized, the top selected-glider HUD reports `Placement mode: Choose deployment cell`, the right waypoint panel shows `Start: not selected`, and hovering a valid deployment cell previews the start marker. Guidance builders return `null` in this state, so the renderer suppresses drift cones, reachability overlays, route-preview lines, arrival ovals, ETA/energy labels, and any false `(0,0)` planning origin. Clicking a valid non-terrain, non-hazard zone cell writes `deployment.selectedStart`, mirrors it into `agentPlans[].selectedStart`, clears stale hover/deployment preview state, locks a distinct deployment marker, and switches that agent into normal waypoint placement. From that point, the reachability ellipse center is the committed planning anchor: first the selected start, then the latest reachable waypoint. Clicking outside the zone warns instead of placing a waypoint.

Mission horizon and fuel limits are enforced at placement time. The placement guard estimates the proposed segment before mutating the plan and blocks targets that exceed mission duration, exceed estimated fuel, or breach terrain. Imported or edited plans are recomputed in sequence; invalid waypoints receive `validity` reasons and downstream stale markers rather than repeated clamped arrival times.

Planning also runs a pre-simulation route validity audit over the active plan. The audit checks each selected-start/fixed-start-to-waypoint and waypoint-to-waypoint segment for missing starts, invalid coordinates, terrain crossings, mission-time overflow, and estimated fuel overflow. Failed audits block Execute by default, annotate affected waypoints with planning-time invalid status, color invalid route segments and bottom-timeline icons, and show the first issue in the Mission Console. Browser baseline planners run the same audit before their route is accepted and prefer a shorter valid route over a known invalid one.

## Segment Contribution Grading

`src/core/planning/SegmentContributionGrader.js` grades route quality at two levels: waypoint-to-waypoint segments and fixed 3-hour dead-reckoning blocks. Each grade includes immediate sample reward, priority-target reward, future setup value, current-assist value, coverage value, energy/time cost, hazard penalty, shoreline risk penalty, and cross-current penalty.

Future setup value is intentionally heuristic rather than a full optimizer. It compares limited-lookahead potential from the segment start and segment end using active future Gold Stars and nearby high-expected-value ROI. This gives positioning moves credit when they improve access to future reward, even if the segment itself collects little immediate value.

The same grader is used for manual plans and Greedy Planner routes. Challenge Mode presents friendly letter grades and role labels in the Planning Assistant, right waypoint timeline, and Debrief. Simulation Lab exports the numeric breakdown through `routeQuality` in result JSON.

## Main Menu Flow

The main menu has two primary accordions: `Challenge Mode` and `Simulation Lab`. Each accordion uses smaller visual subsection headings rather than a flat list. Challenge Mode is the playable/game-facing door; Simulation Lab is the experimental/authoring/analysis door.

Challenge Mode contains:

- `Play`: Mission Modes, Play Custom Challenge, and Quick Random Challenge.
- `Learn`: Tutorials.
- `Compete`: Greedy Planner Race and Challenge Leaderboard.

Simulation Lab contains:

- `Experiments`: Deterministic Experiment and Stochastic Experiment.
- `Demos`: Flow Fields Demo, Sample / ROI Field Demo, Coupled Fields Demo, and Uncertainty / Forecast Demo.
- `Editor & Import Tools`: Mission Editor and Import / Export Tools.
- `Benchmarks`: External Solver Evaluation and Benchmark Leaderboard.
- Planning Analysis: when prior attempts exist for the same challenge instance, the console exposes the best prior run as a benchmark with ghost-path overlay, rerun, load-as-plan, and export controls. The overlay is muted and never replaces the editable current route unless the player explicitly loads it.

UUIDs and instance IDs remain important metadata for solver packets, plans, results, local saves, and datasets. They are no longer the primary player-facing loading mechanism.

Debrief uses the active `currentScenario` metadata to provide next actions: retry from briefing, next tutorial, new generated challenge, return to editor, revise plan, exports, and main menu.

Debrief switches the page into a fullscreen result layout. The mission console, waypoint timeline, and planning map are hidden while the Phaser Debrief scene presents metrics and actions; returning to planning, simulation, editor, or main menu restores the normal spatial layout.

## Challenge Modes

Perfect Knowledge mode shows the truth fields during planning. Forecast mode shows forecast fields during planning while simulation runs against hidden truth. This creates a robust-planning puzzle: the player must decide whether to pursue high forecast value or hedge against uncertain currents and ROI.

Stochastic mode adds forecast ensembles, probabilistic ROI, mobile hazards, and depth. The player can switch between ensemble mean and individual members, view ROI by expected value, raw value, probability, or planning-time remaining value, and toggle ensemble-disagreement overlays. Simulation still uses hidden truth for scoring.

Mission rules may optionally enable seeded stochastic drift through `rules.drift`. In normal deterministic mode, simulation uses truth current deterministically. When `rules.drift.stochasticDrift` is true, simulation adds deterministic seed-based current perturbation to truth current to represent forecast/current uncertainty. The same seed repeats the same perturbation sequence; different seeds can produce different actual drift. Result exports summarize average along-current assist, cross-current, stochastic drift seed, and noise magnitude when available.

Generated deterministic and stochastic challenge levels are temporal by default. Scenario setup exposes a `Current / Flow Field` section using the same model as the Flow Fields Demo: static/dynamic mode, base preset, evolution behavior/speed, dynamic complexity, direction and magnitude variation, and optional additive flow layers with global, pocket, or partition influence. The Flow Fields Demo also uses the right panel as a click-to-inspect Cell Inspector so a selected grid cell can show vector components, magnitude, direction, topology region, boundary adjustment, shoreline risk, and dominant behavior from the same shared sampler that draws the arrows. The generated challenge default is `Topology-Aware Composite`, a synthetic topology-aware ocean-inspired current field that inspects terrain and stores seeded regional behavior metadata for open water, shoreline, channels, bays/pockets, and island-adjacent wakes. It is not validated CFD or HYCOM forecast data. Its `dynamicComplexity` setting controls moving structures, regional behavior count, jet/eddy/wake strength, pulse strength, shoreline variability, domain-scale direction rotation, and magnitude range while remaining deterministic from the challenge replay seed contract. High complexity deliberately makes current arrows change direction and length visibly during time scrub/playback. Generated levels use a 24-hour horizon, 3-hour planning windows, moving/pulsing ROI hotspots, and current fields whose direction and magnitude shift over time. Generated truth, forecast, and current frame lists include `t = 0`, intermediate `dt` frames, and the exact mission-duration frame. Stochastic challenge truth frames evolve independently from visible forecast/ensemble frames, so timeline scrubbing changes the planning view and simulation playback advances through the temporal field sequence.

The pure Sample / ROI Field Demo organizes `S(x,y,t)` behavior into Event Likelihood / Spawn Distribution, Spatial Pattern / Geometry, Value Distribution, Temporal Pattern, Spatial Evolution, State Model / Memory, Sampling Effects, and Display. Clustered value is represented as `Clustered Field` plus Cluster Count and Cluster Size; a two-cluster case is a parameter setting, not a separate top-level field theory. Multi-modal, patchy, and sparse candidate event likelihoods use separated seeded anchors so default examples use the domain instead of collapsing into one tight region. Temporal Pattern includes persistent sustained, periodic, bursty, intermittent, rapid-pulse, random-pulse, and wavy modes plus explicit finite Pulse Then Silence and semi-finite Long-Tail Decay examples. Spatial Evolution is the separate observable-pattern axis that controls whether value stays stationary, drifts continuously, jumps between windows, wanders by seeded local steps, or propagates to neighboring cells. State Model / Memory separates Time-Indexed / Memoryless fields, Frequency-Based cycles, State-Evolving / Markovian processes, and History-Aware / Non-Markovian behavior. A field can be dynamic and still memoryless when it is computed directly from `x`, `y`, and `t`; neighbor propagation and random walk are state-evolving examples; knowledge decay and revisit recovery are history-aware when sampling or observation history matters. Forecast/truth/uncertainty belongs in the Uncertainty / Forecast Demo, and current-dependent sample behavior belongs primarily in Coupled Fields Demo.

Generated maps are validated for deployment connectivity before play. A 4-neighbor flood fill starts from valid deployment water cells and measures reachable navigable water, high-value ROI reachability, and required recovery/communication reachability. If terrain isolates the deployment zone, generation clears nearby cells and carves a compact water corridor toward the largest navigable region and ROI targets; if repair fails, generation retries with a derived seed up to the configured limit. The summary is stored in `level.meta.connectivity`, exposed in solver packets, and shown as a Planning Console warning for custom disconnected maps.

Probabilistic ROI uses `expectedValue = rewardValue * probability`. In `expectedValue` mode, scoring awards expected value. In `realizedStochastic` mode, each sampled ROI cell manifests once per run using a deterministic seed; manifested cells award reward value and missed cells award zero. Debrief reports realized sample value, planned expected value, probability success/failure counts, and a simple expected-value regret cue where available.

Planning `ROI Mode` is separate from stochastic scoring mode. `Value` shows raw reward value, `Probability` shows opportunity likelihood, `Expected` shows value times probability, and `Remaining` shows raw value still available after all currently planned fleet route coverage is considered. `Risk / Safety` shows one navigability spectrum: high risk highlights hazards, shallow water, shoreline-current risk, mobile hazard proximity, and low-confidence forecast cells, while low-risk cells are implicitly safer. `Travel Cost` estimates route difficulty from the selected glider's current planning anchor. Remaining mode computes a planning-only coverage map from every agent plan by rasterizing the selected-start/fixed-start to waypoint 1 segment and each waypoint-to-waypoint segment, expanding by sampling radius when configured, and adding explicit sample waypoint cells. It applies the mission sampling multiplier (`duplicateValueMultiplier`, `depletionFactor`, or persistent no-depletion behavior), dims/marks claimed cells, and never mutates the underlying ROI field. Deterministic probability mode remains explicit: available ROI cells are treated as probability 1.0 unless probabilistic fields are configured.

Simulation stop diagnostics are treated as player-facing mission feedback, not only debug information. When blocked movement, unreachable waypoints, timeouts, fuel exhaustion, or waypoint-miss cascades occur, the simulation enters a route-failure decision state and pauses engine time. A Phaser modal explains the failed waypoint, last successful waypoint, current glider position/time, reason, and suggested fix. Actions let the player replan from the current actual position, keep the failed waypoint skipped and continue, continue anyway when safe, end to Debrief, or return to Main Menu. The Simulation Console renders fallback buttons for the same actions, Debrief records the selected recovery action, and the waypoint timeline labels missed waypoints with the specific reason.

Realized stochastic sampling logs explicit `probabilityOutcome` events with value, probability, expected value, manifest/miss status, realized value, seed, and outcome roll. Repeated visits to the same ROI cell reuse the same manifestation outcome for the run seed.

The Mission Workspace stochastic panel makes this seed explicit. Forecast-mode players can step or randomize the seed, switch ROI scoring mode, cycle forecast members, rerun the exact same waypoint plan with the same seed, or rerun the same plan with a new seed. Debrief keeps a session-local seed comparison table keyed by a simple plan fingerprint so students can see whether a plan is stable or seed-sensitive.

Mobile hazards are rendered at the selected mission time and checked during simulation. The result summary tracks contacts, near misses, and exposure count. Depth is rendered as a bathymetry tint; shallow water can increase energy use or block cells when mission rules set a minimum depth, and result summaries track shallow energy penalty and deep-water benefit.

Mission rules now support multiple end-condition styles. Sampling-only missions can leave `rules.endCondition.mode` as `none`. Surface/transmit missions can require or reward surfacing/communication by mission end. Recovery and pickup missions can require or reward ending near a target zone. These checks live in core simulation scoring, and Debrief reports whether recovery was required, achieved, and how bonus or penalty affected the score.

Sampling behavior is mission-configurable. `unique` sampling gives full value once and reduced/no value for duplicates. `diminishing` sampling keeps observed hotspots visible but reduces nearby value. `cooldown` sampling lets value recover after a configured number of planning windows. `persistent` sampling supports monitoring-style missions where revisits can remain valuable once per window. Result JSON records sampling mode plus duplicate, depleted, cooldown, and persistent sample metrics.

Because sampling and depletion are cell-level mechanics, ROI rendering is deliberately discrete. Phaser draws each traversable grid cell with its own ROI color and subtle boundary instead of smoothing or interpolating values across adjacent cells. Terrain masks ROI, while hazards, currents, waypoints, and guidance overlays render above the heatmap.

Forecast regret is reported as a lightweight teaching metric when a truth-reference signal is available. Browser-native Greedy Planner is a comparison planner, not an optimal planner.

Forecast ensemble metrics are approximate. The game estimates plan ROI across visible ensemble members, reports ensemble mean expected value and disagreement, and computes a simple ensemble regret estimate against realized sample value when available.

## Synthetic Current Generation

Dynamic Current Fields are the movement-side companion to Dynamic Sample Fields. Current fields are sampled as vectors over space and mission time, then used for current-aware ETA, energy, speed over ground, cross-current drift/risk, shoreline/topology risk, route preview, Greedy Planner scoring, simulation movement, debrief metrics, and solver exports.

`src/core/currents/CurrentFieldSampler.js` is the canonical current/vector sampling interface. It returns `{ u, v, magnitude, confidence, source, contributors }` and accepts either grid coordinates or normalized coordinates. Mission systems use grid coordinates in cell units. The Flow Field demos use normalized `[0,1]` coordinates, which are converted by `normalizedToGridCell(...)` to the nearest demo grid cell before sampling. Time is mission time in hours. This keeps demo arrows, mission map arrows, hover diagnostics, Travel Cost, Risk/Safety, route guidance, simulation drift, and Greedy Planner route scoring aligned on the same current values.

Current-aware route mechanics use `src/core/planning/CurrentAwareRouteCost.js`. Segment estimates sample multiple points along the route at mission time, project the local current onto the desired heading, and compute along-track assist/opposition, cross-current risk, speed over ground, ETA, and energy multiplier. Route preview, waypoint timing, Travel Cost, route audit, and Greedy Planner use this shared segment model. Simulation movement samples the same current field at the glider position and mission time, adds drift to commanded velocity, and applies the same heading/current energy multiplier to battery usage.

Sampling is topology-aware when terrain is available. The sampler first evaluates the synthetic ocean-inspired base field, then estimates nearest land within a small radius, computes the direction toward land, and measures the current component pointing into that land. Land cells return zero current with blocked shoreline risk. Water cells near shore damp inward current and deflect part of it along the shoreline while preserving metadata such as `shoreDistance`, `directionToLand`, `currentTowardLand`, `shorelineRisk`, and `topologyAdjusted`. For topology-aware composite fields, contributor metadata also reports the region type, dominant seeded behavior, and dynamic complexity used for that challenge. Risk/Safety and Travel Cost use that metadata so near-land current into shore is expensive and risky even if the displayed vector has been deflected.

Challenge setup can import `anchor.flow-field` JSON to override procedural current behavior. Frame-based imports become the mission's temporal current frames; synthetic-config imports reuse the shared flow-field setup model. Imported fields keep source/fairness metadata and boundary conditions, but generated challenge terrain remains the coastline/land mask for topology-aware current risk and deflection.

Synthetic fields vary between challenges through seeded variation, not page-load randomness. Current parameters such as eddy centers, jet phase, tidal phase, storm timing/location, and curl-noise offsets are derived from `challengeId` / `replaySeedAnchor`, preset id, generator version, map size, strength, and variability. The same challenge UUID plus the same preset/config regenerates the same current field for replay, leaderboard, solver packets, and best-path validation; different challenge UUIDs produce different repeatable current variations.

The Flow Field demos are passive visualizations: demo particles advance by the sampled current plus a small display bias. Mission gliders do not use that passive model. In missions, the simulator still computes commanded velocity toward the active waypoint, then adds the sampled current drift contribution according to mission drift rules before terrain, fuel, sampling, and scoring checks run.

Generated levels use precomputed temporal `[u, v]` current frames. The primary browser-safe generator is a parametric ocean-inspired preset system:

- `calm`
- `uniformDrift`
- `shearFlow`
- `currentCorridor`
- `eddyField`
- `doubleGyre`
- `tidalOscillation`
- `meanderingJet`
- `westernBoundaryCurrent`
- `stormPulse`
- `islandWake`
- `curlNoise`
- `gulfInspired`
- `hycomInspiredComposite`
- `chaotic`

These presets are intentionally synthetic and deterministic by seed/config. They create plausible-looking U/V current fields for planning puzzles, solver packets, and datasets; they are not real ocean-model data, HYCOM ingestion, validated HYCOM forecasts, or a high-fidelity Navier-Stokes solver. Scenario setup exposes Current Field, Current Strength, and Temporal Variability. Generated stochastic missions use the selected preset for hidden truth and derive noisy forecast/ensemble current variants from those truth frames. `hycomInspiredComposite` is labeled as a HYCOM-inspired synthetic composite, not real HYCOM forecast data.

The older fluid-inspired editor preview remains available for environment editing experiments. Both systems commit ordinary temporal current frames, so Travel Cost mode, guidance cones, reachability estimates, drift preview, simulation, solver packets, and dataset export all consume the same field shape.

The Environment Editor includes a compact temporal current preview for these presets. It renders a small vector-field mini-map, frame/time label, scrubber, previous/next/play/reset controls, a weak/moderate/strong legend, current magnitude statistics, a qualitative label, and gameplay notes. Designers can inspect individual frames or play the generated sequence at a low rate without regenerating it. `Apply To Level` commits the whole generated current sequence, not only the visible preview frame. The stats are meant to help designers judge whether a field is too calm, too strong, too uniform, or varied enough for a drift/strategy challenge.

The active editor uses a Phaser-native grouped HUD for common editing actions. Terrain, water/depth, currents, hazards, ROI, deployment, agents, time, and import/export tools are grouped as tab-like sections. The HUD also includes compact numeric steppers for brush radius and intensity/vector strength; these update shared editor tool state and keep legacy DOM inputs synchronized. The current/vector brush uses click-drag-preview-release interaction: while dragging, the editor shows the proposed vector arrow, affected radius, magnitude, and frame scope; releasing applies the synthetic edit, while Escape or right click cancels.

## Ratings

Campaign levels define bronze, silver, gold, and optional perfect thresholds. Debrief converts the final score into a rating, checks objectives, and gives improvement suggestions tied to energy, hazards, sample value, drift, and forecast uncertainty. The Debrief screen is Phaser-native; its cards and buttons replace visible DOM result controls while still calling core export helpers.

## Debrief Comparison

The browser session keeps separate result slots for `manual`, `temporalGreedy`, and `importedSolver` plans, with legacy compatibility for older `greedyBaseline` records. Each slot stores the plan, result, and normalized summary. Debrief renders available rows side by side in a Phaser panel and identifies the winner by final score. Comparison metrics include expected value, realized value, energy, static hazards, mobile hazards, depth exposure, risk exposure, forecast regret, completed waypoints, and missed waypoints when available. Missing metrics render as `N/A`.

The comparison block is included in result JSON and after-action Markdown exports. Older static greedy behavior is not exposed as a normal player baseline because it is not useful for temporal missions; Greedy Planner evaluates candidate value at estimated arrival time and includes travel cost and active priority targets. It is documented as a selected-glider baseline in `docs/greedy_planner.md`. It replans after each chosen waypoint, records why it stopped, and may end with a terminal carry-through waypoint beyond mission duration so the route remains commanded until the time limit.

## Leaderboard Scopes

Leaderboards are shared infrastructure, not a separate engine. Every non-tutorial completed run can save an attempt with `experienceMode`, `leaderboardScope`, `scenarioFingerprint`, `routeSource`, solver metadata, fairness metadata, and replay seed metadata. Old records without those fields normalize to Challenge scope and unknown/manual-compatible source labels.

Challenge Mode leaderboards are high-score views. They emphasize score, stars/objectives, medals/grades when available, safety/energy tie breakers, mission mode, difficulty, route source, and fairness. Manual routes, Greedy Planner routes, imported plans, external solvers, and saved replays can all appear, but external/oracle/truth-assisted entries are labeled instead of silently treated as ordinary manual runs.

Simulation Lab leaderboards are benchmark results. They emphasize reproducible scenario identity, score, sample value, objective capture, hazard exposure, fuel/energy, route grade, source/fairness, and solver labels. They are meant to compare manual planning, Greedy Planner, imported benchmark routes, and external solver variants on the same UUID/config/generator-version scenario.

## Tutorial Guidance

Tutorial levels may define `tutorial.planningPrompts` as short title/body steps. The Planning scene shows those prompts in a Phaser-native help/briefing modal that does not block waypoint editing, solver import, or simulation after it is closed.

## Temporal Planning

Planning is a spatiotemporal puzzle. The Phaser-native bottom timeline scrubs mission time, updates the visible ROI/current/forecast frame, shows active Gold Star priority targets, marks surfacing windows, shows global future planning-marker ticks/icons, and selects the active planning window. Waypoints keep both `window` and `t` metadata for export/import, while simulation still executes each glider's waypoint array in list order. The timeline shows numbered executable waypoint icons only for the selected glider; switching glider tabs swaps the waypoint icon layer while preserving global markers and stars. Planning markers keep `x`, `y`, `t`, `window`, `type`, `label`, optional `linkedTargetId`, and recomputed reachability estimates but are not connected, executed, sampled, or scored unless absorbed by placing a waypoint on the same marker cell/time. Marker reachability is deliberately approximate: it evaluates latest connected anchor to marker, time slack, fuel, terrain, hazard/current risk, forecast uncertainty, and likely backfill steps without generating an automatic path. Simulation playback refreshes the same timeline from engine time so the time label, active window, visible temporal map frame, and active priority targets advance during playback.

Marker Mode is a free exploration/annotation mode, not a route-planning mode. It can be used before deployment selection and does not require a selected start or planning anchor. Hover inspection samples the visible planning frame at the timeline time and reports cell coordinates, ROI, active priority target value, terrain/hazard state, current vector/magnitude, depth, and forecast confidence when available. Marker Mode suppresses route guidance lines, drift cones, reachability ovals, ETA/energy hover labels, and planned route drawing so the player can inspect temporal fields without receiving waypoint-placement warnings such as "choose deployment cell first." Waypoint Mode retains the deployment, anchor, time, energy, and terrain checks.

Pointer-to-cell conversion is centralized through the Phaser map adapter. Hover inspection, marker placement, waypoint placement, zoom focus, and pan deltas normalize DOM pointer coordinates against the canvas before applying map bounds, zoom, pan, and grid clamping. Tooltip content comes from the same resolved hover cell used for highlights and marker targets, while the HTML tooltip box follows the cursor with a small viewport-clamped screen offset.

The map renderer uses a shared camera-aware layout for large generated maps. The player can zoom, pan, fit, or reset the map; pointer-to-cell hit testing, waypoint dragging, deployment selection, ROI heatmap, current vectors, route overlays, guidance, and simulation paths all use that same layout. DOM and HTML overlay panels remain fixed outside the map transform. Current vectors are automatically strided on larger maps to reduce clutter and redraw cost.

## Surfacing And Replanning

Tutorial missions use surface-only communications. Gliders submerge after launch, surface at configured mission-time intervals, report actual position, and can pause the simulation with a Phaser-native continue/update/finish modal. Replanning records `replanned` events and can apply an update penalty through mission scoring.

## Planning Guidance Overlays

When a glider is selected, Planning can draw strategy-style estimate overlays: a guidance cone from the current planning origin, likely reachable cells and an approximate reachable ellipse for the active planning window, a terrain-aware expected-drift preview path, a cost preview, and a predicted next surfacing marker. These overlays use the same visible planning source as the map: forecast fields in forecast mode, truth fields in perfect-knowledge mode, or revealed truth when debug reveal is enabled. The map renderer emphasizes route intent with heavier planned-path strokes, a smoothed blue-to-yellow ROI heatmap, white current arrows scaled by magnitude, orange-red hazard markings, terrain masking, and water/land styling that reads as a mission chart rather than a plain grid.

Gold Star priority targets are a separate temporal objective layer, not enhanced ROI cells. They render as pulsing gold stars only when active, score through `priorityTargetCaptured` simulation events, and are summarized in Debrief, solver packets, result JSON, and datasets.

The route preview uses a lightweight continuous-segment terrain validator and energy estimator in `src/core/planning/RoutePreview.js`. It samples the proposed waypoint-to-waypoint segment against grid-derived terrain/depth masks, clips display geometry at the last valid point when terrain is breached, reports the blocked cell, and estimates energy from distance, current assist/opposition, and shallow/depth penalty. These estimates are intentionally approximate gameplay guidance, not a real ocean or vehicle-energy model.
