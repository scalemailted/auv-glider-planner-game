import assert from 'node:assert/strict';
import { generateScenarioFromConfig } from '../../src/core/generation/ScenarioConfig.js';
import { validateWaterColumnMissionConfig, waterColumnMissionConfigSummary } from '../../src/core/science/WaterColumnMissionDefaults.js';

for (const mode of ['perfectKnowledge', 'forecast']) {
  const { level, mission } = generateScenarioFromConfig({ mode, seed: `water-column-${mode}`, width: 12, height: 12, duration: 8, agentCount: 1 });
  const config = mission.waterColumnConfig ?? level.world?.waterColumnConfig;
  const summary = waterColumnMissionConfigSummary(config);
  assert.equal(summary.source, 'generatedModernMission');
  assert.equal(summary.importedLegacySurfaceFallback, false);
  assert.ok(summary.layerCount > 1);
  assert.ok(summary.layerCount >= 5);
  assert.equal(summary.defaultDiveProfileId, 'surfaceOnly');
  assert.equal(validateWaterColumnMissionConfig(config).valid, true);
}
console.log('smoke_generated_mission_water_column_config passed');