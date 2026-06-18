import { createAnchorRouter } from '../router/AnchorRouter.js';
import { ANCHOR_ROUTE_IDS } from '../router/AnchorRouteContract.js';
import { createMissionSessionStore } from '../mission/MissionSessionStore.js';
import { createMissionLifecycleController } from '../mission/MissionLifecycleController.js';
import { createAnchorAppShell } from '../shell/AnchorAppShell.js';
import { createMainMenuView } from '../views/MainMenuView.js';
import { createMissionSetupView } from '../views/MissionSetupView.js';
import { createMissionBriefingView } from '../views/MissionBriefingView.js';
import { createMissionPlanningView } from '../views/MissionPlanningView.js';
import { createMissionSimulationView } from '../views/MissionSimulationView.js';
import { createMissionDebriefView } from '../views/MissionDebriefView.js';
import { createImportExportView } from '../views/ImportExportView.js';
import { createLeaderboardView } from '../views/LeaderboardView.js';
import { createTutorialBrowserView } from '../views/TutorialBrowserView.js';
import { createLegacyPhaserIslandHost } from '../legacy/LegacyPhaserIslandHost.js';
import { createRouteScopedViewHost, disposeRouteScopedViewHost, mountRouteScopedView, unmountRouteScopedView } from './RouteScopedViewHost.js';
import { productionContentManifestForRoute } from '../parity/LegacyProductionContentManifest.js';
import { loadCampaignLevel, applyTutorialMissionConfig, CAMPAIGN_LEVELS } from '../../core/campaign/CampaignLevels.js';
import { loadJSON } from '../../core/io/ImportExport.js';
import { ensureLevelIdentity } from '../../core/identity/GameInstanceId.js';
import { validatePlanForExecution } from '../../core/planning/PlanExecutionValidator.js';

export const ANCHOR_BROWSER_RUNTIME_VERSION = 'anchor-browser-runtime-mig-r2';

export function createAnchorBrowserRuntime(options = {}) {
  return new AnchorBrowserRuntime(options);
}

export class AnchorBrowserRuntime {
  constructor({ elements = {}, windowRef = globalThis.window, documentRef = globalThis.document, services = {} } = {}) {
    this.windowRef = windowRef;
    this.documentRef = documentRef;
    this.shell = createAnchorAppShell({ ...elements, documentRef });
    this.router = createAnchorRouter({ windowRef });
    this.sessionStore = createMissionSessionStore();
    this.services = createRuntimeServices(services);
    this.lifecycleController = createMissionLifecycleController({
      sessionStore: this.sessionStore,
      router: this.router,
      services: this.services
    });
    this.activeView = null;
    this.viewHost = createRouteScopedViewHost(this.shell);
    this.legacyHost = null;
    this.unsubscribeRoute = null;
    this.unsubscribeSession = null;
    this.started = false;
    this.publishDebug();
  }

  start() {
    if (this.started) return this;
    this.started = true;
    this.unsubscribeRoute = this.router.subscribe((route, event) => this.handleRoute(route, event));
    this.unsubscribeSession = this.sessionStore.subscribe(() => this.publishDebug());
    this.router.start();
    this.publishDebug();
    return this;
  }

  stop() {
    this.unsubscribeRoute?.();
    this.unsubscribeSession?.();
    this.router.stop();
    disposeRouteScopedViewHost(this.viewHost);
    this.legacyHost?.dispose?.();
    this.started = false;
    this.publishDebug();
  }

  handleRoute(route) {
    if (route.id === ANCHOR_ROUTE_IDS.legacyPhaser) {
      this.mountLegacyRoute(route.params?.sceneId);
      return;
    }
    this.legacyHost?.dispose?.();
    this.legacyHost = null;
    const view = this.createView(route.id);
    if (!view) return;
    this.activeView = view;
    this.shell.setLayout?.(layoutForRoute(route.id));
    this.shell.setModeLabel?.(labelForRoute(route.id));
    mountRouteScopedView(this.viewHost, view, { routeId: route.id });
    this.publishDebug();
  }

  createView(routeId) {
    const context = {
      router: this.router,
      sessionStore: this.sessionStore,
      lifecycleController: this.lifecycleController,
      services: this.services
    };
    const map = {
      [ANCHOR_ROUTE_IDS.mainMenu]: () => createMainMenuView(context),
      [ANCHOR_ROUTE_IDS.missionSetup]: () => createMissionSetupView(context),
      [ANCHOR_ROUTE_IDS.missionBriefing]: () => createMissionBriefingView(context),
      [ANCHOR_ROUTE_IDS.missionPlanning]: () => createMissionPlanningView(context),
      [ANCHOR_ROUTE_IDS.missionSimulation]: () => createMissionSimulationView(context),
      [ANCHOR_ROUTE_IDS.missionDebrief]: () => createMissionDebriefView(context),
      [ANCHOR_ROUTE_IDS.importExport]: () => createImportExportView(context),
      [ANCHOR_ROUTE_IDS.leaderboard]: () => createLeaderboardView(context),
      [ANCHOR_ROUTE_IDS.tutorialBrowser]: () => createTutorialBrowserView(context),
      [ANCHOR_ROUTE_IDS.plannerBenchmark]: () => createMissionSetupView({ ...context, modeHint: 'plannerBenchmark' }),
      [ANCHOR_ROUTE_IDS.adaptiveBenchmark]: () => createMissionSetupView({ ...context, modeHint: 'adaptiveBenchmark' })
    };
    return map[routeId]?.() ?? createMainMenuView(context);
  }

  mountLegacyRoute(sceneId) {
    unmountRouteScopedView(this.viewHost);
    this.activeView = null;
    if (!this.legacyHost) {
      this.legacyHost = createLegacyPhaserIslandHost({ elements: this.shell.elements, documentRef: this.documentRef });
    }
    this.shell.setLayout?.('legacyLab');
    this.shell.setModeLabel?.('Legacy Phaser Lab');
    this.legacyHost.mount(sceneId);
    this.publishDebug();
  }

  openLegacyRoute(sceneId) {
    return this.router.openLegacyScene(sceneId);
  }

  getDebugState() {
    return {
      type: 'anchor.app-runtime.debug',
      version: ANCHOR_BROWSER_RUNTIME_VERSION,
      started: this.started,
      route: this.router.getDebugState?.() ?? null,
      session: this.sessionStore.getDebugState?.() ?? null,
      lifecycle: this.lifecycleController.getDebugState?.() ?? null,
      shell: this.shell.getDebugState?.() ?? null,
      legacy: this.legacyHost?.getDebugState?.() ?? null,
      normalRoutesInstantiatePhaser: false,
      normalRoutesUsePhaserUpdate: false,
      simulationControllerUsesSharedEngine: true,
      productionE2EUsesDomRuntime: true,
      productionPhaserSceneCount: 5,
      productionPhaserImportCount: 0,
      remainingLegacyPhaserSceneCount: globalThis.ANCHOR_LEGACY_PHASER_DEBUG?.registeredLegacySceneIds?.length ?? 0,
      obsoleteProductionPhaserScenesDeleted: false,
      phaserRemovalPhase: 'MIG-R2.2'
    
    };
  }

  publishDebug() {
    globalThis.ANCHOR_APP_RUNTIME_DEBUG = this.getDebugState();
  }
}

export function createRuntimeServices(overrides = {}) {
  return {
    async loadTutorialMission(tutorialId = 'tutorial_01_first_deployment') {
      const entry = CAMPAIGN_LEVELS.find((candidate) => candidate.id === tutorialId) ?? CAMPAIGN_LEVELS[0];
      if (!entry) throw new Error('No tutorial missions are available.');
      const level = ensureLevelIdentity(await loadCampaignLevel(entry));
      const mission = applyTutorialMissionConfig(await loadJSON('missions/tutorial_sampling.json'), entry.id);
      return { level, mission, source: 'tutorial', tutorialId: entry.id, challengeMode: entry.mode ?? 'perfectKnowledge' };
    },
    validatePlanForExecution,
    ...overrides
  };
}


function layoutForRoute(routeId) {
  return productionContentManifestForRoute(routeId)?.layoutId ?? (routeId === 'legacyPhaser' ? 'legacyLab' : 'productHub');
}

function labelForRoute(routeId) {
  return ({
    mainMenu: 'Main Menu',
    missionSetup: 'Mission Setup',
    missionBriefing: 'Mission Briefing',
    missionPlanning: 'Mission Planning',
    missionSimulation: 'Mission Simulation',
    missionDebrief: 'Mission Debrief',
    importExport: 'Import / Export',
    leaderboard: 'Leaderboard',
    tutorialBrowser: 'Tutorial Browser',
    plannerBenchmark: 'Planner Benchmark',
    adaptiveBenchmark: 'Adaptive Benchmark',
    legacyPhaser: 'Legacy Phaser Lab'
  })[routeId] ?? 'ANCHOR';
}


