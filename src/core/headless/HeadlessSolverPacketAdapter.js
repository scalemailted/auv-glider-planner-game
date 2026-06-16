import { readHeadlessSolverPacket, summarizeHeadlessPacket } from './SolverPacketReader.js';
import { buildHeadlessPlanningWorld } from './HeadlessPlanningWorld.js';
import { validateSolverPacketVisibility, buildRoundtripRuntimeConfig } from './HeadlessRoundtrip.js';

export const HEADLESS_SOLVER_PACKET_ADAPTER_VERSION = 'headless-solver-packet-adapter-h3.1';

export function classifySolverPacketArtifact(packet = {}) {
  return {
    type: packet?.type ?? null,
    recognized: packet?.type === 'anchor.solverPacket',
    packetId: packet?.packetId ?? null,
    missionId: packet?.missionId ?? packet?.mission?.missionId ?? null,
    visibility: packet?.visibility ?? {},
    expectedPlanFormat: packet?.expectedPlanFormat ?? null
  };
}

export function validateSolverPacketForHeadless(packet, options = {}) {
  const context = readHeadlessSolverPacket(packet, { oracle: options.oracle === true });
  const visibility = validateSolverPacketVisibility(context, { oracle: options.oracle === true });
  return { ...visibility, packet: summarizeHeadlessPacket(context), adapterVersion: HEADLESS_SOLVER_PACKET_ADAPTER_VERSION };
}

export function buildHeadlessMissionConfigFromSolverPacket(packet, options = {}) {
  const context = readHeadlessSolverPacket(packet, { oracle: options.oracle === true });
  const world = buildHeadlessPlanningWorld(context);
  const placeholderPlan = {
    type: 'anchor.headless.waypoint-plan',
    gliderId: world.agents?.[0]?.id ?? 'glider-1',
    waypoints: []
  };
  return buildRoundtripRuntimeConfig(context, world, placeholderPlan, { seed: options.seed }).missionConfig;
}

export function solverPacketVisibilitySummary(packet, options = {}) {
  return validateSolverPacketForHeadless(packet, options);
}

export function solverPacketHeadlessCompatibilitySummary(packet, options = {}) {
  const context = readHeadlessSolverPacket(packet, { oracle: options.oracle === true });
  const world = buildHeadlessPlanningWorld(context);
  const visibility = validateSolverPacketVisibility(context, { oracle: options.oracle === true });
  return {
    adapterVersion: HEADLESS_SOLVER_PACKET_ADAPTER_VERSION,
    recognized: true,
    packet: summarizeHeadlessPacket(context),
    grid: { width: world.width, height: world.height },
    agentCount: world.agents.length,
    visibilityStatus: visibility.status,
    hiddenTruthIncluded: visibility.hiddenTruthIncluded,
    singleGliderRuntimeLimitation: true,
    usesPythonSimulator: false,
    usesNewPlanner: false,
    usesMARL: false
  };
}