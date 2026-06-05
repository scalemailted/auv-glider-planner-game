import { getPlanningFrame } from '../../core/sim/ChallengeMode.js';
import { getFrameAtTime } from '../../core/time/MissionTime.js';
import { buildPlanningGuidance } from '../../core/planning/PlanningGuidance.js';
import { shouldRenderOverlay, shouldRenderPlanningGuidance } from '../../core/planning/PlanningOverlayState.js';
import { computePlannedCoverage, computeTravelCostField, getCellRoiDisplayValue, normalizeRoiMode } from '../../core/roi/RoiMode.js';
import { getMobileHazardsAtTime } from '../../core/sim/MobileHazards.js';
import { getDeploymentZonesForAgent, getSelectedStart, requiresDeploymentSelection } from '../../core/deployment/DeploymentZones.js';
import { buildRouteSegmentsForAgent } from '../../core/planning/RouteSegmentBuilder.js';
import { getActivePriorityTargets, normalizePriorityTargetRules } from '../../core/sim/PriorityTargets.js';
import { computeHeadingAngle, computeHeadingFromVelocity, isUsableHeading } from '../../core/math/Heading.js';
import { sampleCurrentField } from '../../core/currents/CurrentFieldSampler.js';

export const PHASER_WIDTH = 1280;
export const PHASER_HEIGHT = 820;
const DEBUG_OVAL_RENDERING = false;
const MIN_CAMERA_ZOOM = 0.55;
const MAX_CAMERA_ZOOM = 6;
const MAP_VERTICAL_BIAS = 0.46;

function debugRouteRendering({ layerName, agentId = null, routeType = 'route', pointCount = 0, color = null, isDiagnostic = false, isVisibleByDefault = true } = {}) {
  if (!globalThis?.ANCHOR_DEBUG_ROUTE_RENDERING) return;
  console.debug('[RouteRendering]', {
    layerName,
    agentId,
    routeType,
    pointCount,
    color,
    isDiagnostic,
    isVisibleByDefault
  });
}

export function getMapLayout(level, width = PHASER_WIDTH, height = PHASER_HEIGHT, bounds = null, mapCamera = null) {
  const grid = level?.world?.grid ?? { width: 10, height: 10 };
  const area = bounds ?? { x: 54, y: 54, width: width - 108, height: height - 108 };
  const gridWidth = Math.max(1, Number(grid.width) || 10);
  const gridHeight = Math.max(1, Number(grid.height) || 10);
  const availableWidth = Math.max(1, Number(area.width ?? width));
  const availableHeight = Math.max(1, Number(area.height ?? height));
  const baseCell = Math.max(1, Math.min(availableWidth / gridWidth, availableHeight / gridHeight));
  const zoom = clampZoom(mapCamera?.zoom ?? 1);
  const cell = Math.max(1, baseCell * zoom);
  const mapWidth = cell * gridWidth;
  const mapHeight = cell * gridHeight;
  const pan = constrainMapPan({
    panX: Number(mapCamera?.panX ?? 0),
    panY: Number(mapCamera?.panY ?? 0),
    area,
    mapWidth,
    mapHeight
  });
  const baseOx = area.x + availableWidth / 2 - mapWidth / 2;
  const baseOy = area.y + Math.max(0, availableHeight - mapHeight) * MAP_VERTICAL_BIAS;
  const ox = baseOx + pan.panX;
  const oy = baseOy + pan.panY;
  return {
    ox,
    oy,
    cell,
    baseCell,
    zoom,
    panX: pan.panX,
    panY: pan.panY,
    width: gridWidth,
    height: gridHeight,
    mapX: ox,
    mapY: oy,
    cellSize: cell,
    mapWidth,
    mapHeight,
    gridWidth,
    gridHeight,
    bounds: area,
    baseOx,
    baseOy
  };
}

export function clampZoom(zoom) {
  const numeric = Number(zoom);
  if (!Number.isFinite(numeric)) return 1;
  return Math.max(MIN_CAMERA_ZOOM, Math.min(MAX_CAMERA_ZOOM, numeric));
}

export function constrainMapPan({ panX = 0, panY = 0, area, mapWidth, mapHeight } = {}) {
  const bounds = area ?? { width: PHASER_WIDTH, height: PHASER_HEIGHT };
  return {
    panX: clampPanAxis(Number(panX) || 0, Number(mapWidth) || 0, Number(bounds.width) || PHASER_WIDTH),
    panY: clampPanAxis(Number(panY) || 0, Number(mapHeight) || 0, Number(bounds.height) || PHASER_HEIGHT)
  };
}

function clampPanAxis(value, mapSize, areaSize) {
  if (mapSize <= areaSize) return 0;
  const margin = Math.max(48, areaSize * 0.18);
  const limit = Math.max(0, (mapSize - areaSize) / 2 + margin);
  return Math.max(-limit, Math.min(limit, value));
}

export function cellToWorld(layout, x, y) {
  return {
    x: layout.ox + (x + 0.5) * layout.cell,
    y: layout.oy + (y + 0.5) * layout.cell
  };
}

export function pointerToCanvasPoint(pointer, canvas = null) {
  const event = pointer?.event ?? pointer;
  const clientX = Number(event?.clientX);
  const clientY = Number(event?.clientY);
  const rect = canvas?.getBoundingClientRect?.();
  if (rect && Number.isFinite(clientX) && Number.isFinite(clientY) && rect.width > 0 && rect.height > 0) {
    const width = Number(canvas.width ?? rect.width);
    const height = Number(canvas.height ?? rect.height);
    return {
      x: (clientX - rect.left) * (width / rect.width),
      y: (clientY - rect.top) * (height / rect.height),
      source: 'client'
    };
  }
  return {
    x: Number(pointer?.x ?? 0),
    y: Number(pointer?.y ?? 0),
    source: 'pointer'
  };
}

export function pointerToCell(pointer, layout, { canvas = null } = {}) {
  if (!layout) return null;
  const point = pointerToCanvasPoint(pointer, canvas);
  const x = Math.floor((point.x - layout.ox) / layout.cell);
  const y = Math.floor((point.y - layout.oy) / layout.cell);
  if (x < 0 || y < 0 || x >= layout.width || y >= layout.height) return null;
  return { x, y };
}

export function getVisibleFrame(level, time, { engine = null, challengeMode = 'perfectKnowledge', revealTruth = false, forecastMemberId = null } = {}) {
  if (engine) {
    const frames = level?.layers?.truth?.frames ?? [];
    const dt = level?.world?.time?.dt ?? 1;
    const frame = getFrameAtTime(frames, time, dt);
    return frame ? { ...frame, source: 'truth' } : null;
  }
  return getPlanningFrame(level, time, { challengeMode, revealTruth, forecastMemberId });
}

export function drawMissionMap(graphics, {
  level,
  mission = null,
  plan = null,
  selectedAgentId = null,
  selectedWaypoint = null,
  selectedMarker = null,
  selectedWindow = null,
  surfacedAgents = [],
  guidanceSettings = null,
  hoverCell = null,
  time = 0,
  challengeMode = 'perfectKnowledge',
  revealTruth = false,
  forecastMemberId = null,
  roiViewMode = 'expectedValue',
  showEnsembleDisagreement = false,
  engine = null,
  mapBounds = null,
  mapCamera = null,
  bestPathOverlay = null
}) {
  const sceneSize = getSceneSize(graphics);
  if (!level) return getMapLayout(level, sceneSize.width, sceneSize.height);
  const layers = {
    showWater: guidanceSettings?.showWater !== false,
    showROI: guidanceSettings?.showROI !== false,
    showCurrents: guidanceSettings?.showCurrents !== false,
    showHazards: guidanceSettings?.showHazards !== false,
    showTerrain: guidanceSettings?.showTerrain !== false,
    showPlannedPath: guidanceSettings?.showPlannedPath !== false,
    showActualPath: guidanceSettings?.showActualPath !== false,
    showEnergy: guidanceSettings?.showEnergy !== false
  };
  const layout = getMapLayout(level, sceneSize.width, sceneSize.height, mapBounds, mapCamera);
  const frame = getVisibleFrame(level, time, { engine, challengeMode, revealTruth, forecastMemberId });
  drawCells(graphics, level, frame, layout, normalizeRoiMode(roiViewMode), layers, engine, {
    mission,
    plan,
    time,
    frame,
    selectedAgentId,
    selectedWaypoint,
    planningAnchor: guidanceSettings?.planningAnchor
  });
  if (showEnsembleDisagreement && frame?.uncertainty) drawUncertainty(graphics, frame, layout);
  if (layers.showCurrents) drawCurrents(graphics, frame, layout);
  const renderPlanningGuidance = shouldRenderOverlay('reachability', {}, null, {
    mode: guidanceSettings?.mode ?? (engine ? 'simulation' : 'planning'),
    engine,
    selectedAgentId,
    planningAnchor: guidanceSettings?.planningAnchor,
    guidanceSettings,
    surfaceDecision: guidanceSettings?.surfaceDecision
  });
  if (guidanceSettings) {
    guidanceSettings.overlayDebug = {
      mode: guidanceSettings?.mode ?? (engine ? 'simulation' : 'planning'),
      simulationRunning: Boolean(engine),
      selectedAgentId,
      anchorValid: shouldRenderPlanningGuidance({
        mode: guidanceSettings?.mode ?? (engine ? 'simulation' : 'planning'),
        engine,
        selectedAgentId,
        planningAnchor: guidanceSettings?.planningAnchor,
        guidanceSettings,
        surfaceDecision: guidanceSettings?.surfaceDecision
      }),
      shouldRenderPlanningGuidance: renderPlanningGuidance
    };
  }
  if (renderPlanningGuidance) {
    drawGuidance(graphics, buildPlanningGuidance({
      level,
      mission,
      plan,
      selectedAgentId,
      selectedWaypoint,
      selectedWindow,
          time,
          challengeMode,
          revealTruth,
          forecastMemberId,
          surfacedAgents,
          planningAnchor: guidanceSettings?.planningAnchor,
          hoverCell,
          settings: guidanceSettings
    }), layout, layers);
  }
  drawDeploymentZones(graphics, level, mission, selectedAgentId, layout, hoverCell, {
    mode: guidanceSettings?.mode ?? (engine ? 'simulation' : 'preview')
  });
  const renderMode = guidanceSettings?.mode ?? (engine ? 'simulation' : 'preview');
  drawBases(graphics, level, layout, { mission, plan, selectedAgentId, mode: renderMode });
  drawPriorityTargets(graphics, level, mission, time, layout, engine?.missionState ?? null);
  if (layers.showHazards) drawMobileHazards(graphics, level, time, layout);
  if (guidanceSettings?.showBestPathOverlay && bestPathOverlay?.attempt) {
    drawBestPathOverlay(graphics, {
      level,
      mission,
      bestPathOverlay,
      selectedAgentId,
      layout
    });
  }
  if (layers.showPlannedPath) drawPlan(graphics, {
    level,
    mission,
    plan,
    selectedAgentId,
    selectedWaypoint,
    selectedWindow,
    surfacedAgents,
    planningAnchor: guidanceSettings?.planningAnchor,
    layout
  });
  if (guidanceSettings?.showPlanningMarkers !== false) {
    drawPlanningMarkers(graphics, plan, selectedAgentId, selectedWindow, selectedMarker, layout, renderMode);
  }
  if (renderMode !== 'simulation') {
    drawAgentStarts(graphics, mission, selectedAgentId, surfacedAgents, layout, {
      level,
      plan,
      hoverCell,
      planningAnchor: guidanceSettings?.planningAnchor
    });
  }
  if (engine) drawEngine(graphics, engine, layout, layers);
  return layout;
}

function drawBestPathOverlay(g, { level, mission, bestPathOverlay, selectedAgentId, layout }) {
  const attempt = bestPathOverlay.attempt;
  const plan = attempt.plan ?? attempt.result?.plan;
  const result = attempt.result ?? {};
  const events = result.events ?? result.routeExecution?.events ?? [];
  const frames = result.frames ?? result.routeExecution?.frames ?? [];
  for (const agentPlan of plan?.agentPlans ?? []) {
    const selected = !selectedAgentId || selectedAgentId === agentPlan.agentId;
    const agent = mission?.agents?.find((candidate) => candidate.id === agentPlan.agentId);
    const route = buildRouteSegmentsForAgent({ level, mission, agent, agentPlan });
    const plannedAlpha = selected ? 0.56 : 0.22;
    for (const segment of route.segments ?? []) {
      drawGhostSegment(g, segment, layout, {
        color: 0xb9a7ff,
        alpha: plannedAlpha,
        agentId: agentPlan.agentId,
        routeType: 'bestPathPlanned'
      });
    }
    for (const [index, waypoint] of (agentPlan.waypoints ?? []).entries()) {
      if (!isFinitePoint(waypoint)) continue;
      const p = cellToWorld(layout, waypoint.x, waypoint.y);
      g.fillStyle(0x17102a, selected ? 0.58 : 0.32);
      g.fillCircle(p.x, p.y, layout.cell * 0.15);
      g.lineStyle(2, 0xd7c9ff, plannedAlpha + 0.18);
      g.strokeCircle(p.x, p.y, layout.cell * 0.23);
    }
  }
  drawBestActualPaths(g, frames, layout, selectedAgentId);
  drawBestPathEvents(g, events, layout);
}

function drawGhostSegment(g, segment, layout, { color, alpha, agentId = null, routeType = 'plannedGhost' }) {
  const points = getVisibleSegmentPoints(segment).filter(isFinitePoint);
  if (points.length < 2) return;
  debugRouteRendering({
    layerName: 'best-path-planned-route',
    agentId,
    routeType,
    pointCount: points.length,
    color,
    isDiagnostic: false,
    isVisibleByDefault: false
  });
  debugHiddenDiagnosticRouteCells(segment, { layerName: 'best-path-route-diagnostic-cells', agentId, routeType });
  const screenPoints = points.map((point) => cellToWorld(layout, point.x, point.y));
  g.lineStyle(5, 0x050a13, 0.26 * alpha);
  strokeDashedPolyline(g, screenPoints, layout.cell * 0.34, layout.cell * 0.2);
  g.lineStyle(3, color, alpha);
  strokeDashedPolyline(g, screenPoints, layout.cell * 0.34, layout.cell * 0.2);
}

function drawBestActualPaths(g, frames = [], layout, selectedAgentId = null) {
  const paths = new Map();
  for (const frame of frames ?? []) {
    for (const agent of frame.agents ?? []) {
      if (!isFinitePoint(agent)) continue;
      const path = paths.get(agent.id) ?? [];
      path.push({ x: agent.x, y: agent.y });
      paths.set(agent.id, path);
    }
  }
  for (const [agentId, path] of paths.entries()) {
    if (path.length < 2) continue;
    const selected = !selectedAgentId || selectedAgentId === agentId;
    const points = simplifyPath(path, Math.max(1, Math.floor(path.length / 120))).map((point) => cellToWorld(layout, point.x, point.y));
    g.lineStyle(selected ? 3 : 2, 0x9ee7ff, selected ? 0.5 : 0.22);
    strokePolyline(g, points);
  }
}

function drawBestPathEvents(g, events = [], layout) {
  for (const event of events ?? []) {
    if ((event.type === 'sample' || event.type === 'duplicateSample') && isFinitePoint(event)) {
      const p = cellToWorld(layout, event.x, event.y);
      g.fillStyle(0x63e6be, event.type === 'sample' ? 0.42 : 0.2);
      g.fillCircle(p.x, p.y, layout.cell * 0.11);
      g.lineStyle(1.5, 0xd7fff2, 0.42);
      g.strokeCircle(p.x, p.y, layout.cell * 0.17);
    }
    if (String(event.type ?? '').toLowerCase().includes('priority') && isFinitePoint(event.position ?? event)) {
      const position = event.position ?? event;
      const p = cellToWorld(layout, position.x, position.y);
      g.lineStyle(2, 0xffd166, 0.54);
      g.strokeCircle(p.x, p.y, layout.cell * 0.28);
      g.lineStyle(3, 0x63e6be, 0.72);
      g.lineBetween(p.x - layout.cell * 0.12, p.y, p.x - layout.cell * 0.04, p.y + layout.cell * 0.09);
      g.lineBetween(p.x - layout.cell * 0.04, p.y + layout.cell * 0.09, p.x + layout.cell * 0.15, p.y - layout.cell * 0.14);
    }
  }
}

function strokeDashedPolyline(g, points, dash = 12, gap = 8) {
  for (let index = 1; index < points.length; index += 1) {
    strokeDashedLine(g, points[index - 1], points[index], dash, gap);
  }
}

function strokeDashedLine(g, from, to, dash, gap) {
  const dx = to.x - from.x;
  const dy = to.y - from.y;
  const distance = Math.hypot(dx, dy);
  if (!distance) return;
  const ux = dx / distance;
  const uy = dy / distance;
  for (let cursor = 0; cursor < distance; cursor += dash + gap) {
    const end = Math.min(distance, cursor + dash);
    g.beginPath();
    g.moveTo(from.x + ux * cursor, from.y + uy * cursor);
    g.lineTo(from.x + ux * end, from.y + uy * end);
    g.strokePath();
  }
}

function simplifyPath(points, stride) {
  if (stride <= 1) return points;
  const sampled = [];
  for (let index = 0; index < points.length; index += stride) sampled.push(points[index]);
  const last = points.at(-1);
  if (last && sampled.at(-1) !== last) sampled.push(last);
  return sampled;
}

function getSceneSize(graphics) {
  const scale = graphics?.scene?.scale;
  return {
    width: Math.max(1, Number(scale?.width ?? scale?.gameSize?.width ?? PHASER_WIDTH)),
    height: Math.max(1, Number(scale?.height ?? scale?.gameSize?.height ?? PHASER_HEIGHT))
  };
}

function drawCells(g, level, frame, layout, roiViewMode = 'expectedValue', layers = {}, engine = null, context = {}) {
  const boardW = layout.width * layout.cell;
  const boardH = layout.height * layout.cell;
  if (layers.showWater) {
    g.fillGradientStyle(0x09284b, 0x0b3656, 0x061a35, 0x0a314d, 1);
    g.fillRect(layout.ox, layout.oy, boardW, boardH);
    g.lineStyle(2, 0x8bdcf2, 0.16);
    for (let i = 0; i < 10; i += 1) {
      const y = layout.oy + ((i + 1) / 11) * boardH;
      g.beginPath();
      g.moveTo(layout.ox, y);
      g.lineTo(layout.ox + boardW, y + Math.sin(i * 1.7) * layout.cell * 0.3);
      g.strokePath();
    }
  } else {
    g.fillStyle(0x07111f, 1);
    g.fillRect(layout.ox, layout.oy, boardW, boardH);
  }
  if (layers.showROI) drawDiscreteRoiHeatmap(g, level, frame, layout, roiViewMode, engine, context);
  for (let y = 0; y < layout.height; y += 1) {
    for (let x = 0; x < layout.width; x += 1) {
      const px = layout.ox + x * layout.cell;
      const py = layout.oy + y * layout.cell;
      const terrain = level.layers.terrain?.[y]?.[x] ?? 0;
      const depth = level.layers.depth?.[y]?.[x];
      if (terrain && layers.showTerrain) {
        g.fillGradientStyle(0x5d7647, 0x445d3d, 0x33472f, 0x536844, 0.96);
        g.fillRect(px, py, layout.cell, layout.cell);
        g.fillStyle(0x233524, 0.18);
        g.fillCircle(px + layout.cell * 0.68, py + layout.cell * 0.28, layout.cell * 0.34);
        g.lineStyle(2, 0xcfe8a3, 0.36);
        g.strokeRect(px + 2, py + 2, layout.cell - 4, layout.cell - 4);
      } else if (!terrain) {
        const depthAlpha = depth !== undefined ? 0.08 + Number(depth) * 0.14 : 0.04 + ((x * 17 + y * 29) % 11) * 0.004;
        g.fillStyle(depth !== undefined && depth < 0.32 ? 0x6bd6ce : 0x2f9ac6, depthAlpha + 0.04);
        g.fillRect(px, py, layout.cell, layout.cell);
        g.fillStyle(0xffffff, 0.025);
        g.fillCircle(px + layout.cell * 0.26, py + layout.cell * 0.22, layout.cell * 0.18);
      }
      if (layers.showHazards && (level.layers.hazards?.[y]?.[x] ?? 0)) {
        g.fillStyle(0xff6b2d, 0.38);
        g.fillRect(px + 2, py + 2, layout.cell - 4, layout.cell - 4);
        g.lineStyle(3, 0xff3e3e, 0.95);
        g.strokeCircle(px + layout.cell * 0.5, py + layout.cell * 0.5, layout.cell * 0.24);
        g.lineStyle(2, 0xffd1a8, 0.82);
        g.lineBetween(px + layout.cell * 0.34, py + layout.cell * 0.34, px + layout.cell * 0.66, py + layout.cell * 0.66);
        g.lineBetween(px + layout.cell * 0.66, py + layout.cell * 0.34, px + layout.cell * 0.34, py + layout.cell * 0.66);
      }
      g.lineStyle(1, 0xdcf5ff, 0.055);
      g.strokeRect(px, py, layout.cell, layout.cell);
    }
  }
  g.lineStyle(4, 0x0a1728, 0.8);
  g.strokeRect(layout.ox - 2, layout.oy - 2, boardW + 4, boardH + 4);
}

function drawDiscreteRoiHeatmap(g, level, frame, layout, roiViewMode, engine = null, context = {}) {
  const sampleState = buildSampleVisualState(engine);
  const plannedCoverage = roiViewMode === 'remaining'
    ? computePlannedCoverage(context.plan, context.mission, level)
    : null;
  const travelCostField = roiViewMode === 'travelCost'
    ? computeTravelCostField({
      level,
      mission: context.mission,
      plan: context.plan,
      frame: context.frame,
      selectedAgentId: context.selectedAgentId,
      selectedWaypoint: context.selectedWaypoint,
      planningAnchor: context.planningAnchor,
      t: context.time ?? frame?.t ?? 0
    })
    : null;
  if (roiViewMode === 'travelCost' && DEBUG_TRAVEL_COST_FIELD) {
    debugTravelCostField(travelCostField, context);
  }
  for (let y = 0; y < layout.height; y += 1) {
    for (let x = 0; x < layout.width; x += 1) {
      if (level.layers.terrain?.[y]?.[x]) continue;
      const px = layout.ox + x * layout.cell;
      const py = layout.oy + y * layout.cell;
      const roiDisplay = getCellRoiDisplayValue({
        cell: frame?.roi?.[y]?.[x] ?? 0,
        x,
        y,
        t: context.time ?? frame?.t ?? 0,
        mode: roiViewMode,
        plan: context.plan,
        mission: context.mission,
        level,
        frame: context.frame,
        coverage: plannedCoverage,
        selectedAgentId: context.selectedAgentId,
        selectedWaypoint: context.selectedWaypoint,
        planningAnchor: context.planningAnchor,
        travelCostField
      });
      const roi = roiDisplay.value;
      if (roiViewMode === 'travelCost' && roiDisplay.travel?.available === false) {
        g.fillStyle(0x082a55, 0.12);
        g.fillRect(px + 1, py + 1, layout.cell - 2, layout.cell - 2);
        continue;
      }
      if (roiViewMode === 'travelCost' && roiDisplay.travel?.reachable === false) {
        drawBlockedCostCell(g, px, py, layout.cell);
        continue;
      }
      if (roi <= 0.01 && roiViewMode !== 'travelCost') {
        g.fillStyle(0x082a55, 0.16);
        g.fillRect(px + 1, py + 1, layout.cell - 2, layout.cell - 2);
        if (roiDisplay.depleted) drawPlannedClaimGlyph(g, px, py, layout.cell, roiDisplay);
        continue;
      }
      const state = sampleState.get(`${x},${y}`);
      const alphaScale = roiDisplay.depleted ? 0.42 : state?.depleted ? 0.44 : state?.sampled ? 0.56 : 1;
      const inset = Math.max(1, Math.round(layout.cell * 0.07));
      const alpha = (0.22 + roi * 0.58) * alphaScale;
      g.fillStyle(roiViewMode === 'travelCost' ? travelCostColor(roi) : roiColor(roi), roiViewMode === 'travelCost' ? 0.72 : alpha);
      g.fillRect(px + inset, py + inset, layout.cell - inset * 2, layout.cell - inset * 2);
      g.lineStyle(1, roiViewMode === 'travelCost' ? travelCostColor(roi) : roiColor(Math.min(1, roi + 0.16)), 0.18 + roi * 0.34);
      g.strokeRect(px + inset, py + inset, layout.cell - inset * 2, layout.cell - inset * 2);
      if (roiDisplay.depleted) drawPlannedClaimGlyph(g, px, py, layout.cell, roiDisplay);
      if (state?.sampled || state?.depleted || state?.cooldown || state?.persistent) {
        drawSampleStateGlyph(g, px, py, layout.cell, state);
      }
    }
  }
}

const DEBUG_TRAVEL_COST_FIELD = false;

function debugTravelCostField(field, context = {}) {
  if (!field?.anchor || field.reachableCount <= 0 || field.allIdentical) {
    console.warn('[travel-cost-field]', {
      anchor: field?.anchor ?? null,
      reachable: field?.reachableCount ?? 0,
      blocked: field?.blockedCount ?? 0,
      minCost: field?.minCost ?? null,
      maxCost: field?.maxCost ?? null,
      allIdentical: field?.allIdentical ?? false,
      time: context.time ?? null
    });
  }
}

function drawBlockedCostCell(g, px, py, cell) {
  g.fillStyle(0x1a1f2b, 0.7);
  g.fillRect(px + 1, py + 1, cell - 2, cell - 2);
  g.lineStyle(1, 0xff6b6b, 0.35);
  const pad = cell * 0.12;
  for (let offset = -cell; offset <= cell; offset += cell * 0.28) {
    g.lineBetween(px + pad + offset, py + cell - pad, px + cell - pad + offset, py + pad);
  }
}

function drawPlannedClaimGlyph(g, px, py, cell, roiDisplay = {}) {
  const waypointClaimed = (roiDisplay.claimedBy ?? []).some((claim) => claim.source === 'waypoint');
  const color = waypointClaimed ? 0xffd166 : 0x9ee7ff;
  const alpha = waypointClaimed ? 0.72 : 0.5;
  const inset = Math.max(2, Math.round(cell * 0.16));
  g.lineStyle(waypointClaimed ? 2.5 : 2, color, alpha);
  g.strokeRect(px + inset, py + inset, cell - inset * 2, cell - inset * 2);
  g.lineStyle(2, waypointClaimed ? 0xfff0a3 : 0xdff9ff, alpha);
  g.lineBetween(px + cell * 0.32, py + cell * 0.52, px + cell * 0.44, py + cell * 0.64);
  g.lineBetween(px + cell * 0.44, py + cell * 0.64, px + cell * 0.7, py + cell * 0.34);
}

function buildSampleVisualState(engine) {
  const state = new Map();
  const sampled = engine?.missionState?.sampled ?? new Set();
  for (const key of sampled) {
    state.set(key, { sampled: true });
  }
  for (const event of engine?.events ?? []) {
    if (event.type !== 'sample' && event.type !== 'duplicateSample') continue;
    const key = `${event.x},${event.y}`;
    const existing = state.get(key) ?? {};
    state.set(key, {
      ...existing,
      sampled: true,
      duplicate: existing.duplicate || event.duplicate || event.type === 'duplicateSample',
      depleted: existing.depleted || Boolean(event.depleted),
      cooldown: existing.cooldown || Boolean(event.cooldownActive || event.reason === 'cooldown'),
      persistent: existing.persistent || event.samplingMode === 'persistent'
    });
  }
  return state;
}

function drawSampleStateGlyph(g, px, py, cell, state) {
  const cx = px + cell * 0.5;
  const cy = py + cell * 0.5;
  if (state.depleted || state.cooldown) {
    g.lineStyle(2, state.cooldown ? 0x9ee7ff : 0xffd166, 0.78);
    const pad = cell * 0.18;
    for (let offset = -cell * 0.35; offset <= cell * 0.35; offset += cell * 0.22) {
      g.lineBetween(px + pad + offset, py + cell - pad, px + cell - pad + offset, py + pad);
    }
    return;
  }
  if (state.persistent) {
    g.lineStyle(2, 0x63e6be, 0.82);
    g.strokeCircle(cx, cy, cell * 0.22);
    g.strokeCircle(cx, cy, cell * 0.12);
    return;
  }
  g.fillStyle(0xeef6ff, 0.82);
  g.fillCircle(cx, cy, Math.max(2, cell * 0.075));
}

function roiColor(value) {
  const v = Math.max(0, Math.min(1, Number(value) || 0));
  if (v < 0.4) return mixColor(0x082a55, 0x1fb9d0, v / 0.4);
  if (v < 0.72) return mixColor(0x1fb9d0, 0x91d85a, (v - 0.4) / 0.32);
  return mixColor(0x91d85a, 0xffd166, (v - 0.72) / 0.28);
}

function travelCostColor(value) {
  const v = Math.max(0, Math.min(1, Number(value) || 0));
  if (v < 0.45) return mixColor(0x2dd4bf, 0x91d85a, v / 0.45);
  if (v < 0.75) return mixColor(0x91d85a, 0xffd166, (v - 0.45) / 0.3);
  return mixColor(0xffd166, 0xff4e5a, (v - 0.75) / 0.25);
}

function mixColor(a, b, t) {
  const ar = (a >> 16) & 255; const ag = (a >> 8) & 255; const ab = a & 255;
  const br = (b >> 16) & 255; const bg = (b >> 8) & 255; const bb = b & 255;
  const r = Math.round(ar + (br - ar) * t);
  const g = Math.round(ag + (bg - ag) * t);
  const bl = Math.round(ab + (bb - ab) * t);
  return (r << 16) | (g << 8) | bl;
}

function drawUncertainty(g, frame, layout) {
  for (let y = 0; y < layout.height; y += 1) {
    for (let x = 0; x < layout.width; x += 1) {
      const u = Math.max(0, Math.min(1, Number(frame.uncertainty?.[y]?.[x] ?? 0)));
      if (u <= 0.02) continue;
      g.fillStyle(0xffffff, u * 0.22);
      g.fillRect(layout.ox + x * layout.cell, layout.oy + y * layout.cell, layout.cell, layout.cell);
    }
  }
}

function drawMobileHazards(g, level, time, layout) {
  for (const hazard of getMobileHazardsAtTime(level, time)) {
    const p = cellToWorld(layout, hazard.x, hazard.y);
    g.fillStyle(0xff4e5a, 0.26);
    g.fillCircle(p.x, p.y, layout.cell * Number(hazard.radius ?? 1));
    g.lineStyle(3, 0xff9aa2, 0.85);
    g.strokeCircle(p.x, p.y, layout.cell * Number(hazard.radius ?? 1));
  }
}

function drawPriorityTargets(g, level, mission, time, layout, missionState = null) {
  const rules = normalizePriorityTargetRules(mission);
  if (rules.enabled === false) return;
  const captured = missionState?.capturedPriorityTargets ?? new Set();
  for (const target of getActivePriorityTargets(level, time)) {
    const position = target.position;
    const p = cellToWorld(layout, position.x, position.y);
    drawGoldStar(g, p, layout.cell, {
      captured: captured.has(target.id),
      pulse: 0.5 + 0.5 * Math.sin(Number(time ?? 0) * 5 + String(target.id).length)
    });
  }
}

function drawCurrents(g, frame, layout) {
  const stride = layout.width * layout.height >= 1600 ? 3 : layout.width * layout.height >= 625 ? 2 : 1;
  for (let y = 0; y < layout.height; y += stride) {
    for (let x = 0; x < layout.width; x += stride) {
      const vector = sampleCurrentField({ frame, grid: { width: layout.width, height: layout.height }, x, y });
      const magnitude = Math.min(1.4, vector.magnitude);
      if (magnitude < 0.02) continue;
      const start = cellToWorld(layout, x, y);
      const ex = start.x + vector.u * layout.cell * 0.45;
      const ey = start.y + vector.v * layout.cell * 0.45;
      const color = 0xffffff;
      g.lineStyle(1.4 + magnitude * 2.4, color, 0.42 + magnitude * 0.44);
      g.beginPath();
      g.moveTo(start.x - vector.u * layout.cell * 0.16, start.y - vector.v * layout.cell * 0.16);
      g.lineTo(ex, ey);
      g.strokePath();
      g.fillStyle(color, 0.5 + magnitude * 0.34);
      const angle = Math.atan2(vector.v, vector.u);
      const size = 3 + magnitude * 2.2;
      g.fillTriangle(
        ex + Math.cos(angle) * size,
        ey + Math.sin(angle) * size,
        ex + Math.cos(angle + 2.45) * size,
        ey + Math.sin(angle + 2.45) * size,
        ex + Math.cos(angle - 2.45) * size,
        ey + Math.sin(angle - 2.45) * size
      );
    }
  }
}

function drawGoldStar(g, p, cell, { captured = false, pulse = 0.5 } = {}) {
  const outer = cell * (captured ? 0.24 : 0.28 + pulse * 0.035);
  const inner = outer * 0.44;
  const points = [];
  for (let i = 0; i < 10; i += 1) {
    const radius = i % 2 === 0 ? outer : inner;
    const angle = -Math.PI / 2 + i * Math.PI / 5;
    points.push({ x: p.x + Math.cos(angle) * radius, y: p.y + Math.sin(angle) * radius });
  }
  if (!captured) {
    g.fillStyle(0xffd166, 0.14 + pulse * 0.12);
    g.fillCircle(p.x, p.y, cell * (0.48 + pulse * 0.08));
    g.lineStyle(2, 0xfff0a3, 0.4 + pulse * 0.34);
    g.strokeCircle(p.x, p.y, cell * (0.38 + pulse * 0.05));
  }
  g.fillStyle(captured ? 0x9aa6b8 : 0xffd166, captured ? 0.45 : 0.96);
  g.lineStyle(captured ? 2 : 3, captured ? 0xdcecff : 0xfff0a3, captured ? 0.42 : 0.96);
  g.beginPath();
  points.forEach((point, index) => {
    if (index === 0) g.moveTo(point.x, point.y);
    else g.lineTo(point.x, point.y);
  });
  g.closePath();
  g.fillPath();
  g.strokePath();
  if (captured) {
    g.lineStyle(3, 0x63e6be, 0.86);
    g.lineBetween(p.x - cell * 0.15, p.y, p.x - cell * 0.04, p.y + cell * 0.12);
    g.lineBetween(p.x - cell * 0.04, p.y + cell * 0.12, p.x + cell * 0.18, p.y - cell * 0.16);
  }
}

function drawBases(g, level, layout, { mission = null, plan = null, selectedAgentId = null, mode = 'preview' } = {}) {
  if (mission) {
    for (const start of getRenderableStartGlyphs(mission, plan, selectedAgentId)) {
      const p = cellToWorld(layout, start.x, start.y);
      drawBaseMarker(g, p, layout.cell, {
        selected: start.selected,
        subdued: mode === 'simulation',
        launch: true
      });
    }
    return;
  }
  if (mode === 'simulation') return;
  const activeDeploymentZones = mode === 'planning' && selectedAgentId && requiresDeploymentSelection(mission, selectedAgentId)
    ? getDeploymentZonesForAgent(level, mission, selectedAgentId)
    : [];
  for (const base of level.layers.bases ?? []) {
    if (activeDeploymentZones.some((zone) => zoneContainsRoundedCell(zone, base.x, base.y))) continue;
    const p = cellToWorld(layout, base.x, base.y);
    drawBaseMarker(g, p, layout.cell);
  }
}

function getRenderableStartGlyphs(mission, plan, selectedAgentId = null) {
  const starts = [];
  const seen = new Set();
  for (const agent of mission?.agents ?? []) {
    const agentPlan = plan?.agentPlans?.find((candidate) => candidate.agentId === agent.id);
    const planStart = isFinitePoint(agentPlan?.selectedStart) ? agentPlan.selectedStart : null;
    const selectedStart = planStart ?? getSelectedStart(agent);
    if ((agent.deployment?.mode === 'chooseFromZone' || agent.deployment?.mode === 'chooseFromZones') && !selectedStart) continue;
    const start = selectedStart ?? agent.start;
    if (!isFinitePoint(start)) continue;
    const x = Math.round(Number(start.x));
    const y = Math.round(Number(start.y));
    const key = `${x},${y}`;
    if (seen.has(key)) continue;
    seen.add(key);
    starts.push({
      x,
      y,
      selected: !selectedAgentId || selectedAgentId === agent.id
    });
  }
  return starts;
}

function zoneContainsRoundedCell(zone, x, y) {
  const roundedX = Math.round(Number(x));
  const roundedY = Math.round(Number(y));
  return (zone?.cells ?? []).some((cell) => cell.x === roundedX && cell.y === roundedY);
}

function drawBaseMarker(g, p, cell, { selected = true, subdued = false, launch = false } = {}) {
  debugOval('baseRadiusRetired', {
    center: { x: p.x, y: p.y },
    reason: 'base markers use diamond station glyphs, not radius ovals'
  });
  const alpha = subdued ? 0.42 : selected ? 0.9 : 0.48;
  const lineAlpha = subdued ? 0.5 : selected ? 0.92 : 0.46;
  const color = launch ? 0x63e6be : 0x54c7ec;
  const size = cell * (subdued ? 0.32 : 0.42);
  g.fillStyle(0x07111f, subdued ? 0.46 : 0.86);
  g.lineStyle(subdued ? 2 : 3, color, lineAlpha);
  g.beginPath();
  g.moveTo(p.x, p.y - size);
  g.lineTo(p.x + size, p.y);
  g.lineTo(p.x, p.y + size);
  g.lineTo(p.x - size, p.y);
  g.closePath();
  g.fillPath();
  g.strokePath();
  g.fillStyle(color, alpha);
  g.fillRect(p.x - cell * 0.14, p.y - cell * 0.14, cell * 0.28, cell * 0.28);
  if (launch) {
    g.lineStyle(2, 0xffffff, subdued ? 0.36 : 0.72);
    g.lineBetween(p.x, p.y - cell * 0.36, p.x, p.y - cell * 0.12);
    g.lineBetween(p.x - cell * 0.08, p.y - cell * 0.28, p.x, p.y - cell * 0.36);
    g.lineBetween(p.x + cell * 0.08, p.y - cell * 0.28, p.x, p.y - cell * 0.36);
  }
}

function drawDeploymentZones(g, level, mission, selectedAgentId, layout, hoverCell = null, { mode = 'preview' } = {}) {
  for (const agent of mission?.agents ?? []) {
    const zones = getDeploymentZonesForAgent(level, mission, agent.id);
    if (!zones.length || (agent.deployment?.mode !== 'chooseFromZone' && agent.deployment?.mode !== 'chooseFromZones')) continue;
    const selected = !selectedAgentId || selectedAgentId === agent.id;
    const selectedStart = getSelectedStart(agent);
    const startMissing = selected && !selectedStart;
    const drawZone = shouldRenderOverlay('deploymentZone', { mode }, null, {
      mode,
      deploymentSelectionActive: startMissing
    });
    const drawStart = shouldRenderOverlay('deploymentStart', { mode }, null, {
      mode,
      selectedStart
    });
    if (!drawZone && !drawStart) continue;
    debugOval('deploymentZone', {
      mode,
      selectedAgentId,
      selectedStart,
      allowed: drawZone || drawStart,
      reason: drawZone ? 'deployment selection active' : 'locked deployment marker'
    });
    for (const zone of zones) {
      for (const cell of zone.cells ?? []) {
        if (!drawZone) break;
        const px = layout.ox + cell.x * layout.cell;
        const py = layout.oy + cell.y * layout.cell;
        const hover = shouldRenderOverlay('deploymentHover', { mode }, null, {
          mode,
          deploymentSelectionActive: startMissing,
          hoverCell
        }) && hoverCell?.x === cell.x && hoverCell?.y === cell.y;
        g.fillStyle(selected ? 0x54c7ec : 0x63e6be, selected ? (startMissing ? 0.28 : 0.18) : 0.08);
        g.fillRect(px + 3, py + 3, layout.cell - 6, layout.cell - 6);
        g.lineStyle(hover ? 4 : selected ? 2 : 1, hover ? 0xffffff : selected ? 0x9ee7ff : 0x63e6be, hover ? 0.94 : selected ? 0.78 : 0.28);
        g.strokeRect(px + 3, py + 3, layout.cell - 6, layout.cell - 6);
        if (hover) drawDeployMarker(g, cellToWorld(layout, cell.x, cell.y), layout.cell, { ghost: true });
      }
    }
    if (drawStart && selectedStart) {
      const p = cellToWorld(layout, selectedStart.x, selectedStart.y);
      drawDeployMarker(g, p, layout.cell, { locked: true, selected });
    } else if (selected) {
      // Text prompt is drawn by MissionWorkspaceScene so it can use Phaser text.
    }
  }
}

function drawDeployMarker(g, p, cell, { ghost = false, locked = false, selected = false } = {}) {
  const alpha = ghost ? 0.44 : 0.96;
  g.fillStyle(ghost ? 0x9ee7ff : 0x63e6be, alpha);
  g.lineStyle(selected || locked ? 3 : 2, 0xffffff, ghost ? 0.5 : 0.9);
  g.fillCircle(p.x, p.y, cell * 0.22);
  g.strokeCircle(p.x, p.y, cell * 0.34);
  g.fillTriangle(p.x, p.y - cell * 0.34, p.x - cell * 0.13, p.y - cell * 0.04, p.x + cell * 0.13, p.y - cell * 0.04);
}

function drawAgentStarts(g, mission, selectedAgentId, surfacedAgents, layout, context = {}) {
  for (const agent of mission?.agents ?? []) {
    const surfaced = surfacedAgents.find((candidate) => candidate.id === agent.id);
    const selectedStart = getSelectedStart(agent);
    if (!surfaced && (agent.deployment?.mode === 'chooseFromZone' || agent.deployment?.mode === 'chooseFromZones') && !selectedStart) {
      debugOval('gliderStartSkipped', {
        agentId: agent.id,
        deploymentMode: agent.deployment.mode,
        selectedStart: null,
        reason: 'waiting for deployment selection'
      });
      continue;
    }
    const x = surfaced?.x ?? selectedStart?.x ?? agent.start?.x;
    const y = surfaced?.y ?? selectedStart?.y ?? agent.start?.y;
    if (!Number.isFinite(Number(x)) || !Number.isFinite(Number(y))) continue;
    const p = cellToWorld(layout, x, y);
    const heading = resolvePlanningGliderHeading({
      agent,
      agentPlan: context.plan?.agentPlans?.find((plan) => plan.agentId === agent.id),
      from: { x, y },
      surfaced,
      hoverCell: agent.id === selectedAgentId ? context.hoverCell : null,
      planningAnchor: context.planningAnchor,
      level: context.level,
      mission,
      surfacedAgents
    });
    drawGlider(g, p.x, p.y, layout.cell, {
      selected: agent.id === selectedAgentId,
      surfaced: Boolean(surfaced),
      heading
    });
  }
}

function drawPlan(g, {
  level,
  mission,
  plan,
  selectedAgentId,
  selectedWaypoint,
  selectedWindow,
  surfacedAgents = [],
  planningAnchor = null,
  layout
}) {
  for (const agentPlan of plan?.agentPlans ?? []) {
    const selected = !selectedAgentId || agentPlan.agentId === selectedAgentId;
    const color = selected ? 0xffd166 : 0x54c7ec;
    const alpha = selected ? 0.95 : 0.32;
    const waypoints = agentPlan.waypoints ?? [];
    const stacks = buildWaypointStacks(waypoints);
    const agent = mission?.agents?.find((candidate) => candidate.id === agentPlan.agentId);
    const route = buildRouteSegmentsForAgent({ level, mission, agent, agentPlan, surfacedAgents, planningAnchor });
    const segments = route.segments;
    for (const segment of segments) {
      const segmentWindow = Math.max(Number(segment.from.window ?? 0), Number(segment.to.window ?? 0));
      const destinationWaypoint = waypoints[Number(segment.waypointIndex ?? -1)];
      const invalidSegment = destinationWaypoint?.validity?.routeAudit?.issueType === 'segmentBlocked'
        || destinationWaypoint?.validity?.reasons?.includes('segmentBlocked');
      const segmentStyle = waypointWindowStyle(segmentWindow, selectedWindow, segment.valid && !invalidSegment ? color : 0xff9f43);
      drawRouteSegment(g, segment, layout, {
        selected,
        color: invalidSegment ? 0xff4e5a : segment.valid ? segmentStyle.color : 0xff9f43,
        alpha: alpha * segmentStyle.alpha,
        warning: !segment.valid || invalidSegment,
        invalid: invalidSegment,
        agentId: agentPlan.agentId,
        routeType: 'planned'
      });
    }
    for (const stack of stacks.values()) {
      if (stack.indexes.length <= 1) continue;
      const p = cellToWorld(layout, stack.x, stack.y);
      g.lineStyle(selected ? 3 : 2, selected ? 0xfff0a3 : 0x9ee7ff, selected ? 0.78 : 0.32);
      g.strokeCircle(p.x, p.y, layout.cell * 0.34);
    }
    waypoints.forEach((wp, index) => {
      const stack = stacks.get(waypointStackKey(wp));
      const stackIndex = stack?.indexes.indexOf(index) ?? 0;
      const offset = waypointStackOffset(stackIndex, stack?.indexes.length ?? 1, layout.cell);
      const base = cellToWorld(layout, wp.x, wp.y);
      const p = { x: base.x + offset.x, y: base.y + offset.y };
      const activeWindow = selectedWindow !== null && wp.window === selectedWindow;
      const activeWaypoint = selectedWaypoint?.agentId === agentPlan.agentId && selectedWaypoint?.index === index;
      const invalidWaypoint = wp.validity?.valid === false;
      const style = waypointWindowStyle(Number(wp.window ?? 0), selectedWindow, color);
      g.fillStyle(invalidWaypoint ? 0xff4e5a : activeWindow || activeWaypoint ? 0xffd166 : style.color, (selected ? 0.96 : 0.38) * style.alpha);
      g.fillCircle(p.x, p.y, layout.cell * (activeWaypoint ? 0.23 : 0.18));
      if (invalidWaypoint) {
        g.lineStyle(activeWaypoint ? 5 : 4, 0xffd166, selected ? 0.95 : 0.5);
        g.strokeCircle(p.x, p.y, layout.cell * 0.34);
      }
      if (Number(wp.window ?? 0) < Number(selectedWindow ?? 0)) {
        g.lineStyle(2, 0xb7c1d0, 0.55);
        g.strokeCircle(p.x, p.y, layout.cell * 0.2);
      }
      if (activeWindow || activeWaypoint) {
        g.lineStyle(activeWaypoint ? 5 : 3, activeWaypoint ? 0xffffff : 0x63e6be, 0.9);
        g.strokeCircle(p.x, p.y, layout.cell * 0.31);
      }
    });
  }
}

function drawRouteSegment(g, segment, layout, { selected, color, alpha, warning = false, invalid = false, agentId = null, routeType = 'planned' }) {
  const points = getVisibleSegmentPoints(segment).filter(isFinitePoint);
  if (points.length < 2) return;
  debugRouteRendering({
    layerName: 'planned-route',
    agentId,
    routeType,
    pointCount: points.length,
    color,
    isDiagnostic: false,
    isVisibleByDefault: true
  });
  debugHiddenDiagnosticRouteCells(segment, { layerName: 'planned-route-diagnostic-cells', agentId, routeType });
  const screenPoints = points.map((point) => cellToWorld(layout, point.x, point.y));
  g.lineStyle(selected ? 7 : 3, 0x08111f, 0.38 * alpha);
  strokePolyline(g, screenPoints);
  g.lineStyle(invalid ? (selected ? 5 : 3) : selected ? 4 : 2, color, invalid ? Math.max(alpha, 0.72) : alpha);
  strokePolyline(g, screenPoints);
  if (warning && segment.blockedAt) {
    const blocked = cellToWorld(layout, segment.blockedAt.x, segment.blockedAt.y);
    g.fillStyle(invalid ? 0xff4e5a : 0xff3e3e, 0.88 * alpha);
    g.fillCircle(blocked.x, blocked.y, layout.cell * 0.14);
    g.lineStyle(2, 0xffd166, 0.82 * alpha);
    g.strokeCircle(blocked.x, blocked.y, layout.cell * 0.22);
    if (invalid) {
      g.lineStyle(3, 0xffffff, 0.86 * alpha);
      g.lineBetween(blocked.x - layout.cell * 0.13, blocked.y - layout.cell * 0.13, blocked.x + layout.cell * 0.13, blocked.y + layout.cell * 0.13);
      g.lineBetween(blocked.x + layout.cell * 0.13, blocked.y - layout.cell * 0.13, blocked.x - layout.cell * 0.13, blocked.y + layout.cell * 0.13);
    }
  }
}

function getVisibleSegmentPoints(segment) {
  const end = segment?.valid === false && isFinitePoint(segment?.lastValid) ? segment.lastValid : segment?.to;
  return [segment?.from, end];
}

function debugHiddenDiagnosticRouteCells(segment, { layerName, agentId = null, routeType = 'diagnosticCells' } = {}) {
  const diagnosticCount = segment?.traversedCells?.length ?? segment?.pathCells?.length ?? segment?.sampledCells?.length ?? 0;
  if (diagnosticCount <= 0) return;
  debugRouteRendering({
    layerName,
    agentId,
    routeType,
    pointCount: diagnosticCount,
    color: null,
    isDiagnostic: true,
    isVisibleByDefault: false
  });
}

function drawPlanningMarkers(g, plan, selectedAgentId, selectedWindow, selectedMarker, layout, mode = 'planning') {
  for (const [index, marker] of (plan?.planningMarkers ?? []).entries()) {
      if (!isFinitePoint(marker)) continue;
      const p = cellToWorld(layout, marker.x, marker.y);
      const activeWindow = selectedWindow === null || selectedWindow === undefined || Number(marker.window ?? 0) === Number(selectedWindow);
      const starLinked = Boolean(marker.linkedTargetId);
      const color = markerStatusColor(marker.reachability?.status, starLinked);
      const alpha = mode === 'simulation' ? 0.28 : 0.78 * (activeWindow ? 1 : 0.56);
      const selectedThisMarker = Number(selectedMarker?.index) === index;
      g.fillStyle(0x07111f, 0.28 * alpha);
      g.fillCircle(p.x, p.y, layout.cell * 0.24);
      g.lineStyle(selectedThisMarker ? 5 : 3, color, alpha);
      g.strokeCircle(p.x, p.y, selectedThisMarker ? layout.cell * 0.36 : layout.cell * 0.29);
      g.lineStyle(2, color, alpha);
      g.lineBetween(p.x, p.y - layout.cell * 0.26, p.x, p.y + layout.cell * 0.24);
      g.lineBetween(p.x, p.y - layout.cell * 0.22, p.x + layout.cell * 0.18, p.y - layout.cell * 0.14);
      g.lineBetween(p.x + layout.cell * 0.18, p.y - layout.cell * 0.14, p.x, p.y - layout.cell * 0.04);
      g.fillStyle(color, alpha);
      g.fillRoundedRect(p.x - layout.cell * 0.2, p.y - layout.cell * 0.42, layout.cell * 0.4, layout.cell * 0.11, Math.max(1, layout.cell * 0.025));
      if (activeWindow && mode !== 'simulation') {
        g.fillStyle(color, alpha);
        g.fillCircle(p.x, p.y + layout.cell * 0.29, Math.max(2, layout.cell * 0.045));
      }
  }
}

function markerStatusColor(status, starLinked = false) {
  if (status === 'reachable') return 0x63e6be;
  if (status === 'tight') return 0xffd166;
  if (status === 'risky') return 0xff8a5c;
  if (status === 'impossible') return 0xff4e5a;
  return starLinked ? 0xffd166 : 0x9ee7ff;
}

function strokePolyline(g, points) {
  if (points.length < 2) return;
  g.beginPath();
  points.forEach((point, index) => {
    if (index === 0) g.moveTo(point.x, point.y);
    else g.lineTo(point.x, point.y);
  });
  g.strokePath();
}

function isWaterCell(level, x, y) {
  const grid = level?.world?.grid ?? {};
  if (x < 0 || y < 0 || x >= grid.width || y >= grid.height) return false;
  return !level?.layers?.terrain?.[y]?.[x];
}

function isFinitePoint(point) {
  return Number.isFinite(Number(point?.x)) && Number.isFinite(Number(point?.y));
}

function buildWaypointStacks(waypoints = []) {
  const stacks = new Map();
  waypoints.forEach((waypoint, index) => {
    const key = waypointStackKey(waypoint);
    const stack = stacks.get(key) ?? {
      key,
      x: Math.round(Number(waypoint.x)),
      y: Math.round(Number(waypoint.y)),
      indexes: []
    };
    stack.indexes.push(index);
    stacks.set(key, stack);
  });
  return stacks;
}

function waypointStackKey(waypoint) {
  return `${Math.round(Number(waypoint?.x))},${Math.round(Number(waypoint?.y))}`;
}

function waypointStackOffset(index, count, cell) {
  if (count <= 1) return { x: 0, y: 0 };
  const radius = Math.min(cell * 0.18, Math.max(4, cell * 0.12));
  const angle = -Math.PI / 2 + (Math.PI * 2 * index) / count;
  return {
    x: Math.cos(angle) * radius,
    y: Math.sin(angle) * radius
  };
}

function waypointWindowStyle(windowIndex, selectedWindow, baseColor) {
  if (selectedWindow === null || selectedWindow === undefined) return { color: baseColor, alpha: 1 };
  if (windowIndex < selectedWindow) return { color: 0x9aa6b8, alpha: 0.42 };
  if (windowIndex > selectedWindow) return { color: 0x54c7ec, alpha: 0.58 };
  return { color: baseColor, alpha: 1 };
}

function drawGuidance(g, guidance, layout, layers = {}) {
  if (!guidance) return;
  for (const oval of guidance.arrivalOvals ?? []) {
    const alpha = oval.active ? 0.68 : 0.28;
    const color = oval.active ? 0xffd166 : 0x9ee7ff;
    drawRotatedEllipse(g, layout, oval, {
      color,
      alpha,
      fillAlpha: oval.active ? 0.08 : 0.035,
      lineWidth: oval.active ? 3 : 2
    });
  }
  if (guidance.showReachable) {
    for (const cell of guidance.reachableCells ?? []) {
      g.fillStyle(0x54c7ec, 0.04 + (cell.strength ?? 0) * 0.08);
      g.fillRect(layout.ox + cell.x * layout.cell + 3, layout.oy + cell.y * layout.cell + 3, layout.cell - 6, layout.cell - 6);
    }
    if (guidance.reachableRegion) {
      const c = cellToWorld(layout, guidance.reachableRegion.center.x, guidance.reachableRegion.center.y);
      debugOval('reachability', {
        center: guidance.reachableRegion.center,
        radiusX: guidance.reachableRegion.radiusX,
        radiusY: guidance.reachableRegion.radiusY,
        allowed: true,
        reason: guidance.debug?.overlayMode ?? 'planning guidance'
      });
      g.lineStyle(3, 0x63e6be, 0.35);
      g.strokeEllipse(c.x, c.y, guidance.reachableRegion.radiusX * layout.cell * 2, guidance.reachableRegion.radiusY * layout.cell * 2);
    }
  }
  if (guidance.showDrift && guidance.driftCone) {
    drawDriftConeCorridor(g, guidance.driftCone, layout);
    if (guidance.arrivalPreview) {
      drawRotatedEllipse(g, layout, guidance.arrivalPreview, {
        color: guidance.driftCone.blocked || guidance.driftCone.feasibility === 'warning' ? 0xff8c42 : 0x54c7ec,
        alpha: 0.62,
        fillAlpha: 0.08,
        lineWidth: 2
      });
    }
  }
  if (guidance.previewPath?.length > 1) {
    if (guidance.routeClip?.valid === false) {
      const blocked = cellToWorld(layout, guidance.routeClip.blockedAt.x, guidance.routeClip.blockedAt.y);
      g.fillStyle(0xff3e3e, 0.85);
      g.fillCircle(blocked.x, blocked.y, layout.cell * 0.22);
      g.lineStyle(3, 0xffd166, 0.9);
      g.strokeCircle(blocked.x, blocked.y, layout.cell * 0.32);
    }
    debugRouteRendering({
      layerName: 'guidance-preview-route',
      agentId: guidance.debug?.selectedAgentId ?? null,
      routeType: 'guidancePreview',
      pointCount: guidance.previewPath.length,
      color: 0xffffff,
      isDiagnostic: false,
      isVisibleByDefault: true
    });
    if (guidance.routeClip?.traversedCells?.length) {
      debugRouteRendering({
        layerName: 'guidance-route-diagnostic-cells',
        agentId: guidance.debug?.selectedAgentId ?? null,
        routeType: 'guidanceDiagnosticCells',
        pointCount: guidance.routeClip.traversedCells.length,
        color: null,
        isDiagnostic: true,
        isVisibleByDefault: false
      });
    }
    g.lineStyle(5, 0x07111d, 0.36);
    g.beginPath();
    guidance.previewPath.forEach((point, index) => {
      const p = cellToWorld(layout, point.x, point.y);
      if (index === 0) g.moveTo(p.x, p.y);
      else g.lineTo(p.x, p.y);
    });
    g.strokePath();
    g.lineStyle(3, 0xffffff, 0.78);
    g.beginPath();
    guidance.previewPath.forEach((point, index) => {
      const p = cellToWorld(layout, point.x, point.y);
      if (index === 0) g.moveTo(p.x, p.y);
      else g.lineTo(p.x, p.y);
    });
    g.strokePath();
  }
  if (layers.showEnergy && guidance.routeEnergy && guidance.previewPath?.length) {
    const p = cellToWorld(layout, guidance.previewPath.at(-1).x, guidance.previewPath.at(-1).y);
    const label = buildGuidanceLabel(guidance);
    if (label.text) {
      g.fillStyle(0x08111f, 0.88);
      g.lineStyle(2, label.warning ? 0xffb347 : 0x54c7ec, 0.86);
      g.fillRoundedRect(p.x + 10, p.y - 28, Math.min(230, Math.max(116, label.text.length * 7)), 24, 6);
      g.strokeRoundedRect(p.x + 10, p.y - 28, Math.min(230, Math.max(116, label.text.length * 7)), 24, 6);
    }
  }
  if (guidance.showSurfacing && guidance.predictedSurface) {
    const p = cellToWorld(layout, guidance.predictedSurface.x, guidance.predictedSurface.y);
    g.fillStyle(0x63e6be, 0.2);
    g.fillCircle(p.x, p.y, layout.cell * 0.42);
    g.lineStyle(4, 0x63e6be, 0.9);
    g.strokeCircle(p.x, p.y, layout.cell * 0.42);
  }
}

export function buildGuidanceLabel(guidance) {
  const route = guidance?.routeEnergy;
  if (!route) return { text: '', warning: false };
  if (route.valid === false) return { text: 'Blocked by land', warning: true };
  const parts = [];
  if (Number.isFinite(route.energy)) parts.push(`Energy ${route.energy.toFixed(1)}`);
  const eta = route.eta ?? route.travelTime ?? (Number.isFinite(route.distance) ? route.distance : null);
  if (Number.isFinite(eta)) parts.push(`ETA ${eta.toFixed(1)} hr`);
  if (guidance?.driftCone?.currentAssistLabel) {
    parts.push(guidance.driftCone.currentAssistLabel);
  } else
  if (route.reachable === false || route.notes?.some((note) => /exceeds battery|fuel/i.test(note))) {
    parts.push('Fuel exceeded');
  } else if (route.currentAssist > 0.08) {
    parts.push('current helps');
  } else if (route.currentAssist < -0.08) {
    parts.push('against current');
  }
  return {
    text: parts.join(' · '),
    warning: route.valid === false || route.reachable === false || route.notes?.some((note) => /blocked|exceeds|outside|beyond/i.test(note))
  };
}

function debugOval(source, payload = {}) {
  if (!DEBUG_OVAL_RENDERING) return;
  console.debug('[oval-render]', source, payload);
}

function drawDriftConeCorridor(g, cone, layout) {
  const points = (cone.polygon ?? []).map((point) => cellToWorld(layout, point.x, point.y));
  if (points.length < 4) return;
  const warning = cone.blocked || cone.feasibility === 'warning' || Number(cone.warningSeverity ?? 0) > 0.6;
  const color = warning ? 0xff8c42 : 0x54c7ec;
  g.fillStyle(color, warning ? 0.18 : 0.18);
  g.lineStyle(2, color, warning ? 0.76 : 0.5);
  g.beginPath();
  g.moveTo(points[0].x, points[0].y);
  for (let index = 1; index < points.length; index += 1) g.lineTo(points[index].x, points[index].y);
  g.closePath();
  g.fillPath();
  g.strokePath();

  const origin = cellToWorld(layout, cone.origin.x, cone.origin.y);
  const target = cellToWorld(layout, cone.target.x, cone.target.y);
  if (cone.expectedCenter) {
    const expected = cellToWorld(layout, cone.expectedCenter.x, cone.expectedCenter.y);
    g.fillStyle(warning ? 0xffd166 : 0x63e6be, 0.22);
    g.fillCircle(expected.x, expected.y, layout.cell * 0.16);
    g.lineStyle(2, warning ? 0xffd166 : 0x63e6be, 0.74);
    g.strokeCircle(expected.x, expected.y, layout.cell * 0.25);
  }
  g.lineStyle(3, warning ? 0xffd166 : 0xbef6ff, 0.68);
  g.beginPath();
  g.moveTo(origin.x, origin.y);
  g.lineTo(target.x, target.y);
  g.strokePath();
}

function drawRotatedEllipse(g, layout, oval, { color, alpha = 0.5, fillAlpha = 0.05, lineWidth = 2 } = {}) {
  const center = cellToWorld(layout, oval.x, oval.y);
  const radiusX = Math.max(0.1, Number(oval.radiusX ?? 0.5)) * layout.cell;
  const radiusY = Math.max(0.1, Number(oval.radiusY ?? 0.35)) * layout.cell;
  const angle = Number(oval.angle ?? 0);
  const steps = 32;
  const points = [];
  for (let index = 0; index < steps; index += 1) {
    const theta = (Math.PI * 2 * index) / steps;
    const ex = Math.cos(theta) * radiusX;
    const ey = Math.sin(theta) * radiusY;
    points.push({
      x: center.x + ex * Math.cos(angle) - ey * Math.sin(angle),
      y: center.y + ex * Math.sin(angle) + ey * Math.cos(angle)
    });
  }
  g.fillStyle(color, fillAlpha);
  g.lineStyle(lineWidth, color, alpha);
  g.beginPath();
  g.moveTo(points[0].x, points[0].y);
  for (let index = 1; index < points.length; index += 1) g.lineTo(points[index].x, points[index].y);
  g.closePath();
  g.fillPath();
  g.strokePath();
}

function drawEngine(g, engine, layout, layers = {}) {
  for (const agent of engine.agents ?? []) {
    if (layers.showActualPath !== false && agent.history?.length > 1) {
      const history = decimatePath(agent.history, 900);
      g.lineStyle(3, 0xffffff, 0.78);
      g.beginPath();
      history.forEach((point, index) => {
        const p = cellToWorld(layout, point.x, point.y);
        if (index === 0) g.moveTo(p.x, p.y);
        else g.lineTo(p.x, p.y);
      });
      g.strokePath();
    }
    const p = cellToWorld(layout, agent.x, agent.y);
    const heading = resolveSimulationGliderHeading(agent);
    drawGlider(g, p.x, p.y, layout.cell, {
      surfaced: agent.commsState === 'surfaced',
      surfacing: agent.commsState === 'surfacing',
      submerged: agent.commsState === 'submerged',
      heading
    });
  }
}

function decimatePath(points, maxPoints) {
  if (!Array.isArray(points) || points.length <= maxPoints) return points ?? [];
  const step = Math.ceil(points.length / maxPoints);
  const sampled = [];
  for (let index = 0; index < points.length; index += step) sampled.push(points[index]);
  const last = points.at(-1);
  if (last && sampled.at(-1) !== last) sampled.push(last);
  return sampled;
}

function drawGlider(g, x, y, cell, { selected = false, surfaced = false, surfacing = false, submerged = false, heading = -Math.PI / 2 } = {}) {
  const color = surfaced ? 0x63e6be : surfacing ? 0xffd166 : selected ? 0x54c7ec : 0xdcecff;
  const alpha = submerged ? 0.58 : 1;
  const r = cell * 0.24;
  const rotation = normalizeHeading(heading, -Math.PI / 2) + Math.PI / 2;
  const p1 = rotatePoint(0, -r, rotation);
  const p2 = rotatePoint(r * 0.72, r * 0.78, rotation);
  const p3 = rotatePoint(0, r * 0.38, rotation);
  const p4 = rotatePoint(-r * 0.72, r * 0.78, rotation);
  g.fillStyle(color, alpha);
  g.lineStyle(selected || surfaced ? 3 : 2, 0xffffff, selected || surfaced ? 0.92 : 0.68);
  g.beginPath();
  g.moveTo(x + p1.x, y + p1.y);
  g.lineTo(x + p2.x, y + p2.y);
  g.lineTo(x + p3.x, y + p3.y);
  g.lineTo(x + p4.x, y + p4.y);
  g.closePath();
  g.fillPath();
  g.strokePath();
  if (surfaced || selected) {
    g.lineStyle(2, 0xffffff, 0.65);
    g.strokeCircle(x, y, cell * 0.34);
  }
}

function resolveSimulationGliderHeading(agent) {
  const history = agent?.history ?? [];
  const current = history.at(-1);
  const previous = history.at(-2);
  const fallback = normalizeHeading(agent?.heading, -Math.PI / 2);
  const historyHeading = current && previous
    ? computeHeadingAngle(previous, current, NaN)
    : NaN;
  if (isUsableHeading(historyHeading)) return historyHeading;

  const velocity = agent?.velocity ?? {};
  const vx = Array.isArray(velocity) ? velocity[0] : velocity.x;
  const vy = Array.isArray(velocity) ? velocity[1] : velocity.y;
  const velocityHeading = computeHeadingFromVelocity(vx, vy, NaN);
  if (isUsableHeading(velocityHeading)) return velocityHeading;

  const targetHeading = computeHeadingAngle(agent, agent?.activeWaypoint, NaN);
  if (isUsableHeading(targetHeading)) return targetHeading;
  return fallback;
}

function resolvePlanningGliderHeading({ agent, agentPlan, from, surfaced, hoverCell, planningAnchor, level, mission, surfacedAgents }) {
  const fallback = normalizeHeading(surfaced?.heading ?? agent?.heading, -Math.PI / 2);
  if (isFinitePoint(from) && isFinitePoint(hoverCell)) {
    const hoverHeading = computeHeadingAngle(from, hoverCell, NaN);
    if (isUsableHeading(hoverHeading)) return hoverHeading;
  }
  const route = buildRouteSegmentsForAgent({ level, mission, agent, agentPlan, surfacedAgents, planningAnchor });
  const firstSegment = route.segments?.find((segment) => isFinitePoint(segment.from) && isFinitePoint(segment.to));
  const routeHeading = firstSegment ? computeHeadingAngle(firstSegment.from, firstSegment.to, NaN) : NaN;
  if (isUsableHeading(routeHeading)) return routeHeading;
  return fallback;
}

function normalizeHeading(angle, fallback = -Math.PI / 2) {
  const numeric = Number(angle);
  return Number.isFinite(numeric) ? numeric : fallback;
}

function rotatePoint(x, y, angle) {
  const cos = Math.cos(angle);
  const sin = Math.sin(angle);
  return { x: x * cos - y * sin, y: x * sin + y * cos };
}
