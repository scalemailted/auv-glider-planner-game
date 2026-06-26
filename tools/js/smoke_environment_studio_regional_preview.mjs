import assert from 'node:assert/strict';
import { canonicalJsonStringify } from '../../packages/codecs/src/index.js';
import {
  ENVIRONMENT_STUDIO_PROJECT_TYPE,
  buildEnvironmentStudioProject,
  createEnvironmentStudioMosaic,
  createEnvironmentStudioSession,
  environmentStudioDebugPayload,
  environmentStudioInspectorViewModel,
  importEnvironmentStudioProject,
  normalizeEnvironmentStudioProject,
  selectEnvironmentStudioObject,
  updateEnvironmentStudioRegionalRecipe,
  validateEnvironmentStudioProject
} from '../../src/core/editor/EnvironmentStudioProject.js';

let session = createEnvironmentStudioSession({
  profileId: 'largeRegionalSurvey',
  seed: 'env-studio-r1-1-regional-smoke',
  label: 'ENV-STUDIO-R1.1 Regional Smoke'
});

assert.equal(session.environmentType, 'largeRegionalSurvey');
assert.equal(session.previewMode, 'bathymetry3d');
assert.equal(session.sourceGridShape.cellCount, session.domainSpec.horizontal.cellCount);
assert.ok(session.previewDecimation.factor > 1, 'large regional preset uses preview decimation');
assert.ok(session.previewGridShape.cellCount <= session.previewDecimation.maxPreviewCells, 'preview mesh stays within budget');
assert.equal(session.previewDecimation.preservesSourceGridExport, true);

session = updateEnvironmentStudioRegionalRecipe(session, {
  missionScale: 'fleetBenchmark4to6',
  intendedGliders: 4,
  regionalTemplate: 'semiEnclosedGulf',
  coastlineOrientation: 'curvedGulf',
  openOceanBoundaries: ['east', 'south'],
  featureMix: {
    shelfFraction: 'medium',
    deepBasinFraction: 'high',
    canyonDensity: 'high',
    islandSeamountCount: 'high',
    coastlineComplexity: 'high',
    riverMouthDeltaInfluence: 'high',
    ridgeSillStrength: 'medium',
    shelfBreakSharpness: 'high',
    featureDiversity: 'high'
  },
  previewDetail: 'low'
});

session = createEnvironmentStudioMosaic(session, { seed: 'env-studio-r1-1-regional-smoke' });
assert.equal(session.tiles.length, 4, 'regional mosaic creates four tiles');
assert.equal(session.mosaic.seamReport.valid, true, 'regional seam blending passes');
assert.equal(session.mosaic.seamReport.seamCount, 4, '2x2 regional mosaic has four seams');

const archetypes = new Set(session.tiles.map((tile) => tile.archetypeId));
assert.ok(archetypes.size >= 3, 'default regional mosaic includes at least three feature families');
assert.ok(session.tiles.every((tile) => tile.tileConfig && tile.featureRole), 'per-tile provenance is recorded');

const summary = session.regionalFeatureSummary;
assert.equal(summary.generated, true);
assert.ok(Number.isFinite(summary.landFraction));
assert.ok(Number.isFinite(summary.wetFraction));
assert.ok(Number.isFinite(summary.featureDiversityScore));
assert.ok(summary.featureDiversityScore >= 0.4, 'regional feature diversity is visible');
assert.ok(summary.featureFamilies.length >= 3, 'feature families are summarized');
assert.notEqual(session.multiGliderSuitability.status, 'FAIL', 'regional suitability is not failing for default large survey');
assert.equal(session.multiGliderSuitability.officialScoringInput, false);

const regionInspector = environmentStudioInspectorViewModel(session);
assert.equal(regionInspector.objectType, 'region');
assert.match(regionInspector.properties.flat().join(' '), /Regional Template/);

const tileSelected = selectEnvironmentStudioObject(session, { type: 'tile', id: session.tiles[0].id });
const tileInspector = environmentStudioInspectorViewModel(tileSelected);
assert.equal(tileInspector.objectType, 'tile');
assert.match(tileInspector.properties.flat().join(' '), /Feature Role/);

const seamId = `${session.mosaic.seamReport.seams[0].fromTileId}:${session.mosaic.seamReport.seams[0].edgePair}:${session.mosaic.seamReport.seams[0].toTileId}`;
const seamSelected = selectEnvironmentStudioObject(session, { type: 'seam', id: seamId });
const seamInspector = environmentStudioInspectorViewModel(seamSelected);
assert.equal(seamInspector.objectType, 'seam');
assert.equal(seamInspector.status, 'PASS');

const dependencySelected = selectEnvironmentStudioObject(session, { type: 'dependency', id: 'environmentArtifact' });
const dependencyInspector = environmentStudioInspectorViewModel(dependencySelected);
assert.equal(dependencyInspector.objectType, 'dependency');
assert.match(dependencyInspector.properties.flat().join(' '), /Launch to Planning remains disabled/);

const project = buildEnvironmentStudioProject(session);
assert.equal(project.projectType, ENVIRONMENT_STUDIO_PROJECT_TYPE);
assert.equal(project.environmentType, 'largeRegionalSurvey');
assert.equal(project.regionalTemplate, 'semiEnclosedGulf');
assert.equal(project.previewMode, 'bathymetry3d');
assert.deepEqual(project.sourceGridShape, session.sourceGridShape);
assert.deepEqual(project.previewGridShape, session.previewGridShape);
assert.deepEqual(project.previewDecimation, session.previewDecimation);
assert.deepEqual(project.regionalFeatureSummary, session.regionalFeatureSummary);
assert.deepEqual(project.multiGliderSuitability, session.multiGliderSuitability);
assert.equal(project.provenance.hiddenTruthExposed, false);
assert.equal(project.provenance.calibratedOceanProduct, false);

const normalizedProject = normalizeEnvironmentStudioProject(JSON.parse(canonicalJsonStringify(project)));
assert.equal(normalizedProject.projectDigest, project.projectDigest, 'regional project digest survives normalize round trip');
const imported = importEnvironmentStudioProject(project);
assert.equal(buildEnvironmentStudioProject(imported).projectDigest, project.projectDigest, 'regional import/export digest is stable');

const validation = validateEnvironmentStudioProject(project);
assert.equal(validation.valid, true, validation.errors.join('\n'));
const hiddenValidation = validateEnvironmentStudioProject({ ...project, hiddenTruth: [[1]] });
assert.equal(hiddenValidation.valid, false, 'hidden truth is still rejected');

const debug = environmentStudioDebugPayload(session);
assert.equal(debug.previewMode, 'bathymetry3d');
assert.equal(debug.terrainPreviewRendererCount, 0);
assert.equal(debug.terrainPreviewRafCount, 0);
assert.equal(debug.stalePreviewObjects, 0);
assert.equal(debug.hiddenTruthExposed, false);
assert.equal(debug.simulationChanged, false);
assert.equal(debug.scoringChanged, false);
assert.ok(debug.tileArchetypes.length >= 4);

const projectText = canonicalJsonStringify(project);
assert.ok(!/"calibratedOceanProduct"\s*:\s*true/.test(projectText));
assert.ok(!/"operationalForecast"\s*:\s*true/.test(projectText));
assert.ok(!/"certifiedForNavigation"\s*:\s*true/.test(projectText));

console.log('smoke_environment_studio_regional_preview: ok', {
  sourceCells: session.sourceGridShape.cellCount,
  previewCells: session.previewGridShape.cellCount,
  decimationFactor: session.previewDecimation.factor,
  featureDiversityScore: session.regionalFeatureSummary.featureDiversityScore,
  suitability: session.multiGliderSuitability.status,
  projectDigest: project.projectDigest
});
