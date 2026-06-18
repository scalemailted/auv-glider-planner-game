import { buildHeadlessSolverPacketRoundtrip, buildHeadlessRoundtripReport } from './HeadlessRoundtrip.js';
import { HEADLESS_ROUNDTRIP_VERSION } from './HeadlessRoundtrip.js';

export const HEADLESS_SOLVER_ROUNDTRIP_VERSION = 'headless-solver-roundtrip-h3.1';
export { buildHeadlessRoundtripReport };
export const runHeadlessSolverPacketRoundtrip = buildHeadlessSolverPacketRoundtrip;
export { buildHeadlessSolverPacketRoundtrip };

export function headlessRoundtripSummary(roundtrip = {}) {
  const report = roundtrip.report ?? roundtrip;
  return {
    version: HEADLESS_SOLVER_ROUNDTRIP_VERSION,
    implementationVersion: HEADLESS_ROUNDTRIP_VERSION,
    type: report.type ?? null,
    canonicalType: report.canonicalType ?? null,
    status: report.summary?.status ?? null,
    packetId: report.source?.packetId ?? null,
    planId: report.source?.planId ?? null,
    selectedAgentId: report.source?.selectedAgentId ?? null,
    finalScore: report.summary?.finalScore ?? null,
    usesNewPlanner: report.runtime?.usesNewPlanner === true,
    usesPythonSimulator: report.runtime?.usesPythonSimulator === true,
    usesMARL: report.runtime?.usesMARL === true,
    usesMotionDynamics: report.runtime?.usesMotionDynamics === true,
    usesMissionOutcomeScoring: report.runtime?.usesMissionOutcomeScoring === true || Boolean(report.missionOutcomeReport ?? report.missionScore),
    changesOfficialBrowserScoring: false,
    scoreProfileId: report.summary?.scoreProfileId ?? report.runtime?.scoreProfileId ?? null,
    scoreProfileVersion: report.summary?.scoreProfileVersion ?? report.runtime?.scoreProfileVersion ?? null,
    compositeScore: report.summary?.compositeScore ?? report.runtime?.compositeScore ?? null,
    coverageFraction: report.summary?.coverageFraction ?? report.runtime?.coverageFraction ?? null,
    regretSummary: report.regretSummary ?? report.summary?.regretSummary ?? null,
    usesWebGPUFluid: report.runtime?.usesWebGPUFluid === true,
    motionModelId: report.runtime?.motionModelId ?? report.motionSummary?.motionModelId ?? null
  };
}
