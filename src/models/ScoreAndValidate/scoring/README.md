# @anchor/scoring

Canonical scoring package for ANCHOR.

ANCHOR Alpha is a deterministic, scientifically constrained research-and-education sandbox for investigating adaptive underwater-glider mission planning. It supports reproducible comparison of human, classical, and learning-based planners. It is not an operational ocean forecast or certified vehicle-navigation system.

Tagline: Plan. Simulate. Compare. Learn.

## Boundary

The mission simulator owns raw mission outcomes. This package owns official score calculation, versioned score profiles, component definitions, normalization, deterministic score digests, public-safe score summaries, and methodology metadata.

It does not own planning, simulation transitions, renderer state, UI state, leaderboard persistence, hidden-truth visibility policy, ML training, or RL reward shaping.

## Public API

The package exports:

- `summarizeScore` for the existing official browser mission total.
- ScoreProfile, ScoreInput, and ScoreResult helpers from `ScoreContracts.js`.
- SCORE-R1 benchmark scorecard modules for objective-aware comparison.
- `computeHeadlessScoreReport` for educational headless bundle compatibility.

The old `src/core/scoring`, `src/core/sim/Scoring.js`, and `src/core/headless/runtime/HeadlessScoring.js` paths are compatibility forwarders.
