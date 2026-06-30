import assert from 'node:assert/strict';
import {
  REFERENCE_ATLAS_RECTANGLE_DRAG_MODES,
  hitTestReferenceAtlasRectangle,
  referenceAtlasRectangleGeometry
} from '../../src/core/editor/ReferenceAtlasInteractionModel.js';

const geometry = referenceAtlasRectangleGeometry({
  selectedBounds: {
    westLon: -60,
    eastLon: 60,
    southLat: -30,
    northLat: 30
  },
  worldView: { centerLon: 0, centerLat: 0, zoom: 1 },
  canvasSize: { width: 1000, height: 500 },
  hitTargetPx: 14
});

assert.equal(geometry.enabled, true, 'rectangle editor geometry is enabled');
assert.ok(geometry.selectedScreenRect.width > 250, 'test rectangle is wide enough for edge testing');
assert.ok(geometry.selectedScreenRect.height > 120, 'test rectangle is tall enough for edge testing');

const rect = geometry.selectedScreenRect;

assertHit({ x: rect.centerX, y: rect.centerY }, 'center', REFERENCE_ATLAS_RECTANGLE_DRAG_MODES.move, 'inside rectangle returns center/move');
assertHit({ x: rect.left, y: rect.centerY }, 'west', REFERENCE_ATLAS_RECTANGLE_DRAG_MODES.resizeWest, 'left edge returns resizeWest');
assertHit({ x: rect.right, y: rect.centerY }, 'east', REFERENCE_ATLAS_RECTANGLE_DRAG_MODES.resizeEast, 'right edge returns resizeEast');
assertHit({ x: rect.centerX, y: rect.top }, 'north', REFERENCE_ATLAS_RECTANGLE_DRAG_MODES.resizeNorth, 'top edge returns resizeNorth');
assertHit({ x: rect.centerX, y: rect.bottom }, 'south', REFERENCE_ATLAS_RECTANGLE_DRAG_MODES.resizeSouth, 'bottom edge returns resizeSouth');
assertHit({ x: rect.left, y: rect.top }, 'northWest', REFERENCE_ATLAS_RECTANGLE_DRAG_MODES.resizeNorthWest, 'northwest corner returns resizeNorthWest');
assertHit({ x: rect.right, y: rect.top }, 'northEast', REFERENCE_ATLAS_RECTANGLE_DRAG_MODES.resizeNorthEast, 'northeast corner returns resizeNorthEast');
assertHit({ x: rect.left, y: rect.bottom }, 'southWest', REFERENCE_ATLAS_RECTANGLE_DRAG_MODES.resizeSouthWest, 'southwest corner returns resizeSouthWest');
assertHit({ x: rect.right, y: rect.bottom }, 'southEast', REFERENCE_ATLAS_RECTANGLE_DRAG_MODES.resizeSouthEast, 'southeast corner returns resizeSouthEast');

assert.equal(
  hitTestReferenceAtlasRectangle({ x: rect.left + 2, y: rect.top + 2 }, geometry).handle,
  'northWest',
  'corner priority beats edge priority'
);
assert.equal(
  hitTestReferenceAtlasRectangle({ x: rect.left + 2, y: rect.centerY }, geometry).handle,
  'west',
  'edge priority beats center priority'
);
assert.equal(
  hitTestReferenceAtlasRectangle({ x: rect.left - 60, y: rect.top - 60 }, geometry).hit,
  false,
  'background misses rectangle'
);

console.log('smoke_reference_atlas_rectangle_hit_testing: ok', {
  selectedScreenRect: geometry.selectedScreenRect,
  hitTargetPx: geometry.hitTargetPx
});

function assertHit(point, handle, dragMode, message) {
  const hit = hitTestReferenceAtlasRectangle(point, geometry);
  assert.equal(hit.hit, true, `${message}: hit`);
  assert.equal(hit.handle, handle, `${message}: handle`);
  assert.equal(hit.dragMode, dragMode, `${message}: drag mode`);
}
