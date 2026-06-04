import {
  formatMissionTime,
  getMissionTimelineFrames,
  getNextTimelineFrameIndex,
  getPlanningWindowCount,
  getPrevTimelineFrameIndex,
  getTimeConfig
} from '../core/time/MissionTime.js';
import { shortInstanceId } from '../core/identity/GameInstanceId.js';
import { getPlanningFrame } from '../core/sim/ChallengeMode.js';
import { estimateRouteEnergy } from '../core/planning/RoutePreview.js';
import { buildRouteSegmentsForAgent } from '../core/planning/RouteSegmentBuilder.js';
import { buildTimelineEvents } from '../core/planning/TimelineEvents.js';
import { computeReachabilitySummary } from '../core/validation/ConnectivityValidator.js';
import { formatHudMetric, getAgentPerformanceRows } from './HudMetrics.js';
import { getSelectedStart } from '../core/deployment/DeploymentZones.js';
import { inspectCellAtTime } from '../core/exploration/CellInspection.js';
import { getRoiModeDescription, getRoiModeLabel, getTravelCostAnchor, getTravelCostBudget, normalizeRoiMode } from '../core/roi/RoiMode.js';
import { getTutorialHint, tutorialFeatureEnabled } from '../core/tutorial/TutorialFeatureGates.js';
import { replayDiagnosticsCardHtml } from './ReplayDiagnosticsCard.js';

export class HtmlMissionWorkspaceOverlay {
  constructor(app, handlers) {
    this.app = app;
    this.handlers = handlers;
    this.roots = app.elements.overlay ?? {};
    this.consoleRoot = app.elements.consoleRoot;
    this.collapsedRight = false;
    this.boundRoots = new WeakMap();
  }

  refresh(state) {
    this.state = state;
    if (this.consoleRoot) {
      this.renderPlanningConsole(state);
      this.renderTimeline(state);
      return;
    }
    this.renderTopHud(state);
    this.renderLeftDrawer(state);
    this.renderRightDrawer(state);
    this.renderTimeline(state);
  }

  renderPlanningConsole(state) {
    const root = this.consoleRoot;
    if (!root) return;
    const level = state.level;
    const waypointCount = (state.plan?.agentPlans ?? []).reduce((sum, agentPlan) => sum + (agentPlan.waypoints?.length ?? 0), 0);
    const estimate = routeEstimate(state);
    const routeAudit = state.ui?.routeAudit;
    const executeDisabled = routeAudit && routeAudit.ok === false;
    const routeAuditIssues = routeAuditIssueCount(routeAudit);
    const connectivity = state.level && state.mission ? computeReachabilitySummary(state.level, state.mission) : null;
    const connectivityWarnings = connectivity?.warnings ?? [];
    const temporalGreedyRunning = isTemporalGreedyRunning(state);
    root.innerHTML = `
      <section class="console-header">
        <div class="console-kicker">Planning Console</div>
        <h1>${escapeHtml(level?.meta?.name ?? 'Mission')}</h1>
        <p>${escapeHtml(labelize(state.challengeMode))} | ${escapeHtml(shortInstanceId(level))}</p>
      </section>
      <section class="console-status">
        <span>Active Plan</span>
        <strong>${escapeHtml(state.selectedAgentId ?? 'No glider')}</strong>
        <small>Window ${Number(state.selectedWindow ?? 0)} | ${escapeHtml(formatMissionTime(level, state.planningTime))} | ${waypointCount} waypoint(s)</small>
      </section>
      ${state.ui?.placementMode === 'marker' ? markerInspectionSection(state) : ''}
      ${connectivityWarnings.length ? `
      <section class="console-section warning">
        <h2>Connectivity Warning</h2>
        ${connectivityWarnings.slice(0, 3).map((warning) => `<div class="hud-muted">${escapeHtml(warning)}</div>`).join('')}
      </section>` : ''}
      <section class="console-section">
        <h2>Plan</h2>
        <button class="console-button primary" data-action="execute" title="${executeDisabled ? 'Review route validation before simulation.' : 'Execute mission'}">Execute Mission</button>
        ${executeDisabled ? `<div class="hud-muted warning">${escapeHtml(routeAuditSummary(routeAudit))}</div>` : ''}
        ${tutorialFeatureEnabled(state, 'markers') ? `<button class="console-button" data-action="placement-mode">${state.ui?.placementMode === 'marker' ? 'Mode: Planning Marker' : 'Mode: Waypoint'}</button>` : ''}
        <button class="console-button" data-action="clear-route">Clear Selected Route</button>
        ${tutorialFeatureEnabled(state, 'markers') ? '<button class="console-button" data-action="clear-markers">Clear Planning Markers</button>' : ''}
        <button class="console-button" data-action="import-plan">Import Plan</button>
        <button class="console-button" data-action="export-plan">Export Plan</button>
        <button class="console-button" data-action="save-level">Save Level</button>
      </section>
      <section class="console-section">
        <h2>Mission Options</h2>
        <button type="button" class="console-button ${state.missionOptions?.ignoreUpdateEvents ? 'secondary' : ''}" data-action="toggle-ignore-update-events" title="Run continuously through surfacing/update windows without pausing for replanning. Off by default.">Ignore Update Events: ${state.missionOptions?.ignoreUpdateEvents ? 'On' : 'Off'}</button>
        <div class="hud-muted">${state.missionOptions?.ignoreUpdateEvents ? 'Update events: ignored. Continuous run mode is enabled.' : 'Update events: respected.'}</div>
      </section>
      ${importDemoSection(state, executeDisabled)}
      ${routeAuditIssues ? routeAuditSection(routeAudit) : ''}
      ${tutorialHintSection(state)}
      <section class="console-section">
        <h2>Analysis</h2>
        ${bestPriorRunSummary(state)}
        ${temporalGreedyPlannerSummary(state)}
        ${tutorialFeatureEnabled(state, 'solver') ? `<button class="console-button" data-action="temporal-greedy" ${temporalGreedyRunning ? 'disabled' : ''} title="${temporalGreedyRunning ? 'Temporal Greedy is already computing a route.' : 'Compute a temporal greedy route.'}">${temporalGreedyRunning ? 'Temporal Greedy Running...' : 'Temporal Greedy'}</button>` : ''}
        ${temporalGreedyRunning ? '<div class="hud-muted">Temporal Greedy planner running...</div>' : ''}
        ${tutorialFeatureEnabled(state, 'solver') ? '<button class="console-button" data-action="solver-packet">Export Solver Packet</button>' : ''}
        <button class="console-button" data-action="roi-mode" title="${escapeAttr(roiModeDescription(state))}">ROI Mode: ${escapeHtml(getRoiModeLabel(state.ui?.roiViewMode))}</button>
      </section>
      <section class="console-section">
        <h2>Data Exports</h2>
        <button class="console-button" data-action="export-challenge">Export Challenge JSON</button>
        <button class="console-button" data-action="import-challenge">Import Challenge</button>
        <button class="console-button" data-action="export-oracle">Export Oracle Dataset${state.challengeMode === 'forecast' ? ' (contains hidden truth)' : ''}</button>
        <button class="console-button" data-action="export-result" ${state.result ? '' : 'disabled'}>Export Result</button>
        <button class="console-button" data-action="import-result">Import Result</button>
        <button class="console-button" data-action="export-leaderboard">Export Leaderboard</button>
        <button class="console-button" data-action="import-leaderboard">Import Leaderboard</button>
        ${state.challengeMode === 'forecast' ? '<div class="hud-muted">Challenge export is forecast-visible; hidden truth is not stored plainly.</div>' : ''}
        ${state.challengeMode === 'forecast' ? '<div class="hud-muted warning">Oracle export contains hidden truth. Public challenge exports are cheat-resistant only, not secure.</div>' : ''}
      </section>
      <section class="console-section">
        <h2>View Layers</h2>
        ${layerButton(state, 'showROI', 'ROI Heatmap')}
        <div class="hud-muted">Heatmap: ${escapeHtml(roiModeLegendLabel(state))}</div>
        ${roiModeLegendDetails(state)}
        ${layerButton(state, 'showCurrents', 'Current Vectors')}
        ${layerButton(state, 'showHazards', 'Hazards')}
        ${layerButton(state, 'showTerrain', 'Terrain/Land')}
        ${layerButton(state, 'showGuidance', 'Guidance Overlay')}
        ${layerButton(state, 'showDriftCone', 'Guidance Cone')}
        ${layerButton(state, 'showReachableArea', 'Approx Reach')}
        ${layerButton(state, 'showEnergyPreview', 'Cost Preview')}
        ${tutorialFeatureEnabled(state, 'markers') ? layerButton(state, 'showPlanningMarkers', 'Planning Markers') : ''}
        ${layerButton(state, 'showBestPathOverlay', 'Best Path Overlay')}
        ${layerButton(state, 'showPriorityStars', 'Priority Stars')}
      </section>
      <section class="console-section">
        <h2>Route Estimate</h2>
        ${state.ui?.placementMode === 'marker'
          ? '<div class="hud-muted">Marker Mode is annotation-only. Route energy, ETA, drift cone, and reachability previews are suppressed.</div>'
          : `<div class="hud-muted">Path: ${estimate.distance.toFixed(1)} cells</div>
        <div class="hud-muted">Projected cost: ${estimate.energyText}</div>
        <div class="hud-muted">Preview only; actual fuel/path is computed during simulation.</div>
        <div class="hud-muted">Active: W${Number(state.selectedWindow ?? 0)}</div>`}
      </section>
      <section class="console-section">
        <h2>Mission Tools</h2>
        <div class="hud-muted">Level ${escapeHtml(level?.levelId ?? 'unknown')}</div>
        <div class="hud-muted">Seed ${escapeHtml(level?.meta?.seed ?? 'N/A')}</div>
        <button class="console-button secondary" data-action="next-glider">Next Glider</button>
        <button class="console-button secondary" data-action="toggle-mode">Toggle Mode</button>
        <button class="console-button secondary" data-action="help">Briefing / Help</button>
      </section>
      ${selectedGliderCard(state)}
      <section class="console-footer">
        <button class="console-button secondary" data-action="main-menu">Main Menu</button>
      </section>
    `;
    this.app.applyConsoleAccordions?.('planning');
    this.bind(root, this.actionMap());
  }

  renderTopHud(state) {
    const root = this.roots.topHud;
    if (!root) return;
    const executeDisabled = state.ui?.routeAudit && state.ui.routeAudit.ok === false;
    const temporalGreedyRunning = isTemporalGreedyRunning(state);
    root.innerHTML = `
      <div class="hud-panel hud-pad hud-spread">
        <div class="hud-row">
          ${menu('Plan', [
            ['save-level', 'Save Level'],
            ['clear-route', 'Clear Route'],
            ['import-plan', 'Import Plan'],
            ['export-plan', 'Export Plan']
          ])}
          ${menu('Analysis', [
            ['temporal-greedy', temporalGreedyRunning ? 'Temporal Greedy Running...' : 'Temporal Greedy', {
              disabled: temporalGreedyRunning,
              title: temporalGreedyRunning ? 'Temporal Greedy is already computing a route.' : 'Compute a temporal greedy route.'
            }],
            ['solver-packet', 'Solver Packet'],
            ['roi-mode', `ROI Mode: ${getRoiModeLabel(state.ui?.roiViewMode)}`]
          ].filter(([action]) => action === 'roi-mode' || tutorialFeatureEnabled(state, 'solver')))}
          ${menu('View', [
            ['next-glider', 'Next Glider'],
            ['toggle-mode', 'Mode'],
            ['layer-roi', toggleLabel(state, 'showROI', 'ROI')],
            ['layer-currents', toggleLabel(state, 'showCurrents', 'Vectors')],
            ['layer-hazards', toggleLabel(state, 'showHazards', 'Hazards')],
            ['layer-terrain', toggleLabel(state, 'showTerrain', 'Terrain')],
            ['layer-guidance', toggleLabel(state, 'showGuidance', 'Guidance')],
            ['layer-drift', toggleLabel(state, 'showDriftCone', 'Guidance Cone')],
            ['layer-reachable', toggleLabel(state, 'showReachableArea', 'Approx Reach')],
            ['layer-energy', toggleLabel(state, 'showEnergyPreview', 'Cost Preview')],
            ...(tutorialFeatureEnabled(state, 'markers') ? [['layer-markers', toggleLabel(state, 'showPlanningMarkers', 'Planning Markers')]] : []),
            ['layer-stars', toggleLabel(state, 'showPriorityStars', 'Priority Stars')],
            ['help', 'Help']
          ])}
        </div>
        <div class="hud-row">
          <button class="hud-button" data-action="toggle-waypoints">${this.collapsedRight ? 'Show Waypoints' : 'Hide Waypoints'}</button>
          <button class="hud-button" data-action="main-menu">Main Menu</button>
          <button class="hud-button primary" data-action="execute" title="${executeDisabled ? 'Review route validation before simulation.' : 'Execute mission'}">Execute</button>
        </div>
        ${executeDisabled ? `<div class="hud-muted warning">${escapeHtml(routeAuditSummary(state.ui.routeAudit))}</div>` : ''}
      </div>
    `;
    this.bind(root, {
      'save-level': () => this.handlers.saveLevel(),
      'clear-route': () => this.handlers.clear(),
      'placement-mode': () => this.handlers.markerMode?.(),
      'clear-markers': () => this.handlers.clearMarkers?.(),
      'import-plan': () => this.handlers.importPlan(),
      'load-demo-plan': () => this.handlers.loadDemoPlan?.(),
      'download-demo-plan': () => this.handlers.downloadDemoPlan?.(),
      'clear-imported-plan': () => this.handlers.clearImportedPlan?.(),
      'toggle-ignore-update-events': () => this.handlers.toggleIgnoreUpdateEvents?.(),
      'show-best-path': () => this.handlers.showBestPath?.(),
      'hide-best-path': () => this.handlers.hideBestPath?.(),
      'rerun-best-path': () => this.handlers.rerunBestPath?.(),
      'load-best-path-as-plan': () => this.handlers.loadBestPath?.(),
      'load-best-path': () => this.handlers.loadBestPath?.(),
      'export-best-path': () => this.handlers.exportBestPath?.(),
      'export-plan': () => this.handlers.exportPlan(),
      'export-challenge': () => this.handlers.exportChallenge?.(),
      'import-challenge': () => this.handlers.importChallenge?.(),
      'export-oracle': () => this.handlers.exportOracle?.(),
      'export-result': () => this.handlers.exportResult?.(),
      'import-result': () => this.handlers.importResult?.(),
      'export-leaderboard': () => this.handlers.exportLeaderboard?.(),
      'import-leaderboard': () => this.handlers.importLeaderboard?.(),
      'temporal-greedy': () => this.handlers.temporalGreedy?.(),
      'solver-packet': () => this.handlers.exportSolver(),
      'roi-mode': () => this.handlers.toggleRoiMode(),
      'next-glider': () => this.handlers.nextGlider(),
      'toggle-mode': () => this.handlers.toggleMode(),
      'layer-roi': () => this.handlers.toggleLayer('showROI'),
      'layer-currents': () => this.handlers.toggleLayer('showCurrents'),
      'layer-hazards': () => this.handlers.toggleLayer('showHazards'),
      'layer-terrain': () => this.handlers.toggleLayer('showTerrain'),
      'layer-guidance': () => this.handlers.toggleLayer('showGuidance'),
      'layer-drift': () => this.handlers.toggleLayer('showDriftCone'),
      'layer-reachable': () => this.handlers.toggleLayer('showReachableArea'),
      'layer-energy': () => this.handlers.toggleLayer('showEnergyPreview'),
      'layer-markers': () => this.handlers.toggleLayer('showPlanningMarkers'),
      'layer-best-path': () => this.handlers.toggleLayer('showBestPathOverlay'),
      'layer-stars': () => this.handlers.toggleLayer('showPriorityStars'),
      'help': () => this.handlers.help(),
      'main-menu': () => this.handlers.mainMenu?.(),
      'toggle-waypoints': () => {
        this.collapsedRight = !this.collapsedRight;
        this.renderRightDrawer(this.state);
        this.renderTopHud(this.state);
      },
      'execute': () => this.handlers.execute()
    });
  }

  renderLeftDrawer(state) {
    const root = this.roots.leftDrawer;
    if (!root) return;
    const level = state.level;
    const waypointCount = (state.plan?.agentPlans ?? []).reduce((sum, agentPlan) => sum + (agentPlan.waypoints?.length ?? 0), 0);
    const estimate = routeEstimate(state);
    root.innerHTML = `
      <section class="hud-panel hud-pad hud-grid">
        <div>
          <h2>${escapeHtml(level?.meta?.name ?? 'Mission')}</h2>
          <div class="hud-muted">Level ${escapeHtml(level?.levelId ?? 'unknown')}</div>
          <div class="hud-muted">Instance ${escapeHtml(shortInstanceId(level))}</div>
          <div class="hud-muted">Seed ${escapeHtml(level?.meta?.seed ?? 'N/A')}</div>
        </div>
        <div>
          <h3>Status</h3>
          <div class="hud-muted">Mode: ${escapeHtml(labelize(state.challengeMode))}</div>
          <div class="hud-muted">Glider: ${escapeHtml(state.selectedAgentId ?? 'none')}</div>
          <div class="hud-muted">Window: ${Number(state.selectedWindow ?? 0)}</div>
          <div class="hud-muted">Time: ${escapeHtml(formatMissionTime(level, state.planningTime))}</div>
          <div class="hud-muted">Route: ${waypointCount} waypoint(s)</div>
        </div>
        <div>
          <h3>Route Estimate</h3>
          <div class="hud-muted">Path: ${estimate.distance.toFixed(1)} cells</div>
          <div class="hud-muted">Projected cost: ${estimate.energyText}</div>
          <div class="hud-muted">Preview only; simulation may differ.</div>
          <div class="hud-muted">Active: W${Number(state.selectedWindow ?? 0)}</div>
        </div>
        <div>
          <h3>Legend</h3>
          <div class="legend-list">
            ${legend('legend-water', 'Water')}
            ${legend('legend-land', 'Land / blocked')}
            ${legend('legend-shallow', 'Shallow / depth')}
            ${legend('legend-roi', 'ROI hotspot')}
            ${legend('legend-hazard', 'Hazard')}
            ${legend('legend-base', 'Deploy/base')}
            ${legend('legend-current', 'Current vector')}
            ${legend('legend-waypoint', 'Waypoint')}
            ${legend('legend-glider', 'Selected glider')}
            ${legend('legend-path', 'Planned path')}
            ${legend('legend-actual', 'Actual sim path')}
            ${legend('legend-guidance', 'Guidance estimates')}
          </div>
        </div>
      </section>
    `;
  }

  renderRightDrawer(state) {
    const root = this.roots.rightDrawer;
    if (!root) return;
    if (this.collapsedRight) {
      root.innerHTML = '';
      return;
    }
    const agentPlan = (state.plan?.agentPlans ?? []).find((plan) => plan.agentId === state.selectedAgentId);
    const waypoints = agentPlan?.waypoints ?? [];
    root.innerHTML = `
      <section class="hud-panel hud-pad">
        <div class="hud-spread">
          <h2>Waypoints</h2>
          <span class="hud-muted">${escapeHtml(state.selectedAgentId ?? 'none')}</span>
        </div>
        ${waypoints.length ? waypointTable(state, waypoints) : '<p class="hud-muted">Click water cells on the map to add waypoints.</p>'}
      </section>
    `;
    this.bind(root, {
      remove: (button) => this.handlers.remove(Number(button.dataset.index)),
      up: (button) => this.handlers.moveUp(Number(button.dataset.index)),
      down: (button) => this.handlers.moveDown(Number(button.dataset.index))
    });
  }

  renderTimeline(state) {
    const root = this.roots.bottomTimeline;
    if (!root) return;
    const config = getTimeConfig(state.level);
    const duration = config.duration || 1;
    const time = Number(state.planningTime ?? 0);
    root.innerHTML = `
      <section class="hud-panel timeline-overlay">
        <div class="timeline-readout">${escapeHtml(formatMissionTime(state.level, time))}<br><span class="hud-muted">Window ${Number(state.selectedWindow ?? 0)}</span></div>
        <input data-action="time-slider" type="range" min="0" max="${duration}" step="any" value="${time}" />
        <div class="timeline-markers" aria-hidden="true">${timelineMarkers(state, duration)}</div>
        <div class="timeline-events timeline-layer-above">${timelineEventIcons(state, duration, 'above')}</div>
        <div class="timeline-events timeline-layer-below">${timelineEventIcons(state, duration, 'below')}</div>
        <div class="timeline-buttons">
          <button data-action="time-start">Start</button>
          <button data-action="window-prev">Prev</button>
          <button data-action="window-next">Next</button>
          <button data-action="time-end">End</button>
        </div>
      </section>
    `;
    const slider = root.querySelector('[data-action="time-slider"]');
    slider?.addEventListener('input', () => this.handlers.time(Number(slider.value)));
    const frames = getMissionTimelineFrames(state.level, state.mission);
    this.bind(root, {
      'time-start': () => this.goToTimelineFrame(0, state, 'start'),
      'window-prev': () => this.goToTimelineFrame(getPrevTimelineFrameIndex(state.level, state.mission, state.planningTime), state, 'prev'),
      'window-next': () => this.goToTimelineFrame(getNextTimelineFrameIndex(state.level, state.mission, state.planningTime), state, 'next'),
      'time-end': () => this.goToTimelineFrame(frames.length - 1, state, 'end'),
      'timeline-waypoint': (button) => this.handlers.focusWaypoint?.(button.dataset.agent, Number(button.dataset.index)),
      'timeline-marker': (button) => this.handlers.focusMarker?.(Number(button.dataset.index)),
      'timeline-star': (button) => this.handlers.time(Number(button.dataset.time)),
      'timeline-surface': (button) => this.handlers.time(Number(button.dataset.time))
    });
  }

  bind(root, actions) {
    if (!root) return;
    root.__anchorActionMap = actions ?? {};
    if (this.boundRoots.has(root)) return;
    const listener = (event) => {
      const button = event.target?.closest?.('[data-action]');
      if (!button || !root.contains(button) || button.disabled) return;
      const actionKey = button.dataset.action;
      debugMissionConsoleClick(event, actionKey);
      const action = root.__anchorActionMap?.[actionKey];
      debugMissionActionDispatch(actionKey, root.__anchorActionMap, action);
      if (!action) {
        this.app.toast?.(`No handler is registered for action ${actionKey}.`, 'warning');
        return;
      }
      event.preventDefault?.();
      action(button);
    };
    root.addEventListener('click', listener);
    this.boundRoots.set(root, listener);
  }

  goToTimelineFrame(frameIndex, state, reason = 'button') {
    const frames = getMissionTimelineFrames(state.level, state.mission);
    const bounded = Math.max(0, Math.min(frames.length - 1, Math.round(Number(frameIndex) || 0)));
    if (typeof this.handlers.frame === 'function') {
      this.handlers.frame(bounded);
    } else {
      this.handlers.time?.(frames[bounded]?.t ?? 0);
      if (!this.handlers.time && typeof this.handlers.window === 'function') {
        const fallbackWindow = Math.max(0, Math.min(getPlanningWindowCount(state.level) - 1, Number(state.selectedWindow ?? 0)));
        this.handlers.window(fallbackWindow);
      }
    }
    if (globalThis.DEBUG_TIMELINE_FRAMES) {
      console.debug('[timeline]', 'html-goToFrame', {
        reason,
        selectedTimeBefore: state.planningTime,
        frameIndex: bounded,
        selectedTimeAfter: frames[bounded]?.t,
        frames: frames.map((frame) => ({ index: frame.index, t: frame.t, kind: frame.kind, isFinalFrame: frame.isFinalFrame }))
      });
    }
  }

  actionMap() {
    return {
      'save-level': () => this.handlers.saveLevel(),
      'clear-route': () => this.handlers.clear(),
      'placement-mode': () => this.handlers.markerMode?.(),
      'clear-markers': () => this.handlers.clearMarkers?.(),
      'import-plan': () => this.handlers.importPlan(),
      'export-plan': () => this.handlers.exportPlan(),
      'toggle-ignore-update-events': () => this.handlers.toggleIgnoreUpdateEvents?.(),
      'temporal-greedy': () => this.handlers.temporalGreedy?.(),
      'solver-packet': () => this.handlers.exportSolver(),
      'roi-mode': () => this.handlers.toggleRoiMode(),
      'next-glider': () => this.handlers.nextGlider(),
      'toggle-mode': () => this.handlers.toggleMode(),
      'layer-roi': () => this.handlers.toggleLayer('showROI'),
      'layer-currents': () => this.handlers.toggleLayer('showCurrents'),
      'layer-hazards': () => this.handlers.toggleLayer('showHazards'),
      'layer-terrain': () => this.handlers.toggleLayer('showTerrain'),
      'layer-guidance': () => this.handlers.toggleLayer('showGuidance'),
      'layer-drift': () => this.handlers.toggleLayer('showDriftCone'),
      'layer-reachable': () => this.handlers.toggleLayer('showReachableArea'),
      'layer-energy': () => this.handlers.toggleLayer('showEnergyPreview'),
      'layer-markers': () => this.handlers.toggleLayer('showPlanningMarkers'),
      'layer-stars': () => this.handlers.toggleLayer('showPriorityStars'),
      'show-best-path': () => this.handlers.showBestPath?.(),
      'hide-best-path': () => this.handlers.hideBestPath?.(),
      'rerun-best-path': () => this.handlers.rerunBestPath?.(),
      'load-best-path-as-plan': () => this.handlers.loadBestPath?.(),
      'load-best-path': () => this.handlers.loadBestPath?.(),
      'export-best-path': () => this.handlers.exportBestPath?.(),
      help: () => this.handlers.help(),
      'main-menu': () => this.handlers.mainMenu?.(),
      execute: () => this.handlers.execute(),
      remove: (button) => this.handlers.remove(Number(button.dataset.index)),
      up: (button) => this.handlers.moveUp(Number(button.dataset.index)),
      down: (button) => this.handlers.moveDown(Number(button.dataset.index))
    };
  }

  destroy() {
    for (const root of Object.values(this.roots)) {
      if (root) root.innerHTML = '';
    }
  }
}

function selectedGliderCard(state) {
  const rows = getAgentPerformanceRows(state, null, state.result);
  const row = rows.find((candidate) => candidate.agentId === state.selectedAgentId) ?? rows[0];
  if (!row) return '';
  const agent = state.mission?.agents?.find((candidate) => candidate.id === row.agentId);
  const selectedStart = getSelectedStart(agent);
  const markers = state.plan?.planningMarkers?.length ?? 0;
  const starsCaptured = (state.result?.events ?? []).filter((event) => event.type === 'priorityTargetCaptured' && event.agentId === row.agentId).length;
  return `
    <section class="console-section selected-glider-card">
      <h2>Selected Glider</h2>
      <div class="hud-muted">#${escapeHtml(row.rank)} ${escapeHtml(row.label)} | ${escapeHtml(row.status)}</div>
      <div class="hud-muted">Fuel remaining: ${escapeHtml(formatHudMetric(row.batteryRemaining))}</div>
      <div class="hud-muted">Estimated planned fuel use: ${escapeHtml(formatHudMetric(row.energyUsed))}</div>
      <div class="hud-muted">ROI / points: ${escapeHtml(formatHudMetric(row.roiCollected, 2))} / ${escapeHtml(formatHudMetric(row.score))}</div>
      <div class="hud-muted">Priority stars captured: ${escapeHtml(starsCaptured)}</div>
      <div class="hud-muted">Hazards: ${escapeHtml(row.hazardsHit)} | Done/Missed: ${escapeHtml(row.completedWaypoints)}/${escapeHtml(row.missedWaypoints)}</div>
      <div class="hud-muted">Start: ${selectedStart ? `(${selectedStart.x}, ${selectedStart.y})` : 'not selected'} | Markers: ${markers}</div>
      <div class="hud-muted">Planning: W${Number(state.selectedWindow ?? 0)} at ${escapeHtml(formatMissionTime(state.level, state.planningTime))}</div>
    </section>
  `;
}

function markerInspectionSection(state) {
  const hover = state.ui?.hoverCell;
  const info = hover ? inspectCellAtTime({
    level: state.level,
    mission: state.mission,
    state,
    x: hover.x,
    y: hover.y,
    t: state.planningTime
  }) : null;
  if (!info) {
    return `
      <section class="console-section marker-inspection">
        <h2>Marker Inspection</h2>
        <div class="hud-muted">Hover any map cell to inspect ROI, currents, hazards, depth, and active priority targets at the selected time.</div>
      </section>
    `;
  }
  return `
    <section class="console-section marker-inspection">
      <h2>Marker Inspection</h2>
      <div class="hud-muted">Cell (${info.x}, ${info.y}) | ${escapeHtml(formatMissionTime(state.level, info.t))} | W${Number(info.window ?? 0)}</div>
      <div class="hud-muted">ROI Mode: ${escapeHtml(getRoiModeLabel(info.roiMode))} | Display ${formatHudMetric(info.roiDisplayValue, 2)}</div>
      <div class="hud-muted">Navigability: ${escapeHtml(info.navigability?.status ?? 'unknown')}${info.navigability?.status === 'blocked' ? ` (${escapeHtml(formatNavigabilityReason(info.navigability.reason))})` : ''}</div>
      ${roiDiagnosticRows(info)}
      <div class="hud-muted">Raw ${formatHudMetric(info.roiRawValue, 2)} | Probability ${formatHudMetric(info.roiProbability, 2)}${state.challengeMode === 'forecast' ? '' : ' deterministic'} | Expected ${formatHudMetric(info.roiExpectedValue, 2)}</div>
      <div class="hud-muted">Remaining: ${formatHudMetric(info.roiRemainingValue, 2)}${info.roiDepletedByPlan ? ` | Claimed by ${escapeHtml(claimedByLabel(info.roiClaimedBy))}` : ''}</div>
      <div class="hud-muted">Current: ${formatHudMetric(info.current.magnitude, 2)} ${escapeHtml(info.current.direction)} (${formatHudMetric(info.current.u, 2)}, ${formatHudMetric(info.current.v, 2)})</div>
      <div class="hud-muted">Terrain: ${escapeHtml(info.terrain)} | Hazard: ${info.hazard ? 'yes' : 'none'}${info.depth ? ` | Depth: ${escapeHtml(info.depth.label)}` : ''}</div>
      ${info.forecastConfidence !== null ? `<div class="hud-muted">Forecast confidence: ${formatHudMetric(info.forecastConfidence, 2)}</div>` : ''}
      ${info.priorityTarget ? `<div class="hud-muted">Priority: ${escapeHtml(info.priorityTarget.label ?? info.priorityTarget.id)} +${formatHudMetric(info.priorityTarget.value)}</div>` : '<div class="hud-muted">Priority: none active here</div>'}
    </section>
  `;
}

function timelineMarkers(state, duration) {
  if (!duration) return '';
  const markerTimes = getMissionTimelineFrames(state.level, state.mission).map((frame) => ({
    t: frame.t,
    kind: `${frame.kind}${frame.isSurfaceFrame ? ' surface' : ''}${frame.isFinalFrame ? ' mission-end' : ''}`
  }));
  if (state.ui?.showPlanningMarkers !== false) {
    for (const marker of state.plan?.planningMarkers ?? []) {
      markerTimes.push({
        t: marker.t ?? 0,
        kind: 'marker selected-agent'
      });
    }
  }
  if (state.ui?.showPriorityStars !== false) {
    for (const target of state.level?.layers?.priorityTargets ?? []) {
      for (const frame of target.frames ?? []) {
        if (frame.active) markerTimes.push({ t: frame.t, kind: 'star' });
      }
    }
  }
  return markerTimes.map((entry) => {
    const left = Math.max(0, Math.min(100, (Number(entry.t ?? 0) / duration) * 100));
    return `<span class="timeline-tick ${entry.kind}" style="left:${left}%"></span>`;
  }).join('');
}

function timelineEventIcons(state, duration, layer = 'all') {
  if (!duration) return '';
  const events = [
    ...buildTimelineEvents({
      plan: state.plan,
      selectedAgentId: state.selectedAgentId,
      priorityTargets: state.level?.layers?.priorityTargets ?? [],
      level: state.level,
      showMarkers: state.ui?.showPlanningMarkers !== false,
      showStars: state.ui?.showPriorityStars !== false
    }),
    ...surfacingTimelineEvents(state, duration)
  ].filter((event) => {
    if (layer === 'above') return ['marker', 'priorityTarget', 'surface'].includes(event.type);
    if (layer === 'below') return event.type === 'waypoint';
    return true;
  });
  const lanes = new Map();
  return events.map((event) => {
    const left = Math.max(0, Math.min(100, (Number(event.t ?? 0) / duration) * 100));
    const lane = eventLane(event, lanes, left);
    const selected = isTimelineEventSelected(state, event);
    const title = timelineEventTitle(state, event);
    const timingClass = event.type === 'marker' ? ` ${event.timingStatus ?? 'unconnected'}` : '';
    if (event.type === 'waypoint') {
      return `<button class="timeline-event waypoint${selected ? ' selected' : ''} ${escapeAttr(event.status ?? '')}" data-action="timeline-waypoint" data-agent="${escapeAttr(event.agentId)}" data-index="${event.index}" style="left:${left}%; --lane:${lane}" title="${escapeAttr(title)}">${escapeHtml(event.label)}</button>`;
    }
    if (event.type === 'marker') {
      return `<button class="timeline-event marker${selected ? ' selected' : ''}${timingClass}" data-action="timeline-marker" data-index="${event.index}" style="left:${left}%; --lane:${lane}" title="${escapeAttr(title)}">M</button>`;
    }
    if (event.type === 'surface') {
      return `<button class="timeline-event surface${event.isFinalFrame ? ' mission-end' : ''}" data-action="timeline-surface" data-time="${Number(event.t ?? 0)}" style="left:${left}%; --lane:${lane}" title="${escapeAttr(title)}">${event.isFinalFrame ? 'E' : 'S'}</button>`;
    }
    return `<button class="timeline-event star" data-action="timeline-star" data-time="${Number(event.t ?? 0)}" style="left:${left}%; --lane:${lane}" title="${escapeAttr(title)}">&#9733;</button>`;
  }).join('');
}

function surfacingTimelineEvents(state, duration) {
  return getMissionTimelineFrames(state.level, state.mission)
    .filter((frame) => frame.isSurfaceFrame && frame.t > 0)
    .map((frame) => ({
      type: 'surface',
      label: frame.isFinalFrame ? 'Mission End' : 'Surface',
      t: frame.t,
      window: getWindowForTimeFallback(state.level, frame.t),
      isFinalFrame: frame.isFinalFrame
    }));
}

function eventLane(event, lanes, left) {
  const row = event.type === 'priorityTarget' ? 'star' : event.type;
  const previous = lanes.get(row) ?? [];
  let lane = 0;
  while (previous.some((entry) => entry.lane === lane && Math.abs(entry.left - left) < 2.4)) lane += 1;
  previous.push({ left, lane });
  lanes.set(row, previous);
  return lane;
}

function isTimelineEventSelected(state, event) {
  if (event.type === 'waypoint') {
    return state.ui?.selectedWaypoint?.agentId === event.agentId && Number(state.ui.selectedWaypoint.index) === event.index;
  }
  if (event.type === 'marker') {
    return Number(state.ui?.selectedMarker?.index) === event.index;
  }
  return false;
}

function timelineEventTitle(state, event) {
  const time = formatMissionTime(state.level, event.t ?? 0);
  if (event.type === 'waypoint') {
    const energy = event.energy === null || event.energy === undefined ? 'N/A' : formatHudMetric(event.energy);
    return [
      `Waypoint ${Number(event.index ?? 0) + 1}`,
      `Glider: ${event.agentId ?? 'unknown'}`,
      `ETA: ${time}`,
      `Window: W${Number(event.window ?? 0)}`,
      `Cell: (${Number(event.x)}, ${Number(event.y)})`,
      `Status: ${labelize(event.status ?? 'pending')}`,
      `Projected energy: ${energy}`,
      event.issueMessage ? `INVALID: ${event.issueMessage}` : null
    ].filter(Boolean).join('\n');
  }
  if (event.type === 'marker') {
    const reach = event.reachability ?? {};
    const slack = reach.timeSlack === undefined ? 'N/A' : `${formatHudMetric(reach.timeSlack)} hr`;
    return [
      `Planning Marker: ${event.label ?? 'Marker'}`,
      `Time: ${time}`,
      `Window: W${Number(event.window ?? 0)}`,
      `Cell: (${Number(event.x)}, ${Number(event.y)})`,
      `Timing: ${labelize(event.timingStatus ?? 'unconnected')}`,
      `Reach estimate: ${labelize(reach.status ?? 'estimate')}`,
      `Slack: ${slack}`,
      event.note ? `Note: ${event.note}` : null
    ].filter(Boolean).join('\n');
  }
  if (event.type === 'priorityTarget') {
    const value = Number.isFinite(Number(event.value)) ? `+${formatHudMetric(event.value)}` : '+value';
    return [
      `Priority Star: ${value}`,
      `Active time: ${time}`,
      `Window: W${Number(event.window ?? 0)}`,
      `Cell: (${Number(event.x)}, ${Number(event.y)})`
    ].join('\n');
  }
  if (event.type === 'surface') {
    return [
      event.isFinalFrame ? 'Mission End / Final Surface' : 'Surfacing Window',
      `Time: ${time}`,
      `Window: W${Number(event.window ?? 0)}`,
      event.isFinalFrame
        ? 'Final mission frame is reachable from the timeline and marks the end of execution.'
        : 'Glider can report position or accept replanning if mission rules allow.'
    ].join('\n');
  }
  return `${labelize(event.type)} ${event.label ?? ''}\nTime: ${time}\nWindow: W${Number(event.window ?? 0)}`;
}

function getWindowForTimeFallback(level, time) {
  const config = getTimeConfig(level);
  const windowSize = Number(config.planningWindow ?? level?.world?.time?.planningWindow ?? 1);
  if (!Number.isFinite(windowSize) || windowSize <= 0) return 0;
  const count = getPlanningWindowCount(level);
  return Math.max(0, Math.min(count - 1, Math.floor(Number(time ?? 0) / windowSize)));
}

function menu(label, items) {
  return `
    <details class="hud-menu">
      <summary>${escapeHtml(label)}</summary>
      <div class="hud-menu-body">
        ${items.map(([action, itemLabel, options = {}]) => `<button data-action="${action}"${options.disabled ? ' disabled' : ''}${options.title ? ` title="${escapeAttr(options.title)}"` : ''}>${escapeHtml(itemLabel)}</button>`).join('')}
      </div>
    </details>
  `;
}

function legend(kind, label) {
  return `<div class="legend-item"><span class="legend-swatch ${kind}"></span><span>${escapeHtml(label)}</span></div>`;
}

function layerButton(state, key, label) {
  const action = {
    showROI: 'layer-roi',
    showCurrents: 'layer-currents',
    showHazards: 'layer-hazards',
    showTerrain: 'layer-terrain',
    showGuidance: 'layer-guidance',
    showDriftCone: 'layer-drift',
    showReachableArea: 'layer-reachable',
    showEnergyPreview: 'layer-energy',
    showPlanningMarkers: 'layer-markers',
    showBestPathOverlay: 'layer-best-path',
    showPriorityStars: 'layer-stars'
  }[key];
  const title = {
    showROI: roiModeDescription(state),
    showGuidance: 'Shows or hides the planning guidance overlay group.',
    showDriftCone: 'Guidance estimate based on local current and planning-window duration.',
    showReachableArea: 'Approximate speed/time/current reachability guide, not a guarantee.',
    showEnergyPreview: 'Projected route cost preview; actual fuel is computed during simulation.',
    showBestPathOverlay: 'Shows or hides the top-scoring saved path for this exact challenge instance.'
  }[key] ?? '';
  const titleAttr = title ? ` title="${escapeHtml(title)}"` : '';
  return `<button class="console-button secondary" data-action="${action}"${titleAttr}>${state.ui?.[key] === false ? 'Show' : 'Hide'} ${escapeHtml(label)}</button>`;
}

function isTemporalGreedyRunning(state) {
  return Boolean(state?.ui?.plannerState?.temporalGreedyRunning || state?.ui?.temporalGreedyRunning);
}

function roiModeLegendLabel(state) {
  const label = getRoiModeLabel(state.ui?.roiViewMode);
  if (normalizeRoiMode(state.ui?.roiViewMode) === 'travelCost') {
    const anchor = getTravelCostAnchor({
      plan: state.plan,
      mission: state.mission,
      selectedAgentId: state.selectedAgentId,
      selectedWaypoint: state.ui?.selectedWaypoint,
      planningAnchor: state.ui?.planningAnchor
    });
    if (!anchor) return 'Travel Cost (choose deployment/start or place a waypoint first)';
    const budget = getTravelCostBudget({
      level: state.level,
      mission: state.mission,
      plan: state.plan,
      selectedAgentId: state.selectedAgentId,
      selectedWaypoint: state.ui?.selectedWaypoint,
      planningAnchor: state.ui?.planningAnchor,
      t: state.planningTime
    });
    const source = anchor.source === 'selectedWaypoint'
      ? `waypoint ${Number(anchor.waypointIndex ?? 0) + 1}`
      : anchor.source === 'latestWaypoint'
        ? `latest waypoint ${Number(anchor.waypointIndex ?? 0) + 1}`
        : anchor.source ?? 'start';
    return `Travel Cost from ${state.selectedAgentId ?? 'glider'} ${source} (${Number(anchor.x).toFixed(0)}, ${Number(anchor.y).toFixed(0)}) | Budget ${formatBudget(budget.availableTime, 'hr')}, fuel ${formatBudget(budget.remainingFuel, '')}`;
  }
  if (normalizeRoiMode(state.ui?.roiViewMode) === 'probability' && state.challengeMode !== 'forecast') {
    return `${label} (deterministic cells are 1.0 when ROI exists)`;
  }
  return label === 'Remaining' ? 'Remaining Value' : label;
}

function roiModeLegendDetails(state) {
  if (normalizeRoiMode(state.ui?.roiViewMode) !== 'travelCost') return '';
  return '<div class="hud-muted">Scale: teal low cost, yellow medium, red high, hatched unreachable.</div>';
}

function roiModeDescription(state) {
  return getRoiModeDescription(state.ui?.roiViewMode, {
    deterministic: state.challengeMode !== 'forecast'
  });
}

function tutorialHintSection(state) {
  const hint = getTutorialHint(state.level, state);
  if (!hint) return '';
  return `
    <section class="console-section tutorial-hint">
      <h2>Tutorial Step</h2>
      <div class="hud-muted"><strong>${escapeHtml(hint.title)}</strong></div>
      <div class="hud-muted">${escapeHtml(hint.body)}</div>
    </section>
  `;
}

function importDemoSection(state, executeDisabled) {
  const demo = state.level?.tutorial?.importDemo;
  if (!demo) return '';
  const status = state.importedPlanSummary;
  const routeAudit = state.ui?.routeAudit;
  const routeStatus = routeAudit?.ok === false
    ? `Route validation failed: ${routeAuditSummary(routeAudit)}`
    : status
      ? 'Route validation passed or has no blocking issues.'
      : 'No demo plan loaded yet.';
  return `
    <section class="console-section">
      <h2>Import Demo</h2>
      <div class="hud-muted">Plan file: ${escapeHtml(demo.planUrl ?? 'tutorials/import-demo/import-demo-waypoints.json')}</div>
      <button class="console-button primary" data-action="load-demo-plan">Load Built-In Demo Plan</button>
      <button class="console-button" data-action="download-demo-plan">Download Demo Plan JSON</button>
      <button class="console-button" data-action="import-plan">Import Waypoint Data</button>
      <button class="console-button" data-action="clear-imported-plan">Clear Imported Plan</button>
      <button class="console-button" data-action="execute">Execute Mission</button>
      <button class="console-button secondary" data-action="main-menu">Main Menu</button>
      ${status ? `<div class="hud-muted">Imported: ${escapeHtml(status.plannerName ?? demo.label ?? 'Tutorial Demo Plan')} | ${Number(status.waypointCount ?? 0)} waypoint(s)</div>` : ''}
      <div class="hud-muted">${escapeHtml(routeStatus)}</div>
    </section>
  `;
}

function bestPriorRunSummary(state) {
  const vm = state.bestPriorRunVm;
  const best = vm?.bestPriorRun ?? state.bestPriorPath;
  if (!best?.attempt) {
    return '<div class="hud-muted">No prior run saved for this challenge yet.</div>';
  }
  const summary = best.bestPathSummary ?? {};
  const score = best.bestScore ?? best.attempt.score ?? null;
  const energyUsed = summary.energyUsed ?? best.attempt.summary?.energyUsed ?? best.attempt.result?.summary?.energyUsed ?? null;
  const elapsedTime = summary.elapsedTime ?? best.attempt.summary?.elapsedTime ?? best.attempt.result?.summary?.elapsedTime ?? null;
  const waypointCount = summary.waypointCount ?? countPlanWaypoints(best.attempt.plan);
  const starsCaptured = safeInteger(summary.starsCaptured ?? best.attempt.summary?.priorityTargets?.captured, 'N/A');
  const starsAvailable = safeInteger(summary.starsAvailable ?? best.attempt.summary?.priorityTargets?.available, 'N/A');
  const attemptCount = safeInteger(best.attemptCount, 1);
  const planLabel = best.attempt.label
    ?? best.attempt.plan?.meta?.name
    ?? best.attempt.plan?.planner?.name
    ?? 'Saved Plan';
  const showing = state.ui?.showBestPathOverlay === true;
  const showTitle = vm?.canShowBestPath ? '' : ` title="${escapeAttr(bestPathUnavailableReason(vm, 'show'))}" disabled`;
  const loadTitle = vm?.canLoadBestPathAsPlan ? '' : ` title="${escapeAttr(bestPathUnavailableReason(vm, 'load'))}" disabled`;
  const rerunTitle = vm?.canRerunBestPath ? '' : ` title="${escapeAttr(bestPathUnavailableReason(vm, 'rerun'))}" disabled`;
  const exportTitle = vm?.canExportBestPath ? '' : ` title="${escapeAttr(bestPathUnavailableReason(vm, 'export'))}" disabled`;
  debugBestPathRender(vm, [
    showing ? 'hide-best-path' : 'show-best-path',
    'rerun-best-path',
    'load-best-path-as-plan',
    'export-best-path'
  ], state);
  return `
    <div class="hud-muted"><strong>Best prior run</strong></div>
    <div class="hud-muted">Score: ${escapeHtml(formatHudMetric(score))}</div>
    <div class="hud-muted">Plan: ${escapeHtml(planLabel)}</div>
    <div class="hud-muted">Energy: ${escapeHtml(formatHudMetric(energyUsed))} | Time: ${escapeHtml(formatHudMetric(elapsedTime))} hr | Waypoints: ${escapeHtml(safeInteger(waypointCount, 'N/A'))}</div>
    <div class="hud-muted">Stars: ${escapeHtml(starsCaptured)}/${escapeHtml(starsAvailable)} | Attempts: ${escapeHtml(attemptCount)}</div>
    <div class="hud-muted">Actual path: ${summary.actualPathAvailable ? 'available' : 'planned route only'}</div>
    ${replayDiagnosticsCardHtml(vm, { title: 'Replay Status', className: 'compact' })}
    <button type="button" class="console-button" data-action="${showing ? 'hide-best-path' : 'show-best-path'}"${showing ? '' : showTitle}>${showing ? 'Hide Best Path' : 'Show Best Path'}</button>
    <button type="button" class="console-button" data-action="rerun-best-path"${rerunTitle}>Rerun Best Path</button>
    <button type="button" class="console-button" data-action="load-best-path-as-plan"${loadTitle}>Load Best Path as Plan</button>
    <button type="button" class="console-button" data-action="export-best-path"${exportTitle}>Export Best Path</button>
  `;
}

function temporalGreedyPlannerSummary(state) {
  const plan = state.temporalGreedyPlan;
  const stop = plan?.meta?.greedyStop;
  if (!stop) return '';
  const waypointCount = (plan.agentPlans ?? []).reduce((sum, agentPlan) => sum + (agentPlan.waypoints?.length ?? 0), 0);
  const duration = Number(state.level?.world?.time?.duration ?? 0);
  const startingFuel = (state.mission?.agents ?? []).reduce((sum, agent) => sum + Number(agent.battery ?? agent.maxBattery ?? 100), 0);
  const fuelUsed = Math.max(0, startingFuel - Number(stop.remainingFuel ?? 0));
  const unreachableCandidates = (stop.agents ?? []).reduce((sum, agentStop) => sum + Number(agentStop.unreachableCandidates ?? 0), Number(stop.unreachableCandidates ?? 0));
  const blockedCandidates = (stop.agents ?? []).reduce((sum, agentStop) => sum + Number(agentStop.blockedCandidates ?? 0), Number(stop.blockedCandidates ?? 0));
  const stochasticRiskCandidates = (stop.agents ?? []).reduce((sum, agentStop) => sum + Number(agentStop.stochasticRiskCandidates ?? 0), Number(stop.stochasticRiskCandidates ?? 0));
  const guardFailure = Boolean(stop.guardFailure || (stop.agents ?? []).some((agentStop) => agentStop.guardFailure));
  const depletion = plan.meta?.sharedDepletion ?? {};
  return `
    <div class="replay-diagnostics-card compact">
      <div class="replay-diagnostics-title">Temporal Greedy</div>
      <div class="replay-diagnostics-row"><span>Waypoints</span><strong>${escapeHtml(waypointCount)}</strong></div>
      <div class="replay-diagnostics-row"><span>Planned Time</span><strong>${escapeHtml(formatHudMetric(stop.stopTime))} / ${escapeHtml(formatHudMetric(duration))} hr</strong></div>
      <div class="replay-diagnostics-row"><span>Fuel Used</span><strong>${escapeHtml(formatHudMetric(fuelUsed))} / ${escapeHtml(formatHudMetric(startingFuel))}</strong></div>
      <div class="replay-diagnostics-row"><span>Shared Depletion</span><strong>${depletion.enabled ? `enabled, ${escapeHtml(depletion.duplicateSamplesAvoided ?? 0)} avoided` : 'single-agent not needed'}</strong></div>
      ${unreachableCandidates > 0 ? `<div class="replay-diagnostics-row"><span>Skipped</span><strong>${escapeHtml(unreachableCandidates)} unreachable</strong></div>` : ''}
      ${blockedCandidates > 0 ? `<div class="replay-diagnostics-row"><span>Blocked</span><strong>${escapeHtml(blockedCandidates)} rejected</strong></div>` : ''}
      ${stochasticRiskCandidates > 0 ? `<div class="replay-diagnostics-row"><span>Forecast Risk</span><strong>${escapeHtml(stochasticRiskCandidates)} avoided</strong></div>` : ''}
      ${guardFailure ? '<div class="hud-muted warning">Planner guard stopped before a normal horizon/fuel/no-candidate condition.</div>' : ''}
      <div class="replay-diagnostics-row"><span>Stop Reason</span><strong>${escapeHtml(labelizeStopReason(stop.stopReason))}</strong></div>
    </div>
  `;
}

function bestPathUnavailableReason(vm, action) {
  const missing = vm?.missingFields?.length ? vm.missingFields.join(', ') : 'best prior run';
  if (action === 'show') return `Cannot show best path: missing ${missing}.`;
  if (action === 'load') return `Cannot load best path as plan: missing ${missing}.`;
  if (action === 'rerun') return `Cannot rerun best path: missing ${missing}.`;
  return `Cannot export best path: missing ${missing}.`;
}

function debugBestPathRender(vm, buttonActions, state) {
  if (!globalThis.ANCHOR_DEBUG_BEST_PATH) return;
  globalThis.console?.debug?.('[BestPath][Render]', {
    entryPath: state?.currentScenario?.source ?? state?.mode ?? 'unknown',
    attemptId: vm?.attemptId ?? null,
    challengeId: vm?.challengeId ?? null,
    plannedPathAvailable: Boolean(vm?.plannedPathAvailable),
    actualPathAvailable: Boolean(vm?.actualPathAvailable),
    exactReplayAvailable: Boolean(vm?.exactReplayAvailable),
    buttonActions
  });
}

function debugMissionConsoleClick(event, action) {
  if (!globalThis.ANCHOR_DEBUG_BEST_PATH) return;
  globalThis.console?.debug?.('[MissionConsole][Click]', {
    targetTag: event.target?.tagName ?? null,
    action
  });
}

function debugMissionActionDispatch(action, handlers, handler) {
  if (!globalThis.ANCHOR_DEBUG_BEST_PATH) return;
  globalThis.console?.debug?.('[MissionActionDispatch]', {
    action,
    hasHandler: Boolean(handler),
    registeredActions: Object.keys(handlers ?? {})
  });
}

function countPlanWaypoints(plan) {
  if (!Array.isArray(plan?.agentPlans)) return null;
  return plan.agentPlans.reduce((sum, agentPlan) => sum + (agentPlan.waypoints?.length ?? 0), 0);
}

function safeInteger(value, fallback = 'N/A') {
  const numeric = Number(value);
  return Number.isFinite(numeric) ? String(Math.round(numeric)) : fallback;
}

function routeAuditSection(routeAudit) {
  const issues = (routeAudit?.agentResults ?? []).flatMap((result) => result.issues ?? []);
  if (!issues.length) return '';
  const hasErrors = issues.some((issue) => issue.severity === 'error');
  return `
    <section class="console-section warning">
      <h2>${hasErrors ? 'Route Invalid' : 'Route Warnings'}</h2>
      <div class="hud-muted">${escapeHtml(routeAuditSummary(routeAudit))}</div>
      ${issues.slice(0, 3).map((issue) => `<div class="hud-muted">- ${escapeHtml(issue.message)}</div>`).join('')}
    </section>
  `;
}

function routeAuditSummary(routeAudit) {
  const issues = (routeAudit?.agentResults ?? []).flatMap((result) => result.issues ?? []);
  if (!issues.length) return 'Route has no audit issues.';
  const first = issues[0];
  const hasErrors = issues.some((issue) => issue.severity === 'error');
  const prefix = hasErrors ? 'Route invalid' : 'Route warning';
  if (issues.length === 1) return `${prefix}: ${first.message}`;
  return `${hasErrors ? 'Route invalid' : 'Route warnings'}: ${issues.length} issues found. First issue: ${first.message}`;
}

function routeAuditIssueCount(routeAudit) {
  return (routeAudit?.agentResults ?? []).reduce((sum, result) => sum + (result.issues?.length ?? 0), 0);
}

function claimedByLabel(claimedBy = []) {
  if (!claimedBy.length) return 'current plan';
  return claimedBy
    .slice(0, 3)
    .map((claim) => {
      if (claim.source === 'segment') return `${claim.agentId ?? 'glider'} segment ${Number(claim.segmentIndex ?? 0) + 1}`;
      return `${claim.agentId ?? 'glider'} waypoint ${Number(claim.waypointIndex ?? 0) + 1}`;
    })
    .join(', ');
}

function roiDiagnosticRows(info) {
  if (info.roiMode === 'travelCost') {
    const travel = info.roiTravel ?? {};
    if (travel.available === false) return '<div class="hud-muted warning">Travel Cost: choose deployment/start or place a waypoint first.</div>';
    return `
      <div class="hud-muted">Travel Cost: ${formatHudMetric(travel.cost, 1)} | Energy ${formatHudMetric(travel.energy, 1)} / ${formatBudget(travel.remainingFuel, '')} | ETA ${formatHudMetric(travel.eta, 1)} / ${formatBudget(travel.availableTime, 'hr')}</div>
      <div class="hud-muted">Current (${formatHudMetric(travel.currentVector?.u, 2)}, ${formatHudMetric(travel.currentVector?.v, 2)}) mag ${formatHudMetric(travel.currentMagnitude, 2)} | Along ${formatSignedMetric(travel.currentAlong, 2)} | Cross ${formatHudMetric(travel.currentCross, 2)} | Speed ${formatHudMetric(travel.effectiveSpeed, 2)}</div>
      <div class="hud-muted">Reachable ${travel.reachable ? 'yes' : 'no'} | ${escapeHtml(travel.currentLabel ?? 'current estimate')}${travel.message ? ` | ${escapeHtml(travel.message)}` : ''}</div>
    `;
  }
  if (info.roiMode === 'riskSafety') {
    const risk = info.roiRisk ?? {};
    return `
      <div class="hud-muted">Risk / Safety: ${escapeHtml(risk.label ?? 'low')} risk (${formatHudMetric(risk.value, 2)}) | Safety ${escapeHtml(risk.safetyLabel ?? 'high')} (${formatHudMetric(risk.safetyValue ?? (1 - Number(risk.value ?? 0)), 2)})</div>
      ${risk.reasons?.length ? `<div class="hud-muted">Reason: ${escapeHtml(risk.reasons.slice(0, 3).join(', '))}</div>` : ''}
    `;
  }
  return '';
}

function formatBudget(value, suffix = '') {
  const numeric = Number(value);
  if (!Number.isFinite(numeric)) return 'unlimited';
  return `${formatHudMetric(numeric, 1)}${suffix ? ` ${suffix}` : ''}`;
}

function formatSignedMetric(value, digits = 2) {
  const numeric = Number(value);
  if (!Number.isFinite(numeric)) return 'N/A';
  return `${numeric >= 0 ? '+' : ''}${formatHudMetric(numeric, digits)}`;
}

function formatNavigabilityReason(reason) {
  return {
    terrain: 'terrain block',
    tooShallow: 'too shallow',
    outsideMap: 'outside map',
    invalidPoint: 'invalid point'
  }[reason] ?? reason ?? 'unknown';
}

function waypointTable(state, waypoints) {
  return `
    <table class="waypoint-table">
      <thead><tr><th>#</th><th>Win</th><th>Cell</th><th></th></tr></thead>
      <tbody>
        ${waypoints.map((waypoint, index) => {
          const selected = state.ui?.selectedWaypoint?.agentId === state.selectedAgentId && state.ui.selectedWaypoint.index === index;
          const active = Number(waypoint.window ?? 0) === Number(state.selectedWindow ?? 0);
          return `
            <tr class="${selected ? 'selected' : active ? 'active' : ''}">
              <td>${index + 1}</td>
              <td>W${Number(waypoint.window ?? 0)}<br><span class="hud-muted">${escapeHtml(formatMissionTime(state.level, waypoint.t ?? 0))}</span></td>
              <td>(${Number(waypoint.x)}, ${Number(waypoint.y)})<br><span class="hud-muted">${escapeHtml(waypoint.action ?? 'sample')}</span></td>
              <td class="waypoint-actions">
                <button data-action="up" data-index="${index}" ${index === 0 ? 'disabled' : ''}>Up</button>
                <button data-action="down" data-index="${index}" ${index >= waypoints.length - 1 ? 'disabled' : ''}>Dn</button>
                <button data-action="remove" data-index="${index}">Del</button>
              </td>
            </tr>
          `;
        }).join('')}
      </tbody>
    </table>
  `;
}

function routeEstimate(state) {
  const agentPlan = (state.plan?.agentPlans ?? []).find((plan) => plan.agentId === state.selectedAgentId);
  const waypoints = agentPlan?.waypoints ?? [];
  const agent = (state.mission?.agents ?? []).find((candidate) => candidate.id === state.selectedAgentId);
  const route = buildRouteSegmentsForAgent({
    level: state.level,
    mission: state.mission,
    agent,
    agentPlan,
    surfacedAgents: state.surfacedAgents,
    planningAnchor: state.ui?.planningAnchor
  });
  if (route.missingAnchor) {
    return {
      distance: 0,
      energyText: 'choose deployment first'
    };
  }
  const distance = route.segments.reduce((sum, segment) => (
    sum + Math.hypot(Number(segment.to.x) - Number(segment.from.x), Number(segment.to.y) - Number(segment.from.y))
  ), 0);
  const previous = route.segments.at(-1)?.to ?? route.anchor ?? { x: agent?.start?.x ?? 0, y: agent?.start?.y ?? 0 };
  const energyRate = Number(state.mission?.scoring?.energyCostPerDistance ?? state.mission?.rules?.energyCostPerDistance ?? 1);
  const budget = Number(agent?.battery ?? state.mission?.rules?.energyBudget ?? 0);
  const energy = distance * energyRate;
  const hoverPreview = state.ui?.hoverCell && state.ui?.showEnergyPreview !== false
    ? hoverEnergyPreview(state, previous, agent)
    : null;
  return {
    distance,
    energyText: hoverPreview
      ? `${hoverPreview.valid ? hoverPreview.energy.toFixed(1) : 'invalid'} (${hoverPreview.note})`
      : budget ? `${Math.round(energy)} / ${Math.round(budget)}` : `${Math.round(energy)}`
  };
}

function hoverEnergyPreview(state, origin, agent) {
  const frame = getPlanningFrame(state.level, state.planningTime, {
    challengeMode: state.challengeMode,
    revealTruth: state.ui?.revealTruth,
    forecastMemberId: state.ui?.forecastMemberId
  });
  const preview = estimateRouteEnergy(origin, state.ui.hoverCell, state.level, agent, frame, {
    driftGain: state.mission?.physics?.driftGain ?? 0.5,
    energyPerCell: state.mission?.physics?.energyPerCell ?? 1
  });
  return {
    ...preview,
    note: preview.notes?.[0] ?? (preview.currentAssist >= 0 ? 'current helpful' : 'against current')
  };
}

function toggleLabel(state, key, label) {
  return `${state.ui?.[key] === false ? 'Show' : 'Hide'} ${label}`;
}

function labelize(value) {
  return String(value ?? '').replace(/([A-Z])/g, ' $1').replace(/^./, (letter) => letter.toUpperCase());
}

function labelizeStopReason(value) {
  return String(value ?? 'unknown')
    .replace(/_/g, ' ')
    .replace(/([A-Z])/g, ' $1')
    .replace(/\b\w/g, (letter) => letter.toUpperCase());
}

function escapeHtml(value) {
  return String(value ?? '').replace(/[&<>"']/g, (char) => ({
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#039;'
  }[char]));
}

function escapeAttr(value) {
  return escapeHtml(value).replace(/`/g, '&#096;');
}
