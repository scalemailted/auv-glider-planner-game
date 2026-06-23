# Manufactured Current Benchmarks

FLOW-R2A.3 adds manufactured analytical current fields for numerical validation. These are not ocean forecasts. They are small deterministic fields with known equations used to test the canonical sampler, interpolation, diagnostics, and glider-current parity.

Implemented fixtures:

- `uniformTranslation`: constant `u/v`, exact zero horizontal divergence.
- `linearShearWithDepth`: `u(z) = u0 + shear * z`, exact vertical interpolation.
- `oscillatingTide`: sinusoidal source-time fixture for deterministic reversal checks.
- `solidBodyEddy`: linear rotational field with near-zero divergence and known vorticity.
- `translatingEddy`: eddy center moves deterministically with mission time.
- `depthShearedEddy`: rotational field strength changes with physical depth.

The browser and headless Node path use the same `OceanCurrentField4D` and `OceanCurrentFieldSampler` modules.
