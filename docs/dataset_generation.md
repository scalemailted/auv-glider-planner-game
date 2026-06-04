# Dataset Generation

Dataset export supports three levels of data:

- Level/solver packet datasets for fair planner input.
- Training examples JSONL for supervised/imitation workflows.
- `anchor.oracleDataset` for a single active challenge with hidden truth, result labels, trajectories, and feature specs.

Use solver packet datasets for A*, Dijkstra, dynamic programming, classical multi-agent planning, and fair stochastic evaluation. Use oracle datasets for RL/ML training, offline scoring, truth/forecast deltas, and benchmark analysis where hidden truth is allowed.

The Dataset Export scene generates small deterministic synthetic datasets in the browser. Defaults are intentionally small so normal browser use stays responsive.

## Exports

- Level dataset JSON: `anchor.levelDataset` with generated `anchor.level` objects.
- Solver packet dataset JSON: `anchor.solverPacketDataset` with one packet per generated level.
- Training examples JSONL: one JSON object per line with level, mission, nullable target plan, and metadata.

## Fields

Generated levels include terrain, hazards, truth frames, optional forecast frames, bases, generation seed, and difficulty metadata.

Dataset controls generate synthetic ocean-inspired parametric current presets. Dataset levels store preset, strength, temporal variability, seed, and current magnitude statistics in `meta.generationConfig.currentGenerator` and still export normal `truth.frames[].current` grids, so solver packets and training examples do not need a different current-field shape.

Forecast-mode generated datasets default to stochastic layers:

- forecast ensembles
- probabilistic ROI cells with value, probability, and expected value
- timed mobile hazards
- bathymetry/depth grids
- stochastic metadata with RNG seed and ROI scoring mode

Generated levels also include `instanceId` and `meta.generationConfig`. Dataset exports include `datasetId` and per-level identity summaries so training runs can recall or compare exact generated game instances.

The same identity fields are used by saved local levels, solver packets, plans, and results. This makes a generated level instance traceable across classroom sharing, solver benchmarking, and dataset exports.

Solver packets include level, mission, visible planning fields, challenge mode, selected forecast member, ROI view mode, stochastic seed/scoring config, normalized mission end-condition rules, normalized sampling rules, mobile hazards, depth, and expected plan format.

Training-example metadata includes mission rules plus stochastic fields such as `roiScoringMode`, `rngSeed`, selected forecast member, probabilistic ROI availability, ensemble count, mobile-hazard count, priority-target count, and depth availability.

Dataset exports preserve current stats such as mean speed, max speed, standard deviation, strong-current cell ratio, near-calm cell ratio, classification, and gameplay warnings. These can be used to filter generated datasets by planning difficulty.

Stochastic dataset metadata records the ROI scoring mode, deterministic seed, probabilistic ROI availability, ensemble count, mobile-hazard count, depth availability, and probability-outcome metadata. Actual realized ROI outcomes are generated during simulation because they depend on the sampled cells and run seed.

Training examples use:

```json
{
  "levelId": "dataset_1",
  "instanceId": "GID-...",
  "missionId": "tutorial_sampling",
  "input": {
    "level": {},
    "mission": {}
  },
  "target": {
    "plan": null
  },
  "metadata": {
    "difficulty": "medium",
    "seed": 1,
    "generationConfig": {}
  }
}
```

## Uses

Datasets can support classical planner testing, solver assignments, offline analysis, and future ML experiments. The browser does not train ML models in this pass.

Forecast-mode datasets include forecast fields, Gold Star priority targets, and ensemble members as visible planning data. Hidden truth can be included in solver packets only when the benchmarking toggle is enabled.

## Limitations

Current fields are ocean-inspired synthetic fields, not physical ocean-model output, HYCOM data, or a full Navier-Stokes solver. Fluid presets are designed for readable gameplay variation and deterministic dataset generation. Probability and mobile-hazard fields are educational approximations. Default target plans are `null` unless a separate solver or human plan is used.
