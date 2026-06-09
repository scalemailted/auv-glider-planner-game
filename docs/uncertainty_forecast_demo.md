# Uncertainty / Forecast Demo

## Purpose

The Uncertainty / Forecast Demo teaches what is known, unknown, wrong, or learned in a forecast-planning setting.

It is separate from the pure Sample / ROI Demo. Sample value answers where sampling is valuable. Uncertainty answers where the planner does not know enough. Information gain answers where sampling is expected to teach the most.

## Forecast vs Truth

The demo distinguishes:

- `Truth`: the reference environment state.
- `Forecast`: the player or solver belief.
- `Forecast Error`: the absolute difference between forecast and truth.

Truth is visible in this demo for educational inspection only. Fair solver packets should use forecast-visible data and should not expose hidden truth unless an oracle export is explicitly labeled.

## Uncertainty

Uncertainty is a confidence/risk-of-being-wrong field. High uncertainty means the forecast is less reliable or under-observed. It is not the same as high sample value.

## Information Gain

Information Gain estimates where a sample would be useful because it reduces uncertainty. It combines uncertainty with whether the forecast value could plausibly change planning decisions.

## Forecast Error

Forecast Error shows where the forecast differs from truth. It is useful for teaching robust planning and for explaining why a plan that looked good under a forecast can score poorly against truth.

## Delta After Update

Delta After Update shows how much uncertainty was reduced by sample or surface-update events. Click a cell or use update buttons to create observations.

## Uncertainty Spatial Patterns

Implemented patterns:

- Uniform Uncertainty
- Gaussian Uncertainty Region
- Clustered Uncertainty
- Boundary / Front Uncertainty
- Sparse Unknown Targets
- Patchy Uncertainty
- High Uncertainty Near Unobserved Regions

## Uncertainty Temporal Behavior

Implemented behavior controls:

- Constant
- Growth Over Time
- Confidence Decay
- Bursty Forecast Breakdown
- Reduction After Sampling
- Recovery / Regrowth

These are deterministic seeded teaching fields, not operational forecast products.

## Update Models

Implemented update models:

- No Update
- Local Sample Update
- Neighbor Update
- Surface Update
- Global Refresh

Clicking a cell simulates a sample observation. `Apply Sample Update` observes the selected cell, `Surface Update` creates a larger center refresh, and `Reset Observations` clears the update history.

## Solver Fairness

Forecast-visible data can be used by fair solvers. Truth is hidden during fair planning. Oracle exports may expose truth, but they must be labeled as oracle/truth-assisted. This demo shows truth so students can learn the difference between belief and reference state.

## Relationship to Mission Modes

This demo supports:

- `Signal Hunt`: information gain and uncertainty reduction.
- `Uncertain Waters`: forecast/truth mismatch.
- `Surface & Adapt`: update after surfacing.
- `Forecast Chase`: confidence decay over time.

## Relationship to Sample / ROI Demo

The Sample / ROI Demo focuses on value patterns: where reward appears, changes, depletes, and recovers. It does not show forecast/truth, uncertainty, or information gain controls. Those concepts belong here.

## Limitations

- Update effects are deterministic visual diagnostics.
- Truth visibility is educational and should not be interpreted as fair solver visibility.
- This is not a full Bayesian filter, data assimilation system, or operational ocean forecast.
- The demo does not create missions, waypoint plans, scores, or leaderboard records.
