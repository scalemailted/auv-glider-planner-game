# DIVE-UX-R1 Visual Acceptance

Use this checklist for owner review of the contextual right-panel segment editor.

## Required Manual Flow

1. Generate or load a modern water-column mission.
2. Enter Planning.
3. Select Glider 1 and choose a valid deployment start if required.
4. Add W1, W2, and W3.
5. Select W1 in the right Mission Waypoints panel and confirm the expanded card says Selected Start -> W1.
6. Change profile values, confirm prediction text updates, then Cancel and confirm canonical values return.
7. Apply a profile to W1 and confirm only the first incoming segment changes.
8. Select W2 and confirm the expanded card says W1 -> W2.
9. Apply a different profile to W2 and confirm W1 remains unchanged.
10. Use Apply to Remaining Segments and confirm only later segments for the selected glider change.
11. Reorder W2/W3 and confirm profile metadata follows the destination waypoint while segment labels recompute.
12. Export and reimport the plan and confirm committed metadata survives.
13. Execute and confirm simulation uses committed profiles, not a canceled draft.
14. Switch to another glider and confirm Glider 1 profile metadata does not leak.
15. At 1366 by 768, confirm the selected card remains usable without the central Three viewport scrolling.

## Expected Debug Signals

`globalThis.ANCHOR_SEGMENT_FLIGHT_PLAN_DEBUG` should expose selected glider, waypoint, segment ID, segment label, canonical flight plan, draft flight plan, dirty state, validation status, last command, dispatch counts, prediction summary, warnings, and ownership flags.

The debug object must report `canonicalOwnership: "core-planning"`, `uiOwnsFlightPlan: false`, and `rendererOwnsFlightPlan: false`.
