import { ANCHOR_ROUTE_IDS } from '../router/AnchorRouteContract.js';
import {
  MISSION_LIFECYCLE_CONTRACT_VERSION,
  MISSION_LIFECYCLE_EVENTS,
  applyMissionLifecycleTransition,
  missionLifecycleSummary
} from './MissionLifecycleContract.js';

export const MISSION_LIFECYCLE_CONTROLLER_VERSION = 'mission-lifecycle-controller-mig-r2';

export function createMissionLifecycleController(options = {}) {
  return new MissionLifecycleController(options);
}

export class MissionLifecycleController {
  constructor({ sessionStore, router = null, services = {} } = {}) {
    if (!sessionStore) throw new Error('MissionLifecycleController requires a sessionStore.');
    this.sessionStore = sessionStore;
    this.router = router;
    this.services = services;
    this.events = [];
    this.publishDebug();
  }

  beginSetup(params = {}) {
    this.applyEvent(MISSION_LIFECYCLE_EVENTS.beginSetup, { source: params.source ?? 'dom' });
    this.router?.navigate?.(ANCHOR_ROUTE_IDS.missionSetup, params, { source: 'lifecycle' });
  }

  async loadTutorialMission(tutorialId = 'tutorial_01_first_deployment') {
    if (typeof this.services.loadTutorialMission !== 'function') {
      throw new Error('Tutorial mission loader service is not available.');
    }
    const loaded = await this.services.loadTutorialMission(tutorialId);
    return this.loadMission(loaded, { source: 'tutorial', tutorialId });
  }

  loadMission({ level, mission, plan = null, source = 'unknown', challengeMode = null, experienceMode = null } = {}, meta = {}) {
    if (!level || !mission) throw new Error('Loading a mission requires both level and mission objects.');
    const state = this.sessionStore.patch({
      level,
      mission,
      plan,
      result: null,
      source: meta.source ?? source,
      challengeMode: challengeMode ?? level?.challengeMode ?? 'perfectKnowledge',
      experienceMode: experienceMode ?? level?.meta?.experienceMode ?? mission?.meta?.experienceMode ?? null,
      missionMode: level?.meta?.missionMode ?? mission?.meta?.missionMode ?? null,
      currentScenario: {
        levelId: level?.levelId ?? null,
        instanceId: level?.instanceId ?? null,
        missionId: mission?.missionId ?? mission?.id ?? null,
        source: meta.source ?? source,
        briefingSeen: false
      },
      simulation: { status: 'idle', running: false, paused: false }
    }, { type: 'loadMissionData' });
    this.applyEvent(MISSION_LIFECYCLE_EVENTS.loadMission, state);
    this.sessionStore.ensurePlan();
    this.router?.navigate?.(ANCHOR_ROUTE_IDS.missionBriefing, {}, { source: 'lifecycle' });
    this.publishDebug();
    return this.sessionStore.getState();
  }

  showBriefing() {
    this.applyEvent(MISSION_LIFECYCLE_EVENTS.showBriefing, this.sessionStore.getState());
    this.router?.navigate?.(ANCHOR_ROUTE_IDS.missionBriefing, {}, { source: 'lifecycle' });
  }

  beginPlanning() {
    const state = this.sessionStore.getState();
    this.sessionStore.ensurePlan();
    const result = this.applyEvent(MISSION_LIFECYCLE_EVENTS.beginPlanning, state);
    if (result.validation.valid) this.router?.navigate?.(ANCHOR_ROUTE_IDS.missionPlanning, {}, { source: 'lifecycle' });
    return result;
  }

  updatePlan(plan, meta = {}) {
    this.sessionStore.patch({ plan }, { type: meta.type ?? 'updatePlan' });
    return this.applyEvent(MISSION_LIFECYCLE_EVENTS.updatePlan, this.sessionStore.getState());
  }

  launchSimulation() {
    const state = this.sessionStore.getState();
    const validation = this.services.validatePlanForExecution?.({ level: state.level, mission: state.mission, plan: state.plan }) ?? { ok: true, errors: [] };
    if (validation.ok === false) {
      this.sessionStore.patch({ warnings: validation.errors ?? ['Plan failed execution validation.'] }, { type: 'simulationValidationFailed' });
      return { validation: { valid: false, errors: validation.errors ?? ['Plan failed execution validation.'], warnings: [] } };
    }
    const result = this.applyEvent(MISSION_LIFECYCLE_EVENTS.launchSimulation, state);
    if (result.validation.valid) {
      this.sessionStore.patch({ result: null, simulation: { status: 'ready', running: false, paused: true, timeSeconds: 0, stepCount: 0 } }, { type: 'launchSimulation' });
      this.router?.navigate?.(ANCHOR_ROUTE_IDS.missionSimulation, {}, { source: 'lifecycle' });
    }
    return result;
  }

  completeSimulation(result, meta = {}) {
    this.sessionStore.patch({
      result,
      simulation: {
        status: result?.aborted ? 'aborted' : 'complete',
        running: false,
        paused: true,
        complete: !result?.aborted,
        aborted: Boolean(result?.aborted),
        stopReason: result?.stopReason ?? result?.summary?.stopReason ?? null,
        timeSeconds: result?.summary?.time ?? result?.summary?.t ?? 0,
        stepCount: result?.frames?.length ?? 0
      }
    }, { type: meta.type ?? 'completeSimulation' });
    const transition = this.applyEvent(MISSION_LIFECYCLE_EVENTS.completeSimulation, this.sessionStore.getState());
    this.router?.navigate?.(ANCHOR_ROUTE_IDS.missionDebrief, {}, { source: 'lifecycle' });
    return transition;
  }

  reset() {
    this.sessionStore.reset({ type: 'lifecycleReset' });
    this.applyEvent(MISSION_LIFECYCLE_EVENTS.reset, this.sessionStore.getState());
    this.router?.navigate?.(ANCHOR_ROUTE_IDS.mainMenu, {}, { source: 'lifecycle' });
  }

  openLegacy(sceneId) {
    this.applyEvent(MISSION_LIFECYCLE_EVENTS.openLegacy, { sceneId });
    this.router?.openLegacyScene?.(sceneId);
  }

  applyEvent(eventName, sessionPatch = {}) {
    const state = this.sessionStore.getState();
    const transition = applyMissionLifecycleTransition(state.lifecycle, eventName, { ...state, ...(sessionPatch ?? {}) });
    if (transition.validation.valid) {
      this.sessionStore.patch({ lifecycle: transition.state }, { type: `lifecycle:${eventName}` });
      this.events.push({ eventName, state: transition.state.state, t: Date.now() });
    } else {
      this.sessionStore.patch({ warnings: transition.validation.errors }, { type: `lifecycleRejected:${eventName}` });
    }
    this.publishDebug();
    return transition;
  }

  getDebugState() {
    return {
      type: 'anchor.mission.lifecycle.debug',
      version: MISSION_LIFECYCLE_CONTROLLER_VERSION,
      contractVersion: MISSION_LIFECYCLE_CONTRACT_VERSION,
      summary: missionLifecycleSummary(this.sessionStore.getState().lifecycle),
      events: this.events.slice(-20),
      session: this.sessionStore.getDebugState?.() ?? null,
      usesPhaserUpdate: false,
      ownsSimulationPhysics: false,
      ownsScoring: false
    };
  }

  publishDebug() {
    globalThis.ANCHOR_MISSION_LIFECYCLE_DEBUG = this.getDebugState();
  }
}
