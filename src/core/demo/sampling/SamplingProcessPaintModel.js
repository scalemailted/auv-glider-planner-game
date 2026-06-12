import {
  normalizeProcessRuleId,
  normalizeSamplingProcessRuleId,
  normalizeSamplingProcessState,
  SAMPLING_PROCESS_STATES,
  processRuleById,
  isKnownProcessRule
} from './SamplingProcessRules.js';

export function createSamplingProcessPaintModel({ width = 24, height = 16, assignments = {} } = {}) {
  const model = {
    width: Math.max(1, Math.round(Number(width) || 24)),
    height: Math.max(1, Math.round(Number(height) || 16)),
    cells: {},
    groups: {}
  };
  for (const [key, assignment] of Object.entries(assignments.cells ?? assignments ?? {})) {
    const normalized = normalizeCellAssignment(assignment);
    if (normalized) model.cells[key] = normalized;
  }
  for (const [id, group] of Object.entries(assignments.groups ?? {})) {
    model.groups[String(id)] = normalizeGroupDefinition({ id, ...group });
  }
  return model;
}

export function createBlankSamplingProcessPaintModel({ width = 24, height = 16 } = {}) {
  return createSamplingProcessPaintModel({ width, height, assignments: {} });
}

export function assignSamplingProcessCell(model, cell, patch = {}) {
  const key = cellKey(cell);
  if (!key) return model;
  const current = model.cells[key] ?? {};
  model.cells[key] = normalizeCellAssignment({ ...current, ...patch });
  const groupId = model.cells[key]?.groupId;
  if (groupId != null && !model.groups[String(groupId)]) {
    model.groups[String(groupId)] = normalizeGroupDefinition({ id: groupId });
  }
  return model;
}

export function clearSamplingProcessCell(model, cell) {
  const key = cellKey(cell);
  if (key) delete model.cells[key];
  return model;
}

export function samplingProcessLayersFromPaint(model, fallback = {}) {
  const width = Math.max(1, Number(model?.width ?? fallback.width ?? 24));
  const height = Math.max(1, Number(model?.height ?? fallback.height ?? 16));
  const stateLayer = Array.from({ length: height }, (_, row) => Array.from({ length: width }, (_, col) => fallback.stateLayer?.[row]?.[col] ?? 'inactive'));
  const ruleLayer = Array.from({ length: height }, (_, row) => Array.from({ length: width }, (_, col) => normalizeRuleOverride(fallback.ruleLayer?.[row]?.[col])));
  const groupLayer = Array.from({ length: height }, (_, row) => Array.from({ length: width }, (_, col) => fallback.groupLayer?.[row]?.[col] ?? 0));
  const sourceField = Array.from({ length: height }, (_, row) => Array.from({ length: width }, (_, col) => Number(fallback.sourceField?.[row]?.[col] ?? 0)));
  const parameterLayer = Array.from({ length: height }, (_, row) => Array.from({ length: width }, (_, col) => ({ ...(fallback.parameterLayer?.[row]?.[col] ?? {}) })));
  for (const [key, assignment] of Object.entries(model?.cells ?? {})) {
    const { col, row } = parseCellKey(key);
    if (row < 0 || col < 0 || row >= height || col >= width) continue;
    if (assignment.state) stateLayer[row][col] = normalizeSamplingProcessState(assignment.state, assignment.ruleId);
    if (assignment.ruleId != null) ruleLayer[row][col] = normalizeRuleOverride(assignment.ruleId);
    if (assignment.groupId != null) groupLayer[row][col] = assignment.groupId;
    if (assignment.sourceValue != null) sourceField[row][col] = Number(assignment.sourceValue);
    parameterLayer[row][col] = { ...(assignment.parameters ?? {}) };
  }
  return { stateLayer, ruleLayer, groupLayer, sourceField, parameterLayer };
}

export function clearSamplingProcessPaintModel(model, { width = model?.width ?? 24, height = model?.height ?? 16 } = {}) {
  return createBlankSamplingProcessPaintModel({ width, height });
}

export function validateSamplingProcessPaintModel(model) {
  const failures = [];
  for (const [key, assignment] of Object.entries(model?.cells ?? {})) {
    const { col, row } = parseCellKey(key);
    if (!Number.isInteger(col) || !Number.isInteger(row)) failures.push(`Invalid cell key ${key}`);
    const ruleId = normalizeSamplingProcessRuleId(assignment.ruleId);
    const rule = processRuleById(ruleId);
    if (!isKnownProcessRule(assignment.ruleId)) failures.push(`Invalid rule ${assignment.ruleId} at ${key}`);
    if (!SAMPLING_PROCESS_STATES.includes(assignment.state)) failures.push(`Invalid state ${assignment.state} at ${key}`);
    if (!rule.allowedStates.includes(assignment.state)) failures.push(`State ${assignment.state} is not valid for ${ruleId} at ${key}`);
    if (assignment.groupId != null && !model.groups?.[String(assignment.groupId)]) failures.push(`Missing group definition ${assignment.groupId}`);
  }
  return {
    status: failures.length ? 'FAIL' : 'PASS',
    failures,
    paintedCellCount: Object.keys(model?.cells ?? {}).length,
    groupCount: Object.keys(model?.groups ?? {}).length
  };
}

export function normalizeCellAssignment(value = {}) {
  const ruleId = normalizeRuleOverride(value.ruleId ?? value.rule ?? 'propagatingFront') ?? 'inherit';
  const stateRuleId = ruleId === 'inherit' ? null : ruleId;
  return {
    state: normalizeSamplingProcessState(value.state ?? 'active', stateRuleId),
    ruleId,
    groupId: normalizeGroupId(value.groupId ?? value.group ?? 1),
    sourceValue: clamp01(value.sourceValue ?? value.source ?? 1),
    temporalRuleId: value.temporalRuleId ?? null,
    valueMapId: value.valueMapId ?? 'activation-to-sampling-value',
    parameters: value.parameters ?? {}
  };
}

function normalizeRuleOverride(value) {
  if (value == null || value === '' || value === 'inherit') return null;
  const normalized = normalizeProcessRuleId(value);
  if (normalized === 'inert' && !['inert', 'none', 'noRule'].includes(value)) return String(value);
  return normalized;
}

export function normalizeGroupDefinition(value = {}) {
  const id = normalizeGroupId(value.id ?? 1);
  return {
    id,
    label: value.label ?? `Group ${id}`,
    ruleId: normalizeSamplingProcessRuleId(value.ruleId ?? 'propagatingFront'),
    temporalRuleId: value.temporalRuleId ?? null,
    interactionScale: value.interactionScale ?? 'edge',
    valueMapId: value.valueMapId ?? 'activation-to-sampling-value',
    sourceProfile: value.sourceProfile ?? 'painted',
    parameters: value.parameters ?? {}
  };
}

function cellKey(cell) {
  const col = Math.round(Number(cell?.col ?? cell?.x));
  const row = Math.round(Number(cell?.row ?? cell?.y));
  if (!Number.isInteger(col) || !Number.isInteger(row)) return null;
  return `${col},${row}`;
}

function parseCellKey(key) {
  const [col, row] = String(key).split(',').map((part) => Math.round(Number(part)));
  return { col, row };
}

function normalizeGroupId(value) {
  const id = Math.max(0, Math.round(Number(value) || 0));
  return id;
}

function clamp01(value) {
  const number = Number(value);
  if (!Number.isFinite(number)) return 0;
  return Math.max(0, Math.min(1, number));
}
