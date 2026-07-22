const BathymetrySchema = require('./BathymetrySchema.js')
const BathymetryFieldModel = require('./BathymetryFieldModel.js')
const WaterColumnSchema = require('./WaterColumnSchema.js')
const BATHYMETRY_MESH_MODEL_VERSION = 'bathymetry-mesh-model-env-r1';

 function createBathymetryMesh(options = {}) {
  const bathymetry = options.bathymetry ?? options.field ?? null;
  const config = BathymetrySchema.createBathymetryConfig(options.bathymetryConfig ?? bathymetry?.config ?? options);
  const bottomSurface = createBathymetrySurfaceMesh(bathymetry, { ...options, bathymetryConfig: config });
  const waterSurface = createWaterSurfacePlane({ ...options, bathymetryConfig: config });
  const depthLayerPlanes = createDepthLayerPlanes(options.waterColumnConfig, config, options);
  return {
    type: 'anchor.science.bathymetry-mesh',
    version: BATHYMETRY_MESH_MODEL_VERSION,
    configSummary: {
      width: config.width,
      height: config.height,
      verticalExaggeration: config.verticalExaggeration,
      depthUnit: config.depthUnit
    },
    bottomSurface,
    waterSurface,
    depthLayerPlanes,
    publicSafe: true,
    notA: config.notA.slice()
  };
}

 function createBathymetrySurfaceMesh(bathymetry, options = {}) {
  const config = BathymetrySchema.createBathymetryConfig(options.bathymetryConfig ?? bathymetry?.config ?? options);
  const stride = Math.max(1, Math.round(options.stride ?? 1));
  const points = [];
  for (let y = 0; y < config.height; y += stride) {
    for (let x = 0; x < config.width; x += stride) {
      const depthMeters = BathymetryFieldModel.sampleBathymetryAt(bathymetry, x, y);
      points.push({
        x,
        y,
        z: -depthMeters,
        depthMeters,
        layerId: 'bathymetricBottom',
        kind: depthMeters <= 0 ? 'land-bottom-point' : 'seafloor-point'
      });
    }
  }
  return {
    type: 'anchor.science.bathymetry-surface-mesh',
    version: BATHYMETRY_MESH_MODEL_VERSION,
    width: config.width,
    height: config.height,
    stride,
    points,
    cellCount: Math.max(0, (config.width - 1) * (config.height - 1)),
    rendererHint: 'wireframe-or-filled-oblique-bottom'
  };
}

 function createWaterSurfacePlane(options = {}) {
  const config = BathymetrySchema.createBathymetryConfig(options.bathymetryConfig ?? options);
  return plane({
    id: 'waterSurface',
    label: 'Water Surface',
    z: 0,
    depthMeters: 0,
    width: config.width,
    height: config.height,
    kind: 'water-surface-plane'
  });
}

 function createDepthLayerPlanes(waterColumnConfig = {}, bathymetryConfig = {}, options = {}) {
  const config = BathymetrySchema.createBathymetryConfig(bathymetryConfig ?? options);
  const water = WaterColumnSchema.normalizeWaterColumnConfig(waterColumnConfig ?? options.waterColumnConfig ?? {});
  return water.depthLayerIds.map((layerId) => {
    const meta = WaterColumnSchema.waterColumnLayerMetadata(layerId);
    const depthMeters = finiteNumber(meta.nominalDepthMeters, layerId === 'surface' ? 0 : config.maxDepthMeters * 0.5);
    return plane({
      id: layerId,
      label: meta.label ?? layerId,
      z: -depthMeters,
      depthMeters,
      width: config.width,
      height: config.height,
      kind: 'depth-layer-plane'
    });
  });
}

 function projectBathymetryPoint(point, cameraInput = {}) {
  const camera = createBathymetryCamera(cameraInput);
  const yaw = degreesToRadians(camera.yaw);
  const pitch = degreesToRadians(camera.pitch);
  const scale = camera.zoom;
  const vertical = camera.verticalExaggeration;
  const centeredX = Number(point.x ?? 0) - Number(camera.centerX ?? 0);
  const centeredY = Number(point.y ?? 0) - Number(camera.centerY ?? 0);
  const z = Number(point.z ?? -Number(point.depthMeters ?? 0)) * vertical;
  const cosYaw = Math.cos(yaw);
  const sinYaw = Math.sin(yaw);
  const rx = centeredX * cosYaw - centeredY * sinYaw;
  const ry = centeredX * sinYaw + centeredY * cosYaw;
  const rz = z;
  const cosPitch = Math.cos(pitch);
  const sinPitch = Math.sin(pitch);
  const py = ry * cosPitch - rz * sinPitch;
  const pz = ry * sinPitch + rz * cosPitch;
  return {
    ...point,
    screenX: round(rx * scale + camera.panX),
    screenY: round(py * scale + camera.panY),
    depthSort: round(pz),
    projected: true
  };
}

 function projectBathymetryMesh(mesh, cameraInput = {}) {
  const camera = createBathymetryCamera(cameraInput);
  return {
    ...mesh,
    projected: true,
    camera,
    bottomSurface: {
      ...mesh.bottomSurface,
      points: (mesh.bottomSurface?.points ?? []).map((point) => projectBathymetryPoint(point, camera))
    },
    waterSurface: projectPlane(mesh.waterSurface, camera),
    depthLayerPlanes: (mesh.depthLayerPlanes ?? []).map((entry) => projectPlane(entry, camera))
  };
}

 function createBathymetryCamera(options = {}) {
  return {
    yaw: finiteNumber(options.yaw, -32),
    pitch: clamp(finiteNumber(options.pitch, 48), 5, 82),
    zoom: clamp(finiteNumber(options.zoom, 18), 2, 80),
    panX: finiteNumber(options.panX, 0),
    panY: finiteNumber(options.panY, 0),
    centerX: finiteNumber(options.centerX, 0),
    centerY: finiteNumber(options.centerY, 0),
    verticalExaggeration: clamp(finiteNumber(options.verticalExaggeration, 1.5), 0.1, 8)
  };
}

 function updateBathymetryCamera(camera, patch = {}) {
  return createBathymetryCamera({ ...(camera ?? {}), ...(patch ?? {}) });
}

 function bathymetryMeshSummary(mesh = {}) {
  return {
    type: 'anchor.science.bathymetry-mesh-summary',
    version: BATHYMETRY_MESH_MODEL_VERSION,
    bottomPointCount: mesh.bottomSurface?.points?.length ?? 0,
    hasWaterSurface: Boolean(mesh.waterSurface),
    depthLayerPlaneCount: mesh.depthLayerPlanes?.length ?? 0,
    layerIds: (mesh.depthLayerPlanes ?? []).map((entry) => entry.id),
    publicSafe: mesh.publicSafe !== false,
    usesFull3DPlanning: false,
    usesHydrodynamicSolver: false
  };
}

 function validateBathymetryMesh(mesh = {}) {
  const errors = [];
  const warnings = [];
  if (mesh?.type !== 'anchor.science.bathymetry-mesh') errors.push(`Expected type anchor.science.bathymetry-mesh, got ${mesh?.type ?? 'missing'}.`);
  if (!Array.isArray(mesh?.bottomSurface?.points) || !mesh.bottomSurface.points.length) errors.push('Bathymetry mesh requires bottomSurface.points.');
  if (!mesh?.waterSurface?.corners?.length) errors.push('Bathymetry mesh requires a water surface plane.');
  if (!Array.isArray(mesh?.depthLayerPlanes) || !mesh.depthLayerPlanes.length) warnings.push('Bathymetry mesh has no depth layer planes.');
  const pointValues = (mesh?.bottomSurface?.points ?? []).flatMap((point) => [point.x, point.y, point.z, point.depthMeters]).map(Number);
  if (!pointValues.every(Number.isFinite)) errors.push('Bathymetry mesh points must be finite.');
  return { valid: errors.length === 0, status: errors.length ? 'FAIL' : warnings.length ? 'WARN' : 'PASS', errors, warnings };
}

function plane({ id, label, z, depthMeters, width, height, kind }) {
  const corners = [
    { x: 0, y: 0, z, depthMeters, layerId: id, kind },
    { x: width - 1, y: 0, z, depthMeters, layerId: id, kind },
    { x: width - 1, y: height - 1, z, depthMeters, layerId: id, kind },
    { x: 0, y: height - 1, z, depthMeters, layerId: id, kind }
  ];
  return { id, label, z, depthMeters, layerId: id, kind, corners, rendererHint: kind };
}

function projectPlane(entry, camera) {
  return entry ? { ...entry, corners: (entry.corners ?? []).map((point) => projectBathymetryPoint(point, camera)) } : null;
}

function finiteNumber(value, fallback) {
  const number = Number(value);
  return Number.isFinite(number) ? number : fallback;
}

function clamp(value, min, max) {
  return Math.min(max, Math.max(min, value));
}

function degreesToRadians(value) {
  return Number(value) * Math.PI / 180;
}

function round(value) {
  return Number(Number(value ?? 0).toFixed(6));
}

module.exports = {createBathymetryMesh, createBathymetrySurfaceMesh, createWaterSurfacePlane, createDepthLayerPlanes, projectBathymetryPoint, projectBathymetryMesh, createBathymetryCamera, updateBathymetryCamera, bathymetryMeshSummary, validateBathymetryMesh}