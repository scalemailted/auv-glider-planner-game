const HeadlessGrid = require('./HeadlessGrid.js')
function sampleHeadlessFlow(fieldPack, x, y, zIndex = 0) {
  const fields = fieldPack?.fields ?? {};
  return {
    u: HeadlessGrid.sampleNearest3d(fields.F_u, x, y, zIndex),
    v: HeadlessGrid.sampleNearest3d(fields.F_v, x, y, zIndex)
  };
}

 function currentAssist(flowVector, travelDirection) {
  const direction = normalizeVector(travelDirection);
  return finiteNumber(flowVector?.u, 0) * direction.x + finiteNumber(flowVector?.v, 0) * direction.y;
}

 function crossCurrentMagnitude(flowVector, travelDirection) {
  const direction = normalizeVector(travelDirection);
  return Math.abs(finiteNumber(flowVector?.u, 0) * direction.y - finiteNumber(flowVector?.v, 0) * direction.x);
}

 function advectPoint({ x, y }, flowVector, dt, scale = 1) {
  return {
    x: finiteNumber(x, 0) + finiteNumber(flowVector?.u, 0) * finiteNumber(dt, 0) * finiteNumber(scale, 1),
    y: finiteNumber(y, 0) + finiteNumber(flowVector?.v, 0) * finiteNumber(dt, 0) * finiteNumber(scale, 1)
  };
}

 function headlessFlowSummary(fieldPack) {
  const uStats = HeadlessGrid.field3dStats(fieldPack?.fields?.F_u);
  const vStats = HeadlessGrid.field3dStats(fieldPack?.fields?.F_v);
  return {
    type: 'anchor.headless.flow-summary',
    hasFlowU: uStats.finiteCount > 0,
    hasFlowV: vStats.finiteCount > 0,
    finite: uStats.invalidCount === 0 && vStats.invalidCount === 0,
    u: uStats,
    v: vStats,
    note: 'Synthetic deterministic flow helper for educational headless execution, not calibrated hydrodynamics.'
  };
}

function normalizeVector(value = {}) {
  const x = finiteNumber(value.x ?? value.u ?? value.dx, 0);
  const y = finiteNumber(value.y ?? value.v ?? value.dy, 0);
  const length = Math.hypot(x, y) || 1;
  return { x: x / length, y: y / length };
}

function finiteNumber(value, fallback) {
  const number = Number(value);
  return Number.isFinite(number) ? number : fallback;
}

module.exports = {sampleHeadlessFlow, currentAssist, crossCurrentMagnitude, advectPoint, headlessFlowSummary}