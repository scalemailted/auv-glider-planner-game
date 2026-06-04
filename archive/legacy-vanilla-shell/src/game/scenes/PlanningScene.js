import { WaypointPanel } from '../../ui/panels/WaypointPanel.js';
import { TimelinePanel } from '../../ui/panels/TimelinePanel.js';
import { GuidancePanel } from '../../ui/panels/GuidancePanel.js';
import {
  VALID_WAYPOINT_ACTIONS,
  addWaypoint,
  clearAgentWaypoints,
  clearAllWaypoints,
  createEmptyPlan,
  getAgentStartAtCell,
  getUnknownAgentIds,
  getWaypointCount,
  getWaypointAtCell,
  hitTestWaypoint,
  isValidWaypointCell,
  moveWaypoint,
  moveWaypointDown,
  moveWaypointUp,
  normalizePlan,
  removeWaypoint,
  updateWaypoint,
  validatePlan
} from '../../core/planning/WaypointPlan.js';
import { downloadJSON, readJSONFile } from '../../core/io/ImportExport.js';
import { buildSolverPacket } from '../../core/io/SolverPacketExporter.js';
import { greedySolver } from '../../core/planning/BaselineSolvers.js';
import { ensureForecastFields } from '../../core/sim/ChallengeMode.js';
import { getLevelObjectiveSummary, getPlanningPrompts } from '../../core/campaign/LevelObjectives.js';
import {
  clampMissionTime,
  formatMissionTime,
  getPlanningWindowCount,
  getWindowForTime,
  getWindowStartTime
} from '../../core/time/MissionTime.js';
import {
  attachIdentityToPlan,
  ensureLevelIdentity,
  planMatchesLevel,
  shortInstanceId
} from '../../core/identity/GameInstanceId.js';

export class PlanningScene {
  label = 'Planning';

  constructor(app) {
    this.app = app;
    this.waypointPanel = null;
    this.timelinePanel = null;
    this.guidancePanel = null;
    this.pointerInteraction = null;
    this.onCanvasPointerDown = this.onCanvasPointerDown.bind(this);
    this.onCanvasPointerMove = this.onCanvasPointerMove.bind(this);
    this.onCanvasPointerUp = this.onCanvasPointerUp.bind(this);
  }

  enter() {
    const { mission, level } = this.app.state;
    ensureLevelIdentity(level);
    this.app.elements.shell?.classList.remove('workspace-controls-collapsed');
    if (this.app.state.challengeMode === 'forecast') ensureForecastFields(level);
    if (!this.app.state.plan) {
      this.app.state.plan = createEmptyPlan(level, mission);
      this.app.state.currentPlanSource = 'manual';
      this.app.state.manualPlan = this.app.state.plan;
    }
    else this.app.state.plan = normalizePlan(this.app.state.plan, level, mission);
    if (!this.app.state.selectedAgentId) this.app.state.selectedAgentId = mission.agents?.[0]?.id ?? null;
    this.app.state.planningTime = clampMissionTime(level, this.app.state.planningTime ?? 0);
    this.app.state.selectedWindow = getWindowForTime(level, this.app.state.planningTime);
    const objectiveSummary = getLevelObjectiveSummary(level, mission);
    const criteria = level?.campaign?.successCriteria ?? {};

    this.app.setPanel(`
      <section class="planning-hud">
        <div class="hud-title">
          <span class="hud-kicker">Mission Workspace</span>
          <h2>${escapeHtml(level?.meta?.name ?? 'Planning')}</h2>
          <p class="small id-line">Level ${escapeHtml(level?.levelId ?? 'unknown')} | Instance ${escapeHtml(shortInstanceId(level))} | Seed ${escapeHtml(level?.meta?.seed ?? 'N/A')}</p>
          <p id="plan-status" class="small"></p>
        </div>
        <div class="hud-grid">
          <label>Glider <select id="agent-select"></select></label>
          <label>Window <select id="window-select"></select></label>
          <label>Time <span id="planning-time-label" class="hud-value">${formatMissionTime(level, this.app.state.planningTime)}</span></label>
          <label>Mode
            <select id="planning-challenge-mode">
              <option value="perfectKnowledge" ${this.app.state.challengeMode === 'perfectKnowledge' ? 'selected' : ''}>Truth</option>
              <option value="forecast" ${this.app.state.challengeMode === 'forecast' ? 'selected' : ''}>Forecast</option>
            </select>
          </label>
        </div>
        <div class="hud-toggles">
          <label><input id="show-confidence" type="checkbox" ${this.app.state.ui.showConfidence ? 'checked' : ''} /> Confidence</label>
          <label><input id="reveal-truth" type="checkbox" ${this.app.state.ui.revealTruth ? 'checked' : ''} /> Reveal truth</label>
          <label><input id="include-hidden-truth" type="checkbox" /> Solver truth</label>
        </div>
        <div class="hud-toggles guidance-toggles">
          <label><input id="show-guidance" type="checkbox" ${this.app.state.ui.showGuidance ? 'checked' : ''} /> Guidance</label>
          <label><input id="show-drift-cone" type="checkbox" ${this.app.state.ui.showDriftCone ? 'checked' : ''} /> Drift</label>
          <label><input id="show-reachable-area" type="checkbox" ${this.app.state.ui.showReachableArea ? 'checked' : ''} /> Reach</label>
          <label><input id="show-predicted-surfacing" type="checkbox" ${this.app.state.ui.showPredictedSurfacing ? 'checked' : ''} /> Surface</label>
        </div>
        <section class="quick-waypoint">
          <strong>Add waypoint</strong>
          <div class="coordinate-grid">
            <label>X <input id="waypoint-x" type="number" step="1" min="0" /></label>
            <label>Y <input id="waypoint-y" type="number" step="1" min="0" /></label>
            <label>Action
              <select id="waypoint-action">
                ${VALID_WAYPOINT_ACTIONS.map((action) => `<option value="${action}">${action}</option>`).join('')}
              </select>
            </label>
            <button id="btn-add-waypoint">Add</button>
          </div>
        </section>
        <div class="workspace-actions">
          <button id="btn-simulate" class="execute-button">Execute</button>
          <button id="btn-toggle-controls" type="button">Controls</button>
        </div>
        <details class="workspace-help">
          <summary>Briefing and guidance</summary>
          <div class="briefing-compact">
            <strong>${escapeHtml(objectiveSummary.concept)}</strong>
            <ul>
              ${objectiveSummary.learningObjectives.map((item) => `<li>${escapeHtml(item)}</li>`).join('')}
            </ul>
            <p>Target score: ${criteria.minFinalScore ?? level?.campaign?.ratings?.bronze ?? 40} | Sample: ${criteria.minSampleScore ?? 'level'} | Hazards: ${criteria.maxHazardsHit ?? 0}</p>
          </div>
          <div id="guidance-panel"></div>
        </details>
      </section>
    `);

    this.app.elements.scorePanel.innerHTML = `
      <section class="workspace-tools">
        <h3>Tools</h3>
        <div class="workspace-tool-grid">
          <button id="btn-export-solver-packet">Solver Packet</button>
          <button id="btn-export-plan">Export Plan</button>
          <button id="btn-export-manual-plan">Export Manual</button>
          <button id="btn-greedy-plan">Greedy Plan</button>
          <button id="btn-clear-agent">Clear Glider</button>
          <button id="btn-clear-all">Clear All</button>
        </div>
        <label class="file-control compact-import">Import Plan <input id="plan-file" type="file" accept="application/json" /></label>
      </section>
    `;
    this.app.elements.eventPanel.innerHTML = '';

    this.bindAgentSelect();
    this.bindWindowSelect();
    this.bindChallengeControls();
    this.bindPlanningControls();
    this.bindWorkspaceControls();

    this.waypointPanel = new WaypointPanel(this.app.elements.waypointPanel, this.app.state);
    this.timelinePanel = new TimelinePanel(this.app.elements.timelinePanel);
    this.guidancePanel = new GuidancePanel(document.getElementById('guidance-panel'));
    this.refreshGuidance();
    this.refreshPanels();
    this.app.elements.canvas.addEventListener('pointerdown', this.onCanvasPointerDown);
    this.app.elements.canvas.addEventListener('pointermove', this.onCanvasPointerMove);
    this.app.elements.canvas.addEventListener('pointerup', this.onCanvasPointerUp);
    this.app.elements.canvas.addEventListener('pointerleave', this.onCanvasPointerUp);
  }

  exit() {
    this.app.elements.canvas.removeEventListener('pointerdown', this.onCanvasPointerDown);
    this.app.elements.canvas.removeEventListener('pointermove', this.onCanvasPointerMove);
    this.app.elements.canvas.removeEventListener('pointerup', this.onCanvasPointerUp);
    this.app.elements.canvas.removeEventListener('pointerleave', this.onCanvasPointerUp);
    this.pointerInteraction = null;
  }

  bindAgentSelect() {
    const select = document.getElementById('agent-select');
    select.innerHTML = (this.app.state.mission.agents ?? [])
      .map((agent) => `<option value="${agent.id}">${agent.label ?? agent.id}</option>`)
      .join('');
    select.value = this.app.state.selectedAgentId;
    select.onchange = () => {
      this.app.state.selectedAgentId = select.value;
      this.clearSelectedWaypoint();
      this.refreshPanels();
    };
  }

  bindWindowSelect() {
    const select = document.getElementById('window-select');
    const count = getPlanningWindowCount(this.app.state.level);
    select.innerHTML = Array.from({ length: count }, (_, index) => `<option value="${index}">Window ${index}</option>`).join('');
    this.app.state.selectedWindow = Math.min(this.app.state.selectedWindow ?? 0, count - 1);
    select.value = this.app.state.selectedWindow;
    select.onchange = () => this.setActiveWindow(Number(select.value));
  }

  bindPlanningControls() {
    document.getElementById('btn-add-waypoint').onclick = () => {
      this.addWaypointFromInput();
    };
    document.getElementById('btn-export-solver-packet').onclick = () => {
      const includeHiddenTruth = document.getElementById('include-hidden-truth')?.checked ?? false;
      downloadJSON('anchor_solver_packet.json', buildSolverPacket({
        level: this.app.state.level,
        mission: this.app.state.mission,
        challengeMode: this.app.state.challengeMode,
        includeHiddenTruth
      }));
    };
    document.getElementById('btn-export-plan').onclick = () => {
      this.app.state.plan = normalizePlan(this.app.state.plan, this.app.state.level, this.app.state.mission);
      attachIdentityToPlan(this.app.state.plan, this.app.state.level, this.app.state.mission);
      downloadJSON('anchor_plan.json', this.app.state.plan);
    };
    document.getElementById('btn-export-manual-plan').onclick = () => {
      const plan = this.app.state.manualPlan ?? this.app.state.plan;
      attachIdentityToPlan(plan, this.app.state.level, this.app.state.mission);
      downloadJSON('anchor_manual_plan.json', plan);
    };
    document.getElementById('btn-greedy-plan').onclick = () => {
      this.saveCurrentPlanIfManual();
      this.app.state.plan = greedySolver(this.app.state.level, this.app.state.mission);
      this.app.state.greedyPlan = this.app.state.plan;
      this.app.state.currentPlanSource = 'greedyBaseline';
      this.refreshPanels();
      this.app.toast('Greedy baseline plan generated.', 'success');
    };
    document.getElementById('plan-file').onchange = async (event) => {
      await this.importPlanFile(event.target.files?.[0]);
      event.target.value = '';
    };
    document.getElementById('btn-clear-agent').onclick = () => {
      clearAgentWaypoints(this.app.state.plan, this.app.state.selectedAgentId);
      this.markManualPlan();
      this.refreshPanels();
      this.app.toast('Selected glider waypoints cleared.', 'info');
    };
    document.getElementById('btn-clear-all').onclick = () => {
      clearAllWaypoints(this.app.state.plan);
      this.markManualPlan();
      this.refreshPanels();
      this.app.toast('All waypoints cleared.', 'info');
    };
    document.getElementById('btn-simulate').onclick = () => {
      this.app.state.plan = normalizePlan(this.app.state.plan, this.app.state.level, this.app.state.mission);
      attachIdentityToPlan(this.app.state.plan, this.app.state.level, this.app.state.mission);
      if (this.app.state.currentPlanSource === 'manual') this.app.state.manualPlan = this.app.state.plan;
      this.app.goTo('simulation');
    };
  }

  bindChallengeControls() {
    document.getElementById('planning-challenge-mode').onchange = (event) => {
      this.app.state.challengeMode = event.target.value;
      this.app.state.ui.revealTruth = false;
      this.app.state.planningTime = clampMissionTime(this.app.state.level, this.app.state.planningTime);
      if (this.app.state.challengeMode === 'forecast') {
        ensureForecastFields(this.app.state.level);
        this.app.toast('Forecast mode shows forecast fields during planning. Simulation still uses truth.', 'info');
      }
      document.getElementById('reveal-truth').checked = false;
      this.refreshPanels();
    };
    document.getElementById('show-confidence').onchange = (event) => {
      this.app.state.ui.showConfidence = event.target.checked;
    };
    document.getElementById('reveal-truth').onchange = (event) => {
      this.app.state.ui.revealTruth = event.target.checked;
      if (event.target.checked) this.app.toast('Debug reveal enabled: planning view is showing truth.', 'warning');
    };
    document.getElementById('show-guidance').onchange = (event) => {
      this.app.state.ui.showGuidance = event.target.checked;
    };
    document.getElementById('show-drift-cone').onchange = (event) => {
      this.app.state.ui.showDriftCone = event.target.checked;
    };
    document.getElementById('show-reachable-area').onchange = (event) => {
      this.app.state.ui.showReachableArea = event.target.checked;
    };
    document.getElementById('show-predicted-surfacing').onchange = (event) => {
      this.app.state.ui.showPredictedSurfacing = event.target.checked;
    };
  }

  bindWorkspaceControls() {
    document.getElementById('btn-toggle-controls').onclick = () => {
      this.app.elements.shell?.classList.toggle('workspace-controls-collapsed');
    };
  }

  async importPlanFile(file) {
    if (!file) return;

    try {
      const rawPlan = await readJSONFile(file);
      const normalized = normalizePlan(rawPlan, this.app.state.level, this.app.state.mission);
      const identityMatch = planMatchesLevel(normalized, this.app.state.level);
      const validation = validatePlan(normalized, this.app.state.mission);
      if (!validation.valid) {
        this.app.toast(`Plan import failed: ${validation.errors[0]}`, 'error');
        this.setPlanStatus(validation.errors.join(' '));
        return;
      }

      this.saveCurrentPlanIfManual();
      this.app.state.plan = normalized;
      this.clearSelectedWaypoint();
      this.app.state.currentPlanSource = normalized.meta?.solver ? 'importedSolver' : 'manual';
      if (this.app.state.currentPlanSource === 'importedSolver') this.app.state.solverPlan = normalized;
      this.refreshPanels();

      if (identityMatch === true) {
        this.app.toast(`Plan matches active instance ${shortInstanceId(this.app.state.level)}.`, 'success');
      } else if (identityMatch === false) {
        this.app.toast(`Plan instance ${shortInstanceId(normalized.instanceId ?? normalized.meta?.levelIdentity?.instanceId)} differs from active instance ${shortInstanceId(this.app.state.level)}. Imported anyway.`, 'warning');
      }
      if (normalized.levelId && normalized.levelId !== this.app.state.level.levelId) {
        this.app.toast(`Plan levelId ${normalized.levelId} differs from active level ${this.app.state.level.levelId}.`, 'warning');
      }
      if (normalized.missionId && normalized.missionId !== this.app.state.mission.missionId) {
        this.app.toast(`Plan missionId ${normalized.missionId} differs from active mission ${this.app.state.mission.missionId}.`, 'warning');
      }
      const unknownIds = getUnknownAgentIds(normalized, this.app.state.mission);
      if (unknownIds.length > 0) {
        this.app.toast(`Imported plan has unknown agentId: ${unknownIds.join(', ')}`, 'warning');
      } else if (validation.warnings.length > 0) {
        this.app.toast(validation.warnings[0], 'warning');
      } else {
        this.app.toast(this.app.state.currentPlanSource === 'importedSolver' ? 'Imported Solver Plan loaded.' : 'Plan imported.', 'success');
      }
    } catch (error) {
      const message = error instanceof SyntaxError ? 'Plan file is not valid JSON.' : String(error.message ?? error);
      this.app.toast(message, 'error');
      this.setPlanStatus(message);
    }
  }

  addWaypointFromInput() {
    const xInput = document.getElementById('waypoint-x').value;
    const yInput = document.getElementById('waypoint-y').value;
    const x = xInput === '' ? NaN : Number(xInput);
    const y = yInput === '' ? NaN : Number(yInput);
    const action = document.getElementById('waypoint-action').value;
    this.addWaypointForSelected({ x, y, action });
  }

  onCanvasPointerDown(event) {
    const cell = this.app.renderer.canvasEventToCell(event, this.app.state.level);
    const target = cell ? this.findWaypointAtCell(cell) : null;
    const wasSelected = target ? this.isSelectedWaypoint(target.agentId, target.index) : false;

    this.pointerInteraction = {
      cell,
      target,
      wasSelected,
      moved: false,
      lastCellKey: cell ? `${cell.x},${cell.y}` : null,
      warnedCellKey: null
    };

    try {
      this.app.elements.canvas.setPointerCapture?.(event.pointerId);
    } catch {
      // Pointer capture is optional; dragging still works from pointer events.
    }
  }

  onCanvasPointerMove(event) {
    const cell = this.app.renderer.canvasEventToCell(event, this.app.state.level);
    this.setHoverCell(cell);
    if (!this.pointerInteraction?.target) return;
    if (!cell) return;

    const cellKey = `${cell.x},${cell.y}`;
    if (cellKey === this.pointerInteraction.lastCellKey) return;

    const validity = isValidWaypointCell(this.app.state.level, cell.x, cell.y);
    if (!validity.valid && validity.block) {
      if (this.pointerInteraction.warnedCellKey !== cellKey) {
        this.app.toast(validity.message, 'warning');
        this.pointerInteraction.warnedCellKey = cellKey;
      }
      return;
    }
    if (validity.warning && this.pointerInteraction.warnedCellKey !== cellKey) {
      this.app.toast(validity.message, 'warning');
      this.pointerInteraction.warnedCellKey = cellKey;
    }

    const { agentId, index } = this.pointerInteraction.target;
    moveWaypoint(this.app.state.plan, agentId, index, cell.x, cell.y);
    this.setSelectedWaypoint(agentId, index);
    this.pointerInteraction.lastCellKey = cellKey;
    this.pointerInteraction.moved = true;
    this.markManualPlan();
    this.refreshPanels();
  }

  onCanvasPointerUp(event) {
    const interaction = this.pointerInteraction;
    try {
      this.app.elements.canvas.releasePointerCapture?.(event.pointerId);
    } catch {
      // Some browsers release capture before pointerleave.
    }
    this.pointerInteraction = null;
    if (event.type === 'pointerleave') {
      this.setHoverCell(null);
      return;
    }
    if (!interaction || interaction.moved) return;

    if (!interaction.cell) {
      this.app.toast('Click inside the map grid to plan waypoints.', 'info');
      return;
    }

    if (interaction.target) {
      const { agentId, index } = interaction.target;
      if (interaction.wasSelected) {
        removeWaypoint(this.app.state.plan, agentId, index);
        this.clearSelectedWaypoint();
        this.markManualPlan();
        this.refreshPanels();
        this.app.toast('Waypoint removed.', 'info');
      } else {
        this.app.state.selectedAgentId = agentId;
        document.getElementById('agent-select').value = agentId;
        this.setSelectedWaypoint(agentId, index);
        this.refreshPanels();
      }
      return;
    }

    const agent = this.getAgentAtCell(interaction.cell);
    if (agent) {
      this.app.state.selectedAgentId = agent.id;
      document.getElementById('agent-select').value = agent.id;
      this.clearSelectedWaypoint();
      this.refreshPanels();
      this.app.toast(`${agent.label ?? agent.id} selected.`, 'info');
      return;
    }

    this.addWaypointForSelected({ x: interaction.cell.x, y: interaction.cell.y, action: 'sample' });
  }

  addWaypointForSelected({ x, y, action }) {
    const waypoint = {
      window: this.app.state.selectedWindow,
      t: getWindowStartTime(this.app.state.level, this.app.state.selectedWindow),
      x,
      y,
      action
    };
    const warning = this.validateWaypointPlacement(waypoint);
    if (warning?.message) this.app.toast(warning.message, 'warning');
    if (warning?.block) {
      return;
    }

    addWaypoint(this.app.state.plan, this.app.state.selectedAgentId, waypoint);
    this.setSelectedWaypoint(this.app.state.selectedAgentId, getSelectedAgentWaypointCount(this.app.state.plan, this.app.state.selectedAgentId) - 1);
    this.markManualPlan();
    this.refreshPanels();
  }

  validateWaypointPlacement(waypoint) {
    const validity = isValidWaypointCell(this.app.state.level, Math.round(waypoint.x), Math.round(waypoint.y));
    if (!validity.valid) return { block: true, message: validity.message };
    if (validity.warning) return { block: false, message: validity.message };
    return null;
  }

  refreshPanels() {
    this.waypointPanel?.render({
      onUpdate: (agentId, index, patch) => {
        const normalizedPatch = patch.window !== undefined && patch.t === undefined
          ? { ...patch, t: getWindowStartTime(this.app.state.level, patch.window) }
          : patch;
        const warning = this.validateWaypointPatch(agentId, index, normalizedPatch);
        if (warning?.message) this.app.toast(warning.message, 'warning');
        if (warning?.block) {
          this.refreshPanels();
          return;
        }
        updateWaypoint(this.app.state.plan, agentId, index, normalizedPatch);
        this.markManualPlan();
        this.refreshPanels();
      },
      onRemove: (agentId, index) => {
        removeWaypoint(this.app.state.plan, agentId, index);
        this.clearSelectedWaypoint();
        this.markManualPlan();
        this.refreshPanels();
      },
      onMoveUp: (agentId, index) => {
        if (!moveWaypointUp(this.app.state.plan, agentId, index)) return;
        this.markManualPlan();
        this.refreshPanels();
      },
      onMoveDown: (agentId, index) => {
        if (!moveWaypointDown(this.app.state.plan, agentId, index)) return;
        this.markManualPlan();
        this.refreshPanels();
      }
    });

    this.timelinePanel?.render(this.app.state.level, {
      mission: this.app.state.mission,
      time: this.app.state.planningTime,
      selectedWindow: this.app.state.selectedWindow
    }, {
      onTimeChange: (time) => this.setPlanningTime(time),
      onWindowSelect: (windowIndex) => this.setActiveWindow(windowIndex)
    });

    const timeLabel = document.getElementById('planning-time-label');
    if (timeLabel) timeLabel.textContent = formatMissionTime(this.app.state.level, this.app.state.planningTime);
    this.setPlanStatus(`${getWaypointCount(this.app.state.plan)} waypoint(s) in current plan. Source: ${this.app.state.currentPlanSource ?? 'manual'}.`);
  }

  refreshGuidance() {
    this.guidancePanel?.render(getPlanningPrompts(this.app.state.level), {
      levelId: this.app.state.level?.levelId
    });
  }

  markManualPlan() {
    this.app.state.currentPlanSource = 'manual';
    this.app.state.manualPlan = this.app.state.plan;
  }

  saveCurrentPlanIfManual() {
    if (this.app.state.currentPlanSource === 'manual' && this.app.state.plan) {
      this.app.state.manualPlan = this.app.state.plan;
    }
  }

  validateWaypointPatch(agentId, index, patch) {
    const agentPlan = this.app.state.plan.agentPlans.find((candidate) => candidate.agentId === agentId);
    const current = agentPlan?.waypoints?.[index];
    if (!current) return { block: true, message: 'Waypoint no longer exists.' };
    return this.validateWaypointPlacement({ ...current, ...patch });
  }

  findWaypointAtCell(cell) {
    return hitTestWaypoint(cell, this.app.state.plan, { selectedAgentId: this.app.state.selectedAgentId })
      ?? getWaypointAtCell(this.app.state.plan, cell.x, cell.y);
  }

  getAgentAtCell(cell) {
    const surfaced = (this.app.state.surfacedAgents ?? []).find((agent) => (
      Math.round(agent.x) === cell.x && Math.round(agent.y) === cell.y
    ));
    if (surfaced) {
      return this.app.state.mission.agents?.find((agent) => agent.id === surfaced.id) ?? null;
    }
    return getAgentStartAtCell(this.app.state.mission, cell.x, cell.y);
  }

  isSelectedWaypoint(agentId, index) {
    const selected = this.app.state.ui.selectedWaypoint;
    return selected?.agentId === agentId && selected?.index === index;
  }

  setSelectedWaypoint(agentId, index) {
    this.app.state.ui.selectedWaypoint = { agentId, index };
  }

  setHoverCell(cell) {
    const current = this.app.state.ui.hoverCell;
    const same = current?.x === cell?.x && current?.y === cell?.y;
    if (same) return;
    this.app.state.ui.hoverCell = cell ? { x: cell.x, y: cell.y } : null;
  }

  setPlanningTime(time) {
    this.app.state.planningTime = clampMissionTime(this.app.state.level, time);
    this.app.state.selectedWindow = getWindowForTime(this.app.state.level, this.app.state.planningTime);
    const select = document.getElementById('window-select');
    if (select) select.value = String(this.app.state.selectedWindow);
    this.refreshPanels();
  }

  setActiveWindow(windowIndex) {
    const count = getPlanningWindowCount(this.app.state.level);
    const boundedWindow = Math.max(0, Math.min(count - 1, Number(windowIndex) || 0));
    this.app.state.selectedWindow = boundedWindow;
    this.app.state.planningTime = getWindowStartTime(this.app.state.level, boundedWindow);
    const select = document.getElementById('window-select');
    if (select) select.value = String(boundedWindow);
    this.refreshPanels();
  }

  clearSelectedWaypoint() {
    this.app.state.ui.selectedWaypoint = null;
  }

  setPlanStatus(message) {
    const status = document.getElementById('plan-status');
    if (status) status.textContent = message;
  }

  render(renderer) {
    renderer.drawPlanningMap(this.app.state);
  }
}

function getSelectedAgentWaypointCount(plan, agentId) {
  return plan?.agentPlans?.find((agentPlan) => agentPlan.agentId === agentId)?.waypoints?.length ?? 0;
}

function escapeHtml(value) {
  return String(value).replace(/[&<>"']/g, (char) => ({
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#39;'
  }[char]));
}
