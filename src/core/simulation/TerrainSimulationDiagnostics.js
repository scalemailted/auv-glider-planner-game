// Compatibility forwarding module.
// Canonical implementation lives in packages/mission-simulator.
export {
  TERRAIN_SIMULATION_DIAGNOSTICS_VERSION,
  TERRAIN_SIMULATION_EVENT_TYPES,
  createTerrainSimulationDiagnostics,
  updateTerrainSimulationDiagnostics,
  recordTerrainSimulationObservation,
  recordTerrainSimulationSurfacing,
  finalizeTerrainSimulationDiagnostics,
  terrainSimulationDiagnosticsSummary,
  validateTerrainSimulationDiagnostics,
  terrainSimulationEventsDigest
} from '../../../packages/mission-simulator/src/TerrainSimulationDiagnostics.js';
