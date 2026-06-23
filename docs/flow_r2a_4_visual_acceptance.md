# FLOW-R2A.4 Visual Acceptance

FLOW-R2A.4 acceptance is based on the normal production workflow, not only the checked-in current benchmark fixture.

## Required Visible Paths

- Normal generated Challenge mission shows current vectors in Planning.
- The same mission shows current vectors after Execute in Simulation.
- Current vectors survive Return/Replan and a second Execute.
- Optional idle Glider 2 and Glider 3 do not disable the environmental current display.
- Explicit `?currentDisplay=safe` hides vectors with an explanation and does not persist to a later normal URL.
- The gated next shell reuses shared current presentation contracts where it exposes mission views.

## Pixel Evidence

The focused E2E renders the Three canvas with current vectors hidden and visible, then requires meaningful pixel differences plus projected glyphs inside the viewport. This verifies browser pixels, not only debug counts.

## Root Cause Closed

The production Planning view was using a fixed exponential fog density that erased regional top-down objects to the exact scene background. The renderer now scales fog density by mission bounds so regional Planning views remain visible while retaining light atmospheric depth.

Human manual QA by the project owner remains pending until the FLOW-R2A.4 normal-production current-visibility screenshot package is reviewed.