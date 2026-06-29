# Reference-Derived Environment Alpha Retest Protocol

## Goal

Test the new reference-derived Monterey Canyon environment workflow from Environment Studio through Planning, mission execution, Debrief, and benchmark export.

## What This Is

ANCHOR Alpha is a deterministic, scientifically constrained research-and-education sandbox for investigating adaptive underwater-glider mission planning. It supports reproducible comparison of human, classical, and learning-based planners. It is not an operational ocean forecast or certified vehicle-navigation system.

This workflow uses public Reference bathymetry + deterministic synthetic bathymetry-conditioned fields.

## What This Is Not

This is not an operational ocean forecast. It is not certified navigation. It is not a real current forecast. It is not a calibrated ecological forecast.

## Tester Tasks

Workflow path:

Product Hub -> Simulation Lab -> Environment Studio -> Global Reference Bathymetry Atlas -> select Monterey Canyon mission-ready overlay -> Load Mission Patch -> Generate 3D Bathymetry -> Generate Currents & Science Fields -> Compose Environment Artifact -> Review Launch Warnings -> Launch to Planning -> Place waypoints -> Execute Mission -> Debrief -> Export Public Benchmark Bundle

1. Open Product Hub.
2. Open Simulation Lab.
3. Open Environment Studio.
4. Confirm Environment Studio opens to the Global Reference Bathymetry Atlas.
5. Select Monterey Canyon mission-ready overlay.
6. Load Mission Patch.
7. Generate 3D Bathymetry.
8. Generate Currents & Science Fields.
9. Compose Environment Artifact.
10. Review Launch Warnings.
11. Launch to Planning.
12. Inspect environment identity and claim boundary.
13. Place waypoints.
14. Execute Mission.
15. Reach Debrief.
16. Export Public Benchmark Bundle.
17. Export diagnostic feedback bundle if confused or blocked.

## Questions For Testers

- Was the global atlas selector understandable?
- Was the Monterey patch overlay discoverable?
- Did you understand the difference between global overview and mission-ready patch?
- Did you understand that non-staged regions need offline preprocessing?
- Was the patch request export clear?
- Did the regional patch workflow make sense after loading Monterey?
- Did the launch warnings make sense?
- Was launch-to-planning discoverable?
- Was waypoint planning intuitive in the generated environment?
- Did current/scalar/hotspot visual layers help planning?
- Was benchmark export discoverable?
- What was confusing?
- What should be hidden by default?
- What should be more prominent?

## Known Limitations

- Non-blocking `WARN` status may appear.
- Currents and scalars are synthetic benchmark fields, not forecasts.
- Only the Monterey Canyon reference patch is currently mission-ready.
- The procedural world/globe editor is deprecated/experimental.
- Browser automation is mostly Chromium-focused unless otherwise recorded.
