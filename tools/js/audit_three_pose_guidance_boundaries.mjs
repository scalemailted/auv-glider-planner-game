import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const pose = readFileSync('src/core/rendering/GliderPoseViewModel.js', 'utf8');
const gliderLayer = readFileSync('src/game/three/layers/ThreeGliderLayer.js', 'utf8');
const guidance = readFileSync('src/game/three/layers/ThreeGuidanceConeLayer.js', 'utf8');
assert.equal(/from 'three'|from "three"/.test(pose), false, 'pose adapter must not depend on Three');
assert.match(gliderLayer, /buildGliderPoseViewModel/, 'glider layer must consume pose adapter');
assert.match(gliderLayer, /setFromUnitVectors/, 'glider orientation should use quaternions');
assert.match(guidance, /canonicalPlanningGuidance/, 'guidance layer must identify canonical source');
assert.equal(/estimateRoute|isCellNavigable|SimulationEngine|score/i.test(guidance), false, 'guidance layer must not calculate route feasibility or scoring');
console.log('audit_three_pose_guidance_boundaries passed');
