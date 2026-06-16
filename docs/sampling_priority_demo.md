# Sampling Priority Demo

The Sampling Priority Demo is a browser-side modern sampling-selection sandbox. It computes a global, vehicle-independent acquisition field:

```text
A_global(x,y,t)
```

This answers: where would a measurement be scientifically useful next?

It does not answer: can this glider reach that location efficiently under flow?

That route-aware question belongs to the Flow-Coupled Sampling Demo, which computes glider-specific direct-leg action value Q_glider(g,x,y,t) after flow, reachability, energy, timing, hazards, and redundancy are considered. The Learning Lab [Sampling Priority to Glider Action Value](../labs/sampling-priority-to-glider-action-value.html) explains this transition without adding a new planner.

## Central Distinction

Event intensity is not sampling priority.

- `eventIntensity(x,y,t)` says what phenomenon is physically present or active.
- `trueRoi(x,y,t)` says what would be scientifically valuable if truth were known.
- `beliefRoi(x,y,t)` says what the forecast or belief currently thinks is valuable.
- `uncertainty(x,y,t)` says where the model is unsure.
- `samplingPriority(x,y,t)` says where a next measurement is useful before route planning.
- `candidateSamplePoints` are discrete proposed locations derived from the priority field.

## Components

The demo keeps these layers separate:

- Event Intensity
- True ROI / Oracle Scientific Value
- Forecast / Belief ROI
- Expected-State Uncertainty
- Boundary / Gradient Value
- Forecast-Validation Value
- Hidden-Event Suspicion
- Staleness / Revisit Value
- Hazard / Constraint Penalty
- Redundancy / Recent-Sample Penalty
- Sampling Priority
- Candidate Sample Points
- Priority vs Event Difference

## Formula

The default educational acquisition model is:

```text
A_global =
    w_value       * beliefRoi
  + w_uncertainty * expectedUncertainty
  + w_boundary    * boundaryStrength
  + w_forecast    * forecastValidation
  + w_unknown     * hiddenEventProbability
  + w_staleness   * staleness
  - hazard/redundancy/mask suppression
```

The final field is normalized and clamped to `[0,1]`.

It intentionally does not include travel cost, current risk, energy, reachability, vehicle assignment, or mission scoring.

## Scenarios

The seeded scenarios are:

- Known Hotspot
- Uncertain Front
- Forecast Validation
- Hidden Plume Follow-up
- Bloom Boundary
- Stale Monitoring
- Hazard Suppression
- Mixed Mission

These are synthetic educational scenarios, not calibrated ocean forecasts.

## Methods

The available sampling methods are:

- Weighted Acquisition
- Uncertainty Reduction
- Boundary Mapping
- Forecast Validation
- Hidden Event Follow-up
- Staleness / Revisit
- UCB-style
- Threshold Ambiguity
- Balanced Mission

Candidate modes include diverse top-K, local maxima, boundary, uncertainty, hidden-event, staleness, and forecast-validation candidates.

## Claim Boundary

This demo may claim educational acquisition / sampling-priority logic, synthetic belief/uncertainty weighting, forecast validation, hidden-event follow-up, staleness, hazard/redundancy suppression, and candidate generation.

It is not route planning, not flow-coupled action value, not a production GP/GMRF planner, not calibrated data assimilation, not an operational ocean forecast, not a vehicle controller, not a multi-agent assignment system, and not a mission scoring engine. The next sandbox is [Flow-Coupled Sampling Demo](flow_coupled_sampling_demo.md), which keeps route planning out of scope while adding glider-specific direct-target costs and risks.

## Export

`Export Demo JSON` writes `type: "anchor.demo.sampling-priority"`.

The artifact includes:

- `samplingPriorityModel`
- `fields.eventIntensityField`
- `fields.trueRoiField`
- `fields.beliefRoiField`
- `fields.expectedUncertaintyField`
- `fields.boundaryStrengthField`
- `fields.forecastValidationField`
- `fields.hiddenEventProbabilityField`
- `fields.stalenessField`
- `fields.hazardField`
- `fields.recentSamplePenaltyField`
- `fields.samplingPriorityField`
- `candidateSamplePoints`
- `priorityDiagnostics`

`priorityDiagnostics.usesRoutePlanning` and `priorityDiagnostics.usesFlowCoupling` are both `false`.

## Recommended Sequence

Use the sandboxes in this order:

```text
Process Lab
-> Flow Fields Demo
-> Deterministic Coupled Demo
-> Uncertainty / Forecast Demo
-> Sampling Priority Demo
-> Flow-Coupled Sampling Demo
-> Planner / Mission Evaluation
```
