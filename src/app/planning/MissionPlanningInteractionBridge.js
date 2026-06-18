import { getDeploymentZones, setSelectedStart } from '../../core/deployment/DeploymentZones.js';
import {
  addMarker,
  addWaypoint,
  clearAllWaypoints,
  getAgentPlan,
  removeMarker,
  removeWaypoint,
  updateWaypoint
} from '../../core/planning/WaypointPlan.js';

export const MISSION_PLANNING_INTERACTION_BRIDGE_VERSION = 'mission-planning-interaction-bridge-mig-r2';

export function createMissionPlanningInteractionBridge(options = {}) {
  return new MissionPlanningInteractionBridge(options);
}

export class MissionPlanningInteractionBridge {
  constructor({ sessionStore, lifecycleController = null, onChange = null } = {}) {
    if (!sessionStore) throw new Error('MissionPlanningInteractionBridge requires a sessionStore.');
    this.sessionStore = sessionStore;
    this.lifecycleController = lifecycleController;
    this.onChange = onChange;
    this.history = [];
  }

  selectAgent(agentId) {
    const state = this.sessionStore.getState();
    const id = agentId ?? state.mission?.agents?.[0]?.id ?? null;
    this.sessionStore.patch({ selectedAgentId: id }, { type: 'selectAgent' });
    return this.record('selectAgent', { agentId: id });
  }

  selectDefaultStart(agentId = null) {
    const state = this.sessionStore.getState();
    const id = agentId ?? state.selectedAgentId ?? state.mission?.agents?.[0]?.id;
    const zone = getDeploymentZones(state.level)[0];
    const cell = zone?.cells?.[0] ?? state.mission?.agents?.find((agent) => agent.id === id)?.start ?? { x: 1, y: 1 };
    const result = setSelectedStart(state.level, state.mission, state.plan, id, { x: Math.round(cell.x), y: Math.round(cell.y) });
    this.sessionStore.patch({ level: state.level, mission: state.mission, plan: state.plan, selectedAgentId: id }, { type: 'selectDefaultStart' });
    return this.record('selectDefaultStart', { agentId: id, cell, result });
  }

  addWaypointAt(cell, patch = {}) {
    const state = this.sessionStore.getState();
    const agentId = patch.agentId ?? state.selectedAgentId ?? state.mission?.agents?.[0]?.id;
    const waypoint = addWaypoint(state.plan, agentId, {
      x: Math.round(Number(cell.x)),
      y: Math.round(Number(cell.y)),
      t: patch.t ?? nextWaypointTime(state.plan, agentId, state.level),
      window: patch.window ?? state.selectedWindow ?? 0,
      kind: patch.kind ?? 'navigation',
      action: patch.action ?? 'sample',
      note: patch.note ?? 'DOM planning waypoint'
    });
    this.lifecycleController?.updatePlan?.(state.plan, { type: 'planning:addWaypoint' });
    this.sessionStore.patch({ plan: state.plan }, { type: 'addWaypoint' });
    return this.record('addWaypoint', { agentId, waypoint });
  }

  updateWaypoint(agentId, index, patch = {}) {
    const state = this.sessionStore.getState();
    const updated = updateWaypoint(state.plan, agentId ?? state.selectedAgentId, index, patch);
    this.lifecycleController?.updatePlan?.(state.plan, { type: 'planning:updateWaypoint' });
    this.sessionStore.patch({ plan: state.plan }, { type: 'updateWaypoint' });
    return this.record('updateWaypoint', { agentId, index, waypoint: updated });
  }

  removeLastWaypoint(agentId = null) {
    const state = this.sessionStore.getState();
    const id = agentId ?? state.selectedAgentId ?? state.mission?.agents?.[0]?.id;
    const agentPlan = getAgentPlan(state.plan, id);
    const removed = removeWaypoint(state.plan, id, agentPlan.waypoints.length - 1);
    this.lifecycleController?.updatePlan?.(state.plan, { type: 'planning:removeWaypoint' });
    this.sessionStore.patch({ plan: state.plan }, { type: 'removeWaypoint' });
    return this.record('removeWaypoint', { agentId: id, removed });
  }

  addMarkerAt(cell, patch = {}) {
    const state = this.sessionStore.getState();
    const marker = addMarker(state.plan, state.selectedAgentId, {
      x: Math.round(Number(cell.x)),
      y: Math.round(Number(cell.y)),
      t: patch.t ?? state.planningTime ?? 0,
      window: patch.window ?? state.selectedWindow ?? 0,
      type: patch.type ?? 'annotation',
      label: patch.label ?? 'Planning marker'
    });
    this.sessionStore.patch({ plan: state.plan }, { type: 'addMarker' });
    return this.record('addMarker', { marker });
  }

  removeLastMarker() {
    const state = this.sessionStore.getState();
    const removed = removeMarker(state.plan, state.selectedAgentId, (state.plan?.planningMarkers?.length ?? 0) - 1);
    this.sessionStore.patch({ plan: state.plan }, { type: 'removeMarker' });
    return this.record('removeMarker', { removed });
  }

  clearPlan() {
    const state = this.sessionStore.getState();
    clearAllWaypoints(state.plan);
    state.plan.planningMarkers = [];
    this.lifecycleController?.updatePlan?.(state.plan, { type: 'planning:clearPlan' });
    this.sessionStore.patch({ plan: state.plan }, { type: 'clearPlan' });
    return this.record('clearPlan', {});
  }

  sampleWaypointCell() {
    const state = this.sessionStore.getState();
    const grid = state.level?.world?.grid ?? { width: 10, height: 10 };
    const agentPlan = getAgentPlan(state.plan, state.selectedAgentId ?? state.mission?.agents?.[0]?.id);
    const index = agentPlan.waypoints.length;
    const start = agentPlan.selectedStart ?? state.mission?.agents?.[0]?.start ?? { x: 1, y: 1 };
    for (let radius = 2 + index; radius < Math.max(grid.width, grid.height); radius += 1) {
      const cell = {
        x: Math.min(grid.width - 2, Math.max(1, Math.round((start.x ?? 1) + radius))),
        y: Math.min(grid.height - 2, Math.max(1, Math.round((start.y ?? 1) + (index % 3) - 1)))
      };
      if (!state.level?.layers?.terrain?.[cell.y]?.[cell.x]) return cell;
    }
    return { x: Math.max(0, Math.floor(grid.width / 2)), y: Math.max(0, Math.floor(grid.height / 2)) };
  }

  record(action, details = {}) {
    const entry = { action, details, t: Date.now() };
    this.history.push(entry);
    this.onChange?.(entry, this.sessionStore.getState());
    return entry;
  }

  getDebugState() {
    return {
      type: 'anchor.mission.planning-interaction.debug',
      version: MISSION_PLANNING_INTERACTION_BRIDGE_VERSION,
      history: this.history.slice(-20),
      ownsPlanning: false,
      ownsSimulationState: false,
      usesPhaserInput: false
    };
  }
}

function nextWaypointTime(plan, agentId, level) {
  const agentPlan = getAgentPlan(plan, agentId);
  const dt = Number(level?.world?.time?.dt ?? 1);
  const duration = Number(level?.world?.time?.duration ?? 60);
  const last = agentPlan.waypoints.at(-1);
  const next = Number(last?.t ?? 0) + Math.max(1, dt * 8);
  return Math.min(duration, next || Math.max(1, dt * 8));
}
