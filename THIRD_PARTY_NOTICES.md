# Third-Party Notices

This project includes the following third-party runtime files in source control for static browser deployment.

## Three.js

- Package: `three`
- Version: `0.184.0`
- License: MIT
- Project: https://threejs.org/
- Source package: `node_modules/three` from the locked npm dependency graph
- Vendored runtime path: `vendor/three/`

Curated files are synchronized by `tools/js/sync_three_vendor.mjs` and verified by `tools/js/check_three_vendor.mjs`. `node_modules/` remains ignored and is not a deployment artifact. The upstream MIT license is copied unchanged to `vendor/three/LICENSE`.
