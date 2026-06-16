# Adaptive Benchmark Mission Manager

P6 makes Adaptive Benchmark a transparent mission-manager preview instead of only a placeholder.

Adaptive Benchmark means objective authority belongs to a rule-based mission manager. The player or solver still chooses the route for the active objective. This is distinct from Planner Benchmark, where the objective is fixed, and from Full Autonomy Benchmark, where a future solver or agent would choose both objective and route.

## Authority Split

- objective authority: `missionManager`
- route authority: `playerOrSolver`
- default information access: `beliefOnly`
- default world model: `stochasticBelief`

The manager recommends the next objective after surfacing or observation review. It does not generate a route, simulate a mission, compute a score, or train an agent.

## Diagnosis Inputs

The P6 diagnosis model uses synthetic educational evidence fields:

- observation count and recent observation count
- mean and maximum uncertainty
- surprise and forecast-error score
- hidden-event suspicion
- noise or false-alarm risk
- boundary ambiguity
- staleness / age-of-information pressure
- source-localization signal
- hazard and reachability pressure
- active and previous objective ids

These inputs are contract fields for preview and export. They are not production Bayesian inference, GP/GMRF inference, calibrated ocean data assimilation, or a vehicle controller.

## Diagnosis Categories

Supported diagnoses include forecast agreement, uncertainty reduction, likely forecast error, possible or likely hidden event, ambiguous boundary, stale region revisit, likely upstream source, hazard or reachability pressure, insufficient evidence, and likely noise or false alarm.

Examples:

- forecast error -> `validateForecast`
- hidden plume -> `confirmHiddenEvent`
- boundary ambiguity -> `mapBoundary`
- stale monitoring region -> `revisitStaleRegion`
- upstream plume evidence -> `localizeSource`
- sparse noisy evidence -> pause for more evidence

## Objective Transition Policy

The policy maps diagnoses to objective transitions such as:

- `switchToReduceUncertainty`
- `switchToValidateForecast`
- `switchToConfirmHiddenEvent`
- `switchToMapBoundary`
- `switchToLocalizeSource`
- `switchToRevisitStaleRegion`
- `switchToExploitKnownValue`
- `pauseForMoreEvidence`

Transition records export as `anchor.benchmark.adaptive-objective-transition` and preserve objective authority as `missionManager` with route authority as `playerOrSolver`.

## Surfacing / Communication Records

P6 defines surfacing and communication-window records for future adaptive execution loops. These records capture uploaded samples, observations received, whether diagnosis was triggered, and whether objective update was allowed. They are contract records only; P6 does not implement real communication scheduling.

## What P6 Implements

- mission-manager contract
- diagnosis model
- objective-transition policy
- mission-manager state
- surfacing / communication record contracts
- synthetic fixtures for manager decisions
- Adaptive Benchmark preview UI
- adaptive manager config, state, transition, surfacing event, and preview exports

## What P6 Does Not Implement

- adaptive route execution
- a new route planner
- scoring redesign
- full autonomy
- MARL/RL training
- production GP/GMRF inference
- not calibrated ocean data assimilation

Recommended next implementation is an execution-preview surfacing loop that still keeps route choice with the player or solver.

