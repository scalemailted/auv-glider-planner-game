# HYCOM-Style Current Cubes

ANCHOR's FLOW-R2A current contract is `src/core/science/OceanCurrentField4D.js`.

A current cube contains explicit axes:

- `eastAxisMeters`
- `northAxisMeters`
- `depthAxisMeters`
- `timeAxisSeconds`

and current components:

- `uEastMetersPerSecond`
- `vNorthMetersPerSecond`
- optional `wDownMetersPerSecond`

Depth and time axes may be nonuniform. Slabs are views into one current cube at declared physical depths. Depth-average current is derived and is not a physical slab.

Synthetic fixtures may be labelled `HYCOM-style synthetic current cube`. They must not claim real HYCOM, Marine Copernicus, calibrated forecast, or operational ocean prediction unless a future DATA phase adds checked-in provenance.
