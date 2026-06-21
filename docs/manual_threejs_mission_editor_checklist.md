# Manual Three.js Mission Editor Checklist

Use this checklist after automated R2B gates pass.

- Open the Environment Editor from the app.
- Confirm the center world is a Three.js canvas.
- Confirm the left console still exposes generation, brush, current, save, export, and preview controls.
- Paint terrain and hazard cells.
- Add a deployment zone and glider start.
- Edit a current vector.
- Export level JSON and reimport it.
- Try to preview a valid mission and confirm it enters the normal briefing flow.
- Inject an invalid calibrated-forecast claim and confirm preview/export is blocked.
- Return to Main Menu and confirm no Three editor canvas remains.
- Inspect `ANCHOR_MISSION_EDITOR_DEBUG` and `ANCHOR_PHASER_RETIREMENT_DEBUG`.
