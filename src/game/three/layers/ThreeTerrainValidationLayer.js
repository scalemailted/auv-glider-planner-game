import * as THREE from 'three';
import { clearGroup, disposeObject, makeLine, positionForRecord } from './ThreeMissionLayerUtils.js';

export const THREE_TERRAIN_VALIDATION_LAYER_VERSION = 'three-terrain-validation-layer-r1-2c-2';

export function updateThreeTerrainValidationLayer(group, viewModel = {}) {
  if (!group) return group;
  const transform = viewModel.coordinateSystem;
  const report = viewModel.terrainValidation ?? null;
  const issues = [...(report?.hardErrors ?? []), ...(report?.warnings ?? []), ...(report?.advisories ?? [])].filter((issue) => issue.position);
  const invalidSegments = (report?.segmentReports ?? []).filter((segment) => segment.status !== 'VALID');
  const existing = group.userData.objects instanceof Map ? group.userData.objects : new Map();
  const counters = ensureCounters(group);
  const validationLayerDigest = digestTerrainValidationLayer({ issues, invalidSegments });
  const selectedDigest = digestTerrainValidationSelection(viewModel);
  const digestChanged = group.userData.validationLayerDigest !== validationLayerDigest;
  const selectionChanged = group.userData.selectedDigest !== selectedDigest;
  const seen = new Set();

  for (const [index, issue] of issues.entries()) {
    const id = stableIssueId(issue, index);
    seen.add(id);
    let marker = existing.get(id);
    if (!marker) {
      marker = createIssueMarker(issue);
      marker.name = id;
      group.add(marker);
      existing.set(id, marker);
      counters.validationLayerObjectCreateCount += 1;
    } else {
      counters.validationLayerObjectReuseCount += 1;
    }
    marker.position.copy(positionForRecord(transform, issue.position, yOffsetForIssue(issue)));
    marker.material.color.setHex(colorForSeverity(issue.severity));
    marker.material.opacity = issue.severity === 'ADVISORY' ? 0.72 : 0.92;
    marker.scale.setScalar(selectedScale(issue, viewModel));
    marker.userData = issueUserData(id, issue, viewModel);
  }

  for (const segment of invalidSegments) {
    const id = `terrain-validation-segment-${segment.segmentId}`;
    seen.add(id);
    const points = [segment.from, segment.to].filter(Boolean).map((point) => positionForRecord(transform, point, 0.22));
    if (points.length < 2) continue;
    const pointsDigest = digestPoints(points);
    let line = existing.get(id);
    if (!line) {
      line = makeLine(points, { color: segment.status === 'INVALID' ? 0xff4d6d : 0xffd166, opacity: 0.92 });
      line.name = id;
      group.add(line);
      existing.set(id, line);
      counters.validationLayerObjectCreateCount += 1;
    } else if (line.userData?.pointsDigest !== pointsDigest) {
      line.geometry.dispose?.();
      line.geometry = new THREE.BufferGeometry().setFromPoints(points);
      counters.validationLayerIncrementalUpdateCount += 1;
    } else {
      counters.validationLayerObjectReuseCount += 1;
    }
    const selected = viewModel.selectedRouteSegmentId === segment.segmentId;
    line.material.color.setHex(segment.status === 'INVALID' ? 0xff4d6d : 0xffd166);
    line.material.opacity = selected ? 1 : 0.88;
    line.userData = {
      id,
      missionObjectType: 'terrainValidationCorridor',
      missionObjectId: id,
      segmentId: segment.segmentId,
      status: segment.status,
      pointsDigest,
      selected,
      sourceVisibility: 'publicPlanning',
      rendererOwnsValidation: false
    };
  }

  for (const [id, object] of existing.entries()) {
    if (!seen.has(id)) {
      group.remove(object);
      disposeObject(object);
      existing.delete(id);
      counters.validationLayerObjectDisposeCount += 1;
    }
  }

  if (digestChanged) counters.validationLayerIncrementalUpdateCount += 1;
  if (!digestChanged && selectionChanged) counters.validationLayerObjectReuseCount += seen.size;
  group.userData.objects = existing;
  group.userData.validationLayerDigest = validationLayerDigest;
  group.userData.selectedDigest = selectedDigest;
  group.userData.lastSummary = threeTerrainValidationLayerSummary(group, viewModel);
  return group;
}

export function clearThreeTerrainValidationLayer(group) {
  clearGroup(group);
  if (group?.userData) {
    group.userData.objects = new Map();
    group.userData.validationLayerDigest = null;
    group.userData.selectedDigest = null;
    group.userData.counters = createCounters();
  }
}

export function threeTerrainValidationLayerSummary(group = {}, viewModel = {}) {
  const report = viewModel.terrainValidation ?? {};
  const objects = group.userData?.objects instanceof Map ? [...group.userData.objects.values()] : group.children ?? [];
  const issueObjects = objects.filter((object) => object.userData?.missionObjectType === 'terrainValidationIssue');
  const corridorObjects = objects.filter((object) => object.userData?.missionObjectType === 'terrainValidationCorridor');
  const counters = group.userData?.counters ?? createCounters();
  return {
    type: 'anchor.renderer.three-terrain-validation-layer-summary',
    version: THREE_TERRAIN_VALIDATION_LAYER_VERSION,
    status: report.status ?? null,
    executable: report.executable === true,
    issueObjectCount: issueObjects.length,
    corridorObjectCount: corridorObjects.length,
    selectedIssueEmphasisAvailable: issueObjects.some((object) => object.userData?.selected === true) || corridorObjects.some((object) => object.userData?.selected === true),
    clearanceMarkerAvailable: issueObjects.some((object) => /CLEARANCE|BATHYMETRY/.test(object.userData?.issueCode ?? '')),
    placementPreviewAvailable: Boolean(viewModel.interactionViewModel?.placementValid !== null && viewModel.interactionViewModel?.placementValid !== undefined),
    validationLayerFullRebuildCount: counters.validationLayerFullRebuildCount,
    validationLayerIncrementalUpdateCount: counters.validationLayerIncrementalUpdateCount,
    validationLayerObjectReuseCount: counters.validationLayerObjectReuseCount,
    validationLayerObjectCreateCount: counters.validationLayerObjectCreateCount,
    validationLayerObjectDisposeCount: counters.validationLayerObjectDisposeCount,
    validationLayerDigest: group.userData?.validationLayerDigest ?? null,
    ownsValidation: false,
    ownsPlanning: false,
    ownsSimulation: false,
    ownsScoring: false,
    usesMeshRaycastForValidity: false
  };
}

function createCounters() {
  return {
    validationLayerFullRebuildCount: 0,
    validationLayerIncrementalUpdateCount: 0,
    validationLayerObjectReuseCount: 0,
    validationLayerObjectCreateCount: 0,
    validationLayerObjectDisposeCount: 0
  };
}

function ensureCounters(group) {
  group.userData ??= {};
  group.userData.counters ??= createCounters();
  group.userData.objects ??= new Map();
  return group.userData.counters;
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
  const selected = issueSelected(issue, viewModel);
  return { id, missionObjectType: 'terrainValidationIssue', missionObjectId: id, issueCode: issue.code, issueSeverity: issue.severity, message: issue.message, agentId: issue.agentId ?? null, segmentId: issue.segmentId ?? null, waypointId: issue.waypointId ?? null, targetId: issue.targetId ?? null, focusHint: issue.focusHint ?? null, selected, sourceVisibility: 'publicPlanning', rendererOwnsValidation: false, rendererOwnsPlanning: false, rendererOwnsSimulation: false, rendererOwnsScoring: false };
}

function issueSelected(issue, viewModel = {}) {
  return viewModel.selectedTerrainIssueCode === issue.code || viewModel.selectedRouteSegmentId === issue.segmentId || viewModel.selectedScienceTargetId === issue.targetId;
}

function selectedScale(issue, viewModel = {}) {
  return issueSelected(issue, viewModel) ? 1.35 : 1;
}

function stableIssueId(issue = {}, index = 0) {
  return `terrain-validation-issue-${issue.code}-${issue.agentId ?? issue.segmentId ?? issue.targetId ?? issue.waypointId ?? index}-${index}`;
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

function digestTerrainValidationLayer({ issues = [], invalidSegments = [] } = {}) {
  return stableDigest({
    issues: issues.map((issue, index) => ({ id: stableIssueId(issue, index), code: issue.code, severity: issue.severity, position: compactPosition(issue.position), segmentId: issue.segmentId ?? null, targetId: issue.targetId ?? null })),
    segments: invalidSegments.map((segment) => ({ id: segment.segmentId, status: segment.status, from: compactPosition(segment.from), to: compactPosition(segment.to) }))
  });
}

function digestTerrainValidationSelection(viewModel = {}) {
  return stableDigest({ issue: viewModel.selectedTerrainIssueCode ?? null, segment: viewModel.selectedRouteSegmentId ?? null, target: viewModel.selectedScienceTargetId ?? null });
}

function digestPoints(points = []) {
  return stableDigest(points.map((point) => ({ x: round(point.x), y: round(point.y), z: round(point.z) })));
}

function compactPosition(point = {}) {
  return { x: round(point.x ?? point.col), y: round(point.y ?? point.row), depthMeters: round(point.depthMeters ?? point.z) };
}

function stableDigest(value) {
  const text = stableStringify(value);
  let hash = 2166136261;
  for (let index = 0; index < text.length; index += 1) {
    hash ^= text.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }
  return `fnv1a32:${(hash >>> 0).toString(16).padStart(8, '0')}`;
}

function stableStringify(value) {
  if (Array.isArray(value)) return `[${value.map(stableStringify).join(',')}]`;
  if (value && typeof value === 'object') return `{${Object.keys(value).sort().map((key) => `${JSON.stringify(key)}:${stableStringify(value[key])}`).join(',')}}`;
  return JSON.stringify(value);
}

function round(value, digits = 6) {
  const number = Number(value);
  return Number.isFinite(number) ? Number(number.toFixed(digits)) : null;
}