import * as THREE from 'three';
import { clearGroup } from './ThreeMissionLayerUtils.js';

export const THREE_VOLUMETRIC_SCALAR_FIELD_LAYER_VERSION = 'three-volumetric-scalar-field-layer-three-r1-2a-3';

export function createThreeVolumetricScalarFieldLayer(options = {}) {
  const group = new THREE.Group();
  group.name = options.name ?? 'mission-volumetric-scalar-field-layer';
  return {
    type: 'anchor.three.volumetric-scalar-field-layer',
    version: THREE_VOLUMETRIC_SCALAR_FIELD_LAYER_VERSION,
    group,
    planes: new Map(),
    textures: new Map(),
    lastSummary: null,
    visible: true
  };
}

export function updateThreeVolumetricScalarFieldLayer(layer, viewModel = {}, options = {}) {
  if (!layer?.group) return layer;
  const mode = normalizeMode(viewModel.displaySettings?.waterColumn?.scalarRenderMode ?? viewModel.waterColumnScalarRenderMode ?? options.mode);
  const selectedFieldId = viewModel.selectedFieldId ?? viewModel.scalarFieldLayer?.id ?? 'sampleValue';
  const transform = viewModel.coordinateSystem ?? options.transform ?? { cellSize: 1, width: viewModel.grid?.width ?? 1, height: viewModel.grid?.height ?? 1 };
  const depthLayers = (viewModel.depthLayers ?? []).filter((depthLayer) => depthLayer.id !== 'waterSurface' && depthLayer.visible !== false);
  const records = depthLayers.map((depthLayer) => fieldRecordForLayer(viewModel, selectedFieldId, depthLayer)).filter((record) => record?.values?.length);
  clearGroup(layer.group);
  disposeLayerMaps(layer);
  layer.planes = new Map();
  layer.textures = new Map();

  const cloudRepeats = mode === 'volumetricCloud' || mode === 'hybrid' ? 2 : 1;
  for (const record of records) {
    const width = Math.max(1, Number(record.width ?? record.values?.[0]?.length ?? transform.width ?? 1));
    const height = Math.max(1, Number(record.height ?? record.values?.length ?? transform.height ?? 1));
    const texture = scalarTexture(record, width, height, mode);
    const baseOpacity = Number(record.opacity ?? 0.34);
    const opacity = mode === 'layerSlices' ? Math.min(0.48, baseOpacity) : mode === 'volumetricCloud' ? Math.min(0.22, baseOpacity) : Math.min(0.36, baseOpacity);
    for (let repeat = 0; repeat < cloudRepeats; repeat += 1) {
      const meshId = `${record.depthLayerId}:${repeat}`;
      const geometry = new THREE.PlaneGeometry(width * Number(transform.cellSize ?? 1), height * Number(transform.cellSize ?? 1), 1, 1);
      const material = new THREE.MeshBasicMaterial({
        map: texture,
        transparent: true,
        opacity: opacity / cloudRepeats,
        depthWrite: false,
        side: THREE.DoubleSide,
        blending: mode === 'volumetricCloud' ? THREE.AdditiveBlending : THREE.NormalBlending
      });
      const mesh = new THREE.Mesh(geometry, material);
      mesh.name = `volumetric-scalar-${record.depthLayerId}-${repeat}`;
      mesh.rotation.x = -Math.PI / 2;
      mesh.position.y = layerWorldY(record.depthLayer, viewModel) + Number(options.yOffset ?? 0.11) + repeat * 0.018;
      mesh.userData = {
        fieldId: selectedFieldId,
        depthLayerId: record.depthLayerId,
        renderMode: mode,
        interpolationProfileId: mode === 'layerSlices' ? 'legacyNearestCellDisplay' : 'bilinearHorizontalDisplay',
        smoothedTexture: mode !== 'layerSlices',
        syntheticTeachingModel: true,
        calibratedOceanForecast: false
      };
      layer.group.add(mesh);
      layer.planes.set(meshId, mesh);
    }
    layer.textures.set(record.depthLayerId, texture);
  }

  layer.visible = selectedFieldId !== 'none' && records.length > 0;
  layer.group.visible = layer.visible;
  layer.lastSummary = threeVolumetricScalarFieldLayerSummary(layer, viewModel, { mode, selectedFieldId, recordCount: records.length });
  return layer;
}

export function setThreeVolumetricScalarFieldLayerVisibility(layer, visible) {
  if (layer?.group) layer.group.visible = visible !== false && layer.visible !== false;
  return layer;
}

export function disposeThreeVolumetricScalarFieldLayer(layer) {
  if (!layer) return;
  clearGroup(layer.group);
  disposeLayerMaps(layer);
  layer.planes = new Map();
  layer.textures = new Map();
}

export function threeVolumetricScalarFieldLayerSummary(layer = {}, viewModel = {}, patch = {}) {
  return {
    type: 'anchor.three.volumetric-scalar-field-layer-summary',
    version: THREE_VOLUMETRIC_SCALAR_FIELD_LAYER_VERSION,
    renderMode: patch.mode ?? null,
    selectedFieldId: patch.selectedFieldId ?? viewModel.selectedFieldId ?? null,
    depthLayerCount: viewModel.depthLayers?.length ?? 0,
    renderedLayerCount: patch.recordCount ?? layer.textures?.size ?? 0,
    planeCount: layer.planes?.size ?? 0,
    textureCount: layer.textures?.size ?? 0,
    supportsModes: ['layerSlices', 'smoothedSlices', 'volumetricCloud', 'hybrid'],
    interpolationProfileId: patch.mode === 'layerSlices' ? 'legacyNearestCellDisplay' : 'bilinearHorizontalDisplay',
    usesWebGPUFluid: false,
    ownsSimulation: false,
    ownsScoring: false,
    ownsPlanning: false,
    syntheticTeachingModel: true,
    calibratedOceanForecast: false
  };
}

function fieldRecordForLayer(viewModel, selectedFieldId, depthLayer) {
  const byField = viewModel.layerFields ?? {};
  const record = byField?.[selectedFieldId]?.[depthLayer.id]
    ?? byField?.sampleValue?.[depthLayer.id]
    ?? null;
  if (!record) return null;
  return {
    ...record,
    depthLayer,
    depthLayerId: depthLayer.id,
    values: Array.isArray(record.values) ? record.values : record
  };
}

function scalarTexture(record, width, height, mode) {
  const texture = new THREE.DataTexture(scalarBytes(record, width, height), width, height, THREE.RGBAFormat);
  texture.needsUpdate = true;
  texture.magFilter = mode === 'layerSlices' ? THREE.NearestFilter : THREE.LinearFilter;
  texture.minFilter = mode === 'layerSlices' ? THREE.NearestFilter : THREE.LinearFilter;
  texture.wrapS = THREE.ClampToEdgeWrapping;
  texture.wrapT = THREE.ClampToEdgeWrapping;
  return texture;
}

function scalarBytes(record, width, height) {
  const values = record.values ?? [];
  const stats = valueRange(values, record.min, record.max);
  const span = Math.max(1e-6, stats.max - stats.min);
  const data = new Uint8Array(width * height * 4);
  for (let y = 0; y < height; y += 1) {
    for (let x = 0; x < width; x += 1) {
      const value = Number(values[y]?.[x]);
      const offset = ((height - 1 - y) * width + x) * 4;
      if (!Number.isFinite(value)) {
        data[offset] = 0;
        data[offset + 1] = 0;
        data[offset + 2] = 0;
        data[offset + 3] = 0;
        continue;
      }
      const v = Math.max(0, Math.min(1, (value - stats.min) / span));
      const color = scalarColor(v, record.depthLayerId);
      data[offset] = color.r;
      data[offset + 1] = color.g;
      data[offset + 2] = color.b;
      data[offset + 3] = Math.round(255 * Math.max(0.06, Math.min(0.9, Number(record.opacity ?? 0.3))));
    }
  }
  return data;
}

function valueRange(values, min, max) {
  const explicitMin = Number(min);
  const explicitMax = Number(max);
  if (Number.isFinite(explicitMin) && Number.isFinite(explicitMax) && explicitMax > explicitMin) return { min: explicitMin, max: explicitMax };
  const flat = values.flat().map(Number).filter(Number.isFinite);
  if (!flat.length) return { min: 0, max: 1 };
  return { min: Math.min(...flat), max: Math.max(...flat) };
}

function layerWorldY(depthLayer = {}, viewModel = {}) {
  if (viewModel.verticalDisplayMode === 'explodedLayers') return Number(depthLayer.explodedWorldY ?? depthLayer.worldY ?? 0);
  return Number(depthLayer.physicalWorldY ?? depthLayer.worldY ?? 0);
}

function normalizeMode(value) {
  if (value === 'layerSlices' || value === 'volumetricCloud' || value === 'hybrid') return value;
  return 'smoothedSlices';
}

function scalarColor(v, layerId = '') {
  const blueShift = /deep|midwater/i.test(layerId) ? 40 : 0;
  if (v < 0.45) return { r: Math.round(8 + v * 60), g: Math.round(62 + v * 230), b: Math.round(120 + blueShift + v * 90) };
  if (v < 0.75) return { r: Math.round(56 + (v - 0.45) * 520), g: Math.round(214 + (v - 0.45) * 80), b: Math.round(205 - (v - 0.45) * 240) };
  return { r: 255, g: Math.round(220 - (v - 0.75) * 132), b: Math.round(112 - (v - 0.75) * 140) };
}

function disposeLayerMaps(layer) {
  for (const texture of layer.textures?.values?.() ?? []) texture?.dispose?.();
  for (const mesh of layer.planes?.values?.() ?? []) {
    mesh.geometry?.dispose?.();
    mesh.material?.dispose?.();
  }
}