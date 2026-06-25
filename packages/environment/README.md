# @anchor/environment

`@anchor/environment` composes canonical bathymetry, current, and scalar-process artifacts into one environment manifest, field registry, validation report, provenance summary, and physical-coordinate sampler.

ENV-PKG-R1 is a composition package. It does not generate bathymetry, current, or scalar science fields; those equations stay in `@anchor/bathymetry`, `@anchor/currents`, and `@anchor/scalar-processes` or app-owned compatibility adapters.

## Owns

- canonical environment manifests
- composed environment artifacts
- environment identity and digests
- field registry entries with truth/forecast/belief/uncertainty/priority roles
- cross-artifact validation
- provenance and component-digest aggregation
- unified physical-coordinate sampling for bathymetry, currents, and scalars

## Does Not Own

- scientific generation equations
- visibility policy for truth/forecast/belief layers
- observation noise or belief updates
- mission execution, glider physics, or scoring
- renderer state, DOM, Phaser, Three.js, or player UI

## Compatibility

Component grids may use different resolutions and axes. Sampling is in physical east/north/depth/time coordinates and delegates to each component package. Known local-meter frame labels `localEastNorthDown` and `localTangentPlaneMetersV1` are accepted as compatible with a warning; unrelated frame mismatches remain validation errors.

Synthetic environments are benchmark-oriented and are not operational ocean forecasts, calibrated ocean products, or certified navigation products.