# WORLD-R1.1 Visual Acceptance Notes

This file records the intended owner-review acceptance package for WORLD-R1.1.

Automated smoke/audit scripts cover the signed terrain authority, regional profile activation, drop-zone generation, field-mask alignment, continuous coordinate launch/trajectory preservation, and planning-guide preview lifecycle.

Human manual QA by the project owner remains pending until the WORLD-R1.1 regional terrain and Planning-guide screenshot package is reviewed.

Expected review evidence:

- Regional Fleet Area setup is available and Challenge Mode defaults to it.
- The generated regional mission displays smooth indexed terrain with coastline, not raised rectangular land tiles.
- Analysis lattice is hidden by default and remains presentation-only when toggled.
- Waypoint preview starts at deployment, reanchors after each committed waypoint, and clears on cancel or scene exit.
- Continuous route coordinates are shown as physical east/north positions with inspection cells as secondary metadata.
- Simulation, replay, debrief, and export preserve continuous coordinates.
- Debug values report one renderer, one RAF, zero land-tile meshes, and zero preview segments after cleanup.