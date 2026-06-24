import { formatMissionTime, getTimeConfig } from '../core/time/MissionTime.js';
import { getDeploymentZoneForAgent, getDeploymentZonesForAgent, getSelectedStart, requiresDeploymentSelection } from '../core/deployment/DeploymentZones.js';
import { labelReason } from '../core/planning/StopReasonSummarizer.js';
import { formatDiagnosticForUi } from '../core/planning/RouteDiagnostic.js';
import { gradeRouteContributions } from '../core/planning/SegmentContributionGrader.js';
import { normalizeWaypointKind, waypointKindLabel } from '../core/planning/WaypointSemantics.js';
import { buildRightWaypointSegmentEditorViewModel } from '../core/rendering/RightWaypointSegmentEditorViewModel.js';

export class RightWaypointPanel {
  constructor(app, root) {
    this.app = app;
    this.root = root;
    this.handlers = {};
  }

  setHandlers(handlers = {}) {
    this.handlers = handlers;
  }

  renderIdle({ mainMenu = false } = {}) {
    if (!this.root) return;
    if (mainMenu) {
      this.root.innerHTML = `
        <section class="waypoint-shell waypoint-shell-compact" data-main-menu-right-panel>
          <div class="console-kicker">About ANCHOR</div>
          <h2>Product Hub</h2>
          <p class="hud-muted">Challenge Mode, Simulation Lab, and Learning Labs are selected from the main viewport.</p>
          <p class="hud-muted">Planning details appear here after a playable route is loaded.</p>
        </section>
      `;
      return;
    }
    this.root.innerHTML = `
      <section class="waypoint-shell">
        <div class="console-kicker">Mission Waypoints</div>
        <h2>No mission loaded</h2>
        <p class="hud-muted">Waypoint plan will appear here.</p>
        <p class="hud-muted">Start Tutorial Mode, Challenge Mode, Simulation Lab, or Import Challenge JSON to begin.</p>
      </section>
    `;
  }

  renderBriefingPlaceholder(state = {}) {
    if (!this.root) return;
    this.root.innerHTML = `
      <section class="waypoint-shell">
        <div class="console-kicker">Mission Waypoints</div>
        <h2>${escapeHtml(state.level?.meta?.name ?? 'Briefing')}</h2>
        <p class="hud-muted">Waypoint plan will appear after Planning begins.</p>
        <p class="hud-muted">The tactical map, ROI hotspots, current vectors, hazards, and deployment geometry are intentionally hidden in Mission Briefing.</p>
      </section>
    `;
  }

  refresh(state, { engine = null, result = null } = {}) {
    if (!this.root) return;
    if (!state?.level || !state?.mission) return this.renderIdle();
    const agents = state.mission.agents ?? [];
    const selectedAgentId = state.selectedAgentId ?? agents[0]?.id ?? null;
    const selectedPlan = (state.plan?.agentPlans ?? []).find((plan) => plan.agentId === selectedAgentId);
    const waypoints = selectedPlan?.waypoints ?? [];
    const timeConfig = getTimeConfig(state.level);
    const coordinateProfile = state.plan?.coordinateProfileId ?? state.plan?.meta?.coordinateProfileId ?? 'legacyIntegerCellsV1';
    const fieldSamplingProfile = state.plan?.fieldSamplingProfileId ?? state.plan?.meta?.fieldSamplingProfileId ?? (coordinateProfile === 'continuousGridV1' ? 'continuousTrilinearV1' : 'legacyNearestCellV1');
    const routeQuality = gradeRouteContributions({
      level: state.level,
      mission: state.mission,
      plan: state.plan,
      selectedAgentId,
      challengeMode: state.challengeMode,
      revealTruth: state.ui?.revealTruth,
      forecastMemberId: state.ui?.forecastMemberId
    });
    const editor = buildRightWaypointSegmentEditorViewModel({ state, agentId: selectedAgentId });
    this.root.innerHTML = `
      <section class="waypoint-shell" data-right-waypoint-segment-editor-version="${escapeAttr(editor.version)}">
        <div class="console-kicker">Mission Waypoints</div>
        <h2>${escapeHtml(state.level?.meta?.name ?? 'Waypoint Timeline')}</h2>
        <p class="hud-muted">Duration ${formatMissionTime(state.level, timeConfig.duration)} | Window ${timeConfig.planningWindow} ${timeConfig.displayUnits ?? 'hr'}</p>
        <div class="agent-tabs">
          ${agents.map((agent) => `<button data-agent-tab data-agent="${escapeAttr(agent.id)}" class="${agent.id === selectedAgentId ? 'active' : ''}">${escapeHtml(agent.label ?? agent.name ?? agent.id)}</button>`).join('')}
        </div>
        <div class="waypoint-summary">
          <span>${waypoints.length} waypoint(s)</span>
          <span>Coordinates: ${escapeHtml(labelize(coordinateProfile))}</span>
          <span>Sampling: ${escapeHtml(labelize(fieldSamplingProfile))}</span>
        </div>
        ${deploymentSummary(state, selectedAgentId)}
        ${routeQuality?.overall?.segmentCount ? `<div class="waypoint-summary"><span>Route grade: ${escapeHtml(routeQuality.overall.grade)} (${escapeHtml(routeQuality.overall.numericScore)})</span><span>${escapeHtml(routeQuality.overall.segmentCount)} segment(s)</span></div>` : ''}
        ${result && !hasWaypointStatusEvents(result, selectedAgentId) ? '<p class="hud-muted">Final waypoint statuses unavailable for this run.</p>' : ''}
        <h3 class="waypoint-section-title">Route Waypoints</h3>
        ${waypoints.length ? waypointRows(state, editor, selectedAgentId, engine, result, routeQuality) : '<p class="hud-muted">No executable waypoints. Click water cells in waypoint mode to add route steps.</p>'}
      </section>
    `;
    this.bindRows();
    this.root.querySelector('[data-route-card].selected')?.scrollIntoView?.({ block: 'nearest' });
  }

  bindRows() {
    this.root.querySelectorAll('[data-agent-tab]').forEach((button) => {
      button.addEventListener('click', () => this.handlers.selectAgent?.(button.dataset.agent));
    });
    this.root.querySelectorAll('[data-select-waypoint]').forEach((button) => {
      button.addEventListener('click', () => this.handlers.selectWaypoint?.(button.dataset.agent, Number(button.dataset.index)));
    });
    this.root.querySelectorAll('[data-delete-waypoint]').forEach((button) => {
      button.addEventListener('click', () => this.handlers.remove?.(button.dataset.agent, Number(button.dataset.index)));
    });
    this.root.querySelectorAll('[data-move-up]').forEach((button) => {
      button.addEventListener('click', () => this.handlers.moveUp?.(button.dataset.agent, Number(button.dataset.index)));
    });
    this.root.querySelectorAll('[data-move-down]').forEach((button) => {
      button.addEventListener('click', () => this.handlers.moveDown?.(button.dataset.agent, Number(button.dataset.index)));
    });
    this.root.querySelectorAll('[data-change-start]').forEach((button) => {
      button.addEventListener('click', () => this.handlers.changeStart?.(button.dataset.agent));
    });
    this.root.querySelectorAll('[data-convert-marker]').forEach((button) => {
      button.addEventListener('click', () => this.handlers.convertMarker?.(button.dataset.agent, Number(button.dataset.index)));
    });
    this.root.querySelectorAll('[data-delete-marker]').forEach((button) => {
      button.addEventListener('click', () => this.handlers.deleteMarker?.(button.dataset.agent, Number(button.dataset.index)));
    });
    this.root.querySelectorAll('[data-focus-marker]').forEach((button) => {
      button.addEventListener('click', () => this.handlers.focusMarker?.(button.dataset.agent, Number(button.dataset.index)));
    });
    this.root.querySelectorAll('[data-focus-waypoint]').forEach((button) => {
      button.addEventListener('click', () => this.handlers.focusWaypoint?.(button.dataset.agent, Number(button.dataset.index)));
    });
    this.root.querySelectorAll('[data-segment-draft-field]').forEach((input) => {
      input.addEventListener('change', () => {
        const patch = { [input.dataset.segmentDraftField]: input.type === 'checkbox' ? input.checked : input.value };
        this.handlers.updateSegmentDraft?.(input.dataset.agent, Number(input.dataset.index), patch);
      });
    });
    this.root.querySelectorAll('[data-segment-apply]').forEach((button) => {
      button.addEventListener('click', () => this.handlers.applySegmentDraft?.(button.dataset.agent, Number(button.dataset.index)));
    });
    this.root.querySelectorAll('[data-segment-cancel]').forEach((button) => {
      button.addEventListener('click', () => this.handlers.cancelSegmentDraft?.(button.dataset.agent, Number(button.dataset.index)));
    });
    this.root.querySelectorAll('[data-segment-reset]').forEach((button) => {
      button.addEventListener('click', () => this.handlers.resetSegmentDraft?.(button.dataset.agent, Number(button.dataset.index)));
    });
    this.root.querySelectorAll('[data-segment-apply-remaining]').forEach((button) => {
      button.addEventListener('click', () => this.handlers.applySegmentDraftToRemaining?.(button.dataset.agent, Number(button.dataset.index)));
    });
    this.root.querySelectorAll('[data-segment-set-default]').forEach((button) => {
      button.addEventListener('click', () => this.handlers.setGliderDefaultSegmentDraft?.(button.dataset.agent, Number(button.dataset.index)));
    });
  }
}

function hasWaypointStatusEvents(result, agentId) {
  return (result?.events ?? []).some((event) => event.agentId === agentId
    && (event.type === 'waypointReached' || String(event.type).toLowerCase().includes('miss')));
}

function deploymentSummary(state, agentId) {
  const agent = state.mission?.agents?.find((candidate) => candidate.id === agentId);
  if (!agent) return '';
  const selectedStart = getSelectedStart(agent);
  const zone = getDeploymentZoneForAgent(state.level, state.mission, agentId);
  const zones = getDeploymentZonesForAgent(state.level, state.mission, agentId);
  const warning = requiresDeploymentSelection(state.mission, agentId);
  const canChange = agent.deployment?.mode === 'chooseFromZone' || agent.deployment?.mode === 'chooseFromZones';
  const fuel = Number(agent.fuel ?? agent.battery ?? 0);
  const speed = Number(agent.speed ?? agent.maxSpeed ?? 0);
  const startAction = canChange ? ` <button data-change-start data-agent="${escapeAttr(agentId)}">${selectedStart ? 'Change Start' : 'Deploy Glider'}</button>` : '';
  return `
    <div class="waypoint-summary ${warning ? 'warning' : ''}">
      <span>Start: ${selectedStart ? `(${selectedStart.x}, ${selectedStart.y})` : 'not selected'}${startAction}</span>
      <span>Drop zone: ${escapeHtml(zones.length > 1 ? `${zones.length} allowed` : agent.deployment?.zoneId ?? zone?.id ?? 'fixed')}</span>
      <span>Speed: ${Number.isFinite(speed) ? speed.toFixed(2) : 'N/A'} | Fuel: ${Number.isFinite(fuel) ? fuel.toFixed(0) : 'N/A'} | Radius: ${Number(agent.samplingRadius ?? 0.8).toFixed(2)}</span>
    </div>
    ${warning ? '<p class="hud-muted warning">Choose a deployment cell first.</p>' : ''}
  `;
}

function waypointRows(state, editor, agentId, engine, result, routeQuality) {
  return `
    <ol class="timeline-waypoints" data-route-waypoint-list>
      ${editor.rows.map((row) => waypointRow(state, row, editor, agentId, engine, result, routeQuality)).join('')}
    </ol>
  `;
}

function waypointRow(state, row, editor, agentId, engine, result, routeQuality) {
  const waypoint = row.waypoint;
  const index = row.waypointIndex;
  const status = waypointStatus({ waypoint, index, agentId, engine, result });
  const missed = waypointMissEvent({ waypoint, index, agentId, engine, result });
  const routeFailure = state.routeFailureDecision?.active
    && state.routeFailureDecision.agentId === agentId
    && Number(state.routeFailureDecision.failedWaypointIndex) === index;
  const waypointKind = normalizeWaypointKind(waypoint);
  const semanticLabel = waypointKindLabel(waypointKind);
  const terminalCarryThrough = waypointKind === 'terminalCarryThrough';
  const label = routeFailure
    ? `MISSED: ${labelReason(state.routeFailureDecision.reason).toUpperCase()}`
    : terminalCarryThrough ? semanticLabel
      : missed ? `MISSED: ${labelReason(missed.reason).toUpperCase()}` : statusLabel(status);
  const selected = row.selected;
  const grade = routeQuality?.segments?.find((segment) => Number(segment.toWaypointIndex) === index);
  const coordinate = waypointCoordinateSummary(waypoint, state);
  const profile = row.flightPlan ?? {};
  const chips = `${labelize(profile.profileId ?? 'missionDefault')} | ${labelize(profile.targetDepthLayerId ?? 'surface')} | ${formatMeters(profile.maximumImmersionMeters ?? profile.targetDepthMeters)} | ${Number(profile.cycleCount ?? 0)} cycle${Number(profile.cycleCount ?? 0) === 1 ? '' : 's'}`;
  const eta = waypoint.estimatedArrivalTime != null ? formatMissionTime(state.level, waypoint.estimatedArrivalTime) : 'pending';
  const energy = waypoint.segmentEnergy ?? grade?.components?.energyCost ?? null;
  return `
    <li class="timeline-waypoint ${status} ${terminalCarryThrough ? 'warning' : ''} ${selected || routeFailure ? 'selected' : ''} ${routeFailure ? 'failure' : ''}" data-route-card data-waypoint-id="${escapeAttr(row.waypointId)}" data-segment-id="${escapeAttr(row.segmentId ?? '')}">
      <button class="waypoint-main" data-select-waypoint data-agent="${escapeAttr(agentId)}" data-index="${index}" aria-expanded="${selected ? 'true' : 'false'}">
        <span class="waypoint-num">${index + 1}</span>
        <span>
          <strong>W${index + 1} | ${escapeHtml(semanticLabel)}</strong>
          <small class="marker-estimate">Incoming: ${escapeHtml(row.incomingSegmentLabel)}</small>
          <small class="marker-estimate">${escapeHtml(chips)}</small>
          <strong>W${Number(waypoint.window ?? 0)} | ${escapeHtml(formatMissionTime(state.level, waypoint.t ?? 0))}</strong>
          <small>X ${escapeHtml(coordinate.x)} | Y ${escapeHtml(coordinate.y)} | Cell ${escapeHtml(coordinate.cellLabel)} | ${escapeHtml(coordinate.coordinateProfileLabel)}</small>
          <small class="marker-estimate">ETA ${escapeHtml(eta)} | Energy ${escapeHtml(formatNumber(energy))}</small>
          ${segmentGradeLine(grade)}
          ${isRuntimeTruncatedTimeWaypoint(waypoint) ? '<small class="marker-warning">Mission-window warning: ETA exceeds mission end; simulation will run until mission time expires and report unreached status.</small>' : ''}
          ${waypoint.warnings?.length ? `<small class="marker-warning">${escapeHtml(waypoint.warnings[0])}</small>` : ''}
          ${waypoint.validity?.routeAudit ? `<small class="marker-warning">${escapeHtml(formatDiagnosticForUi(waypoint.validity.routeAudit.diagnostic) ?? waypoint.validity.routeAudit.message)}</small>` : ''}
        </span>
        <em>${escapeHtml(label)}</em>
      </button>
      ${selected ? selectedSegmentEditor(state, row, editor, coordinate) : ''}
      <div class="waypoint-row-actions">
        <button data-move-up data-agent="${escapeAttr(agentId)}" data-index="${index}" ${index === 0 ? 'disabled' : ''}>Up</button>
        <button data-move-down data-agent="${escapeAttr(agentId)}" data-index="${index}" ${index >= editor.rows.length - 1 ? 'disabled' : ''}>Down</button>
        <button data-focus-waypoint data-agent="${escapeAttr(agentId)}" data-index="${index}">Focus in 3D View</button>
        <button data-delete-waypoint data-agent="${escapeAttr(agentId)}" data-index="${index}">Delete</button>
      </div>
    </li>
  `;
}

function selectedSegmentEditor(state, row, editor, coordinate) {
  const plan = row.flightPlan ?? {};
  const prediction = row.predictionSummary ?? {};
  const warningHtml = row.warnings.length
    ? row.warnings.map((warning) => `<div class="marker-warning ${escapeAttr(warning.severity)}"><strong>${escapeHtml(labelize(warning.severity))}:</strong> ${escapeHtml(warning.message)}</div>`).join('')
    : '<div class="hud-muted">No canonical segment warnings.</div>';
  return `
    <div class="hud-card compact segment-profile-editor" data-segment-editor data-agent="${escapeAttr(row.agentId)}" data-index="${row.waypointIndex}" data-waypoint-id="${escapeAttr(row.waypointId)}">
      <h3>Destination</h3>
      <div><strong>Destination ${escapeHtml(row.waypointLabel)}</strong> | X ${escapeHtml(coordinate.x)} | Y ${escapeHtml(coordinate.y)} | Cell ${escapeHtml(coordinate.cellLabel)}</div>
      <div><strong>Waypoint Action:</strong> ${escapeHtml(row.waypoint.action ?? 'sample')} | <strong>Status:</strong> ${escapeHtml(row.validation?.status ?? 'pending')}</div>
      <h3>Incoming Segment Flight Profile</h3>
      <div><strong>${escapeHtml(row.incomingSegmentLabel)}</strong></div>
      <div class="segment-editor-grid">
        ${selectField('Profile Preset', 'diveProfileId', plan.profileId, profileOptions(editor.profileOptions), row)}
        ${selectField('Target Layer', 'targetDepthLayerId', plan.targetDepthLayerId, layerOptions(editor.targetLayerOptions), row)}
        ${numberField('Maximum Depth (m)', 'maximumDiveDepthMeters', plan.maximumImmersionMeters ?? plan.targetDepthMeters, row, 0)}
        ${numberField('Yo Cycles', 'cycleCount', plan.cycleCount, row, 0, 1)}
        ${selectField('Sample During', 'samplingPhase', plan.samplingPhase, samplingPhaseOptions(editor.samplingPhaseOptions), row)}
        ${numberField('Sampling Interval (s)', 'sampleIntervalSeconds', plan.sampleIntervalSeconds, row, 30, 30)}
        ${selectField('At Arrival', 'arrivalBehavior', plan.arrivalBehavior, arrivalOptions(editor.arrivalBehaviorOptions), row)}
      </div>
      <details>
        <summary>Advanced Flight Parameters</summary>
        <div class="segment-editor-grid">
          ${numberField('Minimum Immersion (m)', 'minimumImmersionMeters', plan.minimumImmersionMeters, row, 0)}
          ${numberField('Maximum Immersion (m)', 'maximumImmersionMeters', plan.maximumImmersionMeters, row, 0)}
          ${numberField('Surface Wait Time (s)', 'communicationWaitSeconds', plan.communicationWaitSeconds, row, 0, 30)}
        </div>
        <div class="hud-muted">Educational glider profile parameters only. No constant-depth hovering or low-level actuator commands are implied.</div>
      </details>
      <h3>Predicted Outcome</h3>
      <div class="waypoint-summary">
        <span>Duration ${escapeHtml(formatDuration(prediction.estimatedSegmentDurationSeconds))}</span>
        <span>Energy ${escapeHtml(formatNumber(prediction.estimatedEnergy))}</span>
        <span>Samples ${escapeHtml(formatNumber(prediction.expectedSampleCount))}</span>
        <span>Max depth ${escapeHtml(formatMeters(prediction.predictedMaximumDepthMeters))}</span>
        <span>Clearance ${escapeHtml(formatMeters(prediction.minimumSeabedClearanceMeters))}</span>
        <span>Feasibility ${escapeHtml(labelize(prediction.feasibility ?? 'unknown'))}</span>
      </div>
      <div class="hud-muted">Predicted planning estimate from canonical route/profile validation, not realized Simulation truth.</div>
      <h3>Warnings</h3>
      ${warningHtml}
      <h3>Route Actions</h3>
      <div class="waypoint-row-actions">
        <button data-segment-apply data-agent="${escapeAttr(row.agentId)}" data-index="${row.waypointIndex}" ${row.errorCount ? 'disabled' : ''}>Apply Changes</button>
        <button data-segment-cancel data-agent="${escapeAttr(row.agentId)}" data-index="${row.waypointIndex}">Cancel</button>
        <button data-segment-reset data-agent="${escapeAttr(row.agentId)}" data-index="${row.waypointIndex}">Reset to Glider Default</button>
        <button data-segment-apply-remaining data-agent="${escapeAttr(row.agentId)}" data-index="${row.waypointIndex}">Apply to Remaining Segments</button>
        <button data-segment-set-default data-agent="${escapeAttr(row.agentId)}" data-index="${row.waypointIndex}">Set as Glider Default</button>
      </div>
      <div class="hud-muted">Draft changes are excluded from export, scoring, and Execute until Apply.</div>
    </div>
  `;
}

function selectField(label, field, value, options, row) {
  return `<label>${escapeHtml(label)}<select data-segment-draft-field="${escapeAttr(field)}" data-agent="${escapeAttr(row.agentId)}" data-index="${row.waypointIndex}">${options.map((item) => `<option value="${escapeAttr(item.value)}" ${String(item.value) === String(value ?? '') ? 'selected' : ''}>${escapeHtml(item.label)}</option>`).join('')}</select></label>`;
}

function numberField(label, field, value, row, min = null, step = null) {
  const minAttr = min == null ? '' : ` min="${escapeAttr(min)}"`;
  const stepAttr = step == null ? ' step="any"' : ` step="${escapeAttr(step)}"`;
  return `<label>${escapeHtml(label)}<input type="number"${minAttr}${stepAttr} value="${escapeAttr(value ?? '')}" data-segment-draft-field="${escapeAttr(field)}" data-agent="${escapeAttr(row.agentId)}" data-index="${row.waypointIndex}" /></label>`;
}

function profileOptions(options = []) {
  return options.filter((option) => option.id !== 'surfaceOnly').map((option) => ({ value: option.profileId ?? option.id, label: option.id === 'sawtoothProfile' ? 'Standard Yo-Yo' : option.label }));
}

function layerOptions(options = []) {
  return options.map((option) => ({ value: option.id, label: labelize(option.label ?? option.id) }));
}

function samplingPhaseOptions(options = []) {
  return options.map((id) => ({ value: id, label: id === 'both' ? 'Descent + Ascent' : labelize(id) }));
}

function arrivalOptions(options = []) {
  const labels = { continueUnderwater: 'Continue Route', surfaceAndCommunicate: 'Surface / Communicate', missionTerminal: 'Mission Terminal', inheritMissionRule: 'Use Existing Segment Default' };
  return options.map((id) => ({ value: id, label: labels[id] ?? labelize(id) }));
}

function segmentGradeLine(grade) {
  if (!grade) return '';
  const role = (grade.roleLabels ?? []).join(' + ') || 'transit';
  return `<small class="marker-estimate">Segment grade ${escapeHtml(grade.grade)} (${escapeHtml(grade.numericScore)}) | ${escapeHtml(role)} | immediate +${escapeHtml(formatNumber(grade.components?.immediateSampleReward))} | setup +${escapeHtml(formatNumber(grade.components?.futureSetupValue))} | risk -${escapeHtml(formatNumber(Number(grade.components?.hazardPenalty ?? 0) + Number(grade.components?.shorelineRiskPenalty ?? 0)))}</small>`;
}

function waypointCoordinateSummary(waypoint = {}, state = {}) {
  const x = waypoint.position?.x ?? waypoint.x;
  const y = waypoint.position?.y ?? waypoint.y;
  const derived = waypoint.derivedCell ?? waypoint.legacyCell ?? waypoint.position?.derivedCell ?? null;
  const cellX = derived?.x ?? derived?.col ?? Math.round(Number(x));
  const cellY = derived?.y ?? derived?.row ?? Math.round(Number(y));
  const coordinateProfile = waypoint.coordinateProfileId ?? state.plan?.coordinateProfileId ?? state.plan?.meta?.coordinateProfileId ?? 'legacyIntegerCellsV1';
  return {
    x: formatCoordinate(x),
    y: formatCoordinate(y),
    cellLabel: Number.isFinite(Number(cellX)) && Number.isFinite(Number(cellY)) ? `(${Math.round(Number(cellX))}, ${Math.round(Number(cellY))})` : '(N/A)',
    coordinateProfileLabel: labelize(coordinateProfile)
  };
}

function labelize(value) {
  return String(value ?? '').replace(/[_-]/g, ' ').replace(/([a-z])([A-Z])/g, '$1 $2').replace(/\b\w/g, (char) => char.toUpperCase());
}
function formatCoordinate(value) {
  const number = Number(value);
  if (!Number.isFinite(number)) return 'N/A';
  return Number.isInteger(number) ? String(number) : number.toFixed(2);
}

function formatNumber(value) {
  const number = Number(value);
  if (!Number.isFinite(number)) return 'N/A';
  return Math.abs(number) >= 10 ? String(Math.round(number)) : number.toFixed(1);
}

function formatMeters(value) {
  const number = Number(value);
  if (!Number.isFinite(number)) return 'N/A';
  return `${Math.round(number)} m`;
}

function formatDuration(seconds) {
  const number = Number(seconds);
  if (!Number.isFinite(number)) return 'N/A';
  const hours = number / 3600;
  return `${hours.toFixed(hours >= 10 ? 0 : 1)} hr`;
}

function waypointStatus({ waypoint, index, agentId, engine, result }) {
  if (isRuntimeTruncatedTimeWaypoint(waypoint)) return 'warning-time';
  if (waypoint?.validity?.valid === false) {
    const reason = waypoint.validity.reasons?.[0] ?? 'route';
    if (waypoint.validity.reasons?.includes('time')) return 'invalid-time';
    if (waypoint.validity.reasons?.includes('fuel')) return 'invalid-fuel';
    if (waypoint.validity.reasons?.includes('terrain') || waypoint.validity.reasons?.includes('segmentBlocked')) return 'invalid-terrain';
    if (reason === 'time') return 'invalid-time';
    if (reason === 'fuel') return 'invalid-fuel';
    if (reason === 'terrain') return 'invalid-terrain';
    return 'invalid';
  }
  const engineAgent = engine?.agents?.find((agent) => agent.id === agentId);
  if (engineAgent) {
    if ((engineAgent.completedWaypoints ?? []).some((item) => item.waypointId === waypoint.id || item.waypointIndex === index)) return 'completed';
    if ((engineAgent.missedWaypoints ?? []).some((item) => item.waypointId === waypoint.id || item.waypointIndex === index)) return 'missed';
    if (Number(engineAgent.currentWaypointIndex ?? -1) === index) return 'active';
    return 'pending';
  }
  const events = result?.events ?? [];
  if (events.some((event) => event.agentId === agentId && (event.waypointId === waypoint.id || event.waypointIndex === index) && event.type === 'waypointReached')) return 'completed';
  if (events.some((event) => event.agentId === agentId && (event.waypointId === waypoint.id || event.waypointIndex === index) && String(event.type).toLowerCase().includes('miss'))) return 'missed';
  return 'pending';
}

function waypointMissEvent({ waypoint, index, agentId, engine, result }) {
  const engineAgent = engine?.agents?.find((agent) => agent.id === agentId);
  const runtimeMiss = (engineAgent?.missedWaypoints ?? []).find((item) => item.waypointId === waypoint.id || item.waypointIndex === index);
  if (runtimeMiss) return runtimeMiss;
  return (result?.events ?? []).find((event) => event.agentId === agentId
    && (event.waypointId === waypoint.id || event.waypointIndex === index)
    && event.type === 'missedWaypoint') ?? null;
}

function statusLabel(status) {
  if (status === 'warning-time') return 'MISSION WINDOW';
  if (status === 'invalid-time') return 'INVALID: TIME';
  if (status === 'invalid-fuel') return 'INVALID: FUEL';
  if (status === 'invalid-terrain') return 'INVALID: TERRAIN';
  if (status === 'invalid') return 'INVALID';
  return status;
}

function isRuntimeTruncatedTimeWaypoint(waypoint) {
  const routeAudit = waypoint?.validity?.routeAudit ?? {};
  const reasons = new Set((waypoint?.validity?.reasons ?? []).map((reason) => String(reason)));
  return Boolean(
    waypoint?.terminalCarryThrough
    || waypoint?.intentionalOverDuration
    || waypoint?.runtimeBehavior === 'truncate_at_mission_end'
    || routeAudit.runtimeBehavior === 'truncate_at_mission_end'
    || routeAudit.terminalCarryThrough
    || reasons.has('waypoint_exceeds_mission_duration')
  );
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
