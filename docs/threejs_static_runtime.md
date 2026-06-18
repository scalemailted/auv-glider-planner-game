# Three.js Static Runtime

ANCHOR serves Three.js from a curated checked-in runtime instead of importing directly from `node_modules` at browser runtime.

## Runtime Contract

- Browser modules import Three with the bare specifier `three`.
- `index.html` defines an import map that resolves `three` to `./vendor/three/build/three.module.js`.
- `node_modules/` remains ignored and is not copied to `_site` or GitHub Pages artifacts.
- The npm `three` dependency and `package-lock.json` remain the source of truth for refreshing the vendor payload.

## Curated Files

The current allowlist is intentionally small:

```text
vendor/three/build/three.module.js
vendor/three/build/three.core.js
vendor/three/LICENSE
vendor/three/README.md
vendor/three/manifest.json
```

No Three examples/addons are used by the current runtime. The import map reserves `three/addons/` for future curated addon files, but a new addon must first be added to `tools/js/three_vendor_files.mjs` and synchronized into `vendor/three/`.

## Refresh And Verify

After changing the locked Three.js package version or adding an allowlisted addon:

```bash
npm.cmd run vendor:three
npm.cmd run check:three-vendor
```

For the full static deployment path:

```bash
npm.cmd run build:pages
npm.cmd run smoke:pages
```

`build:pages` creates `_site/`, copies only static app assets, verifies required runtime files, audits runtime paths, and checks module imports. `_site/` is ignored because it is a generated artifact.

## Mission Architecture Boundary

The vendored Three.js runtime supports the production mission-world renderer for planning and live simulation. Phaser is still vendored for the transitional scene shell, lab scenes, and the developer-only legacy tactical renderer that is enabled only with `?legacyPhaser=1`. Static deployment must not load Three.js from `node_modules`, a CDN, or an absolute local path.

## GitHub Pages

The Pages workflow runs `npm.cmd ci`, verifies the vendored Three runtime, runs the JavaScript syntax check, builds `_site/`, and deploys that artifact. Normal browser use from a local static server still opens `index.html` directly; no npm install is needed unless a developer is refreshing dependencies or running development checks.

## Attribution

Three.js is MIT licensed. See `THIRD_PARTY_NOTICES.md` and `vendor/three/LICENSE`.
