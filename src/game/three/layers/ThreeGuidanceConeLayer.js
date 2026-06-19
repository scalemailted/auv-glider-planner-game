import * as THREE from 'three';
import { clearGroup, makeLine, positionForRecord } from './ThreeMissionLayerUtils.js';

export const THREE_GUIDANCE_CONE_LAYER_VERSION = 'three-guidance-cone-layer-r1-1e';

export function updateThreeGuidanceConeLayer(group, viewModel = {}) {
  if (!group) return group;
  clearGroup(group);
  const transform = viewModel.coordinateSystem;
  if (!transform) return group;
  const guidance = viewModel.guidance ?? {};
  const interaction = viewModel.interactionViewModel ?? {};
  const cone = guidance.driftCone ?? interaction.guidanceCone ?? null;
  const reachable = guidance.reachableRegion ?? interaction.reachableRegion ?? null;
  const previewPath = guidance.previewPath ?? [];
  const riskStatus = cone?.blocked ? 'invalid' : cone?.feasibility ?? (cone ? 'likely' : 'unavailable');
  if (cone?.polygon?.length >= 3) group.add(coneMesh(transform, cone, riskStatus));
  if (cone?.polygon?.length >= 2) group.add(coneOutline(transform, cone, riskStatus));
  if (previewPath.length >= 2) group.add(previewLine(transform, previewPath));
  if (cone?.origin && cone?.target) group.add(directionArrow(transform, cone.origin, cone.target, riskStatus, 'expected-course-arrow'));
  if (reachable?.center) group.add(reachableRing(transform, reachable));
  group.userData = {
    ...(group.userData ?? {}),
    version: THREE_GUIDANCE_CONE_LAYER_VERSION,
    guidanceAvailable: Boolean(cone || reachable || previewPath.length),
    guidanceSource: guidance.source ?? 'canonicalPlanningGuidance',
    guidanceConeVisible: Boolean(cone?.polygon?.length),
    guidanceConeOrigin: cone?.origin ? { x: cone.origin.x, y: cone.origin.y } : null,
    guidanceConeDirection: cone?.origin && cone?.target ? Math.atan2(Number(cone.target.y) - Number(cone.origin.y), Number(cone.target.x) - Number(cone.origin.x)) : null,
    guidanceConeAngularWidth: cone?.polygon?.length ? estimateAngularWidth(cone) : null,
    guidanceConeRadius: cone?.origin && cone?.target ? Math.hypot(Number(cone.target.x) - Number(cone.origin.x), Number(cone.target.y) - Number(cone.origin.y)) : null,
    guidanceRiskStatus: riskStatus,
    ownsPlanning: false,
    computesRouteFeasibility: false
  };
  return group;
}

function coneMesh(transform, cone, riskStatus) {
  const points = cone.polygon.map((point) => positionForRecord(transform, point, 0.34));
  const vertices = [];
  for (let index = 1; index < points.length - 1; index += 1) {
    for (const p of [points[0], points[index], points[index + 1]]) vertices.push(p.x, p.y, p.z);
  }
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.Float32BufferAttribute(vertices, 3));
  geometry.computeVertexNormals();
  const mesh = new THREE.Mesh(geometry, new THREE.MeshBasicMaterial({ color: colorForRisk(riskStatus), transparent: true, opacity: 0.16, side: THREE.DoubleSide, depthWrite: false }));
  mesh.name = 'canonical-guidance-cone-fill';
  mesh.userData = { missionObjectType: 'guidanceCone', ownsPlanning: false, source: 'canonicalPlanningGuidance' };
  return mesh;
}

function coneOutline(transform, cone, riskStatus) {
  const points = [...cone.polygon, cone.polygon[0]].map((point) => positionForRecord(transform, point, 0.36));
  const line = makeLine(points, { color: colorForRisk(riskStatus), opacity: 0.72 });
  line.name = 'canonical-guidance-cone-outline';
  line.userData = { missionObjectType: 'guidanceCone', ownsPlanning: false, source: 'canonicalPlanningGuidance' };
  return line;
}

function previewLine(transform, path) {
  const line = makeLine(path.map((point) => positionForRecord(transform, point, 0.39)), { color: 0xffffff, opacity: 0.46 });
  line.name = 'guidance-preview-path';
  line.userData = { missionObjectType: 'guidancePreviewPath', ownsPlanning: false, source: 'canonicalPlanningGuidance' };
  return line;
}

function directionArrow(transform, origin, target, riskStatus, name) {
  const group = new THREE.Group();
  group.name = name;
  const start = positionForRecord(transform, origin, 0.44);
  const end = positionForRecord(transform, target, 0.44);
  const line = makeLine([start, end], { color: colorForRisk(riskStatus), opacity: 0.9 });
  const dx = end.x - start.x;
  const dz = end.z - start.z;
  const angle = Math.atan2(dz, dx);
  const head = new THREE.Mesh(
    new THREE.ConeGeometry(transform.cellSize * 0.08, transform.cellSize * 0.22, 12),
    new THREE.MeshBasicMaterial({ color: colorForRisk(riskStatus), transparent: true, opacity: 0.9, depthWrite: false })
  );
  head.position.copy(end);
  head.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), new THREE.Vector3(Math.cos(angle), 0, Math.sin(angle)).normalize());
  group.add(line, head);
  group.userData = { missionObjectType: 'guidanceCourseArrow', ownsPlanning: false, source: 'canonicalPlanningGuidance' };
  return group;
}

function reachableRing(transform, region) {
  const radiusX = Math.max(0.1, Number(region.radiusX ?? 1)) * transform.cellSize;
  const radiusY = Math.max(0.1, Number(region.radiusY ?? region.radiusX ?? 1)) * transform.cellSize;
  const curve = new THREE.EllipseCurve(0, 0, radiusX, radiusY, 0, Math.PI * 2, false, Number(region.angle ?? 0));
  const points = curve.getPoints(96).map((point) => new THREE.Vector3(point.x, 0, point.y));
  const line = makeLine(points, { color: 0x9ee7ff, opacity: 0.34 });
  line.name = 'canonical-reachable-region-outline';
  line.position.copy(positionForRecord(transform, region.center, 0.31));
  line.userData = { missionObjectType: 'reachableRegion', ownsPlanning: false, source: 'canonicalPlanningGuidance' };
  return line;
}

function colorForRisk(status) {
  if (status === 'invalid' || status === 'blocked') return 0xff4e5a;
  if (status === 'warning') return 0xffd166;
  return 0x54c7ec;
}

function estimateAngularWidth(cone = {}) {
  if (!cone.origin || !cone.polygon?.length) return null;
  const angles = cone.polygon.map((point) => Math.atan2(Number(point.y) - Number(cone.origin.y), Number(point.x) - Number(cone.origin.x)));
  return Math.max(...angles) - Math.min(...angles);
}
