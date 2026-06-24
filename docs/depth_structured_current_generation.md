# Depth-Structured Current Generation

FLOW-PKG-R2 adds versioned production current generation inside `packages/currents`.

## Backends

| Backend | Purpose | Default? |
|---|---|---:|
| `cpuBathymetryConditionedSyntheticV2` | Compatibility backend for existing generated-current behavior and parity fixtures. | No |
| `cpuBathymetryConditionedSyntheticV3` | Normal deterministic depth-structured synthetic backend for new mixed regional missions. | Yes |

V2 remains byte/digest compatible for old fixtures. Imported and legacy missions keep their declared behavior.

## Normal Mixed Regional Regime

Normal new regional missions use `mixedRegionalBaroclinicV1` through V3. A 4D artifact may contain barotropic or depth-structured currents. Equal currents across depth are valid only for an explicitly depth-uniform or vertically mixed regime.

V3 combines coherent components such as barotropic tide, shelf/along-isobath flow, surface-intensified wind shear, eddy structure, thermocline-centered flow, canyon exchange, calm regions, and bottom-boundary decay. Components declare vertical support. Depth variation is coherent and model-based, not random slab noise.

## Bathymetry

Bathymetry masks invalid depths and influences bottom-boundary behavior:

- land cells have no current;
- samples below the local seabed are masked and return zero vector with mask metadata;
- shallow columns may be effectively vertically mixed;
- deeper columns can carry stronger vertical structure;
- bottom-boundary decay uses physical depth in meters and local bottom depth.

Three.js displays vertical structure but does not generate it. Visual vertical exaggeration and layer spacing are presentation only.

## Claim Boundary

These profiles are deterministic synthetic benchmark fields. They are not calibrated forecasts, not real HYCOM, not Marine Copernicus, not ROMS, and not CFD validation. Real ocean-model validation remains a later oracle/data phase.