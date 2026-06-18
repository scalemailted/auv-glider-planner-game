# Vendored Three.js Runtime

This directory contains the minimal browser runtime files ANCHOR needs from the locked npm package `three@0.184.0`.

`node_modules/` remains ignored and is not a deployment artifact. GitHub Pages serves static repository files or a generated static artifact, so browser imports resolve through the import map in `index.html` to these curated files.

Refresh with:

```bash
npm.cmd run vendor:three
```

Then verify with:

```bash
npm.cmd run check:three-vendor
```

The npm package and lockfile remain the source of truth. The check script verifies version and checksum drift. Three.js is MIT licensed; the upstream LICENSE is copied unchanged into this directory and attribution is recorded in `THIRD_PARTY_NOTICES.md`.
