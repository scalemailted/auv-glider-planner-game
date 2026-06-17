# Adaptive Benchmark Multi-Leg Session

P8 adds a persistent Adaptive Benchmark episode session. It turns the P7 one-leg surfacing preview into a leg-by-leg adaptive mission workflow while still using the existing setup, planning, simulator, and debrief screens.

## What P8 Implements

- Adaptive episode session records with `anchor.benchmark.adaptive-episode-session`.
- Adaptive leg records with `anchor.benchmark.adaptive-leg` and export wrapper `anchor.benchmark.adaptive-leg-record`.
- Objective history across surfacing events.
- Surfacing decision history across legs.
- Next-leg handoff preservation.
- Local browser persistence for compact adaptive sessions.
- Save, load, delete, continue, and export controls in Debrief.
- Import and merge support for compatible adaptive session artifacts.

## Episode Session

An adaptive episode session stores the episode id, policy id, current leg index, current objective, leg records, surfacing decisions, next-leg handoffs, objective history, evidence summaries, and diagnosis summaries. It stores compact records only. It does not store full hidden truth fields, raw gridded tensors, raw levels, raw missions, or full result blobs.

## Leg Records

A leg record describes one adaptive leg: objective, route authority, optional plan/result ids, optional benchmark run or route-execution records, evidence summary, surfacing event, diagnosis, objective transition, next-leg handoff, status, and copied metrics. P8 does not recompute scores.

## Objective History

Objective history records what objective was active, what objective was recommended, the leg index, diagnosis id, confidence when available, and rationale. This is the main distinction from Planner Benchmark: Adaptive Benchmark records objective changes made by the mission manager at surfacing events.

## Save And Load

Adaptive sessions can be saved to browser `localStorage`. Persistence is compact and defensive: storage unavailability is handled gracefully, corrupted payloads report warnings, and large/raw fields are omitted. No backend storage or IndexedDB is added.

## Continue To Next Leg

Continue to Next Leg carries the recommended objective, episode id, manager state, objective history, information access tier, and route authority into the existing setup/planning flow. It does not generate waypoints or routes. The player or solver still plans the next route.

## Import And Merge

P8 can classify and merge compatible adaptive artifacts:

- `anchor.benchmark.adaptive-episode-session`
- `anchor.benchmark.adaptive-episode-trace`
- `anchor.benchmark.adaptive-surfacing-decision`
- `anchor.benchmark.adaptive-next-leg-config`
- `anchor.benchmark.adaptive-objective-transition`
- `anchor.benchmark.adaptive-manager-state`

Artifacts with a different episode id are treated as reference-only unless explicitly merged by compatible session logic. Imported payloads are cloned and not mutated.

## Export Types

P8 adds:

- `anchor.benchmark.adaptive-episode-session`
- `anchor.benchmark.adaptive-objective-history`
- `anchor.benchmark.adaptive-leg-record`
- `anchor.benchmark.adaptive-session-summary`

P6 and P7 adaptive exports remain supported.

## Boundaries

P8 does not add a new planner. It does not redesign scoring. It does not automatically run full multi-leg missions. It does not generate routes or waypoints. It does not implement full autonomy, MARL/RL, solver training, or production data assimilation.

Planner Benchmark remains fixed-objective attempt comparison. Adaptive Benchmark uses a mission manager to update objectives at surfacing events while the player or solver still chooses each route. Full Autonomy remains future and contract-only.

## P10 Adaptive Science-Diagnosis Handoff

Science diagnosis informs the mission-manager objective recommendation. It does not generate a route. Forecast correction means the expected field existed but was wrong. Hidden event hypothesis means observations may indicate a phenomenon not represented in the forecast. The player or solver still plans the route.

P10 adds adaptive science-diagnosis context, mission-manager rationale, next-leg handoff metadata, objective-history display fields, and public-safe headless/browser summaries. It does not implement a new planner, scoring redesign, production data assimilation, GP/GMRF production inference, calibrated ocean forecast, Python simulator, or MARL/RL. Node/OceanBox-JS remains the canonical non-browser runtime; Python/Colab analyze artifacts or call Node.