export function benchmarkRouteOverlayPanelHtml(viewModel = {}) {
  if (!viewModel) return '';
  const partial = viewModel.explanation?.partial || (Array.isArray(viewModel.warnings) && viewModel.warnings.some((warning) => /partial|waypoint geometry/i.test(warning)));
  return `
    <section class="benchmark-debrief-subsection benchmark-route-overlay" data-benchmark-route-overlay>
      <h3>Route Overlay</h3>
      <p>Route Overlay shows the executed or planned path using the data available from the existing simulator and debrief records.</p>
      <p>Segment colors/classes explain route outcomes such as completion, energy cost, hazards, current assist, current opposition, or cross-current risk.</p>
      <p>This visualization does not compute a new path. It reviews the path that was already planned and simulated.</p>
      ${partial ? '<p class="benchmark-route-warning">Segment-level metrics are partial. The route is drawn from available waypoint geometry.</p>' : ''}
      ${benchmarkRouteOverlayControlsHtml(viewModel)}
      ${benchmarkRouteOverlaySvgHtml(viewModel)}
      ${benchmarkRouteOverlayLegendHtml(viewModel)}
      <div class="benchmark-route-detail-grid">
        ${benchmarkRouteSegmentDetailsHtml(viewModel)}
        ${benchmarkRouteWaypointDetailsHtml(viewModel)}
      </div>
      ${attemptComparisonHtml(viewModel)}
      ${warningsHtml(viewModel.warnings)}
    </section>
  `;
}

export function benchmarkRouteOverlayControlsHtml(viewModel = {}) {
  const options = Array.isArray(viewModel.overlayLayerOptions) ? viewModel.overlayLayerOptions : [];
  return `
    <label class="benchmark-route-layer-control">
      <span>Route Review Layer</span>
      <select data-benchmark-route-layer>
        ${options.map((option) => `<option value="${escapeAttr(option.id)}" ${option.id === viewModel.selectedOverlayLayer ? 'selected' : ''}>${escapeHtml(option.label)}</option>`).join('')}
      </select>
    </label>
  `;
}

export function benchmarkRouteOverlaySvgHtml(viewModel = {}) {
  const segments = Array.isArray(viewModel.segments) ? viewModel.segments : [];
  const waypoints = Array.isArray(viewModel.waypoints) ? viewModel.waypoints : [];
  const attemptRoutes = viewModel.selectedOverlayLayer === 'attemptComparison' && Array.isArray(viewModel.attemptRoutes) ? viewModel.attemptRoutes : [];
  const comparisonSegments = attemptRoutes.flatMap((route) => (Array.isArray(route.segments) ? route.segments : []).map((segment) => ({ ...segment, routeClassName: route.className, routeLabel: route.routeSourceLabel, routePrimary: route.primary })));
  if (!segments.length && !waypoints.length) {
    return '<div class="benchmark-route-svg benchmark-route-empty" role="img" aria-label="Route overlay empty"><p class="hud-muted">No route geometry is available for this attempt yet.</p></div>';
  }
  const bounds = boundsForSvg(viewModel.bounds, [...segments, ...comparisonSegments], [...waypoints, ...attemptRoutes.flatMap((route) => route.waypoints ?? [])]);
  const projectedComparisonSegments = comparisonSegments.map((segment) => ({ ...segment, fromSvg: projectPoint(segment.from, bounds), toSvg: projectPoint(segment.to, bounds) })).filter((segment) => segment.fromSvg && segment.toSvg);
  const projectedSegments = segments.map((segment) => ({ ...segment, fromSvg: projectPoint(segment.from, bounds), toSvg: projectPoint(segment.to, bounds) })).filter((segment) => segment.fromSvg && segment.toSvg);
  const projectedWaypoints = waypoints.map((waypoint) => ({ ...waypoint, svg: projectPoint(waypoint, bounds) })).filter((waypoint) => waypoint.svg);
  return `
    <svg class="benchmark-route-svg" viewBox="0 0 100 100" role="img" aria-label="Route overlay for ${escapeAttr(viewModel.routeSourceLabel ?? 'benchmark route')}">
      <rect class="benchmark-route-map-bg" x="1" y="1" width="98" height="98" rx="4" />
      <g class="benchmark-route-grid" aria-hidden="true">
        ${[20, 40, 60, 80].map((tick) => `<line x1="${tick}" y1="2" x2="${tick}" y2="98" /><line x1="2" y1="${tick}" x2="98" y2="${tick}" />`).join('')}
      </g>
      ${projectedComparisonSegments.length ? `
      <g class="benchmark-route-comparison-segments">
        ${projectedComparisonSegments.map((segment) => `
          <line class="benchmark-route-segment ${escapeAttr(segment.routeClassName ?? segment.className)} ${segment.routePrimary ? 'selected' : ''}"
            data-benchmark-route-attempt-line="${escapeAttr(segment.routeLabel ?? '')}"
            x1="${formatSvg(segment.fromSvg.x)}" y1="${formatSvg(segment.fromSvg.y)}"
            x2="${formatSvg(segment.toSvg.x)}" y2="${formatSvg(segment.toSvg.y)}" />
        `).join('')}
      </g>
      ` : ''}
      <g class="benchmark-route-segments">
        ${projectedSegments.map((segment) => `
          <line class="benchmark-route-segment ${escapeAttr(segment.className)} ${segment.selected ? 'selected' : ''}"
            data-benchmark-route-segment-line="${escapeAttr(segment.index)}"
            x1="${formatSvg(segment.fromSvg.x)}" y1="${formatSvg(segment.fromSvg.y)}"
            x2="${formatSvg(segment.toSvg.x)}" y2="${formatSvg(segment.toSvg.y)}" />
        `).join('')}
      </g>
      <g class="benchmark-route-waypoints">
        ${projectedWaypoints.map((waypoint) => `
          <circle class="benchmark-route-waypoint ${escapeAttr(waypoint.className)} ${waypoint.selected ? 'selected' : ''}"
            data-benchmark-route-waypoint-marker="${escapeAttr(waypoint.index)}"
            cx="${formatSvg(waypoint.svg.x)}" cy="${formatSvg(waypoint.svg.y)}" r="${waypoint.selected ? 3.4 : 2.45}" />
          <text class="benchmark-route-waypoint-label" x="${formatSvg(waypoint.svg.x + 1.8)}" y="${formatSvg(waypoint.svg.y - 1.8)}">${escapeHtml(waypoint.index + 1)}</text>
        `).join('')}
      </g>
      <text class="benchmark-route-attempt-label" x="4" y="96">${escapeHtml(viewModel.routeSourceLabel ?? 'Benchmark Route')}</text>
    </svg>
  `;
}

export function benchmarkRouteOverlayLegendHtml(viewModel = {}) {
  const legend = Array.isArray(viewModel.legend) ? viewModel.legend : [];
  if (!legend.length) return '';
  return `
    <div class="benchmark-route-legend" aria-label="Route overlay legend">
      ${legend.map((entry) => `
        <div><span class="benchmark-route-legend-swatch ${escapeAttr(entry.className)}"></span><strong>${escapeHtml(entry.label)}</strong><small>${escapeHtml(entry.description)}</small></div>
      `).join('')}
    </div>
  `;
}

export function benchmarkRouteSegmentDetailsHtml(viewModel = {}) {
  const segments = Array.isArray(viewModel.segments) ? viewModel.segments : [];
  const selected = viewModel.selectedSegment ?? segments[0] ?? null;
  return `
    <article class="benchmark-route-detail" data-benchmark-route-segment-details>
      <h4>Segment Details</h4>
      ${selected ? `
        <p><strong>Selected:</strong> ${escapeHtml(segmentLabel(selected))}</p>
        <p>Status ${escapeHtml(selected.status ?? 'partial')} | Distance ${escapeHtml(formatValue(selected.distance))} | Energy ${escapeHtml(formatValue(selected.energyCost))}</p>
        <p>Assist ${escapeHtml(formatValue(selected.currentAssist))} | Opposition ${escapeHtml(formatValue(selected.currentOpposition))} | Cross-current ${escapeHtml(formatValue(selected.crossCurrent))} | Hazard ${escapeHtml(formatValue(selected.hazardPenalty))}</p>
      ` : '<p class="hud-muted">No segment is available.</p>'}
      ${segments.length ? `
        <div class="debrief-table-wrap">
          <table class="debrief-table">
            <thead><tr><th>Segment</th><th>Status</th><th>Class</th><th>Warnings</th><th></th></tr></thead>
            <tbody>
              ${segments.slice(0, 8).map((segment) => `
                <tr class="${segment.selected ? 'winner' : ''}">
                  <td>${escapeHtml(segmentLabel(segment))}</td>
                  <td>${escapeHtml(segment.status ?? 'partial')}</td>
                  <td>${escapeHtml(segment.className ?? 'segment-neutral')}</td>
                  <td>${escapeHtml((segment.warnings ?? []).join('; ') || 'none')}</td>
                  <td><button class="debrief-button compact" data-benchmark-route-segment="${escapeAttr(segment.index)}">Select</button></td>
                </tr>
              `).join('')}
            </tbody>
          </table>
        </div>
      ` : ''}
    </article>
  `;
}

export function benchmarkRouteWaypointDetailsHtml(viewModel = {}) {
  const waypoints = Array.isArray(viewModel.waypoints) ? viewModel.waypoints : [];
  const selected = viewModel.selectedWaypoint ?? waypoints[0] ?? null;
  return `
    <article class="benchmark-route-detail" data-benchmark-route-waypoint-details>
      <h4>Waypoint Details</h4>
      ${selected ? `
        <p><strong>Selected:</strong> ${escapeHtml(selected.label ?? `Waypoint ${selected.index + 1}`)}</p>
        <p>Cell ${escapeHtml(formatPoint(selected))} | Status ${escapeHtml(selected.status ?? 'planned')} | Class ${escapeHtml(selected.className ?? 'waypoint-complete')}</p>
        <p>Energy ${escapeHtml(formatValue(selected.metrics?.energyCost))} | Sample ${escapeHtml(formatValue(selected.metrics?.sampleValue))} | Hazard ${escapeHtml(formatValue(selected.metrics?.hazardPenalty))}</p>
      ` : '<p class="hud-muted">No waypoint is available.</p>'}
      ${waypoints.length ? `
        <div class="debrief-table-wrap">
          <table class="debrief-table">
            <thead><tr><th>Waypoint</th><th>Cell</th><th>Status</th><th></th></tr></thead>
            <tbody>
              ${waypoints.slice(0, 10).map((waypoint) => `
                <tr class="${waypoint.selected ? 'winner' : ''}">
                  <td>${escapeHtml(waypoint.label ?? `Waypoint ${waypoint.index + 1}`)}</td>
                  <td>${escapeHtml(formatPoint(waypoint))}</td>
                  <td>${escapeHtml(waypoint.status ?? 'planned')}</td>
                  <td><button class="debrief-button compact" data-benchmark-route-waypoint="${escapeAttr(waypoint.index)}">Select</button></td>
                </tr>
              `).join('')}
            </tbody>
          </table>
        </div>
      ` : ''}
    </article>
  `;
}

function attemptComparisonHtml(viewModel = {}) {
  const attempts = Array.isArray(viewModel.attemptComparison?.attempts) ? viewModel.attemptComparison.attempts : [];
  if (!attempts.length) return '';
  return `
    <article class="benchmark-route-detail benchmark-route-attempts" data-benchmark-route-attempt-comparison>
      <h4>Attempt Routes</h4>
      <p class="hud-muted">${attempts.length > 1 ? 'Active attempt route is shown. Other attempts are listed for comparison when available.' : 'Only one executed attempt is available in this session. Export more attempts or import solver results to compare routes.'}</p>
      <div class="debrief-table-wrap">
        <table class="debrief-table">
          <thead><tr><th>Attempt</th><th>Fairness</th><th>Status</th><th>Geometry</th><th></th></tr></thead>
          <tbody>
            ${attempts.slice(0, 6).map((attempt) => `
              <tr>
                <td>${escapeHtml(attempt.routeSourceLabel ?? attempt.attemptId)}</td>
                <td>${escapeHtml(attempt.fairnessLabel ?? 'No fairness label')}</td>
                <td>${escapeHtml(attempt.status ?? 'unknown')}</td>
                <td>${escapeHtml(attempt.hasRouteGeometry ? (attempt.selected ? 'selected' : 'available') : 'not embedded')}</td>
                <td>${attempt.hasRouteGeometry ? `<button class="debrief-button compact" data-benchmark-overlay-attempt="${escapeAttr(attempt.attemptId)}">Show</button>` : ''}</td>
              </tr>
            `).join('')}
          </tbody>
        </table>
      </div>
    </article>
  `;
}

function warningsHtml(warnings = []) {
  const items = (Array.isArray(warnings) ? warnings : []).filter(Boolean);
  if (!items.length) return '';
  return `<div class="benchmark-route-warning">${escapeHtml(items.join(' '))}</div>`;
}

function boundsForSvg(bounds = {}, segments = [], waypoints = []) {
  const points = [
    ...waypoints,
    ...segments.flatMap((segment) => [segment.from, segment.to])
  ].filter((point) => point && Number.isFinite(Number(point.x)) && Number.isFinite(Number(point.y)));
  if (!points.length) return { minX: 0, minY: 0, maxX: 1, maxY: 1, width: 1, height: 1 };
  const minX = Number.isFinite(Number(bounds.minX)) ? Number(bounds.minX) : Math.min(...points.map((point) => Number(point.x)));
  const minY = Number.isFinite(Number(bounds.minY)) ? Number(bounds.minY) : Math.min(...points.map((point) => Number(point.y)));
  const maxX = Number.isFinite(Number(bounds.maxX)) ? Number(bounds.maxX) : Math.max(...points.map((point) => Number(point.x)));
  const maxY = Number.isFinite(Number(bounds.maxY)) ? Number(bounds.maxY) : Math.max(...points.map((point) => Number(point.y)));
  return { minX, minY, maxX, maxY, width: Math.max(1, maxX - minX), height: Math.max(1, maxY - minY) };
}

function projectPoint(point, bounds) {
  if (!point || !Number.isFinite(Number(point.x)) || !Number.isFinite(Number(point.y))) return null;
  return {
    x: 8 + ((Number(point.x) - bounds.minX) / bounds.width) * 84,
    y: 8 + ((Number(point.y) - bounds.minY) / bounds.height) * 84
  };
}

function segmentLabel(segment) {
  return `#${Number(segment.index ?? 0) + 1} ${formatPoint(segment.from)} -> ${formatPoint(segment.to)}`;
}

function formatPoint(point) {
  if (!point || !Number.isFinite(Number(point.x)) || !Number.isFinite(Number(point.y))) return 'N/A';
  return `${formatValue(point.x)},${formatValue(point.y)}`;
}

function formatValue(value) {
  const number = Number(value);
  if (!Number.isFinite(number)) return 'N/A';
  return Math.abs(number) >= 100 ? String(Math.round(number)) : String(Math.round(number * 1000) / 1000);
}

function formatSvg(value) {
  return String(Math.round(Number(value) * 100) / 100);
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