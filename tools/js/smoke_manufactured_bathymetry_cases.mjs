import { assertCondition, manufacturedBathymetryCaseCatalog, sampleManufacturedBathymetryCase } from './scientific_baseline_helpers.mjs';

const results = manufacturedBathymetryCaseCatalog().map((definition) => {
  const result = sampleManufacturedBathymetryCase(definition.id, { width: 49, height: 37, sampleCount: 100 });
  assertCondition(result.finite, `${definition.id} produced non-finite bathymetry samples.`, result.error);
  assertCondition(result.landMaskAgreement, `${definition.id} land/wet mask disagreement.`, result.rows.filter((row) => row.expectedLand));
  if (definition.exactness === 'bilinearExact') {
    assertCondition(result.error.linf <= 1e-5, `${definition.id} should be bilinear exact within artifact precision.`, result.error);
  } else if (definition.exactness === 'convergentApproximation') {
    assertCondition(result.error.l2 <= definition.thresholdMeters, `${definition.id} interpolation L2 exceeds manufactured threshold.`, result.error);
  }
  return {
    id: result.id,
    exactness: result.exactness,
    sampleCount: result.sampleCount,
    error: result.error,
    validationStatus: result.artifactSummary.validationStatus,
    wetCellCount: result.artifactSummary.wetCellCount,
    landCellCount: result.artifactSummary.landCellCount
  };
});

console.log('smoke_manufactured_bathymetry_cases: ok', JSON.stringify({ cases: results }, null, 2));

