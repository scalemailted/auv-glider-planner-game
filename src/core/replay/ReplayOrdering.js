export const REPLAY_EVENT_PHASE_ORDER = Object.freeze([
  'initial',
  'command',
  'diveProfile',
  'multiAgentAssignment',
  'objective',
  'communication',
  'replanning',
  'vehicleState',
  'observation',
  'surfacing',
  'checkpoint',
  'score',
  'terminal'
]);

const PHASE_RANK = new Map(REPLAY_EVENT_PHASE_ORDER.map((phase, index) => [phase, index]));

export function replayPhaseRank(phase) {
  return PHASE_RANK.has(phase) ? PHASE_RANK.get(phase) : REPLAY_EVENT_PHASE_ORDER.length;
}

export function canonicalReplayEventSortKey(event = {}) {
  return {
    tick: finiteInteger(event.tick, 0),
    timeSeconds: finiteNumber(event.timeSeconds, 0),
    phaseRank: replayPhaseRank(event.phase),
    eventType: String(event.eventType ?? ''),
    agentId: String(event.agentId ?? ''),
    sequence: finiteInteger(event.sequence, Number.MAX_SAFE_INTEGER),
    eventId: String(event.eventId ?? '')
  };
}

export function canonicalReplayEventCompare(a = {}, b = {}) {
  const ak = canonicalReplayEventSortKey(a);
  const bk = canonicalReplayEventSortKey(b);
  return compareNumber(ak.tick, bk.tick)
    || compareNumber(ak.timeSeconds, bk.timeSeconds)
    || compareNumber(ak.phaseRank, bk.phaseRank)
    || compareString(ak.agentId, bk.agentId)
    || compareNumber(ak.sequence, bk.sequence)
    || compareString(ak.eventId, bk.eventId);
}

export function sortReplayEvents(events = []) {
  return [...events].sort(canonicalReplayEventCompare).map((event, index) => ({ ...event, canonicalIndex: index }));
}

export function assignCanonicalReplaySequences(events = []) {
  return sortReplayEvents(events).map((event, index) => ({ ...event, sequence: index, canonicalIndex: index }));
}

export function validateCanonicalReplayEventOrder(events = []) {
  const failures = [];
  const warnings = [];
  const checks = [];
  let previous = null;
  let previousSequence = -1;
  const seen = new Set();
  for (const event of events) {
    if (previous && canonicalReplayEventCompare(previous, event) > 0) {
      failures.push(`Replay events are not canonical at sequence ${event.sequence ?? 'unknown'}.`);
      break;
    }
    const sequence = Number(event.sequence);
    if (!Number.isInteger(sequence)) failures.push(`Replay event ${event.eventId ?? '<unknown>'} is missing an integer sequence.`);
    if (seen.has(sequence)) failures.push(`Replay event sequence ${sequence} is duplicated.`);
    if (Number.isInteger(sequence) && sequence <= previousSequence) failures.push(`Replay event sequence ${sequence} is non-monotonic after ${previousSequence}.`);
    seen.add(sequence);
    previousSequence = Number.isInteger(sequence) ? sequence : previousSequence;
    previous = event;
  }
  checks.push({ id: 'replay-canonical-event-count', ok: failures.length === 0, detail: events.length });
  return { status: failures.length ? 'FAIL' : warnings.length ? 'WARN' : 'PASS', checks, warnings, failures };
}

function compareNumber(a, b) {
  return a < b ? -1 : a > b ? 1 : 0;
}

function compareString(a, b) {
  return a < b ? -1 : a > b ? 1 : 0;
}

function finiteInteger(value, fallback) {
  const number = Number(value);
  return Number.isFinite(number) ? Math.trunc(number) : fallback;
}

function finiteNumber(value, fallback) {
  const number = Number(value);
  return Number.isFinite(number) ? number : fallback;
}


