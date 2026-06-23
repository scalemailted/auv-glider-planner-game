# Package Dependency Rules

ARCH-R1 package skeletons are local workspaces under `packages/`. They are not a new app and they do not change active browser imports.

## Allowed Package Graph

| Package | May depend on |
| --- | --- |
| `@anchor/contracts` | none |
| `@anchor/bathymetry` | `@anchor/contracts` |
| `@anchor/currents` | `@anchor/contracts`, `@anchor/bathymetry` |
| `@anchor/scalar-processes` | `@anchor/contracts`, `@anchor/currents` |
| `@anchor/environment` | `@anchor/contracts`, `@anchor/bathymetry`, `@anchor/currents`, `@anchor/scalar-processes` |
| `@anchor/mission-simulator` | `@anchor/contracts`, `@anchor/environment` |
| `@anchor/codecs` | `@anchor/contracts` |
| `@anchor/validation` | all scientific packages as validation subjects |

## Forbidden Imports and Runtime APIs

Package source files must not import or use:

- `src/game/`
- `src/ui/`
- `three` or `three/*`
- `phaser` or `phaser/*`
- `document`
- `window`
- `requestAnimationFrame`

Use explicit adapters in the app layer when package outputs need to be rendered.

## Audit Command

```bash
npm run audit:packages
```

This runs `tools/js/audit_package_boundaries.mjs` and fails on forbidden imports, forbidden package dependencies, or disallowed package-to-package edges.

## Smoke Command

```bash
npm run test:packages
```

This imports every package skeleton, validates the contract proof, checks deterministic digests, and runs the package boundary audit.

## BATHY-PKG-R1 Dependency Checks

`npm.cmd run audit:packages` now runs the shared package boundary audit plus BATHY-PKG-R1 bathymetry dependency and browser-safety audits. `packages/bathymetry` may depend on `packages/contracts` only. It must not import `src/`, Three.js, Phaser, DOM APIs, `globalThis.Phaser`, global `THREE`, or ANCHOR debug globals.
