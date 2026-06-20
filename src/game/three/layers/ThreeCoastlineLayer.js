import * as THREE from 'three';
import { disposeObject } from './ThreeMissionLayerUtils.js';

export const THREE_COASTLINE_LAYER_VERSION = 'three-coastline-layer-r1-2b';

export function createThreeCoastlineLayer(options = {}) {
  const group = new THREE.Group();
  group.name = options.name ?? 'three-coastline-layer';
  return { type: 'anchor.three.coastline-layer', version: THREE_COASTLINE_LAYER_VERSION, group, line: null, signature: null, buildCount: 0 };
}

export function updateThreeCoastlineLayer(layer, coastlineGeometry = {}, options = {}) {
  if (!layer?.group) return layer;
  const signature = coastlineGeometry.sourceDigest ?? JSON.stringify(coastlineGeometry.segments ?? []);
  if (!layer.line || layer.signature !== signature) {
    if (layer.line) { layer.group.remove(layer.line); disposeObject(layer.line); }
    const points = [];
    for (const segment of coastlineGeometry.segments ?? []) {
      points.push(toWorld(segment.start, options), toWorld(segment.end, options));
    }
    const geometry = new THREE.BufferGeometry().setFromPoints(points);
    const material = new THREE.LineBasicMaterial({ color: options.color ?? 0xe6f6c9, transparent: true, opacity: 0.96, depthWrite: false });
    const line = new THREE.LineSegments(geometry, material);
    line.name = 'canonical-coastline-segments';
    line.userData = { missionObjectType: 'coastline', sourceDigest: coastlineGeometry.sourceDigest ?? null, rendererOwnsRouteBlocking: false };
    layer.group.add(line);
    layer.line = line;
    layer.signature = signature;
    layer.buildCount += 1;
  }
  layer.line.visible = options.visible !== false;
  return layer;
}

export function setThreeCoastlineLayerVisibility(layer, visible) {
  if (layer?.group) layer.group.visible = visible !== false;
  return layer;
}

export function disposeThreeCoastlineLayer(layer) {
  if (layer?.line) disposeObject(layer.line);
  layer?.group?.removeFromParent?.();
}

export function threeCoastlineLayerSummary(layer = {}, geometry = {}) {
  return {
    type: 'anchor.three.coastline-layer-summary',
    version: THREE_COASTLINE_LAYER_VERSION,
    visible: layer.group?.visible !== false && layer.line?.visible !== false,
    coastlineBuildCount: Number(layer.buildCount ?? 0),
    coastlineSegmentCount: geometry.segments?.length ?? Math.floor((layer.line?.geometry?.attributes?.position?.count ?? 0) / 2),
    sourceDigest: geometry.sourceDigest ?? layer.line?.userData?.sourceDigest ?? null,
    rendererOwnsRouteBlocking: false
  };
}

function toWorld(point = {}, options = {}) {
  const transform = options.coordinateSystem ?? {};
  const cellSize = Number(transform.cellSize ?? 1);
  const width = Number(options.width ?? transform.width ?? 1);
  const height = Number(options.height ?? transform.height ?? 1);
  return new THREE.Vector3((Number(point.x ?? 0) + 0.5 - width / 2) * cellSize, Number(options.worldY ?? 0.035), (Number(point.y ?? 0) + 0.5 - height / 2) * cellSize);
}
