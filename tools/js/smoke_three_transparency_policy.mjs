import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { THREE_MATERIAL_RENDER_ORDER_POLICY } from '../../src/game/three/ThreeRenderCostPolicy.js';

assert.ok(THREE_MATERIAL_RENDER_ORDER_POLICY.contextSlabs < THREE_MATERIAL_RENDER_ORDER_POLICY.activeScalarSlab, 'active scalar slab renders after context slabs');
assert.ok(THREE_MATERIAL_RENDER_ORDER_POLICY.activeScalarSlab < THREE_MATERIAL_RENDER_ORDER_POLICY.plannedAndRealizedPaths, 'paths render after slabs');
assert.ok(THREE_MATERIAL_RENDER_ORDER_POLICY.plannedAndRealizedPaths < THREE_MATERIAL_RENDER_ORDER_POLICY.gliders, 'gliders render above paths');
const slab = readFileSync('src/game/three/layers/ThreeOperationalDepthSlabLayer.js', 'utf8');
assert.match(slab, /contextMaterials/, 'context slabs reuse shared materials');
assert.match(slab, /depthWrite:\s*false/, 'transparent slabs do not depth-write over route geometry');
assert.match(slab, /depthTest:\s*true/, 'slabs still depth-test with terrain/frame context');
assert.match(slab, /side:\s*THREE\.FrontSide/, 'slabs avoid unnecessary double-sided full-domain rendering');
assert.match(slab, /wireframe:\s*true/, 'context slabs use low-cost outline/grid representation');
const renderer = readFileSync('src/game/three/ThreeMissionWorldRenderer.js', 'utf8');
assert.match(renderer, /visibleSceneObjectCount/, 'renderer reports visible object count');
assert.match(renderer, /hiddenSceneObjectCount/, 'renderer reports hidden object count');
console.log(JSON.stringify({ ok: true, policy: THREE_MATERIAL_RENDER_ORDER_POLICY }));
