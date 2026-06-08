# Teaching Workflow

Students play manually, explain strategy, export data, write/inspect solver code, import solver plans, and compare outcomes.

Greedy Planner is the browser-native selected-glider baseline planner for quick comparison and mission testing. It is intentionally local and greedy rather than globally optimal. See `docs/temporal_greedy.md` for the algorithm, intended use, and limitations.

## Campaign Flow

The campaign teaches one idea at a time:

1. First deployment, one waypoint, and execution.
2. Currents and drift.
3. Energy budget and Travel Cost mode.
4. Time slider and temporal planning windows.
5. Priority Gold Star timing.
6. Planning markers / explorer mode.
7. Remaining value and duplicate sampling.
8. Hazards, blocked routes, and stop reasons.
9. Surfacing and replanning.
10. Multi-agent route division.
11. Stochastic forecast planning.
12. Forecast horizon decay.
13. Integrated full-mission challenge.

Each tutorial level shows learning objectives in the briefing, guided planning prompts in the Planning scene, and objective results in the debrief. Students earn ratings from bronze through perfect based on level score thresholds.

Planning prompts are level-specific and cover currents, ROI hotspots, hazards, energy, waypoint planning, forecast uncertainty, and solver import. Students open them from the Phaser-native Help/Briefing modal and can return to normal waypoint planning without leaving the map.

Planning overlays give students immediate visual feedback before simulation. The reachable-region shading, drift cone, dashed preview path, and predicted surfacing marker are intentionally approximate; they are meant to start discussion about currents, uncertainty, and why a plan may drift away from the commanded waypoint sequence.

Progress is stored in browser memory and, when available, localStorage under `anchorGliderCommand.progress.v1`.

See `docs/tutorials.md` for the maintained lesson list, source levels, and feature-gate behavior.
