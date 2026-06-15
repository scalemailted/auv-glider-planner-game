import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

import {
  drawHighValueMarkers,
  drawSelectedSamplingCell,
  drawSamplingProcessHeatmap,
  graphStateStyle,
  heatColor,
  isGraphDisplayMode
} from '../../src/game/phaser/renderers/SamplingProcessRenderLayers.js';

const renderModulePath = new URL('../../src/game/phaser/renderers/SamplingProcessRenderLayers.js', import.meta.url);

function fakeGraphics() {
  const calls = [];
  const graphics = new Proxy({}, {
    get(_target, prop) {
      if (prop === 'calls') return calls;
      return (...args) => {
        calls.push({ method: String(prop), args });
        return graphics;
      };
    }
  });
  return graphics;
}

function makeGrid(width, height, valueForCell) {
  return Array.from({ length: height }, (_row, y) => (
    Array.from({ length: width }, (_col, x) => valueForCell(x, y))
  ));
}

function makeField(displayMode) {
  const width = 4;
  const height = 3;
  const sampleValueField = makeGrid(width, height, (x, y) => Math.min(1, 0.12 + x * 0.18 + y * 0.2));
  const eventLikelihoodField = makeGrid(width, height, (x, y) => Math.min(1, 0.18 + ((x + y) % 3) * 0.28));
  const transitionClass = makeGrid(width, height, (x, y) => ['birth', 'survive', 'death', 'remainInactive'][(x + y) % 4]);
  const nodeGrid = makeGrid(width, height, (x, y) => ({
    id: y * width + x,
    state: ['active', 'cooling', 'recovering', 'susceptible', 'consumed', 'inactive'][(x + y) % 6],
    communityId: (x + y) % 3,
    activation: sampleValueField[y][x],
    likelihood: eventLikelihoodField[y][x],
    incomingMessage: 0.1 + y * 0.05,
    outgoingMessage: 0.2 + x * 0.04
  }));
  return {
    width,
    height,
    displayMode,
    field: sampleValueField,
    sampleValueField,
    eventLikelihoodField,
    samplingValueField: sampleValueField,
    metricLayers: {
      state: makeGrid(width, height, (x, y) => ['inactive', 'active', 'cooling', 'recovering'][(x + y) % 4]),
      neighborCount: makeGrid(width, height, (x, y) => (x + y) % 9),
      ruleSupport: makeGrid(width, height, (x, y) => Math.min(1, 0.2 + x * 0.2 + y * 0.1)),
      transitionClass,
      samplingValue: sampleValueField,
      sourceSupport: eventLikelihoodField
    },
    defaultMetricId: 'transitionClass',
    processDisplayMetric: { metricId: 'transitionClass', metricLabel: 'Transition View' },
    highValueCells: [{ x: 1, y: 1, value: 0.9 }],
    eventLikelihoodSpatialEvolution: 'neighborPropagation',
    spatialEvolution: 'neighborPropagation',
    likelihoodField: {
      values: eventLikelihoodField,
      mesh: {
        activeThreshold: 0.25,
        highThreshold: 0.7,
        nearTriggerThreshold: 0.9
      }
    },
    graphField: {
      width,
      height,
      nodeGrid,
      clusters: [
        { communityId: 0, center: { x: 0.25, y: 0.4 }, likelihood: 0.8, state: 'active' },
        { communityId: 1, center: { x: 2.1, y: 1.5 }, likelihood: 0.55, state: 'cooling' }
      ],
      edgeMessages: [
        {
          source: 0,
          target: 1,
          sourceCell: { x: 0, y: 0 },
          targetCell: { x: 1, y: 0 },
          strength: 0.6,
          sameCommunity: false,
          communityId: 0,
          cause: 'activation'
        },
        {
          source: 5,
          target: 9,
          sourceCell: { x: 1, y: 1 },
          targetCell: { x: 1, y: 2 },
          messageStrength: 0.4,
          sameCommunity: true,
          communityId: 2,
          cause: 'recovery'
        }
      ],
      nodeTransitions: [
        { col: 1, row: 1, state: 'cooling', nextState: 'recovering' },
        { col: 2, row: 2, state: 'susceptible', nextState: 'active' }
      ],
      diagnostics: {
        updateRule: 'neighborPropagation',
        stateCounts: {
          active: 2,
          cooling: 2,
          recovering: 2,
          susceptible: 2,
          consumed: 2,
          inactive: 2
        }
      },
      graph: {
        width,
        height,
        updateRule: 'neighborPropagation'
      }
    },
    activityDiagnostics: {
      graphDiagnostics: {
        stateCounts: {
          active: 2,
          cooling: 2,
          recovering: 2,
          susceptible: 2,
          consumed: 2,
          inactive: 2
        }
      }
    }
  };
}

function makeViewFilters() {
  return {
    showTopologyEdges: true,
    showActiveMessageEdges: true,
    maxMessages: 50,
    messageStrengthThreshold: 0.01,
    showTopMessagesOnly: true,
    sameCommunity: true,
    crossCommunity: true,
    fadeInactiveNodes: true,
    transitionNodesOnly: false,
    roiMeaningLayer: 'all',
    nodeStates: {
      active: true,
      cooling: true,
      recovering: true,
      susceptible: true,
      consumed: true,
      inactive: true
    },
    messageTypes: {
      activation: true,
      recovery: true,
      cooldown: true,
      inhibition: true,
      drift: true,
      generic: true
    }
  };
}

const graphModes = [
  'graphTopology',
  'graphCommunities',
  'nodeStates',
  'graphMessages',
  'communityMessages',
  'stateTransitions',
  'roiMeaning',
  'diagnosticsOverlay',
  'processStateView',
  'processRuleMetric',
  'processTransitionView',
  'samplingInterpretation'
];

for (const mode of graphModes) {
  assert.equal(isGraphDisplayMode(mode), true, `${mode} should be a graph display mode`);
}

for (const mode of ['sampleValue', 'eventLikelihood', 'sampleValueLikelihoodOverlay', 'depletedValue', 'freshnessRevisitValue', 'rawBaseValue']) {
  assert.equal(isGraphDisplayMode(mode), false, `${mode} should not be a graph display mode`);
}

for (const value of [0, 0.2, 0.5, 0.8, 1]) {
  assert.equal(Number.isFinite(heatColor(value)), true, `heatColor(${value}) should return a finite color`);
}

for (const state of ['active', 'cooling', 'recovering', 'susceptible', 'consumed', 'inactive', 'unknown']) {
  const style = graphStateStyle(state);
  assert.equal(Number.isFinite(style.color), true, `${state} should have a finite color`);
  assert.equal(Number.isFinite(style.alpha), true, `${state} should have a finite alpha`);
  assert.equal(Number.isFinite(style.width), true, `${state} should have a finite line width`);
  assert.equal(Number.isFinite(style.radiusScale), true, `${state} should have a finite radius scale`);
}

const displayModes = [
  'sampleValue',
  'eventLikelihood',
  'sampleValueLikelihoodOverlay',
  'depletedValue',
  'freshnessRevisitValue',
  'rawBaseValue',
  ...graphModes
];

for (const displayMode of displayModes) {
  const graphics = fakeGraphics();
  const context = {
    graphics,
    field: makeField(displayMode),
    map: { x: 10, y: 20, width: 240, height: 180 },
    viewFilters: makeViewFilters(),
    selectedCell: { col: 1, row: 1 },
    demoTime: 4.25
  };
  drawSamplingProcessHeatmap(context);
  drawHighValueMarkers(context);
  drawSelectedSamplingCell(context);
  assert.ok(graphics.calls.length > 0, `${displayMode} should issue drawing calls`);
}

const source = await readFile(renderModulePath, 'utf8');
assert.equal(source.includes('RoiGeneratorDemoScene'), false, 'renderer should not import or reference the scene');
assert.equal(/\bPhaser\b/.test(source), false, 'renderer should not depend on Phaser globals directly');
assert.equal(/\bdocument\b|\bwindow\b/.test(source), false, 'renderer should not depend on DOM globals');

console.log('smoke_sampling_process_render_layers: ok');
