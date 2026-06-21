# Replay Authority Boundaries

Public replay mode is `publicObservationPlayback`. It may include public scenario metadata, planned routes, public agent states, realized public trajectories, public observations, surfacing events, route failures, public terrain events, and public result summaries.

Public replay must not include hidden truth fields, protected oracle values, hidden event intensity, referee-only science values, unobserved scalar-field truth, or private solver/referee payloads.

Required boundary flags remain false for replay-owned simulation, replay-owned scoring, renderer-owned replay semantics, renderer-owned physics, hidden-truth inclusion, and authoritative hidden resimulation. Three.js owns presentation only.
