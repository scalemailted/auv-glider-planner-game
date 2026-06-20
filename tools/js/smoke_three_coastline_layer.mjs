import assert from 'node:assert/strict';

import { createShelfCanyonBathymetry } from '../../src/core/science/BathymetryFieldModel.js';
import { buildBathymetrySurfaceViewModel } from '../../src/core/rendering/BathymetrySurfaceViewModel.js';
import { extractCoastlineSegments } from '../../src/core/rendering/CoastlineGeometry.js';
import {
  createThreeCoastlineLayer,
  updateThreeCoastlineLayer,
  setThreeCoastlineLayerVisibility,
  threeCoastlineLayerSummary,
  disposeThreeCoastlineLayer
} from '../../src/game/three/layers/ThreeCoastlineLayer.js';

const bathymetry = createShelfCanyonBathymetry({ seed: 'coastline-layer', width: 20, height: 14 });
const surface = buildBathymetrySurfaceViewModel({ bathymetry, grid: { width: bathymetry.width, height: bathymetry.height } });
const coastline = extractCoastlineSegments({ surfaceModel: surface });
const layer = createThreeCoastlineLayer();
updateThreeCoastlineLayer(layer, coastline, { width: bathymetry.width, height: bathymetry.height });
const uuid = layer.line.uuid;
updateThreeCoastlineLayer(layer, coastline, { width: bathymetry.width, height: bathymetry.height });
setThreeCoastlineLayerVisibility(layer, false);
const summary = threeCoastlineLayerSummary(layer, coastline);

assert.equal(layer.line.uuid, uuid, 'coastline reuses stable line geometry for unchanged source');
assert.equal(summary.coastlineBuildCount, 1);
assert.ok(summary.coastlineSegmentCount > 0);
assert.equal(summary.visible, false);
assert.equal(summary.rendererOwnsRouteBlocking, false);
disposeThreeCoastlineLayer(layer);
console.log('smoke_three_coastline_layer: ok');
