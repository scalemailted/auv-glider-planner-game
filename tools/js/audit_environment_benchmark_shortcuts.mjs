import { assertCondition, createHomegrownEnvironmentBaselineFixture, fnv1aDigest, noCalibratedOceanClaims, productionBathymetryEnsemble, stats } from './scientific_baseline_helpers.mjs';

const fixture = createHomegrownEnvironmentBaselineFixture();
const ensemble = productionBathymetryEnsemble({ seeds: ['sci-a', 'sci-b', 'sci-c', 'sci-d'] });
const wetFractions = ensemble.records.map((row) => row.wetFraction);
const coastlineCounts = ensemble.records.map((row) => row.coastlineSegmentCount);
const maxDepths = ensemble.records.map((row) => row.maxDepthMeters);
const archetypeCounts = Object.fromEntries(ensemble.archetypes.map((id) => [id, ensemble.records.filter((row) => row.archetype === id).length]));
const warnings = [];

if (ensemble.duplicateDigestCount > 0) warnings.push('Duplicate bathymetry digests reduce benchmark diversity.');
if (Math.min(...wetFractions) <= 0.15 || Math.max(...wetFractions) >= 0.98) warnings.push('Some bathymetry fixtures are near-degenerate wet/dry domains.');
if (new Set(coastlineCounts).size <= 2) warnings.push('Coastline segment counts have limited diversity across archetypes.');
if (fixture.currents.maxDepthVectorDifference <= 0.005) warnings.push('Current depth vectors may be too weakly distinct for depth-aware planning benchmarks.');
if (fixture.currents.maxTemporalVectorDifference <= 0.005) warnings.push('Current temporal vectors may be too weakly distinct for time-aware planning benchmarks.');

const suitability = {
  packages: {
    bathymetry: 'YES for deterministic synthetic terrain regression and mission-feasibility benchmarking; NO for nautical/operational bathymetry validation without external datasets.',
    currents: 'YES for deterministic current-aware route and sampler regression through packages/currents; NO for calibrated ocean-forecast skill claims.',
    scalarProcesses: 'YES for manufactured scalar process and depth-sampling regression through packages/scalar-processes; NO for ecological/biogeochemical forecast validity.',
    environment: 'YES as a synthetic environment composition benchmark after package extraction; external-oracle validation remains missing.',
    missionSimulator: 'YES for software route-execution/referee regression; physical vehicle fidelity and calibrated ocean validation remain out of scope.'
  },
  decisions: {
    BATHY_PKG_R2: 'GO for packaging and richer manufactured tests; defer any claim of external validation.',
    FLOW_PKG_R1: 'GO for package extraction after this baseline; require manufactured current tests and source-claim guards as package gates.',
    PROCESS_PKG_R1: 'IMPLEMENTED for scalar artifact, sampler, diagnostics, source-claim, and manufactured regression boundaries; environment composition remains future work.'
  }
};

assertCondition(noCalibratedOceanClaims(fixture), 'Fixture contains forbidden calibrated/current provenance claim.');
assertCondition(ensemble.records.every((row) => row.synthetic && !row.calibratedSurveyData), 'Benchmark ensemble must remain synthetic and not calibrated.', ensemble.records);
assertCondition(Object.values(archetypeCounts).every((count) => count >= 4), 'Each bathymetry archetype should be represented in the shortcut audit.', archetypeCounts);

console.log('audit_environment_benchmark_shortcuts: ok', JSON.stringify({
  fixtureDigest: fnv1aDigest(fixture),
  ensemble: {
    recordCount: ensemble.recordCount,
    duplicateDigestCount: ensemble.duplicateDigestCount,
    archetypeCounts,
    wetFractionStats: stats(wetFractions),
    coastlineCountStats: stats(coastlineCounts),
    maxDepthStats: stats(maxDepths)
  },
  warnings,
  status: warnings.length ? 'WARN' : 'PASS',
  suitability
}, null, 2));
