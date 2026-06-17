import assert from 'node:assert/strict';
import fs from 'node:fs';
import { headlessBundleViewerPanelHtml } from '../../src/ui/headless/HeadlessBundleViewerPanel.js';

const source = fs.readFileSync('src/ui/headless/HeadlessBundleViewerPanel.js', 'utf8');
assert.ok(source.includes('Bathymetric World'));
assert.ok(source.includes('Mission Geometry'));
assert.ok(source.includes('Terrain-flow accumulation is not ocean current'));
assert.ok(source.includes('does not add full 3D route planning'));
const html = headlessBundleViewerPanelHtml({
  bundleStatus: 'PASS',
  manifestSummary: {},
  missionSummary: {},
  visibilitySummary: {},
  fieldCards: [],
  observationSummary: {},
  trackSummary: {},
  motionSummary: {},
  scoreSummary: {},
  roundtripSummary: {},
  waterColumnSummary: {},
  depthLayerPrioritySummary: {},
  scienceDiagnosisSummary: {},
  replaySummary: {},
  bathymetrySummary: { present: true, depthRange: { minDepthMeters: 1, maxDepthMeters: 100 }, featureIds: ['<bad>'], landWaterMaskSummary: {}, publicSafe: true },
  missionGeometrySummary: { present: true, sampledDepthLayers: ['surface'], surfaceWaypointCount: 1, samplingPointCount: 1 },
  warnings: ['<script>alert(1)</script>'],
  failures: []
});
assert.ok(html.includes('Bathymetric World'));
assert.ok(html.includes('Mission Geometry'));
assert.equal(html.includes('<script>alert(1)</script>'), false, 'unsafe text is escaped');
console.log('smoke_headless_bathymetry_viewer_panel: ok');