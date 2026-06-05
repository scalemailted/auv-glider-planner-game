# Leaderboard And Best Paths

Leaderboard records are stored locally in `localStorage` under `anchorGliderCommand.leaderboard.v1`.

Each attempt stores the submitted `anchor.plan`, the simulation result, summary metrics, fairness metadata, and a compact `pathSummary`. New results include execution frames and event logs, so Planning can reconstruct the actual path. Older records without frames still work as planned-route overlays.

New records also preserve replay metadata when available: `challengeId`, `replaySeedAnchor`, `generationVersion`, `generationConfig`, `derivedSeeds`, `replaySeedContract`, and `exactReplay`. The UI can summarize this as exact via saved snapshot, exact via UUID seed contract, approximate, or unavailable. Exact replay should not be claimed for older records missing the UUID/config/version contract.

In Planning, the Analysis section looks up the best prior attempt for the current challenge instance and mission. Attempts are ranked by fair leaderboard eligibility, final score, lower energy use, fewer hazards, and earlier completion time.

Available controls:

- `Show Best Path` / `Hide Best Path`
- `Rerun Best Path`
- `Load Best Path as Plan`
- `Export Best Path`

The ghost overlay shows the saved planned route, actual trajectory when available, sample markers, and priority-target captures when those events exist. It is a view layer and does not modify the current editable route unless `Load Best Path as Plan` is clicked.

Replay diagnostics shown in Analysis or Leaderboard should stay compact:

- Replay: exact via snapshot, exact via UUID, approximate, or unavailable.
- Seed Anchor: challenge UUID when present.
- Generator: current stored generator version, such as `anchor-generator-v1`.
- Planned Path: available/unavailable.
- Actual Path: available/unavailable.
- Missing Fields: snapshot, config, generator version, derived seeds, planned path, or actual path when absent.

The Leaderboard browser exposes the same saved data from each record:

- `Replay Challenge` opens the saved challenge snapshot in Planning without loading the saved path.
- `Show Saved Path` / `Hide Saved Path` opens the saved challenge and toggles the non-editing path overlay.
- `Rerun Saved Path` loads the saved path, validates it through Planning, and executes it against the saved challenge snapshot.
- `Load Path as Plan` loads the saved path as the editable plan for that saved challenge.
- `Export Path`, `Export Challenge`, `Export Result`, and `Export Record` export the available saved artifacts.

Older or incomplete records keep unavailable actions disabled with hover text explaining which saved artifact is missing.
