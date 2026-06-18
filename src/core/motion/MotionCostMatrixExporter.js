import { createMotionCostGraphConfig } from './MotionCostGraphSchema.js';
import { sanitizeMotionCostMatrixForPublicExport, validateMotionCostMatrixPublicSafety } from './MotionCostGraphPublicSafety.js';

export const MOTION_COST_MATRIX_EXPORTER_VERSION = 'motion-cost-matrix-exporter-sim-r1';

export function buildMotionCostMatrix(graph = {}, options = {}) {
  const config = graph.config?.type === 'anchor.motion.cost-graph-config'
    ? graph.config
    : createMotionCostGraphConfig({ ...(graph.config ?? {}), ...(options.config ?? {}) });
  const nodes = Array.isArray(graph.nodes) ? graph.nodes : [];
  const edges = Array.isArray(graph.edges) ? graph.edges : [];
  const requestedFormat = options.matrixFormat ?? config.matrixFormat ?? 'auto';
  const format = requestedFormat === 'auto' ? (nodes.length <= 64 ? 'dense' : 'sparse') : requestedFormat;
  const nodeIds = nodes.map((node) => String(node.nodeId));
  const nodeIndex = Object.fromEntries(nodeIds.map((nodeId, index) => [nodeId, index]));
  const feasibleEdges = edges.filter((edge) => ['feasible', 'warning'].includes(edge.status) && Number.isFinite(Number(edge.weightedCost)));
  const sparseEntries = feasibleEdges.map((edge) => ({
    from: edge.fromNodeId,
    to: edge.toNodeId,
    fromIndex: nodeIndex[edge.fromNodeId],
    toIndex: nodeIndex[edge.toNodeId],
    cost: round(edge.weightedCost),
    metricId: config.metricId,
    status: edge.status,
    distanceMeters: round(edge.distanceMeters),
    durationSeconds: round(edge.durationSeconds),
    energyCost: round(edge.energyCost),
    departureTimeSeconds: round(edge.departureTimeSeconds ?? 0)
  })).filter((entry) => Number.isInteger(entry.fromIndex) && Number.isInteger(entry.toIndex));
  const matrix = {
    type: 'anchor.headless.motion-cost-matrix',
    version: MOTION_COST_MATRIX_EXPORTER_VERSION,
    schemaVersion: '1.0',
    graphId: graph.graphId ?? null,
    metricId: config.metricId,
    matrixFormat: format,
    directed: config.directed !== false,
    nodeIds,
    nodeCount: nodeIds.length,
    edgeCount: sparseEntries.length,
    entries: sparseEntries,
    adjacencyMatrix: format === 'dense' ? buildDenseMatrix(nodeIds.length, sparseEntries) : null,
    rowMajorNodeOrder: nodeIds,
    summary: null,
    visibilityTier: 'publicScenario',
    publicSafe: true,
    hiddenTruthIncluded: false,
    generatedRoute: false,
    usesNewPlanner: false,
    usesRouteOptimizer: false,
    usesMARL: false,
    browserOfficialScoring: false,
    notA: ['not route planner', 'not route optimizer', 'not official scoring', 'not operational certification', 'not MARL/RL']
  };
  matrix.summary = motionCostMatrixSummary(matrix);
  return sanitizeMotionCostMatrixForPublicExport(matrix);
}

export function motionCostMatrixSummary(matrix = {}) {
  const costs = (matrix.entries ?? []).map((entry) => Number(entry.cost)).filter(Number.isFinite);
  return {
    type: 'anchor.headless.motion-cost-matrix-summary',
    version: MOTION_COST_MATRIX_EXPORTER_VERSION,
    graphId: matrix.graphId ?? null,
    metricId: matrix.metricId ?? null,
    matrixFormat: matrix.matrixFormat ?? null,
    directed: matrix.directed !== false,
    nodeCount: matrix.nodeCount ?? matrix.nodeIds?.length ?? 0,
    edgeCount: matrix.edgeCount ?? matrix.entries?.length ?? 0,
    finiteCostCount: costs.length,
    minCost: costs.length ? round(Math.min(...costs)) : null,
    maxCost: costs.length ? round(Math.max(...costs)) : null,
    meanCost: costs.length ? round(costs.reduce((sum, value) => sum + value, 0) / costs.length) : null,
    publicSafe: matrix.publicSafe !== false,
    hiddenTruthIncluded: matrix.hiddenTruthIncluded === true,
    generatedRoute: false,
    usesNewPlanner: false,
    usesRouteOptimizer: false,
    usesMARL: false,
    browserOfficialScoring: false
  };
}

export function validateMotionCostMatrix(matrix = {}) {
  const errors = [];
  const warnings = [];
  if (matrix?.type !== 'anchor.headless.motion-cost-matrix') errors.push(`Expected anchor.headless.motion-cost-matrix, got ${matrix?.type ?? 'missing'}.`);
  if (!Array.isArray(matrix?.nodeIds)) errors.push('Motion cost matrix must include nodeIds[].');
  if (!Array.isArray(matrix?.entries)) errors.push('Motion cost matrix must include entries[].');
  for (const [index, entry] of (matrix.entries ?? []).entries()) {
    for (const field of ['from', 'to', 'fromIndex', 'toIndex', 'cost']) {
      if (entry[field] === undefined || entry[field] === null || entry[field] === '') errors.push(`entry ${index + 1}: missing ${field}.`);
    }
    if (!Number.isFinite(Number(entry.cost))) errors.push(`entry ${index + 1}: cost must be finite.`);
  }
  const safety = validateMotionCostMatrixPublicSafety(matrix);
  errors.push(...safety.errors);
  warnings.push(...safety.warnings);
  return { valid: errors.length === 0, status: errors.length ? 'FAIL' : warnings.length ? 'WARN' : 'PASS', errors, warnings, safety };
}

export function motionCostMatrixToCsv(matrix = {}) {
  const columns = ['from', 'to', 'fromIndex', 'toIndex', 'cost', 'metricId', 'status', 'distanceMeters', 'durationSeconds', 'energyCost', 'departureTimeSeconds'];
  const rows = Array.isArray(matrix.entries) ? matrix.entries : [];
  return `${columns.join(',')}\n${rows.map((row) => columns.map((column) => csvValue(row[column])).join(',')).join('\n')}\n`;
}

function buildDenseMatrix(size, entries) {
  const matrix = Array.from({ length: size }, (_row, rowIndex) => Array.from({ length: size }, (_col, colIndex) => (rowIndex === colIndex ? 0 : null)));
  for (const entry of entries) matrix[entry.fromIndex][entry.toIndex] = entry.cost;
  return matrix;
}

function csvValue(value) {
  if (value === null || value === undefined) return '';
  const text = String(value);
  return /[",\n]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
}

function round(value) {
  return Number(Number(value ?? 0).toFixed(6));
}
