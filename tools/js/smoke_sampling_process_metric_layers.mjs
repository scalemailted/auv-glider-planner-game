import {
  buildSamplingProcessMetricLayers,
  computeNeighborCountLayer,
  defaultMetricForExample,
  metricLegendForExample
} from '../../src/core/demo/sampling/SamplingProcessExplainability.js';
import {
  spatiotemporalProcessExampleById,
  spatiotemporalProcessExamplesByTrack
} from '../../src/core/demo/sampling/SpatiotemporalProcessExamples.js';

const failures = [];
const assert = (condition, message) => { if (!condition) failures.push(message); };

function field(width, height, value) {
  return Array.from({ length: height }, () => Array.from({ length: width }, () => value));
}

const conway = spatiotemporalProcessExampleById('conwayGameOfLife', 'foundationalCaModels');
const previousBlinker = [
  ['inactive', 'inactive', 'inactive'],
  ['active', 'active', 'active'],
  ['inactive', 'inactive', 'inactive']
];
const currentBlinker = [
  ['inactive', 'active', 'inactive'],
  ['inactive', 'active', 'inactive'],
  ['inactive', 'active', 'inactive']
];
const conwayMetrics = buildSamplingProcessMetricLayers({
  example: conway,
  ruleId: 'localBirthDeath',
  previousStateLayer: previousBlinker,
  stateLayer: currentBlinker,
  sourceField: field(3, 3, 0),
  width: 3,
  height: 3
});
assert(conwayMetrics.metricLayers.neighborCount[1][1] === 2, 'Conway center active cell should have two active neighbors');
assert(conwayMetrics.metricLayers.neighborCount[0][1] === 3, 'Conway top-center inactive cell should have three active neighbors');
assert(conwayMetrics.metricLayers.transitionClass[0][1] === 'birth', 'Conway top-center cell should be classified as birth');
assert(conwayMetrics.metricLayers.transitionClass[1][1] === 'survive', 'Conway center cell should be classified as survive');
assert(conwayMetrics.metricLayers.transitionClass[1][0] === 'death', 'Conway left active cell should be classified as death');
assert(conwayMetrics.defaultMetricId === 'transitionClass', 'Conway default metric should be transitionClass');

const neighborCounts = computeNeighborCountLayer(previousBlinker, 3, 3);
assert(neighborCounts[2][1] === 3, 'neighbor count helper should count Moore-neighborhood active cells');

const activeCenter = field(5, 5, 'susceptible');
activeCenter[2][2] = 'active';
const source = field(5, 5, 0.1);
source[2][3] = 0.5;
const forest = spatiotemporalProcessExampleById('forestFire', 'foundationalCaModels');
const forestMetrics = buildSamplingProcessMetricLayers({ example: forest, ruleId: 'propagatingFront', stateLayer: activeCenter, previousStateLayer: activeCenter, sourceField: source, width: 5, height: 5 });
assert(forestMetrics.metricLayers.ignitionPressure[2][3] > forestMetrics.metricLayers.ignitionPressure[0][0], 'Forest Fire ignition pressure should be higher next to active cells');
assert(forestMetrics.legend.some((entry) => /ignition pressure/i.test(entry.label)), 'Forest Fire legend should explain ignition pressure');

const sir = spatiotemporalProcessExampleById('sirEpidemicCa', 'foundationalCaModels');
const sirMetrics = buildSamplingProcessMetricLayers({ example: sir, ruleId: 'diffusiveSpread', stateLayer: activeCenter, previousStateLayer: activeCenter, sourceField: field(5, 5, 0), width: 5, height: 5 });
assert(sirMetrics.metricLayers.infectionPressure[2][3] > sirMetrics.metricLayers.infectionPressure[0][0], 'SIR infection pressure should be higher next to infected/active cells');
assert(sirMetrics.legend.some((entry) => /infection pressure/i.test(entry.label)), 'SIR legend should explain infection pressure');

const sandpile = spatiotemporalProcessExampleById('sandpileAvalanche', 'foundationalCaModels');
const load = field(3, 3, 0.1);
load[1][1] = 0.95;
const thresholdMetrics = buildSamplingProcessMetricLayers({ example: sandpile, ruleId: 'thresholdCascade', stateLayer: field(3, 3, 'loaded'), previousStateLayer: field(3, 3, 'loaded'), sourceField: load, width: 3, height: 3 });
assert(thresholdMetrics.metricLayers.thresholdProximity[1][1] > thresholdMetrics.metricLayers.thresholdProximity[0][0], 'Threshold Cascade proximity should reflect load');

for (const example of spatiotemporalProcessExamplesByTrack('foundationalCaModels')) {
  const metricId = defaultMetricForExample(example, example.ruleFamilyId);
  const legend = metricLegendForExample(example, example.ruleFamilyId, metricId);
  assert(metricId, `${example.id} should have a default metric`);
  assert(Array.isArray(legend) && legend.length > 0, `${example.id} should have a metric legend`);
}

const riverPlume = spatiotemporalProcessExampleById('riverPlumeFront', 'oceanRelevantProcessAnalogs');
const riverLegend = metricLegendForExample(riverPlume, riverPlume.ruleFamilyId, defaultMetricForExample(riverPlume, riverPlume.ruleFamilyId));
assert(riverLegend.some((entry) => /physical downstream transport belongs/i.test(entry.description ?? '')), 'River Plume analog should include flow-coupling disclaimer');

if (failures.length) {
  console.error('Sampling process metric layers smoke failed');
  for (const failure of failures) console.error(`- ${failure}`);
  process.exit(1);
}

console.log('Sampling process metric layers smoke passed');