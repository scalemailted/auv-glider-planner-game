# Uncertainty / Forecast Demo

## Purpose

The Uncertainty / Forecast Demo is a browser-side belief-state playground. It teaches that the vehicle does not know hidden truth directly: it acts from forecast, belief, uncertainty, and observations.

The demo separates hidden truth, forecast/expected state, noisy observations, posterior-like belief, expected-state uncertainty, innovation, surprise, forecast error, unknown-event probability, and a sampling-priority preview.

This is an educational stochastic uncertainty sandbox. It is not a production GP/GMRF solver, Kalman/EnKF filter, calibrated data-assimilation system, operational ocean forecast, hydrodynamic model, mission planner, route optimizer, or real sensor-processing pipeline.

## Layer Concepts

- `T(x,y,t)` Hidden Truth: the synthetic reference phenomenon, shown only for teaching.
- `E(x,y,t)` Forecast / Expected State: what the model expected before observations.
- `mu(x,y,t)` Belief / Updated Estimate: a posterior-like educational estimate after observations.
- `U_expected(x,y,t)` Expected-State Uncertainty: how uncertain the expected state remains.
- `z_i` Observed Samples: noisy measurements from hidden truth.
- Innovation: `observed - expected`, shown as a display-normalized signed mismatch.
- Surprise: normalized forecast mismatch using innovation, uncertainty, and sensor noise.
- Forecast Error: where an expected layer exists but is wrong in location, timing, shape, or strength.
- Unknown-Event Probability: evidence that a phenomenon may exist but was missing from the forecast hypothesis.
- Sampling-Priority Preview: a non-route-aware preview of where sampling may be scientifically useful next.

## Forecast Error vs Hidden Unknown

Forecast error means: "We had a forecast, but it was wrong." Examples include a shifted front, weakened hotspot, late feature, or intensity mismatch.

Hidden unknown means: "We discovered something we did not know to look for." Examples include an unexpected plume or hidden bloom layer that was absent from the forecast.

The demo keeps these separate. Expected-state uncertainty is not unknown-event probability, and sampling priority is not event intensity. The full Sampling Priority Demo turns these ideas into a global vehicle-independent acquisition field A_global(x,y,t) without route planning or flow-coupled action value.

## Scenarios

Implemented deterministic seeded scenarios:

- Accurate Forecast
- Shifted Front
- Weakened Hotspot
- Hidden Plume
- Hidden Bloom Layer
- Noisy False Alarm
- Stale Monitoring Field

These are synthetic educational scenarios, not calibrated ocean scenarios.

## Observation And Belief Update

Samples use:

```text
z_i = T(x_i,y_i,t_i) + epsilon_i
```

The UI exposes sensor noise, sample count, observation path, update model, length scale, staleness rate, Add Samples, Update Belief, Reset Observations, and Reveal Truth.

Belief updates are educational models:

- No Update
- Nearest Sample Blend
- Kernel Smoother
- Bayesian-Lite Cell Update

Near observations, belief moves toward observed values and expected-state uncertainty decreases. Far from observations, belief remains closer to forecast. Staleness can increase uncertainty where information is old.

## Diagnosis Panel

The right/explanation panel reports:

- current layer and layer-specific color meaning
- scenario
- primary diagnosis
- forecast error score
- hidden-event confidence
- noise false-alarm risk
- mean uncertainty
- observation count
- mean surprise
- recommended response

Noisy false-alarm cases warn against overreacting to isolated samples. Hidden-event cases recommend confirmatory sampling. Forecast-error cases recommend correcting or validating the forecasted feature.

## Sampling-Priority Preview

The sampling-priority preview combines belief value, expected uncertainty, local surprise/forecast validation, unknown-event probability, staleness, and recent-sample redundancy.

It is not route planning. It has no travel-cost optimization, multi-agent assignment, mission scoring, or planner integration.

## Demo Artifact Export

`Export Demo JSON` downloads an `anchor.demo.uncertainty-forecast` artifact. It includes:

- `uncertaintyModel`
- `observationModel`
- `beliefState`
- `diagnostics`
- hidden truth, forecast, observations, belief, uncertainty, innovation, surprise, forecast error, unknown-event probability, sampling-priority preview
- legacy aliases such as `truth`, `informationGain`, and `deltaAfterUpdate`

Truth is exported because this is an educational demo artifact. Fair solver packets should use forecast, belief, uncertainty, and observations only unless an oracle export is explicitly labeled.

## Relationship To Other Demos

Process Lab teaches deterministic or seeded process evolution and sample-value interpretation.

Flow Fields Demo teaches deterministic synthetic current vectors `F(x,y,t)` and diagnostics.

Coupled Fields Demo teaches known process + known flow + known constraints + deterministic oracle objective. It intentionally does not use belief or uncertainty.

Stochastic Coupled Sampling Space comes later; it should build on this uncertainty demo before any full planner or MARL work.