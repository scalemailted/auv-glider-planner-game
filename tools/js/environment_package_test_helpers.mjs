import assert from 'node:assert/strict';
import * as bathymetry from '../../packages/bathymetry/src/index.js';
import * as currents from '../../packages/currents/src/index.js';
import * as scalarProcesses from '../../packages/scalar-processes/src/index.js';
import * as environment from '../../packages/environment/src/index.js';

export { assert, bathymetry, currents, scalarProcesses, environment };

export function createFixtureBathymetry(options = {}) {
  return bathymetry.createBathymetryArtifact({
    id: options.id ?? 'environment-fixture-bathymetry',
    coordinateFrame: 'localEastNorthDown',
    bottomDepthMeters: options.bottomDepthMeters ?? [[120, 120], [120, 80]],
    wetMask: options.wetMask ?? [[true, true], [true, true]],
    landMask: options.landMask ?? [[false, false], [false, false]],
    physicalExtentMeters: options.physicalExtentMeters ?? { east: 10, north: 10 },
    sourceMetadata: {
      sourceTier: 'manufacturedAnalytical',
      sourceType: 'manufactured',
      sourceId: options.id ?? 'environment-fixture-bathymetry',
      synthetic: true,
      calibratedBathymetry: false,
      operationalNavigationProduct: false
    }
  });
}

export function createFixtureCurrent(options = {}) {
  const eastAxisMeters = options.eastAxisMeters ?? [0, 5, 10];
  const northAxisMeters = options.northAxisMeters ?? [0, 10];
  const depthAxisMeters = options.depthAxisMeters ?? [0, 40, 100];
  const timeAxisSeconds = options.timeAxisSeconds ?? [0, 100];
  const u = timeAxisSeconds.map((_time, ti) => depthAxisMeters.map((_depth, zi) => northAxisMeters.map((_north, yi) => eastAxisMeters.map((_east, xi) => round(0.1 + ti + zi * 0.2 + yi * 0.03 + xi * 0.01)))));
  const v = timeAxisSeconds.map((_time, ti) => depthAxisMeters.map((_depth, zi) => northAxisMeters.map((_north, yi) => eastAxisMeters.map((_east, xi) => round(-0.05 + ti * 0.1 - zi * 0.04 + yi * 0.02 - xi * 0.01)))));
  return currents.createCurrentField4D({
    id: options.id ?? 'environment-fixture-current-truth',
    coordinateFrame: 'localEastNorthDown',
    eastAxisMeters,
    northAxisMeters,
    depthAxisMeters,
    timeAxisSeconds,
    temporalBoundaryMode: options.temporalBoundaryMode ?? 'bounded',
    validTimeStartSeconds: 0,
    validTimeEndSeconds: timeAxisSeconds.at(-1),
    uEastMetersPerSecond: u,
    vNorthMetersPerSecond: v,
    wetMask: options.wetMask ?? [[true, true, true], [true, true, true]],
    bottomDepthMeters: options.bottomDepthMeters ?? [[120, 120, 120], [120, 90, 80]],
    sourceMetadata: {
      sourceTier: 'manufacturedAnalytical',
      sourceType: 'manufactured',
      sourceId: options.id ?? 'environment-fixture-current-truth',
      equationFamily: 'manufactured:environmentCurrentFixture',
      temporalBoundaryMode: options.temporalBoundaryMode ?? 'bounded',
      validTimeStartSeconds: 0,
      validTimeEndSeconds: timeAxisSeconds.at(-1),
      hiddenTruthIncluded: options.hiddenTruthIncluded === true,
      synthetic: true,
      calibratedForecast: false,
      usesRealHycom: false,
      usesRealMarineCopernicus: false
    }
  });
}

export function createFixtureScalar(options = {}) {
  const xAxis = options.xAxis ?? [0, 10];
  const yAxis = options.yAxis ?? [0, 10];
  const depthAxisMeters = options.depthAxisMeters ?? [0, 50, 100];
  const timeAxisSeconds = options.timeAxisSeconds ?? [0, 100];
  const scalarValue = timeAxisSeconds.map((timeSeconds) => depthAxisMeters.map((depthMeters) => yAxis.map((_north, yi) => xAxis.map((_east, xi) => round(1 + xi + yi * 2 + depthMeters * 0.02 + timeSeconds * 0.001)))));
  return scalarProcesses.createScalarField4D({
    id: options.id ?? 'environment-fixture-scalar-truth',
    coordinateFrame: 'localEastNorthDown',
    xAxis,
    yAxis,
    depthAxisMeters,
    timeAxisSeconds,
    scalarValue,
    sourceMetadata: {
      sourceTier: 'manufacturedAnalytical',
      sourceType: 'manufactured',
      sourceId: options.id ?? 'environment-fixture-scalar-truth',
      variableId: options.variableId ?? 'scienceValue',
      units: 'normalized science value',
      processKind: options.processKind ?? 'manufactured:environmentScalarFixture',
      equationFamily: 'manufactured:environmentScalarFixture',
      synthetic: true,
      calibratedOceanForecast: false,
      calibratedBiogeochemicalForecast: false,
      hiddenTruthIncluded: options.hiddenTruthIncluded === true
    }
  });
}

export function createFixtureEnvironment(options = {}) {
  const bathy = options.bathymetry ?? createFixtureBathymetry(options.bathymetryOptions);
  const current = options.current ?? createFixtureCurrent(options.currentOptions);
  const scalar = options.scalar ?? createFixtureScalar(options.scalarOptions);
  return environment.createEnvironmentArtifact({
    id: options.id ?? 'environment-package-fixture',
    seed: options.seed ?? 'env-pkg-r1-fixture',
    generatorId: 'environmentPackageTestHelper',
    generatorVersion: 'env-pkg-r1',
    coordinateFrame: 'localEastNorthDown',
    operationalDomain: {
      id: 'environment-fixture-domain',
      coordinateFrame: 'localEastNorthDown',
      horizontal: { minEastMeters: 0, minNorthMeters: 0, widthMeters: 10, heightMeters: 10 },
      vertical: { minDepthMeters: 0, maxDepthMeters: 120 },
      time: { startSeconds: 0, durationSeconds: 100, dtSeconds: 10 }
    },
    bathymetry: bathy,
    currentFields: [current],
    scalarFields: [scalar],
    fieldRoles: {
      bathymetry: { epistemicRole: 'publicReference', publicVisibility: 'publicScenario' },
      currentFields: {
        [current.id]: { epistemicRole: 'truth', publicVisibility: options.hiddenCurrent === true ? 'hidden' : 'publicScenario', containsHiddenTruth: options.hiddenCurrent === true }
      },
      scalarFields: {
        [scalar.id]: { epistemicRole: options.scalarRole ?? 'truth', publicVisibility: options.hiddenScalar === true ? 'hidden' : 'publicScenario', containsHiddenTruth: options.hiddenScalar === true }
      }
    },
    claimBoundary: {
      synthetic: true,
      scientificallyConstrained: true,
      calibratedOceanProduct: false,
      operationalForecast: false,
      certifiedForNavigation: false
    }
  });
}

export function selectedEnvironmentSamples(artifact) {
  const sampler = environment.createEnvironmentSampler(artifact);
  return [
    environment.sampleEnvironment(sampler, 0, 0, 0, 0, { includeMetadata: true }),
    environment.sampleEnvironment(sampler, 5, 5, 50, 50),
    environment.sampleEnvironment(sampler, 10, 10, 100, 100)
  ].map(compactSample);
}

export function compactEnvironmentRecord(artifact) {
  const summary = environment.environmentArtifactSummary(artifact);
  return {
    id: artifact.id,
    environmentManifestDigest: artifact.manifestDigest,
    environmentArtifactDigest: artifact.artifactDigest,
    componentDigests: summary.componentDigests,
    fieldRoleSummary: summary.fieldRoleSummary,
    validationStatus: summary.validationSummary.status,
    coordinateFrame: summary.coordinateFrame,
    timeCoverage: summary.timeCoverage,
    depthCoverage: summary.depthCoverage,
    samples: selectedEnvironmentSamples(artifact)
  };
}

export function compactSample(sample) {
  return {
    eastMeters: sample.eastMeters,
    northMeters: sample.northMeters,
    depthMeters: sample.depthMeters,
    timeSeconds: sample.timeSeconds,
    bathymetryBottomDepthMeters: sample.bathymetry?.bottomDepthMeters ?? null,
    currentFieldId: sample.current?.fieldId ?? null,
    currentU: sample.current?.uEastMetersPerSecond ?? null,
    currentV: sample.current?.vNorthMetersPerSecond ?? null,
    scalarValues: Object.fromEntries(Object.entries(sample.scalars ?? {}).map(([id, value]) => [id, value.value])),
    valid: sample.valid
  };
}

function round(value, digits = 8) {
  const number = Number(value);
  return Number.isFinite(number) ? Number(number.toFixed(digits)) : 0;
}
