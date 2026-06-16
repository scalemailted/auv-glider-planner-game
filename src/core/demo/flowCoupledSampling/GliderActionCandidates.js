import {
  clamp01,
  createScalarField
} from './FlowCoupledSamplingFieldMath.js';

export const GLIDER_ACTION_CANDIDATE_MODES = [
  'reachableTopK',
  'bestActionValue',
  'currentAssistedTargets',
  'lowRiskTargets',
  'interceptTargets',
  'energyEfficientTargets',
  'redundancyAvoidingTargets',
  'scienceFirstReachable'
];

export const GLIDER_ACTION_CANDIDATE_MODE_METADATA = {
  reachableTopK: { label: 'Reachable Top-K', description: 'Choose high action-value cells that are reachable and accessible.' },
  bestActionValue: { label: 'Best Action Value', description: 'Choose the highest Q_glider cells after model suppression.' },
  currentAssistedTargets: { label: 'Current-Assisted Targets', description: 'Favor targets with high action value and helpful current.' },
  lowRiskTargets: { label: 'Low-Risk Targets', description: 'Favor targets with low cross-current, hazard, and missed-window risk.' },
  interceptTargets: { label: 'Intercept Targets', description: 'Favor high future-priority cells that remain reachable.' },
  energyEfficientTargets: { label: 'Energy-Efficient Targets', description: 'Favor useful targets with low energy cost.' },
  redundancyAvoidingTargets: { label: 'Redundancy-Avoiding Targets', description: 'Favor useful targets far from recent samples or other glider coverage.' },
  scienceFirstReachable: { label: 'Science-First Reachable', description: 'Rank reachable cells mostly by global and future science priority.' }
};

export function gliderActionCandidateModeOptions() {
  return GLIDER_ACTION_CANDIDATE_MODES.map((id) => ({
    id,
    label: gliderActionCandidateModeLabel(id),
    description: GLIDER_ACTION_CANDIDATE_MODE_METADATA[id]?.description ?? ''
  }));
}

export function normalizeGliderActionCandidateMode(id) {
  const value = String(id ?? '').trim();
  if (GLIDER_ACTION_CANDIDATE_MODES.includes(value)) return value;
  const aliases = {
    topK: 'reachableTopK',
    best: 'bestActionValue',
    current: 'currentAssistedTargets',
    risk: 'lowRiskTargets',
    intercept: 'interceptTargets',
    energy: 'energyEfficientTargets',
    redundancy: 'redundancyAvoidingTargets',
    science: 'scienceFirstReachable'
  };
  return aliases[value] ?? 'reachableTopK';
}

export function gliderActionCandidateModeLabel(id) {
  return GLIDER_ACTION_CANDIDATE_MODE_METADATA[normalizeGliderActionCandidateMode(id)]?.label ?? 'Reachable Top-K';
}

export function generateGliderActionCandidates({
  actionValueField,
  components = {},
  glider = {},
  candidateCount = 6,
  minDistance = 3,
  accessibleMask = null,
  reachableMask = null,
  candidateMode = 'reachableTopK'
} = {}) {
  const mode = normalizeGliderActionCandidateMode(candidateMode);
  const width = Math.max(
    Array.isArray(actionValueField?.[0]) ? actionValueField[0].length : 0,
    Array.isArray(components.globalPriority?.[0]) ? components.globalPriority[0].length : 0,
    1
  );
  const height = Math.max(
    Array.isArray(actionValueField) ? actionValueField.length : 0,
    Array.isArray(components.globalPriority) ? components.globalPriority.length : 0,
    1
  );
  const count = Math.max(1, Math.min(24, Math.round(Number(candidateCount) || 6)));
  const spacing = Math.max(0, Number(minDistance) || 0);
  const access = accessibleMask ?? components.accessibleMask ?? createScalarField(width, height, 1);
  const reach = reachableMask ?? components.reachableMask ?? createScalarField(width, height, 1);
  const sourceField = fieldForMode(mode, actionValueField, components);
  const requireReachable = mode !== 'bestActionValue';
  const ranked = rankCells(sourceField, { actionValueField, components, access, reach, requireReachable });
  const selected = selectDiverse(ranked, count, spacing);
  const relaxed = selected.length >= count ? selected : selectDiverse(
    rankCells(sourceField, { actionValueField, components, access, reach, requireReachable: false }),
    count,
    Math.max(1, spacing * 0.55),
    selected
  );
  return relaxed.slice(0, count).map((point, index) => {
    const breakdown = componentBreakdownAt(components, actionValueField, point.col, point.row);
    const reachable = valueAt(reach, point.col, point.row) > 0;
    const accessible = valueAt(access, point.col, point.row, 1) > 0;
    return {
      id: `candidate-${index + 1}`,
      gliderId: String(glider.id ?? components.glider?.id ?? 'glider-a'),
      x: point.col,
      y: point.row,
      row: point.row,
      col: point.col,
      actionValue: breakdown.actionValue,
      globalPriority: breakdown.globalPriority,
      arrivalTime: breakdown.arrivalTimeRaw,
      energyCost: breakdown.energyCost,
      currentAssist: breakdown.currentAssist,
      currentOpposition: breakdown.currentOpposition,
      crossCurrentRisk: breakdown.crossCurrentRisk,
      hazardPenalty: breakdown.hazardPenalty,
      redundancyPenalty: breakdown.redundancyPenalty,
      reachable,
      accessible,
      reason: reasonForCandidate({ mode, breakdown, reachable, accessible }),
      componentBreakdown: breakdown
    };
  });
}

function fieldForMode(mode, actionValueField, components) {
  const width = actionValueField?.[0]?.length ?? components.globalPriority?.[0]?.length ?? 1;
  const height = actionValueField?.length ?? components.globalPriority?.length ?? 1;
  if (mode === 'currentAssistedTargets') {
    return createScalarField(width, height, (col, row) => (
      0.62 * valueAt(actionValueField, col, row)
      + 0.38 * valueAt(components.currentAssist, col, row)
      - 0.22 * valueAt(components.currentOpposition, col, row)
    ));
  }
  if (mode === 'lowRiskTargets') {
    return createScalarField(width, height, (col, row) => (
      valueAt(actionValueField, col, row)
      * (1 - valueAt(components.crossCurrentRisk, col, row))
      * (1 - valueAt(components.hazardPenalty, col, row))
      * (1 - valueAt(components.missedWindowPenalty, col, row))
    ));
  }
  if (mode === 'interceptTargets') {
    return createScalarField(width, height, (col, row) => (
      0.58 * valueAt(components.futurePriority, col, row)
      + 0.36 * valueAt(actionValueField, col, row)
      - 0.16 * valueAt(components.arrivalTime, col, row)
    ));
  }
  if (mode === 'energyEfficientTargets') {
    return createScalarField(width, height, (col, row) => (
      valueAt(actionValueField, col, row)
      * (1 - 0.72 * valueAt(components.energyCost, col, row))
      + 0.18 * valueAt(components.currentAssist, col, row)
    ));
  }
  if (mode === 'redundancyAvoidingTargets') {
    return createScalarField(width, height, (col, row) => (
      valueAt(actionValueField, col, row)
      * (1 - valueAt(components.redundancyPenalty, col, row))
      + 0.16 * valueAt(components.globalPriority, col, row)
    ));
  }
  if (mode === 'scienceFirstReachable') {
    return createScalarField(width, height, (col, row) => (
      0.68 * valueAt(components.globalPriority, col, row)
      + 0.32 * valueAt(components.futurePriority, col, row)
      - 0.18 * valueAt(components.hazardPenalty, col, row)
    ));
  }
  return actionValueField;
}

function rankCells(sourceField, { actionValueField, components, access, reach, requireReachable }) {
  const cells = [];
  const height = sourceField?.length ?? 0;
  const width = sourceField?.[0]?.length ?? 0;
  for (let row = 0; row < height; row += 1) {
    for (let col = 0; col < width; col += 1) {
      const accessible = valueAt(access, col, row, 1) > 0;
      const reachable = valueAt(reach, col, row, 1) > 0;
      if (!accessible || (requireReachable && !reachable)) continue;
      const score = valueAt(sourceField, col, row)
        + 0.001 * valueAt(actionValueField, col, row)
        - 0.0005 * valueAt(components.hazardPenalty, col, row)
        - 0.0005 * valueAt(components.redundancyPenalty, col, row);
      cells.push({ col, row, x: col, y: row, score });
    }
  }
  return cells.sort((a, b) => b.score - a.score || a.row - b.row || a.col - b.col);
}

function selectDiverse(ranked, count, minDistance, seed = []) {
  const selected = [...seed];
  for (const point of ranked) {
    if (selected.some((entry) => entry.col === point.col && entry.row === point.row)) continue;
    if (minDistance > 0 && selected.some((entry) => Math.hypot(entry.col - point.col, entry.row - point.row) < minDistance)) continue;
    selected.push(point);
    if (selected.length >= count) break;
  }
  return selected;
}

function componentBreakdownAt(components, actionValueField, col, row) {
  return {
    actionValue: round4(valueAt(actionValueField, col, row)),
    globalPriority: round4(valueAt(components.globalPriority, col, row)),
    futurePriority: round4(valueAt(components.futurePriority, col, row)),
    travelDistance: round4(valueAt(components.travelDistance, col, row)),
    travelDistanceRaw: round4(valueAt(components.travelDistanceRaw, col, row)),
    arrivalTime: round4(valueAt(components.arrivalTime, col, row)),
    arrivalTimeRaw: round4(valueAt(components.arrivalTimeRaw, col, row)),
    currentAssist: round4(valueAt(components.currentAssist, col, row)),
    currentOpposition: round4(valueAt(components.currentOpposition, col, row)),
    crossCurrentRisk: round4(valueAt(components.crossCurrentRisk, col, row)),
    energyCost: round4(valueAt(components.energyCost, col, row)),
    hazardPenalty: round4(valueAt(components.hazardPenalty, col, row)),
    missedWindowPenalty: round4(valueAt(components.missedWindowPenalty, col, row)),
    redundancyPenalty: round4(valueAt(components.redundancyPenalty, col, row)),
    reachable: valueAt(components.reachableMask, col, row) > 0,
    accessible: valueAt(components.accessibleMask, col, row, 1) > 0
  };
}

function reasonForCandidate({ mode, breakdown, reachable, accessible }) {
  if (!accessible) return 'hazard suppressed';
  if (!reachable) return 'unreachable / filtered';
  if (mode === 'currentAssistedTargets' || breakdown.currentAssist > 0.45) return 'current-assisted target';
  if (mode === 'lowRiskTargets' || (breakdown.crossCurrentRisk < 0.18 && breakdown.hazardPenalty < 0.15)) return 'avoids cross-current risk';
  if (mode === 'interceptTargets' || breakdown.futurePriority > breakdown.globalPriority + 0.08) return 'intercepts future priority';
  if (mode === 'energyEfficientTargets' || breakdown.energyCost < 0.34) return 'low energy target';
  if (mode === 'redundancyAvoidingTargets' || breakdown.redundancyPenalty < 0.2) return 'avoids redundant sampling';
  if (mode === 'scienceFirstReachable' || breakdown.globalPriority > 0.65) return 'high science priority';
  return 'reachable within window';
}

function valueAt(field, col, row, fallback = 0) {
  const value = Number(field?.[row]?.[col]);
  return Number.isFinite(value) ? value : fallback;
}

function round4(value) {
  return Number((Number(value) || 0).toFixed(4));
}
