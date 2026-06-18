import * as THREE from 'three';
import { worldToGridCell } from '../../core/rendering/MissionWorldCoordinates.js';
import { pointerClientToCanvasLocal, canvasLocalToNdc } from '../../core/rendering/MissionWorldPointerCoordinates.js';

export const THREE_MISSION_HIT_TEST_VERSION = 'three-mission-hit-test-three-r1-1';

export const THREE_MISSION_HIT_PRIORITY = Object.freeze([
  'waypoint',
  'planningMarker',
  'glider',
  'priorityTarget',
  'dropZone',
  'gridCell',
  'terrain',
  'none'
]);

export const THREE_MISSION_SIMULATION_HIT_PRIORITY = Object.freeze([
  'glider',
  'observation',
  'surfacingEvent',
  'routeFailure',
  'realizedTrajectory',
  'routeSegment',
  'gridCell',
  'terrain',
  'none'
]);

export function createThreeMissionHitTestContext(options = {}) {
  const renderer = options.renderer ?? {};
  return {
    type: 'anchor.renderer.three-mission-hit-test-context',
    version: THREE_MISSION_HIT_TEST_VERSION,
    renderer,
    scene: options.scene ?? renderer.scene ?? null,
    camera: options.camera ?? renderer.camera ?? null,
    domElement: options.domElement ?? renderer.renderer?.domElement ?? null,
    viewModel: options.viewModel ?? renderer.viewModel ?? null,
    raycaster: options.raycaster ?? new THREE.Raycaster(),
    interactionSurface: options.interactionSurface ?? renderer.interactionSurface ?? null,
    priority: hitPriorityForPhase(options.viewModel ?? renderer.viewModel ?? null)
  };
}

export function hitTestThreeMissionWorld(context, pointer, options = {}) {
  if (!context?.camera || !context?.domElement) return noneHit('missingContext');
  const raycaster = context.raycaster ?? new THREE.Raycaster();
  const pointerDiagnostics = configureRaycaster(raycaster, context, pointer);
  const entityHit = hitTestMissionEntities(context, raycaster, options);
  const gridHit = hitTestMissionGrid(context, raycaster, options);
  const hit = entityHit.category !== 'none'
    ? { ...entityHit, gridCell: entityHit.gridCell ?? gridHit.gridCell ?? null, gridHit }
    : gridHit.category !== 'none' ? gridHit : noneHit('noHit');
  return { ...hit, pointerDiagnostics, summary: threeMissionHitTestSummary(hit) };
}

export function hitTestMissionGrid(context, raycaster, options = {}) {
  const viewModel = context.viewModel ?? {};
  const transform = viewModel.coordinateSystem;
  if (!transform) return noneHit('missingCoordinateTransform');
  const surface = context.interactionSurface;
  let point = null;
  if (surface) {
    const hits = raycaster.intersectObject(surface, false);
    if (hits.length) point = hits[0].point;
  }
  if (!point) {
    const plane = new THREE.Plane(new THREE.Vector3(0, 1, 0), -Number(options.y ?? 0.12));
    point = new THREE.Vector3();
    if (!raycaster.ray.intersectPlane(plane, point)) return noneHit('noGridIntersection');
  }
  const cell = worldToGridCell(transform, point.x, point.y, point.z);
  if (!cell.inside) return noneHit('outsideGrid', { worldPoint: pointToPlain(point), gridCell: cell });
  const blocked = Boolean(viewModel.terrain?.values?.[cell.y]?.[cell.x] || viewModel.constraints?.some?.((record) => Math.round(record.x) === cell.x && Math.round(record.y) === cell.y));
  const hazard = Boolean(viewModel.hazards?.some?.((record) => Math.round(record.x) === cell.x && Math.round(record.y) === cell.y));
  return {
    type: 'anchor.renderer.three-mission-hit',
    version: THREE_MISSION_HIT_TEST_VERSION,
    category: blocked ? 'terrain' : 'gridCell',
    objectType: blocked ? 'terrain' : 'gridCell',
    objectId: `${cell.x}-${cell.y}`,
    gridCell: { x: cell.x, y: cell.y, col: cell.x, row: cell.y, blocked, hazard, reason: blocked ? 'blockedTerrain' : hazard ? 'hazard' : null },
    worldPoint: pointToPlain(point),
    distance: 0,
    blocked,
    hazard,
    source: surface ? 'interactionSurface' : 'horizontalPlane'
  };
}

export function hitTestMissionEntities(context, raycaster, options = {}) {
  const tests = interactionTestsForPhase(context.viewModel?.phase ?? context.viewModel?.type);
  for (const [category, group] of tests) {
    const hit = hitTestGroup(category, groupFromCategory(context, group), raycaster, context, options);
    if (hit.category !== 'none') return hit;
  }
  return noneHit('noEntityHit');
}

export function hitTestMissionWaypoint(context, raycaster, options = {}) {
  return hitTestGroup('waypoint', context.renderer?.groups?.waypointGroup, raycaster, context, options);
}

export function hitTestMissionGlider(context, raycaster, options = {}) {
  return hitTestGroup('glider', context.renderer?.groups?.gliderGroup, raycaster, context, options);
}

export function hitTestMissionPriorityTarget(context, raycaster, options = {}) {
  return hitTestGroup('priorityTarget', context.renderer?.groups?.priorityTargetGroup, raycaster, context, options);
}

export function threeMissionHitTestSummary(hit = {}) {
  return {
    type: 'anchor.renderer.three-mission-hit-summary',
    version: THREE_MISSION_HIT_TEST_VERSION,
    category: hit.category ?? 'none',
    objectType: hit.objectType ?? null,
    objectId: hit.objectId ?? null,
    agentId: hit.agentId ?? null,
    waypointId: hit.waypointId ?? null,
    markerId: hit.markerId ?? null,
    targetId: hit.targetId ?? null,
    observationId: hit.observationId ?? null,
    surfacingEventId: hit.surfacingEventId ?? null,
    routeSegmentId: hit.routeSegmentId ?? null,
    routeFailureId: hit.routeFailureId ?? null,
    gridCell: hit.gridCell ? { ...hit.gridCell } : null,
    blocked: hit.blocked === true,
    hazard: hit.hazard === true,
    priority: [...THREE_MISSION_HIT_PRIORITY],
    usesSharedMissionCoordinates: true
  };
}

function hitTestGroup(category, group, raycaster, context, options = {}) {
  if (!group) return noneHit('missingGroup');
  const hits = raycaster.intersectObjects(group.children ?? [], true);
  if (!hits.length) return noneHit(`no${category}Hit`);
  const first = hits.find((hit) => missionUserData(hit.object, category)) ?? hits[0];
  const data = missionUserData(first.object, category) ?? {};
  const worldPoint = first.point ?? first.object?.getWorldPosition?.(new THREE.Vector3()) ?? null;
  const gridCell = data.gridCell ?? pointToGridCell(context, worldPoint);
  const objectType = data.missionObjectType ?? category;
  return {
    type: 'anchor.renderer.three-mission-hit',
    version: THREE_MISSION_HIT_TEST_VERSION,
    category: normalizeHitCategory(objectType, category),
    objectType,
    objectId: data.missionObjectId ?? data.id ?? data.waypointId ?? data.markerId ?? data.targetId ?? data.observationId ?? data.surfacingEventId ?? data.routeSegmentId ?? data.routeFailureId ?? data.agentId ?? first.object?.name ?? null,
    agentId: data.agentId ?? null,
    waypointId: data.waypointId ?? null,
    markerId: data.markerId ?? null,
    targetId: data.targetId ?? null,
    observationId: data.observationId ?? null,
    surfacingEventId: data.surfacingEventId ?? null,
    routeSegmentId: data.routeSegmentId ?? null,
    routeFailureId: data.routeFailureId ?? null,
    zoneId: data.zoneId ?? null,
    gridCell,
    worldPoint: worldPoint ? pointToPlain(worldPoint) : null,
    distance: Number(first.distance ?? 0),
    blocked: data.blocked === true,
    hazard: data.hazard === true,
    object: first.object
  };
}

function configureRaycaster(raycaster, context, pointer) {
  const rect = context.domElement.getBoundingClientRect();
  const clientX = Number(pointer?.clientX ?? pointer?.x ?? rect.left);
  const clientY = Number(pointer?.clientY ?? pointer?.y ?? rect.top);
  const local = pointerClientToCanvasLocal({ clientX, clientY }, rect);
  const ndcPlain = canvasLocalToNdc(local, rect);
  const ndc = new THREE.Vector2(ndcPlain.x, ndcPlain.y);
  raycaster.params.Line ??= {};
  raycaster.params.Line.threshold = Number(context.viewModel?.coordinateSystem?.cellSize ?? 1) * 0.24;
  raycaster.setFromCamera(ndc, context.camera);
  const diagnostics = {
    canvasCssRect: rectToPlain(rect),
    pointerClient: { x: round(clientX), y: round(clientY) },
    pointerLocal: { x: round(local.x), y: round(local.y), inside: local.inside === true },
    pointerNdc: { x: round(ndc.x), y: round(ndc.y) },
    rayOrigin: pointToPlain(raycaster.ray.origin),
    rayDirection: pointToPlain(raycaster.ray.direction)
  };
  context.lastPointerDiagnostics = diagnostics;
  return diagnostics;
}

function missionUserData(object, expectedType = null) {
  let current = object;
  while (current) {
    const data = current.userData ?? {};
    if (data.missionObjectType || data.waypointId || data.markerId || data.targetId || data.observationId || data.surfacingEventId || data.routeSegmentId || data.routeFailureId || data.agentId || data.zoneId) {
      if (!expectedType || matchesExpected(data, expectedType)) return data;
    }
    current = current.parent;
  }
  return null;
}

function matchesExpected(data, expectedType) {
  if (expectedType === 'waypoint') return Boolean(data.waypointId || data.missionObjectType === 'waypoint');
  if (expectedType === 'planningMarker') return Boolean(data.markerId || data.missionObjectType === 'planningMarker');
  if (expectedType === 'glider') return Boolean(data.agentId || data.missionObjectType === 'glider');
  if (expectedType === 'priorityTarget') return Boolean(data.targetId || data.missionObjectType === 'priorityTarget');
  if (expectedType === 'dropZone') return Boolean(data.zoneId || data.missionObjectType === 'dropZone' || data.missionObjectType === 'selectedStart');
  if (expectedType === 'observation') return Boolean(data.observationId || data.missionObjectType === 'observation');
  if (expectedType === 'surfacingEvent') return Boolean(data.surfacingEventId || data.missionObjectType === 'surfacingEvent');
  if (expectedType === 'routeFailure') return Boolean(data.routeFailureId || data.missionObjectType === 'routeFailure' || data.missionObjectType === 'routeStatus');
  if (expectedType === 'realizedTrajectory') return Boolean(data.routeSegmentId || data.missionObjectType === 'realizedTrajectory');
  if (expectedType === 'routeSegment') return Boolean(data.routeSegmentId || data.missionObjectType === 'routeSegment');
  return true;
}

function interactionTestsForPhase(phase) {
  if (phase === 'simulation' || phase === 'anchor.rendering.simulation-world') {
    return [
      ['glider', 'gliderGroup'],
      ['observation', 'observationGroup'],
      ['surfacingEvent', 'surfacingEventGroup'],
      ['routeFailure', 'routeStatusGroup'],
      ['realizedTrajectory', 'realizedTrajectoryGroup'],
      ['routeSegment', 'routeGroup']
    ];
  }
  return [
    ['waypoint', 'waypointGroup'],
    ['planningMarker', 'markerGroup'],
    ['glider', 'gliderGroup'],
    ['priorityTarget', 'priorityTargetGroup'],
    ['dropZone', 'dropZoneGroup']
  ];
}

function groupFromCategory(context, groupKey) {
  return context.renderer?.groups?.[groupKey] ?? null;
}

function normalizeHitCategory(objectType, fallback) {
  if (objectType === 'planningMarker') return 'planningMarker';
  if (objectType === 'routeStatus') return 'routeFailure';
  return objectType ?? fallback;
}

function hitPriorityForPhase(viewModel) {
  return viewModel?.phase === 'simulation' || viewModel?.type === 'anchor.rendering.simulation-world'
    ? [...THREE_MISSION_SIMULATION_HIT_PRIORITY]
    : [...THREE_MISSION_HIT_PRIORITY];
}

function pointToGridCell(context, point) {
  if (!point || !context.viewModel?.coordinateSystem) return null;
  const cell = worldToGridCell(context.viewModel.coordinateSystem, point.x, point.y, point.z);
  if (!cell.inside) return null;
  return { x: cell.x, y: cell.y, col: cell.x, row: cell.y };
}

function rectToPlain(rect) {
  return { left: round(rect.left), top: round(rect.top), width: round(rect.width), height: round(rect.height), right: round(rect.right), bottom: round(rect.bottom) };
}

function pointToPlain(point) {
  if (!point) return null;
  return { x: round(point.x), y: round(point.y), z: round(point.z) };
}

function noneHit(reason, patch = {}) {
  return {
    type: 'anchor.renderer.three-mission-hit',
    version: THREE_MISSION_HIT_TEST_VERSION,
    category: 'none',
    objectType: 'none',
    objectId: null,
    gridCell: null,
    worldPoint: null,
    distance: Infinity,
    blocked: false,
    hazard: false,
    reason,
    ...patch
  };
}

function round(value, digits = 6) {
  return Number(Number(value).toFixed(digits));
}
