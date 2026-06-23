# Bathymetry-Conditioned Synthetic Currents

The standard generated current field is a scientifically constrained synthetic teaching model, not a calibrated forecast and not real HYCOM or Marine Copernicus data.

Bathymetry constrains and steers the field. It does not imply generic downhill flow. Default coastal flow favors alongshore or along-isobath motion. Cross-shelf flow is only introduced by explicit named components:

- `barotropicTide`
- `canyonExchangeApproximation`
- `optionalWindDrivenSurfaceShear`

Other named components include `alongShelfJet`, `shelfBreakJet`, `depthShear`, `mesoscaleEddy`, `translatingEddy`, and `islandWakeApproximation`. Each component is deterministic, bounded, and listed in source metadata.
