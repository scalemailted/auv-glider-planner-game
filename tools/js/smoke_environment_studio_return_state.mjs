import assert from 'node:assert/strict';
import fs from 'node:fs';

const envSource = fs.readFileSync('src/game/phaser/scenes/EnvironmentStudioScene.js', 'utf8');
const regionalSource = fs.readFileSync('src/game/phaser/scenes/RegionalBathymetryScene.js', 'utf8');

assert.match(regionalSource, /buildReturnToAtlasState\(\)/, 'regional scene builds return payload');
assert.match(regionalSource, /returnFromRegional:\s*true/, 'regional return starts Environment Studio with return flag');
assert.match(regionalSource, /atlasViewport/, 'regional return payload carries atlas viewport');
assert.match(regionalSource, /selectedBounds/, 'regional return payload carries selected bounds');
assert.match(regionalSource, /selectedRegionActionState/, 'regional return payload carries selected action state');
assert.match(regionalSource, /returnStatePayloadDigest/, 'regional debug exposes return payload digest');

assert.match(envSource, /init\(data = {}\)/, 'Environment Studio accepts scene start payload');
assert.match(envSource, /applyRegionalReturnState\(\)/, 'Environment Studio applies regional return state');
assert.match(envSource, /lastReturnedFromRegional/, 'Environment Studio debug exposes return flag');
assert.match(envSource, /restoredSelectedBounds/, 'Environment Studio debug exposes selected-bounds restore flag');
assert.match(envSource, /restoredAtlasViewport/, 'Environment Studio debug exposes viewport restore flag');
assert.match(envSource, /selectEnvironmentStudioReferenceWindow\(nextSession/, 'return path reselects reference bounds');
assert.match(envSource, /setEnvironmentStudioWorldView\(nextSession/, 'return path restores atlas viewport');

console.log('smoke_environment_studio_return_state: ok');
