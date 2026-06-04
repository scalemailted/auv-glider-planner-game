const COMMON_FIXED = {
  deploymentZones: false,
  currents: true,
  hazards: false,
  priorityTargets: false,
  stochastic: false,
  markers: false,
  multiAgent: false,
  remainingMode: false,
  travelCost: false,
  surfacing: false,
  solver: false
};

export const TUTORIAL_DEFINITIONS = [
  tutorial({
    id: 'tutorial_01_first_deployment',
    sourceLevelId: 'tutorial_01_currents',
    url: 'levels/tutorial_01_currents.json',
    title: 'Tutorial 01: First Deployment',
    difficulty: 'Beginner',
    focus: ['deployment', 'waypoints', 'execute'],
    description: 'Choose a deployment cell, place one waypoint, and execute the mission.',
    learningObjectives: ['Choose a deployment cell.', 'Place a waypoint for the selected glider.', 'Run the mission simulation.'],
    enabledFeatures: { ...COMMON_FIXED, deploymentZones: true, currents: false },
    successCriteria: { minFinalScore: 20, minSampleScore: 0.2, maxHazardsHit: 0, requiredActions: ['chooseDeployment', 'placeWaypoint', 'executeMission'] },
    prompts: [
      ['Step 1: choose a deployment cell', 'Click one highlighted drop-zone cell to lock the glider start.'],
      ['Step 2: place a waypoint', 'Click a nearby water cell in the bright sample region, then Execute.']
    ],
    mission: { deploymentMode: 'chooseFromZone', surfaceInterval: 24 }
  }),
  tutorial({
    id: 'tutorial_02_ride_current',
    sourceLevelId: 'tutorial_01_currents',
    url: 'levels/tutorial_01_currents.json',
    title: 'Tutorial 02: Ride the Current',
    difficulty: 'Beginner',
    focus: ['currents', 'drift'],
    description: 'Learn how current arrows change the actual path.',
    learningObjectives: ['Read the current vectors.', 'Place waypoints that use current assistance.'],
    enabledFeatures: { ...COMMON_FIXED, currents: true },
    successCriteria: { minFinalScore: 40, minSampleScore: 0.5, maxHazardsHit: 0, maxEnergyUsed: 80 },
    prompts: [
      ['Read the current field', 'Current arrows show water movement. With-current routes are easier to control.'],
      ['Use the flow', 'Place an intermediate waypoint downstream before turning toward the best ROI.']
    ]
  }),
  tutorial({
    id: 'tutorial_03_energy_travel_cost',
    sourceLevelId: 'tutorial_02_energy',
    url: 'levels/tutorial_02_energy.json',
    title: 'Tutorial 03: Energy and Travel Cost',
    difficulty: 'Beginner',
    focus: ['energy', 'travelCost', 'currents'],
    description: 'Compare cheap and expensive routes using Travel Cost mode.',
    learningObjectives: ['Use ROI Mode: Travel Cost.', 'Compare with-current and against-current routes.', 'Finish under the energy budget.'],
    enabledFeatures: { ...COMMON_FIXED, currents: true, travelCost: true },
    successCriteria: { minFinalScore: 45, minSampleScore: 0.45, maxHazardsHit: 0, maxEnergyUsed: 65 },
    prompts: [
      ['Switch to Travel Cost', 'Use ROI Mode until Travel Cost is visible. Cool cells are cheaper from the current planning anchor.'],
      ['Avoid fighting current', 'Against-current targets cost more fuel and may become unreachable.']
    ]
  }),
  tutorial({
    id: 'tutorial_04_time_slider',
    sourceLevelId: 'tutorial_04_long_horizon',
    url: 'levels/tutorial_04_long_horizon.json',
    title: 'Tutorial 04: Time Slider and Temporal Fields',
    difficulty: 'Beginner',
    focus: ['timeSlider', 'temporalROI', 'temporalCurrents'],
    description: 'Scrub mission time to inspect future ROI and current fields.',
    learningObjectives: ['Move the time slider.', 'Plan waypoints for later windows.', 'Use future conditions before executing.'],
    enabledFeatures: { ...COMMON_FIXED, currents: true, timeSlider: true },
    successCriteria: { minFinalScore: 50, minSampleScore: 0.6, maxHazardsHit: 1, maxEnergyUsed: 115 },
    prompts: [
      ['Scrub mission time', 'Move the bottom slider and watch ROI/current fields change.'],
      ['Plan for the future', 'Add waypoints in the window where the target is strongest.']
    ]
  }),
  tutorial({
    id: 'tutorial_05_priority_stars',
    sourceLevelId: 'tutorial_04_long_horizon',
    url: 'levels/tutorial_04_long_horizon.json',
    title: 'Tutorial 05: Priority Gold Stars',
    difficulty: 'Intermediate',
    focus: ['priorityTargets', 'timeSlider'],
    description: 'Use the time slider to chase a time-limited high-value target.',
    learningObjectives: ['Find when a Gold Star is active.', 'Route toward it before it expires.'],
    enabledFeatures: { ...COMMON_FIXED, currents: true, priorityTargets: true, timeSlider: true },
    successCriteria: { minFinalScore: 60, minSampleScore: 0.5, maxHazardsHit: 1 },
    prompts: [
      ['Find the star window', 'Gold Stars may appear later. Use the time slider before committing waypoints.'],
      ['Decide if it is worth it', 'A star is valuable, but chasing it can cost energy.']
    ]
  }),
  tutorial({
    id: 'tutorial_06_planning_markers',
    sourceLevelId: 'tutorial_04_long_horizon',
    url: 'levels/tutorial_04_long_horizon.json',
    title: 'Tutorial 06: Planning Markers / Explorer Mode',
    difficulty: 'Intermediate',
    focus: ['markers', 'hoverInspection'],
    description: 'Use Marker Mode to pin future opportunities without changing your route.',
    learningObjectives: ['Enable Marker Mode.', 'Hover cells to inspect future conditions.', 'Convert planning ideas into waypoints later.'],
    enabledFeatures: { ...COMMON_FIXED, currents: true, markers: true, timeSlider: true },
    successCriteria: { minFinalScore: 45, minSampleScore: 0.45 },
    prompts: [
      ['Use Marker Mode', 'Markers are notes, not executable waypoints. Pin a future opportunity first.'],
      ['Return to Waypoint Mode', 'After marking a target, switch back and build the route.']
    ]
  }),
  tutorial({
    id: 'tutorial_07_remaining_value',
    sourceLevelId: 'tutorial_04_long_horizon',
    url: 'levels/tutorial_04_long_horizon.json',
    title: 'Tutorial 07: Remaining Value and Duplicate Sampling',
    difficulty: 'Intermediate',
    focus: ['remainingMode', 'duplicateSampling'],
    description: 'Use Remaining mode to avoid spending route effort on already claimed value.',
    learningObjectives: ['Switch ROI Mode to Remaining.', 'Recognize cells already covered by planned routes.', 'Avoid duplicate samples.'],
    enabledFeatures: { ...COMMON_FIXED, currents: true, remainingMode: true, timeSlider: true },
    successCriteria: { minFinalScore: 55, minSampleScore: 0.55 },
    prompts: [
      ['Use Remaining mode', 'Remaining shows value still available after your planned route is considered.'],
      ['Avoid duplicates', 'If a planned waypoint already claims a cell, send later waypoints somewhere else.']
    ]
  }),
  tutorial({
    id: 'tutorial_08_hazards_blocked_routes',
    sourceLevelId: 'tutorial_03_hazards',
    url: 'levels/tutorial_03_hazards.json',
    title: 'Tutorial 08: Hazards and Blocked Routes',
    difficulty: 'Intermediate',
    focus: ['hazards', 'blockedRoutes', 'stopReasons'],
    description: 'Diagnose route failures and revise around hazards or terrain.',
    learningObjectives: ['Identify hazard cells.', 'Route around blocked segments.', 'Use stop reason feedback after failure.'],
    enabledFeatures: { ...COMMON_FIXED, currents: true, hazards: true },
    successCriteria: { minFinalScore: 35, minSampleScore: 0.4, maxHazardsHit: 0, maxEnergyUsed: 90 },
    prompts: [
      ['Route around danger', 'A direct route through hazards can score poorly or fail. Use intermediate waypoints.'],
      ['Read failure notes', 'If simulation stops early, Debrief explains the first failed waypoint.']
    ]
  }),
  tutorial({
    id: 'tutorial_09_surfacing_replanning',
    sourceLevelId: 'tutorial_04_long_horizon',
    url: 'levels/tutorial_04_long_horizon.json',
    title: 'Tutorial 09: Surfacing and Replanning',
    difficulty: 'Intermediate',
    focus: ['surfacing', 'replanning'],
    description: 'Let the glider surface, then update waypoints from its actual position.',
    learningObjectives: ['Recognize surfacing windows.', 'Choose Update Waypoints after surfacing.', 'Continue from actual surfaced position.'],
    enabledFeatures: { ...COMMON_FIXED, currents: true, surfacing: true, timeSlider: true },
    successCriteria: { minFinalScore: 45, minSampleScore: 0.45 },
    prompts: [
      ['Watch surface windows', 'The timeline marks surfacing opportunities. Simulation can pause there.'],
      ['Update after surfacing', 'Use the surfaced position as your new planning anchor.']
    ],
    mission: { surfaceInterval: 3 }
  }),
  tutorial({
    id: 'tutorial_10_multi_agent',
    sourceLevelId: 'tutorial_04_long_horizon',
    url: 'levels/tutorial_04_long_horizon.json',
    title: 'Tutorial 10: Multi-Agent Coordination',
    difficulty: 'Advanced',
    focus: ['multiAgent', 'remainingMode'],
    description: 'Divide work between two gliders and avoid duplicate coverage.',
    learningObjectives: ['Switch between agent tabs.', 'Give each glider a different route.', 'Use Remaining mode to avoid overlap.'],
    enabledFeatures: { ...COMMON_FIXED, currents: true, multiAgent: true, remainingMode: true, timeSlider: true },
    successCriteria: { minFinalScore: 70, minSampleScore: 0.6 },
    prompts: [
      ['Use agent tabs', 'Each glider has its own waypoint list. Select a glider before placing waypoints.'],
      ['Divide the map', 'Use Remaining mode to see what the fleet plan has already covered.']
    ],
    mission: { agentCount: 2 }
  }),
  tutorial({
    id: 'tutorial_11_stochastic_forecast',
    sourceLevelId: 'tutorial_05_forecast',
    url: 'levels/tutorial_05_forecast.json',
    title: 'Tutorial 11: Stochastic Forecast',
    difficulty: 'Advanced',
    focus: ['stochastic', 'probability', 'expectedValue'],
    description: 'Plan with probability and expected value when truth is hidden.',
    learningObjectives: ['Use Probability and Expected ROI modes.', 'Treat forecast as useful but imperfect.', 'Aim for robust score.'],
    enabledFeatures: { ...COMMON_FIXED, currents: true, stochastic: true, probabilityModes: true },
    successCriteria: { minFinalScore: 30, minSampleScore: 0.35, maxHazardsHit: 1, maxEnergyUsed: 110 },
    prompts: [
      ['Use probability', 'Probability shows how likely a sample opportunity is. Expected combines probability and value.'],
      ['Plan robustly', 'Simulation scores against hidden truth, not the visible forecast.']
    ],
    mode: 'forecast'
  }),
  tutorial({
    id: 'tutorial_12_forecast_decay',
    sourceLevelId: 'tutorial_05_forecast',
    url: 'levels/tutorial_05_forecast.json',
    title: 'Tutorial 12: Forecast Horizon Decay',
    difficulty: 'Advanced',
    focus: ['forecastDecay', 'surfacing', 'confidence'],
    description: 'Future forecasts become less reliable; plan to re-check after surfacing.',
    learningObjectives: ['Inspect confidence at later times.', 'Notice wider guidance under low confidence.', 'Avoid overcommitting to uncertain long-horizon targets.'],
    enabledFeatures: { ...COMMON_FIXED, currents: true, stochastic: true, probabilityModes: true, surfacing: true, timeSlider: true },
    successCriteria: { minFinalScore: 35, minSampleScore: 0.35 },
    prompts: [
      ['Confidence decays', 'Hover future cells and compare forecast confidence against earlier windows.'],
      ['Plan to re-evaluate', 'Use surfacing windows to update the route instead of trusting a far-future forecast.']
    ],
    mode: 'forecast',
    mission: { surfaceInterval: 3, forecastDecay: true }
  }),
  tutorial({
    id: 'tutorial_13_full_mission_challenge',
    sourceLevelId: 'tutorial_05_forecast',
    url: 'levels/tutorial_05_forecast.json',
    title: 'Tutorial 13: Full Mission Challenge',
    difficulty: 'Challenge',
    focus: ['integratedMission'],
    description: 'Combine deployment, currents, energy, hazards, markers, stars, surfacing, and forecast uncertainty.',
    learningObjectives: ['Integrate the full planning loop.', 'Balance ROI, energy, hazards, and uncertainty.', 'Review debrief and improve.'],
    enabledFeatures: { deploymentZones: true, currents: true, hazards: true, priorityTargets: true, stochastic: true, markers: true, multiAgent: false, remainingMode: true, travelCost: true, surfacing: true, solver: true, probabilityModes: true, timeSlider: true },
    successCriteria: { minFinalScore: 55, minSampleScore: 0.45, maxHazardsHit: 1 },
    prompts: [
      ['Use every planning layer', 'Switch ROI modes, inspect confidence, and use markers before committing the route.'],
      ['Debrief and improve', 'Run once, read the debrief, then revise the plan.']
    ],
    mode: 'forecast',
    mission: { forecastDecay: true, surfaceInterval: 3 }
  }),
  tutorial({
    id: 'tutorial_14_import_export_workflow',
    sourceLevelId: 'tutorial_05_forecast',
    url: 'levels/tutorial_05_forecast.json',
    title: 'Tutorial 14: Import / Export Workflow',
    difficulty: 'Intermediate',
    focus: ['importedPlan', 'routeValidation', 'solverWorkflow'],
    description: 'Load a premade waypoint plan from JSON, validate the route, and execute it.',
    learningObjectives: ['Load a built-in demo waypoint plan.', 'Inspect imported waypoints on the map, timeline, and waypoint panel.', 'Validate and execute an imported solver-style route.'],
    enabledFeatures: { ...COMMON_FIXED, currents: true, stochastic: true, probabilityModes: true, solver: true, timeSlider: true, importDemo: true },
    successCriteria: { minFinalScore: 35, minSampleScore: 0.35, maxHazardsHit: 0, requiredActions: ['importPlan', 'executeMission'] },
    prompts: [
      ['Load the demo plan', 'Use Import Demo to load tutorials/import-demo/import-demo-waypoints.json. The JSON file will create route waypoints automatically.'],
      ['Inspect before execution', 'Check the right waypoint panel, timeline arrivals, and route validation status before running the mission.'],
      ['Execute the imported route', 'Run the mission and compare the debrief against a manual route or future solver outputs.']
    ],
    mode: 'forecast',
    mission: { surfaceInterval: 24 },
    importDemo: {
      planUrl: 'tutorials/import-demo/import-demo-waypoints.json',
      challengeUrl: 'tutorials/import-demo/import-demo-challenge.json',
      planFilename: 'import-demo-waypoints.json',
      label: 'Tutorial Demo Plan'
    }
  })
];

function tutorial(config) {
  return {
    mode: 'perfectKnowledge',
    ...config,
    label: config.title,
    campaign: {
      order: Number(config.id.match(/tutorial_(\d+)/)?.[1] ?? 0),
      concept: config.description,
      difficulty: config.difficulty,
      focus: config.focus,
      learningObjectives: config.learningObjectives,
      successCriteria: config.successCriteria,
      ratings: {
        bronze: config.successCriteria?.minFinalScore ?? config.successCriteria?.minScore ?? 30,
        silver: (config.successCriteria?.minFinalScore ?? config.successCriteria?.minScore ?? 30) + 25,
        gold: (config.successCriteria?.minFinalScore ?? config.successCriteria?.minScore ?? 30) + 50,
        perfect: (config.successCriteria?.minFinalScore ?? config.successCriteria?.minScore ?? 30) + 80
      }
    },
    tutorial: {
      difficulty: config.difficulty,
      focus: config.focus,
      description: config.description,
      enabledFeatures: config.enabledFeatures,
      planningPrompts: (config.prompts ?? []).map(([title, body]) => ({ title, body })),
      importDemo: config.importDemo ?? null
    }
  };
}

export function getTutorialDefinition(id) {
  return TUTORIAL_DEFINITIONS.find((tutorial) => tutorial.id === id) ?? null;
}
