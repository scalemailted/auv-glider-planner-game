# Flow-Coupled Sampling Demo

The Flow-Coupled Sampling Demo is the S2 glider action-value sandbox. It computes:

```text
Q_glider(g,x,y,t)
```

This answers: given a global science-priority map, where should this specific glider go now?

It starts from S1-style global sampling priority:

```text
A_global(x,y,t)
```

Then it adjusts that field for direct-leg current assist/opposition, cross-current risk, travel distance, arrival time, energy cost, time window, hazards, accessibility, recent-sample redundancy, and optional two-glider redundancy preview. The Learning Lab [Sampling Priority to Glider Action Value](../labs/sampling-priority-to-glider-action-value.html) teaches why this is still one-step target evaluation rather than full route planning.

## Science Priority Is Not Action Value

- `A_global(x,y,t)` means a measurement is scientifically useful before vehicle routing.
- `Q_glider(g,x,y,t)` means the location is a good direct target for one selected glider now.
- A high-priority science target can be a bad glider action if it is too far away, current-opposed, hazardous, late, expensive, redundant, or unreachable.

## Formula

The transparent educational formula is:

```text
Q_glider =
    w_priority * A_global
  + w_future   * futurePriority
  + w_assist   * currentAssist
  - w_distance * travelDistance
  - w_time     * arrivalTime
  - w_energy   * energyCost
  - w_current  * currentOpposition
  - w_cross    * crossCurrentRisk
  - w_hazard   * hazardPenalty
  - w_window   * missedWindowPenalty
  - w_redundancy * redundancyPenalty
```

The result is normalized, then suppressed by reachability and accessibility masks.

## Scenarios

Seeded scenarios:

- Current-Assisted Target
- Current-Opposed Target
- Cross-Current Risk
- Downstream Intercept
- Hazard Gap
- Stale Near vs Valuable Far
- Two-Glider Redundancy Preview
- Mixed Flow Mission

## Methods

Action-value methods:

- Balanced Action Value
- Fastest Reachable
- Energy Aware
- Current Assisted
- Risk Avoidant
- Intercept Future Priority
- Redundancy Aware
- Science First

Candidate modes rank direct target cells for the selected glider. They do not build waypoint routes.

## Claim Boundary

This sandbox may claim educational glider-specific action-value modeling, flow-coupled target selection, current assist/opposition reasoning, reachability and timing intuition, energy/risk/redundancy-aware target ranking, and direct-leg target evaluation over a global science-priority map.

It is not full route planning, optimal path planning, MPC, A*, Dijkstra, RRT, reinforcement learning, multi-agent assignment, mission scoring, calibrated glider dynamics, a calibrated ocean forecast, or a production vehicle controller.

## Export

`Export Demo JSON` writes `type: "anchor.demo.flow-coupled-sampling"`.

The artifact includes:

- `flowCoupledSamplingModel`
- `gliderActionContext`
- `fields.globalPriorityField`
- `fields.futurePriorityField`
- `fields.flowU`
- `fields.flowV`
- `fields.currentAssistField`
- `fields.currentOppositionField`
- `fields.crossCurrentRiskField`
- `fields.travelDistanceField`
- `fields.arrivalTimeField`
- `fields.energyCostField`
- `fields.reachableMask`
- `fields.hazardField`
- `fields.redundancyPenaltyField`
- `fields.actionValueField`
- `candidateTargets`
- `actionValueDiagnostics`

Metadata explicitly sets `usesFlowCoupling: true`, `usesRoutePlanning: false`, and `usesMissionScoring: false`.

## Recommended Sequence

```text
Process Lab
-> Flow Fields Demo
-> Deterministic Coupled Demo
-> Uncertainty / Forecast Demo
-> Sampling Priority Demo
-> Flow-Coupled Sampling Demo
-> Planner / Mission Evaluation
```
