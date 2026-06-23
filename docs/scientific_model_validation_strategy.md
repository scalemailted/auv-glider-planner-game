# Scientific Model Validation Strategy

ARCH-R1 introduces package-level validation as a boundary concept. It does not replace the existing smoke, audit, and E2E suites.

## Validation Layers

1. Contract validation

   Checks schema shape, units, coordinate frames, typed-array layout names, provenance records, and deterministic digests. ARCH-R1 adds this for package skeletons through `tools/js/smoke_arch_r1_package_contracts.mjs`.

2. Package boundary validation

   Checks that scientific packages do not import renderer/app code or browser-only globals. ARCH-R1 adds `tools/js/audit_package_boundaries.mjs`.

3. Scientific fixture validation

   Checks known manufactured or synthetic fixtures for finite values, deterministic sampling, conservation/diagnostic expectations where applicable, and claim-boundary language. Existing fixture smokes stay in `tools/js/` until later package extraction.

4. Runtime regression validation

   Checks that the browser app, Node/OceanBox-JS, replay, mission execution, and renderer presentation still work. This remains repository-level because it spans packages and app runtime.

## Package Validation Ownership

- `@anchor/contracts`: deterministic digest stability, manifest normalization, validation-report shape.
- `@anchor/bathymetry`: finite depth fields, masks, slope/accessibility consistency, terrain contract shape.
- `@anchor/currents`: finite vectors, interpolation determinism, diagnostic summary shape, boundary-condition claims.
- `@anchor/scalar-processes`: finite scalar fields, depth-specific sampling, forecast/belief/uncertainty contract consistency.
- `@anchor/environment`: component manifest compatibility and no hidden-truth leaks in public artifacts.
- `@anchor/mission-simulator`: deterministic episode stepping and observation provenance once extracted.
- `@anchor/codecs`: JSON/CSV/bundle roundtrip and visibility-safe serialization.
- `@anchor/validation`: package and fixture audit orchestration.

## Regression Rule

A package extraction is not complete until:

- Old `src/core/...` import paths still work through forwarding modules.
- Existing smoke tests that exercised the old module pass unchanged.
- Artifact digests and exported JSON/CSV values are unchanged unless a phase explicitly changes the artifact contract.
- Browser and headless workflows both consume the extracted contract without renderer dependencies.

## Synthetic and Calibrated Claims

A model may be synthetic, manufactured, educational, or calibrated. Default package contracts assume synthetic, not calibrated. Calibrated claims require explicit provenance and a validation check that recognizes the source.
