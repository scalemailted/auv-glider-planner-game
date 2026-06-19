import * as THREE from 'three';
import { clearGroup, disposeObject } from './ThreeMissionLayerUtils.js';

export const THREE_WATER_COLUMN_VOLUME_FRAME_LAYER_VERSION = 'three-water-column-volume-frame-layer-r1-2a-1';

export function createThreeWaterColumnVolumeFrameLayer(options = {}) {
  const group = new THREE.Group();
  group.name = options.name ?? 'three-water-column-volume-frame-layer';
  return {
    type: 'anchor.three.water-column-volume-frame-layer',
    version: THREE_WATER_COLUMN_VOLUME_FRAME_LAYER_VERSION,
    group,
    disposed: false,
    lastSummary: null
  };
}

export function updateThreeWaterColumnVolumeFrameLayer(layer, viewModel = {}, options = {}) {
  if (!layer?.group || layer.disposed) return layer;
  clearGroup(layer.group);
  const transform = viewModel.coordinateSystem ?? { width: viewModel.grid?.width ?? 1, height: viewModel.grid?.height ?? 1, cellSize: 1 };
  const grid = viewModel.grid ?? { width: transform.width ?? 1, height: transform.height ?? 1 };
  const cellSize = Number(transform.cellSize ?? 1);
  const width = Math.max(1, Number(grid.width ?? transform.width ?? 1)) * cellSize;
  const height = Math.max(1, Number(grid.height ?? transform.height ?? 1)) * cellSize;
  const visibleLayers = (viewModel.depthLayers ?? []).filter((depthLayer) => depthLayer.visible !== false && depthLayer.id !== 'waterSurface');
  if (visibleLayers.length <= 1) {
    layer.lastSummary = summaryFor(layer, viewModel, { depthTickCount: 0, layerConnectorCount: 0 });
    layer.group.userData = layer.lastSummary;
    return layer;
  }
  const worldYs = visibleLayers.map((depthLayer) => Number(viewModel.verticalDisplayMode === 'explodedLayers' ? depthLayer.explodedWorldY : depthLayer.physicalWorldY)).filter(Number.isFinite);
  const minY = Math.min(...worldYs, -0.25);
  const maxY = Math.max(...worldYs, 0.04);
  const bottomY = minY - 0.45;
  const left = -width / 2;
  const right = width / 2;
  const top = -height / 2;
  const bottom = height / 2;
  const material = new THREE.LineBasicMaterial({ color: 0x9ee7ff, transparent: true, opacity: 0.38, depthWrite: false, depthTest: true });
  const strongMaterial = new THREE.LineBasicMaterial({ color: 0xf5ffd2, transparent: true, opacity: 0.62, depthWrite: false, depthTest: false });

  addPolyline(layer.group, material, [
    [left, maxY, top], [right, maxY, top], [right, maxY, bottom], [left, maxY, bottom], [left, maxY, top]
  ], 'water-column-top-frame');
  addPolyline(layer.group, material, [
    [left, bottomY, top], [right, bottomY, top], [right, bottomY, bottom], [left, bottomY, bottom], [left, bottomY, top]
  ], 'water-column-bottom-frame');
  for (const [x, z] of [[left, top], [right, top], [right, bottom], [left, bottom]]) {
    addPolyline(layer.group, material, [[x, maxY, z], [x, bottomY, z]], `water-column-edge-${x}-${z}`);
  }
  addPolyline(layer.group, strongMaterial, [[right + 0.45, maxY, top], [right + 0.45, bottomY, top]], 'water-column-depth-axis');
  let depthTickCount = 0;
  for (const depthLayer of visibleLayers) {
    const y = Number(viewModel.verticalDisplayMode === 'explodedLayers' ? depthLayer.explodedWorldY : depthLayer.physicalWorldY);
    if (!Number.isFinite(y)) continue;
    addPolyline(layer.group, material, [[left, y, top], [left, y, bottom], [right, y, bottom]], `water-column-layer-connector-${depthLayer.id}`);
    addPolyline(layer.group, strongMaterial, [[right + 0.25, y, top], [right + 0.65, y, top]], `water-column-depth-tick-${depthLayer.id}`);
    addLabel(layer.group, depthLayer, { x: right + 0.86, y, z: top }, depthLayer.id === viewModel.activeDepthLayerId);
    depthTickCount += 1;
  }
  layer.lastSummary = summaryFor(layer, viewModel, { depthTickCount, layerConnectorCount: visibleLayers.length });
  layer.group.userData = layer.lastSummary;
  return layer;
}

export function disposeThreeWaterColumnVolumeFrameLayer(layer) {
  if (!layer || layer.disposed) return;
  clearGroup(layer.group);
  layer.disposed = true;
}

export function threeWaterColumnVolumeFrameLayerSummary(layer = {}, viewModel = {}) {
  return layer.lastSummary ?? summaryFor(layer, viewModel, { depthTickCount: 0, layerConnectorCount: 0 });
}

function addPolyline(group, material, points, name) {
  const geometry = new THREE.BufferGeometry().setFromPoints(points.map(([x, y, z]) => new THREE.Vector3(x, y, z)));
  const line = new THREE.Line(geometry, material.clone());
  line.name = name;
  line.renderOrder = 130;
  line.userData = { missionObjectType: 'waterColumnVolumeFrame', interactionEnabled: false, ownsPlanning: false, ownsSimulationState: false, ownsScoring: false };
  group.add(line);
  return line;
}

function addLabel(group, depthLayer, position, active) {
  if (!globalThis.document?.createElement) return null;
  const canvas = globalThis.document.createElement('canvas');
  canvas.width = 256;
  canvas.height = 64;
  const ctx = canvas.getContext('2d');
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  ctx.fillStyle = active ? 'rgba(245, 255, 210, 0.96)' : 'rgba(190, 220, 245, 0.78)';
  ctx.font = '700 22px system-ui, sans-serif';
  ctx.fillText(depthLayer.label ?? depthLayer.id, 8, 30);
  ctx.font = '15px system-ui, sans-serif';
  const depth = depthLayer.representativeDepthMeters === null ? 'integrated' : `${Number(depthLayer.representativeDepthMeters ?? 0).toFixed(0)} m`;
  ctx.fillText(depth, 8, 52);
  const texture = new THREE.CanvasTexture(canvas);
  const material = new THREE.SpriteMaterial({ map: texture, transparent: true, depthWrite: false, depthTest: false });
  const sprite = new THREE.Sprite(material);
  sprite.name = `water-column-volume-label-${depthLayer.id}`;
  sprite.scale.set(2.1, 0.52, 1);
  sprite.position.set(position.x, position.y + 0.04, position.z);
  sprite.renderOrder = 160;
  sprite.userData = { missionObjectType: 'waterColumnDepthTickLabel', depthLayerId: depthLayer.id, interactionEnabled: false };
  group.add(sprite);
  return sprite;
}

function summaryFor(layer, viewModel, patch) {
  const children = layer.group?.children ?? [];
  return {
    type: 'anchor.three.water-column-volume-frame-layer-summary',
    version: THREE_WATER_COLUMN_VOLUME_FRAME_LAYER_VERSION,
    visible: layer.group?.visible !== false,
    verticalDisplayMode: viewModel.verticalDisplayMode ?? null,
    volumeFrameObjectCount: children.length,
    depthTickCount: Number(patch.depthTickCount ?? 0),
    layerConnectorCount: Number(patch.layerConnectorCount ?? 0),
    labelCount: children.filter((child) => child.type === 'Sprite').length,
    ownsPlanning: false,
    ownsSimulationState: false,
    ownsScoring: false
  };
}