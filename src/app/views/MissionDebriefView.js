import { saveCurrentAttempt } from './LeaderboardView.js';
import { createAnchorViewContract, button, createDomElement, formatNumber, metricList, panel } from './AnchorViewContract.js';

export const MISSION_DEBRIEF_VIEW_VERSION = 'mission-debrief-view-mig-r2-2';

export function createMissionDebriefView(context = {}) {
  return new MissionDebriefView(context);
}

export class MissionDebriefView {
  constructor({ sessionStore, lifecycleController, router } = {}) {
    this.sessionStore = sessionStore;
    this.lifecycleController = lifecycleController;
    this.router = router;
    this.contract = createAnchorViewContract('missionDebrief');
    this.unsubscribe = null;
    this.element = null;
  }

  mount({ documentRef, shell }) {
    shell.clearRouteRegions?.();
    const root = createDomElement(documentRef, 'main', 'anchor-dom-debrief');
    root.dataset.testid = 'mission-debrief-view';
    root.dataset.sectionId = 'debriefScorecard';
    this.element = root;
    this.render(documentRef, shell);
    this.unsubscribe = this.sessionStore?.subscribe?.(() => this.render(documentRef, shell));
    return root;
  }

  render(documentRef, shell) {
    if (!this.element) return;
    const state = this.sessionStore?.getState?.() ?? {};
    const result = state.result;
    const score = result?.summary?.finalScore ?? result?.summary?.score ?? 'n/a';
    this.element.innerHTML = '';
    const debrief = panel(documentRef, result ? 'Mission Debrief' : 'No Result Yet', result ? 'Official scoring remains produced by the shared simulation/scoring core.' : 'Run a simulation to generate a mission result.');
    debrief.dataset.sectionId = 'debriefScorecard';
    const officialScore = createDomElement(documentRef, 'p', 'anchor-dom-copy', `Official Score: ${score}`);
    officialScore.dataset.testid = 'official-score';
    debrief.appendChild(officialScore);
    debrief.appendChild(metricList(documentRef, [
      { label: 'Final Score', value: score },
      { label: 'ROI Collected', value: result?.summary?.roiCollected ?? result?.summary?.sampleValue ?? 'n/a' },
      { label: 'Energy Used', value: formatNumber(result?.summary?.energyUsed, 2) },
      { label: 'Hazards', value: result?.summary?.hazardsHit ?? result?.risk?.staticHazardsHit ?? 0 },
      { label: 'Observations', value: result?.summary?.observations ?? result?.events?.filter?.((event) => /sample|observation/i.test(event.type))?.length ?? 0 },
      { label: 'Stop Reason', value: result?.stopReason?.label ?? result?.stopReason?.reason ?? result?.abortReason ?? 'n/a' }
    ]));

    const exports = createDomElement(documentRef, 'section', 'anchor-dom-panel');
    exports.dataset.sectionId = 'exportActions';
    exports.appendChild(createDomElement(documentRef, 'h3', 'anchor-dom-heading', 'Exports'));
    exports.appendChild(createDomElement(documentRef, 'p', 'anchor-dom-copy', 'Result, replay, benchmark, and adaptive export panels remain owned by existing exporter modules; this route preserves the debrief action surface.'));

    if (state.missionMode === 'adaptiveBenchmark') {
      const adaptive = createDomElement(documentRef, 'section', 'anchor-dom-panel');
      adaptive.dataset.testid = 'adaptive-surfacing-review';
      adaptive.dataset.sectionId = 'adaptiveSurfacingReview';
      adaptive.appendChild(createDomElement(documentRef, 'h3', 'anchor-dom-heading', 'Surfacing Review'));
      adaptive.appendChild(createDomElement(documentRef, 'p', 'anchor-dom-copy', `Leg ${Number(state.adaptiveLegIndex ?? 0) + 1}: review deterministic science diagnosis and continue to the next planning leg.`));
      adaptive.appendChild(buttonWithTestId(documentRef, 'Continue Next Leg', () => {
        this.sessionStore?.patch?.({ adaptiveLegIndex: Number(state.adaptiveLegIndex ?? 0) + 1 }, { type: 'adaptiveContinueNextLeg' });
        this.lifecycleController?.beginPlanning?.();
      }, 'adaptive-continue-next-leg', 'anchor-dom-button anchor-dom-button-primary'));
      debrief.appendChild(adaptive);
    }

    const actions = createDomElement(documentRef, 'div', 'anchor-dom-actions');
    actions.append(
      buttonWithTestId(documentRef, 'Rerun Mission', () => this.lifecycleController?.launchSimulation?.(), 'rerun-mission', 'anchor-dom-button'),
      buttonWithTestId(documentRef, 'Return to Planning', () => this.lifecycleController?.beginPlanning?.(), 'return-to-planning', 'anchor-dom-button anchor-dom-button-primary'),
      buttonWithTestId(documentRef, 'Save Attempt', () => saveCurrentAttempt(state), 'save-attempt', 'anchor-dom-button'),
      buttonWithTestId(documentRef, 'Main Menu', () => this.router?.navigate?.('mainMenu'), 'return-to-menu')
    );
    debrief.append(exports, actions);
    this.element.appendChild(debrief);

    shell.setConsole?.('<section class="anchor-dom-panel" data-section-id="scienceResult"><h2>Mission Debrief</h2><p>Review score, sampling, energy, safety, missed waypoint, and export outcomes.</p></section>');
    shell.setRightPanel?.(`<section class="waypoint-shell" data-section-id="routeGrade"><div class="console-kicker">Mission Result</div><h2>Score ${score}</h2><p class="hud-muted">Route and waypoint execution summary appears here.</p></section>`);
    shell.setStatus?.(`<section class="mission-status-strip" data-section-id="debriefStatus">Mission Debrief | Score ${score}</section>`);
    shell.setTimeline?.('');
    shell.setPerformance?.(`<section class="mission-performance-strip" data-section-id="missionPerformance">ROI ${result?.summary?.roiCollected ?? result?.summary?.sampleValue ?? 'n/a'} | Energy ${formatNumber(result?.summary?.energyUsed, 2)}</section>`);
    globalThis.ANCHOR_APP_RUNTIME_DEBUG ??= {};
    globalThis.ANCHOR_APP_RUNTIME_DEBUG.debriefView = this.getDebugState();
  }

  unmount() {
    this.unsubscribe?.();
    this.element?.remove?.();
    this.element = null;
  }

  getDebugState() {
    const result = this.sessionStore?.getState?.().result;
    return {
      type: 'anchor.view.mission-debrief.debug',
      version: MISSION_DEBRIEF_VIEW_VERSION,
      hasResult: Boolean(result),
      ownsScoring: false,
      usesPhaserScene: false
    };
  }
}

function buttonWithTestId(documentRef, label, onClick, testId, className = 'anchor-dom-button') {
  const el = button(documentRef, label, onClick, className);
  el.dataset.testid = testId;
  return el;
}
