# Headless / Colab Bundle Manifest

The H0 bundle manifest defines how browser ANCHOR artifacts can be packaged for future headless ANCHOR, OceanBox, and Colab workflows. H0 defines the contract only; it does not write binary arrays or implement the Python package.

## Manifest Shape

A bundle contains a `manifest.json` with:

- `type: "anchor.headless.manifest"`
- `version`
- `bundleType`
- `scenarioId`, `missionId`, `episodeId`, and `seed`
- `runtimeTarget`: `browser`, `nodeHeadless`, `pythonOceanBox`, or `colabNotebook`
- `visibilityTier`
- `files`, `arrays`, `tables`, `json`, `schemas`, and `checksums`

## File Roles

Expected roles include:

- `manifest`
- `missionConfig`
- `fieldPack`
- `visibleFields`
- `hiddenFields`
- `forecastFields`
- `beliefFields`
- `priorityFields`
- `gliderTracks`
- `observations`
- `actions`
- `rewards`
- `surfacingReports`
- `benchmarkRecords`
- `scoreReport`
- `replay`
- `notebookConfig`

## Expected Tables

A future Colab bundle should expose tables for observations, glider tracks, actions, rewards, surfacing reports, and score reports. H0 only defines the roles and schema names.

## Expected Arrays

Field arrays may be grouped as visible fields, hidden fields, forecast fields, belief fields, and priority fields. Hidden fields must use `hiddenTruth`, `oracle`, or `debugAll` visibility.

## Notebook Use Cases

A notebook should be able to load a manifest, inspect mission configuration, read visible fields, compare benchmark records, and reproduce a lightweight analysis without depending on browser UI state.

## Hidden Truth Protection

Public or forecast-only bundles must not include hidden truth arrays by default. If a bundle includes hidden truth, the manifest must mark the file entry with `hiddenTruth`, `oracle`, or `debugAll`.
## H1 Node Headless Bundle Visibility

H1 Node bundles use the H0 manifest roles and visibility tiers. `visible_fields.json` contains forecast, belief, uncertainty, priority, flow, hazard, mask, staleness, and boundary fields. `hidden_fields.json` contains `T_hiddenTruth` only when hidden export is enabled. Public bundles should use `--no-hidden-export`.

Node headless runtime over portable ANCHOR core logic. Browser ANCHOR remains the official visual referee and scoring UI.

## H2 Combined Bundle

H2 supports an optional `bundle.json` convenience file. It embeds the manifest, mission config, visible field pack, optional hidden field pack, observations, glider tracks, score report, replay metadata, and episode record in one JSON document with `type: "anchor.headless.bundle"`.

The browser Headless Bundle Viewer also accepts separate files. Observation and track data may be supplied as JSON or CSV. Public bundles should combine `--no-hidden-export` with `--combined-json`; the manifest should state that hidden truth export is disabled, and visible fields must not include `T_hiddenTruth`.

## H2.1 Checked-In Example Bundle

The checked-in public combined bundle at `docs/examples/headless_oceanbox_js_public_bundle.example.json` is the reference Colab/browser fixture. It has `type: "anchor.headless.bundle"`, embeds the manifest and mission config, exposes top-level `observations` and `gliderTracks` arrays for simple notebook loading, and omits hidden truth. The debug fixture at `docs/examples/headless_oceanbox_js_bundle.example.json` includes hidden fields only with explicit hidden/oracle/debug visibility.

Use `tools/js/generate_headless_example_bundles.mjs` to reproduce both fixtures. Colab/Python should load and analyze the JSON artifact or call Node; it should not implement a second simulator.
