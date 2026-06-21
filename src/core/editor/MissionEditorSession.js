import { applyMissionEditorCommand, createMissionEditorCommand } from './MissionEditorCommand.js';
import { createMissionEditorDocument, missionEditorDocumentDigest, missionEditorDocumentSummary, normalizeMissionEditorDocument } from './MissionEditorDocument.js';
import { validateMissionEditorDocument } from './MissionEditorValidation.js';

export const MISSION_EDITOR_SESSION_VERSION = 'mission-editor-session-three-r2b';

export function createMissionEditorSession(source = {}, options = {}) {
  const document = source?.type === 'anchor.editor.mission-document' ? normalizeMissionEditorDocument(source) : createMissionEditorDocument(source, options);
  const validation = validateMissionEditorDocument(document);
  return {
    type: 'anchor.editor.session',
    version: MISSION_EDITOR_SESSION_VERSION,
    sessionId: options.sessionId ?? `mission-editor-${Date.now().toString(36)}`,
    document,
    baselineDocument: normalizeMissionEditorDocument(document),
    history: [],
    redoStack: [],
    commandCount: 0,
    rejectedCommandCount: 0,
    lastCommandResult: null,
    validation,
    boundaryFlags: {
      rendererOwnsState: false,
      ownsSimulationState: false,
      ownsScoring: false,
      usesNewPlanner: false,
      usesRouteOptimizer: false
    }
  };
}

export function applyMissionEditorSessionCommand(session, command) {
  if (!session) throw new Error('applyMissionEditorSessionCommand requires a session.');
  const normalizedCommand = command?.type === 'anchor.editor.command' ? command : createMissionEditorCommand(command.commandType ?? command.type, command.payload ?? command);
  const previous = normalizeMissionEditorDocument(session.document);
  const result = applyMissionEditorCommand(previous, normalizedCommand);
  session.commandCount = Number(session.commandCount ?? 0) + 1;
  session.lastCommandResult = result;
  if (result.accepted) {
    session.history = [...(session.history ?? []), { command: normalizedCommand, beforeDigest: result.beforeDigest, afterDigest: result.afterDigest }].slice(-100);
    session.redoStack = [];
    session.document = result.document;
    session.validation = result.validation;
  } else {
    session.rejectedCommandCount = Number(session.rejectedCommandCount ?? 0) + 1;
    session.validation = result.validation;
  }
  return result;
}

export function replaceMissionEditorSessionDocument(session, document) {
  const next = normalizeMissionEditorDocument(document);
  session.document = next;
  session.baselineDocument = normalizeMissionEditorDocument(next);
  session.history = [];
  session.redoStack = [];
  session.lastCommandResult = null;
  session.validation = validateMissionEditorDocument(next);
  return session;
}

export function resetMissionEditorSession(session) {
  if (!session?.baselineDocument) return session;
  session.document = normalizeMissionEditorDocument(session.baselineDocument);
  session.history = [];
  session.redoStack = [];
  session.lastCommandResult = null;
  session.validation = validateMissionEditorDocument(session.document);
  return session;
}

export function missionEditorSessionSummary(session = {}) {
  const validation = session.validation ?? validateMissionEditorDocument(session.document ?? {});
  const documentSummary = missionEditorDocumentSummary(session.document ?? {});
  return {
    type: 'anchor.editor.session-summary',
    version: MISSION_EDITOR_SESSION_VERSION,
    sessionId: session.sessionId ?? null,
    documentId: documentSummary.documentId ?? null,
    levelId: documentSummary.levelId ?? null,
    missionId: documentSummary.missionId ?? null,
    digest: missionEditorDocumentDigest(session.document ?? {}),
    commandCount: Number(session.commandCount ?? 0),
    acceptedCommandCount: Number(session.history?.length ?? 0),
    rejectedCommandCount: Number(session.rejectedCommandCount ?? 0),
    lastCommandType: session.lastCommandResult?.command?.commandType ?? null,
    lastCommandAccepted: session.lastCommandResult?.accepted ?? null,
    validationStatus: validation.status ?? 'UNKNOWN',
    exportAllowed: validation.exportAllowed === true,
    previewAllowed: validation.previewAllowed === true,
    rendererOwnsState: false,
    ownsSimulationState: false,
    ownsScoring: false,
    usesNewPlanner: false,
    usesRouteOptimizer: false
  };
}
