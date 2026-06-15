# Deterministic Spatiotemporal Process Lab

Menu label: Process Lab. Legacy name: Sample / ROI Field Demo.

The Deterministic Spatiotemporal Process Lab teaches deterministic or seeded grid/cellular processes that generate a sampling-value field:

```text
S(x,y,t) = value interpretation of an evolving spatiotemporal process
```

ROI is the output interpretation: cells or regions currently or prospectively important to sample. ROI is not the core mechanism.

## Four Demo Boundary

1. Flow Fields Demo teaches vector fields `F(x,y,t)`: currents, eddies, drift, shear, and transport.
2. Process Lab teaches deterministic or seeded grid/cellular processes that produce `S(x,y,t)`.
3. Coupled Fields Demo combines flow, sampling processes, terrain, shoreline, and mission-relevant environmental structure.
4. Uncertainty / Forecast Demo teaches likelihood, belief, probability, uncertainty, forecast-vs-truth, stochastic scenarios, and information gain.

## Source / Initial Field

Source / Initial Field replaces Event Likelihood as the primary lab concept. It is a deterministic or seeded substrate that defines where a process starts, recurs, is constrained, or has initial support.

In this lab, Source / Initial Field is not uncertainty, belief, forecast probability, or Bayesian likelihood. Formal likelihood belongs in the Uncertainty / Forecast Demo. Legacy export aliases such as `eventLikelihoodField`, `likelihoodField`, and `likelihoodNodes` are preserved for compatibility.

## Modes

- Example Processes: simplified CA/grid-process-inspired examples that load editable component recipes. The selector is grouped into Foundational CA Models and Observable Process Patterns.
- Custom Composer: global primitive component editing, labeled Custom Exploratory unless mapped back to a validated signature.
- Process Paint: minimal non-uniform CA-style editor for assigning state, rule, group, and source value to selected cells.
- Rule Allocation Sandbox: seeded random state/rule/group allocation; exploratory unless constrained and validated against an example process.

Diagnostics is not a primary mode. Use Display / Diagnostic Layer and the right-panel Diagnostics tab to inspect states, topology, process influence messages, transitions, groups, and ROI roles for the active workflow.

## Process Layers

Exports preserve preferred process names and legacy aliases:

- `sourceField` plus legacy `eventLikelihoodField`
- `samplingValue` / `valueLayer` plus legacy `sampleValue`
- `stateLayer`
- `ruleLayer`
- `groupLayer`
- `transitionLayer`
- `roiRoleLayer`
- `processMessages` plus graph message compatibility fields

## Scientific Framing

The local CA taxonomy reference in `docs/references/2401.08408v2.pdf` is used as mechanism framing, not as a source of exact simulator implementations. The lab uses cells with states, initial/source fields, neighborhoods/graph edges, local update rules, multi-state behavior, extended-neighborhood graph behavior, non-uniform rule allocation, and memory/history-aware behavior as educational abstractions.
