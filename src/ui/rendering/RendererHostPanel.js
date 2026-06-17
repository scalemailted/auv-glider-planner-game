export function rendererHostPanelHtml(viewModel = {}) {
  const capabilities = viewModel.capabilities ?? {};
  const host = viewModel.hostSummary ?? {};
  const ocean = viewModel.oceanWorldSummary ?? {};
  return `
    <section class="console-header">
      <div class="console-kicker">Renderer Architecture Preview</div>
      <h1>Renderer Boundary</h1>
      <p>Phaser shell remains active while future 3D renderers consume public-safe view models.</p>
    </section>
    <section class="console-status">
      <span>Preferred Backend</span>
      <strong>${escapeHtml(capabilities.preferredBackend ?? 'unsupported')}</strong>
      <small>Fallback: ${escapeHtml(capabilities.fallbackBackend ?? 'unsupported')}</small>
    </section>
    <section class="console-section">
      <h2>Capability Snapshot</h2>
      <div class="cell-inspector-metrics">
        ${metricHtml('Canvas2D', yesNo(capabilities.supportsCanvas2D))}
        ${metricHtml('WebGL', yesNo(capabilities.supportsWebGL))}
        ${metricHtml('WebGPU', yesNo(capabilities.supportsWebGPU))}
        ${metricHtml('Three.js Present', yesNo(capabilities.supportsThree))}
        ${metricHtml('Secure Context', yesNo(capabilities.secureContext))}
      </div>
      <div class="hud-muted">WebGPU is progressive enhancement, not a requirement.</div>
    </section>
    <section class="console-section">
      <h2>Renderer Stack</h2>
      <ol class="console-list">
        <li>Portable JS core owns simulation, benchmark, replay, and headless logic.</li>
        <li>Phaser remains the app shell for product hub, scene routing, HUDs, and existing flows.</li>
        <li>Future Three.js/WebGL or WebGPU renderers consume view models.</li>
        <li>WebGPU-Ocean remains a future sandbox/reference, not the canonical mission engine.</li>
      </ol>
    </section>
    <section class="console-section">
      <h2>Ocean View Model</h2>
      <div class="cell-inspector-metrics">
        ${metricHtml('Depth Layers', ocean.depthLayerCount ?? 0)}
        ${metricHtml('Planned Points', ocean.plannedPathPointCount ?? 0)}
        ${metricHtml('Realized Points', ocean.realizedTrajectoryPointCount ?? 0)}
        ${metricHtml('Samples', ocean.samplingPointCount ?? 0)}
        ${metricHtml('Coverage', ocean.verticalCoverage ?? 'n/a')}
      </div>
      <div class="hud-muted">Renderer view models are public-safe summaries. They do not include hidden truth arrays.</div>
    </section>
    <section class="console-section">
      <h2>Boundary</h2>
      <div class="hud-muted">Renderer does not own scoring, planning, or simulation.</div>
      <div class="hud-muted">No WebGPU fluid simulation, no Python simulator, and no MARL/RL is implemented in GFX-ARCH-R1.</div>
      <div class="hud-muted">Host status: ${escapeHtml(host.status ?? 'unknown')} with ${escapeHtml(host.sceneCount ?? 0)} registered renderer descriptor(s).</div>
    </section>
    <section class="console-footer">
      <button data-action="menu" class="console-button secondary">Main Menu</button>
    </section>
  `;
}

function metricHtml(label, value) {
  return `<div><span>${escapeHtml(label)}</span><strong>${escapeHtml(value)}</strong></div>`;
}

function yesNo(value) {
  return value ? 'Yes' : 'No';
}

function escapeHtml(value) {
  return String(value ?? '')
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;');
}