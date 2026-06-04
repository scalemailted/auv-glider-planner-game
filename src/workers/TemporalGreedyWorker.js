import { runTemporalGreedyPlan } from '../core/planning/PlannerWorkerClient.js';

self.onmessage = (event) => {
  const message = event.data ?? {};
  if (message.type !== 'runTemporalGreedy') return;
  self.postMessage({ type: 'progress', progress: { phase: 'running' } });
  const result = runTemporalGreedyPlan(message.request ?? {});
  self.postMessage({ type: 'result', result });
};
