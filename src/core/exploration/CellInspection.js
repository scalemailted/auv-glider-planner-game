import { getPlanningFrame } from '../sim/ChallengeMode.js';
import { normalizeROIValue } from '../sim/ROIValue.js';
import { getActivePriorityTargets } from '../sim/PriorityTargets.js';
import { getWindowForTime } from '../time/MissionTime.js';
import { computePlannedCoverage, computeTravelCostField, getCellRoiDisplayValue, getRoiModeDescription, normalizeRoiMode } from '../roi/RoiMode.js';
import { estimateBeachingRiskAtCell } from '../planning/ShorelineRisk.js';
import { isCellNavigable } from '../planning/Navigability.js';
import { sampleCurrentField } from '../currents/CurrentFieldSampler.js';

export function inspectCellAtTime({ level, mission = null, state = null, x, y, t = 0 } = {}) {
  const grid = level?.world?.grid ?? {};
  if (!Number.isFinite(Number(x)) || !Number.isFinite(Number(y))) return null;
  if (x < 0 || y < 0 || x >= grid.width || y >= grid.height) return null;
  const frame = getPlanningFrame(level, t, {
    challengeMode: state?.challengeMode,
    revealTruth: state?.ui?.revealTruth,
    forecastMemberId: state?.ui?.forecastMemberId
  });
  const roi = normalizeROIValue(frame?.roi?.[y]?.[x] ?? 0);
  const roiMode = normalizeRoiMode(state?.ui?.roiViewMode);
  const plannedCoverage = roiMode === 'remaining'
    ? computePlannedCoverage(state?.plan, mission, level)
    : null;
  const travelCostField = roiMode === 'travelCost'
    ? computeTravelCostField({
      level,
      mission,
      plan: state?.plan,
      frame,
      selectedAgentId: state?.selectedAgentId,
      selectedWaypoint: state?.ui?.selectedWaypoint,
      planningAnchor: state?.ui?.planningAnchor,
      t
    })
    : null;
  const roiDisplay = getCellRoiDisplayValue({
    cell: frame?.roi?.[y]?.[x] ?? 0,
    x,
    y,
    t,
    mode: roiMode,
    plan: state?.plan,
    mission,
    level,
    frame,
    coverage: plannedCoverage,
    selectedAgentId: state?.selectedAgentId,
    selectedWaypoint: state?.ui?.selectedWaypoint,
    planningAnchor: state?.ui?.planningAnchor,
    travelCostField,
    challengeMode: state?.challengeMode
  });
  const current = sampleCurrentField({ frame, level, x, y, time: t });
  const beachingRisk = estimateBeachingRiskAtCell({ level, frame, x, y });
  const confidence = frame?.confidence?.[y]?.[x];
  const depthValue = level?.layers?.depth?.[y]?.[x];
  const priorityTarget = findPriorityTarget(level, t, x, y);
  const navigability = isCellNavigable(level, mission, x, y);
  return {
    x,
    y,
    t: Number(t ?? 0),
    window: getWindowForTime(level, t),
    roiValue: Number(roi.expectedValue ?? roi.value ?? 0),
    roiRawValue: Number(roi.value ?? 0),
    roiProbability: Number(roi.probability ?? 1),
    roiExpectedValue: Number(roi.expectedValue ?? roi.value ?? 0),
    roiRemainingValue: Number(roiDisplay.remainingValue ?? roi.expectedValue ?? 0),
    roiDisplayValue: Number(roiDisplay.value ?? 0),
    roiMode,
    roiModeDescription: getRoiModeDescription(roiMode, {
      deterministic: state?.challengeMode !== 'forecast'
    }),
    roiClaimedBy: roiDisplay.claimedBy ?? [],
    roiDepletedByPlan: Boolean(roiDisplay.depleted),
    roiSamplingMode: roiDisplay.samplingMode,
    roiRisk: roiDisplay.risk ?? null,
    roiTravel: roiDisplay.travel ?? null,
    priorityTarget,
    terrain: level?.layers?.terrain?.[y]?.[x] ? 'land' : 'water',
    navigability: {
      status: navigability.ok ? 'navigable' : 'blocked',
      reason: navigability.reason
    },
    hazard: Number(level?.layers?.hazards?.[y]?.[x] ?? 0) > 0,
    current: {
      u: current.u,
      v: current.v,
      magnitude: current.magnitude,
      direction: currentDirection(current),
      confidence: current.confidence,
      source: current.source,
      contributors: current.contributors
    },
    beachingRisk,
    depth: depthValue === undefined ? null : {
      value: Number(depthValue),
      label: Number(depthValue) < 0.32 ? 'shallow' : 'deep'
    },
    forecastConfidence: confidence === undefined ? null : Number(confidence),
    source: frame?.source ?? null
  };
}

function findPriorityTarget(level, t, x, y) {
  let best = null;
  for (const target of getActivePriorityTargets(level, t)) {
    const position = target.position;
    const distance = Math.hypot(Number(position.x) - Number(x), Number(position.y) - Number(y));
    const radius = Number(target.radius ?? 0.75) + 0.5;
    if (distance <= radius && (!best || distance < best.distance)) {
      best = {
        id: target.id,
        label: target.label,
        value: Number(target.value ?? 0),
        active: true,
        distance
      };
    }
  }
  return best;
}

function currentDirection(current) {
  const u = Number(Array.isArray(current) ? current[0] : current?.u ?? 0);
  const v = Number(Array.isArray(current) ? current[1] : current?.v ?? 0);
  if (Math.hypot(u, v) < 0.01) return 'calm';
  const angle = Math.atan2(-v, u) * 180 / Math.PI;
  const dirs = ['E', 'NE', 'N', 'NW', 'W', 'SW', 'S', 'SE'];
  return dirs[Math.round((((angle % 360) + 360) % 360) / 45) % 8];
}
