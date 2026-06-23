import { assertCondition, createProductionCurrentFixture } from './scientific_baseline_helpers.mjs';

const fixture = createProductionCurrentFixture({ seed: 'sci-valid-r1-current-invariants' });
const diagnostics = fixture.diagnostics;
const metadata = fixture.field.sourceMetadata ?? {};

assertCondition(diagnostics.invalidVectorCount === 0, 'Current diagnostics found non-finite vectors.', diagnostics);
assertCondition(diagnostics.landVectorCount === 0, 'Current diagnostics found nonzero vectors on land.', diagnostics);
assertCondition(diagnostics.belowBottomVectorCount === 0, 'Current diagnostics found nonzero vectors below seabed.', diagnostics);
assertCondition(Number.isFinite(diagnostics.speedMean) && diagnostics.speedMean > 0, 'Current speed mean must be finite and positive.', diagnostics);
assertCondition(Number.isFinite(diagnostics.verticalShearRms) && diagnostics.verticalShearRms > 0, 'Production current should expose finite nonzero vertical shear.', diagnostics);
assertCondition(Number.isFinite(diagnostics.temporalChangeRms) && diagnostics.temporalChangeRms > 0, 'Production current should expose finite nonzero temporal change.', diagnostics);
assertCondition(diagnostics.cellwiseDirectionNoiseScore <= 0.75, 'Current field looks too much like a cellwise direction mosaic.', diagnostics);
assertCondition(metadata.sourceTier === 'scientificallyConstrainedSynthetic', 'Production current source tier should remain scientificallyConstrainedSynthetic.', metadata);
assertCondition(metadata.calibratedForecast === false && metadata.usesRealHycom === false && metadata.usesRealMarineCopernicus === false, 'Synthetic current metadata must not claim external calibrated forecast provenance.', metadata);

console.log('audit_current_physical_invariants: ok', JSON.stringify({
  fieldDigest: fixture.field.digest,
  status: diagnostics.status,
  sourceTier: metadata.sourceTier,
  equationFamily: metadata.equationFamily,
  speedMean: diagnostics.speedMean,
  speedMaximum: diagnostics.speedMaximum,
  divergenceRms: diagnostics.divergenceRms,
  coastlineNormalSpeedRms: diagnostics.coastlineNormalSpeedRms,
  verticalShearRms: diagnostics.verticalShearRms,
  temporalChangeRms: diagnostics.temporalChangeRms,
  spatialAutocorrelation: diagnostics.spatialAutocorrelation,
  cellwiseDirectionNoiseScore: diagnostics.cellwiseDirectionNoiseScore,
  landVectorCount: diagnostics.landVectorCount,
  belowBottomVectorCount: diagnostics.belowBottomVectorCount,
  warnings: diagnostics.warnings,
  failures: diagnostics.failures
}, null, 2));
