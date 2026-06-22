import assert from 'node:assert/strict';

import {
  OPERATIONAL_DOMAIN_CHOICES,
  createDefaultScenarioConfig,
  generateScenarioFromConfig,
  normalizeScenarioConfig
} from '../../src/core/generation/ScenarioConfig.js';

assert.deepEqual(Object.keys(OPERATIONAL_DOMAIN_CHOICES), ['compactTrainingArea', 'coastalMissionArea', 'regionalFleetArea']);
assert.equal(normalizeScenarioConfig({ operationalDomainProfileId: 'compactTrainingArea' }).resolutionProfile.profileId, 'tutorialCompact');
assert.equal(normalizeScenarioConfig({ operationalDomainProfileId: 'coastalMissionArea' }).resolutionProfile.profileId, 'coastalStandard');
const regional = normalizeScenarioConfig({ operationalDomainProfileId: 'regionalFleetArea' });
assert.equal(regional.resolutionProfile.profileId, 'regionalFleet');
assert.equal(regional.agentCount, 3);
assert.equal(regional.fuel, 190);
assert.equal(regional.width, 48);
assert.equal(regional.height, 30);

const tutorialDefault = createDefaultScenarioConfig('perfectKnowledge');
assert.equal(tutorialDefault.operationalDomainProfileId, 'compactTrainingArea', 'tutorial/simulation defaults remain compact until Challenge overrides them');
assert.equal(tutorialDefault.resolutionProfile.profileId, 'tutorialCompact');

const importedPreserved = normalizeScenarioConfig({ resolutionProfile: 'coastalStandard', operationalDomain: { domainId: 'imported-domain' } });
assert.equal(importedPreserved.resolutionProfile.profileId, 'coastalStandard', 'declared imported resolution profile is preserved when no domain choice overrides it');

const generated = generateScenarioFromConfig({
  ...createDefaultScenarioConfig('perfectKnowledge'),
  operationalDomainProfileId: 'regionalFleetArea',
  seed: 'world-r1-1-profile-smoke',
  challengeId: 'CHALLENGE-world-r1-1-profile',
  name: 'Synthetic Regional Shelf and Basin'
});
assert.equal(generated.level.meta.name, 'Synthetic Regional Shelf and Basin');
assert.equal(generated.level.meta.terrainAuthorityMode, 'signedElevationV1');
assert.equal(generated.config.resolutionProfile.profileId, 'regionalFleet');
assert.equal(generated.mission.agents.length, 3);
assert.doesNotThrow(() => JSON.stringify(generated.level.meta.generationConfig), 'generationConfig must be JSON-serializable');
assert.notEqual(generated.level.meta.generationConfig, generated.level.meta.generationConfig.scenarioSetup, 'scenarioSetup must not be a self-reference');

console.log('smoke_regional_profile_activation: ok');