# ANCHOR Path-Plotting Experimental Sandbox Lifecycle

ANCHOR is a browser-based AUV/glider path-planning sandbox for experimenting with deterministic and stochastic mission planning, route validation, surfacing/replanning, external solvers, and replayable challenge workflows.

The project is designed around a simple principle:

```text
play → understand → export → solve externally → import → validate → simulate → compare → learn
```

The browser game remains the visual command console, simulator, validator, and scorer. External tools propose plans. ANCHOR decides whether those plans are valid, simulates them, and records the result.

---

## 1. Motivation

AUV/glider mission planning is not just a shortest-path problem. A useful mission planner must reason about:

* changing current fields,
* terrain and land blocking,
* fuel and energy limits,
* mission duration,
* time-varying ROI/sample value,
* priority targets,
* stochastic forecasts,
* forecast confidence and hidden truth,
* surfacing/update windows,
* multi-agent coordination,
* route failure and recovery.

ANCHOR provides an interactive way to see these constraints in action.

The goal is not only to play the mission manually. The goal is to create a computational-science sandbox where human planners, baseline algorithms, external solvers, and future learning-based methods can be compared under the same mission rules.

---

## 2. Core Design Rule

ANCHOR uses a referee model:

```text
Solver proposes.
Game validates.
Game simulates.
Game scores.
```

External solvers are allowed to produce waypoint plans, but they do not get to decide whether the route is legal. The browser game imports the plan, validates it against terrain, time, fuel, reachability, surfacing rules, and stochastic visibility constraints, then simulates and scores the result.

This keeps the workflow fair and reproducible.

---

## 3. Primary Workflow: Browser Game Only

The simplest lifecycle is fully inside the browser.

```text
1. Generate or load a challenge.
2. Read the mission briefing.
3. Inspect terrain, currents, ROI, risk, travel cost, and timing.
4. Place waypoints manually or run an internal planner.
5. Validate the route.
6. Press Play.
7. Simulate the mission.
8. Surface, replan, recover, or continue when events occur.
9. Reach debrief.
10. Save/export the result.
11. Compare against prior attempts.
```

This is the baseline gameplay loop.

---

## 4. Internal Planner Workflow

ANCHOR includes internal planning tools such as Temporal Greedy.

The intended internal planner lifecycle is:

```text
1. User clicks a planner button.
2. Planner enters a busy/processing state.
3. Planner computes a candidate route.
4. Planner validates every segment before accepting it.
5. Planner performs a final route audit before installing the plan.
6. If valid, the plan appears in the map, waypoint panel, and timeline.
7. If invalid, the planner reports why it stopped or what failed.
8. User presses Play.
9. Play validation runs again as the final gate.
```

Temporal Greedy should not emit blocked paths, dead-zone paths, or routes that the simulator will immediately reject. If a region is unreachable, the planner, route validator, travel-cost layer, risk/safety layer, and simulator should all agree.

---

## 5. External Solver Workflow: File-Based JSON

The first external-solver workflow is file-based. It works with any external tool that can read and write JSON.

```text
1. ANCHOR exports anchor.solver-packet.json.
2. External solver reads the packet.
3. External solver computes a route.
4. External solver writes anchor.plan.json.
5. ANCHOR imports the plan.
6. ANCHOR validates the plan.
7. If valid, ANCHOR simulates and scores it.
8. ANCHOR exports anchor.result.json.
```

This is the primary external solver contract.

The solver packet contains the information a fair planner is allowed to know. It should include visible terrain, mission rules, agent specs, deployment options, forecast-visible currents, visible ROI/probability/expected value, and fairness metadata.

It should not include hidden truth unless the export is explicitly an oracle/research dataset.

---

## 6. External Solver Workflow: Google Colab Template

ANCHOR includes a Google Colab external solver template.

The Colab workflow is:

```text
1. Export anchor.solver-packet.json from ANCHOR.
2. Open the Colab external solver notebook.
3. Upload or load the solver packet.
4. Reconstruct a lightweight headless planning world.
5. Run a starter solver or custom solver.
6. Export anchor.plan.json.
7. Import anchor.plan.json into ANCHOR.
8. Let ANCHOR validate, simulate, and score the plan.
```

The Colab notebook is a planning mirror. It is not the official simulator.

The browser game remains authoritative:

```text
Colab proposes.
ANCHOR validates.
ANCHOR simulates.
ANCHOR scores.
```

The default Colab workflow is forecast-only:

```json
{
  "usesForecast": true,
  "usesTruth": false,
  "usesOracle": false
}
```

Oracle or hidden-truth workflows must be explicitly labeled and should not be compared as fair leaderboard entries unless the user intentionally allows oracle comparisons.

---

## 7. External Solver Workflow: Node.js Headless Solver

ANCHOR also supports a JavaScript/Node.js headless solver path.

This exists to reduce translation drift between the browser game and external solver tooling. Instead of reimplementing everything in Python, the Node path can reuse portable JavaScript modules from ANCHOR’s core logic.

Example commands:

```bash
node tools/js/headless_solver.mjs anchor.solver-packet.json anchor.plan.json

node tools/js/headless_solver.mjs anchor.solver-packet.json anchor.plan.json --planner greedy --debug

node tools/js/headless_validate_plan.mjs anchor.solver-packet.json anchor.plan.json
```

The Node headless path should not import Phaser, DOM panels, browser UI, scenes, or overlays. It should operate only on portable data and core logic.

The intended boundary is:

```text
Portable core:
  solver packet parsing
  headless planning world
  route preflight validation
  plan export
  fairness metadata

Browser-only:
  Phaser rendering
  DOM panels
  modals
  click handlers
  visual overlays
```

This makes the Node path a higher-fidelity solver/validation mirror while still leaving final simulation and scoring to ANCHOR.

---

## 8. Surface-Update Workflow

AUV/glider missions often involve surfacing windows. At a surface event, the vehicle can observe updated state, refresh forecasts, and receive new instructions.

The manual surface-update lifecycle is:

```text
1. Game runs mission.
2. Glider reaches a surface/update window.
3. Game pauses.
4. Game exports anchor.surface-observation.json.
5. External solver reads the observed state.
6. Solver computes the next route segment.
7. Solver writes anchor.plan-segment.json.
8. Game imports the segment.
9. Game validates the segment from the actual surfaced position.
10. Game replaces future waypoints for that surfaced agent.
11. Game continues the mission.
```

This workflow is more cumbersome manually, but it is important because it models adaptive replanning under uncertainty.

The plan segment should target a specific agent and surface/update instance. It should not overwrite completed route history. It should replace only future waypoints by default.

---

## 9. Future Automation: Shared-Folder Solver Exchange

The preferred future automation layer is a shared-folder solver exchange.

This keeps the browser-first architecture and JSON contracts while reducing manual upload/download friction.

Proposed layout:

```text
anchor-exchange/
  outbound/
    observations and solver packets written by ANCHOR

  inbound/
    plan and plan-segment files written by solvers

  applied/
    solver outputs accepted by ANCHOR

  rejected/
    solver outputs rejected by validation

  archive/
    timestamped record of observations, plans, and results
```

The future automated loop is:

```text
1. Glider surfaces.
2. ANCHOR writes a surface-observation JSON file to outbound/.
3. External solver watches outbound/.
4. Solver writes a plan-segment JSON file to inbound/.
5. ANCHOR polls inbound/.
6. ANCHOR detects the solver output.
7. ANCHOR validates it.
8. If valid, ANCHOR applies it and continues.
9. If invalid, ANCHOR rejects it and explains why.
```

Every inbound file should include:

```text
gameId
challengeId
agentId
surfaceId
surfaceVersion
missionTime
planner metadata
usesForecast / usesTruth / usesOracle
```

This prevents stale solver output from being applied to the wrong mission state.

The safety rule remains unchanged:

```text
Automation does not bypass validation.
```

---

## 10. Future Automation: Optional HTTP Bridge

A local HTTP bridge may be added later, but it should not be the foundation.

The bridge would be an optional advanced layer for solver clients that want to query and command a running local game instance.

Example future routes:

```text
GET  /api/games/:gameId/state
GET  /api/games/:gameId/solver-packet
GET  /api/games/:gameId/surfaces/:surfaceId/observation

POST /api/games/:gameId/surfaces/:surfaceId/plan-segment
POST /api/games/:gameId/agents/:agentId/waypoints
POST /api/games/:gameId/commands/play
POST /api/games/:gameId/commands/pause
POST /api/games/:gameId/commands/continue
```

The local bridge should be a transport/control layer only. It should not become a second simulator.

The browser game remains authoritative.

---

## 11. Replay and Reproducibility

ANCHOR uses replay metadata so generated challenges and saved paths can be reproduced.

The intended replay contract is:

```text
same challenge UUID
+ same generation config
+ same generator version
+ same derived seeds
= same generated challenge state
```

Saved attempts and best paths should preserve:

```text
challengeId
replaySeedAnchor
generationVersion
generationConfig
derivedSeeds
planned waypoints
actual path frames
result summary
fairness metadata
exact replay availability
```

For generated challenges, this supports exact replay by UUID/seed contract.

For custom/imported/tutorial challenges, exact replay usually requires a saved snapshot unless a compatible generation contract exists.

---

## 12. Best Path Lifecycle

A completed run can become a best prior run.

The intended lifecycle is:

```text
1. User completes a mission.
2. ANCHOR saves the attempt.
3. BestAttemptSelector identifies the best prior path for that challenge.
4. User replays the challenge.
5. Analysis panel shows best prior run diagnostics.
6. User can show the best path overlay.
7. User can load the best path as the current editable plan.
8. User can rerun the best path.
9. User can export the best path.
```

A best path should not be just a line on the map. It should include:

```text
planned waypoints
actual executed path
challenge/replay metadata
planner label
result summary
fairness flags
```

If a record lacks planned waypoints, it may still be shown as an overlay, but it may not be loadable as an editable plan.

---

## 13. Stochastic Fairness Rules

Stochastic missions must distinguish between:

```text
forecast-visible state
observed/revealed state
hidden truth
oracle/research data
```

A fair planner may use:

```text
visible forecast
forecast confidence
known terrain/depth/hazards
visible ROI/probability/expected value
agent state
surface observations already revealed
mission rules
```

A fair planner may not use:

```text
hidden future truth
actual future current realization
unrevealed stochastic target truth
oracle datasets
```

Unless explicitly labeled as oracle-assisted.

Plans should carry metadata:

```json
{
  "planner": {
    "usesForecast": true,
    "usesTruth": false,
    "usesOracle": false
  }
}
```

Oracle plans should be useful for research and benchmarking, but they should not be silently mixed with fair leaderboard entries.

---

## 14. Validation Philosophy

ANCHOR should validate every route before simulation.

The Play button should be a final gate:

```text
Click Play
→ validate selected route/fleet plan
→ if valid, start simulation
→ if invalid, block simulation and explain why
```

Invalid routes should show:

```text
offending waypoint
offending segment
blocking reason
fix hint
red/orange visual markers
```

Examples of blocking errors:

```text
waypoint on land
segment crosses land
unreachable dead zone
out of bounds coordinate
mission time exceeded
fuel exceeded
no valid start
```

Examples of warnings:

```text
shoreline current risk
low forecast confidence near land
near hazard
low fuel margin
```

Simulation should not be the first system to discover a route was already invalid.

---

## 15. Core Product Concept

ANCHOR is not only a game and not only a planner. It is a path-plotting experimental sandbox.

It supports:

```text
manual planning
internal baseline planners
Colab/Python external solvers
Node.js headless JavaScript solvers
future shared-folder automation
future local HTTP bridge
replayable challenge seeds
fair and oracle comparison modes
```

The project should preserve this hierarchy:

```text
Static browser game first.
JSON contracts as the API.
External solvers as proposal engines.
ANCHOR as validator, simulator, scorer, and visual command console.
```

The guiding sentence is:

```text
A gamified naval computational-science sandbox for deterministic and stochastic multi-agent AUV glider path planning.
```

