# Ocean-Coherent Synthetic Current Components

Normal generated production currents are scientifically constrained synthetic fields. They are not calibrated ocean forecasts and are not real HYCOM or Marine Copernicus data.

Required components in the default regional synthetic field:

- `alongShelfJet`
- `depthShear`
- `barotropicTide`
- `mesoscaleEddy`
- `translatingEddy`
- `calmOrWeakCurrentRegion`
- `localizedCanyonExchange`

Additional educational components may include `shelfBreakJet`, `islandWakeApproximation`, and `optionalWindDrivenSurfaceShear`.

Perturbations are deterministic, low-frequency, bounded terms. Cellwise independent random direction fields are prohibited. Bathymetry defines wet volume and may steer declared components, but it does not create a generic downhill flow toward the deepest basin.
