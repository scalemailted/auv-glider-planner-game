import * as THREE from 'three';
import { clearGroup } from './ThreeMissionLayerUtils.js';

export function createThreeScalarFieldLayer(options = {}) {
  const group = new THREE.Group();
  group.name = options.name ?? 'mission-scalar-field-layer';
  return { type: 'anchor.three.scalar-field-layer', group, mesh: null, texture: null, width: 0, height: 0, visible: true };
}

export function updateThreeScalarFieldLayer(layer, scalarField = {}, options = {}) {
  if (!layer?.group) return layer;
  const width = Math.max(1, Number(scalarField.width ?? scalarField.values?.[0]?.length ?? 1));
  const height = Math.max(1, Number(scalarField.height ?? scalarField.values?.length ?? 1));
  const transform = options.transform ?? { width, height, cellSize: 1 };
  const data = scalarDataTextureBytes(scalarField, width, height);
  if (!layer.texture || layer.width !== width || layer.height !== height) {
    clearGroup(layer.group);
    layer.texture?.dispose?.();
    layer.texture = new THREE.DataTexture(data, width, height, THREE.RGBAFormat);
    layer.texture.needsUpdate = true;
    const geometry = new THREE.PlaneGeometry(width * transform.cellSize, height * transform.cellSize, 1, 1);
    const material = new THREE.MeshBasicMaterial({ map: layer.texture, transparent: true, opacity: Number(scalarField.opacity ?? 0.72), depthWrite: false, side: THREE.DoubleSide });
    layer.mesh = new THREE.Mesh(geometry, material);
    layer.mesh.name = scalarField.id ?? 'scalar-field';
    layer.mesh.rotation.x = -Math.PI / 2;
    layer.mesh.position.y = Number(options.yOffset ?? 0.055);
    layer.mesh.userData = { scalarFieldId: scalarField.id, timeSeconds: scalarField.timeSeconds };
    layer.group.add(layer.mesh);
    layer.width = width;
    layer.height = height;
  } else {
    layer.texture.image.data.set(data);
    layer.texture.needsUpdate = true;
    if (layer.mesh?.material) layer.mesh.material.opacity = Number(scalarField.opacity ?? layer.mesh.material.opacity ?? 0.72);
    if (layer.mesh) layer.mesh.userData = { scalarFieldId: scalarField.id, timeSeconds: scalarField.timeSeconds };
  }
  layer.visible = scalarField.id !== 'none';
  layer.group.visible = layer.visible;
  return layer;
}

export function setThreeScalarFieldVisibility(layer, visible) {
  if (layer?.group) layer.group.visible = visible !== false && layer.visible !== false;
  return layer;
}

export function disposeThreeScalarFieldLayer(layer) {
  if (!layer) return;
  clearGroup(layer.group);
  layer.texture?.dispose?.();
  layer.texture = null;
  layer.mesh = null;
}

function scalarDataTextureBytes(scalarField = {}, width, height) {
  const values = scalarField.values ?? [];
  const min = Number.isFinite(Number(scalarField.min)) ? Number(scalarField.min) : 0;
  const max = Number.isFinite(Number(scalarField.max)) ? Number(scalarField.max) : 1;
  const span = Math.max(0.000001, max - min);
  const data = new Uint8Array(width * height * 4);
  for (let y = 0; y < height; y += 1) {
    for (let x = 0; x < width; x += 1) {
      const raw = values[y]?.[x];
      const offset = ((height - 1 - y) * width + x) * 4;
      if (raw == null || !Number.isFinite(Number(raw))) {
        data[offset] = 0; data[offset + 1] = 0; data[offset + 2] = 0; data[offset + 3] = 0;
        continue;
      }
      const v = Math.max(0, Math.min(1, (Number(raw) - min) / span));
      const color = colorForScale(v, scalarField.colorScaleId);
      data[offset] = color.r;
      data[offset + 1] = color.g;
      data[offset + 2] = color.b;
      data[offset + 3] = Math.round(255 * Math.max(0.05, Math.min(1, Number(scalarField.opacity ?? 0.72))));
    }
  }
  return data;
}

function colorForScale(v, scaleId = '') {
  if (/hazard/i.test(scaleId)) return { r: 255, g: Math.round(88 + v * 80), b: Math.round(72 - v * 30) };
  if (/uncertainty/i.test(scaleId)) return { r: Math.round(110 + v * 145), g: Math.round(92 + v * 52), b: 255 };
  if (v < 0.45) return { r: Math.round(8 + v * 46), g: Math.round(42 + v * 250), b: Math.round(85 + v * 190) };
  if (v < 0.75) return { r: Math.round(45 + (v - 0.45) * 250), g: Math.round(212 + (v - 0.45) * 80), b: Math.round(191 - (v - 0.45) * 250) };
  return { r: 255, g: Math.round(209 - (v - 0.75) * 110), b: Math.round(102 - (v - 0.75) * 90) };
}

