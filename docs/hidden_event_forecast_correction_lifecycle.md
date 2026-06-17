# Hidden Event Hypothesis / Forecast-Correction Lifecycle

P9 adds a compact educational diagnosis layer that distinguishes two cases that often look similar in raw observations:

- Forecast correction: the expected field existed but was wrong in intensity, position, timing, depth layer, or boundary placement.
- Hidden event hypothesis: observations may indicate a phenomenon not represented in the forecast.

The implementation is pure browser/headless-compatible JavaScript under `src/core/science/`. It uses transparent heuristics for innovation, surprise, spatial/temporal coherence, forecast-correction state, and hidden-event hypothesis state. It does not perform production data assimilation, GP/GMRF inference, calibrated ocean forecasting, route planning, scoring changes, or MARL/RL.

## Public Artifacts

Headless episodes may include `scienceDiagnostics` and bundles may include `science_diagnostics.json` with type `anchor.headless.science-diagnostics`. The artifact is public-safe by design: it carries compact summaries such as primary diagnosis, confidence, recommended objective, forecast-correction status, hidden-event status, surprise summary, and coherence summary. It must not embed `T_hiddenTruth` or hidden field arrays.

Roundtrip reports may include `scienceDiagnosticsSummary` so browser and Colab workflows can inspect the same diagnosis without opening the full episode.

## Browser Surfaces

Adaptive Benchmark surfacing review shows Forecast Update and Discovery Update cards when science diagnostics are available. The Headless Bundle Viewer shows a Science Diagnosis section for loaded example bundles and solver-roundtrip bundles.

Boundary language shown in UI and docs:

- Forecast correction means the expected field existed but was wrong.
- Hidden event hypothesis means observations may indicate a phenomenon not represented in the forecast.
- P9 uses transparent educational heuristics, not production data assimilation.

## P10 Adaptive Science-Diagnosis Handoff

Science diagnosis informs the mission-manager objective recommendation. It does not generate a route. Forecast correction means the expected field existed but was wrong. Hidden event hypothesis means observations may indicate a phenomenon not represented in the forecast. The player or solver still plans the route.

P10 adds adaptive science-diagnosis context, mission-manager rationale, next-leg handoff metadata, objective-history display fields, and public-safe headless/browser summaries. It does not implement a new planner, scoring redesign, production data assimilation, GP/GMRF production inference, calibrated ocean forecast, Python simulator, or MARL/RL. Node/OceanBox-JS remains the canonical non-browser runtime; Python/Colab analyze artifacts or call Node.