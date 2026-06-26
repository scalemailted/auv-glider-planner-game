import assert from 'node:assert/strict';
import { canonicalJsonDigest, canonicalJsonStringify } from '../../packages/codecs/src/index.js';
import {
  ENVIRONMENT_STUDIO_BATHYMETRY_ARCHETYPES,
  ENVIRONMENT_STUDIO_PROJECT_TYPE,
  buildEnvironmentStudioProject,
  createEnvironmentStudioMosaic,
  createEnvironmentStudioSession,
  environmentStudioDebugPayload,
  generateEnvironmentStudioTile,
  importEnvironmentStudioProject,
  normalizeEnvironmentStudioProject,
  patchEnvironmentStudioDomain,
  validateEnvironmentStudioProject
} from '../../src/core/editor/EnvironmentStudioProject.js';

const session = createEnvironmentStudioSession({
  profileId: 'tutorialCoast',
  archetypeId: 'coastalShelf',
  seed: 'env-studio-r1-smoke',
  label: 'ENV-STUDIO-R1 Smoke'
});
assert.equal(session.domainSpec.horizontal.columns, 25, 'tutorial profile derives expected columns');
assert.equal(session.domainSpec.horizontal.rows, 17, 'tutorial profile derives expected rows');
assert.equal(session.domainSpec.horizontal.cellCount, 425, 'tutorial profile remains compact');
assert.equal(session.domainSpec.claimBoundary.calibratedOceanProduct, false);

const tooLarge = createEnvironmentStudioSession({
  domainSpec: {
    horizontal: { widthMeters: 100000, heightMeters: 100000, cellSizeMeters: 10 },
    vertical: { maxDepthMeters: 200 }
  }
});
assert.equal(tooLarge.validationReport.status, 'FAIL', 'domain cell-count limit rejects browser-hostile grids');
assert.match(tooLarge.validationReport.errors.join('\n'), /exceeds maxDomainCellCount/);

const customDomain = patchEnvironmentStudioDomain(session, {
  widthMeters: 16000,
  heightMeters: 10000,
  cellSizeMeters: 1000,
  maxDepthMeters: 220,
  durationSeconds: 1800,
  dtSeconds: 300
});
assert.equal(customDomain.domainSpec.horizontal.cellCount, 187);
assert.equal(customDomain.tiles.length, 0, 'domain changes clear generated tile state');

const tileSession = generateEnvironmentStudioTile(customDomain, { seed: 'env-studio-r1-smoke', archetypeId: 'coastalShelf' });
assert.equal(tileSession.tiles.length, 1, 'single tile generated');
const tile = tileSession.tiles[0];
assert.ok(tile.manifest.tileDigest.startsWith('fnv1a32:'), 'tile manifest has digest');
assert.match(tile.bathymetryArtifact.artifactDigest, /fnv1a32:/, 'tile artifact has digest');
assert.equal(tile.diagnostics.finiteDepths, true, 'tile depths are finite');
assert.ok(tile.diagnostics.wetCellCount > 0, 'tile has wet cells');
assert.ok(tile.diagnostics.largestWetComponentFraction >= 0.5, 'tile has navigable wet component');

const repeatTileSession = generateEnvironmentStudioTile(customDomain, { seed: 'env-studio-r1-smoke', archetypeId: 'coastalShelf' });
assert.equal(repeatTileSession.tiles[0].manifest.tileDigest, tile.manifest.tileDigest, 'tile generation is deterministic by seed');
assert.equal(repeatTileSession.tiles[0].bathymetryArtifact.artifactDigest, tile.bathymetryArtifact.artifactDigest, 'artifact generation is deterministic by seed');

for (const archetype of ENVIRONMENT_STUDIO_BATHYMETRY_ARCHETYPES) {
  const archetypeSession = generateEnvironmentStudioTile(customDomain, {
    seed: `env-studio-r1-${archetype.id}`,
    archetypeId: archetype.id
  });
  assert.equal(archetypeSession.tiles[0].diagnostics.finiteDepths, true, `${archetype.id} finite depths`);
  assert.ok(archetypeSession.tiles[0].diagnostics.wetCellCount > 0, `${archetype.id} wet cells`);
}

const mosaicSession = createEnvironmentStudioMosaic(customDomain, {
  seed: 'env-studio-r1-smoke',
  archetypeId: 'submarineCanyon'
});
assert.equal(mosaicSession.tiles.length, 4, '2x2 mosaic creates four tiles');
assert.equal(mosaicSession.mosaic.seamReport.valid, true, 'mosaic seams pass');
assert.equal(mosaicSession.mosaic.seamReport.seamCount, 4, '2x2 mosaic has four adjacency seams');
assert.ok(mosaicSession.mosaic.manifest.mosaicDigest.startsWith('fnv1a32:'), 'mosaic manifest has digest');
assert.equal(mosaicSession.dependencyGraph.nodes.tileMosaic.state, 'CURRENT');
assert.equal(mosaicSession.dependencyGraph.nodes.currentArtifact.state, 'REQUIRES_REGENERATION');
assert.equal(mosaicSession.dependencyGraph.nodes.scalarArtifact.state, 'REQUIRES_REGENERATION');
assert.equal(mosaicSession.dependencyGraph.nodes.environmentArtifact.state, 'REQUIRES_REGENERATION');

const project = buildEnvironmentStudioProject(mosaicSession);
assert.equal(project.projectType, ENVIRONMENT_STUDIO_PROJECT_TYPE);
assert.equal(project.projectVersion, '1.0.0');
assert.equal(project.tiles.length, 4);
assert.ok(project.projectDigest.startsWith('fnv1a32:'));
assert.equal(project.provenance.hiddenTruthExposed, false);
assert.equal(project.provenance.calibratedOceanProduct, false);
assert.equal(project.provenance.operationalForecast, false);
assert.equal(project.provenance.certifiedForNavigation, false);
assert.equal(project.validationReport.summary.hiddenTruthIncluded, false);

const normalizedProject = normalizeEnvironmentStudioProject(JSON.parse(canonicalJsonStringify(project)));
assert.equal(normalizedProject.projectDigest, project.projectDigest, 'normalize/export/import keeps project digest stable');
const importedSession = importEnvironmentStudioProject(project);
assert.equal(buildEnvironmentStudioProject(importedSession).projectDigest, project.projectDigest, 'imported session exports to same project digest');

const validation = validateEnvironmentStudioProject(project);
assert.equal(validation.valid, true);
const { validationReportDigest, ...validationPayload } = validation.project.validationReport;
assert.equal(canonicalJsonDigest(validationPayload), validationReportDigest, 'validation digest matches report payload');

const hiddenValidation = validateEnvironmentStudioProject({
  ...project,
  hiddenTruth: [[1, 2, 3]]
});
assert.equal(hiddenValidation.valid, false, 'hidden-truth keys are rejected');
assert.match(hiddenValidation.errors.join('\n'), /Hidden-truth field is not allowed/);

const debug = environmentStudioDebugPayload(mosaicSession);
assert.equal(debug.projectType, ENVIRONMENT_STUDIO_PROJECT_TYPE);
assert.equal(debug.hiddenTruthExposed, false);
assert.equal(debug.simulationChanged, false);
assert.equal(debug.scoringChanged, false);
assert.equal(debug.previewRendererCount, 0);
assert.equal(debug.activeRafCount, 0);

const projectText = canonicalJsonStringify(project);
assert.ok(!/"calibratedOceanProduct"\s*:\s*true/.test(projectText), 'project does not claim calibrated ocean product');
assert.ok(!/"operationalForecast"\s*:\s*true/.test(projectText), 'project does not claim operational forecast');
assert.ok(!/"certifiedForNavigation"\s*:\s*true/.test(projectText), 'project does not claim certified navigation');

console.log('smoke_environment_studio_project: ok', {
  domainDigest: project.domainSpec.domainSpecDigest,
  tileCount: project.tiles.length,
  mosaicDigest: project.mosaic.manifest.mosaicDigest,
  projectDigest: project.projectDigest,
  validationDigest: project.validationReport.validationReportDigest
});
