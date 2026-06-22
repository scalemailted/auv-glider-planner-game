import {
  SURFACING_DECISION_ACTION,
  SURFACING_DECISION_STATUS,
  SURFACING_DECISION_STATE_VERSION,
  normalizeSurfacingDecisionAction,
  surfacingDecisionStateSummary,
  digestSurfacingPublicState
} from './SurfacingDecisionState.js';

export const SURFACING_DECISION_TRANSACTION_VERSION = 'surface-decision-transaction-r1';

const TERMINAL_STATUSES = new Set(['resolved', 'cancelled', 'failed']);

export function createSurfacingDecisionTransaction({ decisionState = null, previous = null, requestedAt = null } = {}) {
  if (previous?.type === 'anchor.simulation.surfacing-decision-transaction' && previous.decisionId === decisionState?.id) {
    return normalizeSurfacingDecisionTransaction(previous);
  }
  const now = requestedAt ?? new Date().toISOString();
  const transaction = {
    schemaVersion: 1,
    type: 'anchor.simulation.surfacing-decision-transaction',
    version: SURFACING_DECISION_TRANSACTION_VERSION,
    transactionId: `surface-decision-tx-${digestSurfacingPublicState({ id: decisionState?.id ?? 'unknown', at: now })}`,
    decisionId: decisionState?.id ?? null,
    missionId: decisionState?.missionId ?? null,
    levelId: decisionState?.levelId ?? null,
    agentId: decisionState?.agentId ?? null,
    status: 'pending',
    selectedAction: null,
    resolvedAction: null,
    requestedAt: now,
    updatedAt: now,
    resolvedAt: null,
    duplicateActionSuppressionCount: 0,
    stages: [],
    events: [],
    decisionSummary: surfacingDecisionStateSummary(decisionState ?? {}),
    boundaryFlags: {
      playerMustChooseRoute: true,
      createsNewPlanner: false,
      changesOfficialScoring: false,
      resetsSimulationClock: false,
      rendererOwnsSimulationState: false,
      canonicalEngineOwnsSurfacing: true
    }
  };
  appendStage(transaction, 'surfacingDetected', { decisionId: transaction.decisionId, agentId: transaction.agentId });
  appendStage(transaction, 'simulationPaused', { time: decisionState?.time ?? null });
  appendStage(transaction, 'decisionOpened', { status: decisionState?.status ?? SURFACING_DECISION_STATUS.PENDING });
  return transaction;
}

export function normalizeSurfacingDecisionTransaction(value = {}) {
  if (!value || typeof value !== 'object') return null;
  return {
    ...cloneJson(value),
    schemaVersion: value.schemaVersion ?? 1,
    version: value.version ?? SURFACING_DECISION_TRANSACTION_VERSION,
    status: value.status ?? 'pending',
    duplicateActionSuppressionCount: Number(value.duplicateActionSuppressionCount ?? 0),
    stages: Array.isArray(value.stages) ? value.stages : [],
    events: Array.isArray(value.events) ? value.events : [],
    boundaryFlags: {
      playerMustChooseRoute: true,
      createsNewPlanner: false,
      changesOfficialScoring: false,
      resetsSimulationClock: false,
      rendererOwnsSimulationState: false,
      canonicalEngineOwnsSurfacing: true,
      ...(value.boundaryFlags ?? {})
    }
  };
}

export function acceptSurfacingDecisionAction(transaction = {}, action, details = {}) {
  const normalizedAction = normalizeSurfacingDecisionAction(action);
  if (!normalizedAction) throw new Error(`Unknown surfacing decision action: ${action}`);
  const next = normalizeSurfacingDecisionTransaction(transaction);
  if (!next) throw new Error('Surfacing decision transaction must be an object.');
  if (TERMINAL_STATUSES.has(next.status)) {
    next.duplicateActionSuppressionCount += 1;
    appendEvent(next, 'duplicateActionSuppressed', { action: normalizedAction, reason: 'terminalTransaction' });
    return next;
  }
  if (next.selectedAction && next.selectedAction !== normalizedAction && next.status !== 'replanning') {
    next.duplicateActionSuppressionCount += 1;
    appendEvent(next, 'duplicateActionSuppressed', { action: normalizedAction, selectedAction: next.selectedAction, reason: 'actionAlreadySelected' });
    return next;
  }
  next.selectedAction = normalizedAction;
  next.updatedAt = details.at ?? new Date().toISOString();
  next.status = statusForSelectedAction(normalizedAction);
  appendStage(next, 'actionSelected', { action: normalizedAction, ...publicDetails(details) });
  return next;
}

export function commitSurfacingDecisionAction(transaction = {}, action, details = {}) {
  const normalizedAction = normalizeSurfacingDecisionAction(action);
  let next = acceptSurfacingDecisionAction(transaction, normalizedAction, details);
  if (TERMINAL_STATUSES.has(next.status) && next.resolvedAction) return next;
  next.status = 'resolved';
  next.resolvedAction = normalizedAction;
  next.resolvedAt = details.at ?? new Date().toISOString();
  next.updatedAt = next.resolvedAt;
  appendStage(next, 'actionCommitted', { action: normalizedAction, ...publicDetails(details) });
  return next;
}

export function startSurfacingReplan(transaction = {}, details = {}) {
  let next = acceptSurfacingDecisionAction(transaction, SURFACING_DECISION_ACTION.UPDATE_WAYPOINTS, details);
  if (TERMINAL_STATUSES.has(next.status)) return next;
  next.status = 'replanning';
  appendStage(next, 'replanHandoffCreated', publicDetails(details));
  return next;
}

export function commitSurfacingReplan(transaction = {}, details = {}) {
  let next = normalizeSurfacingDecisionTransaction(transaction);
  if (!next?.selectedAction) next = acceptSurfacingDecisionAction(next, SURFACING_DECISION_ACTION.UPDATE_WAYPOINTS, details);
  if (TERMINAL_STATUSES.has(next.status) && next.resolvedAction) return next;
  next.status = 'resolved';
  next.resolvedAction = SURFACING_DECISION_ACTION.UPDATE_WAYPOINTS;
  next.resolvedAt = details.at ?? new Date().toISOString();
  next.updatedAt = next.resolvedAt;
  appendStage(next, 'replanCommitted', publicDetails(details));
  return next;
}

export function cancelSurfacingReplan(transaction = {}, details = {}) {
  const next = normalizeSurfacingDecisionTransaction(transaction);
  if (!next) throw new Error('Surfacing decision transaction must be an object.');
  if (next.status === 'resolved') {
    next.duplicateActionSuppressionCount += 1;
    appendEvent(next, 'duplicateActionSuppressed', { reason: 'resolvedCannotCancel' });
    return next;
  }
  next.status = 'cancelled';
  next.updatedAt = details.at ?? new Date().toISOString();
  appendStage(next, 'replanCancelled', publicDetails(details));
  return next;
}

export function validateSurfacingDecisionTransaction(transaction = {}) {
  const errors = [];
  const warnings = [];
  if (transaction?.type !== 'anchor.simulation.surfacing-decision-transaction') errors.push('Surfacing decision transaction type must be anchor.simulation.surfacing-decision-transaction.');
  if ((transaction?.version ?? SURFACING_DECISION_TRANSACTION_VERSION) !== SURFACING_DECISION_TRANSACTION_VERSION) errors.push(`Surfacing decision transaction version must be ${SURFACING_DECISION_TRANSACTION_VERSION}.`);
  if (!transaction?.transactionId) errors.push('Surfacing decision transaction requires a transactionId.');
  if (!transaction?.decisionId) errors.push('Surfacing decision transaction requires a decisionId.');
  if (!Array.isArray(transaction?.stages) || transaction.stages.length < 3) errors.push('Surfacing decision transaction should include detection, pause, and open stages.');
  if (transaction?.boundaryFlags?.createsNewPlanner !== false) errors.push('Surfacing transaction must not create a planner.');
  if (transaction?.boundaryFlags?.changesOfficialScoring !== false) errors.push('Surfacing transaction must not change official scoring.');
  if (transaction?.status === 'resolved' && !transaction?.resolvedAction) warnings.push('Resolved surfacing transaction should include resolvedAction.');
  return { ok: errors.length === 0, valid: errors.length === 0, errors, warnings, summary: surfacingDecisionTransactionSummary(transaction) };
}

export function surfacingDecisionTransactionSummary(transaction = {}) {
  return {
    type: transaction?.type ?? 'anchor.simulation.surfacing-decision-transaction',
    version: transaction?.version ?? SURFACING_DECISION_TRANSACTION_VERSION,
    transactionId: transaction?.transactionId ?? null,
    decisionId: transaction?.decisionId ?? null,
    status: transaction?.status ?? null,
    selectedAction: transaction?.selectedAction ?? null,
    resolvedAction: transaction?.resolvedAction ?? null,
    stageCount: transaction?.stages?.length ?? 0,
    completedStages: (transaction?.stages ?? []).map((stage) => stage.stage),
    duplicateActionSuppressionCount: Number(transaction?.duplicateActionSuppressionCount ?? 0),
    decisionSummary: cloneJson(transaction?.decisionSummary ?? null),
    boundaryFlags: cloneJson(transaction?.boundaryFlags ?? null)
  };
}

function statusForSelectedAction(action) {
  if (action === SURFACING_DECISION_ACTION.CONTINUE_ORIGINAL_PLAN) return 'continuing';
  if (action === SURFACING_DECISION_ACTION.UPDATE_WAYPOINTS) return 'replanning';
  if (action === SURFACING_DECISION_ACTION.FINISH_MISSION) return 'finishing';
  if (action === SURFACING_DECISION_ACTION.EXPORT_OBSERVATIONS) return 'exporting';
  if (action === SURFACING_DECISION_ACTION.IMPORT_WAYPOINTS) return 'importing';
  return 'pending';
}

function appendStage(transaction, stage, details = {}) {
  const entry = {
    stage,
    at: details.at ?? new Date().toISOString(),
    details: publicDetails(details)
  };
  delete entry.details.at;
  transaction.stages.push(entry);
  appendEvent(transaction, stage, entry.details, entry.at);
  transaction.updatedAt = entry.at;
  return transaction;
}

function appendEvent(transaction, eventType, details = {}, at = null) {
  transaction.events.push({
    type: `anchor.simulation.surfacing-transaction.${eventType}`,
    at: at ?? new Date().toISOString(),
    transactionId: transaction.transactionId,
    decisionId: transaction.decisionId,
    agentId: transaction.agentId,
    details: publicDetails(details)
  });
}

function publicDetails(details = {}) {
  return cloneJson(details) ?? {};
}

function cloneJson(value) {
  if (value === undefined || value === null) return value ?? null;
  return JSON.parse(JSON.stringify(value));
}

export { SURFACING_DECISION_ACTION, SURFACING_DECISION_STATUS, SURFACING_DECISION_STATE_VERSION };