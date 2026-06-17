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

## P8 Multi-Leg Session Update

P8 keeps the P7 surfacing review and adds persistent adaptive episode sessions. A session stores compact leg records, surfacing decisions, next-leg handoffs, and objective history so the user can manually continue to the next leg. P8 does not generate routes, redesign scoring, or implement MARL/RL.

## P10 Adaptive Science-Diagnosis Handoff

Science diagnosis informs the mission-manager objective recommendation. It does not generate a route. Forecast correction means the expected field existed but was wrong. Hidden event hypothesis means observations may indicate a phenomenon not represented in the forecast. The player or solver still plans the route.

P10 adds adaptive science-diagnosis context, mission-manager rationale, next-leg handoff metadata, objective-history display fields, and public-safe headless/browser summaries. It does not implement a new planner, scoring redesign, production data assimilation, GP/GMRF production inference, calibrated ocean forecast, Python simulator, or MARL/RL. Node/OceanBox-JS remains the canonical non-browser runtime; Python/Colab analyze artifacts or call Node.