# Tutorial Campaign

Tutorial Mode is defined in `src/core/tutorial/TutorialDefinitions.js`. The campaign has fourteen staged lessons that reuse the handcrafted tutorial level JSON files and add per-lesson metadata, prompts, feature gates, mission overrides, and success criteria.

The main-menu Tutorial Mode uses a center Tutorial Browser. The Mission Console owns filters and progress summary, the center viewport renders scrollable tutorial cards, and the right waypoint/detail panel shows the selected tutorial dossier and `Start Tutorial` action.

| Lesson | Source level | Focus |
| --- | --- | --- |
| Tutorial 01: First Deployment | `tutorial_01_currents` | choose deployment, place waypoint, execute |
| Tutorial 02: Ride the Current | `tutorial_01_currents` | currents and drift |
| Tutorial 03: Energy and Travel Cost | `tutorial_02_energy` | energy budget and Travel Cost mode |
| Tutorial 04: Time Slider and Temporal Fields | `tutorial_04_long_horizon` | time slider and planning windows |
| Tutorial 05: Priority Gold Stars | `tutorial_04_long_horizon` | priority targets and timing |
| Tutorial 06: Planning Markers / Explorer Mode | `tutorial_04_long_horizon` | non-executable planning markers |
| Tutorial 07: Remaining Value and Duplicate Sampling | `tutorial_04_long_horizon` | remaining value and duplicate avoidance |
| Tutorial 08: Hazards and Blocked Routes | `tutorial_03_hazards` | hazards, terrain, and route failure feedback |
| Tutorial 09: Surfacing and Replanning | `tutorial_04_long_horizon` | surface windows and replanning |
| Tutorial 10: Multi-Agent Coordination | `tutorial_04_long_horizon` | two-glider route division |
| Tutorial 11: Stochastic Forecast | `tutorial_05_forecast` | probability and expected-value planning |
| Tutorial 12: Forecast Horizon Decay | `tutorial_05_forecast` | confidence decay and surfacing updates |
| Tutorial 13: Full Mission Challenge | `tutorial_05_forecast` | integrated mission planning |
| Tutorial 14: Import / Export Workflow | `tutorial_05_forecast` | imported demo plan, route validation, and solver-style workflow |

## Feature Gates

Tutorial feature gates live in `src/core/tutorial/TutorialFeatureGates.js`. They keep early lessons focused by hiding or narrowing controls until a lesson introduces them.

Gated controls include deployment zones, current vectors, hazards, Gold Star targets, planning markers, Remaining ROI mode, Travel Cost mode, probability/expected-value modes, surfacing, multi-agent controls, solver import/export tools, and tutorial demo-import controls. These are UI teaching gates, not security boundaries; imported JSON and core simulation logic remain general-purpose.

## Import Demo Tutorial

`Tutorial 14: Import / Export Workflow` adds an `Import Demo` section to the Planning Console. The built-in plan lives at `tutorials/import-demo/import-demo-waypoints.json`, with a challenge reference and notes in `tutorials/import-demo/`.

Players can click `Load Built-In Demo Plan` to fetch the packaged plan directly, or click `Download Demo Plan JSON` and then `Import Waypoint Data` to practice the manual browser upload workflow. Imported waypoints populate the right waypoint panel, timeline, and route lines, then run through the normal route validity audit before `Execute Mission` is enabled.

## Briefing, Planning, And Debrief

Mission Briefing shows the lesson focus, objectives, available controls, and success criteria without revealing the tactical map. Planning shows a concise tutorial hint based on the active planning window. Debrief evaluates the lesson objectives, saves tutorial progress, and routes `Next Tutorial`, `Tutorial Browser`, or Main Menu through the campaign sequence.
