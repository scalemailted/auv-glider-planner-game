import assert from 'node:assert/strict';
import fs from 'node:fs';
import { productionPhaserRetirementManifest, productionPhaserRetirementSummary } from '../../src/core/runtime/ProductionPhaserRetirementManifest.js';

const manifest = productionPhaserRetirementManifest();
assert.equal(manifest.phaserDependencyStillRequired, true, 'Phaser dependency remains required in this phase');
assert.equal(manifest.readyForFinalPhaserRemoval, false, 'final Phaser removal is not approved');
assert.equal(manifest.boundaryFlags.legacyPhaserEditorWorldReachableInProduction, false, 'legacy Phaser editor world is retired from normal production path');
assert.equal(manifest.boundaryFlags.canonicalEditorDocumentIsAuthority, true);
const summary = productionPhaserRetirementSummary({ activeThreeEditorRendererCount: 1, activeLegacyPhaserEditorWorldRendererCount: 0 });
assert.equal(summary.activeLegacyPhaserEditorWorldRendererCount, 0);
const packageJson = JSON.parse(fs.readFileSync('package.json', 'utf8'));
assert.ok(packageJson.dependencies?.phaser || packageJson.devDependencies?.phaser, 'Phaser package dependency is still declared');
const index = fs.readFileSync('index.html', 'utf8');
assert.ok(index.includes('src/game/main.js'), 'production entry remains src/game/main.js');
console.log('audit_production_phaser_scene_retirement: PASS', JSON.stringify({ phaserRequired: manifest.phaserDependencyStillRequired, readyForRemoval: manifest.readyForFinalPhaserRemoval }));
