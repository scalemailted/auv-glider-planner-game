import { TruthWorld } from './TruthWorld.js';
import { markSimulationLaunchStage, completeSimulationLaunchStage } from '../runtime/SimulationLaunchProfiler.js';
import { createAgent } from './Agent.js';
import { stepAgentToward } from './Physics.js';
import { updateSampling } from './Sampling.js';
import { checkPriorityTargetCapture, summarizePriorityTargets } from './PriorityTargets.js';
import { summarizeScore } from './Scoring.js';
import { Logger } from './Logger.js';
import { getDriftRules } from './StochasticDrift.js';
import { createSimulationTrace, traceSimulation } from '../debug/SimulationTrace.js';
import { getMobileHazardsAtTime } from './MobileHazards.js';
import { summarizeProbabilityOutcomes } from '../evaluation/ProbabilityOutcomeMetrics.js';
import { summarizeRiskReward } from '../evaluation/RiskRewardMetrics.js';
import { evaluateEndCondition } from './EndConditions.js';
import { normalizeEndCondition, normalizeMissionOptions, normalizePriorityTargetRules, normalizeSamplingRules } from './MissionRules.js';
import { normalizeDeploymentState, summarizeDeployment } from '../deployment/DeploymentZones.js';
import { normalizeForecastRules } from '../forecast/ForecastDecay.js';
import { summarizeAgentSpecs } from '../agents/AgentSpecs.js';
import { validatePlanForExecution } from '../planning/PlanExecutionValidator.js';
import {
  getCommunicationRules,
  getGliderCommsState,
  shouldSurfaceAtTime,
  surfaceKey,
  surfacingEnabled
} from './GliderComms.js';
import {
  advanceWaypointIfReached,
  detectMissedWaypoint,
  getActiveWaypoint,
  getWaypointProgress,
  markWaypointMissed
} from '../planning/PlanExecutor.js';
import { normalizeWaypointKind, waypointKindEventType } from '../planning/WaypointSemantics.js';
import { buildRouteBlockDiagnostic } from '../planning/Navigability.js';
import { buildRouteValidationDiagnostic } from '../planning/RouteDiagnostic.js';
import { summarizeSimulationStopReason } from '../planning/StopReasonSummarizer.js';
import {
  createRouteFailureDecision,
  isRouteFailureReason,
  normalizeRouteFailureReason
} from './RouteFailureDecision.js';
import {
  SIMULATION_LIMITS,
  debugSimulation,
  trimArrayToLimit,
  validateAgentState,
  validateSimulationConfig,
  validateWaypoint
} from './SimulationSafety.js';
import { debugSurfaceDecision } from './SurfaceDecisionVisibility.js';
import { normalizeWaterColumnConfig } from '../science/WaterColumnSchema.js';
import { depthScienceScoreProfileMetadata } from '../science/DepthScoringProfiles.js';
import { summarizeDepthAwareScoreEvents } from '../science/DepthAwareScienceValue.js';
import {
  createTerrainSimulationDiagnostics,
  finalizeTerrainSimulationDiagnostics,
  recordTerrainSimulationObservation,
  recordTerrainSimulationSurfacing,
  terrainSimulationDiagnosticsSummary,
  updateTerrainSimulationDiagnostics,
  validateTerrainSimulationDiagnostics
} from '../simulation/TerrainSimulationDiagnostics.js';

const MAX_PLAYBACK_STEPS = SIMULATION_LIMITS.maxPlaybackSteps;

export class SimulationEngine {
  constructor({ level, mission, plan, resumeState = null, trace = null, time = 0 }) {
    this.level = level;
    this.mission = mission;
    this.plan = plan;
    this.t = time;
    normalizeDeploymentState(this.level, this.mission, this.plan);
    this.initialValidation = validatePlanForExecution({ level: this.level, mission: this.mission, plan: this.plan });
    this.configValidation = validateSimulationConfig(this.level, this.mission, this.plan);
    markSimulationLaunchStage('constructTruthWorld');
    this.world = new TruthWorld(level, mission);
    completeSimulationLaunchStage('constructTruthWorld');
    this.resumeState = resumeState;
    this.trace = trace ?? createSimulationTrace();
    this.missionOptions = normalizeMissionOptions(this.mission);
    this.ignoreSurfacePauses = Boolean(this.missionOptions.ignoreUpdateEvents);
    this.running = false;
    this.reset();
  }

  reset() {
    this.agents = (this.mission.agents ?? []).map(createAgent);
    this.complete = false;
    this.aborted = false;
    this.abortReason = null;
    this.debug = null;
    this.stepCount = 0;
    this.events = [];
    this.logger = new Logger();
    this.eventKeys = new Set();
    this.tickBudget = null;
    this.handledSurfacingTimes = new Set();
    this.awaitingSurfaceDecision = null;
    this.surfaceDecision = null;
    this.routeFailureDecision = null;
    this.ignoredUpdateEvents = [];
    this.terrainDiagnostics = createTerrainSimulationDiagnostics({
      level: this.level,
      mission: this.mission,
      plan: this.plan
    });
    const samplingRules = normalizeSamplingRules(this.mission);
    const priorityTargetRules = normalizePriorityTargetRules(this.mission);
    const waterColumnConfig = normalizeWaterColumnConfig(this.mission?.waterColumnConfig ?? this.mission?.world?.waterColumnConfig ?? this.level?.world?.waterColumnConfig ?? { depthLayerIds: ['surface'], diveProfileId: 'surfaceOnly' });
    const depthScienceScoreProfile = resolveDepthScienceScoreProfile(this.level, this.mission, waterColumnConfig);
    const primaryObjective = primaryMissionObjective(this.mission);
    this.missionState = {
      level: this.level,
      mission: this.mission,
      sampled: new Set(),
      sampleHistory: new Map(),
      sampleWindows: new Set(),
      hazards: new Set(),
      duplicateSamples: new Set(),
      samplingRules,
      samplingMode: samplingRules.mode,
      samplingMetrics: {
        duplicateSamples: 0,
        depletedSamples: 0,
        cooldownSuppressedSamples: 0,
        persistentSamples: 0,
        depthAwareSamples: 0,
        verticalDuplicateSamples: 0,
        duplicateDepthScoreEvents: 0
      },
      endConditionConfig: normalizeEndCondition(this.mission),
      endConditionResult: null,
      priorityTargetRules,
      priorityTargetValueMultiplier: this.mission.scoring?.priorityTargetValueMultiplier ?? 1,
      priorityTargetMissPenalty: this.mission.scoring?.priorityTargetMissPenalty ?? 0,
      allowSharedPriorityCapture: Boolean(this.mission.scoring?.allowSharedPriorityCapture),
      capturedPriorityTargets: new Set(),
      priorityTargetDuplicateAttempts: new Set(),
      priorityTargetCaptures: [],
      priorityTargetScore: 0,
      priorityTargetMetrics: {
        captured: 0,
        duplicates: 0
      },
      planningWindow: this.level.world?.time?.planningWindow ?? this.level.world?.time?.duration ?? 1,
      roiThreshold: this.mission.rules?.roiThreshold ?? 0.15,
      samplingRadius: this.mission.rules?.samplingRadius,
      allowDuplicateSampling: samplingRules.duplicateValueMultiplier > 0 || samplingRules.mode === 'persistent',
      roiScoringMode: this.mission.rules?.roiScoringMode ?? this.level.meta?.roiScoringMode ?? 'expectedValue',
      rngSeed: this.mission.rules?.stochasticSeed ?? this.mission.rules?.rngSeed ?? this.level.meta?.seed ?? this.level.instanceId ?? this.level.levelId,
      roiOutcomes: new Map(),
      plan: this.plan,
      coordinateProfileId: this.plan?.coordinateProfileId ?? this.plan?.meta?.coordinateProfileId ?? this.mission?.meta?.coordinateProfileId ?? this.level?.meta?.coordinateProfileId ?? 'legacyIntegerCellsV1',
      fieldSamplingProfileId: this.plan?.fieldSamplingProfileId ?? this.plan?.meta?.fieldSamplingProfileId ?? this.mission?.meta?.fieldSamplingProfileId ?? this.level?.meta?.fieldSamplingProfileId ?? 'legacyNearestCellV1',
      missionDuration: this.level.world?.time?.duration ?? 0,
      waterColumnConfig,
      defaultDiveProfileId: this.mission.rules?.waterColumn?.defaultDiveProfileId ?? this.mission.waterColumnConfig?.defaultDiveProfileId ?? waterColumnConfig.diveProfileId,
      defaultTargetDepthLayerId: this.mission.rules?.waterColumn?.defaultTargetDepthLayerId ?? this.mission.waterColumnConfig?.defaultTargetDepthLayerId ?? waterColumnConfig.defaultLayerIds?.[0] ?? 'surface',
      depthScienceScoreProfile,
      scoreProfileId: depthScienceScoreProfile.scoreProfileId,
      primaryObjective,
      depthScienceObservationHistory: [],
      depthScienceEvents: [],
      depthScienceScoreEventKeys: new Set(),
      depthPriorityField: this.level.layers?.A_global_depth ?? this.level.layers?.waterColumn?.A_global_depth ?? this.level.layers?.waterColumn?.A_global ?? null,
      topDownPriorityField: this.level.layers?.A_global_topdown ?? this.level.layers?.waterColumn?.A_global_topdown ?? null,
      visibilityContext: { publicSafe: true, hiddenTruthIncluded: false }
    };
    this.driftMetrics = {
      samples: 0,
      assistSum: 0,
      oppositionSamples: 0,
      assistSamples: 0,
      crossCurrentSum: 0,
      stochasticDriftSamples: 0,
      stochasticNoiseMagnitudeSum: 0,
      seed: getDriftRules(this.mission).seed,
      stochasticDrift: getDriftRules(this.mission).stochasticDrift
    };
    if (this.resumeState) this.applyResumeState(this.resumeState);
    this.syncActiveWaypoints();
    this.updateCommsStates();
    this.logFrame();
    traceSimulation(this.trace, {
      scene: 'SimulationEngine',
      phase: 'simulation.init',
      simTime: this.t,
      message: 'Simulation engine initialized',
      details: {
        agents: this.agents.length,
        waypointCount: (this.plan?.agentPlans ?? []).reduce((sum, agentPlan) => sum + (agentPlan.waypoints?.length ?? 0), 0)
      }
    });
    if (!this.initialValidation.ok) {
      this.abortSimulation('invalidExecutionPlan', { errors: this.initialValidation.errors });
    } else if (!this.configValidation.ok) {
      this.abortSimulation('invalidSimulationConfig', { errors: this.configValidation.errors });
    }
  }

  play() {
    if (!this.complete && !this.routeFailureDecision?.active) this.running = true;
  }

  pause() {
    this.running = false;
  }

  step(dt, { force = false } = {}) {
    if ((!this.running && !force) || this.complete) return;
    if (this.routeFailureDecision?.active) {
      this.running = false;
      traceSimulation(this.trace, {
        scene: 'SimulationEngine',
        phase: 'routeFailure.required',
        simTime: this.t,
        message: 'Simulation paused for route failure decision'
      });
      return;
    }
    if (this.awaitingSurfaceDecision) {
      this.running = false;
      traceSimulation(this.trace, {
        scene: 'SimulationEngine',
        phase: 'surfacing.required',
        simTime: this.t,
        message: 'Simulation paused for surface decision'
      });
      return;
    }
    const safeDt = Number(dt);
    if (this.stepCount > MAX_PLAYBACK_STEPS) {
      this.abortSimulation('maxPlaybackStepsExceeded', { maxSteps: MAX_PLAYBACK_STEPS, t: this.t });
      return;
    }
    if (!Number.isFinite(safeDt) || safeDt < 0) {
      this.abortSimulation('invalidDt', { dt });
      return;
    }
    if (safeDt === 0) return;

    const duration = getSafeMissionDuration(this.level);
    const maxDt = getSafeStepDt(this.level) * SIMULATION_LIMITS.maxDtMultiplier;
    const boundedDt = Math.min(safeDt, maxDt);
    const tBefore = this.t;
    if (!Number.isFinite(tBefore)) {
      this.abortSimulation('invalidSimulationTime', { t: this.t });
      return;
    }
    const tAfter = Math.min(duration, this.t + boundedDt);
    const surfaceTime = shouldSurfaceAtTime(tBefore, tAfter, this.level, this.mission, this.handledSurfacingTimes);
    const stepDt = surfaceTime === null ? Math.max(0, tAfter - tBefore) : Math.max(0, surfaceTime - tBefore);
    const eventsBeforeStep = this.events.length;
    this.stepCount += 1;
    this.tickBudget = {
      events: 0,
      waypointTransitions: 0,
      missedWaypoints: 0,
      missedKeys: new Set()
    };
    traceSimulation(this.trace, {
      scene: 'SimulationEngine',
      phase: 'simulation.step.start',
      simTime: this.t,
      message: 'Starting simulation step',
      details: { dt: boundedDt, stepDt, surfaceTime }
    });

    for (const agent of this.agents) {
      const validation = validateAgentState(agent);
      if (!validation.ok) {
        this.abortSimulation(validation.reason, validation.details);
        break;
      }
      traceSimulation(this.trace, {
        scene: 'SimulationEngine',
        phase: 'agent.update.start',
        simTime: this.t,
        agentId: agent.id,
        activeWaypointIndex: agent.currentWaypointIndex,
        message: 'Updating agent'
      });
      this.stepAgent(agent, stepDt);
      if (this.routeFailureDecision?.active) break;
      traceSimulation(this.trace, {
        scene: 'SimulationEngine',
        phase: 'agent.update.end',
        simTime: this.t,
        agentId: agent.id,
        activeWaypointIndex: agent.currentWaypointIndex,
        message: 'Agent update complete',
        details: { status: agent.status, x: round(agent.x, 3), y: round(agent.y, 3) }
      });
      if (this.aborted) break;
    }
    if (this.aborted) return;
    this.tickBudget = null;

    this.t = surfaceTime === null ? tAfter : surfaceTime;
    if (!Number.isFinite(this.t) || this.t < tBefore) {
      this.abortSimulation('timeDidNotAdvanceSafely', { before: tBefore, after: this.t });
      return;
    }
    this.syncActiveWaypoints();
    for (const agent of this.agents) {
      const validation = validateAgentState(agent);
      if (!validation.ok) {
        this.abortSimulation(validation.reason, validation.details);
        return;
      }
    }
    for (const agent of this.agents) {
      this.recordTerrainDiagnosticsForAgent(agent);
      if (this.aborted) return;
    }
    this.updateCommsStates();
    if (surfaceTime !== null) this.handleSurfacing(surfaceTime);
    this.updateCompletion(duration);
    this.logFrame();
    traceSimulation(this.trace, {
      scene: 'SimulationEngine',
      phase: 'simulation.step.end',
      simTime: this.t,
      message: 'Simulation step complete',
      details: { complete: this.complete, aborted: this.aborted, eventCount: this.events.length }
    });

    if (eventsBeforeStep !== this.events.length) {
      this.logger.events = [...this.events];
    }
  }

  stepOnce() {
    this.step(getSafeStepDt(this.level), { force: true });
  }

  runUntilComplete(maxSteps = 10000) {
    maxSteps = Math.min(Number(maxSteps) || SIMULATION_LIMITS.maxRunUntilCompleteSteps, SIMULATION_LIMITS.maxRunUntilCompleteSteps);
    let steps = 0;
    let stagnantSteps = 0;
    const dt = getSafeStepDt(this.level);
    const previousIgnoreSurfacePauses = this.ignoreSurfacePauses;
    this.ignoreSurfacePauses = true;
    while (!this.complete && !this.awaitingSurfaceDecision && !this.routeFailureDecision?.active && steps < maxSteps) {
      const before = this.t;
      this.step(dt, { force: true });
      steps += 1;
      if (this.aborted) break;
      if (this.t <= before) stagnantSteps += 1;
      else stagnantSteps = 0;
      if (stagnantSteps >= 5) {
        this.abortSimulation('timeStalled', { t: this.t, dt, steps });
        break;
      }
    }
    this.ignoreSurfacePauses = previousIgnoreSurfacePauses;
    if (!this.complete && !this.aborted && steps >= maxSteps) {
      this.abortSimulation('maxStepsExceeded', { maxSteps, dt, t: this.t });
    }
  }

  stepAgent(agent, dt) {
    if (this.aborted) return;
    const activeWaypoint = getActiveWaypoint(agent, this.plan);
    agent.activeWaypoint = activeWaypoint;
    traceSimulation(this.trace, {
      scene: 'SimulationEngine',
      phase: 'waypoint.active',
      simTime: this.t,
      agentId: agent.id,
      activeWaypointIndex: agent.currentWaypointIndex,
      message: activeWaypoint ? 'Active waypoint loaded' : 'No active waypoint'
    });
    const waypointValidation = validateWaypoint(activeWaypoint);
    if (!waypointValidation.ok) {
      const missed = detectMissedWaypoint(agent, activeWaypoint, this.t, { invalidTarget: true });
      if (missed) this.recordEvent(missed);
      return;
    }
    const targetValid = isFiniteWaypoint(activeWaypoint);

    const missedBeforeMovement = detectMissedWaypoint(agent, activeWaypoint, this.t, {
      blockedTarget: targetValid ? this.world.isBlocked(activeWaypoint.x, activeWaypoint.y) : false,
      blockedCell: targetValid ? { x: Math.floor(Number(activeWaypoint.x)), y: Math.floor(Number(activeWaypoint.y)) } : null,
      outOfBounds: targetValid ? !this.isInBounds(activeWaypoint.x, activeWaypoint.y) : false,
      maxWaypointTravelTime: this.getMaxWaypointTravelTime(activeWaypoint)
    });
    if (missedBeforeMovement) {
      this.recordEvent(missedBeforeMovement);
      return;
    }

    const outcome = stepAgentToward(agent, activeWaypoint, this.world, dt, {
      t: this.t,
      mission: this.mission,
      agentPlan: this.plan?.agentPlans?.find((candidate) => candidate.agentId === agent.id) ?? null,
      driftGain: getDriftRules(this.mission).driftGain,
      energyPerCell: this.mission.physics?.energyPerCell ?? 1,
      waterColumnConfig: this.missionState.waterColumnConfig
    });
    if (outcome.invalidStep || outcome.invalidPosition) {
      this.abortSimulation(outcome.invalidStep ? 'invalidPhysicsStep' : 'invalidAgentOrWaypointPosition', {
        agentId: agent.id,
        waypointIndex: agent.currentWaypointIndex
      });
      return;
    }
    this.updateWaypointSafety(agent, activeWaypoint, dt);
    this.recordDriftMetrics(agent, activeWaypoint, outcome);
    agent.lastDepthMultiplier = outcome.depthMultiplier ?? 1;
    if (outcome.depthMultiplier && Math.abs(outcome.depthMultiplier - 1) > 0.01) {
      this.recordEvent({
        type: 'depthEnergy',
        t: this.t,
        agentId: agent.id,
        multiplier: round(outcome.depthMultiplier, 3),
        extraEnergy: round(Math.max(0, outcome.energy - outcome.baseEnergy), 4),
        energyBenefit: round(Math.max(0, outcome.baseEnergy - outcome.energy), 4)
      });
    }
    for (const event of outcome.diveEvents ?? []) {
      this.recordEvent({
        ...event,
        type: `dive_${event.type}`,
        source: 'gliderDiveStateMachine',
        waypointIndex: agent.currentWaypointIndex,
        depthMeters: event.depthMeters ?? round(agent.depthMeters ?? 0, 3),
        divePhase: agent.divePhase ?? null,
        syntheticTeachingModel: true,
        operationallyCalibrated: false
      });
    }
    for (const event of outcome.layerCrossingEvents ?? []) {
      this.recordEvent({
        ...event,
        type: 'depthLayerCrossing',
        source: 'gliderDiveStateMachine',
        waypointIndex: agent.currentWaypointIndex,
        syntheticTeachingModel: true,
        operationallyCalibrated: false
      });
    }

    if (outcome.beachingRisk?.value >= 0.5 && outcome.shorelineEnergyPenalty > 0) {
      const cellX = Math.round(agent.x);
      const cellY = Math.round(agent.y);
      const riskKey = `${agent.id}:${agent.currentWaypointIndex}:${cellX},${cellY}:shorelineRisk`;
      if (!this.missionState.hazards.has(riskKey)) {
        this.missionState.hazards.add(riskKey);
        this.recordEvent({
          type: 'shorelineRisk',
          t: this.t,
          agentId: agent.id,
          waypointIndex: agent.currentWaypointIndex,
          x: cellX,
          y: cellY,
          riskLevel: outcome.beachingRisk.level,
          riskValue: round(outcome.beachingRisk.value, 3),
          shoreDistance: round(outcome.beachingRisk.shoreDistance, 3),
          currentTowardLand: round(outcome.beachingRisk.currentTowardLand, 3),
          currentMagnitude: round(outcome.beachingRisk.currentMagnitude, 3),
          extraEnergy: round(outcome.shorelineEnergyPenalty, 4)
        });
      }
    }

    if (outcome.blocked) {
      this.recordEvent({
        type: 'blocked',
        t: this.t,
        agentId: agent.id,
        x: agent.x,
        y: agent.y,
        blockedCell: outcome.blockedCell ?? null,
        attemptedPosition: outcome.attemptedPosition ?? null
      });
    }

    const reached = advanceWaypointIfReached(agent, this.plan, agent.waypointTolerance);
    if (reached) {
      const waypointKind = normalizeWaypointKind(reached);
      const semanticEventType = waypointKindEventType(reached);
      this.recordWaypointTransition({
        type: 'waypointReached',
        t: this.t,
        agentId: agent.id,
        waypointId: reached.id,
        waypointIndex: agent.currentWaypointIndex - 1,
        waypointKind,
        semanticEventType,
        gpsFix: waypointKind === 'surface',
        canReplan: waypointKind === 'surface',
        x: reached.x,
        y: reached.y
      });
      this.recordEvent({
        type: semanticEventType,
        t: this.t,
        agentId: agent.id,
        waypointId: reached.id,
        waypointIndex: agent.currentWaypointIndex - 1,
        waypointKind,
        x: reached.x,
        y: reached.y,
        gpsFix: waypointKind === 'surface',
        canReplan: waypointKind === 'surface',
        uncertaintyCollapsed: waypointKind === 'surface',
        runtimeBehavior: waypointKind === 'terminalCarryThrough' ? 'truncate_at_mission_end' : null
      });
      if (waypointKind === 'surface') {
        agent.commsState = 'surfaced';
        agent.lastSurfaceTime = this.t;
      }
    }

    const missedAfterMovement = detectMissedWaypoint(agent, getActiveWaypoint(agent, this.plan), this.t, {
      maxWaypointTravelTime: this.getMaxWaypointTravelTime(getActiveWaypoint(agent, this.plan)),
      maxStalledSteps: SIMULATION_LIMITS.maxStalledWaypointSteps,
      maxBlockedSteps: SIMULATION_LIMITS.maxBlockedWaypointSteps,
      blockedCell: outcome.blockedCell ?? agent.lastBlockedCell ?? null,
      attemptedPosition: outcome.attemptedPosition ?? agent.lastBlockedPosition ?? null
    });
    if (missedAfterMovement) this.recordEvent(missedAfterMovement);
    trimArrayToLimit(agent.history, SIMULATION_LIMITS.maxAgentHistoryPoints);

    const samplingEvent = updateSampling(agent, this.world, this.missionState, this.t);
    if (samplingEvent) {
      this.recordEvent(samplingEvent);
      if (samplingEvent.scoreEvent) this.recordDepthScienceScoreEvent(samplingEvent.scoreEvent);
      if (Number(samplingEvent.probability ?? 1) < 1 || samplingEvent.roiScoringMode === 'realizedStochastic') {
        this.recordEvent({
          type: 'probabilityOutcome',
          t: samplingEvent.t,
          agentId: samplingEvent.agentId,
          x: samplingEvent.x,
          y: samplingEvent.y,
          value: samplingEvent.rewardValue,
          probability: samplingEvent.probability,
          expectedValue: samplingEvent.expectedValue,
          manifested: samplingEvent.manifested,
          realizedValue: samplingEvent.value,
          seed: samplingEvent.rngSeed,
          outcomeRoll: samplingEvent.outcomeRoll
        });
      }
    }

    for (const priorityEvent of checkPriorityTargetCapture(agent, this.level, this.missionState, this.t)) {
      this.recordEvent(priorityEvent);
    }

    const hazard = this.world.hazardAt(agent.x, agent.y);
    const hazardKey = `${agent.id}:${Math.floor(agent.x)},${Math.floor(agent.y)}`;
    if (hazard > 0 && !this.missionState.hazards.has(hazardKey)) {
      this.missionState.hazards.add(hazardKey);
      agent.hazardsHit += 1;
      this.recordEvent({
        type: 'hazard',
        t: this.t,
        agentId: agent.id,
        x: Math.floor(agent.x),
        y: Math.floor(agent.y),
        severity: hazard
      });
    }
    const mobileHazard = this.world.mobileHazardAt(agent.x, agent.y, this.t);
    const mobileExposure = nearestMobileHazardExposure(this.level, agent.x, agent.y, this.t);
    if (mobileExposure && mobileExposure.distance <= mobileExposure.radius + 1.25) {
      const exposureKey = `${agent.id}:${mobileExposure.id}:${Math.floor(this.t)}:near`;
      if (!this.missionState.hazards.has(exposureKey)) {
        this.missionState.hazards.add(exposureKey);
        this.recordEvent({
          type: mobileExposure.distance <= mobileExposure.radius ? 'mobileHazardExposure' : 'mobileHazardNearMiss',
          t: this.t,
          agentId: agent.id,
          hazardId: mobileExposure.id,
          distance: round(mobileExposure.distance, 3),
          radius: mobileExposure.radius
        });
      }
    }
    if (mobileHazard) {
      const mobileKey = `${agent.id}:${mobileHazard.id}:${Math.floor(this.t)}`;
      if (!this.missionState.hazards.has(mobileKey)) {
        this.missionState.hazards.add(mobileKey);
        agent.hazardsHit += 1;
        this.recordEvent({
          type: 'mobileHazard',
          t: this.t,
          agentId: agent.id,
          hazardId: mobileHazard.id,
          x: round(mobileHazard.x, 3),
          y: round(mobileHazard.y, 3),
          radius: mobileHazard.radius ?? 1,
          penalty: mobileHazard.penalty ?? this.mission.scoring?.mobileHazardPenalty ?? this.mission.scoring?.hazardPenalty ?? 10
        });
      }
    }
  }

  updateCompletion(duration) {
    if (this.routeFailureDecision?.active) {
      this.complete = false;
      this.running = false;
      return;
    }
    const allPlansDone = this.agents.every((agent) => {
      const progress = getWaypointProgress(agent, this.plan);
      if (progress.total === 0) return true;
      if (agent.currentWaypointIndex >= progress.total) {
        agent.completedPlan = true;
        if (agent.status !== 'batteryDepleted') agent.status = 'complete';
        return true;
      }
      return agent.completedPlan;
    });

    if (this.t >= duration) {
      this.recordMissionTimeExpiredWaypoints(duration);
      this.complete = true;
      this.running = false;
      return;
    }

    if (allPlansDone) {
      this.complete = true;
      this.running = false;
    }
  }

  recordMissionTimeExpiredWaypoints(duration) {
    for (const agent of this.agents) {
      let activeWaypoint = getActiveWaypoint(agent, this.plan);
      while (activeWaypoint) {
        const terminalCarryThrough = Boolean(activeWaypoint.terminalCarryThrough || activeWaypoint.intentionalOverDuration);
        const waypointKind = normalizeWaypointKind(activeWaypoint);
        const event = markWaypointMissed(agent, activeWaypoint, 'missionTimeExpired', duration, {
          finalPosition: { x: round(agent.x, 3), y: round(agent.y, 3), t: duration },
          missionDuration: duration,
          finalInstruction: terminalCarryThrough ? 'terminalCarryThrough' : null,
          finalWaypointReached: false,
          terminalCarryThrough,
          gpsFix: waypointKind === 'surface',
          canReplan: waypointKind === 'surface'
        });
        if (event) {
          event.message = terminalCarryThrough
            ? 'Mission time expired while traveling toward terminal carry-through waypoint.'
            : 'Mission time expired before this waypoint was reached.';
          event.finalPosition = { x: round(agent.x, 3), y: round(agent.y, 3), t: duration };
          event.finalInstruction = terminalCarryThrough ? 'terminalCarryThrough' : null;
          event.finalWaypointReached = false;
          event.terminalCarryThrough = terminalCarryThrough;
          event.waypointKind = waypointKind;
          event.semanticEventType = waypointKindEventType(activeWaypoint);
          this.recordEvent(event);
        }
        activeWaypoint = getActiveWaypoint(agent, this.plan);
      }
      agent.completedPlan = true;
      if (agent.status !== 'batteryDepleted') agent.status = 'complete';
    }
  }

  recordDriftMetrics(agent, waypoint, outcome = {}) {
    if (!waypoint || !outcome.current) return;
    const dx = Number(waypoint.x) - Number(agent.x);
    const dy = Number(waypoint.y) - Number(agent.y);
    const length = Math.hypot(dx, dy) || 1;
    const hx = dx / length;
    const hy = dy / length;
    const current = outcome.current;
    const along = Number(current[0] ?? 0) * hx + Number(current[1] ?? 0) * hy;
    const cross = Number(current[0] ?? 0) * -hy + Number(current[1] ?? 0) * hx;
    const noiseMagnitude = Math.hypot(Number(outcome.stochasticDriftNoise?.[0] ?? 0), Number(outcome.stochasticDriftNoise?.[1] ?? 0));
    this.driftMetrics.samples += 1;
    this.driftMetrics.assistSum += along;
    this.driftMetrics.crossCurrentSum += Math.abs(cross);
    if (along > 0.08) this.driftMetrics.assistSamples += 1;
    if (along < -0.08) this.driftMetrics.oppositionSamples += 1;
    if (noiseMagnitude > 0) {
      this.driftMetrics.stochasticDriftSamples += 1;
      this.driftMetrics.stochasticNoiseMagnitudeSum += noiseMagnitude;
    }
  }

  abortSimulation(reason, details = {}) {
    if (this.aborted) return;
    this.aborted = true;
    this.abortReason = reason;
    if (details?.watchdogSnapshot || reason === 'simulationWatchdogAbort') {
      this.debug = {
        ...(this.debug ?? {}),
        watchdogAbort: details.watchdogSnapshot ?? details
      };
    }
    if (this.missionState) {
      this.missionState.aborted = true;
      this.missionState.abortReason = reason;
      this.missionState.debug = this.debug;
    }
    this.complete = true;
    this.running = false;
    this.recordEvent({
      type: 'simulationAborted',
      t: Number.isFinite(this.t) ? this.t : 0,
      reason,
      details
    });
    const decisionReason = details?.watchdogSnapshot?.reason ?? details?.reason ?? reason;
    const routeReason = normalizeRouteFailureReason(decisionReason);
    if (isRouteFailureReason(routeReason)) {
      const stopReason = summarizeSimulationStopReason({
        agents: this.agents,
        events: this.events,
        aborted: true,
        abortReason: reason,
        complete: this.complete
      });
      const firstAgent = this.agents?.[0] ?? null;
      this.routeFailureDecision = createRouteFailureDecision({
        agent: firstAgent,
        t: this.t,
        reason: decisionReason,
        stopReason,
        abortDetails: details
      });
      this.routeFailureDecision.canSkip = false;
      this.routeFailureDecision.canContinue = false;
      this.recordEvent({
        type: 'routeFailureDecisionRequired',
        t: this.routeFailureDecision.time,
        agentId: this.routeFailureDecision.agentId,
        reason: this.routeFailureDecision.reason,
        failedWaypointIndex: this.routeFailureDecision.failedWaypointIndex,
        currentPosition: this.routeFailureDecision.currentPosition
      });
    }
    traceSimulation(this.trace, {
      scene: 'SimulationEngine',
      phase: 'abort',
      simTime: Number.isFinite(this.t) ? this.t : 0,
      message: `Simulation aborted: ${reason}`,
      details
    });
    this.trace?.warn?.(reason, { details });
  }

  updateWaypointSafety(agent, waypoint, dt) {
    if (!waypoint) {
      agent.waypointSafety = null;
      return;
    }
    const distanceToTarget = Math.hypot(Number(agent.x) - Number(waypoint.x), Number(agent.y) - Number(waypoint.y));
    const previous = agent.waypointSafety?.index === agent.currentWaypointIndex ? agent.waypointSafety : null;
    const improved = previous ? distanceToTarget < previous.bestDistance - 0.01 : true;
    agent.waypointSafety = {
      index: agent.currentWaypointIndex,
      bestDistance: improved ? distanceToTarget : previous?.bestDistance ?? distanceToTarget,
      stalledSteps: improved ? 0 : (previous?.stalledSteps ?? 0) + 1,
      elapsed: (previous?.elapsed ?? 0) + Math.max(0, Number(dt) || 0)
    };
  }

  getMaxWaypointTravelTime(waypoint) {
    if (!waypoint) return Infinity;
    const plannedT = Number(waypoint.t ?? waypoint.window);
    const planningWindow = Number(this.level.world?.time?.planningWindow ?? 3);
    if (Number.isFinite(plannedT)) return Math.max(planningWindow * 3, plannedT + planningWindow * 2 - this.t);
    return Math.max(12, planningWindow * 4);
  }

  isInBounds(x, y) {
    const grid = this.level.world?.grid ?? {};
    return Number.isFinite(Number(x))
      && Number.isFinite(Number(y))
      && Number(x) >= 0
      && Number(y) >= 0
      && Number(x) < Number(grid.width ?? 0)
      && Number(y) < Number(grid.height ?? 0);
  }

  syncActiveWaypoints() {
    for (const agent of this.agents) {
      agent.activeWaypoint = getActiveWaypoint(agent, this.plan);
    }
  }

  recordEvent(event) {
    if (!event) return;
    if (event.type === 'missedWaypoint') {
      const key = waypointEventKey(event);
      if (this.eventKeys.has(key)) return;
      this.eventKeys.add(key);
      if (this.tickBudget) {
        if (!this.consumeWaypointTransitionBudget(event)) return;
        this.tickBudget.missedWaypoints += 1;
        this.tickBudget.missedKeys.add(key);
        if (this.tickBudget.missedWaypoints > SIMULATION_LIMITS.maxMissedWaypointsPerTick) {
          this.abortSimulation('tooManyWaypointMissesInOneUpdate', {
            message: 'Simulation stopped: too many waypoint misses in one update. Revise route or reduce unreachable waypoints.',
            maxMissedWaypointsPerTick: SIMULATION_LIMITS.maxMissedWaypointsPerTick,
            missedKeys: [...this.tickBudget.missedKeys]
          });
          return;
        }
      }
    }
    if (event.type === 'waypointReached') {
      if (!this.consumeWaypointTransitionBudget(event)) return;
    }
    if (this.tickBudget && event.type !== 'simulationAborted') {
      this.tickBudget.events += 1;
      if (this.tickBudget.events > SIMULATION_LIMITS.maxEventsPerTick) {
        this.abortSimulation('tooManyEventsInOneUpdate', {
          message: 'Simulation stopped: too many events in one update. Revise route or reduce unreachable waypoints.',
          maxEventsPerTick: SIMULATION_LIMITS.maxEventsPerTick
        });
        return;
      }
    }
    this.events.push(event);
    trimArrayToLimit(this.events, SIMULATION_LIMITS.maxEvents);
    this.logger.event(event);
    trimArrayToLimit(this.logger.events, SIMULATION_LIMITS.maxEvents);
    traceSimulation(this.trace, {
      scene: 'SimulationEngine',
      phase: event.type === 'missedWaypoint'
        ? 'waypoint.missed'
        : event.type === 'waypointReached'
          ? 'waypoint.completed'
          : 'event.recorded',
      simTime: event.t ?? this.t,
      agentId: event.agentId ?? null,
      activeWaypointIndex: event.waypointIndex ?? null,
      eventType: event.type,
      message: `Recorded ${event.type}`
    });
    if (event.type === 'missedWaypoint' && event.reason !== 'missionTimeExpired' && !this.routeFailureDecision?.active) {
      this.requireRouteFailureDecision(event);
    }
  }

  recordTerrainDiagnosticsForAgent(agent) {
    if (!agent || !this.terrainDiagnostics) return;
    const result = updateTerrainSimulationDiagnostics(this.terrainDiagnostics, {
      agentId: agent.id,
      x: agent.x,
      y: agent.y,
      depthMeters: agent.depthMeters ?? 0,
      depthLayerId: agent.depthLayerId ?? null,
      divePhase: agent.divePhase ?? null,
      bottomDepthMeters: agent.bottomDepthMeters ?? null,
      bottomClearanceMeters: agent.bottomClearanceMeters ?? null,
      waypointIndex: agent.currentWaypointIndex,
      segmentIndex: Math.max(0, Number(agent.currentWaypointIndex ?? 0)),
      tick: this.stepCount,
      timeSeconds: this.t
    }, {
      level: this.level,
      mission: this.mission,
      plan: this.plan,
      tick: this.stepCount,
      timeSeconds: this.t
    });
    this.terrainDiagnostics = result.diagnostics ?? this.terrainDiagnostics;
    for (const terrainEvent of result.events ?? []) this.recordEvent(terrainEvent);
  }

  recordTerrainObservation(event, agent = null) {
    if (!this.terrainDiagnostics || !event) return;
    const result = recordTerrainSimulationObservation(this.terrainDiagnostics, {
      ...event,
      depthMeters: event.depthMeters ?? agent?.depthMeters ?? 0,
      bottomDepthMeters: event.bottomDepthMeters ?? agent?.bottomDepthMeters ?? null,
      bottomClearanceMeters: event.bottomClearanceMeters ?? agent?.bottomClearanceMeters ?? null
    }, {
      agentId: agent?.id ?? event.agentId,
      tick: this.stepCount,
      timeSeconds: this.t
    });
    this.terrainDiagnostics = result.diagnostics ?? this.terrainDiagnostics;
    for (const terrainEvent of result.events ?? []) this.recordEvent(terrainEvent);
  }

  recordWaypointTransition(event) {
    this.recordEvent(event);
  }

  recordDepthScienceScoreEvent(event) {
    if (!event) return;
    const key = event.sampleId ?? [event.agentId ?? 'agent', event.depthLayerId ?? 'surface', event.timeSeconds ?? this.t].join(':');
    this.missionState.depthScienceScoreEventKeys ??= new Set();
    if (this.missionState.depthScienceScoreEventKeys.has(key)) {
      this.missionState.samplingMetrics ??= {};
      this.missionState.samplingMetrics.duplicateDepthScoreEvents = (this.missionState.samplingMetrics.duplicateDepthScoreEvents ?? 0) + 1;
      return;
    }
    this.missionState.depthScienceScoreEventKeys.add(key);
    this.missionState.depthScienceEvents ??= [];
    this.missionState.depthScienceEvents.push(event);
    this.recordEvent(event);
  }

  requireRouteFailureDecision(event) {
    const agent = this.agents.find((candidate) => candidate.id === event.agentId) ?? null;
    const stopReason = summarizeSimulationStopReason({
      agents: this.agents,
      events: this.events,
      aborted: this.aborted,
      abortReason: this.abortReason,
      complete: this.complete
    });
    this.routeFailureDecision = createRouteFailureDecision({
      event,
      agent,
      t: this.t,
      reason: event.reason,
      stopReason
    });
    this.routeFailureDecision.plannerDiagnostics = this.buildRouteFailureDiagnostics(event, agent);
    if (this.routeFailureDecision.reason === 'routeBlocked') {
      globalThis.console?.warn?.('[Simulation][RouteBlockedAfterPlannerValidation]', this.routeFailureDecision.plannerDiagnostics);
      globalThis.console?.warn?.('[TemporalGreedy][RuntimeBlockAfterValidation]', {
        agentId: this.routeFailureDecision.plannerDiagnostics.agentId,
        lastSuccessfulWaypoint: this.routeFailureDecision.plannerDiagnostics.lastSuccessfulWaypointIndex,
        failedWaypoint: this.routeFailureDecision.plannerDiagnostics.failedWaypointIndex,
        currentPosition: this.routeFailureDecision.plannerDiagnostics.currentPosition,
        plannedFromCell: this.routeFailureDecision.plannerDiagnostics.plannedFromCell,
        targetWaypoint: this.routeFailureDecision.plannerDiagnostics.targetWaypoint,
        previousPlannerValidation: this.routeFailureDecision.plannerDiagnostics.prevalidationResult,
        playValidationResult: this.initialValidation,
        simulationBlockReason: this.routeFailureDecision.plannerDiagnostics.simulationBlockReason
      });
    }
    this.running = false;
    this.recordEvent({
      type: 'routeFailureDecisionRequired',
      t: this.routeFailureDecision.time,
      agentId: this.routeFailureDecision.agentId,
      reason: this.routeFailureDecision.reason,
      failedWaypointIndex: this.routeFailureDecision.failedWaypointIndex,
      failedWaypointId: this.routeFailureDecision.failedWaypointId,
      currentPosition: this.routeFailureDecision.currentPosition
    });
  }

  buildRouteFailureDiagnostics(event, agent) {
    const agentPlan = this.plan?.agentPlans?.find((candidate) => candidate.agentId === event?.agentId) ?? null;
    const failedWaypointIndex = Number(event?.waypointIndex ?? agent?.currentWaypointIndex ?? -1);
    const targetWaypoint = failedWaypointIndex >= 0 ? agentPlan?.waypoints?.[failedWaypointIndex] ?? null : null;
    const fromWaypoint = failedWaypointIndex > 0 ? agentPlan?.waypoints?.[failedWaypointIndex - 1] ?? null : null;
    const plannedStart = agentPlan?.selectedStart ?? agent?.history?.[0] ?? null;
    const plannedFrom = fromWaypoint ?? plannedStart;
    const currentPosition = agent ? { x: round(agent.x, 3), y: round(agent.y, 3) } : null;
    const reportedCell = event?.blockedCell ?? (agent ? { x: Math.floor(agent.x), y: Math.floor(agent.y) } : null);
    const routeBlockDiagnostic = buildRouteBlockDiagnostic({
      level: this.level,
      mission: this.mission,
      agentId: event?.agentId ?? agent?.id ?? null,
      segmentFromIndex: failedWaypointIndex > 0 ? failedWaypointIndex - 1 : null,
      segmentToIndex: failedWaypointIndex,
      plannedFrom,
      target: targetWaypoint,
      actualStartPosition: currentPosition ? { ...currentPosition, t: this.t } : null,
      reportedCell,
      reason: event?.reason ?? null,
      source: 'simulationRouteFailure'
    });
    const routeValidationDiagnostic = buildRouteValidationDiagnostic({
      type: 'segmentBlocked',
      reason: event?.reason ?? 'routeBlocked',
      severity: 'error',
      agentId: event?.agentId ?? agent?.id ?? null,
      agentLabel: agent?.label ?? event?.agentId ?? agent?.id ?? null,
      segmentIndex: failedWaypointIndex,
      waypointIndex: failedWaypointIndex,
      blockedAt: routeBlockDiagnostic?.blocking?.blockedCell ?? reportedCell,
      routeBlockDiagnostic
    });
    const prevalidationIssue = (this.initialValidation?.routeAudit?.agentResults ?? [])
      .find((result) => result.agentId === event?.agentId)
      ?.issues?.find((issue) => Number(issue.waypointIndex ?? issue.to?.index) === failedWaypointIndex) ?? null;
    return {
      agentId: event?.agentId ?? agent?.id ?? null,
      failedWaypointIndex,
      lastSuccessfulWaypointIndex: failedWaypointIndex > 0 ? failedWaypointIndex - 1 : null,
      plannedSegment: {
        fromLabel: failedWaypointIndex > 0 ? `W${failedWaypointIndex}` : 'start',
        toLabel: failedWaypointIndex >= 0 ? `W${failedWaypointIndex + 1}` : 'active waypoint'
      },
      plannedFromCell: fromWaypoint ? { x: fromWaypoint.x, y: fromWaypoint.y } : plannedStart ? { x: plannedStart.x, y: plannedStart.y } : null,
      currentPosition,
      targetWaypoint: targetWaypoint ? { x: targetWaypoint.x, y: targetWaypoint.y, t: targetWaypoint.t ?? targetWaypoint.estimatedArrivalTime ?? null } : null,
      blockReason: event?.reason ?? null,
      blockedCell: routeBlockDiagnostic?.blocking?.blockedCell ?? reportedCell,
      reportedCell,
      routeBlockDiagnostic,
      routeValidationDiagnostic,
      prevalidated: Boolean(this.initialValidation),
      prevalidationResult: prevalidationIssue
        ? {
          ok: false,
          reason: prevalidationIssue.reason ?? prevalidationIssue.type,
          message: prevalidationIssue.message,
          blockedAt: prevalidationIssue.blockedAt ?? null,
          routeBlockDiagnostic: prevalidationIssue.routeBlockDiagnostic ?? null,
          routeValidationDiagnostic: prevalidationIssue.diagnostic ?? null
        }
        : { ok: Boolean(this.initialValidation?.ok), reason: null, message: this.initialValidation?.ok ? 'Initial Play validation passed this segment.' : 'Initial Play validation had no matching segment issue.' },
      playValidationOk: Boolean(this.initialValidation?.ok),
      simulationBlockReason: event?.reason ?? null
    };
  }

  recordRouteFailureDecision(action) {
    const decision = this.routeFailureDecision;
    this.recordEvent({
      type: 'routeFailureDecision',
      t: this.t,
      action,
      agentId: decision?.agentId ?? null,
      reason: decision?.reason ?? null,
      failedWaypointIndex: decision?.failedWaypointIndex ?? null,
      currentPosition: decision?.currentPosition ?? null
    });
  }

  skipFailedWaypoint() {
    if (!this.routeFailureDecision?.active) return;
    this.recordRouteFailureDecision('skipFailedWaypoint');
    this.routeFailureDecision = null;
    this.play();
  }

  continueAfterRouteFailure() {
    if (!this.routeFailureDecision?.active) return;
    this.recordRouteFailureDecision('continueAnyway');
    this.routeFailureDecision = null;
    this.play();
  }

  clearRouteFailureForReplan() {
    if (!this.routeFailureDecision?.active) return;
    this.recordRouteFailureDecision('replanFromHere');
    this.routeFailureDecision = null;
    this.running = false;
  }

  finishFromRouteFailure() {
    if (!this.routeFailureDecision?.active) return;
    this.recordRouteFailureDecision('endMission');
    this.routeFailureDecision = null;
    this.complete = true;
    this.running = false;
  }

  consumeWaypointTransitionBudget(event) {
    if (!this.tickBudget) return true;
    this.tickBudget.waypointTransitions += 1;
    if (this.tickBudget.waypointTransitions <= SIMULATION_LIMITS.maxWaypointTransitionsPerTick) return true;
    this.abortSimulation('tooManyWaypointTransitionsInOneUpdate', {
      message: 'Simulation stopped: too many waypoint transitions in one update. Revise route or reduce unreachable waypoints.',
      maxWaypointTransitionsPerTick: SIMULATION_LIMITS.maxWaypointTransitionsPerTick,
      event
    });
    return false;
  }

  handleSurfacing(time) {
    if (!surfacingEnabled(this.mission)) return;
    traceSimulation(this.trace, {
      scene: 'SimulationEngine',
      phase: 'surfacing.check',
      simTime: time,
      message: 'Handling surfacing time'
    });
    this.handledSurfacingTimes.add(surfaceKey(time));
    const surfaced = this.agents.map((agent) => {
      agent.commsState = 'surfaced';
      agent.status = 'surfaced';
      agent.lastSurfaceTime = time;
      const event = {
        type: 'surfaced',
        t: time,
        agentId: agent.id,
        gpsFix: true,
        canReplan: true,
        uncertaintyCollapsed: true,
        expected: agent.activeWaypoint ? { x: agent.activeWaypoint.x, y: agent.activeWaypoint.y } : null,
        actual: { x: round(agent.x, 3), y: round(agent.y, 3) }
      };
      this.recordEvent(event);
      this.recordEvent({
        ...event,
        type: 'surface_update',
        reason: 'scheduledSurface'
      });
      return event;
    });

    const rules = getCommunicationRules(this.mission);
    if (this.ignoreSurfacePauses && rules.pauseOnSurface && rules.allowReplanningOnSurface && !this.complete) {
      const first = surfaced[0] ?? null;
      const ignoredEvent = {
        type: 'update_event_ignored',
        t: time,
        agentId: first?.agentId ?? null,
        window: Math.max(0, Math.round(time / Math.max(1e-6, Number(rules.surfaceInterval ?? 1)))),
        reason: 'ignoreUpdateEventsEnabled',
        agents: surfaced.map((agent) => agent.agentId)
      };
      this.ignoredUpdateEvents.push(ignoredEvent);
      this.recordEvent(ignoredEvent);
      this.updateCommsStates('submerged');
      traceSimulation(this.trace, {
        scene: 'SimulationEngine',
        phase: 'surfacing.ignored',
        simTime: time,
        agentId: first?.agentId ?? null,
        message: 'Surface/update event ignored by mission option',
        details: { agents: ignoredEvent.agents }
      });
      return;
    }

    if (!this.ignoreSurfacePauses && rules.pauseOnSurface && rules.allowReplanningOnSurface && !this.complete) {
      this.running = false;
      const first = surfaced[0] ?? null;
      this.surfaceDecision = {
        active: true,
        agentId: first?.agentId ?? null,
        time,
        expected: first?.expected ?? null,
        actual: first?.actual ?? null,
        reason: 'scheduledSurface',
        agents: surfaced,
        actions: {
          continueMission: true,
          updateWaypoints: true,
          exportObservationData: true,
          importWaypointData: true,
          finishMission: true
        }
      };
      this.awaitingSurfaceDecision = { ...this.surfaceDecision, t: time, updatePenalty: rules.updatePenalty };
      debugSurfaceDecision('surface event fired', {
        time,
        agentId: first?.agentId ?? null,
        agents: surfaced.map((agent) => agent.agentId)
      });
      this.recordEvent({
        type: 'surfaceDecisionRequired',
        t: time,
        agentId: first?.agentId ?? null,
        expected: first?.expected ?? null,
        actual: first?.actual ?? null,
        agents: surfaced.map((agent) => agent.agentId)
      });
      traceSimulation(this.trace, {
        scene: 'SimulationEngine',
        phase: 'surfacing.required',
        simTime: time,
        agentId: first?.agentId ?? null,
        message: 'Surface decision required'
      });
    }
  }

  continueFromSurface() {
    traceSimulation(this.trace, { scene: 'SimulationEngine', phase: 'surfacing.continue', simTime: this.t, message: 'Continuing from surface decision' });
    this.recordSurfaceDecision('continue');
    this.awaitingSurfaceDecision = null;
    this.surfaceDecision = null;
    this.updateCommsStates('submerged');
    for (const agent of this.agents) {
      this.recordEvent({ type: 'submerged', t: this.t, agentId: agent.id });
    }
    this.play();
  }

  recordReplanDecision() {
    const rules = getCommunicationRules(this.mission);
    traceSimulation(this.trace, { scene: 'SimulationEngine', phase: 'surfacing.update', simTime: this.t, message: 'Updating waypoints from surface decision' });
    this.recordSurfaceDecision('updateWaypoints');
    for (const agent of this.agents) {
      this.recordEvent({
        type: 'replanned',
        t: this.t,
        agentId: agent.id,
        penalty: rules.updatePenalty
      });
    }
    this.awaitingSurfaceDecision = null;
    this.surfaceDecision = null;
  }

  finishFromSurfaceDecision() {
    traceSimulation(this.trace, { scene: 'SimulationEngine', phase: 'surfacing.finish', simTime: this.t, message: 'Finishing from surface decision' });
    this.recordSurfaceDecision('finishMission');
    this.awaitingSurfaceDecision = null;
    this.surfaceDecision = null;
    this.complete = true;
    this.running = false;
  }

  recordSurfaceDecision(action) {
    recordTerrainSimulationSurfacing(this.terrainDiagnostics, { action, timeSeconds: this.t }, { tick: this.stepCount, timeSeconds: this.t });
    this.recordEvent({
      type: 'surfaceDecision',
      t: this.t,
      action,
      agents: this.awaitingSurfaceDecision?.agents?.map((agent) => agent.agentId) ?? []
    });
  }

  createResumeState() {
    return {
      t: this.t,
      agents: this.agents.map((agent) => ({ ...agent, history: [...agent.history] })),
      events: this.events.map((event) => ({ ...event })),
      loggerFrames: this.logger.frames.map((frame) => ({ ...frame })),
      handledSurfacingTimes: [...this.handledSurfacingTimes],
      surfaceDecision: this.surfaceDecision,
      awaitingSurfaceDecision: this.awaitingSurfaceDecision,
      routeFailureDecision: this.routeFailureDecision,
      terrainDiagnostics: this.terrainDiagnostics ? JSON.parse(JSON.stringify(this.terrainDiagnostics)) : null,
      missionState: {
        sampled: [...(this.missionState.sampled ?? [])],
        sampleHistory: [...(this.missionState.sampleHistory ?? new Map()).entries()],
        sampleWindows: [...(this.missionState.sampleWindows ?? [])],
        hazards: [...(this.missionState.hazards ?? [])],
        duplicateSamples: [...(this.missionState.duplicateSamples ?? [])],
        samplingRules: this.missionState.samplingRules,
        samplingMode: this.missionState.samplingMode,
        samplingMetrics: { ...(this.missionState.samplingMetrics ?? {}) },
        endConditionResult: this.missionState.endConditionResult,
        priorityTargetRules: this.missionState.priorityTargetRules,
        capturedPriorityTargets: [...(this.missionState.capturedPriorityTargets ?? [])],
        priorityTargetDuplicateAttempts: [...(this.missionState.priorityTargetDuplicateAttempts ?? [])],
        priorityTargetCaptures: [...(this.missionState.priorityTargetCaptures ?? [])],
        priorityTargetScore: this.missionState.priorityTargetScore,
        priorityTargetMetrics: { ...(this.missionState.priorityTargetMetrics ?? {}) },
        aborted: this.aborted,
        abortReason: this.abortReason,
        debug: this.debug,
        driftMetrics: { ...(this.driftMetrics ?? {}) },
        roiOutcomes: [...(this.missionState.roiOutcomes ?? new Map()).entries()],
        roiScoringMode: this.missionState.roiScoringMode,
        rngSeed: this.missionState.rngSeed
      }
    };
  }

  applyResumeState(resumeState) {
    this.t = Number(resumeState.t ?? 0);
    this.agents = (resumeState.agents ?? this.agents).map((agent) => ({
      ...agent,
      history: [...(agent.history ?? [])],
      completedWaypoints: [...(agent.completedWaypoints ?? [])],
      missedWaypoints: [...(agent.missedWaypoints ?? [])]
    }));
    this.events = [...(resumeState.events ?? [])];
    this.logger.events = [...this.events];
    this.eventKeys = new Set(this.events.filter((event) => event.type === 'missedWaypoint').map(waypointEventKey));
    this.logger.frames = [...(resumeState.loggerFrames ?? [])];
    this.handledSurfacingTimes = new Set(resumeState.handledSurfacingTimes ?? []);
    this.surfaceDecision = resumeState.surfaceDecision ?? null;
    this.awaitingSurfaceDecision = resumeState.awaitingSurfaceDecision ?? null;
    this.routeFailureDecision = resumeState.routeFailureDecision ?? null;
    this.terrainDiagnostics = resumeState.terrainDiagnostics ?? this.terrainDiagnostics;
    this.missionState.sampled = new Set(resumeState.missionState?.sampled ?? []);
    this.missionState.sampleHistory = new Map(resumeState.missionState?.sampleHistory ?? []);
    this.missionState.sampleWindows = new Set(resumeState.missionState?.sampleWindows ?? []);
    this.missionState.hazards = new Set(resumeState.missionState?.hazards ?? []);
    this.missionState.duplicateSamples = new Set(resumeState.missionState?.duplicateSamples ?? []);
    this.missionState.samplingRules = resumeState.missionState?.samplingRules ?? this.missionState.samplingRules;
    this.missionState.samplingMode = resumeState.missionState?.samplingMode ?? this.missionState.samplingMode;
    this.missionState.samplingMetrics = resumeState.missionState?.samplingMetrics ?? this.missionState.samplingMetrics;
    this.missionState.endConditionResult = resumeState.missionState?.endConditionResult ?? this.missionState.endConditionResult;
    this.missionState.priorityTargetRules = resumeState.missionState?.priorityTargetRules ?? this.missionState.priorityTargetRules;
    this.missionState.capturedPriorityTargets = new Set(resumeState.missionState?.capturedPriorityTargets ?? []);
    this.missionState.priorityTargetDuplicateAttempts = new Set(resumeState.missionState?.priorityTargetDuplicateAttempts ?? []);
    this.missionState.priorityTargetCaptures = [...(resumeState.missionState?.priorityTargetCaptures ?? [])];
    this.missionState.priorityTargetScore = Number(resumeState.missionState?.priorityTargetScore ?? this.missionState.priorityTargetScore ?? 0);
    this.missionState.priorityTargetMetrics = resumeState.missionState?.priorityTargetMetrics ?? this.missionState.priorityTargetMetrics;
    this.aborted = Boolean(resumeState.missionState?.aborted ?? this.aborted);
    this.abortReason = resumeState.missionState?.abortReason ?? this.abortReason;
    this.debug = resumeState.missionState?.debug ?? this.debug;
    this.driftMetrics = resumeState.missionState?.driftMetrics ?? this.driftMetrics;
    this.missionState.roiOutcomes = new Map(resumeState.missionState?.roiOutcomes ?? []);
    this.missionState.roiScoringMode = resumeState.missionState?.roiScoringMode ?? this.missionState.roiScoringMode;
    this.missionState.rngSeed = resumeState.missionState?.rngSeed ?? this.missionState.rngSeed;
    for (const agent of this.agents) {
      if (agent.completedPlan && agent.currentWaypointIndex < (this.plan?.agentPlans?.find((p) => p.agentId === agent.id)?.waypoints?.length ?? 0)) {
        agent.completedPlan = false;
        agent.status = 'enroute';
      }
    }
  }

  updateCommsStates(forceState = null) {
    for (const agent of this.agents) {
      agent.commsState = forceState ?? getGliderCommsState(this.t, this.mission, agent);
      if (agent.status !== 'complete' && agent.status !== 'batteryDepleted' && agent.status !== 'missedWaypoint') {
        agent.status = agent.commsState;
      }
    }
  }

  logFrame() {
    this.logger.frame(this.t, this.agents, this.getSummary());
    trimArrayToLimit(this.logger.frames, SIMULATION_LIMITS.maxLoggerFrames);
    for (const agent of this.agents) trimArrayToLimit(agent.history, SIMULATION_LIMITS.maxAgentHistoryPoints);
    if (this.stepCount > 0 && this.stepCount % 500 === 0) {
      debugSimulation('step', {
        t: this.t,
        stepCount: this.stepCount,
        complete: this.complete,
        aborted: this.aborted,
        awaitingSurfaceDecision: Boolean(this.awaitingSurfaceDecision)
      });
    }
  }

  getSummary() {
    this.missionState.endConditionResult = evaluateEndCondition({
      level: this.level,
      mission: this.mission,
      agents: this.agents,
      events: this.events
    });
    this.missionState.priorityTargets = summarizePriorityTargets(this.level, this.missionState);
    const summary = summarizeScore({
      agents: this.agents,
      events: this.events,
      t: this.t,
      scoring: this.mission.scoring,
      missionState: this.missionState,
      complete: this.complete
    });
    summary.stopReason = summarizeSimulationStopReason({
      agents: this.agents,
      events: this.events,
      aborted: this.aborted,
      abortReason: this.abortReason,
      complete: this.complete
    });
    this.missionState.stopReason = summary.stopReason;
    summary.routeFailureDecision = this.routeFailureDecision;
    this.missionState.depthScienceSummary = summary.depthScience ?? summarizeDepthAwareScoreEvents(this.missionState.depthScienceEvents ?? [], {
      waterColumnConfig: this.missionState.waterColumnConfig,
      scoreProfile: this.missionState.depthScienceScoreProfile
    });
    summary.terrainDiagnostics = terrainSimulationDiagnosticsSummary(this.terrainDiagnostics);
    publishDepthScienceDebug(this.missionState, summary);
    publishContinuousMissionDebug(this, this.missionState, summary);
    publishTerrainSimulationDebug(this.terrainDiagnostics, summary);
    return summary;
  }

  getResult() {
    finalizeTerrainSimulationDiagnostics(this.terrainDiagnostics, {
      terminalReason: this.abortReason ?? this.routeFailureDecision?.reason ?? this.missionState?.stopReason?.code ?? null
    });
    const probabilityOutcomes = summarizeProbabilityOutcomes(this.events, this.missionState);
    const riskReward = summarizeRiskReward({ events: this.events, frames: this.logger.frames, agents: this.agents });
    const summary = this.getSummary();
    const debug = {
      ...(this.debug ?? {}),
      trace: this.trace?.snapshot?.() ?? []
    };
    return {
      schemaVersion: '2.0',
      type: 'anchor.result',
      levelId: this.level.levelId,
      missionId: this.mission.missionId,
      instanceId: this.level.instanceId ?? null,
      plan: this.plan,
      summary,
      aborted: this.aborted,
      abortReason: this.abortReason,
      stopReason: summary.stopReason,
      routeFailureDecision: this.routeFailureDecision,
      debug,
      trace: this.trace?.snapshot?.() ?? [],
      surfaceDecision: this.surfaceDecision,
      endCondition: this.missionState.endConditionResult,
      missionOptions: {
        ...this.missionOptions,
        ignoredUpdateEvents: this.ignoredUpdateEvents.length
      },
      updateEventsIgnored: this.ignoredUpdateEvents.length,
      sampling: {
        config: this.missionState.samplingRules,
        mode: this.missionState.samplingMode,
        metrics: this.missionState.samplingMetrics
      },
      forecastRules: normalizeForecastRules(this.mission?.rules?.forecast ?? this.level?.meta?.generationConfig?.forecastRules ?? {}),
      agentSpecs: (this.mission?.agents ?? []).map(summarizeAgentSpecs),
      vectorField: this.level?.meta?.generationConfig?.vectorField ?? this.level?.meta?.generationConfig?.currentGenerator ?? null,
      drift: summarizeDriftMetrics(this.driftMetrics),
      priorityTargets: summarizePriorityTargets(this.level, this.missionState),
      deployment: summarizeDeployment(this.level, this.mission),
      depthScience: summary.depthScience ?? this.missionState.depthScienceSummary ?? null,
      actualTerrainDiagnostics: terrainSimulationDiagnosticsSummary(this.terrainDiagnostics),
      terrainEvents: (this.terrainDiagnostics?.events ?? []).map((event) => ({ ...event })),
      terrainDiagnosticsValidation: validateTerrainSimulationDiagnostics(this.terrainDiagnostics),
      continuousMission: continuousMissionSummary(this, this.missionState, summary),
      frames: this.logger.frames,
      events: this.events,
      probabilityOutcomes,
      riskReward,
      stochastic: {
        roiScoringMode: this.missionState.roiScoringMode,
        seed: this.missionState.rngSeed,
        expectedValue: probabilityOutcomes.plannedExpectedValue,
        realizedValue: probabilityOutcomes.realizedSampledValue,
        probabilitySuccesses: probabilityOutcomes.manifestedCount,
        probabilityMisses: probabilityOutcomes.missedManifestationCount,
        uncertainSampleCount: probabilityOutcomes.uncertainSampleCount
      },
      risk: {
        staticHazardsHit: summary.hazardsHit,
        mobileHazardContacts: riskReward.mobileHazardContacts,
        mobileHazardNearMisses: riskReward.mobileHazardNearMisses,
        mobileHazardExposure: riskReward.mobileHazardExposureCount,
        shallowExposure: riskReward.shallowDepthSteps,
        deepExposure: riskReward.deepDepthBenefitSteps,
        averageDepthEnergyMultiplier: riskReward.averageDepthEnergyMultiplier,
        depthEnergyPenalty: summary.shallowEnergyPenalty,
        mobileHazardPenalty: summary.mobileHazardPenalty
      },
      stochasticRun: {
        roiScoringMode: this.missionState.roiScoringMode,
        rngSeed: this.missionState.rngSeed,
        roiOutcomes: Object.fromEntries(this.missionState.roiOutcomes ?? new Map())
      },
      trajectories: this.agents.map((agent) => ({
        agentId: agent.id,
        history: agent.history
      })),
      scoreComponents: summary
    };
  }
}

function resolveDepthScienceScoreProfile(level, mission, waterColumnConfig) {
  const candidate = mission?.scoring?.depthScience ?? mission?.scoring?.scoreProfileId ?? mission?.meta?.scoreProfileId ?? mission?.waterColumnConfig?.scoreProfile ?? level?.world?.waterColumnConfig?.scoreProfile ?? null;
  const defaultProfileId = waterColumnConfig.depthLayerIds.length > 1 ? 'depthAwareScienceV1' : 'legacySurfaceScienceV1';
  return depthScienceScoreProfileMetadata(candidate ?? defaultProfileId, {
    defaultProfileId,
    layerSchemaVersion: waterColumnConfig.version,
    objectiveWeightProfileId: mission?.scoring?.depthScience?.objectiveWeightProfileId ?? mission?.objectiveWeightProfileId
  });
}

function primaryMissionObjective(mission = null) {
  return mission?.objectives?.[0] ?? mission?.scienceObjectives?.[0] ?? mission?.objective ?? mission?.rules?.objective ?? null;
}

function continuousMissionSummary(engine = {}, missionState = {}, summary = {}) {
  const agents = engine.agents ?? [];
  const events = engine.events ?? [];
  const waypoints = (engine.plan?.agentPlans ?? []).flatMap((agentPlan) => agentPlan.waypoints ?? []);
  const continuousWaypointCount = waypoints.filter((waypoint) => !Number.isInteger(Number(waypoint.x)) || !Number.isInteger(Number(waypoint.y))).length;
  const maxActualDepthMeters = Math.max(0, ...agents.map((agent) => Number(agent.depthMeters ?? 0)).filter(Number.isFinite), ...(events ?? []).map((event) => Number(event.depthMeters ?? 0)).filter(Number.isFinite));
  return {
    type: 'anchor.sim.continuous-mission-summary',
    version: 'continuous-mission-three-r1-2a-3',
    coordinateProfileId: missionState.coordinateProfileId ?? null,
    fieldSamplingProfileId: missionState.fieldSamplingProfileId ?? null,
    continuousWaypointCount,
    totalWaypointCount: waypoints.length,
    routeAuthority: 'horizontalWaypointsWithOptionalDiveProfiles',
    coordinateFrame: 'continuousGridV1',
    supportsFreePlacement: missionState.coordinateProfileId === 'continuousGridV1',
    usesArbitraryXYZPlanning: false,
    diveModelType: 'educationalGliderDiveKinematics',
    seaExplorerValidated: false,
    operationallyCalibrated: false,
    syntheticTeachingModel: true,
    calibratedOceanForecast: false,
    agentCount: agents.length,
    activeDivePhases: [...new Set(agents.map((agent) => agent.divePhase ?? 'surfaced'))],
    maximumActualDepthMeters: round(maxActualDepthMeters, 3),
    depthLayerCrossingEventCount: events.filter((event) => event.type === 'depthLayerCrossing').length,
    diveTransitionEventCount: events.filter((event) => String(event.type ?? '').startsWith('dive_')).length,
    sampleEventCount: events.filter((event) => event.type === 'sample').length,
    actualDepthSampleCount: events.filter((event) => event.actualDepthSample === true).length,
    scoreFinal: summary.finalScore ?? null
  };
}

function publishContinuousMissionDebug(engine = {}, missionState = {}, summary = {}) {
  globalThis.ANCHOR_CONTINUOUS_MISSION_DEBUG = continuousMissionSummary(engine, missionState, summary);
}

function publishTerrainSimulationDebug(terrainDiagnostics = {}, summary = {}) {
  const terrainSummary = summary.terrainDiagnostics ?? terrainSimulationDiagnosticsSummary(terrainDiagnostics);
  const existingDebug = globalThis.ANCHOR_TERRAIN_VALIDATION_DEBUG ?? {};
  const performanceDebug = globalThis.ANCHOR_THREE_PERFORMANCE_DEBUG ?? {};
  const validationBuildCountDuringCameraGesture = Number(existingDebug.validationBuildCountDuringCameraGesture ?? 0);
  const validationCacheHitCountDuringCameraGesture = Number(existingDebug.validationCacheHitCountDuringCameraGesture ?? 0);
  const validationInvalidationCountDuringCameraGesture = Number(existingDebug.validationInvalidationCountDuringCameraGesture ?? 0);
  const missionModelBuildCountDuringCameraGesture = Number(performanceDebug.modelBuildCountDuringCameraGesture ?? existingDebug.missionModelBuildCountDuringCameraGesture ?? 0);
  const predictionBuildCountDuringCameraGesture = Number(performanceDebug.predictionBuildCountDuringCameraGesture ?? existingDebug.predictionBuildCountDuringCameraGesture ?? 0);
  const terrainBuildCountDuringCameraGesture = Number(performanceDebug.terrainBuildCountDuringCameraGesture ?? existingDebug.terrainBuildCountDuringCameraGesture ?? 0);
  const hoverDispatchCountDuringCameraGesture = Number(existingDebug.hoverDispatchCountDuringCameraGesture ?? 0);
  const selectionDispatchCountDuringCameraGesture = Number(existingDebug.selectionDispatchCountDuringCameraGesture ?? 0);
  const suppressedClickCountAfterCameraGesture = Number(existingDebug.suppressedClickCountAfterCameraGesture ?? 0);
  const cameraGestureInvariantFailures = [];
  if (validationBuildCountDuringCameraGesture > 0) cameraGestureInvariantFailures.push('validation-build-during-camera-gesture');
  if (validationInvalidationCountDuringCameraGesture > 0) cameraGestureInvariantFailures.push('validation-invalidation-during-camera-gesture');
  if (missionModelBuildCountDuringCameraGesture > 0) cameraGestureInvariantFailures.push('mission-model-build-during-camera-gesture');
  if (predictionBuildCountDuringCameraGesture > 0) cameraGestureInvariantFailures.push('prediction-build-during-camera-gesture');
  if (terrainBuildCountDuringCameraGesture > 0) cameraGestureInvariantFailures.push('terrain-build-during-camera-gesture');
  if (hoverDispatchCountDuringCameraGesture > 0) cameraGestureInvariantFailures.push('hover-dispatch-during-camera-gesture');
  if (selectionDispatchCountDuringCameraGesture > 0) cameraGestureInvariantFailures.push('selection-dispatch-during-camera-gesture');
  globalThis.ANCHOR_TERRAIN_VALIDATION_DEBUG = {
    ...existingDebug,
    terrainEventsSupported: terrainSummary.terrainEventsSupported === true,
    actualDiagnosticsVersion: terrainSummary.version ?? null,
    minimumActualClearanceMeters: terrainSummary.minimumActualClearanceMeters ?? null,
    maximumActualDepthMeters: terrainSummary.maximumActualDepthMeters ?? null,
    terrainEventCount: terrainSummary.terrainEventSummary?.eventCount ?? 0,
    terrainEventTypes: Object.keys(terrainSummary.terrainEventSummary?.eventTypes ?? {}),
    terrainEventDuplicateSuppressionCount: terrainSummary.terrainEventSummary?.duplicateSuppressionCount ?? 0,
    actualTargetCoverageSummary: terrainSummary.actualTargetCoverage ?? null,
    terrainRelatedTerminalReason: terrainSummary.terrainRelatedTerminalReason ?? null,
    replayTerrainEventCount: globalThis.ANCHOR_REPLAY_DEBUG?.terrainEventCount ?? null,
    replayTerrainDigest: globalThis.ANCHOR_REPLAY_DEBUG?.terrainDigest ?? null,
    validationBuildCountDuringCameraGesture,
    validationCacheHitCountDuringCameraGesture,
    validationInvalidationCountDuringCameraGesture,
    lastCameraGestureValidationReason: existingDebug.lastCameraGestureValidationReason ?? null,
    missionModelBuildCountDuringCameraGesture,
    predictionBuildCountDuringCameraGesture,
    terrainBuildCountDuringCameraGesture,
    hoverDispatchCountDuringCameraGesture,
    selectionDispatchCountDuringCameraGesture,
    suppressedClickCountAfterCameraGesture,
    cameraGestureInvariantStatus: cameraGestureInvariantFailures.length ? 'FAIL' : 'PASS',
    cameraGestureInvariantFailures,
    boundaryFlags: terrainSummary.boundaryFlags ?? null
  };
}
function publishDepthScienceDebug(missionState = {}, summary = {}) {
  const depthScience = summary.depthScience ?? missionState.depthScienceSummary ?? {};
  globalThis.ANCHOR_DEPTH_SCIENCE_DEBUG = {
    version: depthScience.version ?? 'depth-aware-science-value-three-r1-2a-2',
    scoreProfileId: missionState.depthScienceScoreProfile?.scoreProfileId ?? depthScience.scoreProfileId ?? null,
    scoreProfileVersion: missionState.depthScienceScoreProfile?.scoreProfileVersion ?? depthScience.scoreProfileVersion ?? null,
    objectiveId: missionState.primaryObjective?.objectiveId ?? missionState.primaryObjective?.id ?? null,
    objectiveDepthWeightProfile: missionState.depthScienceScoreProfile?.objectiveWeightProfileId ?? null,
    selectedAgentId: null,
    selectedSegmentId: null,
    selectedDiveProfileId: missionState.defaultDiveProfileId ?? null,
    selectedTargetLayerId: missionState.defaultTargetDepthLayerId ?? null,
    segmentDistance: null,
    achievableMaximumDepthMeters: null,
    requestedMaximumDepthMeters: null,
    limitingFactor: null,
    reachableLayerIds: missionState.waterColumnConfig?.depthLayerIds ?? [],
    unreachableLayerIds: [],
    predictedSamplesByLayer: {},
    predictedScienceValueByLayer: {},
    predictedTotalScienceValue: null,
    actualSamplesByLayer: depthScience.samplesByDepthLayer ?? {},
    actualScienceValueByLayer: depthScience.scienceValueByDepthLayer ?? {},
    actualTotalScienceValue: depthScience.totalScienceScore ?? 0,
    verticalCoverage: depthScience.verticalCoverage ?? null,
    maximumActualDepthMeters: depthScience.maximumActualDepthMeters ?? 0,
    redundancyPenaltyByLayer: depthScience.redundancyPenaltyByLayer ?? {},
    informationGainByLayer: depthScience.informationGainByLayer ?? {},
    objectiveContributionByLayer: depthScience.objectiveContributionByLayer ?? {},
    canonicalScoreEventCount: depthScience.canonicalScoreEventCount ?? 0,
    uiScoreEventCount: depthScience.uiScoreEventCount ?? 0,
    duplicateScoreEventCount: depthScience.duplicateScoreEventCount ?? 0,
    browserHeadlessParityStatus: depthScience.browserHeadlessParityStatus ?? 'not_checked',
    usesActualObservationDepthForScoring: true,
    awardsIntegratedValueToSurfaceSample: false,
    usesFree3DPlanning: false,
    ownsSimulation: false,
    ownsRendering: false,
    operationallyValidated: false
  };
}

function round(value, digits) {
  return Number(Number(value).toFixed(digits));
}

function getSafeMissionDuration(level) {
  const duration = Number(level?.world?.time?.duration ?? 60);
  return Number.isFinite(duration) && duration > 0 ? duration : 60;
}

function getSafeStepDt(level) {
  const dt = Number(level?.world?.time?.dt ?? 0.25);
  return Number.isFinite(dt) && dt > 0 ? dt : 0.25;
}

function isFiniteWaypoint(waypoint) {
  return Number.isFinite(Number(waypoint?.x)) && Number.isFinite(Number(waypoint?.y));
}

function waypointEventKey(event) {
  return [
    event?.type ?? 'event',
    event?.agentId ?? 'agent',
    event?.waypointId ?? `index:${event?.waypointIndex ?? event?.index ?? 'unknown'}`
  ].join(':');
}

function summarizeDriftMetrics(metrics = {}) {
  const samples = Math.max(0, Number(metrics.samples ?? 0));
  return {
    samples,
    averageCurrentAssist: samples ? round(Number(metrics.assistSum ?? 0) / samples, 4) : 0,
    averageCrossCurrent: samples ? round(Number(metrics.crossCurrentSum ?? 0) / samples, 4) : 0,
    assistSamples: Number(metrics.assistSamples ?? 0),
    oppositionSamples: Number(metrics.oppositionSamples ?? 0),
    stochasticDrift: Boolean(metrics.stochasticDrift),
    stochasticDriftSeed: metrics.seed ?? null,
    stochasticDriftSamples: Number(metrics.stochasticDriftSamples ?? 0),
    averageStochasticNoiseMagnitude: metrics.stochasticDriftSamples
      ? round(Number(metrics.stochasticNoiseMagnitudeSum ?? 0) / Number(metrics.stochasticDriftSamples), 4)
      : 0
  };
}

function isFiniteAgent(agent) {
  return Number.isFinite(Number(agent?.x)) && Number.isFinite(Number(agent?.y));
}

function nearestMobileHazardExposure(level, x, y, time) {
  let best = null;
  for (const hazard of getMobileHazardsAtTime(level, time)) {
    const radius = Number(hazard.radius ?? 1);
    const distance = Math.hypot(x - Number(hazard.x), y - Number(hazard.y));
    if (!best || distance - radius < best.distance - best.radius) {
      best = { id: hazard.id, distance, radius };
    }
  }
  return best;
}
