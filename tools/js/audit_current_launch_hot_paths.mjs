import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const sampler = readFileSync('src/core/science/OceanCurrentFieldSampler.js', 'utf8');
const truth = readFileSync('src/core/sim/TruthWorld.js', 'utf8');
const explorer = readFileSync('src/core/rendering/WaterColumnLayerExplorerViewModel.js', 'utf8');
const sampleBody = sampler.slice(sampler.indexOf('export function samplePreparedOceanCurrent'), sampler.indexOf('export function sampleOceanCurrentVector'));
assert.equal(/normalizeOceanCurrentField4D|oceanCurrentField4DDigest|createSyntheticCurrentCubeFromMissionWorld/.test(sampleBody), false, 'sample hot path must not normalize, digest, or build current cubes');
assert.equal(/sampleCurrent[\s\S]*oceanCurrentField4DDigest/.test(truth), false, 'TruthWorld.sampleCurrent must not digest current fields');
assert.equal(/currentLayerFromCube[\s\S]*getOceanCurrentSampler/.test(explorer), true, 'render current samples use cached sampler');
console.log('[audit_current_launch_hot_paths] PASS');