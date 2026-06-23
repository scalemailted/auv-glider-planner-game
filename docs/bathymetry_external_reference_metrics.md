# Bathymetry External Reference Metrics

This document defines the metrics that should be used when a future phase compares ANCHOR bathymetry artifacts against an external bathymetry reference. SCI-VALID-R1 does not import external data and does not claim external validation.

## Current Status

The current bathymetry baseline is deterministic and synthetic. It is verified with manufactured analytical cases, package artifact validation, sampler exactness/convergence checks, and synthetic ensemble statistics. It is not validated against GEBCO, ETOPO, NOAA, EMODnet, multibeam surveys, or any operational navigation product.

## Required External-Reference Metadata

A future external reference fixture should record:

- source name and version
- license and citation
- access date
- native horizontal datum and projection
- vertical datum
- units and positive-depth convention
- native resolution
- resampling method
- crop bounds
- land/water mask source
- no-data handling
- whether the source is suitable for navigation, education, or visualization only

## Suggested Metrics

Compare scalar depth values with:

- mean error
- signed bias
- mean absolute error
- RMSE
- p50/p90/p95 absolute error
- maximum absolute error after no-data masking

Compare terrain derivatives with:

- slope RMSE
- slope-rank correlation
- curvature RMSE
- roughness spectrum or low/high-frequency energy ratio
- shelf-break depth-band overlap where applicable

Compare masks and coastlines with:

- wet/dry confusion matrix
- land false positive and false negative counts
- coastline distance error
- connected wet-region count
- navigable-depth agreement by threshold

Compare mission impact with:

- deployment-zone wetness agreement
- route-corridor bottom-clearance disagreement
- predicted grounding-risk disagreement
- sampling-target accessibility disagreement
- terrain-aware warning precision/recall if a labeled reference exists

## Acceptance Boundary

External-reference metrics can establish fit for a specific benchmark fixture only when the source, crop, units, thresholds, and intended use are documented. They do not automatically make the generator operationally valid for another region or scale.

Until this exists, bathymetry package work should describe itself as deterministic synthetic terrain and manufactured numerical verification, not calibrated survey validation.