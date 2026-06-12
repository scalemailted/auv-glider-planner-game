import assert from 'node:assert/strict';

globalThis.Phaser = {
  Scene: class {
    constructor(key) {
      this.sys = { settings: { key } };
    }
  }
};

const [{ RoiGeneratorDemoScene }, terminology] = await Promise.all([
  import('../../src/game/phaser/scenes/RoiGeneratorDemoScene.js'),
  import('../../src/core/demo/sampling/SamplingProcessTerminology.js')
]);

assert.equal(typeof terminology.samplingProcessModeLabel, 'function', 'SamplingProcessTerminology should export samplingProcessModeLabel');
assert.equal(terminology.samplingProcessModeLabel('customComposer'), 'Custom Composer');

const textNode = () => ({
  value: '',
  x: 0,
  y: 0,
  width: 0,
  setPosition(x, y) {
    this.x = x;
    this.y = y;
    return this;
  },
  setWordWrapWidth(width) {
    this.width = width;
    return this;
  },
  setText(value) {
    this.value = value;
    return this;
  }
});

const scene = new RoiGeneratorDemoScene();
scene.processMode = 'customComposer';
scene.referenceSignatureId = 'none';
scene.temporalPattern = 'bursty';
scene.spatialEvolution = 'stationary';
scene.displayMode = 'sampleValueLikelihoodOverlay';
scene.depletionMode = 'soft';
scene.demoTime = 12.5;
scene.titleText = textNode();
scene.subtitleText = textNode();
scene.statusText = textNode();
scene.field = {
  stats: { mean: 0.25, max: 0.75 },
  activityDiagnostics: {
    meanValue: 0.25,
    activeFraction: 0.5,
    highValueFraction: 0.125,
    maxValue: 0.75
  },
  temporalPattern: 'bursty',
  spatialEvolution: 'stationary',
  displayMode: 'sampleValueLikelihoodOverlay',
  depletionMode: 'soft',
  stateModel: 'stateEvolving'
};

scene.layoutText({
  margin: 16,
  top: 24,
  map: { x: 16, y: 80, width: 640, height: 360 }
});

assert.match(scene.statusText.value, /Custom Composer/, 'layoutText should label Custom Composer without ReferenceError');
assert.match(scene.statusText.value, /Mean/, 'layoutText should render compact metrics');

console.log('smoke_sampling_process_scene_layout_text: ok');
