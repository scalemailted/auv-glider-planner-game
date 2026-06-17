import { detectRendererCapabilities, rendererCapabilitySummary } from '../../../core/rendering/RendererCapabilityModel.js';
import {
  createRendererHostConfig,
  createRendererSceneDescriptor,
  rendererHostSummary
} from '../../../core/rendering/RendererHostContract.js';
import {
  buildOceanWorldRenderViewModel,
  oceanWorldRenderViewModelSummary
} from '../../../core/rendering/OceanWorldRenderViewModel.js';
import { rendererHostPanelHtml } from '../../../ui/rendering/RendererHostPanel.js';

const PhaserScene = globalThis.Phaser?.Scene ?? class {};

export const RENDERER_ARCHITECTURE_PREVIEW_VERSION = 'renderer-architecture-preview-gfx-arch-r1';

export class RendererArchitecturePreviewScene extends PhaserScene {
  constructor() {
    super('RendererArchitecturePreviewScene');
    this.objects = [];
    this.capabilities = null;
    this.hostConfig = null;
    this.oceanWorldViewModel = null;
    this.panelViewModel = null;
  }

  create() {
    this.app = this.sys.game.anchorApp ?? globalThis.__anchorPhaserApp;
    if (!this.app) return;
    this.app.state.mode = 'rendererArchitecturePreview';
    this.app.clearPanels();
    this.app.elements.shell?.classList.remove('planning-workspace');
    this.app.setSceneLabel('Renderer Architecture Preview');
    this.buildPreviewModel();
    this.renderPanel();
    this.refreshDebugObject(true);
    this.draw();
  }

  shutdown() {
    this.destroyObjects();
    this.refreshDebugObject(false);
  }

  handleViewportResize() {
    if (!this.sys?.isActive?.()) return;
    this.draw();
  }

  buildPreviewModel(options = {}) {
    this.capabilities = detectRendererCapabilities({
      globals: options.globals ?? globalThis,
      preferredBackend: options.preferredBackend ?? 'threeWebGL'
    });

    const sceneDescriptor = createRendererSceneDescriptor({
      id: 'future-ocean-world-renderer',
      label: 'Future Ocean World Renderer',
      rendererBackend: this.capabilities.preferredBackend,
      fallbackBackend: this.capabilities.fallbackBackend,
      purpose: 'Future bathymetry, depth-layer, planned-vs-realized trajectory renderer.',
      requiredCapabilities: [],
      optionalCapabilities: ['webgl', 'webgpu', 'three'],
      consumesViewModelTypes: ['anchor.rendering.ocean-world-view-model']
    });

    this.hostConfig = createRendererHostConfig({
      id: 'anchor-browser-renderer-host',
      label: 'ANCHOR Browser Renderer Host',
      capabilities: this.capabilities,
      preferredBackend: this.capabilities.preferredBackend,
      fallbackBackend: this.capabilities.fallbackBackend,
      scenes: [sceneDescriptor]
    });

    this.oceanWorldViewModel = buildOceanWorldRenderViewModel({
      missionConfig: {
        world: { grid: { width: 12, height: 8 } },
        waterColumnConfig: { depthLayerIds: ['surface', 'thermocline', 'deep'], diveProfileId: 'sawtoothProfile' }
      },
      waterColumnSummary: {
        waterColumnConfig: { depthLayerIds: ['surface', 'thermocline', 'deep'], diveProfileId: 'sawtoothProfile' },
        observationCountsByDepth: { surface: 1, thermocline: 2, deep: 1 },
        trackCountsByDepth: { surface: 2, thermocline: 3, deep: 2 },
        verticalCoverage: 'broad',
        publicSafe: true
      },
      bathymetrySummary: {
        present: true,
        minDepthMeters: 8,
        maxDepthMeters: 120,
        meanDepthMeters: 52,
        source: 'synthetic-preview'
      },
      motionTrajectory: {
        plannedWaypoints: [
          { id: 'wp-surface-1', x: 1, y: 6, depthLayerId: 'surface', depthMeters: 0, timeSeconds: 0 },
          { id: 'wp-thermocline', x: 5, y: 4, depthLayerId: 'thermocline', depthMeters: 45, timeSeconds: 900 },
          { id: 'wp-deep', x: 9, y: 5, depthLayerId: 'deep', depthMeters: 95, timeSeconds: 1800 },
          { id: 'wp-surface-2', x: 11, y: 2, depthLayerId: 'surface', depthMeters: 0, timeSeconds: 2700 }
        ],
        realizedTrack: [
          { id: 'track-1', x: 1, y: 6, depthLayerId: 'surface', depthMeters: 0, timeSeconds: 0, currentAssist: 0.12, crossCurrent: 0.04 },
          { id: 'track-2', x: 4.6, y: 4.3, depthLayerId: 'thermocline', depthMeters: 42, timeSeconds: 900, currentAssist: 0.2, crossCurrent: 0.1 },
          { id: 'track-3', x: 8.4, y: 5.5, depthLayerId: 'deep', depthMeters: 92, timeSeconds: 1800, currentAssist: -0.06, crossCurrent: 0.18 },
          { id: 'track-4', x: 10.8, y: 2.4, depthLayerId: 'surface', depthMeters: 0, timeSeconds: 2700, currentAssist: 0.08, crossCurrent: 0.05 }
        ],
        sampledObservations: [
          { id: 'sample-surface', x: 1, y: 6, depthLayerId: 'surface', depthMeters: 0, observedValue: 0.4, timeSeconds: 0 },
          { id: 'sample-thermocline', x: 4.6, y: 4.3, depthLayerId: 'thermocline', depthMeters: 42, observedValue: 0.72, timeSeconds: 900 },
          { id: 'sample-deep', x: 8.4, y: 5.5, depthLayerId: 'deep', depthMeters: 92, observedValue: 0.5, timeSeconds: 1800 }
        ]
      },
      options: {
        id: 'renderer-architecture-preview-ocean-world',
        label: 'Renderer Preview Ocean World',
        flowOverlaySummary: {
          present: true,
          sampleCount: 4,
          meanCurrentAssist: 0.085,
          meanCrossCurrent: 0.0925,
          rendererHint: 'future vector glyph or particle overlay'
        }
      }
    });

    this.panelViewModel = {
      capabilities: rendererCapabilitySummary(this.capabilities),
      hostSummary: rendererHostSummary(this.hostConfig),
      oceanWorldSummary: oceanWorldRenderViewModelSummary(this.oceanWorldViewModel)
    };
    return this.panelViewModel;
  }

  renderPanel() {
    this.app.setPanel(rendererHostPanelHtml(this.panelViewModel));
    const root = this.app.elements?.consoleRoot ?? globalThis.document;
    root?.querySelector?.('[data-action="menu"]')?.addEventListener('click', () => this.scene.start('MainMenuScene'));
  }

  refreshDebugObject(active = true) {
    globalThis.ANCHOR_RENDERER_ARCH_DEBUG = {
      version: RENDERER_ARCHITECTURE_PREVIEW_VERSION,
      active: Boolean(active),
      preferredBackend: this.capabilities?.preferredBackend ?? 'unsupported',
      supportsWebGPU: Boolean(this.capabilities?.supportsWebGPU),
      supportsWebGL: Boolean(this.capabilities?.supportsWebGL),
      phaserShellActive: true,
      ownsSimulationState: false,
      ownsScoring: false,
      ownsPlanning: false,
      usesWebGPUFluid: false,
      usesMARL: false,
      usesNewPlanner: false,
      changesScoring: false,
      threeDependencyAdded: false,
      webgpuRequired: false
    };
  }

  draw() {
    this.destroyObjects();
    const width = Number(this.sys?.game?.scale?.width ?? this.scale?.width ?? 960);
    const height = Number(this.sys?.game?.scale?.height ?? this.scale?.height ?? 640);
    const margin = Math.max(28, Math.min(64, width * 0.055));
    const top = Math.max(30, Math.min(58, height * 0.075));
    const graphics = this.add.graphics();
    this.objects.push(graphics);

    graphics.fillGradientStyle(0x06111f, 0x09223b, 0x071827, 0x04101d, 1);
    graphics.fillRect(0, 0, width, height);
    graphics.lineStyle(1, 0x65c7f0, 0.1);
    for (let y = top + 90; y < height; y += 48) graphics.lineBetween(0, y, width, y + Math.sin(y * 0.02) * 14);
    for (let x = margin; x < width - margin; x += 76) graphics.lineBetween(x, top + 130, x, height - margin);

    const titleStyle = { fontFamily: 'system-ui', fontSize: '30px', fontStyle: '700', color: '#eef6ff' };
    const bodyStyle = { fontFamily: 'system-ui', fontSize: '15px', color: '#bed2ea', lineSpacing: 7, wordWrap: { width: Math.max(420, width - margin * 2) } };
    const smallStyle = { fontFamily: 'system-ui', fontSize: '13px', color: '#91a8c4', lineSpacing: 5, wordWrap: { width: Math.max(360, width - margin * 2) } };

    this.objects.push(this.add.text(margin, top, 'Renderer Architecture Preview', titleStyle));
    this.objects.push(this.add.text(margin, top + 42, 'Phaser shell + future dedicated 3D renderer layer + portable JS simulation core.', bodyStyle));

    const stackTop = top + 116;
    const stackWidth = Math.max(320, width - margin * 2);
    const bandHeight = Math.max(54, Math.min(76, (height - stackTop - margin) / 5.4));
    const bands = [
      { label: 'Portable JS Core', detail: 'Simulation, scoring, benchmarks, headless runtime, solver packets', color: 0x63e6be },
      { label: 'Phaser App Shell', detail: 'Product hub, scene routing, HUD, panels, existing 2D demos', color: 0x54c7ec },
      { label: 'Renderer View Models', detail: 'Public-safe bathymetry, water-column, path, track, and sample summaries', color: 0xf6d365 },
      { label: 'Future Three.js/WebGL Layer', detail: 'Bathymetric world view, depth layers, planned vs realized trajectory', color: 0xa6e3a1 },
      { label: 'Optional WebGPU Sandbox', detail: 'Progressive enhancement only; no WebGPU fluid engine in this phase', color: 0xcba6f7 }
    ];

    bands.forEach((band, index) => {
      const y = stackTop + index * (bandHeight + 12);
      graphics.fillStyle(0x0b1d31, 0.82);
      graphics.fillRoundedRect(margin, y, stackWidth, bandHeight, 8);
      graphics.lineStyle(2, band.color, 0.58);
      graphics.strokeRoundedRect(margin, y, stackWidth, bandHeight, 8);
      graphics.fillStyle(band.color, 0.22);
      graphics.fillCircle(margin + 28, y + bandHeight / 2, 12);
      this.objects.push(this.add.text(margin + 52, y + 10, band.label, {
        fontFamily: 'system-ui', fontSize: '17px', fontStyle: '700', color: '#eef6ff'
      }));
      this.objects.push(this.add.text(margin + 52, y + 33, band.detail, {
        fontFamily: 'system-ui', fontSize: '12px', color: '#9fb4cf', wordWrap: { width: stackWidth - 88 }
      }));
      if (index < bands.length - 1) {
        graphics.lineStyle(2, 0xbef6ff, 0.26);
        graphics.lineBetween(width / 2, y + bandHeight, width / 2, y + bandHeight + 12);
      }
    });

    const footerY = Math.min(height - margin - 42, stackTop + bands.length * (bandHeight + 12) + 8);
    this.objects.push(this.add.text(margin, footerY, 'Boundary: renderer does not own scoring, planning, simulation, hidden truth, Python simulation, or MARL/RL.', smallStyle));
    const preferred = this.panelViewModel?.capabilities?.preferredBackend ?? 'unsupported';
    const fallback = this.panelViewModel?.capabilities?.fallbackBackend ?? 'unsupported';
    this.objects.push(this.add.text(margin, footerY + 24, `Detected preferred backend: ${preferred}. Fallback backend: ${fallback}.`, smallStyle));
  }

  destroyObjects() {
    for (const object of this.objects ?? []) object?.destroy?.();
    this.objects = [];
  }
}