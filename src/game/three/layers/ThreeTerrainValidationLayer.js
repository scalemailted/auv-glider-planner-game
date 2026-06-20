import * as THREE from 'three';
import { clearGroup, disposeObject, makeLine, positionForRecord } from './ThreeMissionLayerUtils.js';

export const THREE_TERRAIN_VALIDATION_LAYER_VERSION = 'three-terrain-validation-layer-r1-2c';

export function updateThreeTerrainValidationLayer(group, viewModel = {}) {
  if (!group) return group;
  const transform = viewModel.coordinateSystem;
  const report = viewModel.terrainValidation ?? null;
  const issues = [...(report?.hardErrors ?? []), ...(report?.warnings ?? []), ...(report?.advisories ?? [])].filter((issue) => issue.position);
  const existing = group.userData.objects instanceof Map ? group.userData.objects : new Map();
  const seen = new Set();
  for (const [index, issue] of issues.entries()) {
    const id = `terrain-validation-issue-${issue.code}-${issue.agentId ?? issue.segmentId ?? issue.targetId ?? index}-${index}`;
    seen.add(id);
    let marker = existing.get(id);
    if (!marker) {
      marker = createIssueMarker(issue);
      marker.name = id;
      group.add(marker);
      existing.set(id, marker);
    }
    marker.position.copy(positionForRecord(transform, issue.position, yOffsetForIssue(issue)));
    marker.material.color.setHex(colorForSeverity(issue.severity));
    marker.userData = issueUserData(id, issue, viewModel);
  }
  for (const segment of report?.segmentReports ?? []) {
    if (segment.status === 'VALID') continue;
    const id = `terrain-validation-segment-${segment.segmentId}`;
    seen.add(id);
    let line = existing.get(id);
    const points = [segment.from, segment.to].filter(Boolean).map((point) => positionForRecord(transform, point, 0.22));
    if (points.length < 2) continue;
    if (!line) {
      line = makeLine(points, { color: segment.status === 'INVALID' ? 0xff4d6d : 0xffd166, opacity: 0.92 });
      line.name = id;
      group.add(line);
      existing.set(id, line);
    } else {
      line.geometry.dispose?.();
      line.geometry = new THREE.BufferGeometry().setFromPoints(points);
    }
    line.userData = { id, missionObjectType: 'terrainValidationCorridor', missionObjectId: id, segmentId: segment.segmentId, status: segment.status, sourceVisibility: 'publicPlanning', rendererOwnsValidation: false };
  }
  for (const [id, object] of existing.entries()) {
    if (!seen.has(id)) {
      group.remove(object);
      disposeObject(object);
      existing.delete(id);
    }
  }
  group.userData.objects = existing;
  group.userData.lastSummary = threeTerrainValidationLayerSummary(group, viewModel);
  return group;
}

export function clearThreeTerrainValidationLayer(group) {
  clearGroup(group);
  if (group?.userData) group.userData.objects = new Map();
}

export function threeTerrainValidationLayerSummary(group = {}, viewModel = {}) {
  const report = viewModel.terrainValidation ?? {};
  const objects = group.userData?.objects instanceof Map ? [...group.userData.objects.values()] : group.children ?? [];
  const issueObjects = objects.filter((object) => object.userData?.missionObjectType === 'terrainValidationIssue');
  const corridorObjects = objects.filter((object) => object.userData?.missionObjectType === 'terrainValidationCorridor');
  return {
    type: 'anchor.renderer.three-terrain-validation-layer-summary',
    version: THREE_TERRAIN_VALIDATION_LAYER_VERSION,
    status: report.status ?? null,
    executable: report.executable === true,
    issueObjectCount: issueObjects.length,
    corridorObjectCount: corridorObjects.length,
    selectedIssueEmphasisAvailable: issueObjects.some((object) => object.userData?.selected === true),
    clearanceMarkerAvailable: issueObjects.some((object) => /CLEARANCE|BATHYMETRY/.test(object.userData?.issueCode ?? '')),
    placementPreviewAvailable: Boolean(viewModel.interactionViewModel?.placementValid !== null && viewModel.interactionViewModel?.placementValid !== undefined),
    ownsValidation: false,
    ownsPlanning: false,
    ownsSimulation: false,
    ownsScoring: false,
    usesMeshRaycastForValidity: false
  };
}

function createIssueMarker(issue = {}) {
  const geometry = issue.severity === 'HARD_ERROR'
    ? new THREE.OctahedronGeometry(0.22, 0)
    : issue.severity === 'WARNING'
      ? new THREE.CylinderGeometry(0.22, 0.22, 0.06, 3)
      : new THREE.SphereGeometry(0.13, 12, 8);
  const material = new THREE.MeshBasicMaterial({ color: colorForSeverity(issue.severity), transparent: true, opacity: issue.severity === 'ADVISORY' ? 0.72 : 0.92, depthWrite: false });
  return new THREE.Mesh(geometry, material);
}

function issueUserData(id, issue, viewModel = {}) {
  const selected = viewModel.selectedTerrainIssueCode === issue.code || viewModel.selectedRouteSegmentId === issue.segmentId || viewModel.selectedScienceTargetId === issue.targetId;
  return { id, missionObjectType: 'terrainValidationIssue', missionObjectId: id, issueCode: issue.code, issueSeverity: issue.severity, message: issue.message, agentId: issue.agentId ?? null, segmentId: issue.segmentId ?? null, waypointId: issue.waypointId ?? null, targetId: issue.targetId ?? null, focusHint: issue.focusHint ?? null, selected, sourceVisibility: 'publicPlanning', rendererOwnsValidation: false, rendererOwnsPlanning: false, rendererOwnsSimulation: false, rendererOwnsScoring: false };
}

function colorForSeverity(severity) {
  if (severity === 'HARD_ERROR') return 0xff4d6d;
  if (severity === 'WARNING') return 0xffd166;
  return 0x8ce99a;
}

function yOffsetForIssue(issue = {}) {
  if (/CLEARANCE|BATHYMETRY|SEABED|TARGET/.test(issue.code ?? '')) return 0.34;
  return issue.severity === 'HARD_ERROR' ? 0.52 : 0.42;
}
