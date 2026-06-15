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

- Foundational CA Models: simplified CA/grid-process-inspired teaching models that load editable component recipes.
- Ocean-Relevant Process Analogs: simplified environmental process analogs that load editable component recipes and bridge to later flow, uncertainty, and mission demos.
- Observable Process Patterns: bridge metadata used for mapping examples to legacy reference signatures; not a primary selector.
- Custom Composer: global primitive component editing, labeled Custom Exploratory unless mapped back to a validated signature.
- Process Paint: minimal non-uniform CA-style editor for assigning state, rule, group, and source value to selected cells.
- Rule Allocation Sandbox: seeded random state/rule/group allocation; exploratory unless constrained and validated against an example process.

Diagnostics is not a primary mode. Use Display / Diagnostic Layer and the right-panel Diagnostics tab to inspect states, topology, process influence messages, transitions, groups, and ROI roles for the active workflow.


## Discrete Generations And Rule Metrics

Foundational CA Models, Ocean-Relevant Process Analogs, Process Paint, and Rule Allocation Sandbox use a logical generation clock that is separate from the render frame rate. The canvas may render at browser speed, but process state advances only when the accumulated tick interval is reached or when `Step Generation` is clicked.

Default playback is `1 gen/s`. Available tick rates are `0.25`, `0.5`, `1`, `2`, `4`, and `8` generations per second. `Pause` stops logical updates, `Run` resumes them, `Reset` returns to generation 0, and `Step Generation` advances exactly one generation.

Guided process examples default to semantic displays instead of generic heat. `State View` colors deterministic cell states or phases. `Rule Metric` shows the selected model's rule-support layer, such as neighbor count, ignition pressure, infection pressure, threshold proximity, congestion pressure, or signal support. `Transition View` shows the next-transition class. `Sampling Interpretation` shows the derived sampling-value view, and `Source / Initial Field` shows the seeded substrate.

Conway-style local birth-death rules explain neighbor count, birth support, survival support, death, and remain-inactive classes. Forest Fire explains ignition pressure and consumed trail. SIR explains infection pressure and recovery. Excitable Wave, Sandpile, Traffic, and Wireworld expose wavefront/refractory, threshold, congestion, and signal-path metrics. Ocean analogs inherit the mapped rule metrics but remain process-layer analogs; physical downstream transport belongs in Flow Fields and Coupled Dynamic Sampling Space demos.

The foundation Learning Labs make the same boundary explicit: CA is a first modeling language and teaching/event-generation layer. More mission-grade environmental models should add advection, diffusion, source/sink, decay/growth, flow coupling, hidden truth, forecast/belief, uncertainty, observations, acquisition functions, and route-aware criteria before claiming final adaptive-sampling priority.
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


