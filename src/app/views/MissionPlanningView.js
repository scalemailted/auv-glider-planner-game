import { buildMissionWorldRenderViewModel, missionWorldRenderViewModelSummary } from '../../core/rendering/MissionWorldRenderViewModel.js';
import { getDeploymentZones } from '../../core/deployment/DeploymentZones.js';
import {
  createThreeMissionWorldRenderer,
  disposeThreeMissionWorldRenderer,
  resizeThreeMissionWorldRenderer,
  updateThreeMissionWorldRenderer
} from '../../game/three/ThreeMissionWorldRenderer.js';
import { createMissionPlanningInteractionBridge } from '../planning/MissionPlanningInteractionBridge.js';
import { createAnchorViewContract, button, createDomElement, formatNumber, metricList, panel } from './AnchorViewContract.js';

export const MISSION_PLANNING_VIEW_VERSION = 'mission-planning-view-mig-r2';

export function createMissionPlanningView(context = {}) {
  return new MissionPlanningView(context);
}

export class MissionPlanningView {
  constructor({ sessionStore, lifecycleController, router, rendererFactory = createThreeMissionWorldRenderer, rendererApi = {} } = {}) {
    this.sessionStore = sessionStore;
    this.lifecycleController = lifecycleController;
    this.router = router;
    this.rendererFactory = rendererFactory;
    this.rendererApi = {
      update: rendererApi.update ?? updateThreeMissionWorldRenderer,
      resize: rendererApi.resize ?? resizeThreeMissionWorldRenderer,
      dispose: rendererApi.dispose ?? disposeThreeMissionWorldRenderer
    };
    this.contract = createAnchorViewContract('missionPlanning', { ownsPlanningState: false });
    this.unsubscribe = null;
    this.element = null;
    this.renderer = null;
    this.rendererHost = null;
    this.bridge = createMissionPlanningInteractionBridge({
      sessionStore,
      lifecycleController,
      onChange: () => this.refresh()
    });
  }

  mount({ documentRef, shell }) {
    shell.clearSidePanels?.();
    const root = createDomElement(documentRef, 'main', 'anchor-dom-planning');
    const rendererHost = createDomElement(documentRef, 'div', 'anchor-three-planning-host');
    const side = createDomElement(documentRef, 'aside', 'anchor-dom-planning-tools');
    root.append(rendererHost, side);
    this.element = root;
    this.rendererHost = rendererHost;
    this.side = side;
    this.mountRenderer();
    this.renderTools(documentRef, shell);
    this.unsubscribe = this.sessionStore?.subscribe?.(() => this.refresh());
    rendererHost.addEventListener?.('click', (event) => this.handleGridClick(event));
    globalThis.addEventListener?.('resize', () => this.resize());
    return root;
  }

  mountRenderer() {
    if (!this.rendererHost || this.renderer) return;
    this.renderer = this.rendererFactory(this.rendererHost, { layerVisibility: { interaction: true } });
    this.refresh();
  }

  renderTools(documentRef, shell) {
    if (!this.side) return;
    const state = this.sessionStore?.getState?.() ?? {};
    this.side.innerHTML = '';
    const title = panel(documentRef, 'Planning Tools', 'Click the map or add a sample waypoint. The route remains shared plan JSON; the view only edits via the planning bridge.');
    title.appendChild(metricList(documentRef, [
      { label: 'Agent', value: state.selectedAgentId ?? 'none' },
      { label: 'Waypoints', value: countWaypoints(state.plan) },
      { label: 'Markers', value: state.plan?.planningMarkers?.length ?? 0 },
      { label: 'Duration', value: `${formatNumber(state.level?.world?.time?.duration, 0)} s` }
    ]));
    const actions = createDomElement(documentRef, 'div', 'anchor-dom-actions anchor-dom-actions-column');
    actions.append(
      button(documentRef, 'Select Default Start', () => this.bridge.selectDefaultStart(), 'anchor-dom-button anchor-dom-button-primary'),
      button(documentRef, 'Add Sample Waypoint', () => this.bridge.addWaypointAt(this.bridge.sampleWaypointCell(), { action: 'sample' })),
      button(documentRef, 'Remove Last Waypoint', () => this.bridge.removeLastWaypoint()),
      button(documentRef, 'Clear Plan', () => this.bridge.clearPlan()),
      button(documentRef, 'Run Simulation', () => this.lifecycleController?.launchSimulation?.(), 'anchor-dom-button anchor-dom-button-primary'),
      button(documentRef, 'Briefing', () => this.lifecycleController?.showBriefing?.())
    );
    title.appendChild(actions);
    this.side.appendChild(title);
    shell.setConsole?.('<h2>Mission Planning</h2><p>DOM route editing writes to the shared waypoint plan. The Three renderer displays fields and routes but does not own planning state.</p>');
  }

  refresh() {
    const state = this.sessionStore?.getState?.() ?? {};
    if (!state.level || !state.mission || !state.plan || !this.renderer) return;
    const viewModel = buildPlanningViewModel(state);
    this.rendererApi.update(this.renderer, viewModel);
    this.resize();
    globalThis.ANCHOR_APP_RUNTIME_DEBUG ??= {};
    globalThis.ANCHOR_MISSION_RENDER_DEBUG = {
      type: 'anchor.mission-render.debug',
      activeBackend: 'threeMission3d',
      threeMounted: true,
      phaserWorldRendererActive: false,
      interactionEnabled: true,
      viewModel: missionWorldRenderViewModelSummary(viewModel),
      rendererSummary: this.renderer?.type ? { type: this.renderer.type, threeAvailable: this.renderer.threeAvailable !== false } : null
    };
    globalThis.ANCHOR_APP_RUNTIME_DEBUG.planningView = {
      type: 'anchor.view.mission-planning.debug',
      version: MISSION_PLANNING_VIEW_VERSION,
      viewModel: missionWorldRenderViewModelSummary(viewModel),
      bridge: this.bridge.getDebugState(),
      usesPhaserInput: false
    };
  }

  resize() {
    if (!this.renderer || !this.rendererHost) return;
    this.rendererApi.resize(this.renderer, this.rendererHost.clientWidth, this.rendererHost.clientHeight);
  }

  handleGridClick(event) {
    const state = this.sessionStore?.getState?.() ?? {};
    const rect = this.rendererHost?.getBoundingClientRect?.();
    const grid = state.level?.world?.grid;
    if (!rect || !grid) return;
    const x = Math.max(0, Math.min(grid.width - 1, Math.floor(((event.clientX - rect.left) / Math.max(1, rect.width)) * grid.width)));
    const y = Math.max(0, Math.min(grid.height - 1, Math.floor(((event.clientY - rect.top) / Math.max(1, rect.height)) * grid.height)));
    if (state.level?.layers?.terrain?.[y]?.[x]) return;
    this.bridge.addWaypointAt({ x, y }, { action: 'sample', note: 'Added from DOM renderer click' });
  }

  unmount() {
    this.unsubscribe?.();
    this.rendererApi.dispose(this.renderer);
    this.renderer = null;
    this.element?.remove?.();
    this.element = null;
  }
}

export function buildPlanningViewModel(state = {}) {
  const frame = firstTruthFrame(state.level);
  return buildMissionWorldRenderViewModel({
    level: state.level,
    mission: state.mission,
    plan: state.plan,
    selectedAgentId: state.selectedAgentId,
    activeTimeSeconds: state.planningTime ?? 0,
    sampleField: { values: frame?.roi ?? state.level?.layers?.roi ?? [] },
    currentField: { vectors: vectorsFromFrame(frame?.vector ?? state.level?.layers?.vector, state.level?.world?.grid) },
    displaySettings: { showROI: true, showCurrents: true, showTerrain: true, showHazards: true, showPlanningMarkers: true },
    options: {
      phase: 'planning',
      dropZones: getDeploymentZones(state.level),
      selectedStarts: selectedStarts(state),
      priorityTargets: state.level?.priorityTargets ?? state.mission?.priorityTargets ?? []
    }
  });
}

function firstTruthFrame(level) {
  return level?.layers?.truth?.frames?.[0] ?? level?.layers?.forecast?.frames?.[0] ?? null;
}

function vectorsFromFrame(vectorGrid = [], grid = {}) {
  const vectors = [];
  const width = Number(grid?.width ?? vectorGrid?.[0]?.length ?? 0);
  const height = Number(grid?.height ?? vectorGrid?.length ?? 0);
  for (let y = 0; y < height; y += 1) {
    for (let x = 0; x < width; x += 1) {
      const vector = vectorGrid?.[y]?.[x] ?? [0, 0];
      const u = Number(vector.u ?? vector[0] ?? 0);
      const v = Number(vector.v ?? vector[1] ?? 0);
      if (Math.hypot(u, v) > 0.001) vectors.push({ x, y, u, v, magnitude: Math.hypot(u, v) });
    }
  }
  return vectors;
}

function selectedStarts(state = {}) {
  return (state.mission?.agents ?? []).map((agent) => ({
    id: `${agent.id}-selected-start`,
    agentId: agent.id,
    x: agent.deployment?.selectedStart?.x ?? agent.start?.x,
    y: agent.deployment?.selectedStart?.y ?? agent.start?.y,
    label: agent.label ?? agent.id
  })).filter((entry) => Number.isFinite(Number(entry.x)) && Number.isFinite(Number(entry.y)));
}

function countWaypoints(plan = {}) {
  return (plan.agentPlans ?? []).reduce((sum, agentPlan) => sum + (agentPlan.waypoints?.length ?? 0), 0);
}


