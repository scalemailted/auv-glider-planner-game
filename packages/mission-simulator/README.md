# @anchor/mission-simulator

Owns the future portable mission execution boundary: vehicle state, episode stepping, observations, and result contracts.

ARCH-R1 is a skeleton only. Existing simulation behavior remains under `src/core/sim/` to avoid behavior drift.

Allowed dependencies: `@anchor/contracts` and `@anchor/environment`.
