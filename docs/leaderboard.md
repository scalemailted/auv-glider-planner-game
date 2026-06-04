# Leaderboard And Best Paths

Leaderboard records are stored locally in `localStorage` under `anchorGliderCommand.leaderboard.v1`.

Each attempt stores the submitted `anchor.plan`, the simulation result, summary metrics, fairness metadata, and a compact `pathSummary`. New results include execution frames and event logs, so Planning can reconstruct the actual path. Older records without frames still work as planned-route overlays.

In Planning, the Analysis section looks up the best prior attempt for the current challenge instance and mission. Attempts are ranked by fair leaderboard eligibility, final score, lower energy use, fewer hazards, and earlier completion time.

Available controls:

- `Show Best Path` / `Hide Best Path`
- `Rerun Best Path`
- `Load Best Path as Plan`
- `Export Best Path`

The ghost overlay shows the saved planned route, actual trajectory when available, sample markers, and priority-target captures when those events exist. It is a view layer and does not modify the current editable route unless `Load Best Path as Plan` is clicked.
