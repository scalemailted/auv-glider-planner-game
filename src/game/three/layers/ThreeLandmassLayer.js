import * as THREE from 'three';
import { disposeObject } from './ThreeMissionLayerUtils.js';

export const THREE_LANDMASS_LAYER_VERSION = 'three-landmass-layer-r1-2b';

export function createThreeLandmassLayer(options = {}) {
  const group = new THREE.Group();
  group.name = options.name ?? 'three-landmass-layer';
  return { type: 'anchor.three.landmass-layer', version: THREE_LANDMASS_LAYER_VERSION, group, mesh: null, signature: null, buildCount: 0, ownsRouteBlocking: false };
}

export function updateThreeLandmassLayer(layer, meshGeometry = {}, options = {}) {
  if (!layer?.group) return layer;
  const signature = JSON.stringify({ sourceDigest: meshGeometry.sourceDigest, width: meshGeometry.width, height: meshGeometry.height, verticalExaggeration: meshGeometry.verticalExaggeration });
  if (!layer.mesh || layer.signature !== signature) {
    if (layer.mesh) { layer.group.remove(layer.mesh); disposeObject(layer.mesh); }
    const geometry = landGeometry(meshGeometry);
    const material = new THREE.MeshStandardMaterial({ color: options.color ?? 0x536844, roughness: 0.9, metalness: 0.01, side: THREE.DoubleSide, depthWrite: true });
    const mesh = new THREE.Mesh(geometry, material);
    mesh.name = 'canonical-landmass-display-mesh';
    mesh.userData = { missionObjectType: 'landmass', sourceDigest: meshGeometry.sourceDigest ?? null, rendererOwnsRouteBlocking: false, landElevationDisplayOnly: true };
    layer.group.add(mesh);
    layer.mesh = mesh;
    layer.signature = signature;
    layer.buildCount += 1;
  }
  layer.mesh.visible = options.visible !== false && (meshGeometry.landVertexMask ?? []).some(Boolean);
  return layer;
}

export function setThreeLandmassLayerVisibility(layer, visible) {
  if (layer?.group) layer.group.visible = visible !== false;
  return layer;
}

export function disposeThreeLandmassLayer(layer) {
  if (layer?.mesh) disposeObject(layer.mesh);
  layer?.group?.removeFromParent?.();
}

export function threeLandmassLayerSummary(layer = {}, meshGeometry = {}) {
  return {
    type: 'anchor.three.landmass-layer-summary',
    version: THREE_LANDMASS_LAYER_VERSION,
    visible: layer.group?.visible !== false && layer.mesh?.visible !== false,
    landBuildCount: Number(layer.buildCount ?? 0),
    landVertexCount: (meshGeometry.landVertexMask ?? []).filter(Boolean).length,
    sourceDigest: meshGeometry.sourceDigest ?? layer.mesh?.userData?.sourceDigest ?? null,
    rendererOwnsRouteBlocking: false,
    landElevationDisplayOnly: true
  };
}

function landGeometry(meshGeometry = {}) {
  const sourcePositions = meshGeometry.positions ?? meshGeometry.vertices ?? [];
  const positions = [];
  const colors = [];
  const indices = [];
  const map = new Map();
  const land = meshGeometry.landVertexMask ?? [];
  const addVertex = (sourceIndex) => {
    if (map.has(sourceIndex)) return map.get(sourceIndex);
    const next = positions.length / 3;
    positions.push(sourcePositions[sourceIndex * 3], Number(sourcePositions[sourceIndex * 3 + 1] ?? 0) + 0.015, sourcePositions[sourceIndex * 3 + 2]);
    colors.push(0.31, 0.42, 0.24);
    map.set(sourceIndex, next);
    return next;
  };
  for (let i = 0; i < (meshGeometry.indices ?? []).length; i += 3) {
    const tri = [meshGeometry.indices[i], meshGeometry.indices[i + 1], meshGeometry.indices[i + 2]].map(Number);
    if (!tri.some((index) => land[index])) continue;
    indices.push(addVertex(tri[0]), addVertex(tri[1]), addVertex(tri[2]));
  }
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
  geometry.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3));
  geometry.setIndex(indices);
  geometry.computeVertexNormals();
  return geometry;
}
