import assert from 'node:assert/strict';
import { existsSync } from 'node:fs';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { currents, compactFieldRecord, selectedSamples, createPackageFixtureField } from './current_package_test_helpers.mjs';
import { createManufacturedCurrentField } from '../../packages/currents/src/ManufacturedCurrentFieldCatalog.js';
import { createBathymetryConditionedCurrentField } from '../../src/core/science/BathymetryConditionedCurrentBuilder.js';
import { createSyntheticCurrentCubeFixture } from '../../src/core/science/SyntheticCurrentCubeAdapter.js';
import { createFlowRuntimeR1Fixture, buildPlanningCurrentViewModelAt } from './flow_runtime_r1_current_helpers.mjs';

const fixturePath = path.resolve('tests/fixtures/current_package_r1_parity.json');
const update = process.argv.includes('--update');
const record = await buildRecord();

if (update) {
  await mkdir(path.dirname(fixturePath), { recursive: true });
  await writeFile(fixturePath, `${JSON.stringify(record, null, 2)}\n`, 'utf8');
  console.log('capture_current_package_r1_baseline: updated', { fixturePath, digest: record.digest, cases: record.cases.length });
} else {
  if (!existsSync(fixturePath)) throw new Error(`Missing parity fixture ${fixturePath}. Run with --update after reviewing output.`);
  const expected = JSON.parse(await readFile(fixturePath, 'utf8'));
  assert.deepEqual(record, expected);
  console.log('capture_current_package_r1_baseline: ok', { fixturePath, digest: record.digest, cases: record.cases.length });
}

export async function buildRecord() {
  const cases = [];
  const manufacturedIds = ['uniformTranslation', 'linearShearWithDepth', 'oscillatingTide', 'solidBodyEddy', 'translatingEddy', 'depthShearedEddy'];
  cases.push(recordCase('zeroCurrent', currents.createCurrentField4D({
    id: 'zero-current-package-r1',
    eastAxisMeters: [0, 10],
    northAxisMeters: [0, 10],
    depthAxisMeters: [0, 100],
    timeAxisSeconds: [0, 50, 100],
    uEastMetersPerSecond: [
      [[[0, 0], [0, 0]], [[0, 0], [0, 0]]],
      [[[0, 0], [0, 0]], [[0, 0], [0, 0]]],
      [[[0, 0], [0, 0]], [[0, 0], [0, 0]]]
    ],
    vNorthMetersPerSecond: [
      [[[0, 0], [0, 0]], [[0, 0], [0, 0]]],
      [[[0, 0], [0, 0]], [[0, 0], [0, 0]]],
      [[[0, 0], [0, 0]], [[0, 0], [0, 0]]]
    ],
    wetMask: [[true, true], [true, true]],
    bottomDepthMeters: [[150, 150], [150, 150]],
    sourceMetadata: { sourceTier: 'manufacturedAnalytical', sourceType: 'manufactured', sourceId: 'zero-current-package-r1', sourceLabel: 'Zero current fixture', equationFamily: 'manufactured:zeroCurrent', depthDependent: false, timeDependent: false }
  }), [0, 50, 100]));
  for (const id of manufacturedIds) cases.push(recordCase(id, createManufacturedCurrentField(id), null));
  cases.push(recordCase('alongShelfJetAndCanyonSynthetic', createBathymetryConditionedCurrentField({
    id: 'flow-pkg-r1-along-shelf-canyon',
    grid: { width: 12, height: 8, cellSizeMeters: 250 },
    depthAxisMeters: [0, 10, 35, 75, 150],
    timeAxisSeconds: [0, 600, 1200, 1800],
    seed: 909,
    temporalBoundaryMode: 'bounded',
    validTimeEndSeconds: 1800
  }), [0, 600, 1200, 1800]));
  const runtimeFixture = createFlowRuntimeR1Fixture({ seed: 'flow-pkg-r1-normal-generated', waypointCount: 3, agentCount: 3 });
  runtimeFixture.level.meta ??= {};
  runtimeFixture.level.meta.generationConfig ??= {};
  runtimeFixture.level.meta.generationConfig.environmentGeneratorBackendId = 'cpuBathymetryConditionedSyntheticV2';
  const normalVm = buildPlanningCurrentViewModelAt(runtimeFixture, 0);
  const normalField = normalVm.waterColumnExplorer.currentCube;
  const timelineTimes = [0, 28800, 57600, 75611.11, 144000, 172800];
  cases.push(recordCase('normalGeneratedRegionalChallenge', normalField, timelineTimes));
  cases.push(recordCase('legacySurfaceOnlyMission', createSyntheticCurrentCubeFixture({
    id: 'flow-pkg-r1-legacy-surface-only',
    waterColumnConfig: { depthLayerIds: ['surface'], diveProfileId: 'surfaceOnly' },
    depthAxisMeters: [0],
    timeAxisSeconds: [0, 600, 1200],
    seed: 303
  }), [0, 600, 1200]));
  const record = {
    type: 'anchor.currents.package-r1-parity-baseline',
    version: 'flow-pkg-r1',
    packageVersion: currents.PACKAGE_VERSION,
    generatedAt: 'deterministic-static-record',
    cases
  };
  record.digest = digestRecord(record);
  return record;
}

function recordCase(id, field, times) {
  const samples = selectedSamples(field, times);
  return {
    manifestConfigId: id,
    ...compactFieldRecord(field, samples)
  };
}

function digestRecord(record) {
  const copy = { ...record };
  delete copy.digest;
  return currents.currentFieldManifestDigest({ id: 'current-package-r1-parity-record', sourceMetadata: copy, depthAxisMeters: [0], timeAxisSeconds: [0] });
}