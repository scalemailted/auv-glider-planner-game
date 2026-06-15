import {
  buildSamplingProcessDemoArtifactExport,
  buildSamplingProcessDemoArtifactFrame,
  buildSamplingProcessExportSampling
} from '../../src/core/demo/sampling/SamplingProcessExportBuilder.js';

const failures = [];
const assert = (condition, message) => { if (!condition) failures.push(message); };

const sample = [
  [0.1, 0.8],
  [0.3, 0.6]
];
const source = [
  [0.2, 0.9],
  [0.4, 0.5]
];
const stateLayer = [
  ['inactive', 'active'],
  ['recovering', 'cooling']
];
const ruleLayer = [
  ['inert', 'propagatingFront'],
  ['recoveryWave', 'inert']
];
const groupLayer = [
  [0, 1],
  [1, 0]
];
const transitionField = [
  [null, { previousState: 'inactive', nextState: 'active', cause: 'smoke' }],
  [null, null]
];
const edgeMessages = [{
  source: 0,
  target: 1,
  sourceCell: { x: 0, y: 0 },
  targetCell: { x: 1, y: 0 },
  strength: 0.75,
  messageStrength: 0.75,
  ruleId: 'propagatingFront',
  cause: 'activation',
  label: 'smoke activation'
}];

const field = {
  width: 2,
  height: 2,
  time: 7,
  field: sample,
  sampleValueField: sample,
  samplingValueField: sample,
  valueLayer: sample,
  eventLikelihoodField: source,
  sourceField: source,
  rawBaseField: sample,
  evolvedField: sample,
  transitionLayer: transitionField,
  roiRoleLayer: [
    ['background', 'currentROI'],
    ['nearFutureROI', 'background']
  ],
  eventLikelihood: 'multiModal',
  pureSpatialPattern: 'clustered',
  valueDistribution: 'gaussianNormal',
  temporalPattern: 'periodic',
  spatialEvolution: 'continuousDrift',
  interactionScale: 'localNeighborhood',
  stateModel: 'timeIndexed',
  depletionMode: 'recovering',
  displayMode: 'processTransitionView',
  processTiming: { generationIndex: 7, tickRate: 1, tickIntervalSeconds: 1, frameSemantics: 'discrete-generations-v1' },
  processDisplayMetric: {
    metricId: 'transitionClass',
    metricLabel: 'Transition View',
    metricCaption: 'Birth, survive, death, or remain inactive under the local neighbor-count rule.',
    legend: [{ id: 'birth', label: 'birth next', color: '#63e6be', description: 'Inactive cell with exactly three active neighbors.' }]
  },
  metricLayers: {
    neighborCount: [[0, 3], [1, 2]],
    ruleSupport: [[0, 1], [0.5, 0.75]],
    transitionClass: [['remainInactive', 'birth'], ['death', 'survive']]
  },
  stats: { min: 0.1, max: 0.8, mean: 0.45 },
  highValueCells: [{ row: 0, col: 1, value: 0.8 }],
  likelihoodField: {
    type: 'mesh',
    label: 'Source Field',
    values: source,
    nodes: [{ id: 'n1', x: 1, y: 0, strength: 0.9 }],
    metadata: { source: 'smoke' },
    mesh: { width: 2, height: 2 },
    diagnostics: { nodeCount: 1 }
  },
  activityDiagnostics: {
    presetValidation: { status: 'PASS' }
  },
  graphField: {
    topology: 'grid',
    nodeCount: 4,
    edgeCount: 1,
    updateRule: 'propagatingFront',
    stateField: stateLayer,
    ruleField: ruleLayer,
    resolvedRuleField: ruleLayer,
    transitionField,
    activationField: sample,
    clusterLikelihoodField: source,
    incomingMessageField: [
      [0, 0.75],
      [0, 0]
    ],
    edgeMessages,
    nodeTransitions: [{
      nodeId: '1,0',
      row: 0,
      col: 1,
      communityId: 1,
      previousState: 'inactive',
      nextState: 'active',
      ruleId: 'propagatingFront',
      cause: 'smoke'
    }],
    nodeGrid: [
      [
        { id: 0, row: 0, col: 0, communityId: 0, state: 'inactive', activation: 0.1 },
        { id: 1, row: 0, col: 1, communityId: 1, state: 'active', activation: 0.8, incomingMessage: 0.75 }
      ],
      [
        { id: 2, row: 1, col: 0, communityId: 1, state: 'recovering', activation: 0.3 },
        { id: 3, row: 1, col: 1, communityId: 0, state: 'cooling', activation: 0.6 }
      ]
    ],
    diagnostics: {
      clusterCount: 2,
      ruleEngineDiagnostics: { status: 'PASS' }
    },
    graph: {
      topology: 'grid',
      nodeCount: 4,
      edgeCount: 1,
      updateRule: 'propagatingFront',
      diagnostics: { status: 'PASS' },
      clusterDiagnostics: { clusterCount: 2 }
    },
    processMetadata: { catalogVersion: 'smoke' },
    clusters: [{ id: 1, communityId: 1, x: 1, y: 0, likelihood: 0.9 }]
  }
};

const processLayers = {
  stateLayer,
  ruleLayer,
  resolvedRuleLayer: ruleLayer,
  groupLayer,
  parameterLayer: [
    [{ sourceValue: 0.2 }, { sourceValue: 0.9 }],
    [{ sourceValue: 0.4 }, { sourceValue: 0.5 }]
  ]
};

const baseContext = {
  title: 'Deterministic Spatiotemporal Process Lab',
  demo: 'Deterministic Spatiotemporal Process Lab',
  demoTime: 7,
  field,
  processLayers,
  processMode: 'foundationalCaModels',
  patternSource: 'referenceSignature',
  exampleTrack: 'foundationalCaModels',
  exampleProcessId: 'conwayGameOfLife',
  foundationalCaModelId: 'conwayGameOfLife',
  referenceSignatureId: 'birthDeathEmergence',
  referenceSignatureModified: false,
  behaviorPresetId: 'custom',
  behaviorPresetModified: false,
  paintModel: {
    width: 2,
    height: 2,
    cells: {
      '1,0': { state: 'active', ruleId: 'propagatingFront', groupId: 1, sourceValue: 0.9 }
    },
    groups: { 1: { label: 'Smoke Group' } }
  },
  paintStartMode: 'blankCanvas',
  paintSettings: { selectedPaintState: 'active' },
  viewFilters: { messageStrengthThreshold: 0.1 },
  selectedCell: { row: 0, col: 1 },
  exportMode: 'timeWindow',
  exportStartTime: 0,
  exportEndTime: 10,
  exportFrameCount: 3,
  playbackDirection: 1,
  timeSpeedScale: 1,
  processTiming: { generationIndex: 7, tickRate: 1, tickIntervalSeconds: 1, frameSemantics: 'discrete-generations-v1' },
  processDisplayMetric: field.processDisplayMetric,
  seed: 'export-builder-smoke',
  sceneConfig: {
    seed: 'export-builder-smoke',
    displayMode: 'sampleWithLikelihoodOverlay'
  },
  buildFrameAtTime(time, index, fieldOverride = null) {
    return buildSamplingProcessDemoArtifactFrame({
      ...this,
      field: fieldOverride ?? field,
      processLayers
    }, time, index, fieldOverride ?? field);
  },
  inspectSelectedCell() {
    return { row: 0, col: 1, value: 0.8 };
  }
};

const sampling = buildSamplingProcessExportSampling(baseContext);
assert(sampling.kind === 'timeSeries', 'time-series sampling kind mismatch');
assert(sampling.timesSeconds.length === 3, 'time-series sampling frame count mismatch');

const referenceArtifact = buildSamplingProcessDemoArtifactExport(baseContext);
assert(referenceArtifact.type === 'anchor.demo.sampling-process-field', 'artifact type mismatch');
assert(referenceArtifact.legacyType === 'anchor.demo.sample-roi-field', 'artifact legacyType mismatch');
assert(referenceArtifact.demoName === 'Deterministic Spatiotemporal Process Lab', 'artifact demoName mismatch');
assert(referenceArtifact.legacyDemoName === 'Sample / ROI Field Demo', 'artifact legacyDemoName mismatch');
assert(referenceArtifact.exampleTrack === 'foundationalCaModels', 'exampleTrack missing');
assert(referenceArtifact.exampleProcessId === 'conwayGameOfLife', 'exampleProcessId missing');
assert(referenceArtifact.exampleType === 'foundationalCaModel', 'exampleType missing');
assert(referenceArtifact.processExample?.exampleTrack === referenceArtifact.exampleTrack, 'processExample track should match flat field');
assert(referenceArtifact.processExample?.exampleProcessId === referenceArtifact.exampleProcessId, 'processExample id should match flat field');
assert(referenceArtifact.processExample?.mappedReferenceSignatureId === referenceArtifact.referenceSignatureId, 'processExample mapped reference should match legacy referenceSignatureId');
assert(referenceArtifact.fields.sourceField?.[0]?.[1] === 0.9, 'sourceField alias missing from current fields');
assert(referenceArtifact.fields.eventLikelihood?.[0]?.[1] === 0.9, 'eventLikelihood field missing');
assert(referenceArtifact.fields.legacyEventLikelihoodField?.[0]?.[1] === 0.9, 'legacy event likelihood field missing');
assert(referenceArtifact.fields.samplingValue?.[0]?.[1] === 0.8, 'samplingValue field missing');
assert(referenceArtifact.fields.sampleValue?.[0]?.[1] === 0.8, 'sampleValue field missing');
assert(referenceArtifact.processTiming?.generationIndex === 7, 'top-level processTiming generationIndex missing');
assert(referenceArtifact.processTiming?.tickRate === 1, 'top-level processTiming tickRate missing');
assert(referenceArtifact.processDisplayMetric?.metricId === 'transitionClass', 'top-level processDisplayMetric missing');
assert(referenceArtifact.fields.metricLayers?.neighborCount?.[0]?.[1] === 3, 'frame metricLayers neighborCount missing');
assert(referenceArtifact.fields.metricLayers?.transitionClass?.[0]?.[1] === 'birth', 'frame metricLayers transitionClass missing');
assert(referenceArtifact.likelihoodField?.values?.[0]?.[1] === 0.9, 'top-level likelihoodField missing values');
assert(referenceArtifact.referenceSignatureId === 'birthDeathEmergence', 'reference signature id missing');
assert(referenceArtifact.referenceSignatureLabel, 'reference signature label missing');
assert(Array.isArray(referenceArtifact.referenceModels), 'reference models missing');
assert(referenceArtifact.caTaxonomy, 'CA taxonomy missing');
assert(referenceArtifact.metadata.referenceSignatureMetadata, 'metadata reference signature missing');
assert(referenceArtifact.metadata.componentRecipe, 'metadata componentRecipe missing');
assert(referenceArtifact.metadata.activeComponentRecipe.seed === 'export-builder-smoke', 'active component recipe seed missing');
assert(referenceArtifact.metadata.processTiming?.frameSemantics === 'discrete-generations-v1', 'metadata processTiming missing frame semantics');
assert(referenceArtifact.metadata.processDisplayMetric?.metricLabel === 'Transition View', 'metadata processDisplayMetric missing');

const paintArtifact = buildSamplingProcessDemoArtifactExport({
  ...baseContext,
  processMode: 'processPaint',
  patternSource: 'custom',
  referenceSignatureId: 'custom',
  referenceSignatureModified: true
});
assert(paintArtifact.processMode === 'processPaint', 'processPaint processMode missing');
assert(paintArtifact.processExample === null, 'processPaint should not export an active processExample block');
assert(paintArtifact.exampleProcessId === null, 'processPaint should not export selected example id');
assert(paintArtifact.ruleAllocation?.cells?.['1,0'], 'processPaint ruleAllocation missing');
assert(paintArtifact.groupDefinitions?.[1]?.label === 'Smoke Group', 'processPaint groupDefinitions missing');
assert(paintArtifact.paintStartMode === 'blankCanvas', 'processPaint paintStartMode missing');
assert(paintArtifact.paintSettings?.selectedPaintState === 'active', 'processPaint paintSettings missing');
assert(paintArtifact.fields.ruleLayer?.[0]?.[1] === 'propagatingFront', 'ruleLayer missing');
assert(paintArtifact.fields.resolvedRuleLayer?.[0]?.[1] === 'propagatingFront', 'resolvedRuleLayer missing');
assert(paintArtifact.fields.groupLayer?.[0]?.[1] === 1, 'groupLayer missing');
assert(paintArtifact.fields.transitionField?.[0]?.[1]?.nextState === 'active', 'transitionField missing');
assert(paintArtifact.fields.roiRoleLayer?.[0]?.[1] === 'currentROI', 'roiRoleLayer missing');
assert(paintArtifact.fields.processMessages?.[0]?.strength === 0.75, 'processMessages missing');
assert(paintArtifact.fields.edgeMessages?.[0]?.strength === 0.75, 'edgeMessages missing');
assert(paintArtifact.metadata.paintValidation?.paintedCellCount === 1, 'paintValidation missing painted cell count');
assert(paintArtifact.metadata.processRuleCatalogVersion, 'rule catalog version missing');
assert(Array.isArray(paintArtifact.metadata.canonicalRuleIds), 'canonicalRuleIds missing');
assert(paintArtifact.metadata.ruleAliases, 'ruleAliases missing');
assert(paintArtifact.metadata.ruleEngineDiagnostics, 'rule engine diagnostics missing');

for (const key of [
  'type',
  'legacyType',
  'demoName',
  'legacyDemoName',
  'grid',
  'time',
  'timeSampling',
  'config',
  'componentRecipe',
  'fields',
  'likelihoodField',
  'graphField',
  'ruleAllocation',
  'paintSettings',
  'processRuleCatalogVersion',
  'canonicalRuleIds',
  'ruleAliases',
  'statusLabel',
  'frames',
  'metadata'
]) {
  assert(Object.hasOwn(referenceArtifact, key), `reference artifact missing top-level ${key}`);
}

if (failures.length) {
  console.error('Sampling process export builder smoke failed');
  for (const failure of failures) console.error(`- ${failure}`);
  process.exit(1);
}

console.log('Sampling process export builder smoke passed');
