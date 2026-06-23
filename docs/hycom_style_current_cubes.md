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

## FLOW-R2A.3 Update

The older HYCOM-style educational language is superseded for generated missions by: Scientifically constrained synthetic current field. Not a calibrated ocean forecast. Not real HYCOM or Marine Copernicus data. Real HYCOM or Marine Copernicus claims require a future attributed imported fixture.

## FLOW-R2A.5 Production Contract

Normal generated missions should now be described as scientifically constrained synthetic current fields, not HYCOM-style fields. The source cube remains `F(x,y,z,t)=<u,v>` in east/north m/s with physical depth in meters and canonical mission time in seconds. Current direction and magnitude vary continuously in space, depth, and time. Operational display slabs sample this one canonical cube; they do not create independent current layers. Real HYCOM or Marine Copernicus claims require attributed imported fixtures in a future DATA phase.
