import assert from 'node:assert/strict';
import { canonicalJsonStringify } from '../../packages/codecs/src/index.js';
import {
  NO_REFERENCE_DATA_FIXTURE,
  REFERENCE_BATHYMETRY_BLOCKED_MESSAGE,
  buildBathymetryFromReferenceWindow,
  createDefaultReferenceBathymetryWindow,
  createReferenceBathymetryAtlas
} from '../../src/core/editor/ReferenceBathymetryAtlas.js';
import {
  buildEnvironmentStudioProject,
  createEnvironmentStudioSession,
  generateEnvironmentStudioRegionFromReferenceWindow,
  importEnvironmentStudioProject,
  loadEnvironmentStudioReferenceFixture,
  selectEnvironmentStudioReferenceWindow,
  validateEnvironmentStudioProject
} from '../../src/core/editor/EnvironmentStudioProject.js';

const blockedAtlas = createReferenceBathymetryAtlas();
const blockedWindow = createDefaultReferenceBathymetryWindow(blockedAtlas);
assert.equal(blockedAtlas.provenance.fixtureStatus, NO_REFERENCE_DATA_FIXTURE);
assert.throws(
  () => buildBathymetryFromReferenceWindow(blockedAtlas, blockedWindow),
  new RegExp(REFERENCE_BATHYMETRY_BLOCKED_MESSAGE.split(':')[0]),
  'default checked-in placeholder cannot generate reference-backed bathymetry'
);

const { manifest, fixture } = fixtureManifest();
const atlas = createReferenceBathymetryAtlas({
  manifest,
  referenceFixtures: [fixture]
});
const window = createDefaultReferenceBathymetryWindow(atlas);
const result = buildBathymetryFromReferenceWindow(atlas, window, {
  seed: 'bathy-data-r1-reference-patch-smoke'
});

assert.equal(result.type, 'anchor.reference-patch-bathymetry-builder-result');
assert.ok(result.builderDigest.startsWith('fnv1a32:'));
assert.equal(result.atlasDigest, atlas.atlasDigest);
assert.equal(result.patchDigest, window.patchDigest);
assert.ok(result.bathymetryArtifactDigest);
assert.equal(result.bathymetryArtifactDigest, result.bathymetryArtifact.artifactDigest);
assert.equal(result.validationReport.valid, true);
assert.notEqual(result.validationReport.status, 'FAIL');

const field = result.bathymetryField;
assert.ok(field.bottomDepthMeters.length > 0, 'field has depth rows');
assert.ok(field.bottomDepthMeters[0].length > 0, 'field has depth columns');
assert.ok(field.bottomDepthMeters.flat().every((depth) => Number.isFinite(Number(depth)) && Number(depth) >= 0), 'bottom depth is finite positive-down');
assert.ok(field.wetMask.flat().some(Boolean), 'field has wet cells');
assert.ok(field.landMask.flat().some(Boolean), 'field has land cells');
assert.ok(result.coastlineSummary.segmentCount >= 0, 'coastline summary exists');

const flow = result.flowGenerationInputs;
assert.equal(flow.generatedArtifacts.currentField4D, false);
assert.equal(flow.generatedArtifacts.scalarField4D, false);
assert.equal(flow.generatedArtifacts.hotspots, false);
assert.equal(flow.dependencyPlan.currents, 'REQUIRES_REGENERATION');
assert.equal(flow.dependencyPlan.scalarFields, 'REQUIRES_REGENERATION');
assert.equal(flow.dependencyPlan.hotspots, 'REQUIRES_REGENERATION');
assert.equal(flow.dependencyPlan.startsDropZones, 'NEEDS_VALIDATION');
assert.equal(flow.dependencyPlan.benchmarkBundle, 'REQUIRES_REGENERATION');
assert.equal(flow.sourceDataset.name, 'ETOPO_2022_TEST_FIXTURE');

let session = createEnvironmentStudioSession({
  seed: 'bathy-data-r1-studio-smoke',
  referenceBathymetryManifest: manifest,
  referenceFixtures: [fixture]
});
assert.equal(session.sourceMode, 'referenceBathymetryAtlas');
assert.equal(session.studioStage, 'globalAtlasSelector');
assert.equal(session.referenceAtlas.sourceDataset.referenceDataAvailable, true);
session = selectEnvironmentStudioReferenceWindow(session, window.bounds);
session = loadEnvironmentStudioReferenceFixture(session, fixture.fixtureId);
assert.equal(session.studioStage, 'regionalPatchWorkspace');
session = generateEnvironmentStudioRegionFromReferenceWindow(session, {
  seed: 'bathy-data-r1-studio-smoke:generated'
});

assert.equal(session.studioStage, 'regionalPatchWorkspace');
assert.equal(session.tiles.length, 4);
assert.equal(session.bathymetryArtifactDigest, session.bathymetryBuilderResult.bathymetryArtifactDigest);
assert.equal(session.dependencyGraph.nodes.currentArtifact.state, 'REQUIRES_REGENERATION');
assert.equal(session.dependencyGraph.nodes.scalarArtifact.state, 'REQUIRES_REGENERATION');
assert.equal(session.dependencyGraph.nodes.hotspots.state, 'REQUIRES_REGENERATION');
assert.equal(session.dependencyGraph.nodes.startsDropZones.state, 'NEEDS_VALIDATION');

const project = buildEnvironmentStudioProject(session);
assert.equal(project.sourceMode, 'referenceBathymetryAtlas');
assert.equal(project.referenceAtlas.sourceDataset.name, 'ETOPO_2022_TEST_FIXTURE');
assert.equal(project.selectedReferenceWindow.patchDigest, window.patchDigest);
assert.equal(project.selectedPatchDigest, window.patchDigest);
assert.equal(project.bathymetryBuilderResult.type, 'anchor.reference-patch-bathymetry-builder-summary');
assert.equal(project.bathymetryBuilderResult.patchDigest, window.patchDigest);
assert.equal(project.flowGenerationInputs.patchDigest, window.patchDigest);
assert.equal(project.provenance.hiddenTruthExposed, false);
assert.equal(project.provenance.operationalForecast, false);
assert.equal(project.provenance.certifiedForNavigation, false);

const validation = validateEnvironmentStudioProject(project);
assert.equal(validation.valid, true, validation.errors.join('\n'));
const imported = importEnvironmentStudioProject(JSON.parse(canonicalJsonStringify(project)));
const reexported = buildEnvironmentStudioProject(imported);
assert.equal(reexported.sourceMode, project.sourceMode, 'reference patch project roundtrip keeps source mode');
assert.equal(reexported.selectedPatchDigest, project.selectedPatchDigest, 'reference patch project roundtrip keeps selected patch');
assert.equal(reexported.bathymetryArtifactDigest, project.bathymetryArtifactDigest, 'reference patch project roundtrip keeps bathymetry artifact digest');
assert.equal(reexported.referenceAtlas.sourceDataset.name, project.referenceAtlas.sourceDataset.name, 'reference patch project roundtrip keeps source dataset');

const text = canonicalJsonStringify(project);
assert.ok(!/"hiddenTruthExposed"\s*:\s*true/.test(text));
assert.ok(!/"currentField4D"\s*:\s*true/.test(text));
assert.ok(!/"scalarField4D"\s*:\s*true/.test(text));
assert.ok(!/"certifiedForNavigation"\s*:\s*true/.test(text));

console.log('smoke_reference_patch_to_bathymetry_artifact: ok', {
  blockedFixtureStatus: blockedAtlas.provenance.fixtureStatus,
  atlasDigest: atlas.atlasDigest,
  patchDigest: window.patchDigest,
  bathymetryArtifactDigest: project.bathymetryArtifactDigest,
  projectDigest: project.projectDigest
});

function fixtureManifest() {
  const bounds = {
    westLon: -124.4,
    eastLon: -121.7,
    southLat: 35.6,
    northLat: 37.4
  };
  const rasterArtifact = {
    artifactType: 'anchor.reference-bathymetry-raster',
    artifactVersion: '1.0.0',
    fixtureId: 'bathy_data_r1_test_fixture',
    role: 'lowResolutionReferencePatch',
    sourceResolution: '60 arc-second',
    actualRasterResolutionArcSeconds: 60,
    degreeResolution: {
      longitudeDegrees: 1 / 60,
      latitudeDegrees: 1 / 60
    },
    sourceDataset: {
      name: 'ETOPO_2022_TEST_FIXTURE',
      provider: 'NOAA NCEI style local test fixture',
      version: 'v1-test',
      sourceResolution: '60 arc-second',
      actualRasterResolutionArcSeconds: 60,
      verticalUnits: 'meters relative to sea level',
      horizontalCoordinateFrame: 'EPSG:4326 lon/lat',
      citation: 'Synthetic numeric fixture for BATHY-DATA-R1 smoke testing only.',
      licenseOrTermsNote: 'Not public source data; test-only compact fixture.'
    },
    bounds,
    grid: {
      columns: 4,
      rows: 4,
      lonAxis: [-124.4, -123.5, -122.6, -121.7],
      latAxis: [37.4, 36.8, 36.2, 35.6],
      elevationMeters: [
        [120, 30, -80, -350],
        [40, -120, -700, -1350],
        [-30, -420, -1100, -2200],
        [-60, -650, -1450, -2800]
      ]
    },
    derived: {
      depthMetersPositiveDown: [
        [0, 0, 80, 350],
        [0, 120, 700, 1350],
        [30, 420, 1100, 2200],
        [60, 650, 1450, 2800]
      ],
      wetMask: [
        [false, false, true, true],
        [false, true, true, true],
        [true, true, true, true],
        [true, true, true, true]
      ],
      landMask: [
        [true, true, false, false],
        [true, false, false, false],
        [false, false, false, false],
        [false, false, false, false]
      ]
    },
    summaries: {
      minElevationMeters: -2800,
      maxElevationMeters: 120,
      minDepthMeters: 30,
      maxDepthMeters: 2800,
      meanDepthMeters: 1055,
      landFraction: 0.1875,
      oceanFraction: 0.8125,
      wetConnectedFraction: 1,
      slopeStats: { min: 90, mean: 540, max: 900, finite: true },
      shelfFraction: 0.2,
      basinFraction: 0.3
    },
    provenance: {
      preprocessor: 'anchor-reference-bathy-preprocessor-v1',
      sourceFileName: 'bathy_data_r1_test_fixture.tif',
      sourceFileDigest: 'sha256:test',
      sourceResolution: '60 arc-second',
      actualRasterResolutionArcSeconds: 60,
      degreeResolution: {
        longitudeDegrees: 1 / 60,
        latitudeDegrees: 1 / 60
      },
      role: 'lowResolutionReferencePatch',
      claimBoundary: 'test fixture only; not certified navigation data',
      localAbsolutePathsIncluded: false,
      hiddenTruthExposed: false
    },
    rasterDigest: 'sha256:test-raster'
  };
  const fixture = {
    fixtureId: rasterArtifact.fixtureId,
    label: 'BATHY-DATA-R1 Test Fixture',
    role: rasterArtifact.role,
    sourceDataset: rasterArtifact.sourceDataset,
    provider: rasterArtifact.sourceDataset.provider,
    sourceResolution: rasterArtifact.sourceResolution,
    actualRasterResolutionArcSeconds: rasterArtifact.actualRasterResolutionArcSeconds,
    columns: rasterArtifact.grid.columns,
    rows: rasterArtifact.grid.rows,
    bounds,
    rasterPath: 'assets/reference_bathymetry/bathy_data_r1_test_fixture.reference-bathymetry-raster.json',
    digest: rasterArtifact.rasterDigest,
    tags: ['shelf', 'slope', 'coastal'],
    rasterArtifact
  };
  const manifest = {
    artifactType: 'anchor.reference-bathymetry-manifest',
    artifactVersion: '1.0.0',
    fixtureStatus: 'AVAILABLE',
    overview: {
      overviewId: 'bathy_data_r1_test_global_overview',
      label: 'BATHY-DATA-R1 Test Global Overview',
      role: 'globalOverview',
      sourceDataset: 'ETOPO_2022_TEST_FIXTURE',
      provider: rasterArtifact.sourceDataset.provider,
      sourceResolution: rasterArtifact.sourceResolution,
      sourceKey: 'bathy_data_r1_test_global_overview',
      sourceVariant: 'test global overview metadata',
      actualRasterResolutionArcSeconds: rasterArtifact.actualRasterResolutionArcSeconds,
      displayResolution: {
        columns: 360,
        rows: 180
      },
      resolution: rasterArtifact.sourceResolution,
      digest: rasterArtifact.rasterDigest,
      bounds: {
        westLon: -180,
        eastLon: 180,
        southLat: -90,
        northLat: 90
      }
    },
    fixtures: [fixture],
    provenance: {
      generatedBy: 'smoke_reference_patch_to_bathymetry_artifact.mjs',
      source: 'in-memory test fixture',
      localAbsolutePathsIncluded: false,
      hiddenTruthExposed: false
    },
    claimBoundary: {
      referenceBathymetryAvailable: true,
      placeholderPresentedAsReferenceData: false,
      currentField4DGenerated: false,
      scalarField4DGenerated: false,
      certifiedForNavigation: false,
      operationalOceanForecast: false,
      hiddenTruthExposed: false
    }
  };
  return { manifest, fixture };
}
