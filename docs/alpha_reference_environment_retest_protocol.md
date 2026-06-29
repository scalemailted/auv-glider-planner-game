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

Product Hub -> Simulation Lab -> Environment Studio -> Global Reference Bathymetry Atlas -> verify hosted tile-library status -> select Monterey Canyon mission-ready overlay -> confirm mesh LOD is available and non-authoritative -> Load Mission Patch -> Generate 3D Bathymetry -> Generate Currents & Science Fields -> Compose Environment Artifact -> Review Launch Warnings -> Launch to Planning -> Place waypoints -> Execute Mission -> Debrief -> Export Public Benchmark Bundle -> return to atlas -> select Gulf Segment -> verify requestOnly / multi-tile request behavior -> export multi-tile patch request

The global atlas allows arbitrary boundary selection, but live browser generation is budget-gated. Oversized selections can be exported as patch requests, but they are not generated live in Alpha. The global overview is a selection layer, not mission-resolution bathymetry. Mission-ready generation uses staged regional patches such as the app-hosted ETOPO 2022 15 arc-second Monterey Canyon fixture.

The browser must not download NOAA/GEBCO source data at runtime. ANCHOR hosts staged tile artifacts under `assets/reference_bathymetry/`; raw source data remains outside the app under ignored local preprocessing paths. Mesh LODs are visualization and inspection artifacts only. The raster/grid bathymetry artifact remains authoritative for sampling and environment generation.

1. Open Product Hub.
2. Open Simulation Lab.
3. Open Environment Studio.
4. Confirm Environment Studio opens to the Global Reference Bathymetry Atlas.
5. Verify hosted tile-library status.
6. Select Monterey Canyon mission-ready hosted tile overlay.
7. Confirm mesh LOD is available and non-authoritative.
8. Load Mission Patch.
9. Generate 3D Bathymetry.
10. Generate Currents & Science Fields.
11. Compose Environment Artifact.
12. Review Launch Warnings.
13. Launch to Planning.
14. Inspect environment identity and claim boundary.
15. Place waypoints.
16. Execute Mission.
17. Reach Debrief.
18. Export Public Benchmark Bundle.
19. Return to the Global Reference Bathymetry Atlas.
20. Select Gulf Segment.
21. Verify requestOnly / multi-tile request behavior.
22. Export multi-tile patch request.
23. Export diagnostic feedback bundle if confused or blocked.

## Questions For Testers

- Was the global atlas selector understandable?
- Did you understand that ANCHOR hosts staged tile artifacts?
- Did you understand that the browser does not download NOAA/GEBCO data at runtime?
- Did you understand that the mesh is a visualization artifact, not the simulation authority?
- Did you understand that raster/grid bathymetry remains authoritative?
- Was the Monterey patch overlay discoverable?
- Was Monterey tile loading discoverable?
- Did you understand the difference between global overview and mission-ready patch?
- Did you understand that non-staged regions need offline preprocessing?
- Was Gulf requestOnly behavior clear?
- Was the multi-tile request workflow understandable?
- Was the patch request export clear?
- Did the regional patch workflow make sense after loading Monterey?
- Did the launch warnings make sense?
- Was launch-to-planning discoverable?
- Could you launch Planning and complete a mission?
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
- Gulf-scale regions are requestOnly / multi-tile request workflows until owner-approved offline download and preprocessing stages those tiles.
- The procedural world/globe editor is deprecated/experimental.
- Browser automation is mostly Chromium-focused unless otherwise recorded.
