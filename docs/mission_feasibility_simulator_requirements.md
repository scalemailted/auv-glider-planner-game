# Mission Feasibility Simulator and Scientific Benchmark Requirements

This document defines what ANCHOR must eventually simulate, export, validate, and report to be considered a scientifically grounded synthetic AUV/glider mission-planning benchmark. It is a target and acceptance spec, not an implementation changelog.

## 1. Purpose

ANCHOR is evolving from a scientific game and sampling-priority simulator toward a mission-feasibility benchmark. The key question is:

"Can this glider or fleet actually execute this mission plan under currents, bathymetry, flight profile, payload, energy, communication, and sampling constraints?"

The current project already has a browser game/referee UI, portable JavaScript contracts, Node/OceanBox-JS headless artifacts, 2.5D water-column summaries, science diagnosis, and motion-aware execution foundations. SIM-R1 should turn those foundations into a clearer feasibility benchmark target without claiming operational simulator fidelity before evidence exists.

## 2. What Scientifically Grounded Means Here

Scientifically grounded does not mean operational certification, calibrated ocean forecasting, production data assimilation, or SeaExplorer-specific accuracy. In ANCHOR it means:

- physically meaningful state variables
- explicit assumptions
- reproducible synthetic scenarios
- interpretable mission metrics
- documented visibility tiers
- validation tiers
- clear distinction between game/education, synthetic benchmark, and operational simulator
- no hidden-truth leakage in fair planner/solver artifacts

A useful SeaExplorer underwater glider simulator paper provides a credibility target: time-varying 4D environment, battery/duration/distance estimates, replanning support, flight profiles, mono- and multi-vehicle scenarios, high-level planner outputs, consumption forecasts, metrics reports, scenario comparisons, weighted graph adjacency matrices, and comparison against real mission data. ANCHOR should treat that as a requirements target, not as a claim that ANCHOR already matches SeaExplorer fidelity.

## 3. Required Environmental Model

A mission-feasibility simulator should target:

- 4D current field: `F(x,y,z,t)`
- 3D/2.5D bathymetry and depth constraints
- water-column layers
- depth-dependent currents
- land/sea and constraint masks
- hazard fields
- forecast / belief / hidden truth separation
- uncertainty and staleness
- optional hidden-event probability
- public-safe environmental summaries

Bathymetry is geometry and constraint context. Terrain-flow accumulation is not ocean current. Ocean current remains `F(x,y,z,t)`.

## 4. Required Vehicle / Glider Model

Educational glider state should include:

- x, y, depth/depthLayer
- heading
- speed through water
- pitch / dive profile
- vertical speed
- energy remaining
- battery fraction
- sensor/payload state
- communication/surfacing state

Control and navigation abstractions should include:

- waypoint tracking
- heading target
- dive profile
- surface-and-report
- sample-and-continue
- station-keeping, future

Flight-profile / dive-profile abstractions should include:

- `surfaceOnly`
- `thermoclineDive`
- `deepDive`
- `fullProfile` / `sawtoothProfile`
- future `adaptiveVerticalProfile`, contract-only

A glider mission simulator needs more than waypoint geometry; it needs a realized vehicle trajectory.

## 5. Planning, Navigation, and Control Levels

Planning level: mission objective, route intent, waypoint sequence, solver packet.

Navigation level: heading target, dive profile, depth target, surfacing/communication plan.

Motion/control abstraction: realized trajectory, current drift, turn limits, pitch/depth-change limits, and energy use.

ANCHOR does not need full real actuator or PID modeling immediately. It should expose scientifically meaningful approximations that are deterministic, documented, and comparable across browser/headless artifacts.

## 6. Planned vs Realized vs Sampled Path

Planned route: what the player or solver commanded.

Realized trajectory: what the glider actually did under currents and control limits.

Sampled path: where observations were actually collected.

This distinction matters because current drift can move the glider away from the intended path, sampling happens at realized positions, planned path and science outcome may diverge, and motion planning is different from path planning.

## 7. Required Mission Metrics

Feasibility metrics:

- mission duration
- total distance commanded
- realized distance traveled
- waypoint validation success
- arrival status
- missed waypoint count
- bottom-clearance warnings
- constraint/hazard violations

Motion metrics:

- mean track error
- max track error
- drift distance
- current assist
- current opposition
- cross-current magnitude
- realized vs planned trajectory difference

Energy metrics:

- total energy used
- remaining energy
- battery fraction
- navigation energy
- payload/sensor energy
- surfacing/communication cost
- turn cost
- dive/depth-change cost
- current-opposition penalty

Science metrics:

- observation count
- sampled depth layers
- vertical coverage
- uncertainty reduction
- forecast validation value
- hidden-event confirmation value
- source/localization value
- front/boundary mapping value
- staleness/revisit value

Fleet metrics, future:

- redundancy
- coverage balance
- per-glider contribution
- communication windows
- spacing / collision-risk diagnostics

## 8. Required Payload / Sensor Model

Educational payload requirements:

- sensor type
- sensor active/inactive state
- sensor sampling rate
- sensor noise
- sensor energy cost
- measurement variable
- depth-layer compatibility
- payload duty cycle
- communication upload events

Payload energy should be separate from navigation energy when possible.

## 9. Cost Graph / Adjacency Matrix Benchmark Layer

Future target export types:

- `anchor.benchmark.feasibility-cost-graph`
- `anchor.headless.motion-cost-matrix`

Edge fields should include:

```json
{
  "fromNode": "node-a",
  "toNode": "node-b",
  "distanceCost": 0,
  "timeCost": 0,
  "energyCost": 0,
  "currentAssist": 0,
  "currentOpposition": 0,
  "crossCurrentRisk": 0,
  "bathymetryRisk": 0,
  "expectedTrackError": 0,
  "depthProfileId": "surfaceOnly",
  "payloadMode": "default",
  "visibilityTier": "forecast-visible",
  "warnings": []
}
```

A cost graph or adjacency matrix lets external planners compare routes against simulator-derived energy, time, distance, and risk costs instead of raw grid distance. This should support distance-weighted planning, time-weighted planning, energy-weighted planning, science-value-weighted planning, and motion-feasibility-aware planning.

This layer is a SIM-R1 target unless a specific artifact exists and is explicitly documented as implemented.

## 10. Scenario Comparison Requirements

ANCHOR should support comparing:

- same objective, different route
- same route, different start/drop point
- same route, different dive profile
- same route, different payload profile
- same route, different current field
- same plan, different forecast error
- one glider vs fleet
- path-only vs motion-aware execution

Comparison outputs should include:

- score table
- mission duration
- energy remaining
- realized distance
- science value
- vertical coverage
- hidden discovery result
- regret/missed opportunity
- feasibility warnings

## 11. Validation Tiers

### Tier 0 - Educational Synthetic Consistency

- deterministic seeds
- no NaN/invalid fields
- public hidden-truth safety
- smoke tests
- scenario invariants

### Tier 1 - Physics / Motion Sanity

- current assist improves travel feasibility
- current opposition increases cost
- cross-current increases track error
- energy decreases monotonically
- dive/depth changes cost energy
- depth constraints and bottom clearance are enforced

### Tier 2 - Benchmark Reproducibility

- same seed + same plan + same runtime version = same trajectory/report/bundle
- solver packet / plan / result schemas are stable
- browser and Node summaries agree within documented tolerance

### Tier 3 - Reference Scenario Calibration

- compare synthetic cases against known analytical or published examples
- verify qualitative current / energy / route tradeoffs

### Tier 4 - Real Mission Validation, Future

- compare selected scenarios against real mission logs or published mission metrics
- label limitations clearly
- never imply operational certification without evidence

## 12. Relationship to Current ANCHOR Phases

P11: 2.5D water-column sampling and depth-layer observations.

MOTION-R1: planned vs realized trajectory and motion-aware execution.

SIM-R1: mission feasibility simulator and cost-matrix benchmark layer.

H4: headless replay / browser replay alignment.

SCORE-R1: production scoring and regret synthesis.

P12: multi-glider cooperative mission feasibility.

GFX/ENV: 3D bathymetry and visualization, not simulation authority.

## 13. Required Exports and Records

Current or foundation records include:

- `anchor.motion.trajectory`
- `anchor.motion.control-trace`
- `anchor.motion.diagnostics`
- `anchor.benchmark.mission-feasibility-report`, MOTION-R1 skeleton
- `anchor.headless.motion-diagnostics`
- `anchor.headless.water-column-summary`
- `anchor.headless.science-diagnostics`

Future target records include:

- `anchor.benchmark.feasibility-cost-graph`
- `anchor.headless.motion-cost-matrix`
- `anchor.benchmark.scenario-comparison-report`

The mission-feasibility report is currently a MOTION-R1 skeleton. The remaining future target records are requirements, not implementation claims.

## 14. Claim Boundaries

ANCHOR is not currently:

- not a certified operational glider simulator
- not a calibrated HYCOM/ROMS/CFD ocean forecast
- not a production data-assimilation system
- not a SeaExplorer-specific validated simulator
- a full 3D vehicle controller
- not a Python simulator
- not a MARL/RL training implementation

ANCHOR is targeting:

- a scientifically grounded synthetic benchmark
- an educational mission simulator
- a reproducible headless runtime
- a browser visual/referee environment
- a future-ready interface for solvers and learning agents

Required shorthand boundaries: ANCHOR is not a Python simulator, not a calibrated ocean forecast, and not MARL/RL.

## 15. Production Acceptance Checklist

- [ ] 4D current fields represented or approximated
- [ ] bathymetry/depth constraints represented
- [ ] dive/flight profiles represented
- [ ] planned vs realized trajectory exported
- [ ] observations tied to realized x/y/depth/time
- [ ] battery/energy metrics reported
- [ ] mission duration reported
- [ ] distance traveled reported
- [ ] payload/sensor energy represented
- [ ] surfacing/communication represented
- [ ] waypoint validation reported
- [ ] public artifacts hide hidden truth
- [ ] cost graph / adjacency matrix export available
- [ ] scenario comparison report available
- [ ] validation tiers documented and tested
- [ ] limitations visible in UI/docs
## SCORE-R1 Shadow Mission Outcome Scoring

SCORE-R1 is shadow benchmark scoring. It does not replace official browser scoring, Challenge Mode scoring, leaderboard ranking, or existing debrief totals. Profiles are objective-aware and versioned; missing data is explicit; regret requires a compatible reference, and best-known attempt does not mean optimal. The Node/OceanBox-JS runtime remains the canonical headless runtime. Python/Colab analyzes exported artifacts or invokes Node; no Python simulator, planner, optimizer, MARL/RL, operational certification, SeaExplorer validation, or calibrated ocean forecast is added.

See [Mission Scoring and Regret](mission_scoring_and_regret.md) for the SCORE-R1 artifact contract and boundaries.