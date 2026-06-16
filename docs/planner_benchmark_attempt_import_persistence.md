# Planner Benchmark Attempt Import / Persistence

P5 adds browser-side attempt-session persistence and benchmark artifact import for Planner Benchmark debriefs.

## What It Does

- Saves compact attempt sessions in browser local storage by benchmark episode id.
- Imports exported benchmark JSON artifacts and stages them for compatibility review.
- Merges compatible attempts into the current session without rerunning the simulator.
- Exports a consolidated `anchor.benchmark.attempt-session` JSON file.
- Lets the route overlay compare multiple attempts when route geometry is embedded.

Supported import types:

- `anchor.benchmark.run-record`
- `anchor.benchmark.route-execution`
- `anchor.benchmark.attempt-set`
- `anchor.benchmark.attempt-session`
- `anchor.benchmark.comparison`
- `anchor.benchmark.route-overlay`
- `anchor.result` with benchmark metadata

## Compatibility Rules

Imported benchmark artifacts are merged only when they match the current benchmark episode or are explicitly treated as reference-only. Different episode, level, mission, or benchmark-mode records are shown with warnings instead of being silently merged.

P5 does not recompute scores. It compares metrics stored in the imported benchmark records. Importing an attempt does not rerun the simulation, create a new planner, change scoring, or train an autonomy policy.

## Local Persistence Boundary

Local persistence stores compact attempt summaries and route geometry, not full hidden ocean fields. Large result fields such as raw hidden truth, frame tensors, full trajectories, and debug traces are omitted from local storage records.

## Workflow

1. Run a Planner Benchmark attempt and reach Debrief.
2. Use `Save Current Attempt Session` to store the compact session in this browser.
3. Use `Import Benchmark JSON` to stage exported benchmark records from another run.
4. Review warnings in the import panel.
5. Use `Merge Compatible Imports` to add matching attempts to the current session.
6. Use `Export Attempt Session` to download a consolidated session JSON file.

## Debug Fields

`globalThis.ANCHOR_BENCHMARK_EXECUTION_DEBUG` includes P5 fields such as:

- `hasAttemptPersistence`
- `attemptSessionLoaded`
- `attemptSessionSaved`
- `persistedAttemptSessionCount`
- `currentAttemptSessionAttemptCount`
- `importedArtifactCount`
- `compatibleImportCount`
- `incompatibleImportCount`
- `lastImportWarnings`
- `multiAttemptRouteGeometryCount`
- `selectedOverlayAttemptId`
- `availablePersistedEpisodes`
- `availableBenchmarkImportTypes`

## Validation

Run these focused checks after changing P5 behavior:

```bash
node tools/js/smoke_benchmark_artifact_import.mjs
node tools/js/smoke_benchmark_attempt_persistence.mjs
node tools/js/smoke_benchmark_import_view_model.mjs
node tools/js/smoke_benchmark_import_panel.mjs
node tools/js/smoke_benchmark_attempt_session_export.mjs
```