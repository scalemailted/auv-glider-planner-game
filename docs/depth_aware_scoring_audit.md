# Depth-Aware Scoring Audit

Phase: THREE-R1.2A.2

This audit records the current scoring/depth behavior and the compatibility changes added in this pass. It is a browser/headless teaching model audit, not an operational ocean-validation claim.

## Findings

1. Is current score based only on horizontal cells?

Before this pass, yes. The official browser sample path used `src/core/sim/Sampling.js` and keyed samples by `x,y`. The score accumulator in `src/core/sim/Scoring.js` summed `agent.sampleScore`, which was filled from the best horizontal ROI cell near the glider.

After this pass, missions that explicitly select `depthAwareScienceV1` key sampling by `x,y,depthLayer`. Imported surface-only missions retain `legacySurfaceScienceV1` and continue to behave like historical horizontal-cell scoring.

2. Does it inspect actual observation depth?

Before this pass, no. Depth existed in water-column view models, headless observations, and depth-energy terms, but official browser sample scoring did not inspect actual observation depth.

After this pass, depth-aware missions derive actual sample depth from waypoint/profile metadata at sample time and record `anchor.score.depth-aware-sample` events.

3. Does each depth layer have separate sampling priority?

The portable water-column priority model already distinguishes `A_global_depth(x,y,layer,t)` from `A_global_topdown(x,y,t)`. The new evaluator uses `A_global_depth` when present and treats `A_global_topdown` as a planning summary only.

4. Does one surface sample claim an integrated water-column value?

Before this pass, a horizontal ROI cell could effectively stand in for all depth because browser scoring had no layer distinction. After this pass, ordinary surface samples do not receive top-down integrated credit. Integrated profile credit is only allowed for observations explicitly marked as integrated profile samples.

5. Does profile depth affect energy?

Existing simulation already had depth-energy events through `TruthWorld.depthEnergyMultiplier` and `Physics` outputs. The new feasibility module also reports an educational profile energy estimate, but it does not replace the existing physics model.

6. Is maximum reached depth derived from segment length?

Before this pass, segment length affected visual/predicted dive trajectory only indirectly through view models; the canonical profile model was layer-sequence based. `DiveProfileFeasibility.js` now exposes a canonical educational feasibility contract where segment distance, duration, vehicle rating, profile max depth, bathymetry/clearance, and energy can limit achievable depth.

7. Does sampling occur continuously through the profile or only at one point?

Browser simulation still records discrete sample events when `updateSampling` fires. Full profile value can be evaluated from multiple actual observations with `evaluateDepthAwareProfileValue`; predicted profile points remain estimates and do not create score events.

8. How are duplicate samples handled across depth?

Legacy scoring uses `x,y`. Depth-aware scoring uses `x,y,depthLayer`, so the same horizontal cell can yield additional value at a different layer. Repeated samples in the same depth bin receive novelty and redundancy reductions.

9. What current score terms would be double-counted by a depth-aware extension?

The primary double-count risk is awarding both `A_global_topdown` and per-layer `A_global_depth` to the same ordinary sample. This pass prevents that by default. A second risk is treating predicted profile samples as actual score events; the new score event path records only actual observations from simulation/headless observations.

10. Which score is official in browser, headless, benchmark, and export paths?

Browser `src/core/sim/Scoring.js` remains the official gameplay score surface. `depthAwareScienceV1` is selectable through mission metadata and still flows through `agent.sampleScore` and final browser scoring. Node/OceanBox-JS produces educational headless score reports plus shared depth-science components. SCORE-R1 benchmark mission outcome scoring remains shadow/benchmark scoring, not a replacement for official browser scoring. Exports identify score profile metadata.

## Boundary

- Horizontal surface waypoints define mission intent.
- Segment distance and profile mechanics constrain achievable dive depth.
- Science is credited from actual depth-aware observations.
- Different layers may carry different scientific value.
- Integrated top-down priority is a planning summary, not automatic sample credit.
- Depth-target match is generally graded.
- Hard bathymetry and vehicle limits remain constraints.
- Scoring is versioned.
- No arbitrary XYZ route planner is added.
- No operational/calibrated ocean validation is claimed.
