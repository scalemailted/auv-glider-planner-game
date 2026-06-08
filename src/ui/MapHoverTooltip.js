import { formatMissionTime } from '../core/time/MissionTime.js';
import { inspectCellAtTime } from '../core/exploration/CellInspection.js';
import { formatHudMetric } from './HudMetrics.js';
import { getRoiModeLabel } from '../core/roi/RoiMode.js';

export class MapHoverTooltip {
  constructor(app, root) {
    this.app = app;
    this.root = root ?? createRoot(app);
    this.visible = false;
  }

  show({ state, cell, pointer }) {
    if (!this.root || !state?.level || state?.mode !== 'planning' || state.ui?.placementMode !== 'marker' || !cell || !pointer) {
      return this.hide();
    }
    const info = inspectCellAtTime({
      level: state.level,
      mission: state.mission,
      state,
      x: cell.x,
      y: cell.y,
      t: state.planningTime
    });
    if (!info) return this.hide();
    this.root.innerHTML = tooltipHtml(state, info);
    this.root.hidden = false;
    this.visible = true;
    this.position(pointer);
  }

  hide() {
    if (!this.root) return;
    this.root.hidden = true;
    this.root.innerHTML = '';
    this.visible = false;
  }

  position(pointer) {
    if (!this.root) return;
    const pad = 12;
    const offset = 14;
    const rect = this.root.getBoundingClientRect();
    const base = pointerClientPosition(this.app, pointer);
    let left = base.x + offset;
    let top = base.y + offset;
    if (left + rect.width + pad > globalThis.innerWidth) left = base.x - rect.width - offset;
    if (top + rect.height + pad > globalThis.innerHeight) top = base.y - rect.height - offset;
    this.root.style.left = `${clamp(left, pad, Math.max(pad, globalThis.innerWidth - rect.width - pad))}px`;
    this.root.style.top = `${clamp(top, pad, Math.max(pad, globalThis.innerHeight - rect.height - pad))}px`;
  }
}

function pointerClientPosition(app, pointer) {
  const event = pointer?.event ?? pointer;
  const clientX = Number(event?.clientX);
  const clientY = Number(event?.clientY);
  if (Number.isFinite(clientX) && Number.isFinite(clientY)) return { x: clientX, y: clientY };
  const canvas = app?.phaser?.canvas;
  const rect = canvas?.getBoundingClientRect?.();
  if (!rect) return { x: Number(pointer.x ?? 0), y: Number(pointer.y ?? 0) };
  const scaleX = rect.width / Math.max(1, Number(canvas.width ?? 1));
  const scaleY = rect.height / Math.max(1, Number(canvas.height ?? 1));
  return {
    x: rect.left + Number(pointer.x ?? 0) * scaleX,
    y: rect.top + Number(pointer.y ?? 0) * scaleY
  };
}

function tooltipHtml(state, info) {
  if (info.terrain === 'land') {
    return `
      <section class="map-hover-tooltip-card">
        <strong>Cell (${info.x}, ${info.y}) - ${escapeHtml(formatMissionTime(state.level, info.t))}</strong>
        <span>Terrain: land</span>
        <span class="warning">Not traversable</span>
      </section>
    `;
  }
  return `
    <section class="map-hover-tooltip-card">
      <strong>Cell (${info.x}, ${info.y}) - ${escapeHtml(formatMissionTime(state.level, info.t))}</strong>
      <span>ROI Mode: ${escapeHtml(getRoiModeLabel(info.roiMode))} (${escapeHtml(formatHudMetric(info.roiDisplayValue, 2))})</span>
      <span>Navigability: ${escapeHtml(info.navigability?.status ?? 'unknown')}${info.navigability?.status === 'blocked' ? ` (${escapeHtml(formatNavigabilityReason(info.navigability.reason))})` : ''}</span>
      ${diagnosticRows(info)}
      <span>Raw: ${escapeHtml(formatHudMetric(info.roiRawValue, 2))} | Probability: ${escapeHtml(formatHudMetric(info.roiProbability, 2))}${state.challengeMode === 'forecast' ? '' : ' deterministic'}</span>
      <span>Expected: ${escapeHtml(formatHudMetric(info.roiExpectedValue, 2))} | Remaining: ${escapeHtml(formatHudMetric(info.roiRemainingValue, 2))}</span>
      ${info.roiDepletedByPlan ? `<span class="warning">Claimed by: ${escapeHtml(claimedByLabel(info.roiClaimedBy))}</span>` : ''}
      <span>Current: ${escapeHtml(formatHudMetric(info.current.magnitude, 2))} ${escapeHtml(info.current.direction)}</span>
      ${currentMetadataRows(info.current)}
      ${beachingRiskRow(info.beachingRisk)}
      ${info.priorityTarget ? `<span>Priority: +${escapeHtml(formatHudMetric(info.priorityTarget.value))} active</span>` : ''}
      <span>Hazard: ${info.hazard ? 'yes' : 'none'}</span>
      ${info.depth ? `<span>Depth: ${escapeHtml(info.depth.label)}</span>` : ''}
      ${info.forecastConfidence !== null ? `<span>Confidence: ${escapeHtml(formatHudMetric(info.forecastConfidence, 2))}</span>` : ''}
    </section>
  `;
}

function currentMetadataRows(current = {}) {
  const risk = current.contributors?.shorelineRisk;
  const topology = current.contributors?.topologyAdjustment;
  const composite = current.contributors?.topologyComposite;
  return [
    current.source ? `<span>Current source: ${escapeHtml(current.source)} | Confidence: ${escapeHtml(formatHudMetric(current.confidence ?? 1, 2))}</span>` : '',
    composite ? `<span>Current region: ${escapeHtml(labelize(composite.regionType))} | Behavior: ${escapeHtml(labelize(composite.dominantRegionBehavior))}</span>` : '',
    risk && risk.level && risk.level !== 'none' ? `<span class="${risk.value >= 0.7 ? 'warning' : ''}">Shoreline risk: ${escapeHtml(risk.level)} | Toward land: ${escapeHtml(formatSignedMetric(risk.currentTowardLand, 2))}</span>` : '',
    topology?.topologyAdjusted ? '<span>Topology adjustment: deflected along shore</span>' : ''
  ].filter(Boolean).join('');
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

function diagnosticRows(info) {
  if (info.roiMode === 'travelCost') {
    const travel = info.roiTravel ?? {};
    if (travel.available === false) return '<span class="warning">Travel Cost: choose deployment/start or place a waypoint first.</span>';
    return [
      `<span>Travel Cost: ${escapeHtml(formatHudMetric(travel.cost, 1))} | Energy: ${escapeHtml(formatHudMetric(travel.energy, 1))} / ${escapeHtml(formatBudget(travel.remainingFuel, ''))}</span>`,
      `<span>ETA: ${escapeHtml(formatHudMetric(travel.eta, 1))} / ${escapeHtml(formatBudget(travel.availableTime, 'hr'))} | Speed: ${escapeHtml(formatHudMetric(travel.effectiveSpeed, 2))}</span>`,
      `<span>Current: (${escapeHtml(formatHudMetric(travel.currentVector?.u, 2))}, ${escapeHtml(formatHudMetric(travel.currentVector?.v, 2))}), mag ${escapeHtml(formatHudMetric(travel.currentMagnitude, 2))}</span>`,
      `<span>Along-route: ${escapeHtml(formatSignedMetric(travel.currentAlong, 2))} | Cross-current: ${escapeHtml(formatHudMetric(travel.currentCross, 2))} | ${escapeHtml(travel.currentLabel ?? 'current estimate')}</span>`,
      travel.beachingRisk?.value > 0 ? `<span class="${travel.beachingRisk.value >= 0.5 ? 'warning' : ''}">Beaching risk: ${escapeHtml(travel.beachingRisk.level)} | Shore distance: ${escapeHtml(formatHudMetric(travel.beachingRisk.shoreDistance, 1))} | Toward land: ${escapeHtml(formatSignedMetric(travel.beachingRisk.currentTowardLand, 2))}</span>` : '',
      `<span>Reachable: ${travel.reachable ? 'yes' : 'no'}${travel.message ? ` | ${escapeHtml(travel.message)}` : ''}</span>`
    ].filter(Boolean).join('');
  }
  if (info.roiMode === 'riskSafety') {
    const risk = info.roiRisk ?? {};
    const reasons = risk.reasons?.length ? `<span>Reason: ${escapeHtml(risk.reasons.slice(0, 3).join(', '))}</span>` : '';
    return [
      `<span>Risk / Safety: ${escapeHtml(risk.label ?? 'low')} Risk (${escapeHtml(formatHudMetric(risk.value, 2))})</span>`,
      `<span>Safety: ${escapeHtml(risk.safetyLabel ?? 'high')} (${escapeHtml(formatHudMetric(risk.safetyValue ?? (1 - Number(risk.value ?? 0)), 2))})</span>`,
      reasons
    ].filter(Boolean).join('');
  }
  return '';
}

function beachingRiskRow(risk) {
  if (!risk || Number(risk.value ?? 0) <= 0) return '';
  const label = `Beaching risk: ${risk.level} | Shore distance: ${formatHudMetric(risk.shoreDistance, 1)} | Current toward land: ${formatSignedMetric(risk.currentTowardLand, 2)}`;
  return `<span class="${risk.value >= 0.5 ? 'warning' : ''}">${escapeHtml(label)}</span>`;
}

function formatNavigabilityReason(reason) {
  return {
    terrain: 'terrain block',
    tooShallow: 'too shallow',
    outsideMap: 'outside map'
  }[reason] ?? reason ?? 'unknown';
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

function labelize(value) {
  return String(value ?? '').replace(/([A-Z])/g, ' $1').replace(/[_-]+/g, ' ').replace(/^./, (letter) => letter.toUpperCase());
}

function createRoot(app) {
  const root = document.createElement('div');
  root.id = 'map-hover-tooltip';
  root.hidden = true;
  document.body.appendChild(root);
  return root;
}

function clamp(value, min, max) {
  const numeric = Number(value);
  if (!Number.isFinite(numeric)) return min;
  return Math.max(min, Math.min(max, numeric));
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
