import * as THREE from 'three';
import { clearGroup, disposeObject, agentColor, positionForRecord } from './ThreeMissionLayerUtils.js';

const INITIAL_CAPACITY = 64;

export function updateThreeRealizedTrajectoryLayer(group, viewModel = {}) {
  if (!group) return group;
  const transform = viewModel.coordinateSystem;
  const records = [...(viewModel.realizedTrajectories ?? []), ...(viewModel.sampledTrajectories ?? [])];
  const existing = group.userData.objects instanceof Map ? group.userData.objects : new Map();
  const seen = new Set();
  const counters = group.userData.counters ?? {
    trajectoryAppendCount: 0,
    trajectoryFullRebuildCount: 0,
    trajectoryBufferResizeCount: 0,
    duplicateTrajectoryPointCount: 0
  };
  for (const [index, trajectory] of records.entries()) {
    const id = trajectory.id ?? `${trajectory.agentId ?? 'agent'}-trajectory-${index}`;
    seen.add(id);
    const rawPoints = trajectory.points ?? [];
    const points = rawPoints.map((point) => positionForRecord(transform, point, trajectory.sampled ? 0.24 : 0.18));
    if (points.length < 2) continue;
    let line = existing.get(id);
    if (!line) {
      line = createStableLine(id, trajectory, index, points.length);
      group.add(line);
      existing.set(id, line);
    } else if (line.userData.sampled !== (trajectory.sampled === true)) {
      line.material?.color?.setHex?.(trajectory.sampled ? 0xffffff : agentColor(trajectory.agentId, index));
      line.material.opacity = trajectory.sampled ? 0.96 : 0.84;
    }
    const previousPointCount = Number(line.userData.pointCount ?? 0);
    const duplicateCount = countDuplicatePointKeys(rawPoints);
    if (duplicateCount) counters.duplicateTrajectoryPointCount += duplicateCount;
    if (points.length > Number(line.userData.capacity ?? 0)) {
      resizeLineBuffer(line, nextCapacity(points.length));
      counters.trajectoryBufferResizeCount += 1;
    }
    writeLinePoints(line, points);
    if (points.length > previousPointCount) counters.trajectoryAppendCount += points.length - previousPointCount;
    else if (points.length < previousPointCount) counters.trajectoryFullRebuildCount += 1;
    line.userData = {
      ...line.userData,
      id,
      missionObjectType: 'realizedTrajectory',
      missionObjectId: id,
      routeSegmentId: id,
      agentId: trajectory.agentId,
      pointCount: points.length,
      sampled: trajectory.sampled === true,
      status: trajectory.status ?? 'realized'
    };
  }
  for (const [id, object] of existing.entries()) {
    if (!seen.has(id)) {
      group.remove(object);
      disposeObject(object);
      existing.delete(id);
    }
  }
  group.userData.objects = existing;
  group.userData.counters = counters;
  group.userData.trajectoryAppendCount = counters.trajectoryAppendCount;
  group.userData.trajectoryFullRebuildCount = counters.trajectoryFullRebuildCount;
  group.userData.trajectoryBufferResizeCount = counters.trajectoryBufferResizeCount;
  group.userData.duplicateTrajectoryPointCount = counters.duplicateTrajectoryPointCount;
  return group;
}

export function clearThreeRealizedTrajectoryLayer(group) {
  clearGroup(group);
  if (group?.userData) {
    group.userData.objects = new Map();
    group.userData.counters = { trajectoryAppendCount: 0, trajectoryFullRebuildCount: 0, trajectoryBufferResizeCount: 0, duplicateTrajectoryPointCount: 0 };
  }
}

function createStableLine(id, trajectory, index, pointCount) {
  const capacity = nextCapacity(Math.max(INITIAL_CAPACITY, pointCount));
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.BufferAttribute(new Float32Array(capacity * 3), 3));
  geometry.setDrawRange(0, 0);
  const line = new THREE.Line(geometry, new THREE.LineBasicMaterial({ color: trajectory.sampled ? 0xffffff : agentColor(trajectory.agentId, index), transparent: true, opacity: trajectory.sampled ? 0.96 : 0.84 }));
  line.name = id;
  line.userData = { id, capacity, pointCount: 0, sampled: trajectory.sampled === true };
  return line;
}

function resizeLineBuffer(line, capacity) {
  line.geometry?.dispose?.();
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.BufferAttribute(new Float32Array(capacity * 3), 3));
  geometry.setDrawRange(0, 0);
  line.geometry = geometry;
  line.userData.capacity = capacity;
}

function writeLinePoints(line, points) {
  const attribute = line.geometry.getAttribute('position');
  for (let index = 0; index < points.length; index += 1) {
    const point = points[index];
    attribute.setXYZ(index, point.x, point.y, point.z);
  }
  attribute.needsUpdate = true;
  line.geometry.setDrawRange(0, points.length);
  line.geometry.computeBoundingSphere?.();
}

function nextCapacity(size) {
  let capacity = INITIAL_CAPACITY;
  while (capacity < size) capacity *= 2;
  return capacity;
}

function countDuplicatePointKeys(points = []) {
  const seen = new Set();
  let duplicates = 0;
  for (const point of points) {
    const key = `${round(point.x ?? point.col)},${round(point.y ?? point.row)},${round(point.depthMeters ?? point.z ?? 0)},${round(point.t ?? point.timeSeconds ?? 0)}`;
    if (seen.has(key)) duplicates += 1;
    else seen.add(key);
  }
  return duplicates;
}

function round(value) {
  const numeric = Number(value);
  return Number.isFinite(numeric) ? numeric.toFixed(3) : '0.000';
}
