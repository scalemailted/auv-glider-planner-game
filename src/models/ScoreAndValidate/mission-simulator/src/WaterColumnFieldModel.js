 function sampleWaterColumnScalar(field, x, y, layerOrIndex = 0, configInput = {}, options = {}) {
  const z = depthIndexForLayer(layerOrIndex, configInput);
  return options.method === 'nearest' ? sampleNearest3d(field, x, y, z) : sampleBilinearLayer(field, x, y, z);
}

function depthIndexForLayer(layerOrIndex, configInput = {}) {
  if (Number.isFinite(Number(layerOrIndex))) return Math.max(0, Math.round(Number(layerOrIndex)));
  const layerIds = configInput.depthLayerIds ?? configInput.layerIds ?? configInput.depthLayers ?? ['surface'];
  const index = layerIds.indexOf(String(layerOrIndex));
  return index >= 0 ? index : 0;
}

function sampleNearest3d(field, x, y, zIndex) {
  const shape = fieldShape(field);
  if (!shape.valid) return 0;
  const z = clampInt(zIndex, 0, shape.depth - 1);
  const col = clampInt(x, 0, shape.width - 1);
  const row = clampInt(y, 0, shape.height - 1);
  return Number(field[z]?.[row]?.[col] ?? 0);
}

function sampleBilinearLayer(field, x, y, zIndex) {
  const shape = fieldShape(field);
  if (!shape.valid) return 0;
  const z = clampInt(zIndex, 0, shape.depth - 1);
  const fx = clamp(Number(x), 0, shape.width - 1);
  const fy = clamp(Number(y), 0, shape.height - 1);
  const x0 = Math.floor(fx);
  const y0 = Math.floor(fy);
  const x1 = Math.min(shape.width - 1, x0 + 1);
  const y1 = Math.min(shape.height - 1, y0 + 1);
  const tx = fx - x0;
  const ty = fy - y0;
  const v00 = Number(field[z]?.[y0]?.[x0] ?? 0);
  const v10 = Number(field[z]?.[y0]?.[x1] ?? v00);
  const v01 = Number(field[z]?.[y1]?.[x0] ?? v00);
  const v11 = Number(field[z]?.[y1]?.[x1] ?? v10);
  const top = v00 * (1 - tx) + v10 * tx;
  const bottom = v01 * (1 - tx) + v11 * tx;
  return top * (1 - ty) + bottom * ty;
}

function fieldShape(field) {
  const depth = Array.isArray(field) ? field.length : 0;
  const height = depth ? field[0]?.length ?? 0 : 0;
  const width = height ? field[0]?.[0]?.length ?? 0 : 0;
  return { valid: depth > 0 && height > 0 && width > 0, depth, height, width };
}

function clamp(value, min, max) {
  const number = Number(value);
  if (!Number.isFinite(number)) return min;
  return Math.min(max, Math.max(min, number));
}

function clampInt(value, min, max) {
  return Math.round(clamp(value, min, max));
}

module.exports = {sampleWaterColumnScalar}