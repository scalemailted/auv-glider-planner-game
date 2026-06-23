import { assertCondition, manufacturedCurrentCatalogIds, manufacturedCurrentExactness } from './scientific_baseline_helpers.mjs';
import { computeCurrentFieldScientificDiagnostics } from '../../src/core/science/CurrentFieldScientificDiagnostics.js';
import { createManufacturedCurrentField } from '../../src/core/science/ManufacturedCurrentFieldCatalog.js';

const results = manufacturedCurrentCatalogIds().map((id) => {
  const exactness = manufacturedCurrentExactness(id);
  const diagnostics = computeCurrentFieldScientificDiagnostics(createManufacturedCurrentField(id));
  const tolerance = id === 'oscillatingTide' ? 0.07 : 1e-8;
  assertCondition(exactness.error.linf <= tolerance, `${id} manufactured current interpolation error exceeds tolerance.`, { tolerance, error: exactness.error });
  assertCondition(exactness.rows.every((row) => row.wet === true), `${id} manufactured current unexpectedly masked samples.`);
  assertCondition(diagnostics.invalidVectorCount === 0, `${id} diagnostics found non-finite vectors.`, diagnostics);
  assertCondition(diagnostics.landVectorCount === 0 && diagnostics.belowBottomVectorCount === 0, `${id} diagnostics found land or below-bottom vectors.`, diagnostics);
  return {
    id,
    sourceTier: exactness.sourceTier,
    depthDependent: exactness.depthDependent,
    timeDependent: exactness.timeDependent,
    error: exactness.error,
    divergenceRms: diagnostics.divergenceRms,
    vorticityMean: diagnostics.vorticityMean,
    status: diagnostics.status
  };
});

console.log('smoke_manufactured_current_cases: ok', JSON.stringify({ cases: results }, null, 2));


