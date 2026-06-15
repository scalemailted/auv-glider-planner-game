# Coupled Fields Demo

## Purpose

The Coupled Fields Demo is now the Oracle / Deterministic Coupled Sampling Space playground. It combines:

```text
known process field C(x,y,t)
+ known flow field F(x,y,t) = <u,v>
+ known constraints C_mask(x,y)
= deterministic oracle sampling objective S*(x,y,t)
```

It is the bridge between the Process Lab and later stochastic planning work. Process Lab remains the place for CA/local-rule teaching and model-aware initial conditions. Coupled Fields adds analytical scalar update-function engines that are easier to connect to ocean-inspired process/flow interactions.

## Process Engines

The Process Engine selector includes:

- CA / Grid-Process Baseline
- Gaussian Patch / Moving Hotspot
- Source + Diffusion + Decay
- Advection + Diffusion + Decay
- Growth + Diffusion + Decay
- Front / Boundary Approximation

The default is `Advection + Diffusion + Decay`. It uses a stable semi-Lagrangian backtrace against the visible synthetic flow sampler, then applies lightweight diffusion, source, and decay terms. Flow `F(x,y,t)` comes from the same audited deterministic Flow Fields helpers and remains a teaching current field, not a calibrated forecast. These are deterministic synthetic teaching engines, not calibrated ocean models.

## Display Layers

The Display Layer selector separates the fields:

- Process Field `C(x,y,t)`
- Flow Field `F(x,y,t)`
- Constraint Mask `C_mask(x,y)`
- Oracle Objective `S*(x,y,t)`
- Gradient / Boundary Strength
- Future Process Field
- Objective Difference

Event/process intensity is not necessarily the same as sampling objective. A high process value may be unusable because of land or constraints, while a boundary or near-future value can be valuable even when the current process value is lower.

## Oracle Objective Boundary

The oracle objective uses known deterministic fields only:

```text
S* =
    w_value * processValue
  + w_gradient * gradientStrength
  + w_boundary * boundaryStrength
  + w_future * nearFutureValue
  - w_constraint * constraintPenalty
  - w_hazard * hazardPenalty
```

It does not use uncertainty, belief, hidden truth, forecast error, expected information gain, or Bayesian updating. Those belong in the Uncertainty / Forecast Demo and later stochastic coupled sampling work.

## Layout

- Left Mission Console: process engine selector, display layer selector, flow controls, legacy sample controls, coupling mode, layer toggles, playback speed, and export.
- Center Phaser viewport: selected scalar layer, optional flow arrows/particles, terrain/constraints, selected-cell highlight, and compact labels.
- Right panel: engine equation, plain-language explanation, validation status, deterministic/oracle boundary, and cell inspector.
- Bottom transport: Reset, Direction, Pause/Resume, Demo Time, Playback, selected engine, and Infinite timeline.

## Export

`Export Demo JSON` still writes `anchor.demo.coupled-fields`. Existing flow/sample fields are preserved. Flow inputs should be interpreted with the Flow Fields Demo claim boundary: deterministic synthetic, ocean-inspired current vectors, not HYCOM/ROMS/CFD. Exports now add:

- `coupledProcessEngine`: engine id, label, claim level, equation, parameters, grid spacing, and validation checks.
- `oracleObjective`: formula, weights, component names, deterministic flags, and a note that the objective uses known process, flow, and constraints.
- frame fields for `processField`, `futureProcessField`, `flowU`, `flowV`, `constraintMask`, `gradientStrength`, `boundaryStrength`, and `oracleObjectiveField`.

## Scientific Boundary

This demo is not ROMS, HYCOM, Delft3D, CFD, Navier-Stokes, Bayesian data assimilation, GP/GMRF inference, or an adaptive planner. It is a browser-side deterministic teaching sandbox for reasoning about how known process, known flow, constraints, gradients, and near-future fields shape a sampling objective.
