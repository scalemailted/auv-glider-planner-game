export const ADAPTIVE_SURFACING_EVENT_VERSION = 'adaptive-surfacing-event-p6';

export function createCommunicationWindowRecord(options = {}) {
  const startTime = finiteNumber(options.startTime ?? options.time, 0);
  const durationSeconds = Math.max(0, finiteNumber(options.durationSeconds, 300));
  return {
    type: 'anchor.benchmark.communication-window',
    version: ADAPTIVE_SURFACING_EVENT_VERSION,
    windowId: String(options.windowId ?? `comm-${Math.round(startTime)}`),
    startTime,
    endTime: finiteNumber(options.endTime, startTime + durationSeconds),
    durationSeconds,
    linkType: String(options.linkType ?? 'surface-radio'),
    bandwidthClass: String(options.bandwidthClass ?? 'teaching-demo'),
    objectiveUpdateAllowed: options.objectiveUpdateAllowed !== false,
    notes: normalizeStringList(options.notes)
  };
}

export function createAdaptiveSurfacingEvent(options = {}) {
  const time = finiteNumber(options.time, 0);
  return {
    type: 'anchor.benchmark.adaptive-surfacing-event',
    version: ADAPTIVE_SURFACING_EVENT_VERSION,
    episodeId: String(options.episodeId ?? 'adaptive-preview-episode'),
    time,
    gliderId: String(options.gliderId ?? 'glider-1'),
    position: normalizePosition(options.position),
    samplesUploaded: Math.max(0, Math.round(finiteNumber(options.samplesUploaded, 0))),
    observationsReceived: Math.max(0, Math.round(finiteNumber(options.observationsReceived, options.samplesUploaded ?? 0))),
    communicationWindow: options.communicationWindow?.type === 'anchor.benchmark.communication-window'
      ? cloneJson(options.communicationWindow)
      : createCommunicationWindowRecord({ time, ...(options.communicationWindow ?? {}) }),
    diagnosisTriggered: Boolean(options.diagnosisTriggered ?? true),
    objectiveUpdateAllowed: options.objectiveUpdateAllowed !== false,
    eventType: String(options.eventType ?? 'scheduledSurfacing'),
    notes: normalizeStringList(options.notes)
  };
}

export function validateCommunicationWindowRecord(record = {}) {
  const errors = [];
  const warnings = [];
  if (!record || typeof record !== 'object') {
    return { status: 'FAIL', valid: false, errors: ['Communication window record must be an object.'], warnings };
  }
  if (record.type !== 'anchor.benchmark.communication-window') errors.push(`Expected type anchor.benchmark.communication-window, got ${record.type ?? 'missing'}.`);
  if (!record.windowId) errors.push('windowId is required.');
  if (!Number.isFinite(Number(record.startTime))) errors.push('startTime must be finite.');
  if (!Number.isFinite(Number(record.endTime))) errors.push('endTime must be finite.');
  if (Number(record.endTime) < Number(record.startTime)) errors.push('endTime must be after startTime.');
  if (!Number.isFinite(Number(record.durationSeconds))) errors.push('durationSeconds must be finite.');
  return {
    status: errors.length ? 'FAIL' : warnings.length ? 'WARN' : 'PASS',
    valid: errors.length === 0,
    errors,
    warnings
  };
}

export function validateAdaptiveSurfacingEvent(event = {}) {
  const errors = [];
  const warnings = [];
  if (!event || typeof event !== 'object') {
    return { status: 'FAIL', valid: false, errors: ['Adaptive surfacing event must be an object.'], warnings };
  }
  if (event.type !== 'anchor.benchmark.adaptive-surfacing-event') errors.push(`Expected type anchor.benchmark.adaptive-surfacing-event, got ${event.type ?? 'missing'}.`);
  if (!event.episodeId) errors.push('episodeId is required.');
  if (!event.gliderId) errors.push('gliderId is required.');
  if (!Number.isFinite(Number(event.time))) errors.push('time must be finite.');
  if (!event.position || typeof event.position !== 'object') errors.push('position is required.');
  if (!Number.isFinite(Number(event.samplesUploaded))) errors.push('samplesUploaded must be finite.');
  if (!Number.isFinite(Number(event.observationsReceived))) errors.push('observationsReceived must be finite.');
  const commValidation = validateCommunicationWindowRecord(event.communicationWindow);
  if (!commValidation.valid) errors.push(...commValidation.errors.map((message) => `communicationWindow: ${message}`));
  return {
    status: errors.length ? 'FAIL' : warnings.length ? 'WARN' : 'PASS',
    valid: errors.length === 0,
    errors,
    warnings
  };
}

export function adaptiveSurfacingEventSummary(eventInput = {}) {
  const event = createAdaptiveSurfacingEvent(eventInput);
  return {
    type: event.type,
    episodeId: event.episodeId,
    gliderId: event.gliderId,
    time: event.time,
    samplesUploaded: event.samplesUploaded,
    observationsReceived: event.observationsReceived,
    diagnosisTriggered: event.diagnosisTriggered,
    objectiveUpdateAllowed: event.objectiveUpdateAllowed,
    communicationWindowId: event.communicationWindow.windowId,
    summary: `${event.gliderId} surfaced at t=${event.time} with ${event.observationsReceived} observation(s).`
  };
}

function normalizePosition(position = {}) {
  return {
    x: finiteNumber(position.x, 0),
    y: finiteNumber(position.y, 0),
    t: finiteNumber(position.t, finiteNumber(position.time, 0))
  };
}

function normalizeStringList(value) {
  return Array.isArray(value)
    ? value.map((entry) => String(entry ?? '').trim()).filter(Boolean)
    : [];
}

function finiteNumber(value, fallback) {
  const number = Number(value);
  return Number.isFinite(number) ? number : fallback;
}

function cloneJson(value) {
  if (value === undefined || value === null) return value ?? null;
  try {
    return JSON.parse(JSON.stringify(value));
  } catch {
    return value;
  }
}
