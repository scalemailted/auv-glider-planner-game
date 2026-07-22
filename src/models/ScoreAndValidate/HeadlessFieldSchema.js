const HeadlessSchemaContract = require('./HeadlessSchemaContract.js')
const HEADLESS_FIELD_SCHEMA_VERSION = 'headless-field-schema-h0';

 const HEADLESS_CANONICAL_FIELDS = Object.freeze([
  field('T_hiddenTruth', 'hidden true environmental state', 'hiddenTruth', ['x', 'y', 'z', 'time']),
  field('E_forecast', 'expected / forecast state', 'forecastOnly', ['x', 'y', 'z', 'time']),
  field('mu_belief', 'belief mean / posterior-like estimate', 'beliefOnly', ['x', 'y', 'z', 'time']),
  field('U_uncertainty', 'expected-state uncertainty', 'beliefOnly', ['x', 'y', 'z', 'time']),
  field('P_unknown', 'hidden-event probability', 'beliefOnly', ['x', 'y', 'z', 'time']),
  field('A_global', 'global sampling priority', 'publicScenario', ['x', 'y', 'time']),
  field('Q_glider', 'glider-specific action value', 'publicScenario', ['glider', 'x', 'y', 'time']),
  field('F_u', 'flow x / east component', 'forecastOnly', ['x', 'y', 'z', 'time']),
  field('F_v', 'flow y / north component', 'forecastOnly', ['x', 'y', 'z', 'time']),
  field('F_w', 'optional vertical/depth component', 'forecastOnly', ['x', 'y', 'z', 'time']),
  field('constraintMask', 'land / inaccessible / hard constraints', 'publicScenario', ['x', 'y', 'z']),
  field('hazard', 'hazard / risk field', 'publicScenario', ['x', 'y', 'z', 'time']),
  field('staleness', 'time since last useful sample', 'beliefOnly', ['x', 'y', 'time']),
  field('sampleValue', 'realized science/sample value', 'publicScenario', ['x', 'y', 'time']),
  field('eventIntensity', 'physical phenomenon intensity', 'hiddenTruth', ['x', 'y', 'z', 'time']),
  field('trueRoi', 'oracle scientific ROI', 'hiddenTruth', ['x', 'y', 'time']),
  field('beliefRoi', 'belief-based ROI', 'beliefOnly', ['x', 'y', 'time']),
  field('boundaryStrength', 'boundary / front / gradient strength', 'publicScenario', ['x', 'y', 'time']),
  field('forecastValidation', 'forecast-validation value', 'beliefOnly', ['x', 'y', 'time']),
  field('hiddenEventProbability', 'alias / compatibility to P_unknown', 'beliefOnly', ['x', 'y', 'z', 'time'], 'P_unknown')
]);

 const HEADLESS_DEPTH_LAYER_IDS = Object.freeze([
  'surface',
  'shallow',
  'thermocline',
  'midwater',
  'deep',
  'bottom',
  'integratedWaterColumn'
]);

 const HEADLESS_FIELD_DIMENSION_IDS = Object.freeze([
  'x',
  'y',
  'z',
  'time',
  'glider',
  'ensemble',
  'feature',
  'channel'
]);

 function headlessFieldOptions() {
  return HEADLESS_CANONICAL_FIELDS.map((entry) => ({ ...entry }));
}

 function headlessDepthLayerOptions() {
  return HEADLESS_DEPTH_LAYER_IDS.map((id) => ({ id, label: labelize(id) }));
}

 function normalizeHeadlessDepthLayerId(id) {
  if (HEADLESS_DEPTH_LAYER_IDS.includes(id)) return id;
  if (id === 'waterColumn' || id === 'integrated') return 'integratedWaterColumn';
  return 'surface';
}

 function createHeadlessFieldDescriptor(options = {}) {
  const id = HeadlessSchemaContract.normalizeHeadlessFieldId(options.id ?? options.fieldId ?? options.name);
  const canonical = HEADLESS_CANONICAL_FIELDS.find((entry) => entry.id === id) ?? field(id, options.description ?? 'Custom headless field.', 'publicScenario', ['x', 'y', 'time']);
  const dimensions = normalizeDimensions(options.dimensions ?? canonical.dimensions);
  const depthLayers = normalizeDepthLayers(options.depthLayers ?? options.depthLayerIds ?? (dimensions.includes('z') ? ['surface'] : []));
  return compactObject({
    type: 'anchor.headless.field-descriptor',
    version: HEADLESS_FIELD_SCHEMA_VERSION,
    id,
    canonicalId: canonical.aliasOf ?? canonical.id,
    label: options.label ?? labelize(id),
    description: options.description ?? canonical.description,
    visibilityTier: HeadlessSchemaContract.normalizeHeadlessVisibilityTier(options.visibilityTier ?? canonical.visibilityTier),
    dimensions,
    depthLayers,
    shape: options.shape ?? null,
    dtype: options.dtype ?? 'float32',
    units: options.units ?? null,
    temporal: dimensions.includes('time'),
    supports2d: dimensions.includes('x') && dimensions.includes('y'),
    supports25d: dimensions.includes('z') || depthLayers.length > 0,
    aliasOf: canonical.aliasOf ?? null,
    source: options.source ?? null,
    notes: normalizeStringList(options.notes)
  });
}

 function validateHeadlessFieldDescriptor(descriptor = {}) {
  const errors = [];
  const warnings = [];
  if (!descriptor || typeof descriptor !== 'object') errors.push('Headless field descriptor must be an object.');
  if (descriptor?.type !== 'anchor.headless.field-descriptor') errors.push(`Expected type anchor.headless.field-descriptor, got ${descriptor?.type ?? 'missing'}.`);
  if (!descriptor?.id) errors.push('Field id is required.');
  if (!Array.isArray(descriptor?.dimensions) || !descriptor.dimensions.includes('x') || !descriptor.dimensions.includes('y')) errors.push('Field descriptor must include x and y dimensions.');
  for (const dimension of descriptor?.dimensions ?? []) {
    if (!HEADLESS_FIELD_DIMENSION_IDS.includes(dimension)) warnings.push(`Unknown dimension id ${dimension}.`);
  }
  if (!['hiddenTruth', 'oracle', 'forecastOnly', 'beliefOnly', 'publicScenario', 'debugAll'].includes(descriptor?.visibilityTier)) errors.push('visibilityTier is not recognized.');
  if ((descriptor.id === 'T_hiddenTruth' || descriptor.id === 'trueRoi' || descriptor.id === 'eventIntensity') && !['hiddenTruth', 'oracle', 'debugAll'].includes(descriptor.visibilityTier)) {
    errors.push(`${descriptor.id} must use hiddenTruth, oracle, or debugAll visibility.`);
  }
  return { valid: errors.length === 0, status: errors.length ? 'FAIL' : warnings.length ? 'WARN' : 'PASS', errors, warnings };
}

 function headlessFieldDescriptorSummary(descriptor = {}) {
  const normalized = createHeadlessFieldDescriptor(descriptor);
  const validation = validateHeadlessFieldDescriptor(normalized);
  return {
    id: normalized.id,
    canonicalId: normalized.canonicalId,
    visibilityTier: normalized.visibilityTier,
    dimensions: normalized.dimensions,
    depthLayers: normalized.depthLayers,
    supports2d: normalized.supports2d,
    supports25d: normalized.supports25d,
    valid: validation.valid,
    warnings: validation.warnings
  };
}

function field(id, description, visibilityTier, dimensions, aliasOf = null) {
  return Object.freeze({ id, label: labelize(id), description, visibilityTier, dimensions, aliasOf });
}

function normalizeDimensions(values = []) {
  const dimensions = [...new Set((Array.isArray(values) ? values : ['x', 'y']).map((value) => String(value)).filter(Boolean))];
  return dimensions.includes('x') && dimensions.includes('y') ? dimensions : ['x', 'y', ...dimensions.filter((id) => id !== 'x' && id !== 'y')];
}

function normalizeDepthLayers(values = []) {
  return [...new Set((Array.isArray(values) ? values : [values]).filter(Boolean).map(normalizeHeadlessDepthLayerId))];
}

function normalizeStringList(values = []) {
  return (Array.isArray(values) ? values : [values]).map((value) => String(value)).filter(Boolean);
}

function compactObject(value = {}) {
  return Object.fromEntries(Object.entries(value).filter(([_key, entry]) => entry !== undefined));
}

function labelize(value) {
  return String(value ?? '').replace(/[_-]/g, ' ').replace(/([a-z])([A-Z])/g, '$1 $2').replace(/\b\w/g, (char) => char.toUpperCase());
}
module.exports = {HEADLESS_CANONICAL_FIELDS, HEADLESS_DEPTH_LAYER_IDS, HEADLESS_FIELD_DIMENSION_IDS, headlessFieldOptions, headlessDepthLayerOptions, normalizeHeadlessDepthLayerId, createHeadlessFieldDescriptor, validateHeadlessFieldDescriptor, headlessFieldDescriptorSummary}