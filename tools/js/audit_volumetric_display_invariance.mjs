import assert from 'node:assert/strict';
import { volumetricDisplayStateDigest } from '../../src/core/rendering/VolumetricMissionWorldViewModel.js';
import { makeVolumetricViewModel } from './water_column_smoke_helpers.mjs';

const physical = makeVolumetricViewModel({ verticalDisplayMode: 'physicalDepth' });
const exploded = makeVolumetricViewModel({ verticalDisplayMode: 'explodedLayers' });
const physicalDigest = volumetricDisplayStateDigest(physical);
const explodedDigest = volumetricDisplayStateDigest(exploded);
assert.equal(physicalDigest, explodedDigest, 'Display mode must not mutate route/profile/observation canonical state.');
assert.notEqual(physical.coordinateModel.layerWorldY.thermocline, exploded.coordinateModel.layerWorldY.thermocline, 'Display Y positions should differ between physical and exploded views.');
console.log(JSON.stringify({ ok: true, digest: physicalDigest }));
