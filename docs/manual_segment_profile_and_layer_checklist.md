# Manual Segment Profile and Layer Checklist

Human manual QA by the project owner remains pending.

- Confirm the waypoint panel labels the incoming segment, not waypoint z.
- Configure different profiles for Start -> W1, W1 -> W2, and W2 -> W3.
- Confirm Apply to This Segment does not change glider defaults or other gliders.
- Confirm Apply to Remaining Segments affects only future segments for the selected glider.
- Confirm Reset to Glider Default and Reset to Mission Default restore visible profile source.
- Reorder waypoints and confirm profile metadata travels with the target according to the documented policy.
- Delete a waypoint and confirm its profile does not migrate to an unrelated leg.
- Switch Surface, Thermocline, Deep, Integrated, Vertical Profile, Layer Difference, and Gradient views.
- Confirm one x/y can show materially different depth values.
- Execute a routed glider while idle gliders have zero waypoints.
- Confirm actual observations show actual depth, resolved layer, and sampled scalar value.
- Confirm display layer and vertical exaggeration do not change plan digest, result, or scoring.
