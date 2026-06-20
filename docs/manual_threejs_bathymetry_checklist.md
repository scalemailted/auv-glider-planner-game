# Manual Three.js Bathymetry Checklist

Human manual QA by the project owner remains pending.

## Terrain

- Coastline is visible and aligns with land/water boundary.
- Island or landmass appears above water.
- Shallow shelf, shelf break, slope, basin, canyon, ridge, and seamount are readable.
- Terrain color is distinct from science, hazard, and route colors.

## Camera

- Tactical view remains usable.
- Oblique view shows terrain relief.
- Side profile shows dive path above bottom.
- Shelf-to-basin overview is readable.
- Selected terrain/dive focus works.
- Vertical exaggeration changes relief only.

## Planning

- Waypoint on water is accepted.
- Waypoint on land is rejected.
- Shoreline route warning appears where appropriate.
- Sampling target above seabed is accepted.
- Sampling target below seabed is rejected.
- Deep profile over basin remains feasible.
- Deep profile over shelf is terrain-limited.

## Water Column

- Physical layers align with seabed.
- Exploded layers remain display-only.
- Shallow shelf masks invalid deep cells.
- Deep basin retains deep-layer cells.
- Slabs do not visibly pass through land.

## Simulation

- Glider remains above terrain.
- Bottom clearance is shown or exported.
- Terrain-limited dive clips before seabed.
- Observations render at depth.
- Predicted versus actual paths remain distinguishable.

## Performance

- Camera orbit remains responsive.
- Pan and zoom remain responsive.
- Live Simulation has no obvious stutter regression.
- Render counters remain stable.
- Terrain build count does not increase during camera movement.

## Cleanup

- Planning to Main Menu removes mission terrain resources.
- Simulation to Main Menu removes mission terrain resources.
- No stale terrain canvas remains.
- No page errors or unexpected console errors appear.

## THREE-R1.2B.1 Owner Closure Checklist

### Shared Representation

- Scenario Start, Planning, Simulation, and Bathymetric World View show the same class of synthetic bathymetry representation.
- Debug summaries report a terrain source digest and mesh digest in each active Three terrain scene.
- `usesSharedTerrainLayer` is true and `usesLegacyTerrainLayer` is false.

### Terrain Clarity

- Coastline, shelf, shelf break, canyon, basin, seamount, land height, contours, and shading are readable without hiding routes, targets, fields, currents, observations, or gliders.

### Interaction

- Land waypoint rejection, coastline route rejection/warning, below-seabed target rejection, terrain point inspection, route clearance, and side-profile dive inspection are visible and understandable.

### Performance

- Orbit, pan, zoom, live multi-yo Simulation, and Balanced quality remain responsive.
- Terrain resources plateau; camera movement and routine Simulation do not rebuild terrain geometry.

### Cleanup

- Planning -> Main Menu, Simulation -> Main Menu, and Bathymetric World View -> Main Menu leave no stale terrain canvas, duplicate mesh, duplicate coastline, or console errors.
