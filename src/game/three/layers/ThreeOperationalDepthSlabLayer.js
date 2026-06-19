import * as THREE from 'three';
import { disposeObject } from './ThreeMissionLayerUtils.js';

export const THREE_OPERATIONAL_DEPTH_SLAB_LAYER_VERSION = 'three-operational-depth-slab-layer-r1-2a';

export function createThreeOperationalDepthSlabLayer(options = {}) {
  const group = new THREE.Group();
  group.name = options.name ?? 'three-operational-depth-slab-layer';
  return {
    type: 'anchor.three.operational-depth-slab-layer',
    version: THREE_OPERATIONAL_DEPTH_SLAB_LAYER_VERSION,
    group,
    slabs: new Map(),
    labels: new Map(),
    disposed: false,
    lastSummary: null
  };
}

export function updateThreeOperationalDepthSlabLayer(layer, viewModel = {}, options = {}) {
  if (!layer?.group || layer.disposed) return layer;
  const transform = viewModel.coordinateSystem ?? { width: viewModel.grid?.width ?? 1, height: viewModel.grid?.height ?? 1, cellSize: 1 };
  const grid = viewModel.grid ?? { width: transform.width ?? 1, height: transform.height ?? 1 };
  const mode = viewModel.verticalDisplayMode ?? 'physicalDepth';
  const selectedFieldId = viewModel.selectedFieldId ?? viewModel.scalarFieldLayer?.id ?? 'sampleValue';
  const activeLayerId = viewModel.activeDepthLayerId ?? 'surface';
  const visibleLayers = (viewModel.depthLayers ?? []).filter((depthLayer) => depthLayer.visible !== false && depthLayer.id !== 'waterSurface');
  const seen = new Set();
  for (const [index, depthLayer] of visibleLayers.entries()) {
    const id = depthLayer.id;
    seen.add(id);
    const width = Math.max(1, Number(grid.width ?? transform.width ?? 1));
    const height = Math.max(1, Number(grid.height ?? transform.height ?? 1));
    const values = fieldValuesForLayer(viewModel, selectedFieldId, id, width, height);
    const mask = depthLayer.validCellMask ?? viewModel.layerMasks?.[id] ?? null;
    const data = scalarBytes(values, mask, width, height, depthLayer, selectedFieldId);
    let record = layer.slabs.get(id);
    if (!record || record.width !== width || record.height !== height) {
      if (record) disposeSlabRecord(record, layer);
      const texture = new THREE.DataTexture(data, width, height, THREE.RGBAFormat);
      texture.needsUpdate = true;
      const geometry = new THREE.PlaneGeometry(width * Number(transform.cellSize ?? 1), height * Number(transform.cellSize ?? 1), 1, 1);
      const material = new THREE.MeshBasicMaterial({
        map: texture,
        transparent: true,
        opacity: Number(depthLayer.opacity ?? 0.24),
        side: THREE.DoubleSide,
        depthWrite: false,
        depthTest: true
      });
      const mesh = new THREE.Mesh(geometry, material);
      mesh.name = `operational-depth-slab-${id}`;
      mesh.rotation.x = -Math.PI / 2;
      mesh.renderOrder = 80 + Number(depthLayer.renderOrder ?? index);
      layer.group.add(mesh);
      record = { id, mesh, texture, material, geometry, width, height };
      layer.slabs.set(id, record);
    } else {
      record.texture.image.data.set(data);
      record.texture.needsUpdate = true;
      record.material.opacity = Number(depthLayer.opacity ?? record.material.opacity ?? 0.24);
    }
    const y = mode === 'explodedLayers' ? Number(depthLayer.explodedWorldY ?? 0) : Number(depthLayer.physicalWorldY ?? 0);
    record.mesh.position.set(0, y, 0);
    record.mesh.visible = depthLayer.visible !== false;
    record.mesh.renderOrder = 80 + Number(depthLayer.renderOrder ?? index);
    record.mesh.userData = {
      missionObjectType: 'depthCellSlab',
      missionObjectId: id,
      id,
      depthLayerId: id,
      layerId: id,
      depthMeters: depthLayer.representativeDepthMeters,
      selected: id === activeLayerId,
      interactive: depthLayer.interactive !== false && depthLayer.visible !== false,
      interactionEnabled: depthLayer.interactive !== false && depthLayer.visible !== false,
      validCellMask: mask,
      gridWidth: width,
      gridHeight: height,
      verticalDisplayMode: mode,
      fieldId: selectedFieldId,
      ownsPlanning: false,
      ownsSimulationState: false,
      ownsScoring: false
    };
    updateLabel(layer, depthLayer, transform, y, id === activeLayerId, options);
  }
  for (const [id, record] of [...layer.slabs.entries()]) {
    if (!seen.has(id)) disposeSlabRecord(record, layer);
  }
  for (const [id, label] of [...layer.labels.entries()]) {
    if (!seen.has(id)) {
      layer.group.remove(label);
      disposeObject(label);
      layer.labels.delete(id);
    }
  }
  layer.lastSummary = threeOperationalDepthSlabLayerSummary(layer, viewModel);
  layer.group.userData = layer.lastSummary;
  return layer;
}

export function setThreeOperationalDepthSlabLayerVisibility(layer, visible) {
  if (layer?.group) layer.group.visible = visible !== false;
  return layer;
}

export function disposeThreeOperationalDepthSlabLayer(layer) {
  if (!layer || layer.disposed) return;
  for (const record of layer.slabs.values()) disposeSlabRecord(record, layer);
  for (const label of layer.labels.values()) {
    layer.group.remove(label);
    disposeObject(label);
  }
  layer.labels.clear();
  layer.disposed = true;
}

export function threeOperationalDepthSlabLayerSummary(layer = {}, viewModel = {}) {
  return {
    type: 'anchor.three.operational-depth-slab-layer-summary',
    version: THREE_OPERATIONAL_DEPTH_SLAB_LAYER_VERSION,
    verticalDisplayMode: viewModel.verticalDisplayMode ?? null,
    activeDepthLayerId: viewModel.activeDepthLayerId ?? null,
    slabObjectCount: layer.slabs?.size ?? 0,
    slabTextureCount: [...(layer.slabs?.values?.() ?? [])].filter((record) => record.texture).length,
    slabLabelCount: layer.labels?.size ?? 0,
    layerIds: [...(layer.slabs?.keys?.() ?? [])],
    stableObjectIds: [...(layer.slabs?.values?.() ?? [])].map((record) => record.mesh?.uuid).filter(Boolean),
    fieldTextureCount: [...(layer.slabs?.values?.() ?? [])].filter((record) => record.texture).length,
    currentVectorObjectCount: 0,
    depthWriteDisabled: true,
    depthTestEnabled: true,
    renderOrderBase: 80,
    ownsPlanning: false,
    ownsSimulationState: false,
    ownsScoring: false
  };
}

function fieldValuesForLayer(viewModel, fieldId, layerId, width, height) {
  const candidates = [
    viewModel.layerFields?.[fieldId]?.[layerId]?.values,
    viewModel.layerFields?.sampleValue?.[layerId]?.values,
    viewModel.layerFields?.integratedWaterColumn?.values,
    viewModel.scalarFieldLayer?.values
  ];
  const source = candidates.find(Array.isArray) ?? [];
  return Array.from({ length: height }, (_row, y) => Array.from({ length: width }, (_cell, x) => Number(source?.[y]?.[x] ?? 0)));
}

function scalarBytes(values, mask, width, height, depthLayer, fieldId) {
  const flat = values.flat().map(Number).filter(Number.isFinite);
  const min = flat.length ? Math.min(...flat) : 0;
  const max = flat.length ? Math.max(...flat) : 1;
  const span = Math.max(0.000001, max - min);
  const data = new Uint8Array(width * height * 4);
  for (let y = 0; y < height; y += 1) {
    for (let x = 0; x < width; x += 1) {
      const offset = ((height - 1 - y) * width + x) * 4;
      const valid = mask?.[y]?.[x] !== false;
      const raw = Number(values[y]?.[x] ?? 0);
      if (!valid) {
        data[offset] = 8; data[offset + 1] = 12; data[offset + 2] = 18; data[offset + 3] = 24;
        continue;
      }
      const v = Math.max(0, Math.min(1, (raw - min) / span));
      const color = colorForLayerScale(v, depthLayer.id, fieldId);
      data[offset] = color.r;
      data[offset + 1] = color.g;
      data[offset + 2] = color.b;
      data[offset + 3] = Math.round(255 * Math.max(0.05, Math.min(0.92, Number(depthLayer.opacity ?? 0.26))));
    }
  }
  return data;
}

function updateLabel(layer, depthLayer, transform, worldY, active, options) {
  if (options.labels === false) return;
  const canCanvas = Boolean(globalThis.document?.createElement);
  if (!canCanvas) return;
  let sprite = layer.labels.get(depthLayer.id);
  if (!sprite) {
    const canvas = globalThis.document.createElement('canvas');
    canvas.width = 256;
    canvas.height = 64;
    const texture = new THREE.CanvasTexture(canvas);
    const material = new THREE.SpriteMaterial({ map: texture, transparent: true, depthWrite: false, depthTest: false });
    sprite = new THREE.Sprite(material);
    sprite.name = `operational-depth-label-${depthLayer.id}`;
    sprite.scale.set(2.2, 0.55, 1);
    layer.group.add(sprite);
    layer.labels.set(depthLayer.id, sprite);
  }
  const canvas = sprite.material.map.image;
  const ctx = canvas.getContext('2d');
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  ctx.fillStyle = active ? 'rgba(245, 255, 210, 0.95)' : 'rgba(210, 240, 255, 0.82)';
  ctx.font = '700 24px system-ui, sans-serif';
  ctx.fillText(depthLayer.label ?? depthLayer.id, 12, 36);
  ctx.font = '16px system-ui, sans-serif';
  const depth = depthLayer.representativeDepthMeters === null ? 'integrated' : `${Number(depthLayer.representativeDepthMeters ?? 0).toFixed(0)} m`;
  ctx.fillText(depth, 12, 56);
  sprite.material.map.needsUpdate = true;
  sprite.position.set((-Number(transform.width ?? 1) * Number(transform.cellSize ?? 1)) / 2 - 1.15, worldY + 0.08, 0);
  sprite.userData = { missionObjectType: 'depthLayerLabel', missionObjectId: depthLayer.id, depthLayerId: depthLayer.id, interactionEnabled: false };
}

function disposeSlabRecord(record, layer) {
  if (!record) return;
  layer.group?.remove?.(record.mesh);
  record.texture?.dispose?.();
  record.geometry?.dispose?.();
  record.material?.dispose?.();
  disposeObject(record.mesh);
  layer.slabs?.delete?.(record.id);
}

function colorForLayerScale(v, layerId, fieldId) {
  if (/hazard/i.test(fieldId ?? '')) return { r: 255, g: Math.round(80 + v * 90), b: Math.round(60 + v * 20) };
  if (/uncertainty/i.test(fieldId ?? '')) return { r: Math.round(110 + v * 145), g: Math.round(92 + v * 52), b: 255 };
  const tint = layerTint(layerId);
  return {
    r: Math.round((20 + v * 235) * tint.r),
    g: Math.round((76 + v * 175) * tint.g),
    b: Math.round((120 + v * 95) * tint.b)
  };
}

function layerTint(layerId) {
  if (layerId === 'surface') return { r: 0.72, g: 1.05, b: 1.12 };
  if (layerId === 'shallow') return { r: 0.72, g: 1.1, b: 0.98 };
  if (layerId === 'thermocline') return { r: 0.95, g: 1.12, b: 0.72 };
  if (layerId === 'midwater') return { r: 0.72, g: 0.92, b: 1.16 };
  if (layerId === 'deep') return { r: 0.96, g: 0.76, b: 1.22 };
  return { r: 0.86, g: 1.0, b: 1.0 };
}
