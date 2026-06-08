import { formatMissionTime, getTimeConfig } from '../core/time/MissionTime.js';
import { getDeploymentZoneForAgent, getDeploymentZonesForAgent, getSelectedStart, requiresDeploymentSelection } from '../core/deployment/DeploymentZones.js';
import { labelReason } from '../core/planning/StopReasonSummarizer.js';
import { formatDiagnosticForUi } from '../core/planning/RouteDiagnostic.js';

export class RightWaypointPanel {
  constructor(app, root) {
    this.app = app;
    this.root = root;
    this.handlers = {};
  }

  setHandlers(handlers = {}) {
    this.handlers = handlers;
  }

  renderIdle() {
    if (!this.root) return;
    this.root.innerHTML = `
      <section class="waypoint-shell">
        <div class="console-kicker">Mission Waypoints</div>
        <h2>No mission loaded</h2>
        <p class="hud-muted">Waypoint plan will appear here.</p>
        <p class="hud-muted">Start Tutorial Mode, Deterministic Challenge, Stochastic Challenge, or Load Level JSON to begin.</p>
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
    this.root.innerHTML = `
      <section class="waypoint-shell">
        <div class="console-kicker">Mission Waypoints</div>
        <h2>${escapeHtml(state.level?.meta?.name ?? 'Waypoint Timeline')}</h2>
        <p class="hud-muted">Duration ${formatMissionTime(state.level, timeConfig.duration)} | Window ${timeConfig.planningWindow} ${timeConfig.displayUnits ?? 'hr'}</p>
        <div class="agent-tabs">
          ${agents.map((agent) => `<button data-agent="${escapeAttr(agent.id)}" class="${agent.id === selectedAgentId ? 'active' : ''}">${escapeHtml(agent.label ?? agent.name ?? agent.id)}</button>`).join('')}
        </div>
        <div class="waypoint-summary">
          <span>${waypoints.length} waypoint(s)</span>
          <span>Global markers live on the map/timeline</span>
        </div>
        ${deploymentSummary(state, selectedAgentId)}
        ${result && !hasWaypointStatusEvents(result, selectedAgentId) ? '<p class="hud-muted">Final waypoint statuses unavailable for this run.</p>' : ''}
        <h3 class="waypoint-section-title">Route Waypoints</h3>
        ${waypoints.length ? waypointRows(state, waypoints, selectedAgentId, engine, result) : '<p class="hud-muted">No executable waypoints. Click water cells in waypoint mode to add route steps.</p>'}
      </section>
    `;
    this.bindRows();
  }

  bindRows() {
    this.root.querySelectorAll('[data-agent]').forEach((button) => {
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
  return `
    <div class="waypoint-summary ${warning ? 'warning' : ''}">
      <span>Start: ${selectedStart ? `(${selectedStart.x}, ${selectedStart.y})${canChange ? ` <button data-change-start data-agent="${escapeAttr(agentId)}">Change</button>` : ''}` : 'not selected'}</span>
      <span>Drop zone: ${escapeHtml(zones.length > 1 ? `${zones.length} allowed` : agent.deployment?.zoneId ?? zone?.id ?? 'fixed')}</span>
      <span>Speed: ${Number.isFinite(speed) ? speed.toFixed(2) : 'N/A'} | Fuel: ${Number.isFinite(fuel) ? fuel.toFixed(0) : 'N/A'} | Radius: ${Number(agent.samplingRadius ?? 0.8).toFixed(2)}</span>
    </div>
    ${warning ? '<p class="hud-muted warning">Choose a deployment cell first.</p>' : ''}
  `;
}

function waypointRows(state, waypoints, agentId, engine, result) {
  return `
    <ol class="timeline-waypoints">
      ${waypoints.map((waypoint, index) => {
        const status = waypointStatus({ waypoint, index, agentId, engine, result });
        const missed = waypointMissEvent({ waypoint, index, agentId, engine, result });
        const routeFailure = state.routeFailureDecision?.active
          && state.routeFailureDecision.agentId === agentId
          && Number(state.routeFailureDecision.failedWaypointIndex) === index;
        const terminalCarryThrough = Boolean(waypoint.terminalCarryThrough);
        const label = routeFailure
          ? `MISSED: ${labelReason(state.routeFailureDecision.reason).toUpperCase()}`
          : terminalCarryThrough ? 'Terminal Carry-Through'
            : missed ? `MISSED: ${labelReason(missed.reason).toUpperCase()}` : statusLabel(status);
        const selected = state.ui?.selectedWaypoint?.agentId === agentId && state.ui.selectedWaypoint.index === index;
        return `
          <li class="timeline-waypoint ${status} ${terminalCarryThrough ? 'warning' : ''} ${selected || routeFailure ? 'selected' : ''} ${routeFailure ? 'failure' : ''}">
            <button class="waypoint-main" data-select-waypoint data-agent="${escapeAttr(agentId)}" data-index="${index}">
              <span class="waypoint-num">${index + 1}</span>
              <span>
                <strong>W${Number(waypoint.window ?? 0)} · ${escapeHtml(formatMissionTime(state.level, waypoint.t ?? 0))}</strong>
                <small>(${Number(waypoint.x)}, ${Number(waypoint.y)}) · ${escapeHtml(waypoint.action ?? 'sample')}</small>
                ${terminalCarryThrough ? '<small class="marker-warning">Terminal carry-through: simulation will travel toward this waypoint until mission time expires.</small>' : ''}
                ${waypoint.validity?.routeAudit ? `<small class="marker-warning">${escapeHtml(formatDiagnosticForUi(waypoint.validity.routeAudit.diagnostic) ?? waypoint.validity.routeAudit.message)}</small>` : ''}
              </span>
              <em>${escapeHtml(label)}</em>
            </button>
            <div class="waypoint-row-actions">
              <button data-move-up data-agent="${escapeAttr(agentId)}" data-index="${index}" ${index === 0 ? 'disabled' : ''}>Up</button>
              <button data-move-down data-agent="${escapeAttr(agentId)}" data-index="${index}" ${index >= waypoints.length - 1 ? 'disabled' : ''}>Down</button>
              <button data-delete-waypoint data-agent="${escapeAttr(agentId)}" data-index="${index}">Delete</button>
            </div>
          </li>
        `;
      }).join('')}
    </ol>
  `;
}

function markerRows(state, markers, agentId) {
  return `
    <ol class="timeline-waypoints planning-markers">
      ${markers.map((marker, index) => {
        const reach = marker.reachability ?? {};
        const selected = state.ui?.selectedMarker?.agentId === agentId && Number(state.ui.selectedMarker.index) === index;
        return `
        <li class="timeline-waypoint marker ${Number(marker.window ?? 0) === Number(state.selectedWindow ?? 0) || selected ? 'selected' : ''} ${escapeAttr(reach.status ?? 'unknown')}">
          <div class="waypoint-main marker-main">
            <span class="waypoint-num">M${index + 1}</span>
            <span>
              <strong>W${Number(marker.window ?? 0)} Â· ${escapeHtml(formatMissionTime(state.level, marker.t ?? 0))}</strong>
              <small>(${Number(marker.x)}, ${Number(marker.y)}) Â· ${escapeHtml(marker.label ?? 'Planning Marker')}${marker.linkedTargetId ? ` Â· ${escapeHtml(marker.linkedTargetId)}` : ''}</small>
              ${markerEstimateDetails(reach)}
            </span>
            <em>${escapeHtml(statusLabelText(reach.status))}</em>
          </div>
          <div class="waypoint-row-actions">
            <button data-convert-marker data-agent="${escapeAttr(agentId)}" data-index="${index}">Convert</button>
            <button data-focus-marker data-agent="${escapeAttr(agentId)}" data-index="${index}">Focus Time</button>
            <button data-delete-marker data-agent="${escapeAttr(agentId)}" data-index="${index}">Delete</button>
          </div>
        </li>
      `;
      }).join('')}
    </ol>
  `;
}

function markerEstimateDetails(reach = {}) {
  return `
    <small class="marker-estimate">${escapeHtml(statusLabelText(reach.status))} estimate | slack ${formatNumber(reach.timeSlack)} hr | travel ${formatNumber(reach.estimatedTravelTime)} hr</small>
    <small class="marker-estimate">energy ${formatNumber(reach.estimatedEnergy)} | fuel left ${formatNumber(reach.remainingFuel)} | risk ${escapeHtml(reach.routeRiskStatus ?? 'N/A')}</small>
    <small class="marker-estimate">Likely needs ~${Number(reach.recommendedBackfillSteps ?? 0)} planning window/intermediate waypoint step(s).</small>
    ${reach.warnings?.length ? `<small class="marker-warning">${escapeHtml(reach.warnings[0])}</small>` : ''}
  `;
}

function statusLabelText(status) {
  if (status === 'reachable') return 'Reachable';
  if (status === 'tight') return 'Tight';
  if (status === 'risky') return 'Risky';
  if (status === 'impossible') return 'Impossible';
  return 'Estimate';
}

function formatNumber(value) {
  const number = Number(value);
  if (!Number.isFinite(number)) return 'N/A';
  return Math.abs(number) >= 10 ? String(Math.round(number)) : number.toFixed(1);
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
  if (status === 'warning-time') return 'CARRY-THROUGH';
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
