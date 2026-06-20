import * as THREE from 'three';
import { disposeObject } from './ThreeMissionLayerUtils.js';

export const THREE_BATHYMETRY_CONTOUR_LAYER_VERSION = 'three-bathymetry-contour-layer-r1-2b';

export function createThreeBathymetryContourLayer(options = {}) {
  const group = new THREE.Group();
  group.name = options.name ?? 'three-bathymetry-contour-layer';
  return { type: 'anchor.three.bathymetry-contour-layer', version: THREE_BATHYMETRY_CONTOUR_LAYER_VERSION, group, line: null, signature: null, buildCount: 0 };
}

export function updateThreeBathymetryContourLayer(layer, contourGeometry = {}, options = {}) {
  if (!layer?.group) return layer;
  const signature = contourGeometry.sourceDigest ?? JSON.stringify(contourGeometry.levelsMeters ?? []);
  if (!layer.line || layer.signature !== signature) {
    if (layer.line) { layer.group.remove(layer.line); disposeObject(layer.line); }
    const points = [];
    for (const segment of contourGeometry.segments ?? []) {
      points.push(toWorld(segment.start, segment.levelMeters, options), toWorld(segment.end, segment.levelMeters, options));
    }
    const geometry = new THREE.BufferGeometry().setFromPoints(points);
    const material = new THREE.LineBasicMaterial({ color: options.color ?? 0x9de7ff, transparent: true, opacity: options.opacity ?? 0.32, depthWrite: false });
    const line = new THREE.LineSegments(geometry, material);
    line.name = 'bathymetry-contour-lines';
    line.userData = { missionObjectType: 'bathymetryContour', sourceDigest: contourGeometry.sourceDigest ?? null, routeConstraint: false };
    layer.group.add(line);
    layer.line = line;
    layer.signature = signature;
    layer.buildCount += 1;
  }
  layer.line.visible = options.visible !== false;
  return layer;
}

export function setThreeBathymetryContourLayerVisibility(layer, visible) {
  if (layer?.group) layer.group.visible = visible !== false;
  return layer;
}

export function disposeThreeBathymetryContourLayer(layer) {
  if (layer?.line) {
    layer.group?.remove?.(layer.line);
    disposeObject(layer.line);
  }
  layer.line = null;
  layer.signature = null;
  layer?.group?.removeFromParent?.();
}

export function threeBathymetryContourLayerSummary(layer = {}, geometry = {}) {
  return {
    type: 'anchor.three.bathymetry-contour-layer-summary',
    version: THREE_BATHYMETRY_CONTOUR_LAYER_VERSION,
    visible: layer.group?.visible !== false && layer.line?.visible !== false,
    contourBuildCount: Number(layer.buildCount ?? 0),
    contourSegmentCount: geometry.segments?.length ?? Math.floor((layer.line?.geometry?.attributes?.position?.count ?? 0) / 2),
    contourLevelsMeters: [...(geometry.levelsMeters ?? [])],
    sourceDigest: geometry.sourceDigest ?? layer.line?.userData?.sourceDigest ?? null,
    routeConstraint: false
  };
}

function toWorld(point = {}, levelMeters = 0, options = {}) {
  const transform = options.coordinateSystem ?? {};
  const cellSize = Number(transform.cellSize ?? 1);
  const width = Number(options.width ?? transform.width ?? 1);
  const height = Number(options.height ?? transform.height ?? 1);
  const depthScale = Number(transform.depthScale ?? options.depthScale ?? 0.045);
  const verticalExaggeration = Number(transform.verticalExaggeration ?? options.verticalExaggeration ?? 1);
  return new THREE.Vector3((Number(point.x ?? 0) + 0.5 - width / 2) * cellSize, -Number(levelMeters ?? 0) * depthScale * verticalExaggeration + 0.018, (Number(point.y ?? 0) + 0.5 - height / 2) * cellSize);
}
