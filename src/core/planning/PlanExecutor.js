// Compatibility forwarding module.
// Canonical implementation lives in packages/mission-simulator.
export {
  getActiveWaypoint,
  advanceWaypointIfReached,
  markWaypointMissed,
  detectMissedWaypoint,
  getWaypointProgress
} from '../../../packages/mission-simulator/src/PlanExecutor.js';
