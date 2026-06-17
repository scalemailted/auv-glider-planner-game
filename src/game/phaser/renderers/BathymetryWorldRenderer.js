import {
  createBathymetryCamera,
  projectBathymetryMesh,
  projectBathymetryPoint
} from '../../../core/science/BathymetryMeshModel.js';

export const BATHYMETRY_WORLD_RENDERER_VERSION = 'bathymetry-world-renderer-phaser-env-r1';

export function drawBathymetryWorld(target, geometry, cameraInput = {}, options = {}) {
  const camera = createBathymetryCamera(cameraInput);
  const mesh = projectBathymetryMesh({
    bottomSurface: geometry?.bottomSurface,
    waterSurface: geometry?.waterSurface,
    depthLayerPlanes: geometry?.depthLayerPlanes ?? []
  }, camera);
  if (options.showBathymetry !== false) drawBathymetrySurface(target, mesh.bottomSurface, options);
  if (options.showWaterSurface !== false) drawWaterSurfacePlane(target, mesh.waterSurface, options);
  drawDepthLayerPlanes(target, mesh.depthLayerPlanes, options);
  if (options.showDiveProfilePath !== false) drawDiveProfilePath(target, projectPath(geometry?.diveProfilePath, camera), options);
  if (options.showPlannedPath !== false) drawPlannedPath(target, projectPath(geometry?.plannedPath, camera), options);
  if (options.showRealizedTrajectory !== false) drawRealizedTrajectory(target, projectPath(geometry?.realizedTrajectory, camera), options);
  if (options.showSurfaceWaypoints !== false) drawSurfaceWaypoints(target, projectPath(geometry?.surfaceWaypoints, camera), options);
  if (options.showSamplingPoints !== false) drawSamplingPoints(target, projectPath(geometry?.samplingPoints, camera), options);
  return bathymetryRendererSummary({ ...options, camera });
}

export function drawBathymetrySurface(target, projectedMesh, options = {}) {
  const points = projectedMesh?.points ?? [];
  if (!target || points.length < 2) return;
  const alpha = Number(options.bathymetryAlpha ?? 0.82);
  const rows = groupRows(points, projectedMesh.width, projectedMesh.stride ?? 1);
  for (const row of rows) {
    drawPolyline(target, row, 0x355f78, alpha * 0.5, 1);
  }
  const columns = groupColumns(points, projectedMesh.width, projectedMesh.stride ?? 1);
  for (const column of columns) {
    drawPolyline(target, column, 0x355f78, alpha * 0.36, 1);
  }
  points.forEach((point) => {
    const color = bathymetryColor(point.depthMeters);
    target.fillStyle(color, point.depthMeters <= 0 ? 0.48 : 0.32);
    target.fillCircle(point.screenX, point.screenY, point.depthMeters <= 0 ? 2.8 : 1.7);
  });
}

export function drawWaterSurfacePlane(target, projectedPlane, options = {}) {
  drawPlane(target, projectedPlane, 0x67d6ff, Number(options.waterSurfaceAlpha ?? 0.16), 0x98e7ff, 0.42);
}

export function drawDepthLayerPlanes(target, projectedPlanes = [], options = {}) {
  const visible = options.layerVisibility ?? {};
  for (const plane of projectedPlanes ?? []) {
    if (visible[plane.id] === false) continue;
    const color = layerColor(plane.id);
    drawPlane(target, plane, color, 0.08, color, 0.34);
  }
}

export function drawSurfaceWaypoints(target, projectedWaypoints = [], options = {}) {
  if (!target) return;
  for (const point of projectedWaypoints ?? []) {
    target.fillStyle(0xf6d365, 0.95);
    target.fillCircle(point.screenX, point.screenY, 5.5);
    target.lineStyle(2, 0x2b2110, 0.8);
    target.strokeCircle(point.screenX, point.screenY, 7.5);
    if (options.drawLabels !== false) drawPointLabel(target, point, point.label ?? point.id, 0xf6d365);
  }
}

export function drawSamplingPoints(target, projectedSamples = [], options = {}) {
  if (!target) return;
  for (const point of projectedSamples ?? []) {
    const color = layerColor(point.depthLayerId);
    target.fillStyle(color, 0.92);
    target.fillCircle(point.screenX, point.screenY, 4.8);
    target.lineStyle(2, 0xffffff, 0.55);
    target.strokeCircle(point.screenX, point.screenY, 6.4);
    if (options.drawLabels === true) drawPointLabel(target, point, point.depthLayerId ?? 'sample', color);
  }
}

export function drawPlannedPath(target, projectedPath = [], options = {}) {
  drawPolyline(target, projectedPath, options.plannedPathColor ?? 0xf6d365, 0.9, 3);
}

export function drawRealizedTrajectory(target, projectedPath = [], options = {}) {
  drawPolyline(target, projectedPath, options.realizedPathColor ?? 0x63e6be, 0.9, 3, true);
}

export function drawDiveProfilePath(target, projectedPath = [], options = {}) {
  drawPolyline(target, projectedPath, options.diveProfileColor ?? 0xcba6f7, 0.62, 2);
}

export function bathymetryRendererSummary(options = {}) {
  return {
    type: 'anchor.renderer.bathymetry-world-summary',
    version: BATHYMETRY_WORLD_RENDERER_VERSION,
    rendererBackend: 'phaserGraphicsPseudo3D',
    usesThree: false,
    usesPseudo3DProjection: true,
    camera: options.camera ?? null,
    ownsSimulationState: false,
    ownsScoring: false,
    ownsPlanning: false,
    usesFull3DPlanning: false,
    usesHydrodynamicSolver: false,
    usesTerrainFlowAsOceanCurrent: false,
    usesWebGPUFluid: false,
    usesMARL: false
  };
}

function projectPath(points = [], camera) {
  return (Array.isArray(points) ? points : []).map((point) => projectBathymetryPoint(point, camera));
}

function drawPlane(target, plane, fillColor, fillAlpha, lineColor, lineAlpha) {
  const corners = plane?.corners ?? [];
  if (!target || corners.length < 4) return;
  target.fillStyle(fillColor, fillAlpha);
  target.beginPath();
  target.moveTo(corners[0].screenX, corners[0].screenY);
  for (let index = 1; index < corners.length; index += 1) target.lineTo(corners[index].screenX, corners[index].screenY);
  target.closePath();
  target.fillPath();
  target.lineStyle(2, lineColor, lineAlpha);
  target.strokePath();
}

function drawPolyline(target, points = [], color, alpha, width, dashed = false) {
  if (!target || points.length < 2) return;
  target.lineStyle(width, color, alpha);
  for (let index = 1; index < points.length; index += 1) {
    if (dashed && index % 2 === 0) continue;
    const a = points[index - 1];
    const b = points[index];
    target.lineBetween(a.screenX, a.screenY, b.screenX, b.screenY);
  }
}

function drawPointLabel(target, point, label, color) {
  if (!target || !label) return;
  target.lineStyle(1, color, 0.45);
  target.strokeRect(point.screenX + 8, point.screenY - 7, Math.min(46, String(label).length * 6 + 8), 14);
}

function groupRows(points, width, stride) {
  const rowWidth = Math.max(1, Math.ceil(width / stride));
  const rows = [];
  for (let index = 0; index < points.length; index += rowWidth) rows.push(points.slice(index, index + rowWidth));
  return rows;
}

function groupColumns(points, width, stride) {
  const rowWidth = Math.max(1, Math.ceil(width / stride));
  const rows = groupRows(points, width, stride);
  return Array.from({ length: rowWidth }, (_entry, column) => rows.map((row) => row[column]).filter(Boolean));
}

function bathymetryColor(depthMeters) {
  const depth = Number(depthMeters ?? 0);
  if (depth <= 0) return 0x58704b;
  if (depth < 35) return 0x2f9cb3;
  if (depth < 90) return 0x246b93;
  return 0x173456;
}

function layerColor(id) {
  return {
    surface: 0x8fe9ff,
    shallow: 0x7bdff2,
    thermocline: 0xf6d365,
    midwater: 0xa6e3a1,
    deep: 0xcba6f7,
    bottom: 0xffa86b
  }[id] ?? 0x9fb4cf;
}
