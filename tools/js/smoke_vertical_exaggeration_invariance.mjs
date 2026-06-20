import assert from 'node:assert/strict';
import { makeVolumetricViewModel } from './water_column_smoke_helpers.mjs';
import { gridCellDepthToWorld } from '../../src/core/rendering/VolumetricMissionCoordinates.js';

const one = makeVolumetricViewModel({ waterColumnUi: { verticalExaggeration: 1 } });
const four = makeVolumetricViewModel({ waterColumnUi: { verticalExaggeration: 4 } });
const p1 = gridCellDepthToWorld({ col: 2, row: 2, depthMeters: 80, coordinateModel: one.coordinateModel, transform: one.coordinateSystem, verticalDisplayMode: one.verticalDisplayMode });
const p4 = gridCellDepthToWorld({ col: 2, row: 2, depthMeters: 80, coordinateModel: four.coordinateModel, transform: four.coordinateSystem, verticalDisplayMode: four.verticalDisplayMode });
assert.notEqual(p1.y, p4.y, 'display world Y changes');
assert.equal(p1.depthMeters, p4.depthMeters, 'canonical depth unchanged');
const digest = (model) => JSON.stringify((model.plannedRoutes ?? []).map((route) => route.points.map((point) => [point.x, point.y])));
assert.equal(digest(one), digest(four), 'plan digest unchanged by vertical exaggeration');
console.log(JSON.stringify({ ok: true, y1: p1.y, y4: p4.y }));