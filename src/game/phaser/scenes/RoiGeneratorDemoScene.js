import {
  createDemoRoiField,
  ROI_DEMO_DEFAULT_DISPLAY_MODE,
  roiDepletionModeLabel,
  roiDisplayModeLabel,
  roiPatternEvolutionLabel,
  roiSpatialEvolutionLabel,
  roiMotionScopeLabel,
  roiPureSpatialPatternLabel,
  roiEventLikelihoodLabel,
  roiLikelihoodDynamicsLabel,
  roiLikelihoodSpatialEvolutionLabel,
  roiValueDistributionLabel,
  roiSpatialPatternHelp,
  roiTemporalPatternLabel,
  roiEvolutionModelLabel,
  roiStateModelDescription,
  roiStateModelForEvolutionModel,
  roiStateModelLabel,
  roiClusterSizeLabel,
  sampleTemporalBehaviorLabel,
  roiDemoDistributionDefaults,
  normalizeRoiDemoDistribution,
  normalizeRoiDemoEventLikelihood,
  normalizeRoiDemoLikelihoodDynamics,
  normalizeRoiDemoPureSpatialPattern,
  normalizeRoiDemoValueDistribution,
  normalizeRoiDemoTemporalBehavior,
  normalizeRoiDemoTimeMode,
  normalizeRoiDemoTemporalPattern,
  normalizeRoiDemoEvolutionModel,
  normalizeRoiDemoPatternEvolution,
  normalizeRoiDemoMotionScope,
  normalizeRoiDemoStateModel,
  normalizeRoiDemoDepletionMode,
  normalizeRoiDemoDisplayMode,
  normalizeRoiDemoDynamicComplexity,
  normalizeRoiDemoClusterSize
} from '../../../core/demo/DemoRoiFields.js';
import { sampleFieldBehaviorExplainer, sampleFieldCompositionExplainer } from '../../../core/demo/SampleFieldBehaviorExplainers.js';
import {
  CUSTOM_SAMPLE_FIELD_BEHAVIOR_PRESET_ID,
  normalizeSampleFieldBehaviorPresetId,
  sampleFieldBehaviorPresetById,
  sampleFieldBehaviorPresetMetadata,
  sampleFieldBehaviorPresetLabel
} from '../../../core/demo/SampleFieldBehaviorPresets.js';
import { buildDemoArtifactEnvelope, cloneField, demoArtifactFilename, normalizeDemoExportSettings, validateDemoExportSettings } from '../../../core/io/DemoArtifactExporter.js';
import { downloadJSON } from '../../../core/io/ImportExport.js';

const PhaserScene = globalThis.Phaser?.Scene ?? class {};

export class RoiGeneratorDemoScene extends PhaserScene {
  constructor() {
    super('RoiGeneratorDemoScene');
    this.objects = [];
    this.transportRefs = {};
    this.distribution = 'burstyBloom';
    this.seed = 'anchor-roi-demo';
    this.eventLikelihood = 'multiModalLikelihood';
    this.eventLikelihoodDynamics = 'static';
    this.eventLikelihoodTemporalPattern = 'static';
    this.eventLikelihoodSpatialEvolution = 'stationary';
    this.hotspotCount = 3;
    this.clusterSize = 'medium';
    this.noise = 0.15;
    this.timeMode = 'dynamic';
    this.spatialPattern = 'clusteredField';
    this.valueDistribution = 'gaussianNormal';
    this.temporalPattern = 'bursty';
    this.temporalBehavior = 'bursty';
    this.evolutionModel = 'stationary';
    this.patternEvolution = 'stationary';
    this.spatialEvolution = 'stationary';
    this.motionScope = 'perFeature';
    this.stateModel = 'stateEvolving';
    this.depletionMode = 'soft';
    this.displayMode = ROI_DEMO_DEFAULT_DISPLAY_MODE;
    this.dynamicComplexity = 'medium';
    this.behaviorPresetId = CUSTOM_SAMPLE_FIELD_BEHAVIOR_PRESET_ID;
    this.behaviorPresetModified = false;
    this.forecastView = 'forecast';
    this.demoTime = 0;
    this.timeSpeedScale = 1;
    this.playbackDirection = 1;
    this.paused = false;
    this.field = null;
    this.selectedCell = null;
    this.rightPanelMode = 'cellInspector';
    this.selectedHelpTopic = null;
    this.lastInspectorKey = '';
    this.lastInspectorRenderTime = -Infinity;
    this.lastDynamicsDebugKey = '';
    this.exportMode = 'currentFrame';
    this.exportStartTime = 0;
    this.exportEndTime = 120;
    this.exportFrameCount = 1;
  }

  init(data = {}) {
    this.distribution = normalizeRoiDemoDistribution(data.distribution ?? 'burstyBloom');
    const distributionDefaults = roiDemoDistributionDefaults(this.distribution);
    this.seed = data.seed ?? 'anchor-roi-demo';
    this.eventLikelihood = normalizeRoiDemoEventLikelihood(data.eventLikelihood ?? distributionDefaults.eventLikelihood ?? 'multiModalLikelihood');
    this.eventLikelihoodDynamics = normalizeRoiDemoLikelihoodDynamics(data.eventLikelihoodDynamics ?? 'static');
    this.eventLikelihoodTemporalPattern = normalizeRoiDemoTemporalPattern(data.eventLikelihoodTemporalPattern ?? 'static');
    this.eventLikelihoodSpatialEvolution = normalizeRoiDemoPatternEvolution(data.eventLikelihoodSpatialEvolution ?? 'stationary');
    this.hotspotCount = finiteNumber(data.hotspotCount, 3);
    this.clusterSize = normalizeRoiDemoClusterSize(data.clusterSize ?? 'medium');
    this.noise = finiteNumber(data.noise, 0.15);
    this.timeMode = normalizeRoiDemoTimeMode(data.timeMode ?? 'dynamic');
    this.spatialPattern = normalizeRoiDemoPureSpatialPattern(data.spatialPattern ?? data.pureSpatialPattern ?? distributionDefaults.spatialPattern);
    this.valueDistribution = normalizeRoiDemoValueDistribution(data.valueDistribution ?? distributionDefaults.valueDistribution);
    this.temporalPattern = normalizeRoiDemoTemporalPattern(data.temporalPattern ?? distributionDefaults.temporalPattern);
    this.spatialEvolution = normalizeRoiDemoPatternEvolution(data.spatialEvolution ?? data.patternEvolution ?? data.evolutionModel ?? distributionDefaults.spatialEvolution ?? distributionDefaults.evolutionModel);
    this.evolutionModel = this.spatialEvolution;
    this.patternEvolution = this.spatialEvolution;
    this.motionScope = normalizeRoiDemoMotionScope(data.motionScope ?? 'perFeature');
    this.stateModel = normalizeRoiDemoStateModel(data.stateModel);
    this.depletionMode = normalizeRoiDemoDepletionMode(data.depletionMode ?? 'soft');
    this.displayMode = normalizeRoiDemoDisplayMode(data.displayMode ?? ROI_DEMO_DEFAULT_DISPLAY_MODE);
    this.dynamicComplexity = normalizeRoiDemoDynamicComplexity(data.dynamicComplexity ?? 'medium');
    this.behaviorPresetId = normalizeSampleFieldBehaviorPresetId(data.behaviorPresetId ?? data.behaviorPreset?.id ?? CUSTOM_SAMPLE_FIELD_BEHAVIOR_PRESET_ID);
    this.behaviorPresetModified = Boolean(data.behaviorPresetModified ?? data.behaviorPreset?.modified);
    this.temporalBehavior = normalizeRoiDemoTemporalBehavior(data.temporalBehavior ?? distributionDefaults.temporalBehavior);
    this.forecastView = normalizeForecastView(data.forecastView ?? 'forecast');
    this.timeSpeedScale = finiteNumber(data.timeSpeedScale, 1);
    this.playbackDirection = normalizePlaybackDirection(data.playbackDirection);
    this.demoTime = finiteNumber(data.demoTime, 0);
    this.paused = false;
    this.selectedCell = normalizeSelectedCell(data.selectedCell);
    this.rightPanelMode = normalizeRightPanelMode(data.rightPanelMode);
    this.selectedHelpTopic = normalizeHelpTopic(data.selectedHelpTopic);
    this.lastInspectorKey = '';
    this.lastInspectorRenderTime = -Infinity;
    this.lastDynamicsDebugKey = '';
    this.exportMode = normalizeExportMode(data.exportMode);
    this.exportStartTime = finiteNumber(data.exportStartTime ?? this.demoTime, this.demoTime);
    this.exportEndTime = finiteNumber(data.exportEndTime ?? Math.max(120, this.demoTime), Math.max(120, this.demoTime));
    this.exportFrameCount = Math.max(1, Math.round(finiteNumber(data.exportFrameCount, 1)));
    this.rebuildField();
  }

  create() {
    this.app = this.sys.game.anchorApp;
    this.app.state.mode = 'roiDemo';
    this.app.clearPanels();
    this.app.elements.shell?.classList.remove('planning-workspace');
    this.app.setSceneLabel(this.title());
    this.renderConsole();
    this.renderTransportBar();
    this.renderCellInspector(true);
    this.buildSceneObjects();
    this.bindInputHandlers();
    this.draw();
  }

  shutdown() {
    this.unbindInputHandlers();
    this.destroyObjects();
    this.clearTransportBar();
    this.clearCellInspector();
  }

  handleViewportResize() {
    if (!this.sys?.isActive?.()) return;
    this.buildSceneObjects();
    this.draw();
  }

  update(_time, delta) {
    if (this.paused || (this.timeMode !== 'dynamic' && this.eventLikelihoodDynamics !== 'dynamic')) {
      this.draw();
      return;
    }
    const dt = Math.min(0.05, Math.max(0, Number(delta ?? 16.67) / 1000));
    this.demoTime = Math.max(0, this.demoTime + dt * this.playbackDirection * this.timeSpeedScale);
    this.rebuildField();
    this.draw();
  }

  title() {
    return 'Sample / ROI Field Demo';
  }

  subtitle() {
    return 'Seeded S(x,y,t) sandbox for inspecting where and when sampling is valuable.';
  }

  sceneConfig(overrides = {}) {
    return {
      distribution: this.distribution,
      seed: this.seed,
      eventLikelihood: this.eventLikelihood,
      eventLikelihoodDynamics: this.eventLikelihoodDynamics,
      eventLikelihoodTemporalPattern: this.eventLikelihoodTemporalPattern,
      eventLikelihoodSpatialEvolution: this.eventLikelihoodSpatialEvolution,
      hotspotCount: this.hotspotCount,
      clusterSize: this.clusterSize,
      noise: this.noise,
      timeMode: this.timeMode,
      spatialPattern: this.spatialPattern,
      valueDistribution: this.valueDistribution,
      temporalPattern: this.temporalPattern,
      temporalBehavior: this.temporalBehavior,
      evolutionModel: this.evolutionModel,
      patternEvolution: this.patternEvolution,
      spatialEvolution: this.spatialEvolution,
      motionScope: this.motionScope,
      stateModel: this.stateModel,
      depletionMode: this.depletionMode,
      displayMode: this.displayMode,
      dynamicComplexity: this.dynamicComplexity,
      behaviorPresetId: this.behaviorPresetId,
      behaviorPresetModified: this.behaviorPresetModified,
      forecastView: this.forecastView,
      timeSpeedScale: this.timeSpeedScale,
      playbackDirection: this.playbackDirection,
      demoTime: this.demoTime,
      selectedCell: this.selectedCell,
      rightPanelMode: this.rightPanelMode,
      selectedHelpTopic: this.selectedHelpTopic,
      exportMode: this.exportMode,
      exportStartTime: this.exportStartTime,
      exportEndTime: this.exportEndTime,
      exportFrameCount: this.exportFrameCount,
      ...overrides
    };
  }

  primitiveSceneConfig(overrides = {}) {
    const hasPreset = this.behaviorPresetId !== CUSTOM_SAMPLE_FIELD_BEHAVIOR_PRESET_ID;
    return this.sceneConfig({
      behaviorPresetModified: hasPreset ? true : false,
      ...overrides
    });
  }

  applyBehaviorPreset(behaviorPresetId) {
    const presetId = normalizeSampleFieldBehaviorPresetId(behaviorPresetId);
    const preset = sampleFieldBehaviorPresetById(presetId);
    if (!preset) {
      this.scene.restart(this.sceneConfig({
        behaviorPresetId: CUSTOM_SAMPLE_FIELD_BEHAVIOR_PRESET_ID,
        behaviorPresetModified: false,
        selectedHelpTopic: { groupId: 'behaviorPreset' },
        demoTime: 0
      }));
      return;
    }
    this.scene.restart(this.sceneConfig({
      ...preset.config,
      behaviorPresetId: preset.id,
      behaviorPresetModified: false,
      selectedHelpTopic: { groupId: 'behaviorPreset' },
      demoTime: 0
    }));
  }

  rebuildField() {
    this.field = createDemoRoiField({ ...this.sceneConfig(), time: this.demoTime });
    this.maybeLogFieldDynamics();
  }

  maybeLogFieldDynamics() {
    if (!this.field?.activityDiagnostics) return;
    const diagnostics = this.field.activityDiagnostics;
    const key = `${Math.floor((diagnostics.time ?? 0) * 10)}:${diagnostics.temporalPattern}:${diagnostics.spatialEvolution}:${diagnostics.samplingEffect}:${diagnostics.totalActivityMass}`;
    if (!this.field?.activityDiagnostics || key === this.lastDynamicsDebugKey) return;
    this.lastDynamicsDebugKey = key;
    if (globalThis.ANCHOR_DEBUG_ROI_DYNAMICS) {
      console.debug('[ROIDemo][FieldDynamics]', diagnostics);
    }
    if (globalThis.ANCHOR_DEBUG_ROI_COMPOSER && this.behaviorPresetId === 'recurringHotspots') {
      console.debug('[ROI][RecurringHotspots]', diagnostics.recurringHotspots ?? diagnostics);
    }
    if (globalThis.ANCHOR_DEBUG_ROI_PRESETS && this.behaviorPresetId !== CUSTOM_SAMPLE_FIELD_BEHAVIOR_PRESET_ID) {
      const previousTime = Math.max(0, this.demoTime - 1);
      const previousField = createDemoRoiField({ ...this.sceneConfig(), time: previousTime, demoTime: previousTime });
      const delta = meanFieldDelta(previousField.sampleValueField ?? previousField.field, this.field.sampleValueField ?? this.field.field);
      console.debug('[ROIDemo][PresetAudit]', {
        presetId: this.behaviorPresetId,
        time: diagnostics.time,
        meanValue: diagnostics.meanValue,
        maxValue: diagnostics.maxValue,
        activeCellFraction: diagnostics.activeFraction,
        highValueCellFraction: this.field?.stats ? highValueFraction(this.field.sampleValueField ?? this.field.field, 0.68) : 0,
        totalActivityMass: diagnostics.totalActivityMass,
        frameDelta: delta,
        extinctionWarning: diagnostics.activeFraction < 0.02,
        saturationWarning: diagnostics.activeFraction > 0.98 && diagnostics.maxValue - diagnostics.meanValue < 0.08,
        staticWarning: this.timeMode === 'dynamic' && delta < 0.012
      });
    }
  }

  renderConsole() {
    this.app.console?.renderRoiDemoControls?.({
      title: this.title(),
      status: `${roiEventLikelihoodLabel(this.field?.eventLikelihood ?? this.eventLikelihood)} event likelihood`,
      distribution: this.distribution,
      seed: this.seed,
      eventLikelihood: this.field?.eventLikelihood ?? this.eventLikelihood,
      eventLikelihoodLabel: this.field?.eventLikelihoodLabel ?? roiEventLikelihoodLabel(this.eventLikelihood),
      eventLikelihoodDynamics: this.field?.eventLikelihoodDynamics ?? this.eventLikelihoodDynamics,
      eventLikelihoodDynamicsLabel: this.field?.eventLikelihoodDynamicsLabel ?? roiLikelihoodDynamicsLabel(this.eventLikelihoodDynamics),
      eventLikelihoodTemporalPattern: this.field?.eventLikelihoodTemporalPattern ?? this.eventLikelihoodTemporalPattern,
      eventLikelihoodTemporalPatternLabel: this.field?.eventLikelihoodTemporalPatternLabel ?? roiTemporalPatternLabel(this.eventLikelihoodTemporalPattern),
      eventLikelihoodSpatialEvolution: this.field?.eventLikelihoodSpatialEvolution ?? this.eventLikelihoodSpatialEvolution,
      eventLikelihoodSpatialEvolutionLabel: this.field?.eventLikelihoodSpatialEvolutionLabel ?? roiLikelihoodSpatialEvolutionLabel(this.eventLikelihoodSpatialEvolution),
      hotspotCount: this.hotspotCount,
      noise: this.noise,
      timeMode: this.timeMode,
      spatialPattern: this.field?.pureSpatialPattern ?? this.spatialPattern,
      spatialPatternLabel: roiPureSpatialPatternLabel(this.field?.pureSpatialPattern ?? this.spatialPattern),
      valueDistribution: this.field?.valueDistribution ?? this.valueDistribution,
      valueDistributionLabel: this.field?.valueDistributionLabel ?? roiValueDistributionLabel(this.valueDistribution),
      clusterCount: this.field?.clusterCount ?? this.hotspotCount,
      clusterSize: this.field?.clusterSize ?? this.clusterSize,
      clusterSizeLabel: roiClusterSizeLabel(this.field?.clusterSize ?? this.clusterSize),
      temporalPattern: this.field?.temporalPattern ?? this.temporalPattern,
      temporalPatternLabel: roiTemporalPatternLabel(this.field?.temporalPattern ?? this.temporalPattern),
      temporalBehavior: this.field?.temporalBehavior ?? this.temporalBehavior,
      temporalBehaviorLabel: sampleTemporalBehaviorLabel(this.field?.temporalBehavior ?? this.temporalBehavior),
      evolutionModel: this.field?.evolutionModel ?? this.evolutionModel,
      evolutionModelLabel: roiEvolutionModelLabel(this.field?.evolutionModel ?? this.evolutionModel),
      patternEvolution: this.field?.patternEvolution ?? this.patternEvolution,
      patternEvolutionLabel: roiPatternEvolutionLabel(this.field?.patternEvolution ?? this.patternEvolution),
      spatialEvolution: this.field?.spatialEvolution ?? this.spatialEvolution,
      spatialEvolutionLabel: roiSpatialEvolutionLabel(this.field?.spatialEvolution ?? this.spatialEvolution),
      motionScope: this.field?.motionScope ?? this.motionScope,
      motionScopeLabel: roiMotionScopeLabel(this.field?.motionScope ?? this.motionScope),
      dynamicComplexity: this.field?.dynamicComplexity ?? this.dynamicComplexity,
      behaviorPresetId: this.behaviorPresetId,
      behaviorPresetLabel: sampleFieldBehaviorPresetLabel(this.behaviorPresetId),
      behaviorPresetModified: this.behaviorPresetModified,
      behaviorPreset: sampleFieldBehaviorPresetMetadata(this.behaviorPresetId, this.behaviorPresetModified),
      stateModel: this.field?.stateModel ?? this.stateModel,
      stateModelLabel: this.field?.stateModelLabel ?? roiStateModelLabel(this.stateModel),
      stateModelDescription: this.field?.stateModelDescription ?? roiStateModelDescription(this.stateModel),
      depletionMode: this.field?.depletionMode ?? this.depletionMode,
      depletionModeLabel: roiDepletionModeLabel(this.field?.depletionMode ?? this.depletionMode),
      displayMode: this.field?.displayMode ?? this.displayMode,
      displayModeLabel: roiDisplayModeLabel(this.field?.displayMode ?? this.displayMode),
      priorMode: this.field?.priorMode,
      forecastView: this.forecastView,
      timeSpeedScale: this.timeSpeedScale,
      playbackDirection: this.playbackDirection,
      time: this.demoTime,
      paused: this.paused,
      stats: this.field?.stats,
      activityDiagnostics: this.field?.activityDiagnostics,
      exportMode: this.exportMode,
      exportStartTime: this.exportStartTime,
      exportEndTime: this.exportEndTime,
      exportFrameCount: this.exportFrameCount
    }, {
      distribution: (distribution) => {
        const defaults = roiDemoDistributionDefaults(distribution);
        this.scene.restart(this.primitiveSceneConfig({
          distribution,
          eventLikelihood: defaults.eventLikelihood ?? this.eventLikelihood,
          eventLikelihoodDynamics: this.eventLikelihoodDynamics,
          eventLikelihoodTemporalPattern: this.eventLikelihoodTemporalPattern,
          eventLikelihoodSpatialEvolution: this.eventLikelihoodSpatialEvolution,
          spatialPattern: defaults.spatialPattern,
          valueDistribution: defaults.valueDistribution,
          temporalPattern: defaults.temporalPattern,
          temporalBehavior: defaults.temporalBehavior,
          evolutionModel: defaults.spatialEvolution ?? defaults.evolutionModel,
          patternEvolution: defaults.spatialEvolution ?? defaults.evolutionModel,
          spatialEvolution: defaults.spatialEvolution ?? defaults.evolutionModel,
          timeMode: defaults.temporalBehavior === 'static' ? 'static' : this.timeMode,
          demoTime: 0
        }));
      },
      seed: (seed) => {
        this.seed = String(seed ?? 'anchor-roi-demo').trim() || 'anchor-roi-demo';
        this.scene.restart(this.primitiveSceneConfig({ seed: this.seed, demoTime: 0 }));
      },
      behaviorPreset: (behaviorPresetId) => this.applyBehaviorPreset(behaviorPresetId),
      eventLikelihood: (eventLikelihood) => this.scene.restart(this.primitiveSceneConfig({ eventLikelihood, demoTime: 0 })),
      eventLikelihoodDynamics: (eventLikelihoodDynamics) => this.scene.restart(this.primitiveSceneConfig({
        eventLikelihoodDynamics,
        eventLikelihoodTemporalPattern: eventLikelihoodDynamics === 'dynamic' ? this.eventLikelihoodTemporalPattern : 'static',
        eventLikelihoodSpatialEvolution: eventLikelihoodDynamics === 'dynamic' ? this.eventLikelihoodSpatialEvolution : 'stationary',
        demoTime: 0
      })),
      eventLikelihoodTemporalPattern: (eventLikelihoodTemporalPattern) => this.scene.restart(this.primitiveSceneConfig({ eventLikelihoodTemporalPattern, eventLikelihoodDynamics: 'dynamic', demoTime: 0 })),
      eventLikelihoodSpatialEvolution: (eventLikelihoodSpatialEvolution) => this.scene.restart(this.primitiveSceneConfig({ eventLikelihoodSpatialEvolution, eventLikelihoodDynamics: 'dynamic', demoTime: 0 })),
      hotspotCount: (hotspotCount) => this.scene.restart(this.primitiveSceneConfig({ hotspotCount: Number(hotspotCount), demoTime: 0 })),
      clusterSize: (clusterSize) => this.scene.restart(this.primitiveSceneConfig({ clusterSize, demoTime: 0 })),
      noise: (noise) => this.scene.restart(this.primitiveSceneConfig({ noise: Number(noise), demoTime: 0 })),
      timeMode: (timeMode) => this.scene.restart(this.primitiveSceneConfig({ timeMode, demoTime: 0 })),
      spatialPattern: (spatialPattern) => this.scene.restart(this.primitiveSceneConfig({ spatialPattern, demoTime: 0 })),
      valueDistribution: (valueDistribution) => this.scene.restart(this.primitiveSceneConfig({ valueDistribution, demoTime: 0 })),
      temporalPattern: (temporalPattern) => this.scene.restart(this.primitiveSceneConfig({ temporalPattern, timeMode: temporalPattern === 'static' ? 'static' : 'dynamic', demoTime: 0 })),
      temporalBehavior: (temporalBehavior) => this.scene.restart(this.primitiveSceneConfig({ temporalBehavior, timeMode: temporalBehavior === 'static' ? 'static' : 'dynamic', demoTime: 0 })),
      evolutionModel: (evolutionModel) => this.scene.restart(this.primitiveSceneConfig({ evolutionModel, demoTime: 0 })),
      patternEvolution: (patternEvolution) => this.scene.restart(this.primitiveSceneConfig({ patternEvolution, spatialEvolution: patternEvolution, evolutionModel: patternEvolution, demoTime: 0 })),
      spatialEvolution: (spatialEvolution) => this.scene.restart(this.primitiveSceneConfig({ spatialEvolution, patternEvolution: spatialEvolution, evolutionModel: spatialEvolution, demoTime: 0 })),
      motionScope: (motionScope) => this.scene.restart(this.primitiveSceneConfig({ motionScope, demoTime: 0 })),
      stateModel: (stateModel) => this.scene.restart(this.primitiveSceneConfig({ stateModel, demoTime: 0 })),
      depletionMode: (depletionMode) => this.scene.restart(this.primitiveSceneConfig({ depletionMode, demoTime: 0 })),
      displayMode: (displayMode) => this.scene.restart(this.primitiveSceneConfig({ displayMode, demoTime: 0 })),
      dynamicComplexity: (dynamicComplexity) => this.scene.restart(this.primitiveSceneConfig({ dynamicComplexity, demoTime: 0 })),
      timeSpeedScale: (timeSpeedScale) => {
        this.timeSpeedScale = Number(timeSpeedScale) || 1;
        this.renderConsole();
        this.updateTransportBar();
      },
      behaviorHelp: (groupId) => this.showBehaviorHelp(groupId),
      regenerate: () => this.scene.restart(this.primitiveSceneConfig({ seed: nextSeed(this.seed), demoTime: 0 })),
      pause: () => {
        this.paused = !this.paused;
        this.renderConsole();
        this.updateTransportBar();
        this.renderCellInspector(true);
      },
      direction: () => this.togglePlaybackDirection(),
      reset: () => this.resetDemoState(),
      exportSettings: (patch) => this.updateExportSettings(patch),
      exportDemoJson: () => this.exportDemoJson(),
      menu: () => this.scene.start('MainMenuScene')
    });
  }

  buildSceneObjects() {
    this.destroyObjects();
    this.graphics = this.add.graphics();
    this.objects.push(this.graphics);
    this.titleText = this.add.text(0, 0, this.title(), {
      fontFamily: 'system-ui',
      fontSize: '28px',
      fontStyle: '700',
      color: '#eef6ff'
    }).setOrigin(0, 0);
    this.subtitleText = this.add.text(0, 0, this.subtitle(), {
      fontFamily: 'system-ui',
      fontSize: '14px',
      color: '#9cb4d8',
      wordWrap: { width: 760 }
    }).setOrigin(0, 0);
    this.statusText = this.add.text(0, 0, '', {
      fontFamily: 'system-ui',
      fontSize: '13px',
      color: '#d7f7cc'
    }).setOrigin(0, 0);
    this.objects.push(this.titleText, this.subtitleText, this.statusText);
  }

  layout() {
    const width = Math.max(1, Number(this.scale?.width ?? 1280));
    const height = Math.max(1, Number(this.scale?.height ?? 820));
    const margin = Math.max(24, Math.min(52, width * 0.045));
    const top = Math.max(24, Math.min(44, height * 0.06));
    const mapTop = top + 112;
    const mapHeight = Math.max(260, height - mapTop - 118);
    const mapWidth = Math.max(320, width - margin * 2);
    return {
      width,
      height,
      margin,
      top,
      map: {
        x: margin,
        y: mapTop,
        width: mapWidth,
        height: mapHeight
      }
    };
  }

  draw() {
    if (!this.graphics || !this.field) return;
    const layout = this.layout();
    this.graphics.clear();
    this.drawBackground(layout);
    this.drawHeatmap(layout.map);
    this.drawHighValueMarkers(layout.map);
    this.drawSelectedCell(layout.map);
    this.layoutText(layout);
    this.updateTransportBar();
    this.renderCellInspector();
  }

  drawBackground({ width, height, map }) {
    this.graphics.fillGradientStyle(0x08101d, 0x12351f, 0x152a3c, 0x06101d, 1);
    this.graphics.fillRect(0, 0, width, height);
    this.graphics.fillStyle(0x081827, 0.96);
    this.graphics.fillRoundedRect(map.x, map.y, map.width, map.height, 8);
    this.graphics.lineStyle(1, 0x7ebf78, 0.52);
    this.graphics.strokeRoundedRect(map.x, map.y, map.width, map.height, 8);
  }

  drawHeatmap(map) {
    const field = this.field.field;
    const width = this.field.width;
    const height = this.field.height;
    const cellW = map.width / width;
    const cellH = map.height / height;
    for (let y = 0; y < height; y += 1) {
      for (let x = 0; x < width; x += 1) {
        const value = Number(field[y]?.[x] ?? 0);
        const color = heatColor(value);
        this.graphics.fillStyle(color, 0.24 + value * 0.72);
        this.graphics.fillRect(map.x + x * cellW, map.y + y * cellH, cellW + 1, cellH + 1);
      }
    }
    this.graphics.lineStyle(1, 0x163747, 0.28);
    for (let x = 0; x <= width; x += 1) {
      this.graphics.lineBetween(map.x + x * cellW, map.y, map.x + x * cellW, map.y + map.height);
    }
    for (let y = 0; y <= height; y += 1) {
      this.graphics.lineBetween(map.x, map.y + y * cellH, map.x + map.width, map.y + y * cellH);
    }
    if (this.field.displayMode === 'sampleValueLikelihoodOverlay') {
      this.drawLikelihoodOverlay(map, cellW, cellH);
    }
  }

  drawLikelihoodOverlay(map, cellW, cellH) {
    const likelihood = this.field?.eventLikelihoodField ?? [];
    const width = this.field.width;
    const height = this.field.height;
    for (let y = 0; y < height; y += 1) {
      for (let x = 0; x < width; x += 1) {
        const value = Number(likelihood[y]?.[x] ?? 0);
        if (value < 0.42) continue;
        const cx = map.x + (x + 0.5) * cellW;
        const cy = map.y + (y + 0.5) * cellH;
        const radius = Math.max(1.5, Math.min(cellW, cellH) * (0.1 + value * 0.2));
        this.graphics.fillStyle(0xf7f7c6, 0.12 + value * 0.34);
        this.graphics.fillCircle(cx, cy, radius);
        if (value >= 0.72) {
          this.graphics.lineStyle(1, 0xffffff, 0.42 + value * 0.28);
          this.graphics.strokeCircle(cx, cy, radius + Math.min(cellW, cellH) * 0.16);
        }
      }
    }
  }

  drawHighValueMarkers(map) {
    const width = this.field.width;
    const height = this.field.height;
    const cellW = map.width / width;
    const cellH = map.height / height;
    for (const cell of this.field.highValueCells ?? []) {
      const cx = map.x + (cell.x + 0.5) * cellW;
      const cy = map.y + (cell.y + 0.5) * cellH;
      const radius = Math.max(3, Math.min(cellW, cellH) * 0.24);
      this.graphics.lineStyle(1, 0xf7f7c6, 0.72);
      this.graphics.strokeCircle(cx, cy, radius + cell.value * 3);
      if (cell.value >= 0.88) {
        this.graphics.fillStyle(0xffffff, 0.82);
        this.graphics.fillCircle(cx, cy, Math.max(1.5, radius * 0.36));
      }
    }
  }

  layoutText({ margin, top, map }) {
    this.titleText?.setPosition(margin, top);
    this.subtitleText?.setPosition(margin, top + 42);
    this.subtitleText?.setWordWrapWidth(Math.min(780, map.width));
    const stats = this.field?.stats ?? {};
    const diagnostics = this.field?.activityDiagnostics ?? {};
    const dynamicText = this.timeMode === 'dynamic' || this.eventLikelihoodDynamics === 'dynamic' ? ` | Demo Time: ${this.demoTime.toFixed(1)} hr | Playback: ${this.timeSpeedScale}x | Direction: ${this.playbackDirection === -1 ? 'Reverse' : 'Forward'}` : '';
    const stateModel = this.field?.stateModel ?? roiStateModelForEvolutionModel(this.field?.evolutionModel ?? this.evolutionModel);
    const range = diagnostics.dynamicRangeAfterContrast ?? ((diagnostics.maxValue ?? stats.max ?? 0) - (diagnostics.minValue ?? stats.min ?? 0));
    const warningText = diagnostics.diagnosticWarnings?.length ? ` | warnings ${diagnostics.diagnosticWarnings.join(', ')}` : '';
    const activityText = `Activity: mean ${formatStat(diagnostics.meanValue ?? stats.mean)} | active ${formatPercent(diagnostics.activeFraction)} | high ${formatPercent(diagnostics.highValueFraction)} | max ${formatStat(diagnostics.maxValue ?? stats.max)} | range ${formatStat(range)} | bbox ${formatPercent(diagnostics.activeBoundingBoxCoverage)} | components ${diagnostics.connectedComponentCount ?? 0} | hotspots ${diagnostics.activeHotspotCount ?? diagnostics.hotspotComponentCount ?? 0} | L/S corr ${formatStat(diagnostics.likelihoodSampleCorrelation)} | injected +${formatStat(diagnostics.injectedActivity)}${warningText}`;
    this.statusText?.setText(`Event Likelihood: ${roiEventLikelihoodLabel(this.field?.eventLikelihood ?? this.eventLikelihood)} (${roiLikelihoodDynamicsLabel(this.field?.eventLikelihoodDynamics ?? this.eventLikelihoodDynamics)}) | Spatial: ${roiPureSpatialPatternLabel(this.field?.pureSpatialPattern ?? this.spatialPattern)} | Value Distribution: ${roiValueDistributionLabel(this.field?.valueDistribution ?? this.valueDistribution)} | Temporal: ${roiTemporalPatternLabel(this.field?.temporalPattern ?? this.temporalPattern)} | Spatial Evolution: ${roiSpatialEvolutionLabel(this.field?.spatialEvolution ?? this.spatialEvolution)} | State Model: ${roiStateModelLabel(stateModel)} | Sampling: ${roiDepletionModeLabel(this.field?.depletionMode ?? this.depletionMode)} | Display: ${roiDisplayModeLabel(this.field?.displayMode ?? this.displayMode)} | Seed: ${this.seed}${dynamicText} | ${activityText} | Total: ${formatStat(stats.totalValue)}`);
    this.statusText?.setWordWrapWidth(Math.min(1040, map.width));
    this.statusText?.setPosition(margin, map.y + map.height + 18);
  }

  destroyObjects() {
    this.objects?.forEach((object) => object.destroy?.());
    this.objects = [];
    this.graphics = null;
  }

  drawSelectedCell(map) {
    if (!this.selectedCell || !this.field) return;
    const cellW = map.width / this.field.width;
    const cellH = map.height / this.field.height;
    const x = map.x + this.selectedCell.col * cellW;
    const y = map.y + this.selectedCell.row * cellH;
    this.graphics.fillStyle(0x63e6be, 0.1);
    this.graphics.fillRect(x + 1, y + 1, Math.max(1, cellW - 2), Math.max(1, cellH - 2));
    this.graphics.lineStyle(3, 0x63e6be, 0.96);
    this.graphics.strokeRect(x + 1.5, y + 1.5, Math.max(1, cellW - 3), Math.max(1, cellH - 3));
  }

  bindInputHandlers() {
    this.input?.off?.('pointerdown', this.handlePointerDown, this);
    this.input?.on?.('pointerdown', this.handlePointerDown, this);
  }

  unbindInputHandlers() {
    this.input?.off?.('pointerdown', this.handlePointerDown, this);
  }

  handlePointerDown(pointer) {
    const cell = this.cellFromPointer(pointer);
    if (!cell) return;
    if (this.selectedCell && this.selectedCell.col === cell.col && this.selectedCell.row === cell.row) {
      this.selectedCell = null;
    } else {
      this.selectedCell = cell;
    }
    this.rightPanelMode = 'cellInspector';
    this.lastInspectorRenderTime = -Infinity;
    this.renderCellInspector(true);
    this.draw();
  }

  showBehaviorHelp(groupId) {
    this.rightPanelMode = 'behaviorHelp';
    this.selectedHelpTopic = {
      groupId,
      optionId: this.helpOptionForGroup(groupId)
    };
    this.lastInspectorRenderTime = -Infinity;
    this.renderCellInspector(true);
  }

  helpOptionForGroup(groupId) {
    return {
      behaviorPreset: this.behaviorPresetId,
      eventLikelihood: this.field?.eventLikelihood ?? this.eventLikelihood,
      spatialPattern: this.field?.pureSpatialPattern ?? this.spatialPattern,
      valueDistribution: this.field?.valueDistribution ?? this.valueDistribution,
      temporalPattern: this.field?.temporalPattern ?? this.temporalPattern,
      spatialEvolution: this.field?.spatialEvolution ?? this.spatialEvolution,
      stateModel: this.field?.stateModel ?? this.stateModel,
      samplingEffect: this.field?.depletionMode ?? this.depletionMode,
      displayLayer: this.field?.displayMode ?? this.displayMode
    }[groupId] ?? null;
  }

  cellFromPointer(pointer) {
    const map = this.layout().map;
    const x = Number(pointer?.x);
    const y = Number(pointer?.y);
    if (!Number.isFinite(x) || !Number.isFinite(y) || !this.field) return null;
    if (x < map.x || y < map.y || x > map.x + map.width || y > map.y + map.height) return null;
    const col = Math.max(0, Math.min(this.field.width - 1, Math.floor(((x - map.x) / map.width) * this.field.width)));
    const row = Math.max(0, Math.min(this.field.height - 1, Math.floor(((y - map.y) / map.height) * this.field.height)));
    return { col, row, x: col, y: row };
  }

  renderTransportBar() {
    const root = this.app?.elements?.overlay?.bottomTimeline;
    if (!root) return;
    root.innerHTML = `
      <section class="hud-panel flow-demo-transport roi-demo-transport" aria-label="Sample / ROI Field Demo transport controls">
        <div class="timeline-buttons flow-demo-transport-actions">
          <button type="button" data-action="roi-demo-reset">Reset</button>
          <button type="button" data-action="roi-demo-direction">Direction: Forward</button>
          <button type="button" data-action="roi-demo-pause">Pause</button>
        </div>
        <div class="timeline-readout flow-demo-time-readout">
          <strong data-roi-demo-time>Demo Time: 0.0 s</strong>
          <span class="hud-muted" data-roi-demo-state>Dynamic sample field</span>
        </div>
        <div class="flow-demo-transport-summary">
          <span data-roi-demo-speed>Playback: 1x</span>
          <span data-roi-demo-behavior>Behavior: Bursty Bloom</span>
          <span>Infinite timeline</span>
        </div>
      </section>
    `;
    root.querySelector('[data-action="roi-demo-reset"]')?.addEventListener('click', () => this.resetDemoState());
    root.querySelector('[data-action="roi-demo-direction"]')?.addEventListener('click', () => this.togglePlaybackDirection());
    root.querySelector('[data-action="roi-demo-pause"]')?.addEventListener('click', () => {
      this.paused = !this.paused;
      this.renderConsole();
      this.updateTransportBar();
      this.renderCellInspector(true);
    });
    this.transportRefs = {
      root,
      directionButton: root.querySelector('[data-action="roi-demo-direction"]'),
      pauseButton: root.querySelector('[data-action="roi-demo-pause"]'),
      time: root.querySelector('[data-roi-demo-time]'),
      state: root.querySelector('[data-roi-demo-state]'),
      speed: root.querySelector('[data-roi-demo-speed]'),
      behavior: root.querySelector('[data-roi-demo-behavior]')
    };
    this.updateTransportBar();
  }

  updateTransportBar() {
    const refs = this.transportRefs ?? {};
    if (!refs.root?.isConnected) return;
    const directionLabel = this.playbackDirection === -1 ? 'Reverse' : 'Forward';
    if (refs.time) refs.time.textContent = `${this.paused ? 'Paused at' : 'Demo Time'}: ${this.demoTime.toFixed(1)} s`;
    if (refs.state) refs.state.textContent = this.timeMode === 'dynamic' || this.eventLikelihoodDynamics === 'dynamic'
      ? `Dynamic sample field - ${directionLabel.toLowerCase()}`
      : 'Static sample field';
    if (refs.directionButton) refs.directionButton.textContent = `Direction: ${directionLabel}`;
    if (refs.pauseButton) refs.pauseButton.textContent = this.paused ? 'Resume' : 'Pause';
    if (refs.speed) refs.speed.textContent = `Playback: ${this.timeSpeedScale}x`;
    if (refs.behavior) refs.behavior.textContent = `Behavior: ${roiTemporalPatternLabel(this.temporalPattern)}`;
  }

  clearTransportBar() {
    const root = this.app?.elements?.overlay?.bottomTimeline;
    if (root) root.innerHTML = '';
    this.transportRefs = {};
  }

  togglePlaybackDirection() {
    this.playbackDirection = this.playbackDirection === 1 ? -1 : 1;
    this.updateTransportBar();
    this.renderConsole();
    this.renderCellInspector(true);
  }

  resetDemoState() {
    this.demoTime = 0;
    this.rebuildField();
    this.renderConsole();
    this.updateTransportBar();
    this.renderCellInspector(true);
    this.draw();
  }

  renderCellInspector(force = false) {
    const root = this.app?.elements?.waypointTimelineRoot;
    if (!root) return;
    if (this.rightPanelMode === 'behaviorHelp') {
      const topic = this.selectedHelpTopic ?? null;
      const key = `behaviorHelp:${topic?.groupId ?? 'empty'}:${topic?.optionId ?? 'empty'}:${this.behaviorPresetId}:${this.behaviorPresetModified}:${this.timeMode}:${this.eventLikelihood}:${this.eventLikelihoodDynamics}:${this.eventLikelihoodTemporalPattern}:${this.eventLikelihoodSpatialEvolution}:${this.spatialPattern}:${this.valueDistribution}:${this.temporalPattern}:${this.spatialEvolution}:${this.motionScope}:${this.depletionMode}:${this.displayMode}`;
      if (!force && key === this.lastInspectorKey) return;
      this.lastInspectorKey = key;
      this.lastInspectorRenderTime = this.demoTime;
      root.innerHTML = topic ? roiBehaviorHelpHtml(topic, this.behaviorHelpState()) : roiBehaviorHelpEmptyHtml();
      root.querySelector('[data-action="roi-show-cell-inspector"]')?.addEventListener('click', () => {
        this.rightPanelMode = 'cellInspector';
        this.renderCellInspector(true);
      });
      return;
    }
    if (!this.selectedCell) {
      if (force || this.lastInspectorKey !== 'empty') {
        root.innerHTML = roiInspectorEmptyHtml();
        this.lastInspectorKey = 'empty';
      }
      return;
    }
    const key = `${this.selectedCell.col},${this.selectedCell.row}:${this.timeMode}:${this.eventLikelihood}:${this.eventLikelihoodDynamics}:${this.eventLikelihoodTemporalPattern}:${this.eventLikelihoodSpatialEvolution}:${this.spatialPattern}:${this.valueDistribution}:${this.temporalPattern}:${this.spatialEvolution}:${this.motionScope}:${this.depletionMode}:${this.displayMode}:${this.clusterSize}:${this.paused}`;
    if (!force && key === this.lastInspectorKey && Math.abs(this.demoTime - this.lastInspectorRenderTime) < 0.25) return;
    this.lastInspectorKey = key;
    this.lastInspectorRenderTime = this.demoTime;
    root.innerHTML = roiInspectorHtml(this.inspectSelectedCell());
  }

  behaviorHelpState() {
    return {
      eventLikelihood: this.field?.eventLikelihood ?? this.eventLikelihood,
      eventLikelihoodLabel: this.field?.eventLikelihoodLabel ?? roiEventLikelihoodLabel(this.eventLikelihood),
      eventLikelihoodDynamics: this.field?.eventLikelihoodDynamics ?? this.eventLikelihoodDynamics,
      eventLikelihoodTemporalPattern: this.field?.eventLikelihoodTemporalPattern ?? this.eventLikelihoodTemporalPattern,
      eventLikelihoodSpatialEvolution: this.field?.eventLikelihoodSpatialEvolution ?? this.eventLikelihoodSpatialEvolution,
      spatialPattern: this.field?.pureSpatialPattern ?? this.spatialPattern,
      valueDistribution: this.field?.valueDistribution ?? this.valueDistribution,
      temporalPattern: this.field?.temporalPattern ?? this.temporalPattern,
      spatialEvolution: this.field?.spatialEvolution ?? this.spatialEvolution,
      stateModel: this.field?.stateModel ?? this.stateModel,
      depletionMode: this.field?.depletionMode ?? this.depletionMode,
      displayMode: this.field?.displayMode ?? this.displayMode
    };
  }

  clearCellInspector() {
    const root = this.app?.elements?.waypointTimelineRoot;
    if (root) root.innerHTML = '';
    this.lastInspectorKey = '';
  }

  inspectSelectedCell() {
    const cell = this.selectedCell;
    const value = Number(this.field?.sampleValueField?.[cell.row]?.[cell.col] ?? this.field?.field?.[cell.row]?.[cell.col] ?? 0);
    const displayedValue = Number(this.field?.field?.[cell.row]?.[cell.col] ?? value);
    const eventLikelihoodValue = Number(this.field?.eventLikelihoodField?.[cell.row]?.[cell.col] ?? 1);
    const previousField = createDemoRoiField({ ...this.sceneConfig(), time: Math.max(0, this.demoTime - 1), demoTime: Math.max(0, this.demoTime - 1) });
    const previous = Number(previousField.sampleValueField?.[cell.row]?.[cell.col] ?? previousField.field?.[cell.row]?.[cell.col] ?? value);
    const stats = this.field?.stats ?? {};
    const hotspot = (this.field?.highValueCells ?? []).find((entry) => entry.x === cell.col && entry.y === cell.row);
    const rawBase = Number(this.field?.rawBaseField?.[cell.row]?.[cell.col] ?? value);
    const depleted = Number(this.field?.sampleValueField?.[cell.row]?.[cell.col] ?? value);
    const spatialPattern = this.field?.pureSpatialPattern ?? this.spatialPattern;
    const spatialHelp = roiSpatialPatternHelp(spatialPattern);
    const nearestLikelihoodNode = nearestLikelihoodNodeForCell(this.field?.likelihoodField, cell);
    return {
      cell,
      value,
      displayedValue,
      previous,
      delta: value - previous,
      normalizedValue: stats.max > stats.min ? (value - stats.min) / Math.max(0.0001, stats.max - stats.min) : value,
      mode: this.timeMode,
      distribution: this.distribution,
      eventLikelihood: this.field?.eventLikelihood ?? this.eventLikelihood,
      eventLikelihoodLabel: this.field?.eventLikelihoodLabel ?? roiEventLikelihoodLabel(this.eventLikelihood),
      eventLikelihoodDynamics: this.field?.eventLikelihoodDynamics ?? this.eventLikelihoodDynamics,
      eventLikelihoodDynamicsLabel: this.field?.eventLikelihoodDynamicsLabel ?? roiLikelihoodDynamicsLabel(this.eventLikelihoodDynamics),
      eventLikelihoodTemporalPattern: this.field?.eventLikelihoodTemporalPattern ?? this.eventLikelihoodTemporalPattern,
      eventLikelihoodTemporalPatternLabel: this.field?.eventLikelihoodTemporalPatternLabel ?? roiTemporalPatternLabel(this.eventLikelihoodTemporalPattern),
      eventLikelihoodSpatialEvolution: this.field?.eventLikelihoodSpatialEvolution ?? this.eventLikelihoodSpatialEvolution,
      eventLikelihoodSpatialEvolutionLabel: this.field?.eventLikelihoodSpatialEvolutionLabel ?? roiLikelihoodSpatialEvolutionLabel(this.eventLikelihoodSpatialEvolution),
      eventLikelihoodValue,
      eventLikelihoodBand: likelihoodBandLabel(eventLikelihoodValue),
      likelihoodField: this.field?.likelihoodField,
      nearestLikelihoodNode,
      spatialPattern,
      valueDistribution: this.field?.valueDistribution ?? this.valueDistribution,
      valueDistributionLabel: this.field?.valueDistributionLabel ?? roiValueDistributionLabel(this.valueDistribution),
      seededValue: this.field?.valueDistributionSeeded ? 'yes' : 'no',
      valueBand: valueBandLabel(value),
      spatialPatternHelp: spatialHelp,
      spatialParameterSummary: spatialParameterSummary(spatialPattern, {
        clusterCount: this.field?.clusterCount ?? this.hotspotCount,
        clusterSize: this.field?.clusterSize ?? this.clusterSize,
        seed: this.seed,
        noise: this.noise
      }),
      clusterCount: this.field?.clusterCount ?? this.hotspotCount,
      clusterSize: this.field?.clusterSize ?? this.clusterSize,
      temporalPattern: this.field?.temporalPattern ?? this.temporalPattern,
      temporalBehavior: this.field?.temporalBehavior ?? this.temporalBehavior,
      evolutionModel: this.field?.evolutionModel ?? this.evolutionModel,
      dynamicComplexity: this.field?.dynamicComplexity ?? this.dynamicComplexity,
      patternEvolution: this.field?.patternEvolution ?? this.patternEvolution,
      spatialEvolution: this.field?.spatialEvolution ?? this.spatialEvolution,
      spatialEvolutionLabel: this.field?.spatialEvolutionLabel ?? roiSpatialEvolutionLabel(this.spatialEvolution),
      motionScope: this.field?.motionScope ?? this.motionScope,
      motionScopeLabel: this.field?.motionScopeLabel ?? roiMotionScopeLabel(this.motionScope),
      depletionMode: this.field?.depletionMode ?? this.depletionMode,
      displayMode: this.field?.displayMode ?? this.displayMode,
      stateModel: this.field?.stateModel ?? this.stateModel,
      stateModelLabel: this.field?.stateModelLabel ?? roiStateModelLabel(this.stateModel),
      stateModelDescription: this.field?.stateModelDescription ?? roiStateModelDescription(this.stateModel),
      behavior: this.field?.behavior,
      rawBase,
      depleted,
      hotspotMembership: hotspot ? `cluster/high-value rank ${1 + (this.field.highValueCells ?? []).indexOf(hotspot)}` : 'none',
      lastSampled: this.depletionMode === 'none' ? 'n/a' : 'synthetic demo marker',
      recovery: this.depletionMode === 'revisitRecovery' || this.displayMode === 'freshnessRevisitValue' ? recoveryLabel(this.demoTime) : 'n/a',
      sampleFieldConfig: this.field?.sampleFieldConfig,
      demoTime: this.demoTime,
      paused: this.paused
    };
  }

  exportDemoJson() {
    const errors = validateDemoExportSettings(this.exportSettings(), this.demoTime);
    if (errors.length) {
      this.app?.toast?.(errors[0], 'warning');
      return;
    }
    const artifact = this.buildDemoArtifactExport();
    downloadJSON(demoArtifactFilename('sample-roi-field', { kind: artifact.timeSampling?.kind }), artifact);
    this.app?.toast?.('Sample / ROI Demo JSON exported.', 'success');
  }

  buildDemoArtifactExport() {
    const field = this.field ?? {};
    const sampling = this.demoExportSampling();
    const currentFrame = this.buildDemoArtifactFrame(this.demoTime, null, field);
    const frames = sampling.timesSeconds.map((time, index) => this.buildDemoArtifactFrame(time, index));
    const behaviorPreset = sampleFieldBehaviorPresetMetadata(this.behaviorPresetId, this.behaviorPresetModified);
    return buildDemoArtifactEnvelope({
      type: 'anchor.demo.sample-roi-field',
      demo: this.title(),
      grid: {
        width: field.width,
        height: field.height
      },
      time: {
        demoTimeSeconds: this.demoTime,
        fieldTimeSeconds: field.time ?? this.demoTime,
        playbackDirection: this.playbackDirection,
        playbackSpeed: this.timeSpeedScale
      },
      timeSampling: sampling,
      config: this.sceneConfig(),
      fields: currentFrame.fields,
      likelihoodField: currentFrame.likelihoodField,
      frames,
      selectedCell: this.selectedCell ? this.inspectSelectedCell() : null,
      behaviorPreset,
      metadata: {
        behaviorPreset,
        coordinateConvention: 'Row-major arrays indexed fields[layer][row][col]; values represent cell centers on the demo grid.',
        units: {
          displayedValue: 'normalized demo scalar, 0..1',
          sampleValue: 'normalized realized sample scalar S(x,y,t), 0..1',
          eventLikelihood: 'normalized event likelihood L(x,y,t), 0..1',
          rawBaseValue: 'seeded base sample value before temporal/evolution/display effects, 0..1',
          evolvedValue: 'sample value after temporal/spatial evolution when available, 0..1'
        },
        stats: field.stats,
        activityDiagnostics: field.activityDiagnostics,
        likelihoodField: field.likelihoodField,
        highValueCells: field.highValueCells,
        freshnessNote: 'Freshness / Age of Information layers are demo-only unless connected to real mission visit history.',
        historyAwareExport: {
          supported: true,
          method: 'deterministic-resample-from-current-config-at-each-requested-time',
          notes: 'Sampling visits and freshness are synthetic demo effects, not mission glider visit history.'
        },
        exportFrameLimit: 240
      }
    });
  }

  buildDemoArtifactFrame(demoTime, index, existingField = null) {
    const field = existingField ?? createDemoRoiField({ ...this.sceneConfig(), time: demoTime, demoTime });
    return {
      index,
      timeSeconds: demoTime,
      demoTimeSeconds: demoTime,
      fieldTimeSeconds: field.time ?? demoTime,
      fields: {
        displayedValue: cloneField(field.field),
        sampleValue: cloneField(field.sampleValueField ?? field.field),
        eventLikelihood: cloneField(field.eventLikelihoodField),
        rawBaseValue: cloneField(field.rawBaseField),
        evolvedValue: cloneField(field.evolvedField)
      },
      likelihoodField: cloneLikelihoodFieldModel(field.likelihoodField),
      activityDiagnostics: field.activityDiagnostics,
      behaviorPreset: sampleFieldBehaviorPresetMetadata(this.behaviorPresetId, this.behaviorPresetModified)
    };
  }

  demoExportSampling() {
    return normalizeDemoExportSettings({
      exportMode: this.exportMode,
      startTimeSeconds: this.exportStartTime,
      endTimeSeconds: this.exportEndTime,
      frameCount: this.exportFrameCount
    }, this.demoTime);
  }

  updateExportSettings(patch = {}) {
    if (patch.exportMode !== undefined) {
      this.exportMode = normalizeExportMode(patch.exportMode);
      if (this.exportMode === 'timeWindow' && this.exportFrameCount <= 1) {
        this.exportStartTime = 0;
        this.exportEndTime = Math.max(120, this.demoTime);
        this.exportFrameCount = 25;
      }
    }
    if (patch.startTimeSeconds !== undefined) this.exportStartTime = finiteNumber(patch.startTimeSeconds, this.exportStartTime);
    if (patch.endTimeSeconds !== undefined) this.exportEndTime = finiteNumber(patch.endTimeSeconds, this.exportEndTime);
    if (patch.frameCount !== undefined) this.exportFrameCount = Math.max(1, Math.min(240, Math.round(finiteNumber(patch.frameCount, this.exportFrameCount))));
    this.renderConsole();
  }

  exportSettings() {
    return {
      exportMode: this.exportMode,
      startTimeSeconds: this.exportStartTime,
      endTimeSeconds: this.exportEndTime,
      frameCount: this.exportFrameCount
    };
  }
}

function heatColor(value) {
  const v = Math.max(0, Math.min(1, Number(value) || 0));
  if (v < 0.22) return 0x10243b;
  if (v < 0.45) return 0x1f7a8c;
  if (v < 0.68) return 0x63c56f;
  if (v < 0.84) return 0xf4d35e;
  return 0xff7b54;
}

function nextSeed(seed) {
  const match = String(seed ?? '').match(/^(.*?)(\d+)$/);
  if (!match) return `${seed}-2`;
  return `${match[1]}${Number(match[2]) + 1}`;
}

function finiteNumber(value, fallback = 0) {
  const number = Number(value);
  return Number.isFinite(number) ? number : fallback;
}

function normalizeExportMode(mode) {
  return mode === 'timeWindow' || mode === 'timeSeries' ? 'timeWindow' : 'currentFrame';
}

function nearestLikelihoodNodeForCell(model, cell) {
  const nodes = model?.nodes ?? [];
  const width = model?.values?.[0]?.length ?? 0;
  const height = model?.values?.length ?? 0;
  if (!nodes.length || !width || !height) return null;
  const nx = width > 1 ? Number(cell.col ?? cell.x ?? 0) / (width - 1) : 0;
  const ny = height > 1 ? Number(cell.row ?? cell.y ?? 0) / (height - 1) : 0;
  return nodes
    .map((node) => ({
      ...node,
      distance: Math.hypot(nx - Number(node.x ?? 0), ny - Number(node.y ?? 0))
    }))
    .sort((a, b) => a.distance - b.distance)[0] ?? null;
}

function cloneLikelihoodFieldModel(model) {
  if (!model) return null;
  return {
    type: model.type,
    label: model.label,
    values: cloneField(model.values),
    nodes: (model.nodes ?? []).map((node) => ({
      ...node,
      driftVelocity: node.driftVelocity ? { ...node.driftVelocity } : undefined
    })),
    metadata: { ...(model.metadata ?? {}) },
    diagnostics: { ...(model.diagnostics ?? {}) }
  };
}

function formatStat(value) {
  const number = Number(value);
  return Number.isFinite(number) ? number.toFixed(3) : 'N/A';
}

function formatPercent(value) {
  const number = Number(value);
  return Number.isFinite(number) ? `${Math.round(number * 100)}%` : 'N/A';
}

function meanFieldDelta(a, b) {
  const valuesA = a?.flat?.().map(Number) ?? [];
  const valuesB = b?.flat?.().map(Number) ?? [];
  const count = Math.min(valuesA.length, valuesB.length);
  if (!count) return 0;
  let total = 0;
  for (let index = 0; index < count; index += 1) {
    total += Math.abs((valuesA[index] || 0) - (valuesB[index] || 0));
  }
  return Number((total / count).toFixed(3));
}

function highValueFraction(field, threshold = 0.68) {
  const values = field?.flat?.().map(Number) ?? [];
  if (!values.length) return 0;
  return Number((values.filter((value) => value >= threshold).length / values.length).toFixed(3));
}

function valueBandLabel(value) {
  const number = Number(value);
  if (!Number.isFinite(number)) return 'n/a';
  if (number < 0.33) return 'low';
  if (number < 0.67) return 'medium';
  return 'high';
}

function likelihoodBandLabel(value) {
  const number = Number(value);
  if (!Number.isFinite(number)) return 'n/a';
  if (number < 0.25) return 'unlikely';
  if (number < 0.6) return 'possible';
  return 'event-prone';
}

function normalizeForecastView(value) {
  return ['forecast', 'truth', 'uncertainty', 'depleted'].includes(value) ? value : 'forecast';
}

function normalizePlaybackDirection(value) {
  return Number(value) === -1 || value === 'reverse' ? -1 : 1;
}

function normalizeSelectedCell(value) {
  if (!value || typeof value !== 'object') return null;
  const col = Number(value.col ?? value.x);
  const row = Number(value.row ?? value.y);
  if (!Number.isFinite(col) || !Number.isFinite(row)) return null;
  return { col: Math.max(0, Math.round(col)), row: Math.max(0, Math.round(row)), x: Math.max(0, Math.round(col)), y: Math.max(0, Math.round(row)) };
}

function normalizeRightPanelMode(value) {
  return value === 'behaviorHelp' ? 'behaviorHelp' : 'cellInspector';
}

function normalizeHelpTopic(value) {
  if (!value || typeof value !== 'object') return null;
  const groupId = String(value.groupId ?? '');
  if (!groupId) return null;
  return {
    groupId,
    optionId: value.optionId == null ? null : String(value.optionId)
  };
}

function roiInspectorEmptyHtml() {
  return `
    <section class="cell-inspector-shell">
      <div class="cell-inspector-header">
        <span>Sample / ROI Field Demo</span>
        <h2>Cell Inspector</h2>
        <p>Click a cell in the sample field to inspect its value behavior over time.</p>
      </div>
      <div class="cell-inspector-card">
        <strong>You can inspect</strong>
        <ul>
          <li>sample value and normalized value</li>
          <li>event likelihood at the selected cell</li>
          <li>temporal trend and hotspot membership</li>
          <li>state model, spatial evolution, and sampling effect</li>
          <li>raw and depleted sample-value display layers</li>
        </ul>
      </div>
    </section>
  `;
}

function roiBehaviorHelpEmptyHtml() {
  return `
    <section class="cell-inspector-shell behavior-help-shell" data-roi-behavior-help>
      <div class="cell-inspector-header">
        <span>Behavior Help</span>
        <h2>Behavior Help</h2>
        <p>Click an Explain button beside a Sample / ROI control to learn what that component does.</p>
      </div>
      <div class="cell-inspector-card">
        <strong>Available help</strong>
        <ul>
          <li>Event Likelihood Field</li>
          <li>Spatial Pattern / Geometry</li>
          <li>Value Distribution</li>
          <li>Temporal Pattern</li>
          <li>Spatial Evolution</li>
          <li>State Model / Memory</li>
          <li>Sampling Effects</li>
          <li>Display Layer</li>
        </ul>
      </div>
      <button class="console-button secondary" data-action="roi-show-cell-inspector">Show Cell Inspector</button>
    </section>
  `;
}

function roiBehaviorHelpHtml(topic, state) {
  const optionId = topic.optionId ?? behaviorHelpOptionForGroup(topic.groupId, state);
  const help = sampleFieldBehaviorExplainer(topic.groupId, optionId);
  const composition = sampleFieldCompositionExplainer(state);
  return `
    <section class="cell-inspector-shell behavior-help-shell" data-roi-behavior-help>
      <div class="cell-inspector-header">
        <span>Behavior Help</span>
        <h2>About ${escapeHtml(help.groupLabel)}: ${escapeHtml(help.label)}</h2>
        <p>${escapeHtml(help.question)}</p>
      </div>
      <div class="cell-inspector-card selected">
        <span>Selected Behavior</span>
        ${metricRows([
          ['component', help.groupLabel],
          ['selected', help.label]
        ])}
        <small>${escapeHtml(help.short)}</small>
      </div>
      <div class="cell-inspector-card">
        <span>Meaning</span>
        <p>${escapeHtml(help.meaning)}</p>
      </div>
      <div class="cell-inspector-card">
        <span>Expected Heatmap</span>
        <p>${escapeHtml(help.expectedBehavior)}</p>
      </div>
      <div class="cell-inspector-card">
        <span>Parameters</span>
        <p>${escapeHtml((help.parameters ?? []).join(', ') || 'N/A')}</p>
      </div>
      <div class="cell-inspector-card">
        <span>Strategy</span>
        <p>${escapeHtml(help.strategy)}</p>
        <small>${escapeHtml((help.pairsWellWith ?? []).length ? `Related modes: ${help.pairsWellWith.join(', ')}` : '')}</small>
        <small>${escapeHtml(help.boundaryNote)}</small>
      </div>
      <div class="cell-inspector-card">
        <span>Current Composition</span>
        <small>${escapeHtml(composition.label)}</small>
        <small>${escapeHtml(composition.summary)}</small>
        <small>${escapeHtml(composition.routeNote)}</small>
      </div>
      <button class="console-button secondary" data-action="roi-show-cell-inspector">Show Cell Inspector</button>
    </section>
  `;
}

function behaviorHelpOptionForGroup(groupId, state) {
  return {
    behaviorPreset: state.behaviorPresetId,
    eventLikelihood: state.eventLikelihood,
    spatialPattern: state.spatialPattern,
    valueDistribution: state.valueDistribution,
    temporalPattern: state.temporalPattern,
    spatialEvolution: state.spatialEvolution,
    stateModel: state.stateModel,
    samplingEffect: state.depletionMode,
    displayLayer: state.displayMode
  }[groupId] ?? null;
}

function roiInspectorHtml(inspection) {
  return `
    <section class="cell-inspector-shell" data-roi-cell-inspector>
      <div class="cell-inspector-header">
        <span>Cell Inspector</span>
        <h2>Cell (${escapeHtml(inspection.cell.col)}, ${escapeHtml(inspection.cell.row)})</h2>
        <p>Type: Sample cell | t = ${formatStat(inspection.demoTime)} s</p>
      </div>
      <div class="cell-inspector-card">
        <span>Event Likelihood Field</span>
        ${metricRows([
          ['L(x,y,t)', formatStat(inspection.eventLikelihoodValue)],
          ['likelihood model', inspection.eventLikelihoodLabel],
          ['dynamics', inspection.eventLikelihoodDynamicsLabel],
          ['temporal pattern', inspection.eventLikelihoodTemporalPatternLabel],
          ['spatial evolution', inspection.eventLikelihoodSpatialEvolutionLabel],
          ['event-prone', inspection.eventLikelihoodBand],
          ['nearest node', inspection.nearestLikelihoodNode ? inspection.nearestLikelihoodNode.id : 'none'],
          ['node state', inspection.nearestLikelihoodNode ? inspection.nearestLikelihoodNode.state : 'n/a'],
          ['node cooldown', inspection.nearestLikelihoodNode ? formatStat(inspection.nearestLikelihoodNode.cooldown) : 'n/a'],
          ['node distance', inspection.nearestLikelihoodNode ? formatStat(inspection.nearestLikelihoodNode.distance) : 'n/a'],
          ['role', 'biases event origins, jumps, walks, and propagation']
        ])}
        <small>L(x,y,t) is the event-prone spawn substrate; it is not the realized sample reward.</small>
      </div>
      <div class="cell-inspector-card selected">
        <span>Observed Sample Value</span>
        ${metricRows([
          ['S(x,y,t)', formatStat(inspection.value)],
          ['displayed value', formatStat(inspection.displayedValue)],
          ['normalized', formatStat(inspection.normalizedValue)],
          ['trend', trendLabel(inspection.delta)],
          ['delta / 1s', formatSignedStat(inspection.delta)]
        ])}
        <small>Sample value is the currently realized reward/value after the selected sample-field behavior is composed.</small>
      </div>
      <div class="cell-inspector-card">
        <span>Pattern Composition</span>
        ${metricRows([
          ['field mode', inspection.mode === 'dynamic' ? 'Dynamic' : 'Static'],
          ['event likelihood', inspection.eventLikelihoodLabel],
          ['displayed layer', roiDisplayModeLabel(inspection.displayMode)],
          ['spatial pattern', roiPureSpatialPatternLabel(inspection.spatialPattern)],
          ['value distribution', inspection.valueDistributionLabel],
          ['seeded value', inspection.seededValue],
          ['value band', inspection.valueBand],
          ['cluster count', inspection.clusterCount],
          ['cluster size', roiClusterSizeLabel(inspection.clusterSize)],
          ['pattern parameters', inspection.spatialParameterSummary],
          ['temporal pattern', roiTemporalPatternLabel(inspection.temporalPattern)],
          ['state model', inspection.stateModelLabel],
          ['spatial evolution', roiSpatialEvolutionLabel(inspection.spatialEvolution)],
          ['motion scope', inspection.motionScopeLabel],
          ['feature motion', inspection.behavior?.featureMotion ?? 'n/a'],
          ['burst phase', inspection.behavior?.burstPhase ?? 'n/a'],
          ['dynamic complexity', complexityLabel(inspection.dynamicComplexity)],
          ['cluster membership', inspection.hotspotMembership]
        ])}
        <small>${escapeHtml(inspection.spatialPatternHelp?.meaning ?? '')}</small>
        <small>${escapeHtml(inspection.behavior?.explanation ?? '')}</small>
      </div>
      <div class="cell-inspector-card">
        <span>Sampling Effects</span>
        ${metricRows([
          ['raw base value', formatStat(inspection.rawBase)],
          ['depleted value', formatStat(inspection.depleted)],
          ['sampling effect', roiDepletionModeLabel(inspection.depletionMode)],
          ['last sampled', inspection.lastSampled],
          ['recovery', inspection.recovery],
          ['neighbor influence', inspection.behavior?.neighborInfluence ?? (inspection.sampleFieldConfig?.neighborInfluence?.enabled ? 'enabled' : 'off')]
        ])}
      </div>
    </section>
  `;
}

function metricRows(rows) {
  return `
    <div class="cell-inspector-metrics">
      ${rows.map(([label, value]) => `
        <div>
          <span>${escapeHtml(label)}</span>
          <strong>${escapeHtml(value)}</strong>
        </div>
      `).join('')}
    </div>
  `;
}

function spatialParameterSummary(pattern, { clusterCount, clusterSize, seed, noise }) {
  return {
    constantField: 'base value; distribution controls value variation',
    uniformField: 'base value; distribution controls value variation',
    gradientField: `directional trend, smoothness, noise ${formatStat(noise)}`,
    clusteredField: `${clusterCount} cluster(s), ${roiClusterSizeLabel(clusterSize).toLowerCase()} spread`,
    patchyField: `correlation length, smoothness, contrast, noise ${formatStat(noise)}`,
    sparseTargets: `target count ${clusterCount}, small radius`,
    linearBand: 'orientation, width, position, softness',
    frontBoundary: 'orientation, sharpness, contrast',
    boundaryBand: 'boundary side, width, softness, intensity',
    monitoringStations: `station count ${clusterCount}, revisit recovery`,
    seededTexture: `texture scale, smoothness, seed ${seed}`
  }[pattern] ?? `seed ${seed}`;
}

function trendLabel(delta) {
  const value = Number(delta) || 0;
  if (value > 0.015) return 'rising';
  if (value < -0.015) return 'falling';
  return 'stable';
}

function formatSignedStat(value) {
  const number = Number(value);
  if (!Number.isFinite(number)) return 'N/A';
  return `${number >= 0 ? '+' : ''}${number.toFixed(3)}`;
}

function complexityLabel(value) {
  return {
    low: 'Low',
    medium: 'Medium',
    high: 'High'
  }[value] ?? 'Medium';
}

function recoveryLabel(time) {
  const phase = (Math.sin(Number(time) * 0.11) + 1) / 2;
  if (phase > 0.72) return 'recovering';
  if (phase < 0.28) return 'recently depleted';
  return 'partial';
}

function seededHash(seed) {
  let hash = 2166136261;
  for (const char of String(seed)) {
    hash ^= char.charCodeAt(0);
    hash = Math.imul(hash, 16777619);
  }
  return ((hash >>> 0) % 100000) / 100000;
}

function escapeHtml(value) {
  return String(value ?? '')
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;');
}
