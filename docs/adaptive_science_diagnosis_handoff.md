# Adaptive Science-Diagnosis Handoff

P10 hardens the Adaptive Benchmark handoff between science diagnosis and mission-manager objective recommendation.

Science diagnosis is evidence/context. It is not planner authority.

## Evidence vs Diagnosis vs Recommendation vs Route

- Evidence is the compact observation, surprise, coherence, and caveat summary available at surfacing/debrief time.
- Diagnosis separates forecast correction from hidden-event hypothesis, noise, or insufficient evidence.
- Recommendation is the mission-manager objective choice for the next leg.
- Route planning remains with the player or solver.

Science diagnosis informs the mission-manager recommendation. It does not generate a route.

## Forecast Update Card

Forecast correction means the expected field existed but was wrong. The correction may refer to position, strength, timing, boundary, or depth/layer mismatch, but P10 does not implement production data assimilation or GP/GMRF inference.

## Discovery Update Card

Hidden event hypothesis means observations may indicate a phenomenon not represented in the forecast. P10 records confidence, event-family hints, and caveats for follow-up, but it does not confirm hidden truth for public planning artifacts.

## Mission-Manager Rationale

The mission manager explains why an objective was recommended, including current objective, recommended objective, evidence summary, science diagnosis context, alternatives, confidence, and caveats.

Objective authority belongs to the mission manager. Route authority remains `playerOrSolver`.

## Next-Leg Handoff Metadata

Next-leg handoff records carry the recommended objective, science diagnosis context, mission-manager rationale, and carry-forward evidence summary. They explicitly record:

- `diagnosisIsPlannerAuthority: false`
- `generatedRoute: false`
- `generatesWaypoints: false`
- `routeAuthority: "playerOrSolver"`

## Objective History

Adaptive episode/session history can show primary science diagnosis, forecast correction status, hidden event status, confidence, rationale, and recommended objective for each leg. Older P8 records remain valid when this context is absent.

## Public Safety

Public summaries must not include hidden truth payloads such as `T_hiddenTruth`. Headless and browser summaries may mention field names while still omitting hidden arrays.

## What P10 Does Not Implement

P10 does not add a new planner, waypoint generation, scoring redesign, production data assimilation, calibrated ocean forecasting, GP/GMRF production inference, MARL/RL, a Python simulator, or backend services.

Node/OceanBox-JS remains the canonical non-browser runtime. Python/Colab workflows analyze artifacts or call Node; they do not reimplement simulation.