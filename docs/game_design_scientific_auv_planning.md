# ANCHOR Game Design: Scientific AUV / Glider Adaptive Sampling

## 1. Design Purpose

ANCHOR is a scientific game about planning AUV/glider sampling missions under imperfect knowledge, moving ocean processes, currents, energy limits, communication constraints, and hidden discovery. The player is not solving a simple shortest-path puzzle. The player is trying to improve a scientific picture of a changing ocean with limited vehicles, limited samples, and uncertain forecasts.

Core lesson:

```text
The best path is not the shortest path.
The best sample is not always the highest-looking cell.
The best mission improves scientific belief under constraints.
```

Good play balances expected science value, uncertainty reduction, forecast correction, hidden event evidence, current and energy cost, redundancy, hazards, mission objective, and time.

## 2. Player Fantasy

The player is a mission commander assigning one or more autonomous gliders to investigate a changing ocean. They do not control a spaceship, arcade submarine, or free-swimming vehicle directly. They make mission-level decisions:

- which objective matters now
- which region should be sampled next
- which glider should go there
- which route and dive profile should be used
- when the glider should surface or communicate
- whether new observations imply forecast correction or a hidden event
- how the next leg should adapt

The player sees enough science context to reason, but not enough truth to be omniscient unless an explicit oracle/training mode is active.

## 3. Scientific Game Loop

The production game loop should be:

1. Mission brief / objective.
2. Forecast and belief inspection.
3. Plan route and dive profile.
4. Execute under currents and motion constraints.
5. Collect noisy samples at x/y/depth/time.
6. Surface / communicate.
7. Update belief and uncertainty.
8. Diagnose forecast correction vs hidden event.
9. Mission manager recommends next objective when the mode allows it.
10. Player/solver plans next leg.
11. Debrief scores science value, energy, risk, redundancy, and regret.

The loop should teach that lawnmower coverage is useful as a beginner reconnaissance baseline, but not the main smart behavior. Strong play adapts to what was learned.

## 4. Information Layers

ANCHOR separates world state, visible state, and decision aids.

- Hidden truth: the actual evolving field, not visible to normal players or fair solvers.
- Forecast: an imperfect expected field that may be wrong in position, intensity, timing, depth, or event family.
- Belief: the current player/solver estimate after forecasts and observations are combined.
- Uncertainty: where the belief is unreliable, undersampled, stale, or ambiguous.
- Hidden-event probability: evidence that something missing from the forecast may exist.
- Current field: `F(x,y,t)`, the flow/current vector field affecting travel, drift, risk, and motion.
- Bathymetry / constraint field: land, shallow water, depth limits, bottom clearance, restricted zones, hazards, and feasible operating space.
- Priority field: where a measurement is scientifically useful next.
- Observations: noisy samples collected at x/y/depth/time.
- Science diagnosis: interpretation of observations as forecast correction, hidden event hypothesis, noise, or insufficient evidence.

Visibility depends on the information-access mode. Authority depends on who chooses objectives and routes. These are separate design axes.

## 5. Visibility Modes

### Oracle / Training Mode

Truth is visible for teaching, debugging, and deterministic demonstrations. This mode is useful for explaining mechanics, validating scenarios, and showing why a good plan worked. It is not a fair hidden-state benchmark mode.

### Forecast-Guided Mode

Forecast is visible while truth is hidden. The forecast may be wrong. The player plans from expected value, uncertainty, and forecast confidence, then uses samples to discover whether the forecast needs correction.

### Belief-Only Mode

The player sees updated belief and uncertainty, not hidden truth. This mode emphasizes sparse sensing, belief updates, uncertainty reduction, diagnosis, and adaptive follow-up.

### Blind Discovery / Hidden-State Mode

In Blind Discovery / Hidden-State Mode, the ocean is hidden until observed. The player receives only sampled snapshots at sampled x/y/depth/time. The mission is to build a belief map from sparse observations and decide where new information is worth the cost.

This mode should support manual play, solver workflows, adaptive objective management, and future autonomy contracts. It should not reveal full hidden fields to fair player/solver artifacts.

### Debug / All-Layers Mode

Debug / All-Layers Mode may expose truth, forecast, belief, uncertainty, priority, hidden-event probability, water-column layers, diagnostics, and traces for QA or instruction. It is not a fair benchmark tier.

## 6. Authority Modes

Authority mode is separate from visibility.

### Planner Benchmark

Planner Benchmark fixes the objective. The player, greedy baseline, imported solver, or external solver chooses the route for that objective. It is for fixed-objective route comparison under a declared information tier.

### Adaptive Benchmark

Adaptive Benchmark gives objective authority to a transparent mission manager. After surfacing or debrief evidence, the manager may recommend a new objective, but the player or solver still plans the route. This is where adaptive replanning becomes gameplay without silently generating waypoints.

### Full Autonomy Benchmark

Full Autonomy Benchmark is a future contract where a solver or agent chooses both objective and route. It should align with observation/action/reward/termination/visibility schemas, but it is not MARL/RL training yet.

## 7. Mission Objective Archetypes

Each objective changes what counts as good sampling, what the player is trying to learn, and what mistake the debrief should explain.

| Objective | What the player is trying to learn | Rewarded sampling pattern | Common mistake |
| --- | --- | --- | --- |
| Survey / reconnaissance | Build a broad first map. | Lawnmower, zig-zag, or coarse coverage. | Treating reconnaissance as the best strategy after evidence appears. |
| Reduce uncertainty | Reduce belief uncertainty or threshold ambiguity. | Sample uncertain or undersampled regions. | Sampling only the highest expected value. |
| Validate forecast | Test whether forecast position, timing, intensity, boundary, or depth is correct. | Sample disagreement zones and forecast-sensitive features. | Trusting the forecast without checking likely error modes. |
| Map front / boundary | Localize gradients, edges, fronts, thermoclines, or plume boundaries. | Cross-gradient samples and boundary brackets. | Sampling only inside the high-value center. |
| Confirm hidden event | Gather evidence for a phenomenon absent from the forecast. | Follow coherent surprise and resample nearby/depth-matched locations. | Treating one noisy sample as proof. |
| Localize source | Move from evidence toward likely origin or upstream driver. | Cross plume, infer direction, move up-current/up-gradient. | Chasing the strongest downstream patch. |
| Track moving feature | Follow a plume, bloom patch, eddy-trapped feature, or front. | Intercept predicted motion and resample over time. | Planning to where the feature used to be. |
| Revisit stale region | Refresh areas where old samples no longer support belief. | Revisit based on staleness and expected change. | Oversampling fresh cells while stale regions drift. |
| Persistent monitoring | Sustain observations over a time window. | Variable-resolution revisits and watch stations. | Covering once and leaving. |
| Cooperative coverage | Divide work across vehicles. | Spatial, temporal, depth, or objective role assignment. | Sending every glider to the same highest-looking cell. |
| Hazard avoidance | Collect science while managing risk. | Edge-safe routes, hazard-aware detours, risk/benefit tradeoffs. | Taking a high-value shortcut through avoidable danger. |
| Energy conservation | Preserve enough energy for science and recovery. | Current-aware routing and selective sampling. | Spending energy on low-information samples. |
| Blind discovery | Build a belief map from sparse observations. | Explore, update, then exploit discoveries. | Acting as if unobserved water is known. |

## 8. Sampling Strategy Archetypes

### Reconnaissance / Lawnmower / Zig-Zag

Reconnaissance is the beginner baseline. It is safe, explainable, and good for broad first-pass maps. It is inefficient once the mission has evidence about boundaries, anomalies, uncertainty, or moving features.

### Adaptive Resampling

Adaptive resampling revisits uncertain, stale, changing, or mission-critical regions. A good adaptive plan asks what changed after the last sample and whether a follow-up sample would change the mission belief.

### Front / Boundary Tracking

Front and boundary tracking samples across gradients and uncertain edges, not only high-value centers. The player should bracket and refine the edge of a feature to improve localization.

### Hotspot Localization / Gradient Climbing

Hotspot localization moves toward local maxima when the objective is source or hotspot localization. It should be used carefully: a high visible value may be downstream, stale, or forecast-biased.

### Plume Source Tracing

Plume source tracing crosses the plume, infers direction, moves up-current or up-gradient, and resamples to confirm. The strategy should distinguish downstream concentration from the source location.

### Information Gain / Uncertainty Reduction

Information-gain planning samples where belief uncertainty, forecast disagreement, or threshold ambiguity is high enough to change future decisions. It should not be reduced to maximum visible ROI.

### Persistent Monitoring

Persistent monitoring allocates variable resolution over time. Old samples go stale; fixed stations may be valuable if the objective is detecting change, verifying recovery, or guarding a boundary.

### Multi-Agent Cooperative Sampling

Multi-agent cooperative sampling divides regions, depths, objectives, and timing among vehicles. It avoids redundant samples unless confirmation is the objective.

## 9. Priority Model

The conceptual priority score is:

```text
priority =
  + uncertainty
  + gradient_strength
  + anomaly_strength
  + forecast_disagreement
  + time_since_last_sample
  + mission_objective_bonus
  - travel_cost
  - energy_cost
  - current_risk
  - redundancy_penalty
  - hazard_penalty
```

This is not a single universal formula. Different objectives change weights. A map-front mission values gradients and boundary ambiguity. A hidden-event mission values coherent surprise. A persistent-monitoring mission values staleness and revisit timing.

ANCHOR should preserve this distinction:

- `A_global` is vehicle-independent science priority: where a measurement would be useful.
- `Q_glider` is vehicle/action-specific value: whether this glider should target that point given currents, reachability, energy, hazards, redundancy, and timing.

## 10. Dynamic Ocean Process Model

Hidden truth evolves with educational process terms:

```text
C_next =
  C
  + advection(flow)
  + diffusion
  + source
  + growth
  - decay
  + noise
```

The forecast is an imperfect approximation of that hidden truth. Belief updates from noisy samples. Uncertainty decreases near samples and grows with staleness. Hidden-event probability grows when observations show coherent surprise that the forecast cannot explain.

CA/grid-process models are useful as event/ecology layers and teaching layers. They should not be treated as the whole ocean model, calibrated hydrodynamics, operational forecasts, or a substitute for flow, uncertainty, observations, and mission coupling.

## 11. Scenario Archetypes

| Scenario | Hidden model | Visible information | Best player strategy | Common wrong strategy | Scoring emphasis |
| --- | --- | --- | --- | --- | --- |
| River plume | Source, advection, diffusion, decay, runoff pulses. | Forecast plume path, uncertainty, currents, shoreline constraints. | Cross plume, infer edge/source, sample downstream and up-current. | Chase the visible center without checking direction or timing. | Boundary accuracy, source inference, forecast validation. |
| Harmful algal bloom | Growth/decay patch, depth preference, current transport. | Forecast bloom risk, belief ROI, uncertainty, depth hints. | Confirm bloom layer, map boundary, revisit changing edge. | Sample only surface cells when bloom is subsurface. | Hidden event confirmation, vertical coverage, uncertainty reduction. |
| Oil / hydrocarbon plume | Source release, advection, diffusion, decay, hazards. | Forecast trajectory, hazard/risk zones, uncertain source. | Cross plume safely, localize source, avoid high-risk shortcuts. | Drive through hazard for a high-value-looking cell. | Source localization, risk management, energy. |
| Thermocline / internal wave | Moving boundary by depth. | Surface map, depth-layer priority, forecast boundary. | Use thermocline dives and cross-boundary sampling. | Treat top-down value as depth-independent. | Depth match, front accuracy, vertical coverage. |
| Eddy-trapped feature | Rotating transport around eddy. | Flow/current field, uncertain feature location. | Predict recirculation and intercept future position. | Sample where the feature was, not where it moves. | Intercept timing, current-aware planning. |
| Deep plume / source release | Deep source, vertical structure, weak surface signal. | Sparse surface evidence, deep uncertainty, dive-profile options. | Test deep layer and trace source direction. | Remain surface-only because top-down value looks low. | Deep confirmation, source localization, depth mismatch penalties. |
| Stale monitoring grid | Old observations, time-varying truth. | Staleness field, forecast/belief, last-sampled times. | Revisit stale high-change regions with variable resolution. | Repeat a static lawnmower route. | Staleness reduction, persistent monitoring. |
| Blind discovery anomaly | Unknown hidden feature absent from forecast. | Minimal prior, observations only, growing belief map. | Explore, update belief, follow coherent surprise. | Assume unobserved water is empty or fully known. | Discovery, information gain, regret under hidden-state visibility. |

## 12. 2.5D Water-Column Model

The top-down tactical map remains primary. Each x/y cell can carry depth layers underneath. The default gameplay layers are:

- surface
- thermocline
- deep

A route has waypoints and a dive profile. Sampling value depends on depth. A surface waypoint is not the same as a sampling point: surfacing may provide GPS/communication/update, while sampling can occur subsurface along the route at x/y/depth/time.

Top-down priority collapses water-column value into a playable cell score, but the debrief and diagnostics should explain whether value came from surface, thermocline, deep, integrated water column, or a depth mismatch.

Relevant dive profiles include:

- `surfaceOnly`
- `thermoclineDive`
- `deepDive`
- `fullProfile` / `sawtoothProfile`

The 2.5D model supports vertical coverage, depth mismatch, hidden bloom layer, and deep plume hypothesis gameplay. It is not full 3D route planning.

## 13. Motion Planning vs Path Planning

Path planning chooses waypoints. Motion planning evaluates how the glider actually moves under:

- currents
- control limits
- dive profile
- energy
- heading limits
- drift
- sampling constraints

Definitions:

- Planned route: player/solver waypoint intent.
- Realized trajectory: physical/motion-aware path actually followed.
- Sampled path: where observations were collected along the realized trajectory.

Motion dynamics should become part of the core execution model, but not a fourth top-level authority mode. Planner Benchmark, Adaptive Benchmark, and Full Autonomy Benchmark remain the authority modes.

## 14. Glider Constraints

Glider constraints should shape every mission decision:

- vehicle energy
- dive cost
- turn cost
- communication / surfacing limits
- current assist/opposition
- cross-current drift
- collision / spacing
- bathymetry / bottom clearance
- hazard avoidance
- sensor type
- sensor noise
- sampling rate

A glider is not a point agent on a graph. It is an endurance vehicle whose path, samples, updates, and errors depend on ocean context.
## 15. Mission Feasibility and Benchmark Credibility

Mission feasibility is part of the game challenge, not just an engineering afterthought. A route can be scientifically valuable on the map and still fail as a mission if the glider cannot execute it under current drift, battery/energy limits, flight profile, payload duty cycle, bathymetry/depth constraints, surfacing windows, or communication requirements.

The player-facing distinction should remain clear:

- planned route: what the player or solver commanded
- realized trajectory: what the glider actually did under currents and control limits
- sampled path: where observations were actually collected

Current drift and energy tradeoffs should be visible in debrief metrics. Dive/flight profile choices should affect sampled depth, vertical coverage, depth mismatch, travel feasibility, and energy cost. Payload/sensor duty cycle should eventually separate navigation energy from measurement energy. Mission duration, battery fraction, distance traveled, missed waypoints, track error, bottom-clearance warnings, and surfacing events should become first-class debrief and benchmark fields.

Cost-matrix exports matter because external solvers should not compare routes using raw grid distance alone. SIM-R1 now exposes optional cost graph / adjacency matrix artifacts with simulator-derived time, distance, energy, current assist/opposition, cross-current risk, bathymetry risk, expected track error, depth profile, visibility tier, and warnings. That lets manual routes, greedy baselines, and external solvers compare motion-feasibility-aware plans under the same declared assumptions without having ANCHOR choose or optimize a route.

This target is documented in [Mission Feasibility Simulator and Scientific Benchmark Requirements](mission_feasibility_simulator_requirements.md). It does not make ANCHOR a certified operational glider simulator, calibrated HYCOM/ROMS/CFD ocean forecast, SeaExplorer-specific validated simulator, Python simulator, or MARL/RL training implementation.

## 16. Multi-Glider Gameplay

The fleet should not all go to the highest-value cell. Good multi-glider behavior includes:

- divide high-value regions
- reduce redundancy
- cover different depth layers
- cross-sample plume/front
- maintain communication/surfacing schedule
- avoid collisions/overlap

Useful roles:

- Scout: broad reconnaissance and discovery.
- Confirmer: revisit or cross-check surprising samples.
- Tracker: follow a moving feature.
- Source seeker: move up-current/up-gradient toward an origin.
- Monitor: maintain a persistent time series or station pattern.

The debrief should explain redundant sampling and missed coordination opportunities in player-facing terms.

## 17. Scoring Design

A production scoring synthesis should reward scientific progress under the declared visibility and authority mode:

```text
score =
  + science_value_gained
  + uncertainty_reduction
  + forecast_correction_accuracy
  + hidden_event_confirmation
  + source_localization_bonus
  + front_boundary_accuracy
  + vertical_coverage
  + persistent_monitoring_bonus
  - energy_cost
  - battery_cost
  - missed_sampling_window_penalty
  - redundancy_penalty
  - hazard_penalty
  - collision_or_spacing_penalty
  - communication_loss_penalty
```

Regret measures what better sampling opportunities were missed under the same visibility and constraints. Regret should be fair: a player in Forecast-Guided Mode should not be punished as if they saw hidden truth. A Blind Discovery player should be judged on how well they explored, updated belief, and acted on available evidence.

## 18. Game Modes / Campaign Structure

A campaign can progress from readable foundations to adaptive science missions:

1. Tutorial Survey.
2. Current-Aware Routing.
3. Forecast-Guided Sampling.
4. Uncertainty Reduction.
5. Front Mapping.
6. Hidden Bloom Layer.
7. Plume Source Tracing.
8. Blind Discovery.
9. Adaptive Multi-Leg Mission.
10. Multi-Glider Cooperative Sampling.
11. Motion-Aware Challenge.
12. Full Autonomy Benchmark Preview.

Each step should introduce one new reason why the shortest path or highest-looking cell is not automatically best.

## 19. Learning Design

Learning Labs should connect:

```text
concept -> interactive widget -> sandbox -> mission challenge -> debrief reflection
```

Each concept should become playable soon after it is taught. For example, a Learning Lab explains `A_global`; the Sampling Priority Demo lets the student inspect it; Flow-Coupled Sampling explains `Q_glider`; a mission challenge then asks the player to choose a route that trades science value against vehicle cost.

## 20. Technical Architecture Mapping

- Browser ANCHOR: visual game, planning workspace, simulation UI, official browser scoring/debrief, challenge/tutorial flow, benchmark UI, Headless Bundle Viewer.
- Portable JS core: shared contracts, deterministic model utilities, benchmark records, science diagnosis, water-column logic, solver-packet adapters, validation, and renderer-independent view models.
- Node/OceanBox-JS: canonical non-browser headless runtime for deterministic educational execution, solver-packet roundtrip, bundle generation, JSON/CSV artifacts, and public-safe summaries.
- Colab/Python: wrappers, solver examples, and artifact-analysis workflows. Colab/Python is not the simulator. Python/Colab is not the simulator either; it analyzes artifacts or calls Node/OceanBox-JS.
- Headless bundles: portable evidence packages for fields, observations, tracks, scores, water-column summaries, science diagnostics, and replay.
- Solver packets: visible mission context for external solvers without hidden truth unless explicit oracle/debug mode is used.
- Roundtrip reports: plan validation, execution summary, visibility checks, and browser/Colab-compatible report data.
- Learning Labs: concept-first explanations and lightweight widgets.
- Simulation Labs: inspectable model sandboxes for fields, uncertainty, priority, action value, benchmarks, headless artifacts, motion, and renderer architecture.

## 21. Current Implementation Status

### Implemented Foundation

- Product hub and Phaser shell.
- Simulation sandboxes for process, flow, coupled fields, uncertainty/forecast, sampling priority, and flow-coupled action value.
- Benchmark contracts and benchmark UI foundations.
- Adaptive science diagnosis and mission-manager handoff foundations.
- Node/OceanBox-JS headless runtime.
- Solver-packet/headless-bundle roundtrip.
- 2.5D water-column model and public-safe summaries.
- Renderer architecture boundary scaffold.

### Near-Term

- Motion dynamics hardening and motion-aware execution parity.
- Bathymetric/environment view hardening through the pluggable renderer boundary.
- Headless replay alignment with browser replay/debrief.
- Blind Discovery / Hidden-State Mode.
- Production mission scoring synthesis.
- Multi-glider coordination, redundancy, and assignment.
- Scenario/campaign packs and objective decks.

### Future Research

- WebGPU fluid coupling as optional visualization/sandbox work.
- Full autonomy environment contracts.
- MARL/RL wrappers around stable observation/action/reward schemas.
- External model ingestion with explicit source/claim labels.

## 22. Non-Goals

ANCHOR should remain honest about what it is not:

- not a calibrated ocean forecast
- not HYCOM/ROMS/CFD
- not production data assimilation
- not full 3D route planning yet
- not MARL/RL training yet
- not a Python simulator
- not a WebGPU-only product
- not replacing browser official scoring with headless score

Future work may connect to higher-fidelity models, 3D renderers, or autonomy research, but those additions must preserve visibility boundaries, scoring authority, static-host compatibility where practical, and the core player-facing mission loop.
ENV-R1 Bathymetric World View is the canonical visual bridge from top-down route intent to water-column science context: bathymetry is environmental geometry, not a replacement for 2.5D state or a terrain-flow ocean-current model.
## SCORE-R1 Shadow Mission Outcome Scoring

SCORE-R1 is shadow benchmark scoring. It does not replace official browser scoring, Challenge Mode scoring, leaderboard ranking, or existing debrief totals. Profiles are objective-aware and versioned; missing data is explicit; regret requires a compatible reference, and best-known attempt does not mean optimal. The Node/OceanBox-JS runtime remains the canonical headless runtime. Python/Colab analyzes exported artifacts or invokes Node; no Python simulator, planner, optimizer, MARL/RL, operational certification, SeaExplorer validation, or calibrated ocean forecast is added.

See [Mission Scoring and Regret](mission_scoring_and_regret.md) for the SCORE-R1 artifact contract and boundaries.