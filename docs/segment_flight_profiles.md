# Segment Flight Profiles

Waypoints define horizontal navigation targets. A flight profile belongs to the incoming route segment ending at the selected waypoint.

Supported planning choices are Mission Default, Glider Default, Standard Sawtooth, Shallow Survey, Thermocline Survey, Deep Survey, Multi-Yo Survey, Surface Transit, and Surface and Communicate at Arrival through arrival behavior.

Supported sampling phases are descent, ascent, both, profileDefault, and disabled. Descend and ascend are execution phases produced by the profile/state machine, not ordinary waypoint types.

Segment profile metadata may include profile id, profile source, target depth layer, target depth, minimum/maximum immersion, cycle count, sample interval, sampling phase, surface-at-end, communication wait, feasibility, warnings, and a digest.

The simulator does not claim arbitrary z-plane station keeping. Actual depth remains continuous and is computed by canonical execution.
