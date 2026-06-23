import assert from 'node:assert/strict';
import { buildFlowR2A5CurrentDynamicsMetrics } from './flow_r2a5_current_dynamics_helpers.mjs';

const metrics = buildFlowR2A5CurrentDynamicsMetrics({ seed: 'flow-r2a5-1-time-span' });
const level = metrics.fixture.level;
const field = metrics.field;
const duration = Number(level.world?.operationalDomain?.time?.durationSeconds ?? level.operationalDomain?.time?.durationSeconds ?? level.world?.time?.durationSeconds ?? level.world?.time?.duration ?? 0);
assert.ok(duration > 0, 'generated scenario exposes a mission duration');
assert.ok(field.timeAxisSeconds.at(-1) >= duration, `current time axis ${field.timeAxisSeconds.at(-1)} must span mission duration ${duration}`);
assert.equal(field.temporalBoundaryMode, 'bounded');
assert.equal(field.validTimeEndSeconds >= duration, true);
assert.equal(metrics.currentDebug.timeClampedUnexpectedly, false);
console.log('PASS audit_current_mission_time_span');