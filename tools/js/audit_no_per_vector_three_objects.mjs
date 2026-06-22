import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const instanced = readFileSync('src/game/three/layers/ThreeInstancedCurrentGlyphLayer.js', 'utf8');
assert.match(instanced, /InstancedMesh/);
assert.doesNotMatch(instanced, /new\s+THREE\.(ArrowHelper|Line|Mesh)\s*\([^\n]*vector/i);
assert.match(instanced, /standaloneVectorObjectCount:\s*0/);
console.log('[audit_no_per_vector_three_objects] PASS');
