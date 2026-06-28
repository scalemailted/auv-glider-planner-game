import { readFileSync } from 'node:fs';
import path from 'node:path';
import {
  buildBathymetryFromReferenceWindow,
  createReferenceBathymetryAtlas,
  createReferenceBathymetryWindow
} from '../../src/core/editor/ReferenceBathymetryAtlas.js';
import {
  buildEnvironmentStudioProject,
  createEnvironmentStudioSession,
  generateEnvironmentStudioRegionFromReferenceWindow,
  importEnvironmentStudioProject,
  loadEnvironmentStudioReferenceFixture,
  regenerateEnvironmentStudioFields,
  selectEnvironmentStudioReferenceWindow,
  validateEnvironmentStudioProject
} from '../../src/core/editor/EnvironmentStudioProject.js';
import {
  buildReferenceBathymetryEnvironment
} from '../../src/core/generation/ReferenceBathymetryEnvironmentBuilder.js';
import { canonicalJsonStringify } from '../../packages/codecs/src/index.js';

const root = process.cwd();

export function readJson(relativePath) {
  return JSON.parse(readFileSync(path.join(root, relativePath), 'utf8'));
}

export function loadMissionReadyReferenceFixture() {
  const manifest = readJson('assets/reference_bathymetry/manifest.json');
  const fixture = manifest.fixtures?.find((entry) => entry.fixtureId === 'monterey_canyon_15s')
    ?? manifest.fixtures?.find((entry) => entry.role === 'missionReadyPatch');
  if (!fixture) throw new Error('Mission-ready reference bathymetry fixture is missing.');
  const rasterArtifact = readJson(fixture.rasterPath);
  return {
    manifest,
    fixture: {
      ...fixture,
      rasterArtifact
    }
  };
}

export function createMissionReadyReferenceContext(seed = 'field-regen-r1-reference-smoke') {
  const { manifest, fixture } = loadMissionReadyReferenceFixture();
  const atlas = createReferenceBathymetryAtlas({
    manifest,
    referenceFixtures: [fixture]
  });
  const window = createReferenceBathymetryWindow({
    ...fixture.bounds,
    selectedResolutionMeters: 1500,
    previewResolutionMeters: 6000
  }, atlas);
  const bathymetryResult = buildBathymetryFromReferenceWindow(atlas, window, { seed });
  return { manifest, fixture, atlas, window, bathymetryResult };
}

export function buildReferenceEnvironment(seed = 'field-regen-r1-reference-smoke') {
  const context = createMissionReadyReferenceContext(seed);
  const result = buildReferenceBathymetryEnvironment({
    referenceFixtureId: context.fixture.fixtureId,
    bathymetryArtifact: context.bathymetryResult.bathymetryArtifact,
    wetLandMask: context.bathymetryResult.wetLandMask,
    coastlineSummary: context.bathymetryResult.coastlineSummary,
    slopeStats: context.bathymetryResult.sampledStats?.slopeStats,
    shelfFraction: context.bathymetryResult.sampledStats?.shelfFraction,
    basinFraction: context.bathymetryResult.sampledStats?.basinFraction,
    sourceMetadata: {
      referenceFixtureId: context.fixture.fixtureId,
      sourceDataset: context.atlas.sourceDataset,
      atlasDigest: context.atlas.atlasDigest,
      patchDigest: context.window.patchDigest,
      referenceBathymetryManifestDigest: context.manifest.manifestDigest,
      bathymetryArtifactDigest: context.bathymetryResult.bathymetryArtifactDigest,
      fixtureStatus: context.manifest.fixtureStatus,
      fixtureRole: context.fixture.role,
      actualRasterResolutionArcSeconds: context.fixture.actualRasterResolutionArcSeconds
    },
    fieldPolicy: {
      label: 'Reference bathymetry + deterministic synthetic bathymetry-conditioned fields.'
    },
    flowGenerationInputs: context.bathymetryResult.flowGenerationInputs,
    intendedGliders: 3,
    seed
  });
  return { ...context, result };
}

export function buildReferenceStudioSession(seed = 'field-regen-r1-reference-studio-smoke') {
  const { manifest, fixture } = loadMissionReadyReferenceFixture();
  let session = createEnvironmentStudioSession({
    seed,
    referenceBathymetryManifest: manifest,
    referenceFixtures: [fixture]
  });
  session = selectEnvironmentStudioReferenceWindow(session, {
    ...fixture.bounds,
    selectedResolutionMeters: 1500
  });
  session = loadEnvironmentStudioReferenceFixture(session, fixture.fixtureId);
  session = generateEnvironmentStudioRegionFromReferenceWindow(session, { seed: `${seed}:bathy` });
  session = regenerateEnvironmentStudioFields(session, { seed: `${seed}:fields` });
  const project = buildEnvironmentStudioProject(session);
  const validation = validateEnvironmentStudioProject(project);
  const imported = importEnvironmentStudioProject(JSON.parse(canonicalJsonStringify(project)));
  const reexported = buildEnvironmentStudioProject(imported);
  return { manifest, fixture, session, project, validation, reexported };
}

export function publicMetadataText(value) {
  return canonicalJsonStringify(value);
}
