import { SimulationEngine } from '../../core/sim/SimulationEngine.js';
import { ScorePanel } from '../../ui/panels/ScorePanel.js';
import { EventPanel } from '../../ui/panels/EventPanel.js';
import { AgentPanel } from '../../ui/panels/AgentPanel.js';
import { greedySolver } from '../../core/planning/BaselineSolvers.js';
import { computeForecastRegret, computeRegretRatio } from '../../core/evaluation/RegretMetrics.js';
import { getVisiblePlanningSource } from '../../core/sim/ChallengeMode.js';
import { formatMissionTime, getWindowForTime } from '../../core/time/MissionTime.js';
import { attachIdentityToResult } from '../../core/identity/GameInstanceId.js';

export class SimulationScene {
  label = 'Simulation';

  constructor(app) {
    this.app = app;
    this.engine = null;
    this.scorePanel = null;
    this.eventPanel = null;
    this.agentPanel = null;
    this.referenceSummary = null;
  }

  enter() {
    this.createEngine();
    this.scorePanel = new ScorePanel(this.app.elements.scorePanel);
    this.eventPanel = new EventPanel(this.app.elements.eventPanel);
    this.agentPanel = new AgentPanel(this.app.elements.waypointPanel);

    this.app.setPanel(`
      <h2>Simulation</h2>
      <p class="small">Resolve the waypoint plan under currents, terrain, hazards, battery limits, and ROI sampling.</p>
      <div class="panel-stack">
        <button id="btn-play-pause-sim">Play</button>
        <button id="btn-step-sim">Step</button>
        <button id="btn-reset-sim">Reset Simulation</button>
        <button id="btn-finish-sim">Finish Instantly</button>
        <button id="btn-back-planning">Back to Planning</button>
        <button id="btn-debrief">Go to Debrief</button>
      </div>
      <p id="sim-status" class="small">Ready.</p>
    `);

    document.getElementById('btn-play-pause-sim').onclick = () => {
      if (this.engine.running) this.engine.pause();
      else this.engine.play();
      this.refreshControls();
    };
    document.getElementById('btn-step-sim').onclick = () => {
      this.engine.pause();
      this.engine.stepOnce();
      this.syncResult();
      this.refreshControls();
    };
    document.getElementById('btn-reset-sim').onclick = () => {
      this.createEngine();
      this.refreshControls();
      this.app.toast('Simulation reset. Plan preserved.', 'info');
    };
    document.getElementById('btn-finish-sim').onclick = () => {
      this.engine.runUntilComplete();
      this.syncResult();
      this.refreshControls();
    };
    document.getElementById('btn-back-planning').onclick = () => this.app.goTo('planning');
    document.getElementById('btn-debrief').onclick = () => {
      this.syncResult();
      this.app.goTo('debrief');
    };

    this.refreshPanels();
    this.refreshControls();
  }

  createEngine() {
    this.engine = new SimulationEngine({
      level: this.app.state.level,
      mission: this.app.state.mission,
      plan: this.app.state.plan,
      resumeState: this.app.state.simulationResume
    });
    this.app.state.simulationResume = null;
    this.referenceSummary = null;
    this.syncResult();
  }

  exit() {
    document.getElementById('surface-decision-modal')?.remove();
  }

  update(dt) {
    if (!this.engine) return;
    this.engine.step(dt);
    this.syncResult();
    this.refreshPanels();
    this.refreshStatus();
    this.refreshSurfaceDecision();
    if (this.engine.complete) this.refreshControls();
  }

  syncResult() {
    const baseResult = this.engine.getResult();
    const regret = this.getRegretMetrics(baseResult);
    const result = attachIdentityToResult({
      ...baseResult,
      challengeMode: this.app.state.challengeMode,
      source: this.app.state.currentPlanSource ?? 'unknown',
      planMetadata: this.app.state.plan?.meta ?? {},
      planningSource: getVisiblePlanningSource({
        challengeMode: this.app.state.challengeMode,
        revealTruth: this.app.state.ui.revealTruth
      }),
      truthScore: baseResult.summary?.finalScore ?? null,
      forecastScore: this.app.state.challengeMode === 'forecast' ? baseResult.summary?.finalScore ?? null : null,
      regret
    }, this.app.state.level, this.app.state.mission);
    this.app.state.result = result;
    if (result.source === 'manual') this.app.state.manualResult = result;
    if (result.source === 'importedSolver') this.app.state.solverResult = result;
    if (result.source === 'greedyBaseline') this.app.state.greedyResult = result;
  }

  getRegretMetrics(result) {
    if (this.app.state.challengeMode !== 'forecast' || !this.engine.complete) return null;
    if (!this.referenceSummary) {
      const referencePlan = greedySolver(this.app.state.level, this.app.state.mission);
      const referenceEngine = new SimulationEngine({
        level: this.app.state.level,
        mission: this.app.state.mission,
        plan: referencePlan
      });
      referenceEngine.runUntilComplete();
      this.referenceSummary = referenceEngine.getSummary();
    }
    const referenceScore = this.referenceSummary.finalScore;
    const actualScore = result.summary?.finalScore;
    return {
      reference: 'greedyTruthBaseline',
      referenceScore,
      actualScore,
      forecastRegret: computeForecastRegret(referenceScore, actualScore),
      regretRatio: computeRegretRatio(referenceScore, actualScore)
    };
  }

  refreshPanels() {
    this.scorePanel?.render(this.engine.getSummary());
    this.eventPanel?.render(this.engine.events);
    this.agentPanel?.render(this.engine.agents);
  }

  refreshControls() {
    const playPause = document.getElementById('btn-play-pause-sim');
    const step = document.getElementById('btn-step-sim');
    if (playPause) playPause.textContent = this.engine.running ? 'Pause' : 'Play';
    if (step) step.disabled = this.engine.complete;
    this.refreshPanels();
    this.refreshStatus();
    this.refreshSurfaceDecision();
  }

  refreshStatus() {
    const status = document.getElementById('sim-status');
    if (!status || !this.engine) return;
    const summary = this.engine.getSummary();
    if (this.engine.complete) {
      status.textContent = `Complete at ${summary.elapsedTime}s. Final score ${summary.finalScore}.`;
    } else if (this.engine.running) {
      status.textContent = `Running: ${summary.elapsedTime}s, energy ${summary.energyUsed}, samples ${summary.sampledCells}.`;
    } else {
      status.textContent = `Paused: ${summary.elapsedTime}s, energy ${summary.energyUsed}, samples ${summary.sampledCells}.`;
    }
  }

  refreshSurfaceDecision() {
    const decision = this.engine?.awaitingSurfaceDecision;
    let modal = document.getElementById('surface-decision-modal');
    if (!decision) {
      modal?.remove();
      return;
    }
    const decisionKey = `${decision.t}:${decision.agents?.map((agent) => agent.agentId).join(',')}`;
    if (modal?.dataset.decisionKey === decisionKey) return;

    if (!modal) {
      modal = document.createElement('div');
      modal.id = 'surface-decision-modal';
      modal.className = 'surface-modal';
      document.body.appendChild(modal);
    }
    modal.dataset.decisionKey = decisionKey;

    const first = decision.agents?.[0];
    modal.innerHTML = `
      <section class="surface-modal-card" role="dialog" aria-modal="true" aria-label="Surfacing update">
        <h2>${first?.agentId ?? 'Glider'} surfaced at ${formatMissionTime(this.app.state.level, decision.t)}</h2>
        <p class="small">Expected position: ${formatPoint(first?.expected)} | Actual position: ${formatPoint(first?.actual)}</p>
        <p class="small">Update penalty: ${decision.updatePenalty ?? 0}</p>
        <div class="surface-modal-actions">
          <button id="btn-surface-continue">Continue Mission</button>
          <button id="btn-surface-update">Update Waypoints</button>
          <button id="btn-surface-finish">Finish Simulation</button>
        </div>
      </section>
    `;

    document.getElementById('btn-surface-continue').onclick = () => {
      this.engine.continueFromSurface();
      this.syncResult();
      this.refreshControls();
    };
    document.getElementById('btn-surface-update').onclick = () => {
      this.engine.recordReplanDecision();
      this.syncResult();
      this.app.state.simulationResume = this.engine.createResumeState();
      this.app.state.surfacedAgents = this.engine.agents.map((agent) => ({
        id: agent.id,
        x: agent.x,
        y: agent.y,
        t: this.engine.t,
        commsState: agent.commsState
      }));
      this.app.state.planningTime = this.engine.t;
      this.app.state.selectedWindow = getWindowForTime(this.app.state.level, this.engine.t);
      modal.remove();
      this.app.goTo('planning');
    };
    document.getElementById('btn-surface-finish').onclick = () => {
      this.engine.awaitingSurfaceDecision = null;
      this.engine.runUntilComplete();
      this.syncResult();
      this.refreshControls();
    };
  }

  render(renderer) {
    renderer.drawSimulation(this.app.state, this.engine);
  }
}

function formatPoint(point) {
  if (!point) return 'N/A';
  return `(${Number(point.x).toFixed(1)}, ${Number(point.y).toFixed(1)})`;
}
