# Homegrown Model Scorecard

SCI-VALID-R1 scorecard for the current homegrown environment stack.

Passing visual and software tests does not establish oceanographic validity. The scorecard distinguishes deterministic software correctness, numerical verification, physical plausibility, external validation, and fit-for-purpose benchmarking.

| Package / Area | Deterministic Software Correctness | Numerical Verification | Physical Plausibility | External Validation | Fit-For-Purpose Benchmarking |
| --- | --- | --- | --- | --- | --- |
| Bathymetry | PASS. Package artifacts, manifests, samplers, digests, and browser-safety audits pass. | PASS. Manufactured flat/plane exactness and nonlinear convergence checks pass. | PARTIAL. Synthetic terrain includes coast, shelf, canyon, basin, ridge, island/seamount, masks, slope, and navigable-depth metadata. | FAIL / NOT PRESENT. No external survey comparison fixture is present. | PASS for deterministic synthetic terrain and route-feasibility regression; not for operational bathymetry. |
| Currents | PASS. 4D current field, sampler, diagnostics, depth/time axes, and source metadata are deterministic. | PASS. Manufactured current catalog checks interpolation and finite diagnostics; sinusoidal time interpolation is bounded, not exact. | PARTIAL. Production synthetic currents include bathymetry masks, coastline projection, isobath steering, vertical shear, temporal change, named components, and no below-bottom vectors. | FAIL / NOT PRESENT. No HYCOM, Copernicus, mooring, drifter, or glider-current comparison fixture is present. | PASS for current-aware route/sampler regression; not for calibrated forecast skill. |
| Scalar Processes | PASS. Volumetric scalar sampler and water-column observation metadata are deterministic. | PASS. Multilinear exactness, uniform field, decay, source-patch, and diffusion-style conservation/convergence checks pass. | LIMITED. Scalars are manufactured teaching fields and depth-layer fixtures. | FAIL / NOT PRESENT. No ecological, biogeochemical, or observed scalar reference fixture is present. | PASS for depth-aware sampling and artifact-contract regression; not for process forecast validity. |
| Environment Composition | PASS. Compact fixture and benchmark shortcut audit are deterministic and public-safe. | PARTIAL. Depends on bathymetry/current/scalar component checks. | PARTIAL. Composition preserves masks, depth, current, scalar values, and source-claim boundaries. | FAIL / NOT PRESENT. No external coupled environment reference exists. | PASS for synthetic benchmark fixtures if source claims stay explicit. |
| Mission Simulator Coupling | PASS. Mission/environment smoke verifies actual depth, resolved layer, current sample, scalar sample, and public-safe observation metadata. | PARTIAL. Coupling smoke is a contract check, not full dynamics verification. | LIMITED. Educational kinematic glider and water-column semantics remain simplified. | FAIL / NOT PRESENT. No vehicle-ocean field-validation dataset is present. | PASS for software/referee regression; not for physical vehicle certification. |

## Required Claim Language

Use these phrases when describing current generated fields:

- deterministic synthetic educational terrain
- scientifically constrained synthetic current field
- manufactured analytical fixture
- public-safe observation summary
- not calibrated bathymetry
- not an operational ocean forecast
- not real HYCOM or Marine Copernicus data
- not a Python simulator, planner, optimizer, or MARL/RL environment

## Next Validation Steps

1. Add external-reference bathymetry fixture support without changing package behavior.
2. Extract current contracts into `packages/currents` with the SCI-VALID-R1 manufactured current scripts as package gates.
3. Extract scalar-process contracts after current package ownership is stable.
4. Add explicit benchmark fixture metadata that distinguishes manufactured, synthetic, externally referenced, and calibrated sources.

## FLOW-PKG-R1 Current Package Note

packages/currents now owns pure 4D current contracts, artifacts, source metadata, sampler behavior, temporal boundaries, and scientific diagnostics. The package remains browser-safe, Node-safe, Worker-safe, and independent of src/, Three.js, Phaser, DOM, and UI lifecycle. Synthetic current claims remain bounded to deterministic benchmark fixtures, not calibrated ocean forecasts.
