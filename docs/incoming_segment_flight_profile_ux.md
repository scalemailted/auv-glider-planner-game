# Incoming Segment Flight Profile UX

This project uses horizontal waypoints plus incoming-segment flight profiles.

## Canonical Semantics

The destination waypoint card is the natural editing surface for the segment that ends at that waypoint. The profile is not an arbitrary waypoint z-coordinate and is not a propeller-driven hover command.

Supported segment profile fields come from the canonical `SegmentFlightPlan` contract, including profile preset, target depth layer, maximum immersion, cycle count, sample interval, sampling phase, arrival behavior, and supported surfacing/communication metadata.

## Identity Policy

The current plan stores compact incoming-segment metadata on the destination waypoint for import/export stability. Reordering moves the destination waypoint and its metadata together; the incoming segment label and segment ID are recomputed from the new route topology. Deleting a waypoint deletes that incoming-segment instruction.

## Claim Boundary

Predictions are educational planning estimates, not operational guarantees. Segment profiles model simplified glider descent/ascent behavior between surface waypoints. They do not claim calibrated SeaExplorer command equivalence, calibrated ocean forecasts, exact constant-depth hovering, or low-level actuator control.
