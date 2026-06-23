import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { artifactDigest } from '../../packages/contracts/src/index.js';
import { bathymetryArtifactSummary, createBathymetrySampler, sampleBathymetry } from '../../packages/bathymetry/src/index.js';
import { createBathymetryArtifactFromField } from '../../src/core/generation/BathymetryArtifactAdapter.js';
import { createRegionalContinentalShelfScenario } from '../../src/core/generation/RegionalMissionDefaults.js';
import {
  createBasinSeamountBathymetry,
  createBathymetryField,
  createCoastalOperationalBathymetry,
  createIslandArcBathymetry,
  createShelfCanyonBathymetry,
  extractCoastlineEdges
} from '../../src/core/science/BathymetryFieldModel.js';
import { createSignedTerrainSurfaceFromBathymetry, validateSignedTerrainSurface } from '../../src/core/science/SignedTerrainSurfaceModel.js';

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const fixturePath = path.join(repoRoot, 'tests/fixtures/bathymetry_package_r1_parity.json');

export function captureBathymetryPackageR1Baseline() {
  const records = [
    captureCase('compact-coastal-shelf', () => createCoastalOperationalBathymetry({ seed: 'bathy-pkg-r1-compact-shelf', width: 28, height: 18, maxDepthMeters: 220 })),
    captureCase('regional-shelf-basin', () => createRegionalContinentalShelfScenario({ seed: 'bathy-pkg-r1-regional-shelf' }), { regionalLevel: true }),
    captureCase('submarine-canyon', () => createShelfCanyonBathymetry({ seed: 'bathy-pkg-r1-canyon', width: 34, height: 22, maxDepthMeters: 260 })),
    captureCase('island-seamount', () => createIslandArcBathymetry({ seed: 'bathy-pkg-r1-island', width: 34, height: 22, maxDepthMeters: 260 })),
    captureCase('legacy-surface-compatible', () => createBathymetryField({ seed: 'bathy-pkg-r1-legacy', width: 12, height: 9, depthMeters: legacyDepthGrid(12, 9), synthetic: true })),
    captureCase('regional-fleet-survey-fixture', () => createRegionalContinentalShelfScenario({ seed: 'bathy-pkg-r1-fleet-survey' }), { regionalLevel: true }),
    captureCase('static-bathymetric-world-view', () => createCoastalOperationalBathymetry({ seed: 'gfx-r2-coastalShelf', width: 58, height: 38, maxDepthMeters: 280, verticalExaggeration: 1.8 }))
  ];
  return {
    type: 'anchor.tests.bathymetry-package-r1-parity',
    version: 'bathy-pkg-r1',
    generatedBy: 'tools/js/capture_bathymetry_package_r1_baseline.mjs',
    fullArraysStored: false,
    records
  };
}

function captureCase(id, factory, options = {}) {
  const generated = factory();
  const level = options.regionalLevel ? generated : null;
  const bathymetry = level?.bathymetry ?? generated;
  const signedTerrainSurface = level?.signedTerrainSurface ?? createSignedTerrainSurfaceFromBathymetry(bathymetry, { minimumNavigableDepthMeters: 8 });
  const artifact = level?.bathymetryArtifact ?? createBathymetryArtifactFromField(bathymetry, { id, signedTerrainSurface });
  const summary = bathymetryArtifactSummary(artifact);
  const sampler = createBathymetrySampler(artifact);
  const representativeSamples = samplePoints(sampler).map((point) => sampleBathymetry(sampler, point.eastMeters, point.northMeters));
  const depthValues = bathymetry.depthMeters.flat().map(Number).filter(Number.isFinite);
  const signedValidation = validateSignedTerrainSurface(signedTerrainSurface);
  return {
    id,
    seed: bathymetry.seed ?? level?.meta?.seed ?? null,
    manifestDigest: artifact.manifestDigest,
    bathymetryArtifactDigest: artifact.artifactDigest,
    sourceDepthDigest: artifactDigest(bathymetry.depthMeters),
    signedTerrainDigest: signedTerrainSurface.digest,
    wetMaskDigest: artifactDigest(artifact.wetMask),
    landMaskDigest: artifactDigest(artifact.landMask),
    coastlineDigest: artifactDigest(artifact.coastline?.length ? artifact.coastline : extractCoastlineEdges(artifact.landMask)),
    width: summary.eastCount,
    height: summary.northCount,
    physicalExtentMeters: { east: summary.eastExtentMeters, north: summary.northExtentMeters },
    minSignedElevationMeters: summary.minSignedElevationMeters,
    maxSignedElevationMeters: summary.maxSignedElevationMeters,
    minBottomDepthMeters: summary.minBottomDepthMeters,
    maxBottomDepthMeters: summary.maxBottomDepthMeters,
    sourceMinDepthMeters: round(Math.min(...depthValues)),
    sourceMaxDepthMeters: round(Math.max(...depthValues)),
    wetCellCount: summary.wetCellCount,
    landCellCount: summary.landCellCount,
    coastlineSegmentCount: summary.coastlineSegmentCount,
    validationStatus: summary.validationStatus,
    terrainValidationStatus: signedValidation.status,
    representativeSamples: representativeSamples.map((sample) => ({
      eastMeters: sample.eastMeters,
      northMeters: sample.northMeters,
      bottomDepthMeters: sample.bottomDepthMeters,
      signedElevationMeters: sample.signedElevationMeters,
      wet: sample.wet,
      land: sample.land,
      outsideDomain: sample.outsideDomain,
      lowerEastIndex: sample.lowerEastIndex,
      lowerNorthIndex: sample.lowerNorthIndex
    }))
  };
}

function samplePoints(sampler) {
  const east = [sampler.minEastMeters, lerp(sampler.minEastMeters, sampler.maxEastMeters, 0.25), lerp(sampler.minEastMeters, sampler.maxEastMeters, 0.5), lerp(sampler.minEastMeters, sampler.maxEastMeters, 0.75), sampler.maxEastMeters];
  const north = [sampler.minNorthMeters, lerp(sampler.minNorthMeters, sampler.maxNorthMeters, 0.35), lerp(sampler.minNorthMeters, sampler.maxNorthMeters, 0.5), lerp(sampler.minNorthMeters, sampler.maxNorthMeters, 0.65), sampler.maxNorthMeters];
  return east.map((eastMeters, index) => ({ eastMeters: round(eastMeters), northMeters: round(north[index]) }));
}

function legacyDepthGrid(width, height) {
  return Array.from({ length: height }, (_row, y) => Array.from({ length: width }, (_cell, x) => x < 2 ? 0 : round(12 + x * 3 + y * 1.5)));
}

function lerp(a, b, t) {
  return Number(a) + (Number(b) - Number(a)) * Number(t);
}

function round(value, digits = 6) {
  const number = Number(value);
  return Number.isFinite(number) ? Number(number.toFixed(digits)) : null;
}

const isMain = process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url);
if (isMain) {
  const update = process.argv.includes('--update');
  const current = captureBathymetryPackageR1Baseline();
  if (update) {
    await fs.mkdir(path.dirname(fixturePath), { recursive: true });
    await fs.writeFile(fixturePath, `${JSON.stringify(current, null, 2)}\n`, 'utf8');
    console.log('capture_bathymetry_package_r1_baseline: updated', path.relative(repoRoot, fixturePath));
  } else {
    const expected = JSON.parse(await fs.readFile(fixturePath, 'utf8'));
    assert.deepEqual(current, expected);
    console.log('capture_bathymetry_package_r1_baseline: ok', { records: current.records.length });
  }
}