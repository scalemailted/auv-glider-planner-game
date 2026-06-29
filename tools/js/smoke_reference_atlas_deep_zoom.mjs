import assert from 'node:assert/strict';
import { canonicalJsonStringify } from '../../packages/codecs/src/index.js';
import {
  REFERENCE_ATLAS_FOCUS_ZOOM,
  REFERENCE_ATLAS_MAX_ZOOM,
  referenceAtlasViewForCenter,
  referenceAtlasViewport,
  referenceAtlasZoomView
} from '../../src/core/editor/ReferenceBathymetryAtlas.js';
import { loadReferenceAtlasFixtureContext } from './reference_atlas_test_helpers.mjs';

const { atlas } = await loadReferenceAtlasFixtureContext();

assert.ok(REFERENCE_ATLAS_MAX_ZOOM >= 16, `atlas max zoom supports deep zoom: ${REFERENCE_ATLAS_MAX_ZOOM}`);
assert.ok(REFERENCE_ATLAS_FOCUS_ZOOM >= 16, `focus zoom supports close patch review: ${REFERENCE_ATLAS_FOCUS_ZOOM}`);

const resetView = referenceAtlasViewport({ panX: 0, panY: 0, zoom: 1 }, atlas);
assert.equal(resetView.zoom, 1, 'reset view zoom');
assert.equal(resetView.lonWest, -180, 'reset west');
assert.equal(resetView.lonEast, 180, 'reset east');
assert.equal(resetView.latSouth, -90, 'reset south');
assert.equal(resetView.latNorth, 90, 'reset north');
assert.equal(resetView.worldFractionVisible, 1, 'reset shows full world');

const centeredZoom = referenceAtlasZoomView({ panX: 0, panY: 0, zoom: 1 }, 64, atlas, { x: 0.5, y: 0.5 });
const centeredViewport = referenceAtlasViewport(centeredZoom, atlas);
assert.ok(centeredViewport.zoom >= 16, `centered wheel zoom reaches >=16x: ${centeredViewport.zoom}`);
assert.ok(centeredViewport.zoom <= REFERENCE_ATLAS_MAX_ZOOM, 'centered zoom respects max');

const gulfZoom = referenceAtlasZoomView({ panX: 0, panY: 0, zoom: 4 }, 8, atlas, { x: 0.35, y: 0.55 });
const gulfViewport = referenceAtlasViewport(gulfZoom, atlas);
assert.ok(gulfViewport.zoom >= 16, `focused cursor zoom reaches >=16x: ${gulfViewport.zoom}`);
assert.ok(gulfViewport.lonSpan < resetView.lonSpan, 'zoom reduces lon span');
assert.ok(gulfViewport.latSpan < resetView.latSpan, 'zoom reduces lat span');

const montereyFocusView = referenceAtlasViewForCenter(-122.25, 36.6, REFERENCE_ATLAS_FOCUS_ZOOM, atlas);
const montereyFocus = referenceAtlasViewport(montereyFocusView, atlas);
assert.ok(montereyFocus.zoom >= 16, `Monterey focus zoom reaches close review: ${montereyFocus.zoom}`);
assert.ok(Math.abs(montereyFocus.centerLon - -122.25) < 0.01, 'Monterey focus center lon');
assert.ok(Math.abs(montereyFocus.centerLat - 36.6) < 0.01, 'Monterey focus center lat');

const publicText = canonicalJsonStringify({ atlas, centeredViewport, gulfViewport, montereyFocus });
assert.doesNotMatch(publicText, /external_data|[A-Z]:\\\\|\/Users\//, 'deep zoom metadata exposes no raw/local paths');
assert.doesNotMatch(publicText, /"hiddenTruthExposed"\s*:\s*true/, 'deep zoom metadata exposes no hidden truth');
assert.doesNotMatch(publicText, /"operationalOceanForecast"\s*:\s*true|"calibratedForecastSystem"\s*:\s*true/, 'deep zoom does not claim calibrated forecast');

console.log('smoke_reference_atlas_deep_zoom: ok', {
  maxZoom: REFERENCE_ATLAS_MAX_ZOOM,
  zoomReached: centeredViewport.zoom,
  montereyFocusZoom: montereyFocus.zoom,
  worldFractionVisible: centeredViewport.worldFractionVisible
});
