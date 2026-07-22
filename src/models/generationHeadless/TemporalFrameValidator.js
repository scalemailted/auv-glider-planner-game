const ROIValue = require('./ROIValue.js')
const DEBUG_TEMPORAL_FIELDS = false;

 function validateTemporalFrames(level = {}) {
  const truthFrames = level.layers?.truth?.frames ?? [];
  const forecastFrames = level.layers?.forecast?.frames ?? [];
  const ensemble = level.layers?.forecasts ?? [];
  const forecastMembers = ensemble.length
    ? ensemble.map((member) => ({ id: member.id, frames: member.frames ?? [] }))
    : [{ id: 'forecast', frames: forecastFrames }];
  const summary = {
    truthFrameCount: truthFrames.length,
    truthRoiChanges: framesChange(truthFrames, 'roi'),
    truthCurrentChanges: framesChange(truthFrames, 'current'),
    forecastFrameCount: Math.max(forecastFrames.length, ...forecastMembers.map((member) => member.frames.length), 0),
    forecastRoiChanges: forecastMembers.some((member) => framesChange(member.frames, 'roi')) || framesChange(forecastFrames, 'roi'),
    forecastCurrentChanges: forecastMembers.some((member) => framesChange(member.frames, 'current')) || framesChange(forecastFrames, 'current')
  };
  summary.temporal = {
    truth: summary.truthFrameCount > 1 && (summary.truthRoiChanges || summary.truthCurrentChanges),
    forecast: summary.forecastFrameCount > 1 && (summary.forecastRoiChanges || summary.forecastCurrentChanges)
  };
  if (DEBUG_TEMPORAL_FIELDS) console.debug('[temporal-fields]', level.levelId, summary);
  return summary;
}

function framesChange(frames, field) {
  if (!Array.isArray(frames) || frames.length < 2) return false;
  const first = frameSignature(frames[0]?.[field], field);
  return frames.slice(1).some((frame) => frameSignature(frame?.[field], field) !== first);
}

function frameSignature(grid, field) {
  if (!Array.isArray(grid)) return '';
  let sumA = 0;
  let sumB = 0;
  let weightedX = 0;
  let weightedY = 0;
  let count = 0;
  for (let y = 0; y < grid.length; y += 1) {
    for (let x = 0; x < (grid[y]?.length ?? 0); x += 1) {
      const value = grid[y][x];
      if (field === 'current') {
        const u = Array.isArray(value) ? Number(value[0]) || 0 : 0;
        const v = Array.isArray(value) ? Number(value[1]) || 0 : 0;
        const magnitude = Math.hypot(u, v);
        sumA += u;
        sumB += v;
        weightedX += magnitude * x;
        weightedY += magnitude * y;
      } else {
        const roi = ROIValue.roiScalar(value ?? 0, 'expectedValue');
        sumA += roi;
        weightedX += roi * x;
        weightedY += roi * y;
      }
      count += 1;
    }
  }
  return [sumA, sumB, weightedX, weightedY, count].map(round).join('|');
}

function round(value) {
  const number = Number(value);
  return Number.isFinite(number) ? Number(number.toFixed(3)) : 0;
}

module.exports = {validateTemporalFrames}