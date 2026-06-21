import { generateLevel } from '../../src/core/generation/LevelGenerator.js';
import { buildDefaultMissionForLevel, normalizeLevelForEditor } from '../../src/core/editor/LevelEditOperations.js';
import { createMissionEditorDocument } from '../../src/core/editor/MissionEditorDocument.js';

export function createMissionEditorFixture(options = {}) {
  const level = normalizeLevelForEditor(generateLevel({ width: options.width ?? 12, height: options.height ?? 10, difficulty: 'medium', seed: options.seed ?? 'three-r2b-editor-fixture' }));
  const mission = buildDefaultMissionForLevel(level, { agentCount: options.agentCount ?? 2, missionId: 'three_r2b_editor_mission' });
  const document = createMissionEditorDocument({ level, mission }, { activeTool: 'terrain', frameIndex: 0 });
  return { level, mission, document };
}

export function deepClone(value) {
  return JSON.parse(JSON.stringify(value));
}
