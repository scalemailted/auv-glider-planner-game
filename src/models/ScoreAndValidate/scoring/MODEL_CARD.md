# Scoring Model Card

## Purpose

`packages/scoring` is the canonical package authority for versioned official mission scoring and transparent benchmark score reports in ANCHOR.

ANCHOR Alpha is a deterministic, scientifically constrained research-and-education sandbox for investigating adaptive underwater-glider mission planning. It supports reproducible comparison of human, classical, and learning-based planners. It is not an operational ocean forecast or certified vehicle-navigation system.

Plan. Simulate. Compare. Learn.

## Inputs

The package consumes canonical mission-simulator raw outcomes, mission objective metadata, and stable score-profile metadata. It does not resimulate routes, resample environments, or read renderer/UI state.

## Outputs

Outputs include ScoreResult, deterministic score digests, compact public-safe summaries, methodology metadata, and compatibility scorecard reports.

## Claim Boundary

The official score measures performance under declared ANCHOR score profiles. It is deterministic and benchmark-oriented. It is not a certified navigation metric, operational safety assessment, calibrated ocean forecast score, or automatically ideal shaped RL reward.

Planner provenance may be recorded alongside results. Planner identity must not alter numerical score calculation.
