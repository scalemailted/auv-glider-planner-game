# SCORE-R1 Mission Scoring and Regret

## 1. Purpose

SCORE-R1 adds a versioned shadow benchmark layer for interpreting mission outcomes. It consolidates existing science, feasibility, efficiency, safety, and mission-management evidence into an inspectable scorecard.

## 2. Official score vs SCORE-R1 shadow score

SCORE-R1 is shadow benchmark scoring. It does not replace official browser scoring, Challenge Mode scoring, leaderboard ranking, or debrief totals. SCORE-R1 artifacts must keep `changesOfficialBrowserScoring: false`.

## 3. Objective-aware score profiles

Profiles are objective-aware and versioned. A reduce-uncertainty mission, forecast-validation mission, hidden-event confirmation mission, boundary-mapping mission, energy-conservation mission, and hazard-avoidance mission can weight different components without using one opaque universal score.

## 4. Metric groups

The current groups are science, feasibility, efficiency, safety, missionManagement, and optional fleetCoordination. Fleet coordination remains a future/sparse group unless fleet metrics are present.

## 5. Normalization

Raw metrics are normalized to `[0, 1]` using explicit component directions: higher-is-better, lower-is-better, target-range, binary-pass, or categorical. Bounds and targets are recorded in normalized metric output.

## 6. Missing-data handling

Missing data is explicit. Missing metrics remain unavailable/null and are not silently treated as zero. They do not earn credit, and they reduce score data coverage.

## 7. Data coverage

The aggregator reports configured weight, available weight, and coverage fraction. If coverage is below the selected profile threshold, the composite score is withheld as insufficient data.

## 8. Science score

Science components cover sampled value, uncertainty reduction, forecast validation, hidden-event confirmation, source localization, boundary mapping, feature tracking, stale-region revisits, vertical coverage, diversity, and redundancy.

## 9. Feasibility score

Feasibility components use existing route execution, motion, and mission-feasibility artifacts: mission completion, waypoint completion, arrival status, motion feasibility, track error, bottom clearance, constraints, and communication completion.

## 10. Efficiency score

Efficiency components cover energy efficiency, energy remaining, duration, realized distance, current utilization, control effort, and payload efficiency when the supporting artifacts exist.

## 11. Safety score

Safety components include hazard exposure, constraint violations, bottom-clearance warnings, collision risk, and communication loss when available.

## 12. Mission-management score

Mission-management components cover objective transition quality, evidence follow-up quality, and surfacing decision quality when adaptive benchmark artifacts exist.

## 13. Regret references

Regret requires a compatible reference. Supported references are none, configuredBaseline, bestKnownCompatibleAttempt, oracleAttemptIfAvailable, theoreticalUpperBound, and componentTarget. Do not fabricate an oracle baseline.

## 14. Fair comparison rules

Fair comparisons require compatible episode/scenario identity, mission objective, visibility tier, score profile/version, environment seed/version, allowed information, vehicle configuration, and relevant runtime configuration. Best-known attempt does not mean optimal.

## 15. Hidden truth and referee-only metrics

Post-mission referee-derived scalar summaries may be used only when labelled. Public solver-visible artifacts must not expose hidden truth arrays, raw oracle tensors, or hidden fields.

## 16. Headless and browser exports

The Node/OceanBox-JS runtime can optionally emit `score_profile.json`, `mission_outcome_metrics.json`, `mission_score.json`, `mission_outcome_report.json`, and `regret_report.json`. Browser ANCHOR and the Headless Bundle Viewer can inspect these artifacts. Python/Colab analyzes artifacts or invokes Node; no Python simulator is added.

## 17. What SCORE-R1 does not implement

SCORE-R1 does not implement a planner, route optimizer, A*, Dijkstra, RRT, MPC, RL, MARL, calibrated ocean forecast, production data assimilation, SeaExplorer validation, operational certification, backend service, or Python simulator.

## 18. Promotion criteria for future official scoring

Do not promote SCORE-R1 into official browser scoring until it is validated across several scenario families, benchmark modes, objective profiles, and solver-visible information tiers. Any promotion should preserve transparency, missing-data diagnostics, public-safety checks, and compatibility rules.