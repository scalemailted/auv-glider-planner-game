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

Product Hub -> Simulation Lab -> Environment Studio -> Global Reference Bathymetry Atlas -> verify hosted tile-library status -> draw an operational window -> move it by dragging inside the rectangle -> resize it from an edge and a corner -> verify bounds/budget sync -> Open 3D Bathymetry Preview for the valid boundary -> verify interactive adaptive-LOD preview if not staged -> return to atlas -> select Monterey Canyon mission-ready overlay -> confirm mesh LOD is available and non-authoritative -> Continue to Mission-Ready Bathymetry -> Regional 3D Bathymetry Workspace -> Generate 3D Bathymetry -> Generate Currents & Science Fields -> Compose Environment Artifact -> Review Launch Warnings -> Launch to Planning -> Place waypoints -> Execute Mission -> Debrief -> Export Public Benchmark Bundle -> return to atlas -> select Gulf Segment -> verify requestOnly / multi-tile request behavior, valid operational-area status, and MULTI_TILE_REQUIRED budget -> Open 3D Bathymetry Preview -> verify preview is not mission-ready -> export multi-tile patch request

The global atlas allows arbitrary boundary selection, but live browser generation is budget-gated. The atlas operational window can be moved and resized directly. Drag inside the rectangle to move it, drag edges to resize one side, and drag corners to resize both connected sides. Every valid boundary can open an interactive 3D bathymetry preview. If high-resolution staged tiles are not available, the preview uses app-hosted overview/LOD data and is not mission-ready. Field generation, Planning launch, and benchmark export require staged mission-ready bathymetry tiles. Continue to Mission-Ready Bathymetry is enabled only when the selected operational window matches an app-hosted mission-ready tile set. Large operational windows are valid selections, but live Alpha generation remains budget-gated; oversized regions export patch or multi-tile requests. The global overview is a selection layer, not mission-resolution bathymetry. Mission-ready generation uses staged regional patches such as the app-hosted ETOPO 2022 15 arc-second Monterey Canyon fixture.

The Regional Bathymetry Workspace uses the center panel as an interactive 3D bathymetry viewport. Detailed provenance, bounds, LOD, and launch status are shown in the right inspector. The left panel is dynamic and only shows actions available for the current scene mode. Returning to the atlas preserves the selected operational boundary and map viewport. High-zoom atlas detail uses app-hosted overview/LOD assets only; the browser does not download NOAA/GEBCO data at runtime.

The browser must not download NOAA/GEBCO source data at runtime. ANCHOR hosts staged tile artifacts under `assets/reference_bathymetry/`; raw source data remains outside the app under ignored local preprocessing paths. Mesh LODs are visualization and inspection artifacts only. The raster/grid bathymetry artifact remains authoritative for sampling and environment generation.

1. Open Product Hub.
2. Open Simulation Lab.
3. Open Environment Studio.
4. Confirm Environment Studio opens to the Global Reference Bathymetry Atlas.
5. Draw a boundary box, drag inside it to move it, drag one edge to resize one side, and drag one corner to resize both connected sides.
6. Confirm the numeric bounds/size editor, budget status, and patch availability update after rectangle edits.
7. Verify hosted tile-library status.
8. Select Monterey Canyon mission-ready hosted tile overlay.
9. Confirm mesh LOD is available and non-authoritative.
10. Continue to Mission-Ready Bathymetry.
11. Confirm the Regional 3D Bathymetry Workspace opens.
12. Generate 3D Bathymetry.
13. Generate Currents & Science Fields.
14. Compose Environment Artifact.
15. Review Launch Warnings.
16. Launch to Planning.
17. Inspect environment identity and claim boundary.
18. Place waypoints.
19. Execute Mission.
20. Reach Debrief.
21. Export Public Benchmark Bundle.
22. Return to the Global Reference Bathymetry Atlas.
23. Select Gulf Segment.
24. Verify it is a valid operational area with `MULTI_TILE_REQUIRED` generation budget and that Continue to Mission-Ready Bathymetry is disabled.
25. Open 3D Bathymetry Preview.
26. Verify the center panel is dominated by the 3D bathymetry viewport and that detailed region information appears in the right inspector.
27. Rotate, pan, wheel zoom, reset, switch top-down, and switch oblique; confirm the terrain remains visible.
28. Verify the preview states that it is not mission-ready, not suitable for official simulation/scoring, and requires staged multi-tile bathymetry before Planning launch.
29. Verify Generate Fields, Compose Environment, Launch Planning, and benchmark export are hidden or collapsed from the main coarse-preview left panel.
30. Return to the atlas and confirm the selected operational boundary and atlas viewport are preserved.
31. Export a multi-tile patch request.
32. Export diagnostic feedback bundle if confused or blocked.

## Questions For Testers

- Was the global atlas selector understandable?
- Could you move and resize the selected operational window without using numeric entry?
- Did edge and corner handles behave as expected?
- Did you understand that ANCHOR hosts staged tile artifacts?
- Did you understand that the browser does not download NOAA/GEBCO data at runtime?
- Did you understand that the mesh is a visualization artifact, not the simulation authority?
- Did you understand that raster/grid bathymetry remains authoritative?
- Was the Monterey patch overlay discoverable?
- Was Monterey tile loading discoverable?
- Did you understand the difference between global overview and mission-ready patch?
- Did you understand that non-staged regions need offline preprocessing?
- Was Gulf requestOnly behavior clear?
- Did coarse preview make large operational areas feel inspectable without implying they are mission-ready?
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
- Gulf-scale regions are requestOnly / coarse-preview / multi-tile request workflows until owner-approved offline download and preprocessing stages those tiles.
- The procedural world/globe editor is deprecated/experimental.
- Browser automation is mostly Chromium-focused unless otherwise recorded.
