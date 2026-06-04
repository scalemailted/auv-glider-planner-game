import { getFrameIndexForTime } from '../time/FrameIndex.js';

export const MAX_TRACE_ENTRIES = 200;

export class SimulationTrace {
  constructor(limit = MAX_TRACE_ENTRIES) {
    this.limit = Math.max(20, Number(limit) || MAX_TRACE_ENTRIES);
    this.entries = [];
    this.lastFrameIndex = null;
  }

  add(entry = {}) {
    const normalized = {
      wallTime: Number(globalThis.performance?.now?.() ?? Date.now()),
      simTime: finiteOrNull(entry.simTime),
      scene: entry.scene ?? null,
      phase: entry.phase ?? 'trace',
      message: entry.message ?? '',
      agentId: entry.agentId ?? null,
      activeWaypointIndex: finiteOrNull(entry.activeWaypointIndex),
      frameIndex: finiteOrNull(entry.frameIndex),
      eventType: entry.eventType ?? null,
      details: entry.details ?? null
    };
    this.entries.push(normalized);
    if (this.entries.length > this.limit) this.entries.splice(0, this.entries.length - this.limit);
    return normalized;
  }

  markFrame(level, simTime, scene = 'SimulationScene') {
    const frameIndex = getFrameIndexForTrace(level, simTime);
    if (frameIndex === this.lastFrameIndex) return null;
    const previous = this.lastFrameIndex;
    this.lastFrameIndex = frameIndex;
    return this.add({
      scene,
      simTime,
      phase: 'temporal.frame.change',
      message: 'Temporal frame changed',
      frameIndex,
      details: { previousFrameIndex: previous }
    });
  }

  snapshot() {
    return this.entries.map((entry) => ({ ...entry }));
  }

  warn(reason, extra = {}) {
    const payload = {
      reason,
      ...extra,
      trace: this.snapshot()
    };
    console.warn('[simulation-trace]', payload);
    return payload;
  }
}

export function createSimulationTrace(limit = MAX_TRACE_ENTRIES) {
  return new SimulationTrace(limit);
}

export function traceSimulation(trace, entry) {
  return trace?.add?.(entry) ?? null;
}

export function getFrameIndexForTrace(level, time = 0) {
  const frames = level?.layers?.truth?.frames ?? level?.layers?.forecast?.frames ?? [];
  const index = getFrameIndexForTime(frames, time, level?.world?.time?.dt ?? 1);
  return index >= 0 ? index : null;
}

function finiteOrNull(value) {
  const number = Number(value);
  return Number.isFinite(number) ? number : null;
}
