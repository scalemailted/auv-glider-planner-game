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