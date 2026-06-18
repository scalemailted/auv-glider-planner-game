import { createAnchorViewContract, button, createDomElement, metricList, panel } from './AnchorViewContract.js';

export const MISSION_BRIEFING_VIEW_VERSION = 'mission-briefing-view-mig-r2-2';

export function createMissionBriefingView(context = {}) {
  return new MissionBriefingView(context);
}

export class MissionBriefingView {
  constructor({ sessionStore, lifecycleController, router } = {}) {
    this.sessionStore = sessionStore;
    this.lifecycleController = lifecycleController;
    this.router = router;
    this.contract = createAnchorViewContract('missionBriefing');
    this.unsubscribe = null;
    this.element = null;
    this.shell = null;
    this.documentRef = null;
  }

  mount({ documentRef, shell }) {
    shell.clearRouteRegions?.();
    this.shell = shell;
    this.documentRef = documentRef;
    const root = createDomElement(documentRef, 'main', 'anchor-dom-briefing');
    root.dataset.testid = 'mission-briefing';
    root.dataset.sectionId = 'missionBriefing';
    this.element = root;
    this.render(documentRef, shell);
    this.unsubscribe = this.sessionStore?.subscribe?.(() => this.render(documentRef, shell));
    return root;
  }

  render(documentRef, shell) {
    if (!this.element) return;
    const state = this.sessionStore?.getState?.() ?? {};
    this.element.innerHTML = '';
    if (!state.level || !state.mission) {
      const empty = panel(documentRef, 'No Mission Loaded', 'Start from the setup screen to load a mission.');
      empty.dataset.sectionId = 'emptyState';
      empty.appendChild(buttonWithTestId(documentRef, 'Open Setup', () => this.router?.navigate?.('missionSetup'), 'return-to-setup', 'anchor-dom-button anchor-dom-button-primary'));
      this.element.appendChild(empty);
      shell.setConsole?.('<section class="anchor-dom-panel"><h2>Mission Briefing</h2><p>No mission is loaded.</p></section>');
      shell.setRightPanel?.('');
      return;
    }
    const title = state.mission?.meta?.name ?? state.level?.meta?.name ?? 'Mission Briefing';
    const briefing = panel(documentRef, title, state.level?.meta?.description ?? state.mission?.meta?.description ?? 'Review the mission context before entering planning.');
    briefing.dataset.sectionId = 'missionBriefing';
    briefing.appendChild(metricList(documentRef, [
      { label: 'Level', value: state.level.levelId ?? 'unknown' },
      { label: 'Mission', value: state.mission.missionId ?? state.mission.id ?? 'unknown' },
      { label: 'Objective', value: state.mission?.objective?.label ?? state.mission?.meta?.objective ?? 'Science sampling' },
      { label: 'Grid', value: `${state.level.world?.grid?.width ?? '?'} x ${state.level.world?.grid?.height ?? '?'}` },
      { label: 'Duration', value: `${state.level.world?.time?.duration ?? '?'} s` },
      { label: 'Planning Window', value: state.level.world?.time?.planningWindow ?? state.mission?.rules?.planningWindow ?? 'default' },
      { label: 'Agents', value: state.mission.agents?.length ?? 0 },
      { label: 'Visibility', value: state.visibilityMode ?? state.challengeMode ?? 'public' },
      { label: 'Benchmark', value: state.benchmarkMode ?? 'none' },
      { label: 'Hazards', value: countHazards(state.level) }
    ]));
    const actions = createDomElement(documentRef, 'div', 'anchor-dom-actions');
    actions.append(
      buttonWithTestId(documentRef, 'Begin Planning', () => this.lifecycleController?.beginPlanning?.(), 'begin-planning', 'anchor-dom-button anchor-dom-button-primary'),
      buttonWithTestId(documentRef, 'Mission Setup', () => this.router?.navigate?.('missionSetup'), 'return-to-setup'),
      button(documentRef, 'Main Menu', () => this.router?.navigate?.('mainMenu'))
    );
    briefing.appendChild(actions);
    this.element.appendChild(briefing);

    shell.setConsole?.(`<section class="anchor-dom-panel" data-section-id="scenarioSummary"><h2>Mission Briefing</h2><p>Objective, visibility, field summary, fleet, hazards, and constraints are reviewed here before planning.</p></section>`);
    shell.setRightPanel?.(`<section class="waypoint-shell" data-section-id="fleetSummary"><div class="console-kicker">Mission Waypoints</div><h2>${escapeHtml(title)}</h2><p class="hud-muted">Waypoint plan appears after Planning begins.</p><p class="hud-muted">Fleet: ${state.mission.agents?.length ?? 0} glider(s).</p></section>`);
    shell.setStatus?.(`<section class="mission-status-strip" data-section-id="briefingStatus">${escapeHtml(title)} | ${escapeHtml(state.visibilityMode ?? state.challengeMode ?? 'public')}</section>`);
    shell.setTimeline?.('');
    shell.setPerformance?.('');
  }

  unmount() {
    this.unsubscribe?.();
    this.element?.remove?.();
    this.element = null;
  }
}

function buttonWithTestId(documentRef, label, onClick, testId, className = 'anchor-dom-button') {
  const el = button(documentRef, label, onClick, className);
  el.dataset.testid = testId;
  return el;
}

function countHazards(level = {}) {
  const values = level.layers?.hazards ?? level.hazards ?? level.layers?.static?.hazards ?? [];
  return Array.isArray(values) ? values.length : 0;
}

function escapeHtml(value) {
  return String(value ?? '').replace(/[&<>"]/g, (char) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[char]);
}
