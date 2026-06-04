import { expect, test } from '@playwright/test';
import { startStaticServer } from './static-server.mjs';

let server;

test.beforeAll(async () => {
  server = await startStaticServer({ port: 9321 });
});

test.afterAll(async () => {
  await new Promise((resolve) => server?.close(resolve));
});

test('campaign planning smoke flow reaches debrief', async ({ page }) => {
  await page.goto('/');

  await expect(page).toHaveTitle(/ANCHOR: Glider Command/);
  await expect.poll(() => page.evaluate(() => window.anchorGame?.phaser?.scene.getScene('MainMenuScene')?.sys.isActive() ?? false)).toBe(true);
  await expect(page.locator('#top-nav')).toHaveCount(0);
  await expect(page.locator('#left-panel')).toHaveCount(0);
  await expect(page.locator('#right-panel')).toHaveCount(0);
  await expect(page.locator('#context-panel')).toBeEmpty();
  await expect(page.locator('#mission-console')).toContainText('ANCHOR: Glider Command');
  await expect(page.locator('#mission-console button.console-button')).toHaveCount(7);
  await expect(page.locator('#mission-console .accordion-header')).toHaveCount(1);
  await expect(page.locator('#mission-console .console-status')).toContainText('No mission loaded');
  await expect(page.locator('canvas')).toBeVisible();
  await expect(page.evaluate(() => {
    const scene = window.anchorGame.phaser.scene.getScene('MainMenuScene');
    const width = Number(scene.scale.width);
    const height = Number(scene.scale.height);
    const texts = (scene.objects ?? []).filter((object) => object.type === 'Text');
    return {
      textCount: texts.length,
      awaitingVisible: texts.some((object) => object.text === 'Awaiting Mission Launch'),
      allTextInsideCenterCanvas: texts.every((object) => {
        const bounds = object.getBounds();
        return bounds.left >= -1
          && bounds.right <= width + 1
          && bounds.top >= -1
          && bounds.bottom <= height + 1;
      })
    };
  })).resolves.toMatchObject({
    awaitingVisible: true,
    allTextInsideCenterCanvas: true
  });
  await expect(page.evaluate(() => {
    const left = document.getElementById('mission-console').getBoundingClientRect();
    const center = document.getElementById('game-root').getBoundingClientRect();
    const right = document.getElementById('waypoint-timeline').getBoundingClientRect();
    const canvas = document.querySelector('#game-root canvas').getBoundingClientRect();
    return {
      centerAfterLeft: center.left >= left.right - 1,
      centerBeforeRight: center.right <= right.left + 1,
      canvasInsideCenter: canvas.left >= center.left - 1
        && canvas.right <= center.right + 1
        && canvas.top >= center.top - 1
        && canvas.bottom <= center.bottom + 1,
      canvasStartsAtTop: Math.abs(canvas.top - center.top) <= 1,
      canvasFillsCenter: Math.abs(canvas.width - center.width) <= 1
        && Math.abs(canvas.height - center.height) <= 1,
      noHorizontalOverflow: document.documentElement.scrollWidth <= window.innerWidth + 1
    };
  })).resolves.toEqual({
    centerAfterLeft: true,
    centerBeforeRight: true,
    canvasInsideCenter: true,
    canvasStartsAtTop: true,
    canvasFillsCenter: true,
    noHorizontalOverflow: true
  });
  await expect(page.evaluate(() => window.anchorGame.phaser.scene.getScene('MainMenuScene').buttons?.length ?? 0)).resolves.toBe(0);

  await page.evaluate(() => window.anchorGame.phaser.scene.getScene('MainMenuScene').startCampaignLevel('tutorial_01_first_deployment'));
  await expect.poll(() => page.evaluate(() => window.anchorGame.state.level?.levelId)).toBe('tutorial_01_first_deployment');
  await expect.poll(() => page.evaluate(() => window.anchorGame.phaser.scene.getScene('MissionBriefingScene').sys.isActive())).toBe(true);
  await expect(page.locator('#mission-console')).toContainText('Scenario Start');
  await expect(page.locator('#mission-console')).toContainText('Start Planning');
  await expect(page.locator('#mission-console')).toContainText('Spatial domain remains hidden');
  await expect(page.locator('#waypoint-timeline')).toContainText('Waypoint plan will appear after Planning begins');
  await expect(page.locator('#waypoint-timeline')).toContainText('tactical map');
  await expect(page.locator('#context-panel')).toBeEmpty();
  await expect(page.locator('#waypoint-panel')).toBeEmpty();
  await expect(page.locator('#timeline-panel')).toBeEmpty();
  await expectCenterShellContained(page);
  await expectCenterPanelUsesAvailableSpace(page);
  await startPlanningFromBriefing(page);
  await expect(page.locator('#mission-console')).toContainText('Main Menu');
  await expect(page.evaluate(() => {
    const canvas = document.getElementById('game-canvas').getBoundingClientRect();
    const timeline = document.getElementById('bottom-timeline').getBoundingClientRect();
    const layout = window.anchorGame.adapter.layout;
    const scaleY = canvas.height / document.getElementById('game-canvas').height;
    const scaleX = canvas.width / document.getElementById('game-canvas').width;
    const mapBottom = canvas.top + (layout.oy + layout.height * layout.cell) * scaleY;
    return {
      squareCells: Math.abs((layout.cell * scaleX) - (layout.cell * scaleY)) <= 1,
      mapAboveTimeline: mapBottom <= timeline.top + 1,
      mapTimelineGap: Math.round(timeline.top - mapBottom)
    };
  })).resolves.toMatchObject({
    squareCells: true,
    mapAboveTimeline: true
  });

  await clickCell(page, 1, 1);
  await expect.poll(() => page.evaluate(() => window.anchorGame.state.mission?.agents?.[0]?.deployment?.selectedStart)).toEqual({ x: 1, y: 1 });
  await clickCell(page, 5, 2);
  await expectWaypointCount(page, 1);
  await expect(page.evaluate(() => {
    const state = window.anchorGame.state;
    const scene = window.anchorGame.phaser.scene.getScene('MissionWorkspaceScene');
    return import('./src/core/planning/RouteSegmentBuilder.js').then(({ buildRouteSegmentsForAgent }) => {
      const agentPlan = state.plan.agentPlans[0];
      const agent = state.mission.agents.find((candidate) => candidate.id === agentPlan.agentId);
      return buildRouteSegmentsForAgent({
        level: state.level,
        mission: state.mission,
        agent,
        agentPlan,
        surfacedAgents: state.surfacedAgents,
        planningAnchor: state.ui.planningAnchor
      }).segments[0]?.kind;
    });
  })).resolves.toBe('startToWaypoint');

  await page.evaluate(() => window.anchorGame.phaser.scene.getScene('MissionWorkspaceScene').clearSelectedAgentPlan());
  await expectWaypointCount(page, 0);

  await clickCell(page, 5, 2);
  await expectWaypointCount(page, 1);

  await page.evaluate(() => window.anchorGame.phaser.scene.getScene('MissionWorkspaceScene').setPlanningTime(6));
  await expect(page.evaluate(() => window.anchorGame.state.selectedWindow)).resolves.toBe(1);

  await clickCell(page, 5, 3);
  await expectWaypointCount(page, 2);
  await expect(page.evaluate(() => {
    const waypoint = window.anchorGame.state.plan.agentPlans[0].waypoints[1];
    return Number.isFinite(waypoint.estimatedArrivalTime)
      && Number.isFinite(waypoint.segmentEnergy)
      && Number.isFinite(waypoint.cumulativeEnergy)
      && Number.isFinite(waypoint.segmentTravelTime)
      && Number.isFinite(waypoint.arrivalUncertainty?.radiusX)
      && window.anchorGame.state.planningTime === waypoint.estimatedArrivalTime;
  })).resolves.toBe(true);
  await expect(page.evaluate(() => {
    const slider = document.querySelector('#bottom-timeline [data-action="time-slider"]');
    return Math.abs(Number(slider?.value) - window.anchorGame.state.planningTime) < 1e-9;
  })).resolves.toBe(true);

  await page.locator('#mission-console [data-action="execute"]').click();
  await expect.poll(() => page.evaluate(() => window.anchorGame.phaser.scene.getScene('SimulationScene').sys.isActive())).toBe(true);
  await expect(page.evaluate(() => ({
    mode: window.anchorGame.state.mode,
    planningAnchor: window.anchorGame.state.ui.planningAnchor,
    hoverCell: window.anchorGame.state.ui.hoverCell,
    selectedWaypoint: window.anchorGame.state.ui.selectedWaypoint,
    overlayDebug: window.anchorGame.state.ui.overlayDebug
  }))).resolves.toMatchObject({
    mode: 'simulation',
    planningAnchor: null,
    hoverCell: null,
    selectedWaypoint: null,
    overlayDebug: {
      shouldRenderPlanningGuidance: false
    }
  });

  await page.evaluate(() => {
    const scene = window.anchorGame.phaser.scene.getScene('SimulationScene');
    for (let index = 0; index < 6 && !scene.engine.awaitingSurfaceDecision; index += 1) scene.stepOnce();
    scene.refreshSurfaceDecision();
  });
  await expect(page.evaluate(() => window.anchorGame.phaser.scene.getScene('SimulationScene').sys.isActive())).resolves.toBe(true);

  await page.evaluate(() => {
    const scene = window.anchorGame.phaser.scene.getScene('SimulationScene');
    scene.finishSimulation();
    scene.goDebrief();
  });
  await expect.poll(() => page.evaluate(() => window.anchorGame.phaser.scene.getScene('DebriefScene').sys.isActive())).toBe(true);
  await expect(page.locator('body')).not.toHaveClass(/debrief-fullscreen/);
  await expect(page.locator('#debrief-root')).toBeVisible();
  await expect(page.locator('#debrief-root h1')).toHaveText('Mission Debrief');
  await expect(page.locator('#debrief-root .debrief-header p').first()).toBeVisible();
  await expect(page.locator('#debrief-root .debrief-metric-card')).toHaveCount(8);
  await expect(page.locator('#debrief-root [data-action]')).toHaveCount(0);
  await expect(page.locator('#mission-console')).toContainText('Debrief Console');
  await expect(page.locator('#mission-console [data-action="revise"]')).toBeVisible();
  await expect(page.locator('#mission-console [data-action="export-result"]')).toBeVisible();
  await expect(page.locator('#mission-console [data-action="export-aar"]')).toBeVisible();
  await expect(page.locator('#mission-console [data-action="export-compare"]')).toBeVisible();
  await expect(page.locator('#waypoint-timeline')).toBeVisible();
  await expect(page.locator('#waypoint-timeline')).toContainText('Mission Waypoints');
  await expect(page.locator('#context-panel')).toBeEmpty();
  await expect(page.evaluate(() => ({
    mode: window.anchorGame.state.mode,
    planningAnchor: window.anchorGame.state.ui.planningAnchor,
    hoverCell: window.anchorGame.state.ui.hoverCell,
    selectedWaypoint: window.anchorGame.state.ui.selectedWaypoint
  }))).resolves.toEqual({
    mode: 'debrief',
    planningAnchor: null,
    hoverCell: null,
    selectedWaypoint: null
  });
  await expect(page.evaluate(() => window.anchorGame.state.result?.comparison?.rows?.length)).resolves.toBeGreaterThan(0);
  await page.locator('#mission-console [data-action="revise"]').click();
  await expect.poll(() => page.evaluate(() => window.anchorGame.phaser.scene.getScene('MissionWorkspaceScene').sys.isActive())).toBe(true);
  await expect(page.locator('#debrief-root')).toHaveCount(0);
  await expect(page.locator('body')).not.toHaveClass(/debrief-fullscreen/);
});

test('scenario setup stays inside the center viewport', async ({ page }) => {
  await page.goto('/');
  await expect.poll(() => page.evaluate(() => window.anchorGame?.phaser?.scene.getScene('MainMenuScene')?.sys.isActive() ?? false)).toBe(true);

  await page.evaluate(() => window.anchorGame.phaser.scene.getScene('MainMenuScene').openChallengeSetup('perfectKnowledge'));
  await expect.poll(() => page.evaluate(() => window.anchorGame.phaser.scene.getScene('MissionBriefingScene').sys.isActive())).toBe(true);
  await expect(page.locator('#mission-console')).toContainText('Scenario Setup');
  await expect(page.locator('#waypoint-timeline')).toContainText('Mission Waypoints');
  await expectCenterShellContained(page);
  await expectCenterPanelUsesAvailableSpace(page);
});

test('level generator opens from main menu', async ({ page }) => {
  await page.goto('/');
  await expect.poll(() => page.evaluate(() => window.anchorGame?.phaser?.scene.getScene('MainMenuScene')?.sys.isActive() ?? false)).toBe(true);

  await page.evaluate(() => window.anchorGame.phaser.scene.start('EnvironmentEditorScene'));
  await expect(page.getByRole('heading', { name: 'Environment Editor' })).toBeVisible();
  await expect(page.locator('canvas')).toBeVisible();
  await expect.poll(() => page.evaluate(() => window.anchorGame.phaser.scene.getScene('EnvironmentEditorScene').editorHud?.activeGroup)).toBe('terrain');
  await expect(page.getByRole('button', { name: 'Generate Level' })).toBeVisible();
  await expect(page.locator('#ensemble-count')).toBeVisible();
  await expect(page.locator('#mobile-hazards-count')).toBeVisible();
  await expect(page.locator('#current-tool')).toBeVisible();
  await expect(page.locator('#editor-frame')).toBeVisible();
  await expect(page.locator('#waypoint-timeline')).toContainText('Editor Context');
  await expect(page.locator('#context-panel')).toBeEmpty();
  await expect(page.locator('#current-preview-summary')).toContainText('Frame 1 /');
  await expect(page.locator('#current-preview-summary')).toContainText('Apply To Level commits all');
  await expect(page.evaluate(() => window.anchorGame.phaser.scene.getScene('EnvironmentEditorScene').currentPreview.frames.length)).resolves.toBeGreaterThan(1);
  await page.evaluate(() => {
    const scene = window.anchorGame.phaser.scene.getScene('EnvironmentEditorScene');
    scene.setPreviewFrame(Math.min(2, scene.currentPreview.frames.length - 1));
  });
  await expect(page.evaluate(() => window.anchorGame.phaser.scene.getScene('EnvironmentEditorScene').currentPreview.selectedFrameIndex)).resolves.toBeGreaterThan(0);
  await page.evaluate(() => {
    const scene = window.anchorGame.phaser.scene.getScene('EnvironmentEditorScene');
    scene.setBrushSettingFromHud('radius', 4);
    scene.setBrushSettingFromHud('intensity', 1.2);
  });
  await expect(page.evaluate(() => window.anchorGame.phaser.scene.getScene('EnvironmentEditorScene').readBrushConfig().radius)).resolves.toBe(4);
  await expect(page.locator('#brush-radius')).toHaveValue('4');
  await expect(page.locator('#brush-intensity')).toHaveValue('1.2');
});

test('deterministic challenge generates a fresh perfect-knowledge level', async ({ page }) => {
  await page.goto('/');

  await page.evaluate(() => window.anchorGame.phaser.scene.getScene('MainMenuScene').startRandomChallenge('perfectKnowledge'));
  await expect.poll(() => page.evaluate(() => window.anchorGame.state.level?.meta?.name?.startsWith('Deterministic Challenge'))).toBe(true);
  await expect.poll(() => page.evaluate(() => window.anchorGame.phaser.scene.getScene('MissionBriefingScene').sys.isActive())).toBe(true);
  await expect(page.evaluate(() => window.anchorGame.state.currentScenario?.source)).resolves.toBe('deterministicChallenge');
  await expect(page.evaluate(() => window.anchorGame.state.level?.instanceId)).resolves.toBeTruthy();
  await expect(page.evaluate(() => window.anchorGame.state.level?.meta?.seed)).resolves.toBeTruthy();
  await expect(page.evaluate(() => window.anchorGame.state.challengeMode)).resolves.toBe('perfectKnowledge');
  await expect(page.evaluate(() => window.anchorGame.state.level.layers.truth.frames.length)).resolves.toBeGreaterThan(0);
  await expect(page.evaluate(() => {
    const frames = window.anchorGame.state.level.layers.truth.frames;
    return JSON.stringify(frames[0]?.roi) !== JSON.stringify(frames[3]?.roi)
      && JSON.stringify(frames[0]?.current) !== JSON.stringify(frames[3]?.current);
  })).resolves.toBe(true);
});

test('load level json imports a level and offers play/edit actions', async ({ page }) => {
  await page.goto('/');

  await page.evaluate(() => window.anchorGame.phaser.scene.start('LoadLevelJsonScene'));
  await expect.poll(() => page.evaluate(() => window.anchorGame.phaser.scene.getScene('LoadLevelJsonScene').sys.isActive())).toBe(true);
  await expect(page.locator('#context-panel')).toBeEmpty();
  await page.evaluate(async () => {
    const response = await fetch('levels/tutorial_01_currents.json');
    const data = await response.json();
    window.anchorGame.phaser.scene.getScene('LoadLevelJsonScene').importLevelData(data);
  });
  await expect(page.evaluate(() => window.anchorGame.phaser.scene.getScene('LoadLevelJsonScene').level?.levelId)).resolves.toBe('tutorial_01_currents');
  await expect(page.evaluate(() => window.anchorGame.phaser.scene.getScene('LoadLevelJsonScene').objects?.length)).resolves.toBeGreaterThan(0);
});

test('stochastic mode exposes ensemble and risk controls', async ({ page }) => {
  await page.goto('/');

  await page.evaluate(() => window.anchorGame.phaser.scene.getScene('MainMenuScene').startRandomChallenge('forecast'));
  await expect.poll(() => page.evaluate(() => window.anchorGame.state.level?.meta?.name?.startsWith('Stochastic Challenge'))).toBe(true);
  await expect.poll(() => page.evaluate(() => window.anchorGame.phaser.scene.getScene('MissionBriefingScene').sys.isActive())).toBe(true);
  await expect(page.evaluate(() => window.anchorGame.state.level.layers.forecasts.length)).resolves.toBe(3);
  await expect(page.evaluate(() => {
    const level = window.anchorGame.state.level;
    return JSON.stringify(level.layers.truth.frames[0]?.roi) !== JSON.stringify(level.layers.truth.frames[3]?.roi)
      && JSON.stringify(level.layers.forecasts[0].frames[0]?.current) !== JSON.stringify(level.layers.forecasts[0].frames[3]?.current);
  })).resolves.toBe(true);
  await expect(page.evaluate(() => window.anchorGame.state.ui.forecastMemberId)).resolves.toBe('ensemble_mean');
  await expect(page.evaluate(() => window.anchorGame.state.ui.roiViewMode)).resolves.toBe('expectedValue');
  await startPlanningFromBriefing(page);
  await expect(page.locator('#mission-summary-hud')).toContainText('Deploy');
  await expect(page.locator('#waypoint-timeline')).toContainText('Start: not selected');
  await expect(page.evaluate(() => import('./src/core/deployment/DeploymentZones.js').then(({ getSelectedStart }) => {
    const scene = window.anchorGame.phaser.scene.getScene('MissionWorkspaceScene');
    const agent = window.anchorGame.state.mission.agents[0];
    return {
      selectedStart: getSelectedStart(agent),
      agentStart: agent.start ?? null,
      gliderHitTargets: scene.gliderObjects?.length ?? 0,
      fallbackDropZoneLabels: (scene.labelObjects ?? []).filter((object) => object.text === 'Drop zone').length
    };
  }))).resolves.toEqual({
    selectedStart: null,
    agentStart: null,
    gliderHitTargets: 0,
    fallbackDropZoneLabels: 0
  });
  await expect(page.evaluate(() => import('./src/core/planning/PlanningGuidance.js').then(({ buildPlanningGuidance }) => buildPlanningGuidance({
    level: window.anchorGame.state.level,
    mission: window.anchorGame.state.mission,
    plan: window.anchorGame.state.plan,
    selectedAgentId: window.anchorGame.state.selectedAgentId,
    time: window.anchorGame.state.planningTime,
    challengeMode: window.anchorGame.state.challengeMode,
    forecastMemberId: window.anchorGame.state.ui.forecastMemberId,
    planningAnchor: window.anchorGame.state.ui.planningAnchor,
    hoverCell: { x: 8, y: 8 },
    settings: window.anchorGame.state.ui
  })))).resolves.toBeNull();

  await clickCell(page, 8, 8);
  await expectWaypointCount(page, 0);
  await expect(page.evaluate(() => window.anchorGame.state.mission.agents[0].deployment?.selectedStart)).resolves.toBeFalsy();
  await expect(page.evaluate(() => import('./src/core/planning/PlanExecutionValidator.js').then(({ validatePlanForExecution }) => {
    const result = validatePlanForExecution({
      level: window.anchorGame.state.level,
      mission: window.anchorGame.state.mission,
      plan: window.anchorGame.state.plan
    });
    return {
      ok: result.ok,
      firstError: result.errors[0] ?? ''
    };
  }))).resolves.toMatchObject({
    ok: false
  });
  await page.evaluate(() => window.anchorGame.phaser.scene.getScene('MissionWorkspaceScene').executePlan());
  await expect.poll(() => page.evaluate(() => window.anchorGame.phaser.scene.getScene('MissionWorkspaceScene').sys.isActive())).toBe(true);
  await expect.poll(() => page.evaluate(() => window.anchorGame.phaser.scene.getScene('SimulationScene').sys.isActive())).toBe(false);
  await expect(page.evaluate(() => import('./src/core/sim/SimulationEngine.js').then(({ SimulationEngine }) => {
    const engine = new SimulationEngine({
      level: window.anchorGame.state.level,
      mission: JSON.parse(JSON.stringify(window.anchorGame.state.mission)),
      plan: JSON.parse(JSON.stringify(window.anchorGame.state.plan))
    });
    return {
      complete: engine.complete,
      aborted: engine.aborted,
      abortReason: engine.abortReason
    };
  }))).resolves.toMatchObject({
    complete: true,
    aborted: true,
    abortReason: 'invalidExecutionPlan'
  });

  const deploymentCell = await page.evaluate(() => window.anchorGame.state.level.zones.find((zone) => zone.id === 'drop_alpha')?.cells?.[0]);
  await clickCell(page, deploymentCell.x, deploymentCell.y);
  await expect(page.evaluate(() => window.anchorGame.state.mission.agents[0].deployment?.selectedStart)).resolves.toEqual(deploymentCell);
  await expect(page.evaluate(() => window.anchorGame.state.plan.agentPlans[0].selectedStart)).resolves.toEqual(deploymentCell);
  await expect(page.evaluate(() => {
    const scene = window.anchorGame.phaser.scene.getScene('MissionWorkspaceScene');
    return {
      agentStart: window.anchorGame.state.mission.agents[0].start,
      gliderHitTargets: scene.gliderObjects?.length ?? 0
    };
  })).resolves.toMatchObject({
    agentStart: deploymentCell,
    gliderHitTargets: 1
  });
  await expect(page.locator('#mission-summary-hud')).toContainText(`Start ${deploymentCell.x},${deploymentCell.y}`);
  await expect(page.evaluate((cell) => import('./src/core/planning/PlanningGuidance.js').then(({ buildPlanningGuidance }) => {
    const guidance = buildPlanningGuidance({
      level: window.anchorGame.state.level,
      mission: window.anchorGame.state.mission,
      plan: window.anchorGame.state.plan,
      selectedAgentId: window.anchorGame.state.selectedAgentId,
      time: window.anchorGame.state.planningTime,
      challengeMode: window.anchorGame.state.challengeMode,
      forecastMemberId: window.anchorGame.state.ui.forecastMemberId,
      planningAnchor: window.anchorGame.state.ui.planningAnchor,
      hoverCell: { x: cell.x + 1, y: cell.y },
      settings: window.anchorGame.state.ui
    });
    return {
      hasGuidance: Boolean(guidance),
      center: guidance?.reachableRegion?.center ?? null,
      anchor: guidance?.debug?.planningAnchor ?? null
    };
  }), deploymentCell)).resolves.toMatchObject({
    hasGuidance: true,
    center: deploymentCell,
    anchor: { x: deploymentCell.x, y: deploymentCell.y }
  });

  await page.evaluate(() => {
    const level = window.anchorGame.state.level;
    const scene = window.anchorGame.phaser.scene.getScene('MissionWorkspaceScene');
    for (const [index, agent] of window.anchorGame.state.mission.agents.entries()) {
      if (agent.deployment?.selectedStart) continue;
      window.anchorGame.state.selectedAgentId = agent.id;
      const zone = level.zones.find((candidate) => candidate.id === agent.deployment?.zoneId);
      if (zone?.cells?.length) scene.trySelectDeploymentStart(zone.cells[Math.min(index, zone.cells.length - 1)]);
    }
    for (let y = 2; y < level.world.grid.height; y += 1) {
      for (let x = 2; x < level.world.grid.width; x += 1) {
        const base = (level.layers.bases ?? []).some((candidate) => Math.round(candidate.x) === x && Math.round(candidate.y) === y);
        if (!base && !level.layers.terrain?.[y]?.[x] && !level.layers.hazards?.[y]?.[x]) {
          scene.addWaypointForSelected({ x, y, action: 'sample' });
          return;
        }
      }
    }
  });
  await expectWaypointCount(page, 1);
  const postWaypointGuidance = await page.evaluate(() => import('./src/core/planning/PlanningGuidance.js').then(({ buildPlanningGuidance }) => {
    const agentPlan = window.anchorGame.state.plan.agentPlans.find((plan) => plan.agentId === window.anchorGame.state.selectedAgentId);
    const last = agentPlan?.waypoints?.at(-1);
    const guidance = buildPlanningGuidance({
      level: window.anchorGame.state.level,
      mission: window.anchorGame.state.mission,
      plan: window.anchorGame.state.plan,
      selectedAgentId: window.anchorGame.state.selectedAgentId,
      time: window.anchorGame.state.planningTime,
      challengeMode: window.anchorGame.state.challengeMode,
      forecastMemberId: window.anchorGame.state.ui.forecastMemberId,
      planningAnchor: window.anchorGame.state.ui.planningAnchor,
      settings: window.anchorGame.state.ui
    });
    return {
      center: guidance?.reachableRegion?.center ?? null,
      anchor: guidance?.debug?.planningAnchor ?? null,
      last: last ? { x: last.x, y: last.y } : null
    };
  }));
  expect(postWaypointGuidance.center).toEqual(postWaypointGuidance.last);
  expect(postWaypointGuidance.anchor).toMatchObject(postWaypointGuidance.last);
  await expect(page.evaluate(() => import('./src/core/io/SolverPacketExporter.js').then(({ buildSolverPacket }) => {
    const packet = buildSolverPacket({
      level: window.anchorGame.state.level,
      mission: window.anchorGame.state.mission,
      challengeMode: window.anchorGame.state.challengeMode,
      forecastMemberId: window.anchorGame.state.ui.forecastMemberId,
      roiViewMode: window.anchorGame.state.ui.roiViewMode
    });
    return packet.deployment.agents[0];
  }))).resolves.toMatchObject({
    mode: 'chooseFromZone',
    zoneId: 'drop_alpha',
    selectedStart: deploymentCell
  });
  await page.locator('#mission-console [data-action="execute"]').click();
  await expect.poll(() => page.evaluate(() => window.anchorGame.phaser.scene.getScene('SimulationScene').sys.isActive())).toBe(true);
});

test('legacy saved level registry scene still opens', async ({ page }) => {
  await page.goto('/');
  await expect.poll(() => page.evaluate(() => window.anchorGame.phaser.scene.getScene('MainMenuScene').sys.isActive())).toBe(true);

  await page.evaluate(() => window.anchorGame.phaser.scene.start('LoadLevelByIdScene'));
  await expect.poll(() => page.evaluate(() => window.anchorGame.phaser.scene.getScene('LoadLevelByIdScene').sys.isActive())).toBe(true);
  await expect(page.getByRole('heading', { name: 'Legacy Saved Levels' })).toBeVisible();
  await expect(page.locator('#saved-level-id-input')).toBeVisible();
});

async function clickCell(page, x, y) {
  const point = await cellCenter(page, x, y);
  await page.mouse.click(point.x, point.y);
}

async function clickFirstValidCell(page) {
  const cell = await page.evaluate(() => {
    const level = window.anchorGame.state.level;
    for (let y = 2; y < level.world.grid.height; y += 1) {
      for (let x = 2; x < level.world.grid.width; x += 1) {
        const base = (level.layers.bases ?? []).some((candidate) => Math.round(candidate.x) === x && Math.round(candidate.y) === y);
        if (!base && !level.layers.terrain?.[y]?.[x] && !level.layers.hazards?.[y]?.[x]) return { x, y };
      }
    }
    return { x: 0, y: 0 };
  });
  await clickCell(page, cell.x, cell.y);
}

async function dragCell(page, fromX, fromY, toX, toY) {
  const from = await cellCenter(page, fromX, fromY);
  const to = await cellCenter(page, toX, toY);
  await page.mouse.move(from.x, from.y);
  await page.mouse.down();
  await page.mouse.move(to.x, to.y);
  await page.mouse.up();
}

async function expectWaypointCount(page, count) {
  await expect.poll(async () => page.evaluate(() => (
    window.anchorGame.state.plan?.agentPlans?.reduce((sum, agentPlan) => sum + (agentPlan.waypoints?.length || 0), 0) ?? 0
  ))).toBe(count);
}

async function expectCenterShellContained(page) {
  await expect(page.evaluate(() => {
    const left = document.getElementById('mission-console').getBoundingClientRect();
    const center = document.getElementById('game-root').getBoundingClientRect();
    const right = document.getElementById('waypoint-timeline').getBoundingClientRect();
    const canvas = document.querySelector('#game-root canvas').getBoundingClientRect();
    return {
      centerAfterLeft: center.left >= left.right - 1,
      centerBeforeRight: center.right <= right.left + 1,
      canvasInsideCenter: canvas.left >= center.left - 1
        && canvas.right <= center.right + 1
        && canvas.top >= center.top - 1
        && canvas.bottom <= center.bottom + 1,
      canvasFillsCenter: Math.abs(canvas.width - center.width) <= 1
        && Math.abs(canvas.height - center.height) <= 1,
      noHorizontalOverflow: document.documentElement.scrollWidth <= window.innerWidth + 1
    };
  })).resolves.toEqual({
    centerAfterLeft: true,
    centerBeforeRight: true,
    canvasInsideCenter: true,
    canvasFillsCenter: true,
    noHorizontalOverflow: true
  });
}

async function expectCenterPanelUsesAvailableSpace(page) {
  await expect(page.evaluate(() => {
    const center = document.getElementById('game-root').getBoundingClientRect();
    const panel = document.querySelector('#modal-root .center-panel')?.getBoundingClientRect();
    return {
      exists: Boolean(panel),
      usesCenterWidth: panel ? panel.width >= center.width * 0.82 : false,
      contained: panel ? panel.left >= center.left - 1 && panel.right <= center.right + 1 : false
    };
  })).resolves.toEqual({
    exists: true,
    usesCenterWidth: true,
    contained: true
  });
}

async function startPlanningFromBriefing(page) {
  await page.evaluate(() => window.anchorGame.phaser.scene.getScene('MissionBriefingScene').startPlanning());
  await expect.poll(() => page.evaluate(() => window.anchorGame.phaser.scene.getScene('MissionWorkspaceScene').sys.isActive())).toBe(true);
}

async function clickCanvasPoint(page, canvasX, canvasY) {
  const point = await canvasPoint(page, canvasX, canvasY);
  await page.mouse.click(point.x, point.y);
}

async function canvasPoint(page, canvasX, canvasY) {
  return page.evaluate(({ canvasX, canvasY }) => {
    const canvas = document.getElementById('game-canvas');
    const rect = canvas.getBoundingClientRect();
    return {
      x: rect.left + canvasX * rect.width / canvas.width,
      y: rect.top + canvasY * rect.height / canvas.height
    };
  }, { canvasX, canvasY });
}

async function cellCenter(page, x, y) {
  return page.evaluate(({ x, y }) => {
    const canvas = document.getElementById('game-canvas');
    const rect = canvas.getBoundingClientRect();
    const layout = window.anchorGame.adapter.layout;
    const canvasX = layout.ox + (x + 0.5) * layout.cell;
    const canvasY = layout.oy + (y + 0.5) * layout.cell;
    return {
      x: rect.left + canvasX * rect.width / canvas.width,
      y: rect.top + canvasY * rect.height / canvas.height
    };
  }, { x, y });
}
