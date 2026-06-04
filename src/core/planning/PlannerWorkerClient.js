import { temporalGreedySolver } from './BaselineSolvers.js';
import { validatePlanForExecution } from './PlanExecutionValidator.js';

export function buildTemporalGreedyRequest({ level, mission, options = {} } = {}) {
  return {
    planner: 'temporalGreedy',
    version: 1,
    level: cloneJson(level),
    mission: cloneJson(mission),
    options: cloneJson(options)
  };
}

export function runTemporalGreedyPlan(request = {}) {
  try {
    const plan = temporalGreedySolver(request.level, request.mission, request.options ?? {});
    const validation = validatePlanForExecution({
      level: request.level,
      mission: request.mission,
      plan
    });
    if (!validation.ok) {
      plan.meta ??= {};
      plan.meta.valid = false;
      plan.meta.stopReason = hasRouteBlockedIssue(validation)
        ? 'planner_generated_blocked_segment'
        : 'no_executable_route_after_validation';
      plan.meta.validationIssues = validation.routeAudit?.agentResults?.flatMap((result) => result.issues ?? []) ?? [];
      return {
        ok: false,
        requestId: request.requestId ?? null,
        error: firstValidationError(validation),
        plan,
        summary: {
          greedyStop: plan.meta?.greedyStop ?? null,
          sharedDepletion: plan.meta?.sharedDepletion ?? null,
          waypointCount: countWaypoints(plan)
        },
        diagnostics: {
          greedyStopsByAgent: plan.meta?.greedyStopsByAgent ?? [],
          valid: false,
          stopReason: plan.meta.stopReason
        },
        validation
      };
    }
    return {
      ok: true,
      requestId: request.requestId ?? null,
      plan,
      summary: {
        greedyStop: plan.meta?.greedyStop ?? null,
        sharedDepletion: plan.meta?.sharedDepletion ?? null,
        waypointCount: countWaypoints(plan)
      },
      diagnostics: {
        greedyStopsByAgent: plan.meta?.greedyStopsByAgent ?? [],
        valid: true
      },
      validation
    };
  } catch (error) {
    return {
      ok: false,
      requestId: request.requestId ?? null,
      error: error?.message ?? 'Temporal Greedy planning failed.',
      diagnostics: {
        stack: error?.stack ?? null
      }
    };
  }
}

export function runTemporalGreedyAsync(request = {}, { signal = null, onProgress = null, preferWorker = true } = {}) {
  if (preferWorker && typeof Worker !== 'undefined' && typeof URL !== 'undefined') {
    return runTemporalGreedyInWorker(request, { signal, onProgress })
      .catch((error) => {
        if (error?.name === 'AbortError') throw error;
        return runTemporalGreedyOnMainThread(request, { signal, onProgress });
      });
  }
  return runTemporalGreedyOnMainThread(request, { signal, onProgress });
}

function runTemporalGreedyInWorker(request, { signal, onProgress } = {}) {
  return new Promise((resolve, reject) => {
    if (signal?.aborted) return reject(abortError());
    const worker = new Worker(new URL('../../workers/TemporalGreedyWorker.js', import.meta.url), { type: 'module' });
    const cleanup = () => {
      signal?.removeEventListener?.('abort', onAbort);
      worker.terminate();
    };
    const onAbort = () => {
      cleanup();
      reject(abortError());
    };
    signal?.addEventListener?.('abort', onAbort, { once: true });
    worker.onmessage = (event) => {
      const message = event.data ?? {};
      if (message.type === 'progress') {
        onProgress?.(message.progress ?? {});
        return;
      }
      if (message.type === 'result') {
        cleanup();
        resolve(message.result);
        return;
      }
      if (message.type === 'error') {
        cleanup();
        reject(new Error(message.error ?? 'Temporal Greedy worker failed.'));
      }
    };
    worker.onerror = (event) => {
      cleanup();
      reject(new Error(event.message ?? 'Temporal Greedy worker failed.'));
    };
    worker.postMessage({ type: 'runTemporalGreedy', request });
  });
}

function runTemporalGreedyOnMainThread(request, { signal, onProgress } = {}) {
  return new Promise((resolve, reject) => {
    if (signal?.aborted) return reject(abortError());
    onProgress?.({ phase: 'queued' });
    globalThis.setTimeout?.(() => {
      if (signal?.aborted) {
        reject(abortError());
        return;
      }
      onProgress?.({ phase: 'running' });
      resolve(runTemporalGreedyPlan(request));
    }, 0);
  });
}

function countWaypoints(plan) {
  return (plan?.agentPlans ?? []).reduce((sum, agentPlan) => sum + (agentPlan.waypoints?.length ?? 0), 0);
}

function hasRouteBlockedIssue(validation) {
  return (validation?.routeAudit?.agentResults ?? []).some((result) =>
    (result.issues ?? []).some((issue) =>
      issue.severity === 'error' && (issue.type === 'segmentBlocked' || issue.reason === 'routeBlocked')
    )
  );
}

function firstValidationError(validation) {
  const issue = validation?.routeAudit?.firstIssue;
  if (issue?.type === 'segmentBlocked' || issue?.reason === 'routeBlocked') {
    return issue.message ?? 'Temporal Greedy generated a blocked route segment.';
  }
  return validation?.errors?.[0] ?? 'Temporal Greedy generated a route that is not executable.';
}

function cloneJson(value) {
  if (value === undefined || value === null) return value ?? null;
  if (globalThis.structuredClone) return globalThis.structuredClone(value);
  return JSON.parse(JSON.stringify(value));
}

function abortError() {
  const error = new Error('Temporal Greedy cancelled.');
  error.name = 'AbortError';
  return error;
}
