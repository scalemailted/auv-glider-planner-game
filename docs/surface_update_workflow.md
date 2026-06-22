# Surface Update Workflow

Surfacing and route-failure prompts support a file-based solver loop.

1. At a surface/update window or route failure, choose `Export Observation Data`.
2. Run an external solver on `anchor.surface-observation.json`.
3. Return `anchor.plan-segment`, `anchor.plan`, or a compatible `{ agentId, waypoints }` JSON file.
4. Choose `Import Waypoint Data`.
5. The browser validates the import and replaces future waypoints for the surfaced or failed agent after the current simulation time.
6. Choose `Continue Mission` from the confirmation prompt.

Supported import types:

- `anchor.plan`: complete plan. Future waypoints are extracted for the relevant agent(s).
- `anchor.plan-segment`: next segment from a surface or failure state.
- Plain waypoint list: inferred metadata, default `anchorMode: "actualSurfacePosition"`.

Validation checks type, challenge/mission compatibility, agent id, finite coordinates and times, map bounds, terrain cells, route audit, and fairness/oracle metadata. Invalid imports are not applied by default.

`surfaceUpdateBundle` remains a full-plan metadata scaffold. The live surfacing workflow implemented here applies explicit imported waypoint data only after the player selects `Import Waypoint Data`; it does not silently execute bundled policy logic.
## Browser Replan Handoff

When the player chooses `Update Waypoints / Replan`, the browser freezes the current simulation resume snapshot and opens Planning from the actual surfaced position. The original surface decision remains pending until the player chooses `Commit Replan and Resume`. A valid commit records the canonical `surfaceDecision` and `replanned` events in the resume snapshot, clears the pending decision, and resumes the same simulation clock and agent states. `Cancel Replan` restores the original plan from the handoff and returns to the same paused surface decision.

This handoff is player-directed. It does not create a planner, reset the mission, redeploy the glider, change scoring, or let the renderer own simulation state.
