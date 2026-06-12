import { sampleFieldComponentContract, sampleFieldComponentLabel } from './SampleFieldComponentContracts.js';

export function componentIsolationHint(componentId) {
  if (!componentId) return null;
  const contract = sampleFieldComponentContract(componentId);
  const expected = {
    eventLikelihood: 'event-origin basins change; realized sample-value geometry may remain similar.',
    spatialPattern: 'geometry changes; timing and event likelihood should remain comparable.',
    valueDistribution: 'value strengths change; geometry and timing should remain comparable.',
    temporalPattern: 'timing changes; spatial basins should remain similar.',
    spatialEvolution: 'motion/spread changes; original geometry should remain recognizable.',
    interactionScale: 'hierarchy/scale interpretation changes; basic pattern family should remain similar.',
    stateModel: 'memory/update behavior changes; original geometry should remain comparable.',
    samplingEffect: 'depletion/freshness changes; event likelihood should remain unchanged.',
    displayLayer: 'inspection layer changes; generated field should not change.',
    seed: 'instance changes; component choices should remain the same.'
  }[componentId] ?? contract.changes;
  return {
    componentId,
    label: sampleFieldComponentLabel(componentId),
    expectedEffect: expected,
    recommendedViews: contract.usefulDisplayLayers ?? [],
    shouldNotChange: contract.shouldNotChange
  };
}

export function componentCompatibilityWarnings(state = {}) {
  const warnings = [];
  if (state.temporalPattern === 'static' && state.spatialEvolution === 'neighborPropagation') {
    warnings.push('Spatial propagation may be subtle because temporal forcing is static.');
  }
  if (state.temporalPattern === 'static' && ['expansion', 'divergence', 'branchingGrowth'].includes(state.spatialEvolution)) {
    warnings.push('Growth-style spatial evolution may be subtle with a Static temporal pattern.');
  }
  if (state.interactionScale === 'global' && state.stateModel === 'stateEvolving' && state.spatialEvolution === 'neighborPropagation') {
    warnings.push('Neighbor-propagation rules operate at cell/edge scale; Global is explanatory metadata for this combination.');
  }
  if (state.interactionScale === 'global' && ['branchingGrowth', 'neighborPropagation'].includes(state.spatialEvolution)) {
    warnings.push('Branching and neighbor spread are local/edge-scale rules; Global is mostly metadata for this combination.');
  }
  if (['rotationalSwirl', 'shearStretch'].includes(state.spatialEvolution)) {
    warnings.push(`${state.spatialEvolution === 'rotationalSwirl' ? 'Rotational Swirl' : 'Shear / Stretch'} is synthetic sample-field deformation, not physical current flow.`);
  }
  if (state.valueDistribution === 'heavyTailed') {
    warnings.push('Heavy-Tailed changes sample-value magnitude; it does not change event likelihood L(x,y,t).');
  }
  if (state.valueDistribution === 'rareExtremeEvents') {
    warnings.push('Rare Extreme Events may show very few extreme cells in short or low-contrast windows.');
  }
  if (state.spatialEvolution === 'branchingGrowth' && !['edge', 'hybrid', 'cell'].includes(state.interactionScale)) {
    warnings.push('Branching Growth is easiest to interpret with Edge, Hybrid, or Cell interaction scale.');
  }
  if (state.spatialEvolution === 'convergence' && state.spatialPattern === 'clusteredField' && Number(state.hotspotCount ?? 1) <= 1) {
    warnings.push('Convergence can be subtle with a single cluster because there is little separation to collapse.');
  }
  if (state.interactionScale === 'global' && state.behaviorPresetId === 'lifeLikeCellularEmergenceInspired') {
    warnings.push('Life-like local rules operate at cell/edge scale; Global is metadata only for this rule.');
  }
  if (state.displayMode === 'eventLikelihood' && ['freshnessAge', 'revisitRecovery', 'hard', 'soft', 'neighborhood'].includes(state.depletionMode)) {
    warnings.push('Sampling effects change sample-value displays, not Event Likelihood L(x,y,t).');
  }
  if (state.spatialEvolution === 'stationary' && state.interactionScale === 'edge') {
    warnings.push('Edge-scale interaction may be quiet when Spatial Evolution is Stationary unless the state model emits messages.');
  }
  return warnings;
}
