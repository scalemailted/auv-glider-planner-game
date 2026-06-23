# Environment Benchmark Suitability

SCI-VALID-R1 separates benchmark suitability from scientific calibration. Synthetic fixtures can be useful benchmarks without being externally validated ocean products.

## Package Decisions

| Area | Decision | Reason |
| --- | --- | --- |
| `packages/bathymetry` | Suitable for deterministic terrain regression and BATHY-PKG-R2. | Package owns artifacts, manifests, sampling, source metadata, and signed terrain helpers. Manufactured and ensemble checks now exist. External survey validation remains missing. |
| `packages/currents` | Suitable for FLOW-PKG-R1 extraction after this baseline. | Current logic has manufactured fixtures, 4D sampler checks, depth/time distinctness, diagnostics, and source-claim boundaries. It is still under `src/core/science`, so packaging should move logic behind compatibility forwarders. |
| `packages/scalar-processes` | Suitable for a later scalar package extraction. | Volumetric scalar sampling and water-column observations have manufactured checks. Ecological or biogeochemical forecast validation is not present. |
| `packages/environment` | Suitable after bathymetry/current/scalar ownership is clearer. | Environment composition can benchmark deterministic artifacts, but should not own low-level generators or renderer behavior. |
| `packages/mission-simulator` | Suitable for route-execution/referee regression, not physical vehicle certification. | Mission coupling checks verify sampler depth/context wiring. Full calibrated glider dynamics and ocean validation remain out of scope. |

## Go / No-Go

BATHY-PKG-R2: GO for richer package-level manufactured tests, external-reference metric scaffolding, fixture compactness checks, and source-claim guards. NO-GO for claims of calibrated bathymetry without external fixtures.

FLOW-PKG-R1: GO after SCI-VALID-R1 for extracting current contracts, manufactured catalog, sampler, diagnostics, and source metadata into `packages/currents` behind forwarding modules. NO-GO for calibrated forecast claims, real HYCOM/Copernicus claims, or WebGPU ownership.

SCALAR-PKG-R1: GO after current extraction stabilizes. It should package volumetric scalar fields, manufactured scalar processes, and observation/public-safety contracts. NO-GO for ecological forecast validity claims.

## Benchmark Shortcuts To Watch

The shortcut audit checks for repeated digests, degenerate wet/dry domains, weak depth/time current distinctness, and forbidden calibrated source claims. It does not prove realism. It is a guard against synthetic benchmark collapse.

Future benchmark phases should add external-oracle comparisons only as attributed fixtures with clear units, source metadata, and acceptance thresholds.