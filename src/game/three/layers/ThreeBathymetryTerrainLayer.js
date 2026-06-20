import * as THREE from 'three';
import { disposeObject } from './ThreeMissionLayerUtils.js';

export const THREE_BATHYMETRY_TERRAIN_LAYER_VERSION = 'three-bathymetry-terrain-layer-r1-2b';

export function createThreeBathymetryTerrainLayer(options = {}) {
  const group = new THREE.Group();
  group.name = options.name ?? 'three-bathymetry-terrain-layer';
  return {
    type: 'anchor.three.bathymetry-terrain-layer',
    version: THREE_BATHYMETRY_TERRAIN_LAYER_VERSION,
    group,
    mesh: null,
    wireframe: null,
    material: null,
    wireframeMaterial: null,
    geometrySignature: null,
    buildCount: 0,
    materialUpdateCount: 0,
    lastSummary: null,
    ownsCanonicalBathymetry: false,
    ownsCollision: false,
    ownsDiveFeasibility: false
  };
}

export function updateThreeBathymetryTerrainLayer(layer, meshGeometry = {}, options = {}) {
  if (!layer?.group) return layer;
  const mode = normalizeTerrainMode(options.mode ?? options.terrainMode ?? 'filledContours');
  const signature = terrainGeometrySignature(meshGeometry, options);
  if (!layer.mesh || layer.geometrySignature !== signature) {
    disposeTerrainObjects(layer);
    const geometry = bufferGeometryFromMesh(meshGeometry);
    const material = new THREE.MeshStandardMaterial({
      vertexColors: Boolean(meshGeometry.colors?.length),
      roughness: 0.88,
      metalness: 0.02,
      side: THREE.DoubleSide,
      transparent: false,
      depthWrite: true
    });
    const mesh = new THREE.Mesh(geometry, material);
    mesh.name = 'canonical-bathymetry-terrain-mesh';
    mesh.userData = {
      missionObjectType: 'bathymetryTerrain',
      sourceDigest: meshGeometry.sourceDigest ?? null,
      meshDigest: meshGeometry.meshDigest ?? meshGeometry.sourceDigest ?? null,
      canonicalOwner: 'core',
      rendererOwnsBathymetry: false,
      usesVisualMeshForPhysics: false,
      indexedGeometry: true
    };
    layer.group.add(mesh);
    const wireframeMaterial = new THREE.LineBasicMaterial({ color: 0xb9f6ff, transparent: true, opacity: 0.08, depthWrite: false });
    const wireframe = new THREE.LineSegments(new THREE.WireframeGeometry(geometry), wireframeMaterial);
    wireframe.name = 'canonical-bathymetry-terrain-wireframe';
    wireframe.userData = { missionObjectType: 'bathymetryWireframe', sourceDigest: meshGeometry.sourceDigest ?? null, rendererOwnsBathymetry: false };
    layer.group.add(wireframe);
    layer.mesh = mesh;
    layer.wireframe = wireframe;
    layer.material = material;
    layer.wireframeMaterial = wireframeMaterial;
    layer.geometrySignature = signature;
    layer.buildCount += 1;
  }
  applyTerrainMode(layer, mode);
  layer.materialUpdateCount += 1;
  layer.lastSummary = threeBathymetryTerrainLayerSummary(layer, meshGeometry);
  return layer;
}

export function setThreeBathymetryTerrainLayerVisibility(layer, visible) {
  if (layer?.group) layer.group.visible = visible !== false;
  return layer;
}

export function disposeThreeBathymetryTerrainLayer(layer) {
  if (!layer) return;
  disposeTerrainObjects(layer);
  layer.group?.removeFromParent?.();
}

export function threeBathymetryTerrainLayerSummary(layer = {}, meshGeometry = {}) {
  return {
    type: 'anchor.three.bathymetry-terrain-layer-summary',
    version: THREE_BATHYMETRY_TERRAIN_LAYER_VERSION,
    visible: layer.group?.visible !== false,
    terrainObjectCount: [layer.mesh, layer.wireframe].filter(Boolean).length,
    terrainBuildCount: Number(layer.buildCount ?? 0),
    terrainMaterialUpdateCount: Number(layer.materialUpdateCount ?? 0),
    terrainVertexCount: Number(meshGeometry.vertexCount ?? layer.mesh?.geometry?.attributes?.position?.count ?? 0),
    terrainTriangleCount: Number(meshGeometry.triangleCount ?? ((layer.mesh?.geometry?.index?.count ?? 0) / 3)),
    indexedGeometry: Boolean(layer.mesh?.geometry?.index),
    sourceDigest: meshGeometry.sourceDigest ?? layer.mesh?.userData?.sourceDigest ?? null,
    meshDigest: meshGeometry.meshDigest ?? meshGeometry.sourceDigest ?? layer.mesh?.userData?.sourceDigest ?? null,
    geometrySignature: layer.geometrySignature ?? null,
    rendererOwnsBathymetry: false,
    ownsCollision: false,
    ownsDiveFeasibility: false,
    usesVisualMeshForPhysics: false
  };
}

function bufferGeometryFromMesh(meshGeometry = {}) {
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.Float32BufferAttribute(meshGeometry.positions ?? meshGeometry.vertices ?? [], 3));
  if (meshGeometry.normals?.length === (meshGeometry.positions ?? meshGeometry.vertices ?? []).length) geometry.setAttribute('normal', new THREE.Float32BufferAttribute(meshGeometry.normals, 3));
  if (meshGeometry.uvs?.length) geometry.setAttribute('uv', new THREE.Float32BufferAttribute(meshGeometry.uvs, 2));
  if (meshGeometry.colors?.length) geometry.setAttribute('color', new THREE.Float32BufferAttribute(meshGeometry.colors, 3));
  geometry.setIndex(meshGeometry.indices ?? []);
  if (!geometry.attributes.normal) geometry.computeVertexNormals();
  geometry.computeBoundingBox();
  geometry.computeBoundingSphere();
  return geometry;
}

function applyTerrainMode(layer, mode) {
  if (layer.mesh) {
    layer.mesh.visible = mode !== 'hidden' && mode !== 'wireframe';
    layer.mesh.material.wireframe = mode === 'wireframe';
  }
  if (layer.wireframe) {
    layer.wireframe.visible = mode === 'wireframe' || mode === 'filledContours';
    layer.wireframe.material.opacity = mode === 'wireframe' ? 0.28 : 0.06;
  }
}

function terrainGeometrySignature(meshGeometry = {}, options = {}) {
  return JSON.stringify({
    version: meshGeometry.version,
    sourceDigest: meshGeometry.sourceDigest,
    width: meshGeometry.width,
    height: meshGeometry.height,
    vertexCount: meshGeometry.vertexCount,
    triangleCount: meshGeometry.triangleCount,
    verticalExaggeration: meshGeometry.verticalExaggeration,
    qualityProfile: options.qualityProfile ?? null
  });
}

function normalizeTerrainMode(value) {
  if (value === 'hidden') return 'hidden';
  if (value === 'wireframe') return 'wireframe';
  if (value === 'depthShading') return 'depthShading';
  if (value === 'slopeShading') return 'slopeShading';
  if (value === 'filledBathymetry') return 'filledBathymetry';
  return 'filledContours';
}

function disposeTerrainObjects(layer) {
  for (const object of [layer.mesh, layer.wireframe]) {
    if (object) {
      layer.group?.remove?.(object);
      disposeObject(object);
    }
  }
  layer.mesh = null;
  layer.wireframe = null;
  layer.material = null;
  layer.wireframeMaterial = null;
}
