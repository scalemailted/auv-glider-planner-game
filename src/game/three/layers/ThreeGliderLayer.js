import * as THREE from 'three';
import { buildGliderPoseViewModel, gliderPoseViewModelSummary } from '../../../core/rendering/GliderPoseViewModel.js';
import { clearGroup, disposeObject, agentColor, positionForRecord } from './ThreeMissionLayerUtils.js';

const MODEL_FORWARD_AXIS = new THREE.Vector3(0, 1, 0);

export function updateThreeGliderLayer(group, viewModel = {}) {
  const transform = viewModel.coordinateSystem;
  if (!group || !transform) return group;
  const meshById = group.userData.meshById ?? new Map();
  group.userData.meshById = meshById;
  const activeIds = new Set();
  const poseSummaries = [];
  for (const [index, glider] of (viewModel.gliders ?? []).entries()) {
    if (glider.visible === false) continue;
    const id = glider.agentId ?? glider.id ?? `glider-${index + 1}`;
    activeIds.add(id);
    const pose = buildGliderPoseViewModel({ glider });
    poseSummaries.push(gliderPoseViewModelSummary(pose));
    const mesh = ensureGliderMesh(group, meshById, id, glider, index, transform);
    mesh.position.copy(positionForRecord(transform, { ...glider, depthMeters: pose.depthMeters }, 0.32));
    applyGliderOrientation(mesh, pose);
    mesh.material.color.setHex(glider.selected ? 0xfff0a3 : agentColor(id, index));
    mesh.userData = {
      missionObjectType: 'glider',
      missionObjectId: id,
      id,
      agentId: id,
      selected: glider.selected === true,
      status: glider.status,
      gridCell: { x: glider.x, y: glider.y },
      poseSummary: gliderPoseViewModelSummary(pose),
      modelForwardAxis: '+Y cone axis maps to mission heading/course vector in +X/+Z world plane'
    };
  }
  for (const [id, mesh] of [...meshById.entries()]) {
    if (activeIds.has(id)) continue;
    meshById.delete(id);
    group.remove(mesh);
    disposeObject(mesh);
  }
  group.userData.poseSummaries = poseSummaries;
  return group;
}

export function clearThreeGliderLayer(group) {
  clearGroup(group);
  if (group?.userData) group.userData.meshById = new Map();
}

function ensureGliderMesh(group, meshById, id, glider, index, transform) {
  const existing = meshById.get(id);
  if (existing) return existing;
  const mesh = new THREE.Mesh(
    new THREE.ConeGeometry(transform.cellSize * 0.24, transform.cellSize * 0.72, 24),
    new THREE.MeshStandardMaterial({ color: glider.selected ? 0xfff0a3 : agentColor(id, index), roughness: 0.55, metalness: 0.08 })
  );
  mesh.name = id;
  meshById.set(id, mesh);
  group.add(mesh);
  return mesh;
}

function applyGliderOrientation(mesh, pose = {}) {
  const heading = Number(pose.headingRadians ?? pose.courseOverGroundRadians ?? 0);
  const pitch = Number(pose.pitchRadians ?? 0);
  const horizontal = new THREE.Vector3(Math.cos(heading), 0, Math.sin(heading));
  const direction = new THREE.Vector3(
    horizontal.x * Math.cos(pitch),
    -Math.sin(pitch),
    horizontal.z * Math.cos(pitch)
  );
  if (direction.lengthSq() < 1e-8) return;
  direction.normalize();
  mesh.quaternion.setFromUnitVectors(MODEL_FORWARD_AXIS, direction);
  const roll = Number(pose.rollRadians ?? 0);
  if (Number.isFinite(roll) && Math.abs(roll) > 1e-6) {
    const rollQuat = new THREE.Quaternion().setFromAxisAngle(direction, roll);
    mesh.quaternion.multiply(rollQuat);
  }
}
