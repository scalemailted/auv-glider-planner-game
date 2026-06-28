# Reference-Derived Environment Alpha Retest Protocol

## Goal

Test the new reference-derived Monterey Canyon environment workflow from Environment Studio through Planning, mission execution, Debrief, and benchmark export.

## What This Is

ANCHOR Alpha is a deterministic, scientifically constrained research-and-education sandbox for investigating adaptive underwater-glider mission planning. It supports reproducible comparison of human, classical, and learning-based planners. It is not an operational ocean forecast or certified vehicle-navigation system.

This workflow uses public Reference bathymetry + deterministic synthetic bathymetry-conditioned fields.

## What This Is Not

This is not an operational ocean forecast. It is not certified navigation. It is not a real current forecast. It is not a calibrated ecological forecast.

## Tester Tasks

1. Open Product Hub.
2. Open Simulation Lab.
3. Open Environment Studio.
4. Confirm the Monterey Canyon 15s mission-ready patch is selected.
5. Generate 3D Bathymetry.
6. Generate Currents & Science Fields.
7. Compose Environment Artifact.
8. Review launch warnings.
9. Launch to Planning.
10. Inspect environment identity and claim boundary.
11. Place waypoints.
12. Execute mission.
13. Reach Debrief.
14. Export benchmark bundle.
15. Export diagnostic feedback bundle if confused or blocked.

## Questions For Testers

- Was the source/provenance clear?
- Was "reference bathymetry + synthetic fields" clear?
- Did warnings make sense?
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
