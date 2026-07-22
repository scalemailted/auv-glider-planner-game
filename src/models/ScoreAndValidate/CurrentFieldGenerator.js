const FluidPresets = require('./FluidPresets.js')
const TemporalFrameTimes = require('./TemporalFrameTimes.js')
const SeededRng = require('./SeededRng.js')
const FlowFieldConfig = require('./FlowFieldConfig.js')
const VectorFieldPresets = require('./VectorFieldPresets.js')
const TopologyAwareComposite = require('./TopologyAwareComposite.js')
function generateCurrentFrames(config = {}) {
  const width = clampInt(config.width, 2, 128);
  const height = clampInt(config.height, 2, 128);
  const dt = Math.max(0.1, Number(config.dt ?? 1));
  const duration = Math.max(1, Number(config.duration ?? 24));
  const frameTimes = TemporalFrameTimes.buildTemporalFrameTimes({ duration, dt });
  if (config.importedFlowField?.frames?.length) {
    return frameTimes.map((t) => ({
      t,
      source: 'importedFlowField',
      current: sampleImportedFlowFieldFrame(config.importedFlowField, t, width, height)
    }));
  }
  const frameCount = frameTimes.length;
  const pattern = config.currentPattern ?? config.pattern ?? 'wave';
  if (config.currentGenerator?.type !== 'parametric' && (FluidPresets.isFluidCurrentPattern(pattern) || config.currentGenerator?.type === 'fluid')) {
    return FluidPresets.generateFluidCurrentFrames({ ...config, width, height, dt, duration });
  }
  const frames = frameTimes.map((t, index) => ({
    t,
    current: generateCurrent(width, height, t, {
      ...config,
      frameIndex: index,
      frameCount,
      durationHours: duration,
      dtHours: dt
    })
  }));
  debugTopologyCompositeGeneration({ config, frames, width, height });
  debugCurrentVariationStats({ config, frames });
  return frames;
}

function sampleImportedFlowFieldFrame(flowField, t, width, height) {
  const frames = [...(flowField.frames ?? [])].filter((frame) => Array.isArray(frame.current)).sort((a, b) => Number(a.t) - Number(b.t));
  if (!frames.length) return Array.from({ length: height }, () => Array.from({ length: width }, () => [0, 0]));
  const timeMode = flowField.sampling?.timeMode ?? 'clamped';
  const interpolation = flowField.sampling?.interpolation ?? 'linear';
  const first = frames[0];
  const last = frames.at(-1);
  let time = Number(t) || 0;
  let clamped = false;
  let interpolationAlpha = 0;
  if (timeMode === 'looping' && frames.length > 1) {
    const span = Math.max(1e-6, Number(last.t) - Number(first.t));
    time = Number(first.t) + positiveModulo(time - Number(first.t), span);
  }
  if (time <= Number(first.t) || frames.length === 1) {
    clamped = timeMode !== 'looping' && Number(t) <= Number(first.t);
    debugCurrentTime({
      missionTime: Number(t) || 0,
      evolutionSpeed: 1,
      timeMode,
      cycleDuration: Number(last.t) - Number(first.t),
      effectiveTime: time,
      normalizedByTime: 0,
      frameIndex: 0,
      interpolationAlpha,
      clamped,
      source: 'importedFlowField'
    });
    return cloneCurrentGrid(first.current, width, height);
  }
  if (time >= Number(last.t)) {
    clamped = timeMode !== 'looping';
    debugCurrentTime({
      missionTime: Number(t) || 0,
      evolutionSpeed: 1,
      timeMode,
      cycleDuration: Number(last.t) - Number(first.t),
      effectiveTime: time,
      normalizedByTime: 1,
      frameIndex: frames.length - 1,
      interpolationAlpha,
      clamped,
      source: 'importedFlowField'
    });
    return cloneCurrentGrid(last.current, width, height);
  }
  const upperIndex = frames.findIndex((frame) => Number(frame.t) >= time);
  const upper = frames[Math.max(1, upperIndex)];
  const lower = frames[Math.max(0, upperIndex - 1)];
  if (interpolation === 'nearest') {
    interpolationAlpha = Math.abs(time - Number(lower.t)) <= Math.abs(Number(upper.t) - time) ? 0 : 1;
    debugCurrentTime({
      missionTime: Number(t) || 0,
      evolutionSpeed: 1,
      timeMode,
      cycleDuration: Number(last.t) - Number(first.t),
      effectiveTime: time,
      normalizedByTime: clamp((time - Number(first.t)) / Math.max(1e-6, Number(last.t) - Number(first.t)), 0, 1),
      frameIndex: interpolationAlpha === 0 ? Math.max(0, upperIndex - 1) : Math.max(1, upperIndex),
      interpolationAlpha,
      clamped,
      source: 'importedFlowField'
    });
    return cloneCurrentGrid(Math.abs(time - Number(lower.t)) <= Math.abs(Number(upper.t) - time) ? lower.current : upper.current, width, height);
  }
  const ratio = clamp((time - Number(lower.t)) / Math.max(1e-6, Number(upper.t) - Number(lower.t)), 0, 1);
  interpolationAlpha = ratio;
  debugCurrentTime({
    missionTime: Number(t) || 0,
    evolutionSpeed: 1,
    timeMode,
    cycleDuration: Number(last.t) - Number(first.t),
    effectiveTime: time,
    normalizedByTime: clamp((time - Number(first.t)) / Math.max(1e-6, Number(last.t) - Number(first.t)), 0, 1),
    frameIndex: Math.max(0, upperIndex - 1),
    interpolationAlpha,
    clamped,
    source: 'importedFlowField'
  });
  return Array.from({ length: height }, (_, y) => Array.from({ length: width }, (_, x) => {
    const a = lower.current?.[y]?.[x] ?? [0, 0];
    const b = upper.current?.[y]?.[x] ?? a;
    return [
      round(Number(a[0] ?? 0) + (Number(b[0] ?? 0) - Number(a[0] ?? 0)) * ratio),
      round(Number(a[1] ?? 0) + (Number(b[1] ?? 0) - Number(a[1] ?? 0)) * ratio)
    ];
  }));
}

function cloneCurrentGrid(current, width, height) {
  return Array.from({ length: height }, (_, y) => Array.from({ length: width }, (_, x) => {
    const vector = current?.[y]?.[x] ?? [0, 0];
    return [round(Number(vector[0] ?? 0)), round(Number(vector[1] ?? 0))];
  }));
}

 function generateCurrent(width, height, t, config = {}) {
  const currentFieldConfig = config.currentFieldConfig ? FlowFieldConfig.normalizeCurrentFieldConfig(config.currentFieldConfig, {
    currentPreset: config.currentPreset ?? config.vectorPreset,
    currentStrength: config.currentStrength
  }) : null;
  const pattern = currentFieldConfig
    ? VectorFieldPresets.getVectorPresetConfig(currentFieldConfig.basePreset).currentPattern
    : config.currentPattern ?? config.pattern ?? 'wave';
  const strength = Number(config.currentStrength ?? config.strength ?? 1);
  const variability = currentFieldConfig ? FlowFieldConfig.currentFieldVariationToNumber(currentFieldConfig) : currentVariability(config);
  const seedKey = currentSeedKey({ ...config, pattern, strength, variability }, width, height);
  const eddies = config.eddies ?? defaultEddies(width, height, seedKey);
  const terrain = config.terrain ?? [];
  const time = makeTimeContext(t, { ...config, pattern, strength, variability, seedKey, currentFieldConfig });

  return Array.from({ length: height }, (_, y) => Array.from({ length: width }, (_, x) => {
    if (terrain[y]?.[x]) return [0, 0];
    return sampleGeneratedCurrent({ x, y, width, height, time: t, timeContext: time, config: { ...config, pattern, strength, variability, eddies, terrain } });
  }));
}

 function sampleGeneratedCurrent({ x = 0, y = 0, width = 1, height = 1, time = 0, timeContext = null, config = {} } = {}) {
  if (config.currentFieldConfig) {
    return sampleComposedGeneratedCurrent({ x, y, width, height, time, timeContext, config });
  }
  const pattern = config.currentPattern ?? config.pattern ?? config.currentGenerator?.currentPattern ?? 'wave';
  const strength = Number(config.currentStrength ?? config.strength ?? config.currentGenerator?.strength ?? 1);
  const variability = currentVariability(config);
  const seedKey = currentSeedKey({ ...config, pattern, strength, variability }, width, height);
  const eddies = config.eddies ?? defaultEddies(width, height, seedKey);
  const terrain = config.terrain ?? [];
  const cx = clamp(Number(x), 0, Math.max(0, Number(width) - 1));
  const cy = clamp(Number(y), 0, Math.max(0, Number(height) - 1));
  if (terrain[Math.round(cy)]?.[Math.round(cx)]) return [0, 0];
  const vector = currentAt(
    pattern,
    cx,
    cy,
    Math.max(1, Number(width) || 1),
    Math.max(1, Number(height) || 1),
    timeContext ?? makeTimeContext(time, { ...config, pattern, strength, variability, seedKey }),
    strength,
    variability,
    eddies,
    terrain,
    config.topologyComposite ?? config.currentFieldConfig?.topologyComposite
  );
  return [round(vector[0]), round(vector[1])];
}

function sampleComposedGeneratedCurrent({ x = 0, y = 0, width = 1, height = 1, time = 0, timeContext = null, config = {} } = {}) {
  const fieldConfig = FlowFieldConfig.normalizeCurrentFieldConfig(config.currentFieldConfig, {
    currentPreset: config.currentPreset ?? config.vectorPreset,
    currentStrength: config.currentStrength
  });
  const basePreset = VectorFieldPresets.getVectorPresetConfig(fieldConfig.basePreset, {
    currentStrength: fieldConfig.strength,
    currentVariability: FlowFieldConfig.currentFieldVariationToNumber(fieldConfig),
    temporalEvolution: fieldConfig.fieldMode !== 'static',
    seed: config.seed
  });
  const baseTime = timeContextForFlowConfig(time, timeContext, {
    ...config,
    currentFieldConfig: null,
    currentGenerator: basePreset,
    currentPattern: basePreset.currentPattern,
    pattern: basePreset.currentPattern,
    currentStrength: basePreset.strength,
    strength: basePreset.strength,
    currentVariability: fieldConfig.fieldMode === 'static' ? 0 : FlowFieldConfig.currentFieldVariationToNumber(fieldConfig),
    variability: fieldConfig.fieldMode === 'static' ? 0 : FlowFieldConfig.currentFieldVariationToNumber(fieldConfig),
    temporalEvolution: fieldConfig.fieldMode !== 'static',
    topologyComposite: fieldConfig.topologyComposite
  }, fieldConfig, fieldConfig.basePreset, width, height);
  const base = sampleGeneratedCurrent({
    x,
    y,
    width,
    height,
    time,
    timeContext: baseTime,
    config: {
      ...config,
      currentFieldConfig: null,
      currentGenerator: basePreset,
      currentPattern: basePreset.currentPattern,
      pattern: basePreset.currentPattern,
      currentStrength: basePreset.strength,
      strength: basePreset.strength,
      currentVariability: fieldConfig.fieldMode === 'static' ? 0 : FlowFieldConfig.currentFieldVariationToNumber(fieldConfig),
      variability: fieldConfig.fieldMode === 'static' ? 0 : FlowFieldConfig.currentFieldVariationToNumber(fieldConfig),
      temporalEvolution: fieldConfig.fieldMode !== 'static',
      topologyComposite: fieldConfig.topologyComposite
    }
  });
  const combined = fieldConfig.layers
    .filter((layer) => layer.enabled && layer.weight > 0)
    .reduce((sum, layer) => {
      const influence = layerInfluenceAt(layer, x, y, width, height);
      if (influence <= 0) return sum;
      const layerPreset = VectorFieldPresets.getVectorPresetConfig(layer.preset, {
        currentStrength: fieldConfig.strength,
        currentVariability: FlowFieldConfig.variationLevelToNumber(layer.directionVariation) || FlowFieldConfig.variationLevelToNumber(layer.magnitudeVariation),
        temporalEvolution: fieldConfig.fieldMode !== 'static',
        seed: `${config.seed ?? 'anchor-current'}:${layer.id}`
      });
      const layerConfig = {
        ...config,
        currentFieldConfig: null,
        currentGenerator: layerPreset,
        currentPattern: layerPreset.currentPattern,
        pattern: layerPreset.currentPattern,
        currentStrength: layerPreset.strength,
        strength: layerPreset.strength,
        currentVariability: fieldConfig.fieldMode === 'static' ? 0 : Math.max(FlowFieldConfig.variationLevelToNumber(layer.directionVariation), FlowFieldConfig.variationLevelToNumber(layer.magnitudeVariation)),
        variability: fieldConfig.fieldMode === 'static' ? 0 : Math.max(FlowFieldConfig.variationLevelToNumber(layer.directionVariation), FlowFieldConfig.variationLevelToNumber(layer.magnitudeVariation)),
        temporalEvolution: fieldConfig.fieldMode !== 'static',
        seed: `${config.seed ?? 'anchor-current'}:${layer.id}:${layer.preset}`
      };
      const layerSample = sampleGeneratedCurrent({
        x,
        y,
        width,
        height,
        time,
        timeContext: timeContextForFlowConfig(time, timeContext, layerConfig, layer, layer.preset, width, height),
        config: layerConfig
      });
      return [
        sum[0] + layerSample[0] * layer.weight * influence,
        sum[1] + layerSample[1] * layer.weight * influence
      ];
    }, base);
  return [round(combined[0]), round(combined[1])];
}

function timeContextForFlowConfig(t, timeContext, sampleConfig, flowConfig, preset, width, height) {
  if (flowConfig.fieldMode === 'static') {
    return makeTimeContext(0, { ...sampleConfig, frameIndex: 0, frameCount: 1, durationHours: 1, timeMode: 'clamped', width, height });
  }
  const behavior = flowConfig.evolutionBehavior ?? 'continuous';
  const speed = Math.max(0, Number(flowConfig.evolutionSpeed ?? 1));
  const rawTime = Number(t) * speed;
  const cycle = Math.max(1, Number(flowConfig.cycleDurationHours ?? 24));
  const timeMode = flowConfig.timeMode
    ?? (behavior === 'looping' ? 'looping' : behavior === 'pulse' ? 'clamped' : 'continuous');
  const frameCount = Math.max(2, Number(sampleConfig.frameCount ?? timeContext?.frameCount ?? 2));
  const durationHours = Math.max(1, Number(sampleConfig.durationHours ?? sampleConfig.duration ?? timeContext?.duration ?? cycle));
  const phaseTime = timeMode === 'looping' || behavior === 'pulse' ? cycle : durationHours;
  const nextTime = timeMode === 'looping'
    ? positiveModulo(rawTime, cycle)
    : timeMode === 'clamped' || timeMode === 'frames'
      ? clamp(rawTime, 0, phaseTime)
      : rawTime;
  const phase = timeMode === 'continuous'
    ? nextTime / Math.max(1, phaseTime)
    : timeMode === 'looping'
      ? positiveModulo(nextTime, phaseTime) / Math.max(1, phaseTime)
      : clamp(nextTime / Math.max(1, phaseTime), 0, 1);
  const frameIndex = clampInt(Math.round(phase * (frameCount - 1)), 0, frameCount - 1);
  return makeTimeContext(nextTime, {
    ...sampleConfig,
    frameIndex,
    frameCount,
    durationHours: phaseTime,
    timeMode,
    interpolation: flowConfig.frameInterpolation ?? sampleConfig.frameInterpolation ?? 'linear',
    width,
    height,
    seed: `${sampleConfig.seed ?? 'anchor-current'}:${preset}:${behavior}`,
    debugTime: {
      missionTime: Number(t) || 0,
      evolutionSpeed: speed,
      cycleDuration: cycle,
      effectiveTime: nextTime,
      clamped: (timeMode === 'clamped' || timeMode === 'frames') && rawTime !== nextTime,
      source: 'generatedFlowField',
      preset
    }
  });
}

function layerInfluenceAt(layer, x, y, width, height) {
  if (layer.influence === 'spatialPocket') {
    const pocket = layer.pocket ?? {};
    const px = Number(pocket.x ?? 0.5) * Math.max(1, width - 1);
    const py = Number(pocket.y ?? 0.5) * Math.max(1, height - 1);
    const radius = Math.max(0.5, Number(pocket.radius ?? 0.28) * Math.max(width, height));
    const softness = Math.max(0.01, Number(pocket.softness ?? 0.12));
    const dist = Math.hypot(Number(x) - px, Number(y) - py);
    return clamp(1 - (dist - radius * (1 - softness)) / Math.max(0.01, radius * softness), 0, 1);
  }
  if (layer.influence === 'partitionedRegion') {
    const partition = layer.partition ?? {};
    const vertical = partition.type !== 'horizontal';
    const axis = vertical ? Number(x) / Math.max(1, width - 1) : Number(y) / Math.max(1, height - 1);
    const side = partition.side ?? (vertical ? 'left' : 'bottom');
    const softness = Math.max(0.01, Number(partition.softness ?? 0.08));
    const signed = side === 'right' || side === 'bottom' ? axis - 0.5 : 0.5 - axis;
    return clamp(0.5 + signed / softness, 0, 1);
  }
  return 1;
}

function currentAt(pattern, x, y, width, height, time, strength, variability, eddies, terrain, topologyComposite = null) {
  const { cycle, slowCycle, pulseCycle, seedDirection, jetPhase, noisePhase, stormPhase, stormCenterX, stormCenterY } = time;
  const tau = cycle;
  const temporal = variability > 0 ? 1 : 0;
  if (pattern === 'none' || pattern === 'calm') {
    return [
      strength * (0.025 * Math.cos(seedDirection) + 0.04 * temporal * Math.sin(slowCycle + y * 0.35)),
      strength * (0.025 * Math.sin(seedDirection) + 0.03 * temporal * Math.cos(slowCycle * 1.1 + x * 0.28))
    ];
  }
  if (pattern === 'uniform' || pattern === 'uniformDrift') {
    const direction = seedDirection + 0.28 * temporal * Math.sin(slowCycle);
    const magnitude = 0.3 + time.speedJitter * 0.16 + 0.12 * temporal * Math.sin(cycle * 0.7);
    return [
      Math.cos(direction) * magnitude * strength,
      Math.sin(direction) * magnitude * strength + 0.08 * temporal * Math.cos(cycle * 0.55) * strength
    ];
  }
  if (pattern === 'corridor') {
    const center = height * (0.5 + 0.08 * Math.sin(jetPhase) + 0.18 * temporal * Math.sin(slowCycle));
    const bend = Math.sin((x / Math.max(1, width - 1)) * Math.PI * 2 + cycle + jetPhase) * height * (0.04 + 0.06 * temporal);
    const band = Math.exp(-((y - center - bend) ** 2) / Math.max(1, height * 0.7));
    const pulse = 0.78 + 0.38 * temporal * Math.sin(pulseCycle);
    return [
      0.42 * strength * band * pulse * Math.cos(0.35 * Math.sin(slowCycle)),
      (0.12 * temporal * Math.sin(cycle + x * 0.18) + 0.1 * Math.cos((x / width) * Math.PI + cycle * 0.5)) * strength * band
    ];
  }
  if (pattern === 'meanderingJet') {
    const nx = x / Math.max(1, width - 1);
    const center = height * (0.5 + 0.2 * Math.sin(nx * Math.PI * 2.2 + cycle * 0.8 + jetPhase));
    const distance = y - center;
    const jet = Math.exp(-(distance ** 2) / Math.max(1, (height * 0.12) ** 2));
    const cross = 0.18 * temporal * Math.cos(nx * Math.PI * 2.2 + cycle * 0.8 + jetPhase);
    return [
      strength * (0.62 * jet + 0.08 * Math.sin(cycle + y * 0.25)),
      strength * cross * jet
    ];
  }
  if (pattern === 'shearFlow') {
    const ny = y / Math.max(1, height - 1);
    const shear = (ny - 0.5) * 2;
    const band = 0.5 + 0.5 * Math.sin(ny * Math.PI * 4 + cycle * 0.65 + jetPhase);
    const reversal = Math.cos(slowCycle * 0.8);
    const magnitudeProfile = 0.18 + 0.48 * ny + 0.18 * band;
    return [
      strength * magnitudeProfile * Math.sign(shear || 1) * (0.72 + 0.28 * reversal),
      strength * (0.04 + 0.18 * band) * temporal * Math.sin((x / width) * Math.PI * 2 + cycle)
    ];
  }
  if (pattern === 'doubleGyre') {
    const boundary = 0.5 + 0.05 * Math.sin(jetPhase) + 0.08 * temporal * Math.sin(slowCycle);
    const left = vortex(x, y, width * (boundary - 0.22 + 0.04 * Math.sin(cycle + jetPhase)), height * (0.5 + 0.06 * Math.cos(cycle + jetPhase)), strength * (1 + 0.25 * Math.sin(pulseCycle)));
    const right = vortex(x, y, width * (boundary + 0.22 + 0.04 * Math.cos(cycle + jetPhase)), height * (0.5 + 0.06 * Math.sin(cycle + jetPhase)), -strength * (1 + 0.25 * Math.cos(pulseCycle)));
    const meander = 0.12 * temporal * Math.sin((x / width) * Math.PI * 2 + cycle + jetPhase);
    return [left[0] + right[0] + meander, left[1] + right[1]];
  }
  if (pattern === 'tidalOscillation') {
    const phase = Math.sin(cycle + time.tidePhase);
    const cross = Math.cos(cycle + time.tidePhase) * 0.18;
    return [
      strength * phase * (0.42 + 0.08 * Math.sin(y * 0.4)),
      strength * cross * Math.cos((x / width) * Math.PI)
    ];
  }
  if (pattern === 'stormPulse') {
    const pulse = Math.max(0, Math.sin(pulseCycle + stormPhase));
    const stormX = width * (0.28 + stormCenterX * 0.44) + Math.sin(slowCycle + stormPhase) * width * 0.12;
    const stormY = height * (0.28 + stormCenterY * 0.44) + Math.cos(slowCycle * 0.8 + stormPhase) * height * 0.12;
    const radius = Math.max(1, Math.min(width, height) * (0.18 + 0.08 * pulse));
    const local = Math.exp(-(((x - stormX) ** 2 + (y - stormY) ** 2) / (2 * radius ** 2)));
    const pulseStrength = 0.08 + (0.38 + variability * 1.0) * pulse * local;
    const angle = Math.atan2(y - stormY, x - stormX) + Math.PI * 0.45 + 0.4 * Math.sin(cycle);
    return [
      strength * pulseStrength * Math.cos(angle),
      strength * pulseStrength * Math.sin(angle)
    ];
  }
  if (pattern === 'westernBoundaryCurrent') {
    const nx = x / Math.max(1, width - 1);
    const boundary = Math.exp(-((nx - 0.14) ** 2) / 0.018);
    const phase = Math.sin(cycle + y * 0.18 + jetPhase);
    const eddy = vortex(
      x,
      y,
      width * (0.28 + stormCenterX * 0.16 + 0.08 * Math.sin(slowCycle)),
      height * (0.45 + stormCenterY * 0.24 + 0.16 * Math.cos(cycle * 0.7)),
      -strength * (0.45 + variability * 0.35)
    );
    return [
      strength * (0.12 * phase + eddy[0] * 0.65),
      strength * (-0.68 * boundary * (0.78 + 0.22 * Math.sin(pulseCycle)) + eddy[1] * 0.65)
    ];
  }
  if (pattern === 'islandWake') {
    const island = terrainIslandCenter(terrain, width, height);
    const islandX = island.x;
    const islandY = island.y;
    const upstreamAngle = seedDirection * 0.28 + 0.62 * temporal * Math.sin(slowCycle);
    const relX = Math.cos(upstreamAngle) * (x - islandX) + Math.sin(upstreamAngle) * (y - islandY);
    const relY = -Math.sin(upstreamAngle) * (x - islandX) + Math.cos(upstreamAngle) * (y - islandY);
    const downstream = relX > 0 ? 1 : 0.28;
    const wake = Math.exp(-Math.abs(relY) / Math.max(1, height * 0.2)) * downstream * (0.65 + 0.55 * Math.sin(pulseCycle));
    const swirl = vortex(x, y, islandX, islandY, strength * (0.55 + variability * 0.45) * (0.65 + 0.45 * Math.cos(cycle)));
    return [
      strength * (0.38 * wake * Math.cos(upstreamAngle) + 0.14 * temporal * Math.sin(cycle)) + swirl[0] * 0.62,
      strength * (0.38 * wake * Math.sin(upstreamAngle)) + swirl[1] * 0.62 + strength * 0.14 * temporal * Math.sin(cycle + x * 0.25)
    ];
  }
  if (pattern === 'gulfInspired') {
    const loop = vortex(x, y, width * (0.58 + 0.12 * Math.sin(slowCycle + jetPhase)), height * (0.45 + 0.12 * Math.cos(slowCycle * 0.9 + jetPhase)), strength * (1 + 0.25 * Math.sin(pulseCycle)));
    const eddy = vortex(x, y, width * (0.28 + stormCenterX * 0.16 + 0.1 * Math.cos(cycle * 0.8 + jetPhase)), height * (0.58 + stormCenterY * 0.2 + 0.1 * Math.sin(cycle + jetPhase)), -strength * (0.75 + 0.25 * Math.cos(pulseCycle)));
    const band = Math.sin((y / Math.max(1, height)) * Math.PI);
    return [
      loop[0] + eddy[0] + strength * (0.22 * band + 0.16 * temporal * Math.sin((y / height) * Math.PI * 2 + cycle)),
      loop[1] + eddy[1] + strength * (0.18 * Math.cos((x / width) * Math.PI * 1.5 - cycle * 0.8))
    ];
  }
  if (pattern === 'hycomInspiredComposite') {
    const jet = currentAt('meanderingJet', x, y, width, height, time, strength * 0.85, variability, eddies, terrain);
    const gyre = currentAt('doubleGyre', x, y, width, height, time, strength * 0.42, variability, eddies, terrain);
    const boundary = currentAt('westernBoundaryCurrent', x, y, width, height, time, strength * 0.34, variability, eddies, terrain);
    const tide = currentAt('tidalOscillation', x, y, width, height, time, strength * 0.24, variability, eddies, terrain);
    const texture = currentAt('curlNoise', x, y, width, height, time, strength * 0.18, variability, eddies, terrain);
    return [
      jet[0] + gyre[0] + boundary[0] + tide[0] + texture[0],
      jet[1] + gyre[1] + boundary[1] + tide[1] + texture[1]
    ];
  }
  if (pattern === 'topologyAwareComposite') {
    return topologyAwareCompositeAt(x, y, width, height, time, strength, variability, eddies, terrain, topologyComposite);
  }
  if (pattern === 'curlNoise') {
    const s1 = Math.sin(x * 0.72 + y * 0.31 + cycle + noisePhase);
    const s2 = Math.sin(x * 0.27 - y * 0.64 - slowCycle * 0.9 + noisePhase * 0.7);
    const c1 = Math.cos(x * 0.72 + y * 0.31 + cycle + noisePhase);
    const c2 = Math.cos(x * 0.27 - y * 0.64 - slowCycle * 0.9 + noisePhase * 0.7);
    return [
      strength * (0.18 * c1 * 0.31 - 0.22 * c2 * 0.64 + 0.08 * Math.sin(pulseCycle + y * 0.2)),
      strength * (-0.18 * c1 * 0.72 - 0.22 * c2 * 0.27 + 0.08 * Math.cos(pulseCycle + x * 0.2))
    ];
  }
  if (pattern === 'chaotic') {
    return [
      strength * (0.32 * Math.sin(x * 0.7 + y * 0.25 + cycle * 1.2 + noisePhase) + 0.22 * Math.cos(y * 0.5 - slowCycle + jetPhase)),
      strength * (0.32 * Math.cos(y * 0.65 - x * 0.2 + cycle + noisePhase) + 0.2 * Math.sin(x * 0.4 + pulseCycle + stormPhase))
    ];
  }
  if (pattern === 'vortex') {
    return vortex(
      x,
      y,
      width * (0.5 + 0.1 * Math.sin(jetPhase) + 0.16 * temporal * Math.sin(cycle)),
      height * (0.5 + 0.1 * Math.cos(jetPhase) + 0.16 * temporal * Math.cos(cycle)),
      strength * (0.85 + 0.3 * temporal * Math.sin(pulseCycle))
    );
  }
  if (pattern === 'eddies') {
    return eddies.reduce((sum, eddy, index) => {
      const driftPhase = cycle + index * 1.7 + jetPhase;
      const ex = eddy.x + Math.sin(driftPhase) * width * 0.16 * temporal;
      const ey = eddy.y + Math.cos(driftPhase * 0.85) * height * 0.14 * temporal;
      const eddyStrength = strength * eddy.strength * (0.65 + 0.45 * temporal * (0.5 + 0.5 * Math.sin(pulseCycle + index)));
      const [u, v] = vortex(x, y, ex, ey, eddyStrength);
      return [sum[0] + u, sum[1] + v];
    }, [0, 0]);
  }

  const u = Math.sin((y / height) * Math.PI * 2 + cycle) * 0.35 * strength;
  const v = Math.cos((x / width) * Math.PI * 2 - cycle) * 0.35 * strength;
  return [u, v];
}

function topologyAwareCompositeAt(x, y, width, height, time, strength, variability, eddies, terrain, topologyComposite = null) {
  const classification = TopologyAwareComposite.classifyTopologyRegionAtCell({ terrain, x, y, width, height });
  const regions = Array.isArray(topologyComposite?.regions) ? topologyComposite.regions : [];
  const profile = topologyCompositeProfile(topologyComposite?.dynamicComplexity ?? topologyComposite?.randomness ?? variability);
  const shoreInfluence = Number.isFinite(classification.shoreDistance) ? clamp((3.2 - classification.shoreDistance) / 3.2, 0, 1) : 0;
  const regionList = [
    [regionsFor(regions, 'openWater', [defaultRegion('openWater', 'movingMeanderingJet', 0.62)]), clamp(classification.openness * 0.9 + 0.1, 0, 1)],
    [regionsFor(regions, 'shoreline', [defaultRegion('shoreline', 'variableAlongShoreFlow', 0.46)]), shoreInfluence],
    [regionsFor(regions, 'channel', [defaultRegion('channel', 'reversingChannelJet', 0.58)]), classification.channelScore],
    [regionsFor(regions, 'bayPocket', [defaultRegion('bayPocket', 'bayRecirculation', 0.36)]), classification.bayScore],
    [regionsFor(regions, 'islandAdjacent', [defaultRegion('islandAdjacent', 'eddyPairWake', 0.42)]), classification.islandAdjacency]
  ];
  const vector = regionList.reduce((sum, [regionSet, influence]) => {
    if (!Array.isArray(regionSet) || influence <= 0) return sum;
    return regionSet.reduce((inner, region) => {
      if (!region) return inner;
      const sample = regionVector(region, x, y, width, height, time, strength, variability, eddies, terrain, profile, classification);
      const temporalScale = regionTemporalScale(region, time, profile);
      const scale = influence * Number(region.weight ?? 0.5) * Number(region.magnitudeScale ?? 1) * temporalScale;
      return [inner[0] + sample[0] * scale, inner[1] + sample[1] * scale];
    }, sum);
  }, [0, 0]);
  const background = topologyBackgroundVector(x, y, width, height, time, strength, variability, eddies, terrain, profile);
  const combined = [
    (vector[0] + background[0]) * regionalMagnitudeEnvelope(classification, x, y, time, profile),
    (vector[1] + background[1]) * regionalMagnitudeEnvelope(classification, x, y, time, profile)
  ];
  const dynamic = applyTopologyDynamicVariation(combined, x, y, width, height, time, profile);
  const magnitude = Math.hypot(dynamic[0], dynamic[1]);
  const maxMagnitude = profile.maxMagnitude * Math.max(0.2, strength);
  const scale = magnitude > maxMagnitude ? maxMagnitude / magnitude : 1;
  return [dynamic[0] * scale, dynamic[1] * scale];
}

function regionVector(region, x, y, width, height, time, strength, variability, eddies, terrain, profile = topologyCompositeProfile(), classification = null) {
  const behavior = region.behavior ?? 'uniformDrift';
  const adjustedTime = {
    ...time,
    cycle: time.cycle * Number(region.speedScale ?? 1) + Number(region.phase ?? 0),
    slowCycle: time.slowCycle * Number(region.speedScale ?? 1) + Number(region.phase ?? 0) * 0.5,
    pulseCycle: time.pulseCycle * Number(region.speedScale ?? 1) + Number(region.phase ?? 0)
  };
  const sampleX = x + Math.sin(adjustedTime.slowCycle * 0.47 + Number(region.phase ?? 0)) * Number(region.driftRadius ?? 0) * width;
  const sampleY = y + Math.cos(adjustedTime.slowCycle * 0.39 + Number(region.phase ?? 0)) * Number(region.driftRadius ?? 0) * height;
  if (behavior === 'alongShoreFlow' || behavior === 'variableAlongShoreFlow') return alongShoreFlow(x, y, width, height, adjustedTime, strength, terrain, profile, behavior === 'variableAlongShoreFlow');
  if (behavior === 'shorelinePulse') return shorelinePulseFlow(x, y, width, height, adjustedTime, strength, terrain, profile);
  if (behavior === 'channelJet' || behavior === 'reversingChannelJet') return channelJet(x, y, width, height, adjustedTime, strength, terrain, profile, behavior === 'reversingChannelJet');
  if (behavior === 'movingMeanderingJet') return movingMeanderingJet(sampleX, sampleY, width, height, adjustedTime, strength, variability, region, profile);
  if (behavior === 'movingGyre') return movingGyrePair(sampleX, sampleY, width, height, adjustedTime, strength, region, profile);
  if (behavior === 'rotatingDrift') return rotatingDrift(x, y, width, height, adjustedTime, strength, profile);
  if (behavior === 'advectedCurlTexture' || behavior === 'turbulentWakeTexture') return advectedCurlTexture(sampleX, sampleY, width, height, adjustedTime, strength, variability, region, profile, behavior === 'turbulentWakeTexture');
  if (behavior === 'bayRecirculation') return bayRecirculation(x, y, width, height, adjustedTime, strength, terrain, profile, classification);
  if (behavior === 'flushingPulse') return flushingPulse(x, y, width, height, adjustedTime, strength, terrain, profile);
  if (behavior === 'eddyPairWake') return eddyPairWake(x, y, width, height, adjustedTime, strength, terrain, profile);
  const pattern = behavior === 'eddyField' ? 'eddies' : behavior;
  return currentAt(pattern, x, y, width, height, adjustedTime, strength, variability, eddies, terrain);
}

function topologyBackgroundVector(x, y, width, height, time, strength, variability, eddies, terrain, profile) {
  const drift = rotatingDrift(x, y, width, height, time, strength * (0.24 + profile.directionScale * 0.08), profile);
  const curl = currentAt('curlNoise', x, y, width, height, time, strength * profile.textureScale * 0.18, variability, eddies, terrain);
  const tide = currentAt('tidalOscillation', x, y, width, height, time, strength * (0.12 + profile.magnitudeScale * 0.1), variability, eddies, terrain);
  const pulse = profile.pulseScale > 0.65
    ? currentAt('stormPulse', x, y, width, height, time, strength * 0.12 * profile.pulseScale, variability, eddies, terrain)
    : [0, 0];
  return [drift[0] + curl[0] + tide[0] + pulse[0], drift[1] + curl[1] + tide[1] + pulse[1]];
}

function alongShoreFlow(x, y, width, height, time, strength, terrain, profile = topologyCompositeProfile(), variable = false) {
  const classification = TopologyAwareComposite.classifyTopologyRegionAtCell({ terrain, x, y, width, height });
  const landVector = nearestLandVector(terrain, x, y, width, height);
  const tangent = landVector ? { x: -landVector.y, y: landVector.x } : { x: 1, y: 0 };
  const sign = Math.sin(time.slowCycle * (variable ? 0.9 : 0.45) + x * 0.19 + y * 0.13) >= 0 ? 1 : -1;
  const shoreScale = Number.isFinite(classification.shoreDistance) ? clamp((3.5 - classification.shoreDistance) / 3.5, 0.15, 1) : 0.15;
  const pulse = variable ? 1 + profile.shorelineScale * 0.34 * Math.sin(time.pulseCycle + x * 0.2) : 1;
  const offshore = variable && landVector ? Math.sin(time.cycle * 0.7 + y * 0.23) * 0.06 * profile.shorelineScale * shoreScale * strength : 0;
  const magnitude = strength * shoreScale * (0.26 + profile.shorelineScale * 0.15 * Math.sin(time.cycle + x * 0.2)) * pulse;
  return [
    tangent.x * sign * magnitude - (landVector?.x ?? 0) * offshore,
    tangent.y * sign * magnitude - (landVector?.y ?? 0) * offshore
  ];
}

function shorelinePulseFlow(x, y, width, height, time, strength, terrain, profile) {
  const base = alongShoreFlow(x, y, width, height, time, strength, terrain, profile, true);
  const landVector = nearestLandVector(terrain, x, y, width, height);
  const pulse = Math.max(0, Math.sin(time.pulseCycle + x * 0.31 + y * 0.19));
  const normal = landVector
    ? [-(landVector.x ?? 0) * pulse * strength * 0.16 * profile.pulseScale, -(landVector.y ?? 0) * pulse * strength * 0.16 * profile.pulseScale]
    : [0, 0];
  return [base[0] + normal[0], base[1] + normal[1]];
}

function channelJet(x, y, width, height, time, strength, terrain, profile = topologyCompositeProfile(), reversing = false) {
  const cx = Math.round(x);
  const cy = Math.round(y);
  const eastWestLand = Boolean(terrain?.[cy]?.[cx - 1] || terrain?.[cy]?.[cx + 1]);
  const northSouthLand = Boolean(terrain?.[cy - 1]?.[cx] || terrain?.[cy + 1]?.[cx]);
  const axis = eastWestLand && !northSouthLand ? { x: 0, y: 1 } : { x: 1, y: 0 };
  const reverse = reversing ? Math.sign(Math.sin(time.slowCycle * 0.85 + Number(x) * 0.09) || 1) : 1;
  const pulse = 0.72 + profile.magnitudeScale * 0.36 * Math.sin(time.cycle + x * 0.17 + y * 0.11);
  const cross = Math.cos(time.pulseCycle * 0.6 + y * 0.13) * strength * 0.08 * profile.directionScale;
  return [
    axis.x * reverse * strength * pulse * 0.7 + (axis.y ? cross : 0),
    axis.y * reverse * strength * pulse * 0.7 + (axis.x ? cross : 0)
  ];
}

function movingMeanderingJet(x, y, width, height, time, strength, variability, region, profile) {
  const nx = x / Math.max(1, width - 1);
  const meander = Number(region.meanderAmplitude ?? 0.16) * profile.directionScale;
  const center = height * (0.5 + meander * Math.sin(nx * Math.PI * (2.4 + profile.directionScale) + time.cycle * 0.75 + Number(region.phase ?? 0)));
  const distance = y - center;
  const widthScale = Math.max(1, (height * (0.1 + 0.035 * profile.magnitudeScale)) ** 2);
  const jet = Math.exp(-(distance ** 2) / widthScale);
  const pulse = 0.8 + 0.36 * profile.magnitudeScale * Math.sin(time.pulseCycle + nx * Math.PI);
  const cross = 0.16 * profile.directionScale * Math.cos(nx * Math.PI * 2.4 + time.cycle + Number(region.phase ?? 0));
  return [
    strength * jet * pulse * (0.58 + variability * 0.2),
    strength * jet * cross
  ];
}

function movingGyrePair(x, y, width, height, time, strength, region, profile) {
  const phase = Number(region.phase ?? 0);
  const drift = Number(region.driftRadius ?? 0.08);
  const c1x = width * (0.36 + drift * Math.cos(time.slowCycle * 0.7 + phase));
  const c1y = height * (0.44 + drift * Math.sin(time.slowCycle * 0.53 + phase));
  const c2x = width * (0.66 + drift * Math.sin(time.slowCycle * 0.49 + phase));
  const c2y = height * (0.58 + drift * Math.cos(time.slowCycle * 0.61 + phase));
  const strengthScale = strength * profile.wakeScale * (0.7 + 0.32 * Math.sin(time.pulseCycle + phase));
  const a = vortex(x, y, c1x, c1y, strengthScale);
  const b = vortex(x, y, c2x, c2y, -strengthScale * 0.82);
  return [a[0] + b[0], a[1] + b[1]];
}

function rotatingDrift(x, y, width, height, time, strength, profile) {
  const angle = time.seedDirection + 0.42 * profile.directionScale * Math.sin(time.slowCycle * 0.72) + 0.18 * Math.sin((x / Math.max(1, width)) * Math.PI * 2 + time.cycle * 0.35);
  const band = 0.72 + 0.24 * profile.magnitudeScale * Math.sin((y / Math.max(1, height)) * Math.PI * 2 + time.pulseCycle * 0.45);
  return [Math.cos(angle) * strength * band, Math.sin(angle) * strength * band];
}

function advectedCurlTexture(x, y, width, height, time, strength, variability, region, profile, turbulent = false) {
  const shiftX = Math.sin(time.slowCycle * 0.37 + Number(region.phase ?? 0)) * width * Number(region.driftRadius ?? 0.08);
  const shiftY = Math.cos(time.slowCycle * 0.29 + Number(region.phase ?? 0)) * height * Number(region.driftRadius ?? 0.08);
  const texture = currentAt('curlNoise', x + shiftX, y + shiftY, width, height, time, strength * profile.textureScale * (turbulent ? 1.3 : 1), variability, [], []);
  const wobble = turbulent ? [0.08 * strength * Math.sin(time.cycle + x * 0.9), 0.08 * strength * Math.cos(time.cycle * 0.8 + y * 0.7)] : [0, 0];
  return [texture[0] + wobble[0], texture[1] + wobble[1]];
}

function bayRecirculation(x, y, width, height, time, strength, terrain, profile, classification = null) {
  const land = nearestLandVector(terrain, x, y, width, height);
  const cx = x - (land?.x ?? 0) * Math.max(1.2, width * 0.08) + Math.sin(time.slowCycle * 0.4) * width * 0.035 * profile.directionScale;
  const cy = y - (land?.y ?? 0) * Math.max(1.2, height * 0.08) + Math.cos(time.slowCycle * 0.34) * height * 0.035 * profile.directionScale;
  const recirc = vortex(x, y, cx, cy, strength * (0.42 + 0.28 * profile.magnitudeScale) * (0.65 + 0.25 * Math.sin(time.pulseCycle)));
  const damp = 0.45 + 0.35 * Number(classification?.bayScore ?? 0.5);
  return [recirc[0] * damp, recirc[1] * damp];
}

function flushingPulse(x, y, width, height, time, strength, terrain, profile) {
  const recirc = bayRecirculation(x, y, width, height, time, strength, terrain, profile);
  const land = nearestLandVector(terrain, x, y, width, height);
  const pulse = Math.max(0, Math.sin(time.pulseCycle * 0.8 + x * 0.17 + y * 0.13));
  const flush = land ? [-(land.x ?? 0) * pulse * strength * 0.24 * profile.pulseScale, -(land.y ?? 0) * pulse * strength * 0.24 * profile.pulseScale] : [0, 0];
  return [recirc[0] + flush[0], recirc[1] + flush[1]];
}

function eddyPairWake(x, y, width, height, time, strength, terrain, profile) {
  const island = terrainIslandCenter(terrain, width, height);
  const dominantAngle = time.seedDirection + 0.55 * Math.sin(time.slowCycle * 0.58);
  const relX = Math.cos(dominantAngle) * (x - island.x) + Math.sin(dominantAngle) * (y - island.y);
  const relY = -Math.sin(dominantAngle) * (x - island.x) + Math.cos(dominantAngle) * (y - island.y);
  const downstream = relX > 0 ? Math.exp(-relX / Math.max(2, width * 0.36)) : 0.22;
  const wakeBand = Math.exp(-(relY ** 2) / Math.max(1, (height * 0.16) ** 2)) * downstream;
  const shed = Math.sin(time.pulseCycle + relX * 0.45);
  const c1 = {
    x: island.x + Math.cos(dominantAngle) * (2.2 + Math.abs(shed) * 1.4) + -Math.sin(dominantAngle) * 1.1,
    y: island.y + Math.sin(dominantAngle) * (2.2 + Math.abs(shed) * 1.4) + Math.cos(dominantAngle) * 1.1
  };
  const c2 = {
    x: island.x + Math.cos(dominantAngle) * (2.2 + Math.abs(shed) * 1.4) + Math.sin(dominantAngle) * 1.1,
    y: island.y + Math.sin(dominantAngle) * (2.2 + Math.abs(shed) * 1.4) - Math.cos(dominantAngle) * 1.1
  };
  const wakeStrength = strength * profile.wakeScale * (0.34 + 0.32 * Math.abs(shed));
  const a = vortex(x, y, c1.x, c1.y, wakeStrength);
  const b = vortex(x, y, c2.x, c2.y, -wakeStrength);
  return [
    a[0] + b[0] + Math.cos(dominantAngle) * wakeBand * strength * 0.32,
    a[1] + b[1] + Math.sin(dominantAngle) * wakeBand * strength * 0.32
  ];
}

function nearestLandVector(terrain, x, y, width, height) {
  let best = null;
  for (let dy = -4; dy <= 4; dy += 1) {
    for (let dx = -4; dx <= 4; dx += 1) {
      const tx = Math.round(x) + dx;
      const ty = Math.round(y) + dy;
      if (tx < 0 || ty < 0 || tx >= width || ty >= height || !terrain?.[ty]?.[tx]) continue;
      const distance = Math.hypot(dx, dy);
      if (distance <= 0 || (best && distance >= best.distance)) continue;
      best = { x: dx / distance, y: dy / distance, distance };
    }
  }
  return best;
}

function regionsFor(regions, maskType, fallback = []) {
  const matches = regions.filter((region) => region.maskType === maskType);
  return matches.length ? matches : fallback;
}

function defaultRegion(maskType, behavior, weight) {
  return { maskType, behavior, weight, speedScale: 1, magnitudeScale: 1, phase: 0 };
}

function topologyCompositeProfile(value = 'medium') {
  const complexity = TopologyAwareComposite.normalizeDynamicComplexity(value);
  if (complexity === 'low') {
    return {
      complexity,
      directionScale: 0.55,
      magnitudeScale: 0.5,
      directionVariationRadians: 0.24,
      magnitudePulseAmplitude: 0.24,
      shorelineScale: 0.42,
      wakeScale: 0.5,
      pulseScale: 0.35,
      textureScale: 0.35,
      maxMagnitude: 1.85,
      maxPulseScale: 1.35
    };
  }
  if (complexity === 'high') {
    return {
      complexity,
      directionScale: 1.45,
      magnitudeScale: 1.45,
      directionVariationRadians: 1.25,
      magnitudePulseAmplitude: 1.15,
      shorelineScale: 1.25,
      wakeScale: 1.45,
      pulseScale: 1.35,
      textureScale: 1.35,
      maxMagnitude: 3.45,
      maxPulseScale: 2.8
    };
  }
  return {
    complexity,
    directionScale: 0.95,
    magnitudeScale: 0.95,
    directionVariationRadians: 0.62,
    magnitudePulseAmplitude: 0.58,
    shorelineScale: 0.72,
    wakeScale: 0.78,
    pulseScale: 0.7,
    textureScale: 0.68,
    maxMagnitude: 2.35,
    maxPulseScale: 1.95
  };
}

function applyTopologyDynamicVariation(vector, x, y, width, height, time, profile) {
  const magnitude = Math.hypot(vector[0], vector[1]);
  if (!Number.isFinite(magnitude) || magnitude <= 1e-9) return vector;
  const nx = Number(x) / Math.max(1, Number(width) - 1);
  const ny = Number(y) / Math.max(1, Number(height) - 1);
  const phase = time.seedPhase
    + time.cycle * (0.72 + profile.directionScale * 0.22)
    + nx * Math.PI * (2.1 + profile.directionScale * 0.8)
    + ny * Math.PI * (1.4 + profile.directionScale * 0.65);
  const angleOffset = Number(profile.directionVariationRadians ?? 0.6) * (
    0.55 * Math.sin(phase)
    + 0.3 * Math.sin(phase * 0.37 + time.jetPhase)
    + 0.15 * Math.cos(phase * 0.71 + time.noisePhase)
  );
  const pulsePhase = time.pulseCycle * (0.82 + profile.magnitudeScale * 0.2)
    + nx * Math.PI * 1.3
    - ny * Math.PI * 0.9;
  const movingPulseCenterX = 0.5 + 0.26 * Math.sin(time.slowCycle * 0.33 + time.stormPhase);
  const movingPulseCenterY = 0.5 + 0.22 * Math.cos(time.slowCycle * 0.41 + time.jetPhase);
  const localPulse = Math.exp(-(((nx - movingPulseCenterX) ** 2 + (ny - movingPulseCenterY) ** 2) / (2 * 0.18 ** 2)));
  const pulse = 1 + Number(profile.magnitudePulseAmplitude ?? 0.5) * (
    0.5 * Math.sin(pulsePhase)
    + 0.35 * Math.sin(pulsePhase * 0.53 + nx * Math.PI * 2 + time.seedPhase)
    + 0.15 * localPulse * Math.sin(time.pulseCycle + time.stormPhase)
  );
  const scale = clamp(pulse, 0.15, Number(profile.maxPulseScale ?? 2));
  const baseAngle = Math.atan2(vector[1], vector[0]) + angleOffset;
  return [
    Math.cos(baseAngle) * magnitude * scale,
    Math.sin(baseAngle) * magnitude * scale
  ];
}

function regionTemporalScale(region, time, profile) {
  const phase = Number(region.phase ?? 0);
  const slow = Math.sin(time.slowCycle * Number(region.speedScale ?? 1) + phase);
  const pulse = Math.sin(time.pulseCycle * (0.72 + Number(region.speedScale ?? 1) * 0.18) + phase);
  const scale = 1
    + profile.magnitudeScale * 0.18 * slow
    + Number(region.pulseScale ?? profile.pulseScale) * 0.12 * pulse;
  return clamp(scale, 0.32, 1.75);
}

function regionalMagnitudeEnvelope(classification, x, y, time, profile) {
  const spatial = Math.sin(x * 0.23 + time.slowCycle * 0.31) * Math.cos(y * 0.19 - time.cycle * 0.17);
  let regionBoost = 1;
  if (classification?.regionType === 'channel') regionBoost += 0.16 * profile.magnitudeScale * Math.sin(time.pulseCycle + x * 0.11);
  if (classification?.regionType === 'bayPocket') regionBoost -= 0.1 * profile.magnitudeScale;
  if (classification?.regionType === 'islandAdjacent') regionBoost += 0.12 * profile.wakeScale * Math.sin(time.pulseCycle * 0.8 + y * 0.15);
  return clamp(regionBoost + spatial * 0.12 * profile.magnitudeScale, 0.35, 1.65);
}

function vortex(x, y, cx, cy, strength) {
  const dx = x - cx;
  const dy = y - cy;
  const dist = Math.hypot(dx, dy);
  if (!Number.isFinite(dist) || dist <= 1e-6) return [0, 0];
  const ringScale = dist / (dist * dist + 3.2);
  const scale = strength * ringScale;
  return [(-dy / dist) * scale, (dx / dist) * scale];
}

function terrainIslandCenter(terrain, width, height) {
  let count = 0;
  let sx = 0;
  let sy = 0;
  for (let y = 0; y < height; y += 1) {
    for (let x = 0; x < width; x += 1) {
      if (!terrain[y]?.[x]) continue;
      if (x <= 0 || y <= 0 || x >= width - 1 || y >= height - 1) continue;
      count += 1;
      sx += x;
      sy += y;
    }
  }
  return count ? { x: sx / count, y: sy / count } : { x: width * 0.45, y: height * 0.5 };
}

function defaultEddies(width, height, seedKey = 'anchor-current') {
  const rng = SeededRng.createSeededRng(`${seedKey}:eddy-centers`);
  const templates = [
    { x: 0.32, y: 0.36, strength: 0.9 },
    { x: 0.68, y: 0.62, strength: -0.75 },
    { x: 0.52, y: 0.48, strength: 0.45 }
  ];
  return templates.map((template) => ({
    x: clamp((template.x + (rng() - 0.5) * 0.22) * width, 0, Math.max(0, width - 1)),
    y: clamp((template.y + (rng() - 0.5) * 0.22) * height, 0, Math.max(0, height - 1)),
    strength: template.strength * (0.78 + rng() * 0.44)
  }));
}

function makeTimeContext(t, config = {}) {
  const frameCount = Math.max(1, Number(config.frameCount ?? 1));
  const frameIndex = clampInt(Number(config.frameIndex ?? 0), 0, Math.max(0, frameCount - 1));
  const duration = Math.max(1, Number(config.durationHours ?? config.duration ?? frameCount));
  const timeMode = config.timeMode ?? (frameCount > 1 ? 'frames' : 'clamped');
  const normalizedByFrame = frameCount > 1 ? frameIndex / (frameCount - 1) : 0;
  const rawNormalizedByTime = Number.isFinite(Number(t)) ? Number(t) / duration : normalizedByFrame;
  let normalizedByTime = rawNormalizedByTime;
  let clamped = false;
  if (timeMode === 'looping') {
    normalizedByTime = positiveModulo(Number(t) || 0, duration) / duration;
  } else if (timeMode === 'clamped') {
    normalizedByTime = clamp(rawNormalizedByTime, 0, 1);
    clamped = normalizedByTime !== rawNormalizedByTime;
  } else if (timeMode === 'frames') {
    normalizedByTime = clamp(rawNormalizedByTime, 0, 1);
    clamped = normalizedByTime !== rawNormalizedByTime;
  }
  const phase = timeMode === 'frames' ? normalizedByFrame : normalizedByTime;
  const variability = currentVariability(config);
  const cycleCount = 0.85 + variability * 1.65;
  const seedKey = config.seedKey ?? currentSeedKey(config, config.width, config.height);
  const rng = SeededRng.createSeededRng(`${seedKey}:phases`);
  const seedPhase = rng() * Math.PI * 2;
  const jetPhase = rng() * Math.PI * 2;
  const tidePhase = rng() * Math.PI * 2;
  const noisePhase = rng() * Math.PI * 2;
  const stormPhase = rng() * Math.PI * 2;
  const cycle = phase * Math.PI * 2 * cycleCount + seedPhase;
  debugCurrentTime({
    missionTime: config.debugTime?.missionTime ?? (Number(t) || 0),
    evolutionSpeed: config.debugTime?.evolutionSpeed ?? 1,
    timeMode,
    cycleDuration: config.debugTime?.cycleDuration ?? duration,
    effectiveTime: Number(t) || 0,
    normalizedByTime,
    frameIndex,
    interpolationAlpha: Number.isFinite(phase) ? phase - Math.floor(phase) : 0,
    clamped: Boolean(config.debugTime?.clamped ?? clamped),
    source: config.debugTime?.source ?? 'generatedCurrent',
    preset: config.debugTime?.preset
  });
  return {
    t: Number(t) || 0,
    frameIndex,
    frameCount,
    phase,
    timeMode,
    normalizedByTime,
    clamped: Boolean(config.debugTime?.clamped ?? clamped),
    cycle,
    slowCycle: cycle * 0.55 + Math.PI * 0.25,
    pulseCycle: cycle * (1.15 + variability * 0.75) + Math.PI * 0.5,
    seedKey,
    seedPhase,
    seedDirection: rng() * Math.PI * 2,
    speedJitter: rng(),
    jetPhase,
    tidePhase,
    noisePhase,
    stormPhase,
    stormCenterX: rng(),
    stormCenterY: rng()
  };
}

function currentSeedKey(config = {}, width = 1, height = 1) {
  const generator = config.currentGenerator ?? {};
  const anchor = config.seed
    ?? generator.seed
    ?? config.replaySeedAnchor
    ?? config.challengeId
    ?? config.instanceId
    ?? config.levelId
    ?? 'anchor-current';
  const preset = config.preset ?? generator.preset ?? config.currentPreset ?? config.vectorPreset ?? config.currentPattern ?? config.pattern ?? generator.currentPattern ?? 'current';
  const version = config.generationVersion ?? config.generatorVersion ?? generator.generationVersion ?? 'anchor-generator-v1';
  const strength = Number(config.currentStrength ?? config.strength ?? generator.strength ?? 1).toFixed(4);
  const variability = Number(config.currentVariability ?? config.variability ?? generator.variability ?? 0.5).toFixed(4);
  return `${anchor}:${preset}:${version}:${width}x${height}:s${strength}:v${variability}`;
}

function positiveModulo(value, modulus) {
  const number = Number(value) || 0;
  const base = Math.max(1, Number(modulus) || 1);
  return ((number % base) + base) % base;
}

function currentVariability(config = {}) {
  if (config.temporalEvolution === false || config.currentGenerator?.temporalEvolution === false) return 0;
  return clamp(Number(config.currentVariability ?? config.variability ?? config.currentGenerator?.variability ?? 0.5), 0, 1);
}

function debugCurrentTime(details = {}) {
  if (!globalThis.ANCHOR_DEBUG_CURRENT_TIME) return;
  console.debug('[CurrentField][Time]', details);
}

function debugTopologyCompositeGeneration({ config = {}, frames = [], width = 1, height = 1 } = {}) {
  if (!globalThis.ANCHOR_DEBUG_CURRENT_COMPLEXITY) return;
  const fieldConfig = config.currentFieldConfig ?? {};
  const composite = fieldConfig.topologyComposite ?? config.topologyComposite ?? null;
  const pattern = fieldConfig.basePreset ?? config.currentPreset ?? config.vectorPreset ?? config.currentPattern ?? config.pattern;
  if (pattern !== 'topologyAwareComposite' && !composite) return;
  const stats = currentFrameMagnitudeStats(frames);
  console.debug('[CurrentField][TopologyComposite]', {
    seed: config.seed ?? composite?.seed ?? null,
    dynamicComplexity: fieldConfig.dynamicComplexity ?? composite?.dynamicComplexity ?? composite?.randomness ?? null,
    regionCounts: composite?.summary?.regionCounts ?? null,
    assignedBehaviors: composite?.assignedBehaviors ?? behaviorSummary(composite?.regions),
    evolutionBehavior: composite?.evolutionBehavior ?? null,
    magnitudeStats: stats.magnitudeStats,
    directionVariance: stats.directionVariance,
    topologyAware: fieldConfig.topologyAware !== false,
    frameCount: frames.length,
    grid: { width, height }
  });
}

function debugCurrentVariationStats({ config = {}, frames = [] } = {}) {
  if (!globalThis.ANCHOR_DEBUG_CURRENT_VARIATION) return;
  const fieldConfig = config.currentFieldConfig ?? {};
  const composite = fieldConfig.topologyComposite ?? config.topologyComposite ?? null;
  const pattern = fieldConfig.basePreset ?? config.currentPreset ?? config.vectorPreset ?? config.currentPattern ?? config.pattern;
  if (pattern !== 'topologyAwareComposite' && !composite) return;
  const stats = currentFrameMagnitudeStats(frames);
  const angularDelta = meanAngularDeltaBetweenFrames(frames);
  const maxMagnitude = topologyCompositeProfile(fieldConfig.dynamicComplexity ?? composite?.dynamicComplexity ?? composite?.randomness).maxMagnitude
    * Math.max(0.2, Number(fieldConfig.strength ?? config.currentStrength ?? config.strength ?? 1));
  console.debug('[CurrentField][VariationStats]', {
    time: frames.at(-1)?.t ?? null,
    complexity: fieldConfig.dynamicComplexity ?? composite?.dynamicComplexity ?? composite?.randomness ?? null,
    minMagnitude: stats.magnitudeStats.min,
    meanMagnitude: stats.magnitudeStats.mean,
    maxMagnitude: stats.magnitudeStats.max,
    directionVariance: stats.directionVariance,
    meanAngularDeltaSincePreviousFrame: angularDelta,
    activeComponents: behaviorSummary(composite?.regions),
    clampCount: countClampedCurrentCells(frames, maxMagnitude),
    topologyAdjustedCount: null
  });
}

function currentFrameMagnitudeStats(frames = []) {
  const magnitudes = [];
  const angles = [];
  for (const frame of frames) {
    for (const row of frame.current ?? []) {
      for (const vector of row ?? []) {
        const u = Number(vector?.[0] ?? 0);
        const v = Number(vector?.[1] ?? 0);
        const magnitude = Math.hypot(u, v);
        if (!Number.isFinite(magnitude) || magnitude <= 0) continue;
        magnitudes.push(magnitude);
        angles.push(Math.atan2(v, u));
      }
    }
  }
  if (!magnitudes.length) return { magnitudeStats: { min: 0, mean: 0, max: 0 }, directionVariance: 0 };
  const min = Math.min(...magnitudes);
  const max = Math.max(...magnitudes);
  const mean = magnitudes.reduce((sum, value) => sum + value, 0) / magnitudes.length;
  const meanSin = angles.reduce((sum, value) => sum + Math.sin(value), 0) / angles.length;
  const meanCos = angles.reduce((sum, value) => sum + Math.cos(value), 0) / angles.length;
  return {
    magnitudeStats: { min: round(min), mean: round(mean), max: round(max) },
    directionVariance: round(1 - Math.hypot(meanSin, meanCos))
  };
}

function behaviorSummary(regions = []) {
  if (!Array.isArray(regions)) return null;
  return regions.reduce((summary, region) => {
    const key = region.maskType ?? 'unknown';
    summary[key] ??= [];
    summary[key].push(region.behavior ?? 'unknown');
    return summary;
  }, {});
}

function meanAngularDeltaBetweenFrames(frames = []) {
  let total = 0;
  let count = 0;
  for (let index = 1; index < frames.length; index += 1) {
    const previous = frames[index - 1]?.current ?? [];
    const current = frames[index]?.current ?? [];
    for (let y = 0; y < current.length; y += 1) {
      for (let x = 0; x < (current[y]?.length ?? 0); x += 1) {
        const a = previous[y]?.[x] ?? [0, 0];
        const b = current[y]?.[x] ?? [0, 0];
        const magA = Math.hypot(Number(a[0] ?? 0), Number(a[1] ?? 0));
        const magB = Math.hypot(Number(b[0] ?? 0), Number(b[1] ?? 0));
        if (magA <= 0.02 || magB <= 0.02) continue;
        total += Math.abs(angleDelta(Math.atan2(Number(b[1] ?? 0), Number(b[0] ?? 0)), Math.atan2(Number(a[1] ?? 0), Number(a[0] ?? 0))));
        count += 1;
      }
    }
  }
  return count ? round(total / count) : 0;
}

function countClampedCurrentCells(frames = [], maxMagnitude = Infinity) {
  if (!Number.isFinite(maxMagnitude)) return 0;
  let count = 0;
  for (const frame of frames) {
    for (const row of frame.current ?? []) {
      for (const vector of row ?? []) {
        const magnitude = Math.hypot(Number(vector?.[0] ?? 0), Number(vector?.[1] ?? 0));
        if (magnitude >= maxMagnitude - 0.002) count += 1;
      }
    }
  }
  return count;
}

function angleDelta(a, b) {
  return Math.atan2(Math.sin(a - b), Math.cos(a - b));
}

function round(value) {
  return Number(value.toFixed(3));
}

function clamp(value, min, max) {
  if (!Number.isFinite(value)) return min;
  return Math.max(min, Math.min(max, value));
}

function clampInt(value, min, max) {
  const number = Number(value);
  if (!Number.isFinite(number)) return min;
  return Math.max(min, Math.min(max, Math.round(number)));
}

module.exports = {generateCurrent, sampleGeneratedCurrent}