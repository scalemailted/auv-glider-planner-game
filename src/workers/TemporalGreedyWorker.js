import { runTemporalGreedyPlan } from '../core/planning/PlannerWorkerClient.js';

self.onmessage = (event) => {
  const message = event.data ?? {};
  if (message.type !== 'runTemporalGreedy') return;
  const request = message.request ?? {};
  self.postMessage({ type: 'progress', progress: { type: 'planningStarted', phase: 'running', requestId: request.requestId ?? null } });
  const result = runTemporalGreedyPlan(request, {
    onProgress: (progress) => {
      self.postMessage({ type: 'progress', progress });
    }
  });
  self.postMessage({ type: 'result', result });
};
