# Model Stack Integration Notes

## Scope

This checkpoint reviews overlap among the current educational field-math helpers:

- `src/core/demo/flow/FlowFieldMath.js`
- `src/core/demo/coupled/CoupledFieldMath.js`
- `src/core/demo/samplingPriority/SamplingPriorityFieldMath.js`
- `src/core/demo/flowCoupledSampling/FlowCoupledSamplingFieldMath.js`
- `src/core/demo/uncertainty/UncertaintyFieldMath.js`

It does not introduce a shared helper package or change demo behavior.

## Overlapping Helper Names

Repeated scalar-field helpers:

- `clamp01`
- `normalizeField`
- `fieldStats`
- `fieldDifference`
- `gradientMagnitude`
- `sampleBilinear`
- `maskField`
- shape / finite validation helpers such as `finiteFieldCheck`, `normalizeShape`, or equivalent local variants

Repeated grid construction helpers:

- `createGrid` in the coupled demo
- `createScalarField` in uncertainty and sampling-priority demos

Vector/current helpers are more specialized:

- `sampleVectorBilinear`
- `currentAssist`
- `crossCurrentMagnitude`
- `advectParticle`
- `advectParticles`
- `maskFlowByTerrain`
- `validateVectorField`

Flow-coupled sampling intentionally bridges both families by re-exporting scalar helpers from Sampling Priority and importing vector sampling from Flow Fields.

## Assessment

The duplication is acceptable for now.

Reasons:

- The demos are educational sandboxes with slightly different semantics.
- Coupled field math includes process evolution helpers such as Laplacian and semi-Lagrangian advection.
- Uncertainty field math includes observation-distance and kernel-smoothing helpers.
- Sampling Priority field math includes local maxima, threshold ambiguity, and candidate suppression.
- Flow Fields math is vector-first and reports diagnostics that do not belong in scalar-only demos.
- Flow-Coupled Sampling deliberately composes S1 scalar priority helpers with S2 glider-action helpers.

## Refactor Risk Now

A broad shared-field-math extraction would touch several validated demos at once. The risk is not algorithmic difficulty; it is contract drift:

- row/column and x/y conventions could diverge silently
- normalization behavior could change across demos
- export metadata could change shape
- existing smoke tests would need broader fixture updates
- pedagogical helper names might become less clear for students

## Recommendation

Keep duplication for now while the model stack is still being stabilized.

Benchmark Modes P0 defines the architecture skeleton for Planner Benchmark, Adaptive Benchmark, and Full Autonomy Benchmark. P1 adds adapter-only route-execution contracts around existing planning, simulation, and debrief systems. It does not implement a new planner, mission scoring redesign, or MARL. Consider a shared helper extraction only after route-execution data is exercised by real benchmark runs. At that point, consolidate the lowest-risk primitives first:

1. `clamp01`
2. row-major shape normalization
3. scalar `fieldStats`
4. scalar bilinear sampling
5. finite-field validation

Keep demo-specific helpers in their local modules until a benchmark mode or planner-facing API needs shared semantics.
## H0 Headless Alignment

The model stack now has a headless schema alignment layer. Process, flow, coupled, uncertainty, S1/S2, planner benchmark, and adaptive benchmark exports can be audited against future headless artifacts and Colab bundle roles. Hidden truth and oracle fields are visibility-sensitive and must not be included in public bundles by default.
