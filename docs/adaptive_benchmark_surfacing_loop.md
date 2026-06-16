# Adaptive Benchmark Surfacing Loop

P7 connects Adaptive Benchmark mission-manager contracts to one executed preview leg in the existing mission flow.

## What P7 Implements

- Open Adaptive Benchmark Setup from the Benchmark Mode overview.
- Preserve mission-manager metadata through setup, planning, simulation, and debrief.
- Build a partial evidence snapshot from result/debrief observations and metrics.
- Run the transparent adaptive diagnosis model at surfacing/debrief time.
- Recommend the next objective with objective authority assigned to the mission manager.
- Keep route authority with the player or solver.
- Export surfacing decision, next-leg handoff, manager state, objective transition, and episode trace records.

## Adaptive Loop

Current objective -> player or solver plans route -> existing simulator executes route -> debrief produces observations and metrics -> surfacing event is recorded -> evidence snapshot is built -> mission manager diagnoses state -> objective transition is recommended -> user can manually plan the next leg.

## Evidence

Evidence is adapted from fields already present in result/debrief records. Missing uncertainty, hidden-event, staleness, boundary, or hazard fields produce partial-evidence warnings instead of crashes.

## Next-Leg Handoff

The next-leg config carries the recommended objective, manager state, objective history, transition, and fairness metadata. It does not contain generated waypoints or an automatic route.

## Episode Trace

The adaptive episode trace is an exportable record for future multi-leg adaptive execution. P7 stores one leg, surfacing decisions, objective history, evidence history, and export metadata when available.

## Not Implemented In P7

- New route planner.
- Automatic route generation.
- Full adaptive multi-leg execution.
- Scoring redesign.
- Full autonomy.
- MARL/RL.
- Production data assimilation or calibrated ocean forecasting.

Planner Benchmark remains the fixed-objective route comparison mode. Full Autonomy Benchmark remains contract-only.
