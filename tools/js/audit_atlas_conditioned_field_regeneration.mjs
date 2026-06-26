import assert from 'node:assert/strict';
import { canonicalJsonStringify } from '../../packages/codecs/src/index.js';
import {
  buildEnvironmentStudioProject,
  createEnvironmentStudioSession,
  generateEnvironmentStudioRegionFromAtlasWindow,
  importEnvironmentStudioProject,
  regenerateEnvironmentStudioFields,
  selectEnvironmentStudioOperationalWindow,
  setEnvironmentStudioAtlasPreset,
  validateEnvironmentStudioProject
} from '../../src/core/editor/EnvironmentStudioProject.js';

const cases = [
  ['semi-enclosed gulf', 'syntheticGulfWorld', 'semiEnclosedGulfSurvey'],
  ['island chain', 'islandChainWorld', 'islandChainSurvey'],
  ['strait sill', 'straitSillWorld', 'straitSillSurvey'],
  ['open ocean eddy', 'openOceanEddyWorld', 'openOceanEddySurvey']
];

const rows = [];
for (const [label, atlasPreset, windowPreset] of cases) {
  let session = createEnvironmentStudioSession({ seed: `field-regen-audit:${atlasPreset}` });
  session = setEnvironmentStudioAtlasPreset(session, atlasPreset, { seed: `field-regen-audit:${atlasPreset}` });
  session = selectEnvironmentStudioOperationalWindow(session, windowPreset);
  session = generateEnvironmentStudioRegionFromAtlasWindow(session, { seed: `field-regen-audit:${atlasPreset}:${windowPreset}` });
  session = regenerateEnvironmentStudioFields(session, { seed: `field-regen-audit:${atlasPreset}:${windowPreset}` });

  const result = session.fieldRegenerationResult;
  assert.ok(result.fieldRegenerationDigest.startsWith('fnv1a32:'), `${label} field regeneration digest exists`);
  assert.ok(result.currentArtifactDigest.startsWith('fnv1a32:'), `${label} current digest exists`);
  assert.ok(result.scalarArtifactDigest.startsWith('fnv1a32:'), `${label} scalar digest exists`);
  assert.ok(result.hotspotArtifactDigest.startsWith('fnv1a32:'), `${label} hotspot digest exists`);
  assert.equal(result.currentDiagnostics.landVectorCount, 0, `${label} has no land vectors`);
  assert.equal(result.currentDiagnostics.belowBottomVectorCount, 0, `${label} has no below-bottom vectors`);
  assert.ok(Number.isFinite(result.currentDiagnostics.speedMean), `${label} finite current speed mean`);
  assert.ok(Number.isFinite(result.currentDiagnostics.divergenceRms), `${label} finite divergence metric`);
  assert.ok(Number.isFinite(result.scalarDiagnostics.scalarMean), `${label} finite scalar mean`);
  assert.equal(result.hiddenTruthExposed, false, `${label} does not expose hidden truth`);
  assert.equal(result.claimBoundary.simulationChanged, false, `${label} does not change simulation`);
  assert.equal(result.claimBoundary.scoringChanged, false, `${label} does not change scoring`);
  assert.equal(session.dependencyGraph.nodes.currentArtifact.state, 'CURRENT');
  assert.equal(session.dependencyGraph.nodes.scalarArtifact.state, 'CURRENT');
  assert.equal(session.dependencyGraph.nodes.hotspots.state, 'CURRENT');
  assert.equal(session.dependencyGraph.nodes.startsDropZones.state, 'NEEDS_VALIDATION');
  assert.equal(session.dependencyGraph.nodes.benchmarkBundle.state, 'REQUIRES_REGENERATION');
  assert.equal(session.flowGenerationInputs.generatedArtifacts.currentField4D, true);
  assert.equal(session.flowGenerationInputs.generatedArtifacts.scalarField4D, true);
  assert.equal(session.flowGenerationInputs.generatedArtifacts.hotspots, true);

  const project = buildEnvironmentStudioProject(session);
  assert.equal(project.fieldRegenerationResult.currentArtifactDigest, result.currentArtifactDigest);
  assert.equal(project.fieldRegenerationResult.storagePolicy.projectStoresCompactMetadataOnly, true);
  assert.equal(project.fieldRegenerationResult.generatedArtifacts.currentField4D, true);
  assert.ok(!('currentArtifact' in project.fieldRegenerationResult), 'project does not store full current 4D arrays');
  assert.ok(!('scalarArtifact' in project.fieldRegenerationResult), 'project does not store full scalar 4D arrays');
  const validation = validateEnvironmentStudioProject(project);
  assert.equal(validation.valid, true, validation.errors.join('\n'));
  const imported = importEnvironmentStudioProject(JSON.parse(canonicalJsonStringify(project)));
  const reexported = buildEnvironmentStudioProject(imported);
  assert.equal(reexported.fieldRegenerationResult.fieldRegenerationDigest, project.fieldRegenerationResult.fieldRegenerationDigest, `${label} import/export keeps field regen digest`);

  const text = canonicalJsonStringify(project.fieldRegenerationResult);
  assert.ok(!/"usesRealHycom"\s*:\s*true/.test(text), `${label} has no HYCOM claim`);
  assert.ok(!/"usesRealMarineCopernicus"\s*:\s*true/.test(text), `${label} has no Marine Copernicus claim`);
  assert.ok(!/"calibratedOceanProduct"\s*:\s*true/.test(text), `${label} has no calibrated product claim`);
  assert.ok(!/"operationalForecast"\s*:\s*true/.test(text), `${label} has no operational forecast claim`);
  assert.ok(!/"hiddenTruthExposed"\s*:\s*true/.test(text), `${label} exposes no hidden truth`);

  rows.push({
    label,
    atlasPreset,
    windowPreset,
    fieldRegenerationDigest: result.fieldRegenerationDigest,
    currentArtifactDigest: result.currentArtifactDigest,
    scalarArtifactDigest: result.scalarArtifactDigest,
    hotspotCount: result.hotspotArtifact.hotspots.length,
    currentComponents: result.currentRegimeComponents.map((entry) => entry.id).join('|'),
    scalarComponents: result.scalarRegimeComponents.map((entry) => entry.id).join('|')
  });
}

assert.ok(rows.some((row) => row.currentComponents.includes('localizedCanyonExchange')), 'audit covers localized exchange/strait component');
assert.ok(rows.some((row) => row.scalarComponents.includes('riverPlume')), 'audit covers river plume scalar component');
assert.ok(rows.some((row) => row.scalarComponents.includes('islandWakePatch')), 'audit covers island wake scalar component');

console.log('audit_atlas_conditioned_field_regeneration: ok', rows);
