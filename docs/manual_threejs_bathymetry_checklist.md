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
