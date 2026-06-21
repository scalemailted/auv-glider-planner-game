import { normalizeMissionEditorDocument, missionEditorDocumentSummary } from './MissionEditorDocument.js';

export const MISSION_EDITOR_VALIDATION_VERSION = 'mission-editor-validation-three-r2b';

export function validateMissionEditorDocument(document = {}, options = {}) {
  const doc = normalizeMissionEditorDocument(document);
  const issues = [];
  const grid = doc.level?.world?.grid ?? {};
  const width = Number(grid.width ?? 0);
  const height = Number(grid.height ?? 0);
  if (!width || !height) issue(issues, 'error', 'GRID_MISSING', 'Mission editor document requires world.grid.width and world.grid.height.', 'level.world.grid');
  if (width < 1 || height < 1 || width > 128 || height > 128) issue(issues, 'error', 'GRID_SIZE_UNSUPPORTED', 'Mission editor grid must be between 1 and 128 cells in each dimension.', 'level.world.grid');
  validateGridLayer(issues, doc.level?.layers?.terrain, width, height, 'TERRAIN_GRID_SHAPE', 'level.layers.terrain');
  validateGridLayer(issues, doc.level?.layers?.hazards, width, height, 'HAZARD_GRID_SHAPE', 'level.layers.hazards', { optional: true });
  validateFrames(issues, doc.level?.layers?.truth?.frames, width, height);
  validateZones(issues, doc.level?.zones ?? [], width, height);
  validateBases(issues, doc.level?.layers?.bases ?? [], width, height);
  validateAgents(issues, doc.mission?.agents ?? [], width, height, doc.level);
  if (doc.metadata?.calibratedOceanForecast === true || doc.level?.meta?.calibratedOceanForecast === true) {
    issue(issues, 'error', 'CALIBRATED_FORECAST_CLAIM_BLOCKED', 'Mission editor exports must not claim calibrated ocean forecast output in this phase.', 'metadata.calibratedOceanForecast');
  }
  if (containsHiddenTruthLeak(doc.level)) {
    issue(issues, 'error', 'HIDDEN_TRUTH_EXPORT_LEAK', 'Editor export contains solver-hidden truth/debug keys in public level metadata.', 'level');
  }
  if (!doc.level?.meta?.generationConfig?.currentGenerator?.note) {
    issue(issues, 'warning', 'SYNTHETIC_CLAIM_RECOMMENDED', 'Synthetic current/field metadata should state that fields are gameplay models, not calibrated forecasts.', 'level.meta.generationConfig.currentGenerator.note');
  }
  if (!doc.mission?.agents?.length) issue(issues, 'error', 'MISSION_AGENT_MISSING', 'Mission editor requires at least one glider agent.', 'mission.agents');
  const errors = issues.filter((entry) => entry.severity === 'error');
  const warnings = issues.filter((entry) => entry.severity === 'warning');
  const status = errors.length ? 'INVALID' : warnings.length ? 'VALID_WITH_WARNINGS' : 'VALID';
  return {
    type: 'anchor.editor.validation-report',
    version: MISSION_EDITOR_VALIDATION_VERSION,
    status,
    valid: errors.length === 0,
    exportAllowed: errors.length === 0,
    previewAllowed: errors.length === 0,
    issues,
    errors,
    warnings,
    summary: missionEditorDocumentSummary(doc),
    boundaryFlags: {
      ownsSimulationState: false,
      ownsScoring: false,
      ownsRendererState: false,
      usesNewPlanner: false,
      changesOfficialBrowserScoring: false
    }
  };
}

export function validateMissionEditorExport(level = {}, mission = null) {
  return validateMissionEditorDocument({ level, mission: mission ?? level?.missionDefaults ?? null });
}

export function missionEditorValidationSummary(report = {}) {
  return {
    type: 'anchor.editor.validation-summary',
    version: MISSION_EDITOR_VALIDATION_VERSION,
    status: report.status ?? 'UNKNOWN',
    valid: report.valid === true,
    exportAllowed: report.exportAllowed === true,
    previewAllowed: report.previewAllowed === true,
    errorCount: report.errors?.length ?? report.issues?.filter?.((entry) => entry.severity === 'error')?.length ?? 0,
    warningCount: report.warnings?.length ?? report.issues?.filter?.((entry) => entry.severity === 'warning')?.length ?? 0,
    firstIssue: report.issues?.[0]?.message ?? null
  };
}

function validateGridLayer(issues, layer, width, height, code, path, options = {}) {
  if (!Array.isArray(layer)) {
    if (!options.optional) issue(issues, 'error', code, `${path} must be a ${height} x ${width} grid.`, path);
    return;
  }
  if (layer.length !== height) issue(issues, 'error', code, `${path} row count ${layer.length} does not match grid height ${height}.`, path);
  for (let y = 0; y < Math.min(layer.length, height); y += 1) {
    if (!Array.isArray(layer[y]) || layer[y].length !== width) issue(issues, 'error', code, `${path}[${y}] width does not match grid width ${width}.`, `${path}[${y}]`);
  }
}

function validateFrames(issues, frames, width, height) {
  if (!Array.isArray(frames) || !frames.length) {
    issue(issues, 'error', 'TRUTH_FRAMES_MISSING', 'Mission editor level requires layers.truth.frames.', 'level.layers.truth.frames');
    return;
  }
  frames.forEach((frame, index) => {
    validateGridLayer(issues, frame.roi, width, height, 'ROI_FRAME_GRID_SHAPE', `level.layers.truth.frames[${index}].roi`);
    if (!Array.isArray(frame.current)) issue(issues, 'error', 'CURRENT_FRAME_GRID_SHAPE', `Current frame ${index} must include a vector grid.`, `level.layers.truth.frames[${index}].current`);
    else {
      validateGridLayer(issues, frame.current, width, height, 'CURRENT_FRAME_GRID_SHAPE', `level.layers.truth.frames[${index}].current`);
      for (let y = 0; y < Math.min(height, frame.current.length); y += 1) for (let x = 0; x < Math.min(width, frame.current[y]?.length ?? 0); x += 1) {
        const vector = frame.current[y]?.[x];
        if (!Array.isArray(vector) || vector.length < 2 || !Number.isFinite(Number(vector[0])) || !Number.isFinite(Number(vector[1]))) {
          issue(issues, 'error', 'CURRENT_VECTOR_INVALID', `Current vector at (${x}, ${y}) in frame ${index} must be [u, v].`, `level.layers.truth.frames[${index}].current[${y}][${x}]`);
          return;
        }
      }
    }
  });
}

function validateZones(issues, zones, width, height) {
  if (!Array.isArray(zones)) return issue(issues, 'warning', 'ZONES_INVALID', 'Level zones should be an array.', 'level.zones');
  zones.forEach((zone, zoneIndex) => {
    (zone.cells ?? []).forEach((cell, cellIndex) => {
      if (!inBounds(cell, width, height)) issue(issues, 'error', 'ZONE_CELL_OUT_OF_BOUNDS', `Zone ${zone.id ?? zoneIndex} has a cell outside the grid.`, `level.zones[${zoneIndex}].cells[${cellIndex}]`);
    });
  });
}

function validateBases(issues, bases, width, height) {
  bases.forEach((base, index) => {
    if (!inBounds(base, width, height)) issue(issues, 'error', 'BASE_OUT_OF_BOUNDS', `Base ${base.id ?? index} is outside the grid.`, `level.layers.bases[${index}]`);
  });
}

function validateAgents(issues, agents, width, height, level) {
  agents.forEach((agent, index) => {
    const start = agent.start ?? agent.deployment?.selectedStart ?? null;
    if (start && !inBounds(start, width, height)) issue(issues, 'error', 'AGENT_START_OUT_OF_BOUNDS', `Agent ${agent.id ?? index} start is outside the grid.`, `mission.agents[${index}].start`);
    if (start && Number(level?.layers?.terrain?.[Math.round(start.y)]?.[Math.round(start.x)] ?? 0) > 0) issue(issues, 'error', 'AGENT_START_ON_LAND', `Agent ${agent.id ?? index} start is on terrain/land.`, `mission.agents[${index}].start`);
  });
}

function containsHiddenTruthLeak(value) {
  const blockedKey = /^(solverHidden|hiddenTruth|t_hiddenTruth|oracleDebug|debugHiddenTruth)$/i;
  const blockedValue = /\b(t_hiddentruth|oracledebug)\b/i;
  const forbiddenHiddenValue = (node) => {
    if (node == null || node === false) return false;
    if (typeof node === 'number') return node !== 0;
    if (typeof node === 'string') return node.trim().length > 0;
    if (Array.isArray(node)) return node.length > 0;
    if (typeof node === 'object') return Object.keys(node).length > 0;
    return Boolean(node);
  };
  const visit = (node) => {
    if (node == null) return false;
    if (typeof node === 'string') return blockedValue.test(node);
    if (typeof node !== 'object') return false;
    if (Array.isArray(node)) return node.some(visit);
    return Object.entries(node).some(([key, child]) => (blockedKey.test(key) && forbiddenHiddenValue(child)) || visit(child));
  };
  return visit(value);
}

function inBounds(cell, width, height) {
  const x = Number(cell?.x ?? cell?.col);
  const y = Number(cell?.y ?? cell?.row);
  return Number.isFinite(x) && Number.isFinite(y) && x >= 0 && y >= 0 && x < width && y < height;
}

function issue(issues, severity, code, message, path) {
  issues.push({ severity, code, message, path });
}


