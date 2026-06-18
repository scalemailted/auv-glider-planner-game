# Manual UI Parity Checklist

Use this checklist for side-by-side QA against the legacy diagnostic Phaser reference and the DOM/Three production route.

## Main Menu
- Product Hub fills the center viewport.
- Challenge Mode, Simulation Lab, and Learning Labs are the three primary choices.
- Mission Setup form is hidden.
- Waypoint panel and timeline are hidden or idle.
- Narrow viewport stacks cards without overlap.

## Mission Setup
- Setup is a separate route.
- Mode, visibility, seed, objective/config, generation, continue, and back controls are visible.
- Briefing, planning tools, simulation transport, and debrief panels are absent.
- Controls scroll within the route if needed.

## Mission Briefing
- Mission title, objective, environment summary, duration, fleet, constraints, and visibility context are visible.
- Begin Planning and Back/Setup actions are visible.
- Setup controls and waypoint editor are absent.

## Mission Planning
- Left Mission Console is visible.
- Center Three mission viewport fills available space.
- Right waypoint panel shows selected glider/start/route/waypoint details.
- Timeline and mission performance/status strips are aligned and not overlapping.
- Launch Simulation is visible; simulation transport controls are absent.

## Mission Simulation
- Simulation-specific route root is mounted.
- Pause/resume/step/finish controls are visible.
- Planning edit controls are absent.
- Right panel shows execution status, energy, waypoints, observations, and warnings where available.
- Only one Three canvas is present.

## Mission Debrief
- Official score and result metrics are visible.
- Rerun, return to planning, return to menu, and export actions are visible where available.
- Benchmark/adaptive panels appear only for those modes.
- Simulator timers are stopped and no simulation controls remain visible.

## Route Transitions
- Back/forward hash navigation keeps one active route root.
- Reload at each production hash restores or shows a clear empty state.
- Previous route DOM, modals, overlays, and listeners do not persist.
- Narrow viewport remains usable without horizontal overflow.
