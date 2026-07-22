const OceanCurrentField4D = require('./OceanCurrentField4D.js')
const MANUFACTURED_CURRENT_FIELD_CATALOG_VERSION = 'manufactured-current-field-catalog-flow-r2a-3';

const DEFAULT_AXES = Object.freeze({
  eastAxisMeters: [0, 1, 2, 3, 4],
  northAxisMeters: [0, 1, 2, 3, 4],
  depthAxisMeters: [0, 10, 35, 75, 150],
  timeAxisSeconds: [0, 600, 1200, 1800]
});

const DEFINITIONS = Object.freeze({
  uniformTranslation: {
    id: 'uniformTranslation',
    label: 'Uniform Translation',
    equation: 'u = constant; v = constant',
    parameters: { u: 0.2, v: -0.04 },
    evaluator: ({ params }) => ({ u: params.u, v: params.v }),
    expected: { zeroDivergence: true, depthDependent: false, timeDependent: false }
  },
  linearShearWithDepth: {
    id: 'linearShearWithDepth',
    label: 'Linear Shear With Depth',
    equation: 'u(z) = u0 + shear * z; v(z) = v0',
    parameters: { u0: 0.03, v0: -0.02, shear: 0.0018 },
    evaluator: ({ z, params }) => ({ u: params.u0 + params.shear * z, v: params.v0 }),
    expected: { zeroDivergence: true, depthDependent: true, timeDependent: false }
  },
  oscillatingTide: {
    id: 'oscillatingTide',
    label: 'Oscillating Tide',
    equation: 'u(t) = amplitude * sin(omega * t + phase); v(t) = amplitudeV * cos(omega * t + phaseV)',
    parameters: { amplitude: 0.18, amplitudeV: 0.06, omega: (2 * Math.PI) / 1800, phase: 0, phaseV: 0 },
    evaluator: ({ t, params }) => ({ u: params.amplitude * Math.sin(params.omega * t + params.phase), v: params.amplitudeV * Math.cos(params.omega * t + params.phaseV) }),
    expected: { zeroDivergence: true, depthDependent: false, timeDependent: true }
  },
  solidBodyEddy: {
    id: 'solidBodyEddy',
    label: 'Solid-Body Eddy',
    equation: 'u = -omega * (y - cy); v = omega * (x - cx)',
    parameters: { omega: 0.035, cx: 2, cy: 2 },
    evaluator: ({ x, y, params }) => ({ u: -params.omega * (y - params.cy), v: params.omega * (x - params.cx) }),
    expected: { zeroDivergence: true, depthDependent: false, timeDependent: false, vorticity: 0.07 }
  },
  translatingEddy: {
    id: 'translatingEddy',
    label: 'Translating Eddy',
    equation: 'u = -omega * (y - cy(t)); v = omega * (x - cx(t))',
    parameters: { omega: 0.028, cx0: 1.5, cy0: 2, vx: 0.00045, vy: -0.0002 },
    evaluator: ({ x, y, t, params }) => {
      const cx = params.cx0 + params.vx * t;
      const cy = params.cy0 + params.vy * t;
      return { u: -params.omega * (y - cy), v: params.omega * (x - cx) };
    },
    expected: { zeroDivergence: true, depthDependent: false, timeDependent: true }
  },
  depthShearedEddy: {
    id: 'depthShearedEddy',
    label: 'Depth-Sheared Eddy',
    equation: 'omega(z) = omega0 + depthShear * z; u = -omega(z) * (y - cy); v = omega(z) * (x - cx)',
    parameters: { omega0: 0.018, depthShear: 0.00016, cx: 2, cy: 2 },
    evaluator: ({ x, y, z, params }) => {
      const omega = params.omega0 + params.depthShear * z;
      return { u: -omega * (y - params.cy), v: omega * (x - params.cx) };
    },
    expected: { zeroDivergence: true, depthDependent: true, timeDependent: false }
  }
});

 function manufacturedCurrentFieldCatalog() {
  return Object.values(DEFINITIONS).map((definition) => ({
    id: definition.id,
    label: definition.label,
    equation: definition.equation,
    parameters: { ...definition.parameters },
    expected: { ...definition.expected }
  }));
}

 function createManufacturedCurrentField(id = 'uniformTranslation', options = {}) {
  const definition = definitionFor(id);
  const axes = normalizeAxes(options);
  const params = { ...definition.parameters, ...(options.parameters ?? {}) };
  const shape = {
    time: axes.timeAxisSeconds.length,
    depth: axes.depthAxisMeters.length,
    height: axes.northAxisMeters.length,
    width: axes.eastAxisMeters.length
  };
  const u = [];
  const v = [];
  for (let ti = 0; ti < shape.time; ti += 1) {
    const timeU = [];
    const timeV = [];
    const t = axes.timeAxisSeconds[ti];
    for (let zi = 0; zi < shape.depth; zi += 1) {
      const layerU = [];
      const layerV = [];
      const z = axes.depthAxisMeters[zi];
      for (let yIndex = 0; yIndex < shape.height; yIndex += 1) {
        const rowU = [];
        const rowV = [];
        const y = axes.northAxisMeters[yIndex];
        for (let xIndex = 0; xIndex < shape.width; xIndex += 1) {
          const x = axes.eastAxisMeters[xIndex];
          const expected = definition.evaluator({ x, y, z, t, params });
          rowU.push(round(expected.u, 10));
          rowV.push(round(expected.v, 10));
        }
        layerU.push(rowU);
        layerV.push(rowV);
      }
      timeU.push(layerU);
      timeV.push(layerV);
    }
    u.push(timeU);
    v.push(timeV);
  }
  const wetMask = options.wetMask ?? Array.from({ length: shape.height }, () => Array.from({ length: shape.width }, () => true));
  const bottomDepthMeters = options.bottomDepthMeters ?? Array.from({ length: shape.height }, () => Array.from({ length: shape.width }, () => Math.max(...axes.depthAxisMeters) + 20));
  return OceanCurrentField4D.createOceanCurrentField4D({
    id: options.id ?? `manufactured-${definition.id}`,
    label: definition.label,
    eastAxisMeters: axes.eastAxisMeters,
    northAxisMeters: axes.northAxisMeters,
    depthAxisMeters: axes.depthAxisMeters,
    timeAxisSeconds: axes.timeAxisSeconds,
    uEastMetersPerSecond: u,
    vNorthMetersPerSecond: v,
    wetMask,
    bottomDepthMeters,
    sourceMetadata: {
      sourceTier: 'manufacturedAnalytical',
      sourceType: 'manufactured',
      sourceId: options.id ?? `manufactured-${definition.id}`,
      sourceLabel: definition.label,
      equationFamily: `manufactured:${definition.id}`,
      manufacturedFieldId: definition.id,
      analyticalEvaluatorId: definition.id,
      equation: definition.equation,
      parameters: params,
      depthDependent: definition.expected.depthDependent === true,
      timeDependent: definition.expected.timeDependent === true,
      usesBathymetryMask: false,
      usesCoastlineBoundary: false,
      usesIsobathSteering: false,
      includesVerticalVelocity: false,
      calibratedForecast: false,
      usesRealHycom: false,
      usesRealMarineCopernicus: false,
      expectedDiagnostics: {
        divergenceRmsMaximum: 1e-9,
        coastlineNormalSpeedRmsMaximum: 1e-9
      }
    }
  });
}

 function evaluateExpectedCurrent(idOrField = 'uniformTranslation', x = 0, y = 0, z = 0, t = 0, options = {}) {
  const id = typeof idOrField === 'string' ? idOrField : idOrField?.sourceMetadata?.manufacturedFieldId ?? idOrField?.sourceMetadata?.analyticalEvaluatorId ?? 'uniformTranslation';
  const definition = definitionFor(id);
  const params = { ...definition.parameters, ...(typeof idOrField === 'object' ? idOrField?.sourceMetadata?.parameters ?? {} : {}), ...(options.parameters ?? {}) };
  return roundVector(definition.evaluator({ x: Number(x), y: Number(y), z: Number(z), t: Number(t), params }));
}

 function manufacturedCurrentFieldDefinition(id = 'uniformTranslation') {
  const definition = definitionFor(id);
  return { id: definition.id, label: definition.label, equation: definition.equation, parameters: { ...definition.parameters }, expected: { ...definition.expected } };
}

function definitionFor(id) {
  const definition = DEFINITIONS[id];
  if (!definition) throw new Error(`Unknown manufactured current field: ${id}`);
  return definition;
}

function normalizeAxes(options = {}) {
  return {
    eastAxisMeters: axis(options.eastAxisMeters, DEFAULT_AXES.eastAxisMeters),
    northAxisMeters: axis(options.northAxisMeters, DEFAULT_AXES.northAxisMeters),
    depthAxisMeters: axis(options.depthAxisMeters, DEFAULT_AXES.depthAxisMeters),
    timeAxisSeconds: axis(options.timeAxisSeconds, DEFAULT_AXES.timeAxisSeconds)
  };
}

function axis(value, fallback) {
  const source = Array.isArray(value) && value.length ? value : fallback;
  return [...new Set(source.map(Number).filter(Number.isFinite))].sort((a, b) => a - b);
}

function roundVector(value = {}) {
  return { u: round(value.u, 10), v: round(value.v, 10), w: 0 };
}

function round(value, digits = 8) {
  const number = Number(value);
  return Number.isFinite(number) ? Number(number.toFixed(digits)) : 0;
}

module.exports = {manufacturedCurrentFieldCatalog, createManufacturedCurrentField, evaluateExpectedCurrent, manufacturedCurrentFieldDefinition}