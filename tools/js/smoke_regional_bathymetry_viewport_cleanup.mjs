import assert from 'node:assert/strict';
import fs from 'node:fs';

const source = fs.readFileSync('src/game/phaser/scenes/RegionalBathymetryScene.js', 'utf8');
const css = fs.readFileSync('css/panels.css', 'utf8');

assert.match(source, /data-regional-viewport-clean="true"/, 'regional viewport exposes clean viewport marker');
assert.match(source, /data-regional-bathymetry-clean-viewport/, 'regional viewport exposes clean terrain host marker');
assert.match(source, /data-regional-viewport-status/, 'regional viewport exposes compact status chip');
assert.match(source, /data-regional-selected-boundary-label/, 'regional viewport exposes compact selected-boundary chip');
assert.doesNotMatch(source, /class="environment-studio-route regional-bathymetry-route"[\s\S]*?<header class="environment-studio-route-header">/, 'regional center route does not render report header before terrain');
assert.doesNotMatch(source, /regional-bathymetry-inline-metrics[\s\S]*?data-regional-bathymetry-three-host/, 'regional center viewport does not put metric tables above renderer');
assert.match(css, /\.regional-bathymetry-preview-host\s*{[\s\S]*?overflow:\s*hidden;/, 'regional preview host prevents center scroll');
assert.match(css, /\.regional-bathymetry-three-shell\s*{[\s\S]*?height:\s*100%;/, 'regional Three shell fills viewport height');

console.log('smoke_regional_bathymetry_viewport_cleanup: ok');
