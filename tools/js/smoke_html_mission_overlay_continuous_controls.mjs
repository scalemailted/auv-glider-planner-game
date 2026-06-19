import assert from 'node:assert/strict';
import fs from 'node:fs';

const source = fs.readFileSync('src/ui/HtmlMissionWorkspaceOverlay.js', 'utf8');
assert.match(source, /function rendererBackendSection\(state, continuousUi = normalizeContinuousMissionUiState\(state\)\)/);
assert.match(source, /const waypointSnapMode = continuousUi\.waypointSnapMode;/);
assert.match(source, /const coordinateProfile = continuousUi\.coordinateProfileId;/);
assert.match(source, /const fieldSamplingProfile = continuousUi\.fieldSamplingProfileId;/);
assert.match(source, /rendererBackendSection\(state, continuousUi\)/);
assert.match(source, /waterColumnSection\(state, continuousUi\)/);
assert.match(source, /fieldRenderingSection\(continuousUi\)/);

for (const label of ['Planning Tools', 'Waypoint Placement', 'Water Column', 'Dive Planning', 'Field Rendering', 'Camera Controls']) {
  assert.ok(source.includes(label), `Missing visible section label: ${label}`);
}
for (const label of ['Free Placement', 'Snap To Cell', 'Snap To Feature', 'Layer Slices', 'Smoothed Slices', 'Volumetric Cloud', 'Hybrid']) {
  assert.ok(source.includes(label) || source.includes(label.replace(/ /g, '')), `Missing control label: ${label}`);
}
for (const action of ['waypoint-snap-mode', 'water-column-volume-render-mode', 'water-column-dive-profile', 'water-column-target-layer', 'water-column-active-layer', 'three-camera']) {
  assert.ok(source.includes(`data-action="${action}"`) || source.includes(`'${action}'`), `Missing action binding: ${action}`);
}
assert.equal(/globalThis\.waypointSnapMode/.test(source), false, 'Do not use global waypointSnapMode fallback');

console.log('smoke_html_mission_overlay_continuous_controls: ok');