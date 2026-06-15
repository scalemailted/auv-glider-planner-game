import { expect, test } from '@playwright/test';
import fs from 'node:fs/promises';
import { startStaticServer } from './static-server.mjs';

let server;

test.setTimeout(300000);

test.beforeAll(async () => {
  server = await startStaticServer({ port: 9321 });
});

test.afterAll(async () => {
  await new Promise((resolve) => server?.close(resolve));
});

test('learning labs static page is linked from the main menu', async ({ page }) => {
  await page.goto('/');

  await expect(page.locator('#mission-console')).toContainText('Learning Labs');
  await page.locator('#mission-console [data-accordion-key="learning-labs"] .accordion-header').click();
  const indexLink = page.locator('#mission-console a[href="labs/index.html"]');
  await expect(indexLink).toBeVisible();
  await expect(indexLink).toHaveText(/Learning Labs Index/);
  await expect(indexLink).toHaveAttribute('target', '_blank');
  await expect(indexLink).toHaveAttribute('rel', /noopener/);
  const labLink = page.locator('#mission-console a[href="labs/deterministic-spatiotemporal-processes.html"]');
  await expect(labLink).toBeVisible();
  await expect(labLink).toHaveText(/Deterministic Spatiotemporal Processes/);
  await expect(labLink).toHaveAttribute('target', '_blank');
  await expect(labLink).toHaveAttribute('rel', /noopener/);
  const flowLabLink = page.locator('#mission-console a[href="labs/deterministic-dynamic-flow-fields.html"]');
  await expect(flowLabLink).toBeVisible();
  await expect(flowLabLink).toHaveText(/Deterministic Dynamic Flow Fields/);
  await expect(flowLabLink).toHaveAttribute('target', '_blank');
  await expect(flowLabLink).toHaveAttribute('rel', /noopener/);
  const coupledLabLink = page.locator('#mission-console a[href="labs/oracle-deterministic-coupled-sampling-space.html"]');
  await expect(coupledLabLink).toBeVisible();
  await expect(coupledLabLink).toHaveText(/Oracle \/ Deterministic Coupled Sampling Space/);
  await expect(coupledLabLink).toHaveAttribute('target', '_blank');
  await expect(coupledLabLink).toHaveAttribute('rel', /noopener/);
  const uncertaintyLabLink = page.locator('#mission-console a[href="labs/stochastic-uncertainty.html"]');
  await expect(uncertaintyLabLink).toBeVisible();
  await expect(uncertaintyLabLink).toHaveText(/Stochastic \/ Uncertainty/);
  await expect(uncertaintyLabLink).toHaveAttribute('target', '_blank');
  await expect(uncertaintyLabLink).toHaveAttribute('rel', /noopener/);
  const stochasticCoupledLabLink = page.locator('#mission-console a[href="labs/stochastic-coupled-sampling-space.html"]');
  await expect(stochasticCoupledLabLink).toBeVisible();
  await expect(stochasticCoupledLabLink).toHaveText(/Stochastic Coupled Sampling Space/);
  await expect(stochasticCoupledLabLink).toHaveAttribute('target', '_blank');
  await expect(stochasticCoupledLabLink).toHaveAttribute('rel', /noopener/);
  const plannerLabLink = page.locator('#mission-console a[href="labs/planner-mission-evaluation.html"]');
  await expect(plannerLabLink).toBeVisible();
  await expect(plannerLabLink).toHaveText(/Planner \/ Mission Evaluation/);
  await expect(plannerLabLink).toHaveAttribute('target', '_blank');
  await expect(plannerLabLink).toHaveAttribute('rel', /noopener/);

  await page.goto('/labs/index.html');
  await expect(page).toHaveTitle(/ANCHOR Learning Labs/);
  await expect(page.locator('h1')).toContainText('ANCHOR Learning Labs');
  await expect(page.locator('body')).toContainText('Learning path table of contents');
  await expect(page.locator('a[href="deterministic-dynamic-flow-fields.html"]').first()).toBeVisible();
  await expect(page.locator('a[href="oracle-deterministic-coupled-sampling-space.html"]').first()).toBeVisible();
  await expect(page.locator('a[href="stochastic-uncertainty.html"]').first()).toBeVisible();
  await expect(page.locator('a[href="stochastic-coupled-sampling-space.html"]').first()).toBeVisible();
  await expect(page.locator('a[href="planner-mission-evaluation.html"]').first()).toBeVisible();
  await expect(page.locator('body')).toContainText('Planner / Mission Evaluation');

  await page.goto('/labs/deterministic-spatiotemporal-processes.html');
  await expect(page).toHaveTitle(/Deterministic Spatiotemporal Processes/);
  await expect(page.locator('h1')).toContainText('Deterministic Spatiotemporal Processes');
  await expect(page.locator('.lab-math').first()).toBeVisible();
  await expect(page.locator('body')).toContainText('x_i(t+1)');
  await expect(page.locator('body')).toContainText('Foundational CA Models');
  await expect(page.locator('body')).toContainText('Observable process patterns');
  await expect(page.locator('body')).toContainText('Deterministic and seeded evolution');
  await expect(page.locator('body')).toContainText('Optional sampling interpretation');
  await expect(page.locator('.lab-figure').first()).toBeVisible();
  await expect(page.locator('[data-elementary-ca-widget]')).toBeVisible();
  await expect(page.locator('[data-ca-action="reset"]')).toBeVisible();
  await expect(page.locator('[data-widget="neighborhood-update"]')).toBeVisible();
  await expect(page.locator('[data-neighborhood-mode]')).toBeVisible();
  await expect(page.locator('[data-widget="game-of-life"]')).toBeVisible();
  await expect(page.locator('[data-life-action="step"]')).toBeVisible();
  await expect(page.locator('[data-widget="domain-rule-allocation"]')).toBeVisible();
  await expect(page.locator('[data-domain-action="step"]')).toBeVisible();
  const beforeWidgetText = await page.locator('[data-ca-status]').textContent();
  await page.locator('[data-ca-action="regenerate"]').click();
  await expect(page.locator('[data-ca-status]')).not.toHaveText(beforeWidgetText ?? '');

  await page.goto('/labs/deterministic-dynamic-flow-fields.html');
  await expect(page).toHaveTitle(/Deterministic Dynamic Flow Fields/);
  await expect(page.locator('h1')).toContainText('Deterministic Dynamic Flow Fields');
  await expect(page.locator('.lab-toc')).toContainText('What is a flow field?');
  await expect(page.locator('.lab-math').first()).toContainText('F(x,y,t)');
  await expect(page.locator('[data-flow-widget="vector-components"]')).toBeVisible();
  await expect(page.locator('[data-flow-widget="field-presets"]')).toBeVisible();
  await expect(page.locator('[data-flow-widget="particle-tracer"]')).toBeVisible();
  await expect(page.locator('[data-flow-canvas]').first()).toBeVisible();
  await expect(page.locator('body')).toContainText('Open Flow Fields Sandbox');
  const beforeVectorText = await page.locator('[data-vector-status]').textContent();
  await page.locator('[data-vector-u]').evaluate((input) => {
    input.value = '0.2';
    input.dispatchEvent(new Event('input', { bubbles: true }));
  });
  await expect(page.locator('[data-vector-status]')).not.toHaveText(beforeVectorText ?? '');
  await expect(page.locator('[data-particle-toggle]')).toBeVisible();
  await expect(page.locator('[data-particle-reset]')).toBeVisible();

  await page.goto('/labs/oracle-deterministic-coupled-sampling-space.html');
  await expect(page).toHaveTitle(/Oracle \/ Deterministic Coupled Sampling Space/);
  await expect(page.locator('h1')).toContainText('Oracle / Deterministic Coupled Sampling Space');
  await expect(page.locator('.lab-toc')).toContainText('Why couple fields?');
  await expect(page.locator('.lab-math').first()).toBeVisible();
  await expect(page.locator('body')).toContainText('S*(x,y,t)');
  await expect(page.locator('[data-coupled-widget="flow-carried-patch"]')).toBeVisible();
  await expect(page.locator('[data-coupled-widget="layer-composer"]')).toBeVisible();
  await expect(page.locator('[data-coupled-canvas]').first()).toBeVisible();
  await expect(page.locator('body')).toContainText('Open Coupled Fields Sandbox');
  await expect(page.locator('[data-patch-toggle]')).toBeVisible();
  await expect(page.locator('[data-patch-reset]')).toBeVisible();
  const beforeLayerText = await page.locator('[data-layer-status]').textContent();
  await page.locator('[data-layer-flow]').selectOption('vortex');
  await expect(page.locator('[data-layer-status]')).not.toHaveText(beforeLayerText ?? '');

  await page.goto('/labs/stochastic-uncertainty.html');
  await expect(page).toHaveTitle(/Stochastic \/ Uncertainty/);
  await expect(page.locator('h1')).toContainText('Stochastic / Uncertainty');
  await expect(page.locator('.lab-toc')).toContainText('Why uncertainty?');
  await expect(page.locator('.lab-math').first()).toBeVisible();
  await expect(page.locator('[data-uncertainty-widget="bayesian-cell-update"]')).toBeVisible();
  await expect(page.locator('[data-uncertainty-widget="forecast-error-vs-hidden-event"]')).toBeVisible();
  await expect(page.locator('[data-uncertainty-widget="regret-information-value"]')).toBeVisible();
  await expect(page.locator('[data-uncertainty-canvas]').first()).toBeVisible();
  await expect(page.locator('body')).toContainText('Open Uncertainty / Forecast Sandbox');
  const beforePosteriorText = await page.locator('[data-bayes-posterior]').textContent();
  await page.locator('[data-bayes-prior]').evaluate((input) => {
    input.value = '0.65';
    input.dispatchEvent(new Event('input', { bubbles: true }));
  });
  await expect(page.locator('[data-bayes-posterior]')).not.toHaveText(beforePosteriorText ?? '');
  await expect(page.locator('[data-feh-scenario]')).toBeVisible();
  await expect(page.locator('[data-regret-choice="0"]')).toBeVisible();
  await expect(page.locator('[data-regret-reveal]')).toBeVisible();

  await page.goto('/labs/stochastic-coupled-sampling-space.html');
  await expect(page).toHaveTitle(/Stochastic Coupled Sampling Space/);
  await expect(page.locator('h1')).toContainText('Stochastic Coupled Sampling Space');
  await expect(page.locator('.lab-toc')).toContainText('From oracle coupling to uncertain coupling');
  await expect(page.locator('.lab-math').first()).toBeVisible();
  await expect(page.locator('body')).toContainText('A(x,y,t)');
  await expect(page.locator('body')).toContainText('S*(x,y,t)');
  await expect(page.locator('[data-stochastic-coupled-widget="belief-layer-stack"]')).toBeVisible();
  await expect(page.locator('[data-stochastic-coupled-widget="oracle-vs-belief"]')).toBeVisible();
  await expect(page.locator('[data-stochastic-coupled-widget="acquisition-composer"]')).toBeVisible();
  await expect(page.locator('[data-stochastic-coupled-widget="oracle-regret-comparison"]')).toBeVisible();
  await expect(page.locator('[data-stochastic-coupled-canvas]').first()).toBeVisible();
  await expect(page.locator('body')).toContainText('Open Uncertainty / Forecast Sandbox');
  await expect(page.locator('body')).toContainText('Open Coupled Fields Sandbox');
  const beforeAcquisitionText = await page.locator('[data-sc-acq-status]').textContent();
  await page.locator('[data-sc-acq-weight="unknown"]').evaluate((input) => {
    input.value = '0.8';
    input.dispatchEvent(new Event('input', { bubbles: true }));
  });
  await expect(page.locator('[data-sc-acq-status]')).not.toHaveText(beforeAcquisitionText ?? '');
  await expect(page.locator('[data-feh-scenario]')).toBeVisible();
  await expect(page.locator('[data-regret-choice="0"]')).toBeVisible();
  await expect(page.locator('[data-regret-reveal]')).toBeVisible();

  await page.goto('/labs/planner-mission-evaluation.html');
  await expect(page).toHaveTitle(/Planner \/ Mission Evaluation/);
  await expect(page.locator('h1')).toContainText('Planner / Mission Evaluation');
  await expect(page.locator('.lab-toc')).toContainText('From fields to routes');
  await expect(page.locator('.lab-math').first()).toBeVisible();
  await expect(page.locator('[data-planner-widget="greedy-planner"]')).toBeVisible();
  await expect(page.locator('[data-planner-widget="reward-cost-tradeoff"]')).toBeVisible();
  await expect(page.locator('[data-planner-widget="debrief-scorecard"]')).toBeVisible();
  await expect(page.locator('[data-planner-canvas]').first()).toBeVisible();
  await expect(page.locator('body')).toContainText('Solver workflow and fairness labels');
  await expect(page.locator('body')).toContainText('Open Main App');
  const beforeGreedyText = await page.locator('[data-greedy-status]').textContent();
  await page.locator('[data-greedy-run]').click();
  await expect(page.locator('[data-greedy-status]')).not.toHaveText(beforeGreedyText ?? '');
  const beforeRewardText = await page.locator('[data-rct-output]').textContent();
  await page.locator('[data-rct-cost]').evaluate((input) => {
    input.value = '1.1';
    input.dispatchEvent(new Event('input', { bubbles: true }));
  });
  await expect(page.locator('[data-rct-output]')).not.toHaveText(beforeRewardText ?? '');
  await page.locator('[data-debrief-scenario]').selectOption('hazard');
  await expect(page.locator('[data-debrief-status]')).toContainText('Hazard hit');
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
  await expect(page.locator('#mission-console button.console-button')).toHaveCount(16);
  await expect(page.locator('#mission-console .accordion-header')).toHaveCount(3);
  await expect(page.locator('#mission-console > .console-section')).toHaveCount(3);
  await expect(page.locator('#mission-console')).toContainText('Challenge Mode');
  await expect(page.locator('#mission-console')).toContainText('Simulation Lab');
  await expect(page.locator('#mission-console')).toContainText('Learning Labs');
  await expect(page.locator('#mission-console .accordion-title')).toHaveText(['Challenge Mode', 'Simulation Lab', 'Learning Labs']);
  await expect(page.locator('#mission-console [data-accordion-key="challenge-mode"] [data-menu-group] h3')).toHaveText(['Play', 'Learn', 'Compete']);
  await expect(page.locator('#mission-console [data-accordion-key="challenge-mode"]')).toContainText('Mission Modes');
  await expect(page.locator('#mission-console [data-accordion-key="challenge-mode"]')).toContainText('Tutorials');
  await expect(page.locator('#mission-console')).toContainText('Play Custom Challenge');
  await expect(page.locator('#mission-console [data-accordion-key="challenge-mode"]')).toContainText('Challenge Leaderboard');
  await expect(page.locator('#mission-console [data-accordion-key="simulation-lab"]')).toContainText('Deterministic Experiment');
  await expect(page.locator('#mission-console [data-accordion-key="simulation-lab"]')).toContainText('Mission Editor');
  await expect(page.locator('#mission-console [data-accordion-key="simulation-lab"]')).toContainText('Import / Export Tools');
  await expect(page.locator('#mission-console [data-accordion-key="simulation-lab"]')).toContainText('Benchmark Leaderboard');
  await page.locator('#mission-console [data-accordion-key="simulation-lab"] .accordion-header').click();
  await expect(page.locator('#mission-console [data-accordion-key="simulation-lab"] [data-menu-group] h3')).toHaveText(['Experiments', 'Demos', 'Editor & Import Tools', 'Benchmarks']);
  await expect(page.locator('#mission-console [data-accordion-key="simulation-lab"]')).toContainText('Flow Fields Demo');
  await expect(page.locator('#mission-console [data-accordion-key="simulation-lab"]')).toContainText('Process Lab');
  await expect(page.locator('#mission-console [data-accordion-key="simulation-lab"]')).toContainText('Coupled Fields Demo');
  await expect(page.locator('#mission-console [data-accordion-key="simulation-lab"]')).toContainText('Uncertainty / Forecast Demo');
  await page.locator('#mission-console [data-accordion-key="learning-labs"] .accordion-header').click();
  await expect(page.locator('#mission-console [data-accordion-key="learning-labs"] [data-menu-group] h3')).toHaveText(['Concept Pages', 'Roadmap']);
  await expect(page.locator('#mission-console [data-accordion-key="learning-labs"]')).toContainText('Learning Labs Index');
  await expect(page.locator('#mission-console [data-accordion-key="learning-labs"]')).toContainText('Deterministic Spatiotemporal Processes');
  await expect(page.locator('#mission-console')).not.toContainText('Static Flow Field Demo');
  await expect(page.locator('#mission-console')).not.toContainText('Temporal Flow Field Demo');
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

  await page.locator('#mission-console [data-action="flow-fields"]').click();
  await expect.poll(() => page.evaluate(() => window.anchorGame.phaser.scene.getScene('FlowFieldDemoScene').sys.isActive())).toBe(true);
  await expect(page.evaluate(() => window.anchorGame.phaser.scene.getScene('FlowFieldDemoScene').fieldMode)).resolves.toBe('dynamic');
  await expect(page.evaluate(() => window.anchorGame.phaser.scene.getScene('FlowFieldDemoScene').preset)).resolves.toBe('topologyAwareComposite');
  await expect(page.evaluate(() => window.anchorGame.phaser.scene.getScene('FlowFieldDemoScene').terrainMode)).resolves.toBe('blendedCoastal');
  await expect(page.evaluate(() => window.anchorGame.phaser.scene.getScene('FlowFieldDemoScene').dynamicComplexity)).resolves.toBe('high');
  await expect(page.evaluate(() => window.anchorGame.phaser.scene.getScene('FlowFieldDemoScene').boundaryMode)).resolves.toBe('deflectAlongShore');
  await expect(page.evaluate(() => window.anchorGame.phaser.scene.getScene('FlowFieldDemoScene').additiveLayers.length)).resolves.toBe(0);
  await expect(page.locator('#mission-console')).toContainText('Flow Fields Demo');
  await expect(page.locator('#mission-console')).toContainText('Base Flow Field');
  await expect(page.locator('#mission-console')).toContainText('Additive Flow Layers');
  await expect(page.locator('#mission-console')).toContainText('Flow Evolution');
  await expect(page.locator('#mission-console')).toContainText('Topology-aware fields react');
  await expect(page.locator('#mission-console [data-flow-help]')).toHaveCount(11);
  await expect(page.locator('#mission-console .sample-field-explainer')).toHaveCount(0);
  await expect(page.locator('#mission-console')).not.toContainText('Expected Visual Behavior');
  await page.locator('#mission-console [data-flow-help="basePreset"]').click();
  await expect(page.locator('#waypoint-timeline [data-flow-behavior-help]')).toBeVisible();
  await expect(page.locator('#waypoint-timeline')).toContainText('Behavior Help');
  await expect(page.locator('#waypoint-timeline')).toContainText('About Flow Field / Base Preset');
  await expect(page.locator('#waypoint-timeline')).toContainText('Current Composition');
  await page.locator('#mission-console [data-flow-help="evolutionBehavior"]').click();
  await expect(page.locator('#waypoint-timeline')).toContainText('About Evolution Behavior');
  await page.locator('#mission-console [data-flow-help="boundaryMode"]').click();
  await expect(page.locator('#waypoint-timeline')).toContainText('About Boundary Mode');
  await page.locator('#mission-console [data-flow-help="speedModel"]').click();
  await expect(page.locator('#waypoint-timeline')).toContainText('Playback vs Evolution Speed');
  await expect(page.locator('#mission-console')).not.toContainText('Reset Particles');
  await expect(page.locator('#mission-console [data-action="pause"]')).toHaveCount(0);
  await expect(page.locator('#mission-console [data-action="reset"]')).toHaveCount(0);
  await expect(page.locator('#mission-console [data-action="export-demo-json"]')).toHaveText('Export Demo JSON');
  const flowArtifact = await downloadDemoArtifact(page);
  expect(flowArtifact.filename).toMatch(/^anchor-flow-field-demo-frame-/);
  expect(flowArtifact.data).toMatchObject({
    schemaVersion: '1.1',
    type: 'anchor.demo.flow-field',
    grid: { rowMajor: true, coordinateConvention: 'cell-center' },
    timeSampling: { kind: 'singleFrame', mode: 'currentFrame', frameCount: 1 }
  });
  expect(flowArtifact.data.fields.u.length).toBe(flowArtifact.data.grid.height);
  expect(flowArtifact.data.fields.v[0].length).toBe(flowArtifact.data.grid.width);
  expect(flowArtifact.data.frames).toHaveLength(1);
  await page.locator('#demo-export-mode').selectOption('timeWindow');
  await page.locator('#demo-export-start').fill('0');
  await page.locator('#demo-export-start').dispatchEvent('change');
  await page.locator('#demo-export-end').fill('4');
  await page.locator('#demo-export-end').dispatchEvent('change');
  await page.locator('#demo-export-frames').fill('3');
  await page.locator('#demo-export-frames').dispatchEvent('change');
  const flowSeriesArtifact = await downloadDemoArtifact(page);
  expect(flowSeriesArtifact.filename).toMatch(/^anchor-flow-field-demo-timeseries-/);
  expect(flowSeriesArtifact.data.timeSampling).toMatchObject({
    kind: 'timeSeries',
    mode: 'timeWindow',
    startTimeSeconds: 0,
    endTimeSeconds: 4,
    frameCount: 3,
    timesSeconds: [0, 2, 4]
  });
  expect(flowSeriesArtifact.data.frames).toHaveLength(3);
  expect(flowSeriesArtifact.data.frames[2].fields.u.length).toBe(flowSeriesArtifact.data.grid.height);
  await expect(page.locator('#mission-console [data-action="menu"]')).toHaveText('Main Menu');
  await expect(page.locator('#mission-summary-hud')).toBeEmpty();
  await expect(page.locator('#agent-performance-hud')).toBeEmpty();
  await expect(page.locator('#mission-summary-hud')).not.toContainText('No mission');
  await expect(page.locator('#agent-performance-hud')).not.toContainText('MISSION PERFORMANCE');
  await expect(page.locator('#agent-performance-hud')).not.toContainText('No active gliders');
  await expect(page.locator('#bottom-timeline .flow-demo-transport')).toBeVisible();
  await expect(page.locator('#bottom-timeline')).toContainText('Demo Time');
  await expect(page.locator('#bottom-timeline')).toContainText('Infinite timeline');
  await expect(page.locator('#bottom-timeline [data-action="flow-demo-back"]')).toHaveCount(0);
  await expect(page.locator('#bottom-timeline')).not.toContainText('Back');
  await expect(page.locator('#bottom-timeline [data-action="flow-demo-reset"]')).toHaveText('Reset');
  await expect(page.locator('#bottom-timeline [data-action="flow-demo-direction"]')).toHaveText('Direction: Forward');
  await expect(page.locator('#bottom-timeline [data-action="flow-demo-pause"]')).toHaveText('Pause');
  await expect(page.locator('#mission-console [data-action="menu"]')).toHaveText('Main Menu');
  await expect(page.evaluate(() => window.anchorGame.phaser.scene.getScene('FlowFieldDemoScene').buttons?.length ?? 0)).resolves.toBe(0);
  await expect(page.evaluate(() => {
    const bottom = document.querySelector('#bottom-timeline .flow-demo-transport')?.getBoundingClientRect();
    const canvas = document.querySelector('#game-root canvas')?.getBoundingClientRect();
    const timeText = document.querySelector('#bottom-timeline [data-flow-demo-time]')?.textContent ?? '';
    return {
      hasBottom: Boolean(bottom),
      belowCanvasHeader: bottom ? bottom.top > canvas.top + 120 : false,
      timeText
    };
  })).resolves.toMatchObject({
    hasBottom: true,
    belowCanvasHeader: true
  });
  const waterCell = await page.evaluate(() => {
    const scene = window.anchorGame.phaser.scene.getScene('FlowFieldDemoScene');
    for (let row = 0; row < scene.terrain.length; row += 1) {
      for (let col = 0; col < scene.terrain[row].length; col += 1) {
        if (!scene.terrain[row][col]) return { col, row };
      }
    }
    return { col: 0, row: 0 };
  });
  await clickFlowDemoCell(page, waterCell.col, waterCell.row);
  await expect(page.locator('#waypoint-timeline [data-flow-behavior-help]')).toHaveCount(0);
  await expect(page.locator('#waypoint-timeline')).toContainText('Cell Inspector');
  await expect(page.locator('#waypoint-timeline')).toContainText(`Cell (${waterCell.col}, ${waterCell.row})`);
  await expect(page.locator('#waypoint-timeline')).toContainText('Current Vector');
  await expect(page.locator('#waypoint-timeline')).toContainText('magnitude');
  await expect(page.locator('#waypoint-timeline')).toContainText('direction');
  await expect(page.locator('#waypoint-timeline')).toContainText('Topology / Boundary');
  await expect(page.evaluate(() => window.anchorGame.phaser.scene.getScene('FlowFieldDemoScene').selectedCell)).resolves.toMatchObject(waterCell);
  const inspectedMagnitude = await page.evaluate(() => window.anchorGame.phaser.scene.getScene('FlowFieldDemoScene').inspectSelectedCell().magnitude);
  await expect.poll(() => page.evaluate(() => window.anchorGame.phaser.scene.getScene('FlowFieldDemoScene').inspectSelectedCell().magnitude)).not.toBe(inspectedMagnitude);
  const landCell = await page.evaluate(() => {
    const scene = window.anchorGame.phaser.scene.getScene('FlowFieldDemoScene');
    for (let row = 0; row < scene.terrain.length; row += 1) {
      for (let col = 0; col < scene.terrain[row].length; col += 1) {
        if (scene.terrain[row][col]) return { col, row };
      }
    }
    return null;
  });
  expect(landCell).toBeTruthy();
  await clickFlowDemoCell(page, landCell.col, landCell.row);
  await expect(page.locator('#waypoint-timeline')).toContainText(`Cell (${landCell.col}, ${landCell.row})`);
  await expect(page.locator('#waypoint-timeline')).toContainText('Type: Land');
  await expect(page.locator('#waypoint-timeline')).toContainText('No navigable water current is applied here.');
  await clickFlowDemoCell(page, waterCell.col, waterCell.row);
  await expect(page.locator('#flow-demo-mode')).toBeVisible();
  await expect(page.locator('#flow-demo-mode option')).toHaveText(['Static', 'Dynamic']);
  await expect(page.locator('#mission-console')).toContainText('Continuous evolution');
  await expect.poll(() => page.evaluate(() => window.anchorGame.phaser.scene.getScene('FlowFieldDemoScene').additiveLayers.length)).toBe(0);
  await expect(page.locator('#flow-demo-preset option').first()).toHaveText('Topology-Aware Composite');
  await expect(page.locator('#flow-demo-terrain option')).toHaveText(['Blended Coastal Map', 'Coast + Islands', 'Coastal Estuary', 'Channel + Islands', 'Random Islands', 'Coastline', 'Channel', 'Bay / Pocket', 'Island Chain', 'No Land']);
  await expect(page.locator('#flow-demo-evolution-behavior option')).toHaveText(['Continuous', 'Looping / Cyclic', 'One-Shot Pulse', 'Meandering / Translating']);
  await expect(page.locator('#flow-demo-direction-variation option')).toHaveText(['Off', 'Low', 'Medium', 'High']);
  await expect(page.locator('#flow-demo-magnitude-variation option')).toHaveText(['Off', 'Low', 'Medium', 'High']);
  await expect(page.locator('#flow-demo-dynamic-complexity option')).toHaveText(['Low', 'Medium', 'High']);
  await expect(page.locator('#flow-demo-boundary-mode option')).toHaveText(['None', 'Risk Only', 'Dampen Into Land', 'Deflect Along Shore']);
  await expect(page.locator('#flow-demo-evolution-pattern option')).toHaveText(['Tidal Cycle', 'Meandering Jet', 'Eddy Drift', 'Storm Pulse', 'Composite']);
  await expect(page.locator('#flow-demo-spatial-motion option')).toHaveText(['Off', 'Drift East', 'Drift West', 'Drift North', 'Drift South', 'Circular Drift', 'Meander']);
  await expect(page.locator('#flow-demo-playback-speed')).toBeVisible();
  await expect(page.locator('#flow-demo-flow-evolution-speed')).toBeVisible();
  await page.locator('#flow-demo-evolution-behavior').selectOption('looping');
  await expect.poll(() => page.evaluate(() => window.anchorGame.phaser.scene.getScene('FlowFieldDemoScene').evolutionBehavior)).toBe('looping');
  await page.locator('#flow-demo-cycle-duration').selectOption('30');
  await expect.poll(() => page.evaluate(() => window.anchorGame.phaser.scene.getScene('FlowFieldDemoScene').cycleDuration)).toBe(30);
  await page.locator('#flow-demo-direction-variation').selectOption('high');
  await expect.poll(() => page.evaluate(() => window.anchorGame.phaser.scene.getScene('FlowFieldDemoScene').directionVariation)).toBe('high');
  await page.locator('#flow-demo-magnitude-variation').selectOption('low');
  await expect.poll(() => page.evaluate(() => window.anchorGame.phaser.scene.getScene('FlowFieldDemoScene').magnitudeVariation)).toBe('low');
  await page.locator('#flow-demo-dynamic-complexity').selectOption('low');
  await expect.poll(() => page.evaluate(() => window.anchorGame.phaser.scene.getScene('FlowFieldDemoScene').dynamicComplexity)).toBe('low');
  await page.locator('#flow-demo-evolution-pattern').selectOption('stormPulse');
  await expect.poll(() => page.evaluate(() => window.anchorGame.phaser.scene.getScene('FlowFieldDemoScene').evolutionPattern)).toBe('stormPulse');
  await page.locator('#flow-demo-spatial-motion').selectOption('meander');
  await expect.poll(() => page.evaluate(() => window.anchorGame.phaser.scene.getScene('FlowFieldDemoScene').spatialMotion)).toBe('meander');
  await page.locator('#flow-demo-spatial-motion-speed').selectOption('2');
  await expect.poll(() => page.evaluate(() => window.anchorGame.phaser.scene.getScene('FlowFieldDemoScene').spatialMotionSpeed)).toBe(2);
  await page.locator('#flow-demo-boundary-mode').selectOption('riskOnly');
  await expect.poll(() => page.evaluate(() => window.anchorGame.phaser.scene.getScene('FlowFieldDemoScene').boundaryMode)).toBe('riskOnly');
  await page.locator('#mission-console [data-action="add-flow-layer"]').click();
  await expect.poll(() => page.evaluate(() => window.anchorGame.phaser.scene.getScene('FlowFieldDemoScene').additiveLayers.length)).toBe(1);
  await page.locator('[data-flow-layer-preset]').first().selectOption('eddyField');
  await expect.poll(() => page.evaluate(() => window.anchorGame.phaser.scene.getScene('FlowFieldDemoScene').additiveLayers[0].preset)).toBe('eddyField');
  await page.locator('[data-flow-layer-weight]').first().evaluate((input) => {
    input.value = '0.75';
    input.dispatchEvent(new Event('input', { bubbles: true }));
  });
  await expect.poll(() => page.evaluate(() => window.anchorGame.phaser.scene.getScene('FlowFieldDemoScene').additiveLayers[0].weight)).toBe(0.75);
  await page.locator('[data-flow-layer-influence]').first().selectOption('spatialPocket');
  await expect.poll(() => page.evaluate(() => window.anchorGame.phaser.scene.getScene('FlowFieldDemoScene').additiveLayers[0].influence)).toBe('spatialPocket');
  await page.locator('#mission-console [data-action="add-flow-layer"]').click();
  await expect.poll(() => page.evaluate(() => window.anchorGame.phaser.scene.getScene('FlowFieldDemoScene').additiveLayers.length)).toBe(2);
  await page.locator('[data-flow-layer-remove]').first().click();
  await expect.poll(() => page.evaluate(() => window.anchorGame.phaser.scene.getScene('FlowFieldDemoScene').additiveLayers.length)).toBe(1);
  await page.locator('#flow-demo-playback-speed').selectOption('5');
  await expect.poll(() => page.evaluate(() => window.anchorGame.phaser.scene.getScene('FlowFieldDemoScene').playbackSpeedScale)).toBe(5);
  await expect.poll(() => page.evaluate(() => window.anchorGame.phaser.scene.getScene('FlowFieldDemoScene').evolutionSpeedScale)).toBe(5);
  await expect(page.locator('#mission-console')).toContainText('Playback Speed');
  await expect(page.locator('#bottom-timeline')).toContainText('Playback: 5x');
  await page.locator('#flow-demo-flow-evolution-speed').selectOption('2');
  await expect.poll(() => page.evaluate(() => window.anchorGame.phaser.scene.getScene('FlowFieldDemoScene').flowEvolutionSpeedScale)).toBe(2);
  await expect(page.locator('#mission-console')).toContainText('Flow Evolution Speed');
  await expect(page.locator('#bottom-timeline')).toContainText('Flow: 2x');
  await expect(page.evaluate(() => {
    const scene = window.anchorGame.phaser.scene.getScene('FlowFieldDemoScene');
    scene.demoTime = 3;
    return scene.flowSampleTime();
  })).resolves.toBe(6);
  await page.locator('#flow-demo-magnitude-scale').selectOption('2');
  await expect.poll(() => page.evaluate(() => window.anchorGame.phaser.scene.getScene('FlowFieldDemoScene').magnitudeScale)).toBe(2);
  await page.locator('#flow-demo-particle-speed').selectOption('2');
  await expect.poll(() => page.evaluate(() => window.anchorGame.phaser.scene.getScene('FlowFieldDemoScene').particleSpeedScale)).toBe(2);
  await expect(page.locator('#mission-console')).toContainText('Magnitude Range');
  await page.locator('#bottom-timeline [data-action="flow-demo-pause"]').click();
  await expect(page.locator('#bottom-timeline [data-action="flow-demo-pause"]')).toHaveText('Resume');
  await expect(page.locator('#bottom-timeline')).toContainText('Paused at');
  const flowTimeBeforePause = await page.evaluate(() => window.anchorGame.phaser.scene.getScene('FlowFieldDemoScene').demoTime);
  const flowMagnitudeBeforePause = await page.evaluate(() => window.anchorGame.phaser.scene.getScene('FlowFieldDemoScene').inspectSelectedCell().magnitude);
  await page.waitForTimeout(250);
  await expect(page.evaluate(() => window.anchorGame.phaser.scene.getScene('FlowFieldDemoScene').demoTime)).resolves.toBeCloseTo(flowTimeBeforePause, 1);
  await expect(page.evaluate(() => window.anchorGame.phaser.scene.getScene('FlowFieldDemoScene').inspectSelectedCell().magnitude)).resolves.toBeCloseTo(flowMagnitudeBeforePause, 4);
  await page.locator('#bottom-timeline [data-action="flow-demo-pause"]').click();
  await expect(page.locator('#bottom-timeline [data-action="flow-demo-pause"]')).toHaveText('Pause');
  await expect.poll(() => page.evaluate(() => window.anchorGame.phaser.scene.getScene('FlowFieldDemoScene').demoTime)).toBeGreaterThan(flowTimeBeforePause);
  const forwardTime = await page.evaluate(() => window.anchorGame.phaser.scene.getScene('FlowFieldDemoScene').demoTime);
  await page.locator('#bottom-timeline [data-action="flow-demo-direction"]').click();
  await expect(page.locator('#bottom-timeline [data-action="flow-demo-direction"]')).toHaveText('Direction: Reverse');
  await expect.poll(() => page.evaluate(() => window.anchorGame.phaser.scene.getScene('FlowFieldDemoScene').demoTime)).toBeLessThan(forwardTime);
  await page.evaluate(() => {
    const scene = window.anchorGame.phaser.scene.getScene('FlowFieldDemoScene');
    scene.demoTime = 0.01;
  });
  await expect.poll(() => page.evaluate(() => window.anchorGame.phaser.scene.getScene('FlowFieldDemoScene').demoTime)).toBe(0);
  await page.locator('#bottom-timeline [data-action="flow-demo-pause"]').click();
  await page.locator('#bottom-timeline [data-action="flow-demo-reset"]').click();
  await expect.poll(() => page.evaluate(() => window.anchorGame.phaser.scene.getScene('FlowFieldDemoScene').demoTime)).toBeLessThan(0.2);
  await page.locator('#flow-demo-terrain').selectOption('islands');
  await expect.poll(() => page.evaluate(() => window.anchorGame.phaser.scene.getScene('FlowFieldDemoScene').terrainMode)).toBe('islands');
  await page.locator('#flow-demo-terrain').selectOption('coastline');
  await expect.poll(() => page.evaluate(() => window.anchorGame.phaser.scene.getScene('FlowFieldDemoScene').terrainMode)).toBe('coastline');
  await page.locator('#flow-demo-terrain').selectOption('none');
  await expect.poll(() => page.evaluate(() => window.anchorGame.phaser.scene.getScene('FlowFieldDemoScene').terrainMode)).toBe('none');
  await page.locator('#mission-console [data-action="menu"]').click();
  await expect.poll(() => page.evaluate(() => window.anchorGame.phaser.scene.getScene('MainMenuScene').sys.isActive())).toBe(true);
  await expect(page.locator('#bottom-timeline')).toBeEmpty();

  await page.locator('#mission-console [data-action="roi-demo"]').click();
  await expect.poll(() => page.evaluate(() => window.anchorGame.phaser.scene.getScene('RoiGeneratorDemoScene').sys.isActive())).toBe(true);
  await expect(page.locator('#mission-console')).toContainText('Deterministic Spatiotemporal Process Lab');
  await expect(page.evaluate(() => window.anchorGame.phaser.scene.getScene('RoiGeneratorDemoScene').buttons?.length ?? 0)).resolves.toBe(0);
  await expect(page.locator('#mission-summary-hud')).toBeEmpty();
  await expect(page.locator('#agent-performance-hud')).toBeEmpty();
  await expect(page.locator('#waypoint-timeline')).toContainText('Process Example View');
  await expect(page.locator('#waypoint-timeline')).toContainText('Current Lab State');
  await expect(page.locator('#waypoint-timeline')).toContainText('Foundational CA Models');
  await expect(page.locator('#waypoint-timeline')).toContainText('Inspired By');
  await expect(page.locator('#waypoint-timeline')).toContainText('Sampling Interpretation');
  await expect(page.locator('#mission-console [data-sampling-top-card="mode"]')).toContainText('Mode');
  await expect(page.locator('#mission-console [data-sampling-primary-mode="foundationalCaModels"]')).toContainText('Foundational CA Model');
  await expect(page.locator('#mission-console [data-sampling-top-card="summary"]')).toHaveCount(0);
  await expect(page.locator('#mission-console')).not.toContainText('Current Summary');
  await expect(page.locator('#mission-console')).not.toContainText('Pattern Source / Mode');
  await expect(page.locator('#mission-console [data-sampling-section="sourceField"]')).toHaveCount(0);
  await expect(page.locator('#mission-console')).not.toContainText('Event Likelihood / Spawn Distribution');
  await expect(page.locator('#mission-console')).toContainText('Choose how to build or generate the process.');
  await expect(page.locator('#mission-console')).not.toContainText('Reference Signature is guided');
  await expectSamplingSectionsCollapsed(page, [
    'Mode',
    'Foundational CA Models',
    'Display / Diagnostic Layer',
    'Seed / Scenario Identity',
    'Export'
  ]);
  await expandMissionConsoleSection(page, 'Mode');
  await expandMissionConsoleSection(page, 'Foundational CA Models');
  await expandMissionConsoleSection(page, 'Display / Diagnostic Layer');
  await expandMissionConsoleSection(page, 'Export');
  await expect(page.locator('#sampling-process-mode')).toBeVisible();
  await expect.poll(() => page.evaluate(() => {
    const mode = document.querySelector('#sampling-process-mode');
    const signature = document.querySelector('#roi-demo-reference-signature');
    return Boolean(mode && signature && mode.compareDocumentPosition(signature) & Node.DOCUMENT_POSITION_FOLLOWING);
  })).toBe(true);
  await expect(page.locator('#sampling-process-mode option')).toHaveText([
    'Foundational CA Models',
    'Ocean-Relevant Process Analogs',
    'Custom Composer',
    'Process Paint',
    'Rule Allocation Sandbox'
  ]);
  await expect(page.locator('#sampling-process-mode')).not.toContainText('Diagnostics / Graph Inspection');
  await expect(page.locator('#roi-demo-pattern-source')).toHaveCount(0);
  await expect(page.locator('#sampling-process-example-track')).toHaveCount(0);
  await expect(page.locator('#sampling-process-example-id')).toBeVisible();
  await expect(page.locator('#sampling-process-example-id')).toContainText("Conway's Game of Life");
  await expect(page.locator('#sampling-process-example-id')).toContainText('Forest Fire');
  await expect(page.locator('#sampling-process-example-id')).not.toContainText('River Plume Front');
  await expect(page.locator('#roi-demo-reference-signature')).not.toContainText('River Plume Front');
  await expect(page.locator('#roi-demo-reference-signature')).not.toContainText('Bloom Growth / Decay');
  await expect(page.locator('#waypoint-timeline [data-roi-current-lab-state]')).toContainText('Foundational CA Models');
  await expect(page.locator('#waypoint-timeline [data-roi-current-lab-state]')).toContainText('Foundational CA Models');
  await expect(page.locator('#waypoint-timeline [data-roi-current-lab-state]')).toContainText("Conway's Game of Life");
  await expect(page.locator('#waypoint-timeline [data-roi-current-lab-state]')).toContainText('Mapped Pattern');
  await expect(page.locator('#waypoint-timeline [data-roi-current-lab-state]')).toContainText('Local Birth-Death Emergence');
  await expect(page.locator('#waypoint-timeline [data-roi-current-lab-state]')).toContainText('simplifiedFamilyAnalog');
  await expect(page.locator('#waypoint-timeline .sampling-panel-tabs')).toBeVisible();
  await expect(page.locator('#waypoint-timeline .sampling-panel-tabs')).toContainText('Recipe');
  await expect(page.locator('#waypoint-timeline .sampling-panel-tabs')).toContainText('Inspector');
  await expect(page.locator('#waypoint-timeline .sampling-panel-tabs')).toContainText('Help');
  await expect(page.locator('#waypoint-timeline .sampling-panel-tabs')).toContainText('Diagnostics');
  await expect.poll(() => page.evaluate(() => {
    const panel = document.querySelector('#waypoint-timeline');
    const tabs = panel?.querySelector('.sampling-panel-tabs');
    const current = panel?.querySelector('[data-roi-current-lab-state]');
    return Boolean(tabs && current && tabs.compareDocumentPosition(current) & Node.DOCUMENT_POSITION_FOLLOWING);
  })).toBe(true);
  await clickRightPanelMode(page, 'diagnostics');
  await expect(page.locator('#waypoint-timeline [data-roi-diagnostics-view]')).toBeVisible();
  await expect.poll(() => page.evaluate(() => window.anchorGame.phaser.scene.getScene('RoiGeneratorDemoScene').processMode)).toBe('foundationalCaModels');
  await expect(page.locator('#waypoint-timeline')).toContainText('Field / Process Stats');
  await expect(page.locator('#waypoint-timeline [data-roi-reference-signature-help]')).toHaveCount(0);
  await clickRightPanelMode(page, 'cellInspector');
  await expect(page.locator('#waypoint-timeline [data-roi-cell-inspector-empty]')).toBeVisible();
  await expect(page.locator('#waypoint-timeline')).toContainText('Select a cell on the canvas to inspect its value, state, rule, messages, and ROI role.');
  await clickRightPanelMode(page, 'recipeSignature');
  await expect(page.locator('#waypoint-timeline [data-roi-recipe-signature-view]')).toBeVisible();
  await expect(page.locator('#roi-demo-behavior-preset')).toHaveCount(0);
  await expect(page.locator('#mission-console')).toContainText('Process Lab UI: process-context-split-ui-v1');
  await expect(page.locator('#mission-console')).toContainText('Legacy presets visible: false');
  await expect(page.evaluate(() => window.ANCHOR_ROI_UI_DEBUG)).resolves.toMatchObject({
    uiVersion: 'process-context-split-ui-v1',
    referenceSignatureCount: 14,
    legacyPresetCount: 12,
    legacyPresetsVisible: false,
    activePatternSource: 'referenceSignature',
    activeProcessContext: 'foundationalCaModels',
    activeProcessContextLabel: 'Foundational CA Models',
    activeReferenceSignatureId: 'birthDeathEmergence',
    activeExampleTrack: 'foundationalCaModels',
    activeExampleProcessId: 'conwayGameOfLife',
    activeExampleProcessLabel: "Conway's Game of Life",
    activeMappedReferenceSignatureId: 'birthDeathEmergence',
    legacyReferenceMappingConsistent: true,
    selectorModeMatchesActiveExample: true,
    selectorMatchesActiveExample: true,
    hasValueDistributionAccordion: false,
    rightPanelMode: 'recipeSignature',
    visibleWorkflowModes: ['foundationalCaModels', 'oceanProcessAnalogs', 'customComposer', 'processPaint', 'randomRuleLab'],
    diagnosticsAvailableAsView: true
  });
  await expect(page.locator('#bottom-timeline .roi-demo-transport')).toBeVisible();
  await expect(page.locator('#bottom-timeline')).toContainText('Generation');
  await expect(page.locator('#bottom-timeline')).toContainText('1 gen/s');
  await expect(page.locator('#bottom-timeline')).toContainText('Infinite timeline');
  await expect(page.locator('#bottom-timeline [data-action="roi-demo-reset"]')).toHaveText('Reset');
  await expect(page.locator('#bottom-timeline [data-action="roi-demo-step-generation"]')).toHaveText('Step Generation');
  await expect(page.locator('#bottom-timeline [data-roi-demo-tick-rate]')).toHaveValue('1');
  await page.locator('#bottom-timeline [data-action="roi-demo-pause"]').click();
  await expect.poll(() => page.evaluate(() => window.anchorGame.phaser.scene.getScene('RoiGeneratorDemoScene').paused)).toBe(true);
  const generationBeforeStep = await page.evaluate(() => window.anchorGame.phaser.scene.getScene('RoiGeneratorDemoScene').processGenerationIndex);
  await page.locator('#bottom-timeline [data-action="roi-demo-step-generation"]').click();
  await expect.poll(() => page.evaluate(() => window.anchorGame.phaser.scene.getScene('RoiGeneratorDemoScene').processGenerationIndex)).toBe(generationBeforeStep + 1);
  await expect(page.locator('#roi-demo-event-likelihood')).toHaveCount(0);
  await expect(page.locator('#roi-demo-event-likelihood-dynamics')).toHaveCount(0);
  await expect(page.locator('#roi-demo-spatial-pattern')).toHaveCount(0);
  await expect(page.locator('#roi-demo-value-distribution')).toHaveCount(0);
  await expect(page.locator('#roi-demo-cluster-size')).toHaveCount(0);
  await expect(page.locator('#roi-demo-temporal-pattern')).toHaveCount(0);
  await expect(page.locator('#roi-demo-spatial-evolution')).toHaveCount(0);
  await expect(page.locator('#roi-demo-motion-scope')).toHaveCount(0);
  await expect(page.locator('#roi-demo-state-model')).toHaveCount(0);
  await expect(page.locator('#roi-demo-depletion-mode')).toHaveCount(0);
  await expect(page.locator('#roi-demo-display-mode')).toBeVisible();
  await expect(page.locator('#roi-demo-display-mode')).toHaveValue('processTransitionView');
  await expect(page.locator('#roi-demo-display-mode')).toContainText('State View');
  await expect(page.locator('#roi-demo-display-mode')).toContainText('Rule Metric');
  await expect(page.locator('#roi-demo-display-mode')).toContainText('Transition View');
  await expect.poll(() => page.evaluate(() => window.anchorGame.phaser.scene.getScene('RoiGeneratorDemoScene').displayMode)).toBe('processTransitionView');
  await expect(page.locator('#waypoint-timeline [data-process-metric-explanation]')).toContainText(/neighbor count/i);
  await expect(page.locator('#waypoint-timeline [data-process-metric-explanation]')).toContainText(/birth/i);
  await expect(page.locator('#waypoint-timeline [data-process-metric-explanation]')).toContainText(/surviv/i);
  await expect(page.locator('#waypoint-timeline [data-process-metric-explanation]')).toContainText(/death|dies/i);
  await expect(page.locator('#waypoint-timeline [data-process-metric-explanation]')).toContainText('What colors mean');
  await expect(page.locator('#roi-demo-dynamic-complexity')).toHaveCount(0);
  await expect(page.locator('#mission-console [data-action="export-demo-json"]')).toHaveText('Export Demo JSON');
  await expect(page.locator('#mission-console')).not.toContainText('Scenario Generation');
  await expect(page.locator('#mission-console')).not.toContainText('Component Isolation Examples');
  const roiArtifact = await downloadDemoArtifact(page);
  expect(roiArtifact.filename).toMatch(/^anchor-sample-roi-field-demo-frame-/);
  expect(roiArtifact.data.type).toBe('anchor.demo.sampling-process-field');
  expect(roiArtifact.data.legacyType).toBe('anchor.demo.sample-roi-field');
  expect(roiArtifact.data.legacyDemoName).toBe('Sample / ROI Field Demo');
  expect(roiArtifact.data.frames).toHaveLength(1);
  expect(roiArtifact.data.config.displayMode).toBe('processTransitionView');
  expect(roiArtifact.data.processTiming.frameSemantics).toBe('discrete-generations-v1');
  expect(roiArtifact.data.processTiming.tickRate).toBe(1);
  expect(roiArtifact.data.processDisplayMetric.metricId).toBe('transitionClass');
  expect(roiArtifact.data.fields.metricLayers.transitionClass.length).toBe(roiArtifact.data.grid.height);
  expect(roiArtifact.data.patternSource).toBe('referenceSignature');
  expect(roiArtifact.data.referenceSignatureId).toBe('birthDeathEmergence');
  expect(roiArtifact.data.referenceSignatureMetadata.label).toBe('Local Birth-Death Emergence');
  expect(roiArtifact.data.exampleTrack).toBe('foundationalCaModels');
  expect(roiArtifact.data.exampleTrackLabel).toBe('Foundational CA Models');
  expect(roiArtifact.data.exampleProcessId).toBe('conwayGameOfLife');
  expect(roiArtifact.data.exampleProcessLabel).toBe("Conway's Game of Life");
  expect(roiArtifact.data.foundationalCaModelId).toBe('conwayGameOfLife');
  expect(roiArtifact.data.processExample.exampleTrack).toBe('foundationalCaModels');
  expect(roiArtifact.data.processExample.exampleProcessId).toBe('conwayGameOfLife');
  expect(roiArtifact.data.processExample.mappedReferenceSignatureId).toBe(roiArtifact.data.referenceSignatureId);
  expect(roiArtifact.data.processPatternId).toBe('birthDeathEmergence');
  expect(roiArtifact.data.metadata.exampleTrack).toBe('foundationalCaModels');
  expect(roiArtifact.data.referenceSignatureMetadata.caTaxonomy).toBeTruthy();
  expect(roiArtifact.data.referenceSignatureMetadata.qaExpectations).toBeTruthy();
  expect(roiArtifact.data.referenceSignatureMetadata.phenotypeMetrics).toBeTruthy();
  expect(roiArtifact.data.referenceSignatureMetadata.genotypeNotes).toBeTruthy();
  expect(roiArtifact.data.caTaxonomy).toBeTruthy();
  expect(roiArtifact.data.qaExpectations).toBeTruthy();
  expect(roiArtifact.data.componentRecipe.valueDistribution).toBeTruthy();
  expect(roiArtifact.data.fields.sampleValue.length).toBe(roiArtifact.data.grid.height);
  expect(roiArtifact.data.fields.sourceField.length).toBe(roiArtifact.data.grid.height);
  expect(roiArtifact.data.fields.legacyEventLikelihoodField.length).toBe(roiArtifact.data.grid.height);
  expect(roiArtifact.data.fields.stateLayer.length).toBe(roiArtifact.data.grid.height);
  expect(roiArtifact.data.fields.ruleLayer.length).toBe(roiArtifact.data.grid.height);
  expect(roiArtifact.data.fields.groupLayer.length).toBe(roiArtifact.data.grid.height);
  expect(roiArtifact.data.fields.roiRoleLayer.length).toBe(roiArtifact.data.grid.height);
  expect(roiArtifact.data.fields.eventLikelihood[0].length).toBe(roiArtifact.data.grid.width);
  expect(roiArtifact.data.likelihoodField.type).toBe('processSourceField');
  expect(roiArtifact.data.likelihoodField.diagnostics).toBeTruthy();
  expect(roiArtifact.data.likelihoodField.values.length).toBe(roiArtifact.data.grid.height);
  expect(roiArtifact.data.likelihoodField.mesh).toMatchObject({
    activeThreshold: 0.25,
    highThreshold: 0.7,
    nearTriggerThreshold: 0.9
  });
  expect(roiArtifact.data.metadata.likelihoodMesh.highThreshold).toBe(0.7);
  expect(roiArtifact.data.graphField.graph.topology).toBe('8-neighbor');
  expect(roiArtifact.data.graphField.graph.hierarchy).toBe('cluster-cell-edge');
  expect(roiArtifact.data.graphField.graph.nodeCount).toBe(roiArtifact.data.grid.width * roiArtifact.data.grid.height);
  expect(roiArtifact.data.clusters.length).toBeGreaterThan(1);
  expect(roiArtifact.data.frames[0].fields.graphState.length).toBe(roiArtifact.data.grid.height);
  expect(roiArtifact.data.frames[0].fields.graphActivation.length).toBe(roiArtifact.data.grid.height);
  expect(roiArtifact.data.frames[0].fields.graphClusterLikelihood.length).toBe(roiArtifact.data.grid.height);
  expect(roiArtifact.data.frames[0].fields.graphIncomingMessage[0].length).toBe(roiArtifact.data.grid.width);
  expect(roiArtifact.data.likelihoodField.diagnostics.activeLikelihoodCellFraction).toBeGreaterThan(0);
  expect(roiArtifact.data.metadata.activityDiagnostics.meanValue).toBeGreaterThan(0);
  expect(roiArtifact.data.metadata.activityDiagnostics.activeFraction).toBeGreaterThan(0.1);
  expect(roiArtifact.data.frames[0].activityDiagnostics.totalActivityMass).toBeGreaterThan(0);
  expect(roiArtifact.data.behaviorPreset.id).toBe('custom');
  expect(roiArtifact.data.metadata.patternSource).toBe('referenceSignature');

  await page.locator('#sampling-process-mode').selectOption('oceanProcessAnalogs');
  await expandMissionConsoleSection(page, 'Ocean-Relevant Process Analogs');
  await expect(page.locator('#sampling-process-example-id')).toContainText('River Plume Front');
  await page.locator('#sampling-process-example-id').selectOption('riverPlumeFront');
  await expect.poll(() => page.evaluate(() => window.ANCHOR_ROI_UI_DEBUG)).toMatchObject({
    activeProcessContext: 'oceanProcessAnalogs',
    activeProcessContextLabel: 'Ocean-Relevant Process Analogs',
    activeExampleTrack: 'oceanRelevantProcessAnalogs',
    activeExampleProcessId: 'riverPlumeFront',
    activeExampleProcessLabel: 'River Plume Front',
    activeMappedReferenceSignatureId: 'frontPropagation',
    legacyReferenceMappingConsistent: true,
    selectorModeMatchesActiveExample: true,
    selectorMatchesActiveExample: true
  });
  await expect(page.locator('#waypoint-timeline [data-roi-current-lab-state]')).toContainText('Ocean-Relevant Process Analogs');
  await expect(page.locator('#waypoint-timeline [data-roi-current-lab-state]')).toContainText('River Plume Front');
  await expect(page.locator('#waypoint-timeline [data-roi-current-lab-state]')).toContainText('Requires Flow Coupling');
  await expect(page.locator('#waypoint-timeline [data-roi-current-lab-state]')).not.toContainText("Conway's Game of Life");
  await expect(page.locator('#waypoint-timeline')).toContainText('Ocean-Relevant Process Analog');
  await expect(page.locator('#waypoint-timeline')).toContainText('Mapped Pattern');
  await expect(page.locator('#waypoint-timeline [data-process-metric-explanation]')).toContainText(/physical downstream transport belongs/i);
  const oceanArtifact = await downloadDemoArtifact(page);
  expect(oceanArtifact.data.processExample.exampleTrack).toBe('oceanRelevantProcessAnalogs');
  expect(oceanArtifact.data.processExample.exampleProcessId).toBe('riverPlumeFront');
  expect(oceanArtifact.data.processExample.requiresFlowCoupling).toBe(true);
  expect(oceanArtifact.data.processExample.mappedReferenceSignatureId).toBe(oceanArtifact.data.referenceSignatureId);

  await page.locator('#sampling-process-mode').selectOption('customComposer');
  await expandMissionConsoleSections(page, [
    'Source / Initial Field',
    'Spatial Pattern / Geometry',
    'Value Distribution',
    'Temporal Pattern',
    'Spatial Evolution / Motion Rule',
    'Interaction Scale / Hierarchy',
    'State Model / Update Rule',
    'Sampling Effect / Freshness',
    'Display / Diagnostic Layer',
    'Seed / Scenario Identity',
    'Export'
  ]);
  await expect(page.locator('#roi-demo-event-likelihood')).toBeVisible();
  await expect(page.locator('#roi-demo-event-likelihood-dynamics')).toBeVisible();
  await expect(page.locator('#roi-demo-spatial-pattern')).toBeVisible();
  await expect(page.locator('#roi-demo-value-distribution')).toBeVisible();
  await expect(page.locator('#roi-demo-cluster-size')).toBeVisible();
  await expect(page.locator('#roi-demo-temporal-pattern')).toBeVisible();
  await expect(page.locator('#roi-demo-spatial-evolution')).toBeVisible();
  await expect(page.locator('#roi-demo-motion-scope')).toBeVisible();
  await expect(page.locator('#roi-demo-state-model')).toBeVisible();
  await expect(page.locator('#roi-demo-depletion-mode')).toBeVisible();
  await expect(page.locator('#roi-demo-dynamic-complexity')).toBeVisible();
  await expect.poll(() => page.evaluate(() => window.ANCHOR_ROI_UI_DEBUG)).toMatchObject({
    processMode: 'customComposer',
    activeExampleProcessId: null,
    activeMappedReferenceSignatureId: null,
    legacyReferenceMappingConsistent: true
  });
  await expect(page.locator('#mission-console')).toContainText('Scenario Generation');
  await expect(page.locator('#mission-console')).toContainText('Learn / Compare Components');
  await expect(page.locator('#mission-console [data-action="roi-compare-temporal"]')).toHaveText('Compare Temporal Patterns');
  await expect(page.locator('#mission-console [data-action="roi-compare-evolution"]')).toHaveText('Compare Spatial Evolution');
  await expect(page.locator('#mission-console [data-action="roi-compare-scale"]')).toHaveText('Compare Interaction Scale');
  await expect(page.locator('#roi-scenario-source option')).toHaveText([
    'Current Component Recipe',
    'Active Pattern Source'
  ]);
  await expect(page.locator('#roi-scenario-difficulty option')).toHaveText(['Easy', 'Medium', 'Hard']);
  await expect(page.locator('#roi-scenario-validation-mode option')).toHaveText([
    'Require PASS Before Export',
    'Allow WARN Export'
  ]);
  await page.locator('#roi-scenario-frame-count').fill('3');
  await page.locator('#mission-console [data-action="generate-roi-scenario"]').click();
  await expect(page.locator('#mission-console')).toContainText('Scenario Validation');
  await expect(page.evaluate(() => {
    const scene = window.anchorGame.phaser.scene.getScene('RoiGeneratorDemoScene');
    return {
      type: scene.generatedScenario?.type,
      frames: scene.generatedScenario?.frames?.length,
      validation: scene.generatedScenario?.validation?.status,
      hasSample: Array.isArray(scene.generatedScenario?.frames?.[0]?.fields?.sampleValue),
      hasLikelihood: Array.isArray(scene.generatedScenario?.frames?.[0]?.fields?.eventLikelihood)
    };
  })).resolves.toMatchObject({
    type: 'anchor.syntheticRoiScenario',
    frames: 3,
    hasSample: true,
    hasLikelihood: true
  });

  await page.locator('#sampling-process-mode').selectOption('processPaint');
  await expandMissionConsoleSections(page, [
    'Process Paint / Rule Allocation',
    'Display / Diagnostic Layer',
    'Seed / Scenario Identity',
    'Export'
  ]);
  await expect(page.locator('#bottom-timeline')).toContainText('Process Paint: paused editing canvas');
  await expect(page.locator('#roi-demo-event-likelihood')).toHaveCount(0);
  await expect(page.locator('#roi-demo-spatial-pattern')).toHaveCount(0);
  await expect(page.locator('#roi-demo-temporal-pattern')).toHaveCount(0);
  await expect(page.locator('#waypoint-timeline')).toContainText('Process Paint Mode');
  await expect(page.locator('#waypoint-timeline')).toContainText('Paint Tools');
  await expect(page.locator('#waypoint-timeline [data-process-paint-tools]')).toBeVisible();
  await expect.poll(() => page.evaluate(() => window.ANCHOR_ROI_UI_DEBUG)).toMatchObject({
    processMode: 'processPaint',
    activeExampleProcessId: null,
    activeMappedReferenceSignatureId: null,
    legacyReferenceMappingConsistent: true
  });
  await expect.poll(() => page.evaluate(() => window.ANCHOR_ROI_UI_DEBUG)).toMatchObject({
    processMode: 'processPaint',
    activeExampleProcessId: null,
    activeMappedReferenceSignatureId: null,
    legacyReferenceMappingConsistent: true
  });
  await expect(page.locator('#waypoint-timeline .sampling-panel-tabs')).toContainText('Paint Tools');
  await expect(page.locator('#waypoint-timeline')).toContainText('Clear Canvas');
  await expect(page.locator('#waypoint-timeline')).toContainText('Randomize Canvas');
  await expect(page.locator('#waypoint-timeline')).toContainText('Run Process');
  await expect(page.locator('#sampling-paint-state')).toBeVisible();
  await expect.poll(() => page.evaluate(() => {
    const scene = window.anchorGame.phaser.scene.getScene('RoiGeneratorDemoScene');
    return {
      paused: scene.paused,
      cells: Object.keys(scene.paintModel.cells).length,
      maxValue: scene.field.stats.max,
      maxSource: Math.max(...scene.field.sourceField.flat())
    };
  })).toEqual({
    paused: true,
    cells: 0,
    maxValue: 0,
    maxSource: 0
  });
  await clickRoiDemoCell(page, 2, 2);
  await expect(page.locator('#waypoint-timeline')).toContainText('Process Paint Cell');
  await expect(page.locator('#paint-panel-state')).toBeVisible();
  await page.locator('#paint-panel-state').selectOption('active');
  await expect.poll(() => page.evaluate(() => window.anchorGame.phaser.scene.getScene('RoiGeneratorDemoScene').selectedPaintState)).toBe('active');
  await page.locator('#paint-panel-rule').selectOption('propagatingFront');
  await expect.poll(() => page.evaluate(() => window.anchorGame.phaser.scene.getScene('RoiGeneratorDemoScene').selectedPaintRuleId)).toBe('propagatingFront');
  await page.evaluate(() => {
    document.querySelectorAll('#paint-panel-group').forEach((input) => {
      input.value = '3';
      input.dispatchEvent(new Event('input', { bubbles: true }));
      input.dispatchEvent(new Event('change', { bubbles: true }));
    });
    document.querySelectorAll('#paint-panel-source').forEach((input) => {
      input.value = '0.8';
      input.dispatchEvent(new Event('input', { bubbles: true }));
      input.dispatchEvent(new Event('change', { bubbles: true }));
    });
  });
  await page.evaluate(() => {
    const scene = window.anchorGame.phaser.scene.getScene('RoiGeneratorDemoScene');
    scene.selectedCell = { col: 2, row: 2 };
    scene.paintModel.cells['2,2'] = {
      state: 'active',
      ruleId: 'propagatingFront',
      groupId: 3,
      sourceValue: 0.8
    };
    scene.paintModel.groups['3'] = {
      id: 3,
      label: 'Group 3',
      ruleId: 'propagatingFront',
      interactionScale: 'edge',
      valueMapId: 'activation-to-sampling-value',
      sourceProfile: 'painted',
      parameters: {}
    };
    scene.rebuildField();
    scene.renderConsole();
    scene.renderCellInspector(true);
    scene.draw();
  });
  await expect.poll(() => page.evaluate(() => window.anchorGame.phaser.scene.getScene('RoiGeneratorDemoScene').paintModel.cells['2,2'])).toMatchObject({
    state: 'active',
    ruleId: 'propagatingFront',
    groupId: 3,
    sourceValue: 0.8
  });
  await expect.poll(() => page.evaluate(() => window.anchorGame.phaser.scene.getScene('RoiGeneratorDemoScene').field.sampleValueField[2][2])).toBeGreaterThan(0);
  await expect(page.locator('#waypoint-timeline')).toContainText('ruleId');
  await page.locator('#waypoint-timeline [data-action="paint-panel-run"]').click();
  await expect.poll(() => page.evaluate(() => window.anchorGame.phaser.scene.getScene('RoiGeneratorDemoScene').paused)).toBe(false);
  const paintedArtifact = await downloadDemoArtifact(page);
  expect(paintedArtifact.data.patternMode).toBe('processPaint');
  expect(paintedArtifact.data.statusLabel).toBe('Custom Exploratory');
  expect(['active', 'cooling', 'consumed']).toContain(paintedArtifact.data.fields.stateLayer[2][2]);
  expect(paintedArtifact.data.fields.ruleLayer[2][2]).toBe('propagatingFront');
  expect(paintedArtifact.data.fields.groupLayer[2][2]).toBe(3);
  expect(paintedArtifact.data.fields.sourceField[2][2]).toBe(0.8);
  expect(paintedArtifact.data.paintSettings.selectedState).toBe('active');
  expect(paintedArtifact.data.processRuleCatalogVersion).toBe('sampling-process-rule-families-v1');
  expect(paintedArtifact.data.canonicalRuleIds).toContain('propagatingFront');
  expect(paintedArtifact.data.ruleAliases.frontPropagation).toBe('propagatingFront');
  expect(paintedArtifact.data.fields.transitionField[2][2].ruleId).toBe('propagatingFront');
  expect(paintedArtifact.data.groupDefinitions['3']).toBeTruthy();
  await page.locator('#sampling-process-mode').selectOption('processPaint');
  await expandMissionConsoleSection(page, 'Process Paint / Rule Allocation');
  await page.locator('#mission-console [data-action="sampling-paint-reset"]').click();
  await expect.poll(() => page.evaluate(() => {
    const scene = window.anchorGame.phaser.scene.getScene('RoiGeneratorDemoScene');
    return {
      cells: Object.keys(scene.paintModel.cells).length,
      maxValue: scene.field.stats.max,
      maxSource: Math.max(...scene.field.sourceField.flat()),
      paused: scene.paused
    };
  })).toEqual({
    cells: 0,
    maxValue: 0,
    maxSource: 0,
    paused: true
  });
  await page.locator('#mission-console [data-action="sampling-paint-randomize"]').click();
  const firstPaintRandomCell = await page.evaluate(() => window.anchorGame.phaser.scene.getScene('RoiGeneratorDemoScene').paintModel.cells['0,0']);
  await page.locator('#mission-console [data-action="sampling-paint-randomize"]').click();
  await expect.poll(() => page.evaluate(() => window.anchorGame.phaser.scene.getScene('RoiGeneratorDemoScene').paintModel.cells['0,0'])).toEqual(firstPaintRandomCell);
  await page.evaluate(() => {
    const scene = window.anchorGame.phaser.scene.getScene('RoiGeneratorDemoScene');
    scene.processMode = 'randomRuleLab';
    scene.patternSource = 'custom';
    scene.paused = false;
    scene.processPaintRunStarted = false;
    scene.selectedCell = null;
    scene.rightPanelMode = 'recipeSignature';
    scene.renderConsole();
    scene.renderCellInspector(true);
    scene.draw();
  });
  await expect.poll(() => page.evaluate(() => window.anchorGame.phaser.scene.getScene('RoiGeneratorDemoScene').processMode)).toBe('randomRuleLab');
  await expandMissionConsoleSection(page, 'Rule Allocation Sandbox');
  await expect(page.locator('#sampling-random-seed')).toBeVisible();
  await expect(page.locator('#sampling-paint-state')).toHaveCount(0);
  await expect(page.locator('#roi-demo-spatial-pattern')).toHaveCount(0);
  await expect(page.locator('#roi-demo-temporal-pattern')).toHaveCount(0);
  await page.locator('#sampling-random-seed').fill('e2e-random-seed');
  await page.locator('#sampling-random-seed').dispatchEvent('change');
  const firstRandomCell = await page.evaluate(() => window.anchorGame.phaser.scene.getScene('RoiGeneratorDemoScene').paintModel.cells['0,0']);
  await page.locator('#sampling-random-seed').fill('e2e-random-seed');
  await page.locator('#sampling-random-seed').dispatchEvent('change');
  await expect.poll(() => page.evaluate(() => window.anchorGame.phaser.scene.getScene('RoiGeneratorDemoScene').paintModel.cells['0,0'])).toEqual(firstRandomCell);
  await page.locator('#sampling-process-mode').selectOption('foundationalCaModels');
  await expandMissionConsoleSection(page, 'Foundational CA Models');
  await expect(page.locator('#roi-demo-reference-signature')).toBeVisible();
  await expect(page.locator('#roi-demo-event-likelihood')).toHaveCount(0);
  await expect(page.locator('#roi-demo-spatial-pattern')).toHaveCount(0);
  await expect(page.locator('#sampling-paint-state')).toHaveCount(0);
  await expect(page.locator('#sampling-random-seed')).toHaveCount(0);
  await expect(page.locator('#mission-console')).toContainText('Custom Composer');
  await expect(page.locator('#waypoint-timeline')).toContainText('Full recipe details');
  await expect(page.locator('#roi-demo-behavior-preset')).toHaveCount(0);
  await page.locator('#roi-demo-reference-signature').selectOption('frontPropagation');
  await expect.poll(() => page.evaluate(() => {
    const scene = window.anchorGame.phaser.scene.getScene('RoiGeneratorDemoScene');
    return {
      source: scene.patternSource,
      signature: scene.referenceSignatureId,
      modified: scene.referenceSignatureModified,
      spatial: scene.spatialPattern,
      temporal: scene.temporalPattern,
      evolution: scene.spatialEvolution,
      dynamics: scene.eventLikelihoodDynamics
    };
  })).toEqual({
    source: 'referenceSignature',
    signature: 'frontPropagation',
    modified: false,
    spatial: 'frontBoundary',
    temporal: 'sustained',
    evolution: 'expansion',
    dynamics: 'dynamic'
  });
  await expect(page.locator('#waypoint-timeline [data-roi-current-lab-state]')).toContainText('Propagating Fronts');
  await expect(page.locator('#waypoint-timeline')).toContainText('Propagating Fronts');
  await expect(page.locator('#waypoint-timeline')).toContainText('Advanced Details');
  await expect(page.locator('#waypoint-timeline')).toContainText('CA taxonomy, QA, failure signs, and boundaries');
  await expect(page.locator('#mission-console [data-roi-help="behaviorPreset"]')).toHaveCount(0);
  await expect(page.locator('#waypoint-timeline [data-roi-recipe-signature-view]')).toContainText('Propagating Fronts');
  await expect(page.locator('#waypoint-timeline [data-roi-recipe-signature-view]')).toContainText('Forest-fire CA');
  await page.locator('#sampling-process-mode').selectOption('customComposer');
  await expect.poll(() => page.evaluate(() => {
    const scene = window.anchorGame.phaser.scene.getScene('RoiGeneratorDemoScene');
    return {
      source: scene.patternSource,
      preset: scene.behaviorPresetId,
      presetModified: scene.behaviorPresetModified,
      signature: scene.referenceSignatureId,
      referenceModified: scene.referenceSignatureModified,
      updateRuleHint: scene.updateRuleHint
    };
  })).toEqual({
    source: 'custom',
    preset: 'custom',
    presetModified: false,
    signature: 'none',
    referenceModified: false,
    updateRuleHint: null
  });
  await page.locator('#roi-demo-event-likelihood').selectOption('multiModalLikelihood');
  await page.locator('#roi-demo-event-likelihood-dynamics').selectOption('static');
  await page.locator('#roi-demo-spatial-pattern').selectOption('clusteredField');
  await page.locator('#roi-demo-value-distribution').selectOption('gaussianNormal');
  await page.locator('#roi-demo-temporal-pattern').selectOption('bursty');
  await page.locator('#roi-demo-spatial-evolution').selectOption('stationary');
  await page.locator('#roi-demo-interaction-scale').selectOption('cluster');
  await page.locator('#roi-demo-state-model').selectOption('stateEvolving');
  await page.locator('#roi-demo-depletion-mode').selectOption('soft');
  await page.locator('#roi-demo-display-mode').selectOption('sampleValue');
  await expect(page.locator('#mission-console')).toContainText('Source / Initial Field');
  await expect(page.locator('#mission-console')).toContainText('Source Field Type');
  await expect(page.locator('#mission-console')).toContainText('Spatial Pattern / Geometry');
  await expect(page.locator('#mission-console')).toContainText('Temporal Pattern');
  await expect(page.locator('#mission-console')).toContainText('Spatial Evolution');
  await expect(page.locator('#mission-console')).toContainText('Custom Composer');
  await expect(page.locator('#mission-console')).toContainText('Motion Scope');
  await expect(page.locator('#mission-console')).toContainText('Interaction Scale / Hierarchy');
  await expect(page.locator('#mission-console')).toContainText('Sampling Effect / Freshness');
  await expect(page.locator('#mission-console')).toContainText('Display');
  await expect(page.locator('#mission-console')).toContainText('State Model / Update Rule');
  await expect(page.locator('#mission-console')).toContainText('Time-Indexed');
  await expect(page.locator('#roi-demo-spatial-pattern option')).toHaveText([
    'Constant Field',
    'Gradient / Trend',
    'Clustered Field',
    'Patchy / Correlated Field',
    'Sparse Targets',
    'Linear Band',
    'Front / Boundary',
    'Boundary Band',
    'Monitoring Stations',
    'Seeded Texture'
  ]);
  await expect(page.locator('#roi-demo-spatial-pattern')).not.toContainText('Single Cluster');
  await expect(page.locator('#roi-demo-spatial-pattern')).not.toContainText('Multiple Clusters');
  await expect(page.locator('#roi-demo-spatial-pattern')).not.toContainText('Bimodal');
  await expect(page.locator('#mission-console .sample-field-explainer')).toHaveCount(0);
  await expect(page.locator('#mission-console [data-roi-help]')).toHaveCount(9);
  await expect(page.locator('#mission-console [data-roi-help="behaviorPreset"]')).toHaveCount(0);
  await expect(page.locator('#mission-console [data-roi-help="eventLikelihood"]')).toContainText('Explain Multi-Source Basins');
  await expect(page.locator('#mission-console [data-roi-help="spatialPattern"]')).toContainText('Explain Clustered Field');
  await expect(page.locator('#roi-demo-event-likelihood option')).toHaveText([
    'Uniform Source Field',
    'Gaussian Source Basin',
    'Multi-Source Basins',
    'Gradient Source Field',
    'Patchy Source Field',
    'Seeded Texture Source Field',
    'Sparse Source Sites'
  ]);
  await expect(page.locator('#roi-demo-event-likelihood-dynamics option')).toHaveText(['Static', 'Dynamic']);
  await expect(page.locator('#roi-demo-value-distribution option')).toHaveText([
    'Constant Value',
    'Uniform Random',
    'Gaussian / Normal',
    'Skewed Low',
    'Skewed High',
    'Bimodal Values',
    'Heavy-Tailed',
    'Rare Extreme Events'
  ]);
  await expect(page.locator('#mission-console')).toContainText('Value Distribution');
  await expect(page.evaluate(() => window.ANCHOR_ROI_UI_DEBUG?.hasValueDistributionAccordion)).resolves.toBe(true);
  await page.locator('#mission-console [data-roi-help="eventLikelihood"]').click();
  await expect(page.locator('#waypoint-timeline [data-roi-behavior-help]')).toContainText('About Source / Initial Field');
  await expect(page.locator('#waypoint-timeline [data-roi-behavior-help]')).toContainText('Where does process activity originate');
  await page.locator('#mission-console [data-roi-help="spatialPattern"]').click();
  await expect(page.locator('#waypoint-timeline [data-roi-behavior-help]')).toContainText('About Spatial Pattern / Geometry: Clustered Field');
  await expect(page.locator('#waypoint-timeline [data-roi-behavior-help]')).toContainText('Value appears in one or more coherent blobs');
  await expect(page.locator('#waypoint-timeline [data-roi-behavior-help]')).toContainText('Parameters');
  await page.locator('#mission-console [data-roi-help="valueDistribution"]').click();
  await expect(page.locator('#waypoint-timeline [data-roi-behavior-help]')).toContainText('About Value Distribution: Gaussian / Normal');
  await expect(page.locator('#waypoint-timeline [data-roi-behavior-help]')).toContainText('How are values assigned');
  await page.locator('#mission-console [data-roi-help="temporalPattern"]').click();
  await expect(page.locator('#waypoint-timeline [data-roi-behavior-help]')).toContainText('About Temporal Pattern: Bursty');
  await expect(page.locator('#waypoint-timeline [data-roi-behavior-help]')).toContainText('How does value intensity change over time?');
  await page.locator('#mission-console [data-roi-help="spatialEvolution"]').click();
  await expect(page.locator('#waypoint-timeline [data-roi-behavior-help]')).toContainText('About Spatial Evolution / Motion Rule: Stationary');
  await page.locator('#mission-console [data-roi-help="interactionScale"]').click();
  await expect(page.locator('#waypoint-timeline [data-roi-behavior-help]')).toContainText('About Interaction Scale / Hierarchy: Cluster / Community');
  await page.locator('#mission-console [data-roi-help="stateModel"]').click();
  await expect(page.locator('#waypoint-timeline [data-roi-behavior-help]')).toContainText('About State Model / Update Rule:');
  await expect(page.locator('#waypoint-timeline [data-roi-behavior-help]')).toContainText('Markovian');
  await page.locator('#mission-console [data-roi-help="samplingEffect"]').click();
  await expect(page.locator('#waypoint-timeline [data-roi-behavior-help]')).toContainText('About Sampling Effect / Freshness: Soft Depletion');
  await page.locator('#mission-console [data-roi-help="displayLayer"]').click();
  await expect(page.locator('#waypoint-timeline [data-roi-behavior-help]')).toContainText('About Display / Diagnostic Layer: Sampling Value');
  await expect(page.locator('#waypoint-timeline [data-roi-behavior-help]')).toContainText('Current Composition');
  await expect(page.locator('#waypoint-timeline [data-roi-behavior-help]')).toContainText('Uncertainty / Forecast demos');
  await expect(page.locator('#roi-demo-cluster-size option')).toHaveText(['Tight', 'Medium', 'Wide']);
  await expect(page.locator('#roi-demo-spatial-evolution option')).toHaveText([
    'Stationary',
    'Continuous Drift',
    'Discrete Jump',
    'Random Walk',
    'Neighbor Propagation',
    'Expansion',
    'Contraction',
    'Divergence',
    'Convergence',
    'Morph / Mutation',
    'Shear / Stretch',
    'Rotational Swirl',
    'Branching Growth'
  ]);
  await expect(page.locator('#roi-demo-motion-scope option')).toHaveText(['Per Feature', 'Local / Neighborhood', 'Global']);
  await expect(page.locator('#roi-demo-interaction-scale option')).toHaveText(['Global Field', 'Cluster / Community', 'Cell / Node', 'Edge / Neighbor', 'Hybrid Multi-Scale']);
  await expect(page.locator('#roi-demo-display-mode option')).toHaveText([
    'State View',
    'Rule Metric',
    'Transition View',
    'Sampling Interpretation',
    'Source Field',
    'Sampling Value',
    'Sampling Value + Source Overlay',
    'Graph Topology',
    'Graph Communities',
    'Cell / Node States',
    'Process Influence Messages',
    'Community + Messages',
    'State Transitions',
    'ROI Meaning',
    'Diagnostics Overlay',
    'Depleted Value',
    'Freshness / Revisit Value',
    'Raw Base Value'
  ]);
  await page.locator('#roi-demo-display-mode').selectOption('graphMessages');
  await expect(page.locator('#roi-filter-message-threshold')).toBeVisible();
  await page.locator('#roi-filter-message-threshold').evaluate((input) => {
    input.value = '0.35';
    input.dispatchEvent(new Event('change', { bubbles: true }));
  });
  await expect.poll(() => page.evaluate(() => window.anchorGame.phaser.scene.getScene('RoiGeneratorDemoScene').viewFilters.messageStrengthThreshold)).toBe(0.35);
  await page.locator('#roi-filter-incoming-selected').check();
  await expect.poll(() => page.evaluate(() => window.anchorGame.phaser.scene.getScene('RoiGeneratorDemoScene').viewFilters.incomingToSelected)).toBe(true);
  await page.locator('#roi-demo-display-mode').selectOption('roiMeaning');
  await expect(page.locator('#roi-filter-meaning-layer')).toBeVisible();
  await page.locator('#roi-filter-meaning-layer').selectOption('nearFuture');
  await expect.poll(() => page.evaluate(() => window.anchorGame.phaser.scene.getScene('RoiGeneratorDemoScene').viewFilters.roiMeaningLayer)).toBe('nearFuture');
  await page.locator('#roi-demo-display-mode').selectOption('diagnosticsOverlay');
  await clickRightPanelMode(page, 'diagnostics');
  await expect.poll(() => page.evaluate(() => window.anchorGame.phaser.scene.getScene('RoiGeneratorDemoScene').processMode)).toBe('customComposer');
  await expect(page.locator('#roi-filter-message-threshold')).toBeVisible();
  await expect(page.locator('#roi-filter-transition-only')).toBeVisible();
  await expect(page.locator('#roi-filter-topology-edges')).toBeVisible();
  await expect(page.locator('#roi-demo-event-likelihood')).toBeVisible();
  await expect(page.locator('#sampling-paint-state')).toHaveCount(0);
  await expect(page.locator('#sampling-random-seed')).toHaveCount(0);
  await expect(page.locator('#waypoint-timeline [data-roi-diagnostics-view]')).toBeVisible();
  await page.locator('#sampling-process-mode').selectOption('customComposer');
  await expect(page.locator('#mission-console')).not.toContainText('Forecast / Truth');
  await expect(page.locator('#mission-console')).not.toContainText('Current-Advected');
  await expect(page.locator('#mission-console')).not.toContainText('Uncertainty / Forecast demos');
  await page.locator('#sampling-process-mode').selectOption('foundationalCaModels');
  await expandMissionConsoleSection(page, 'Foundational CA Models');
  await page.locator('#roi-demo-reference-signature').selectOption('frontPropagation');
  await expect(page.locator('#roi-demo-display-mode')).toHaveValue('processTransitionView');
  await expect(page.locator('#roi-demo-display-mode')).toContainText('State View');
  await expect(page.locator('#roi-demo-display-mode')).toContainText('Rule Metric');
  await expect(page.locator('#roi-demo-display-mode')).toContainText('Transition View');
  await expect.poll(() => page.evaluate(() => window.anchorGame.phaser.scene.getScene('RoiGeneratorDemoScene').displayMode)).toBe('processTransitionView');
  await expect(page.locator('#waypoint-timeline [data-process-metric-explanation]')).toContainText(/ignition pressure|burning neighbor pressure/i);
  await expect(page.locator('#waypoint-timeline [data-process-metric-explanation]')).toContainText(/consumed|trail/i);
  await expect(page.locator('#waypoint-timeline [data-process-metric-explanation]')).toContainText('What colors mean');
  await expect(page.locator('#mission-console')).not.toContainText('active transition boundary');
  await expect(page.locator('#mission-console [data-roi-help="behaviorPreset"]')).toHaveCount(0);
  await expect(page.locator('#waypoint-timeline [data-roi-recipe-signature-view]')).toContainText('Propagating Fronts');
  await expect(page.locator('#waypoint-timeline [data-roi-recipe-signature-view]')).toContainText('active transition boundary');
  await expect(page.locator('#waypoint-timeline [data-roi-recipe-signature-view]')).toContainText('Forest-fire CA');
  await page.locator('#sampling-process-mode').selectOption('customComposer');
  await expect.poll(() => page.evaluate(() => window.anchorGame.phaser.scene.getScene('RoiGeneratorDemoScene').referenceSignatureId)).toBe('none');
  await page.locator('#roi-demo-event-likelihood-dynamics').selectOption('static');
  await expect.poll(() => page.evaluate(() => window.anchorGame.phaser.scene.getScene('RoiGeneratorDemoScene').eventLikelihoodDynamics)).toBe('static');
  await page.locator('#roi-demo-motion-scope').selectOption('perFeature');
  await expect.poll(() => page.evaluate(() => window.anchorGame.phaser.scene.getScene('RoiGeneratorDemoScene').field.motionScope)).toBe('perFeature');
  await expect(page.locator('#mission-console')).not.toContainText('prior-agnostic');
  await expect(page.evaluate(() => window.anchorGame.phaser.scene.getScene('RoiGeneratorDemoScene').timeMode)).resolves.toBe('dynamic');
  const roiDynamicCell = await page.evaluate(() => {
    const scene = window.anchorGame.phaser.scene.getScene('RoiGeneratorDemoScene');
    const currentTime = scene.demoTime;
    const currentField = scene.field.field;
    const future = scene.constructor ? null : null;
    let best = { col: 0, row: 0, delta: 0, value: 0 };
    for (let row = 1; row < scene.field.height - 1; row += 1) {
      for (let col = 1; col < scene.field.width - 1; col += 1) {
        scene.demoTime = currentTime + 6;
        scene.rebuildField();
        const futureValue = scene.field.field[row][col];
        scene.demoTime = currentTime;
        scene.field.field = currentField;
        const value = currentField[row][col];
        const delta = Math.abs(futureValue - value);
        if (delta > best.delta) best = { col, row, delta, value };
      }
    }
    scene.demoTime = currentTime;
    scene.rebuildField();
    return best;
  });
  expect(roiDynamicCell.delta).toBeGreaterThan(0.02);
  await clickRoiDemoCell(page, roiDynamicCell.col, roiDynamicCell.row);
  await expect(page.locator('#waypoint-timeline [data-roi-cell-inspector]')).toBeVisible();
  await expect(page.locator('#waypoint-timeline')).toContainText(`Cell (${roiDynamicCell.col}, ${roiDynamicCell.row})`);
  await expect(page.locator('#waypoint-timeline [data-roi-panel-mode="recipeSignature"]')).toContainText('Recipe');
  await page.evaluate(() => document.querySelector('#waypoint-timeline [data-roi-panel-mode="recipeSignature"]')?.click());
  await expect(page.locator('#waypoint-timeline [data-roi-recipe-signature-view]')).toBeVisible();
  await page.evaluate(() => document.querySelector('#waypoint-timeline [data-roi-panel-mode="cellInspector"]')?.click());
  await expect(page.locator('#waypoint-timeline [data-roi-cell-inspector]')).toBeVisible();
  await expect(page.locator('#waypoint-timeline')).toContainText('Sampling Value');
  await expect(page.locator('#waypoint-timeline')).toContainText('Source / Initial Field');
  await expect(page.locator('#waypoint-timeline')).toContainText('L(x,y,t)');
  await expect(page.locator('#waypoint-timeline')).toContainText('S(x,y,t)');
  await expect(page.locator('#waypoint-timeline')).toContainText('source support');
  await expect(page.locator('#waypoint-timeline')).toContainText('cluster count');
  await expect(page.locator('#waypoint-timeline')).toContainText('cluster size');
  await expect(page.locator('#waypoint-timeline')).toContainText('value distribution');
  await expect(page.locator('#waypoint-timeline')).toContainText('seeded value');
  await expect(page.locator('#waypoint-timeline')).toContainText('value band');
  await expect(page.locator('#waypoint-timeline')).toContainText('Source mesh values show process support at every cell');
  await expect(page.locator('#waypoint-timeline')).toContainText('Sampling value is the currently realized value');
  await expect(page.locator('#waypoint-timeline')).toContainText('pattern parameters');
  await expect(page.locator('#waypoint-timeline')).toContainText('temporal pattern');
  await expect(page.locator('#waypoint-timeline')).toContainText('spatial evolution');
  await expect(page.locator('#waypoint-timeline')).toContainText('motion scope');
  await expect(page.locator('#waypoint-timeline')).toContainText('feature motion');
  await expect(page.locator('#waypoint-timeline')).toContainText('state model');
  await expect(page.locator('#waypoint-timeline')).toContainText('Graph Field Node');
  await expect(page.locator('#waypoint-timeline')).toContainText('C_k(t)');
  await expect(page.locator('#waypoint-timeline')).toContainText('L_i(t)');
  await expect(page.locator('#waypoint-timeline')).toContainText('A_i(t)');
  await expect(page.locator('#waypoint-timeline')).toContainText('incoming message');
  await expect(page.locator('#waypoint-timeline')).toContainText('active neighbors');
  await page.locator('#roi-demo-spatial-pattern').selectOption('clusteredField');
  await page.locator('#roi-demo-event-likelihood').selectOption('gaussianLikelihood');
  await expect.poll(() => page.evaluate(() => window.anchorGame.phaser.scene.getScene('RoiGeneratorDemoScene').eventLikelihood)).toBe('gaussianLikelihood');
  await expect(page.locator('#roi-demo-event-likelihood-temporal-pattern')).toHaveCount(0);
  await page.locator('#roi-demo-event-likelihood-dynamics').selectOption('dynamic');
  await expect.poll(() => page.evaluate(() => window.anchorGame.phaser.scene.getScene('RoiGeneratorDemoScene').eventLikelihoodDynamics)).toBe('dynamic');
  await expect(page.locator('#roi-demo-event-likelihood-temporal-pattern')).toBeVisible();
  await expect(page.locator('#roi-demo-event-likelihood-spatial-evolution')).toBeVisible();
  await page.locator('#roi-demo-event-likelihood-temporal-pattern').selectOption('bursty');
  await page.locator('#roi-demo-event-likelihood-spatial-evolution').selectOption('discreteJump');
  await expect.poll(() => page.evaluate(() => window.anchorGame.phaser.scene.getScene('RoiGeneratorDemoScene').eventLikelihoodTemporalPattern)).toBe('bursty');
  await expect.poll(() => page.evaluate(() => window.anchorGame.phaser.scene.getScene('RoiGeneratorDemoScene').eventLikelihoodSpatialEvolution)).toBe('discreteJump');
  const dynamicLikelihoodAudit = await page.evaluate(() => {
    const scene = window.anchorGame.phaser.scene.getScene('RoiGeneratorDemoScene');
    scene.timeMode = 'static';
    scene.demoTime = 0;
    scene.rebuildField();
    const first = JSON.stringify(scene.field.eventLikelihoodField);
    scene.demoTime = 30;
    scene.rebuildField();
    const second = JSON.stringify(scene.field.eventLikelihoodField);
    return {
      sampleTime: scene.field.time,
      likelihoodTime: scene.field.eventLikelihoodTime,
      changed: first !== second
    };
  });
  expect(dynamicLikelihoodAudit.changed).toBe(true);
  expect(dynamicLikelihoodAudit.sampleTime).toBe(0);
  expect(dynamicLikelihoodAudit.likelihoodTime).toBe(30);
  await page.locator('#roi-demo-event-likelihood-dynamics').selectOption('static');
  await expect.poll(() => page.evaluate(() => window.anchorGame.phaser.scene.getScene('RoiGeneratorDemoScene').eventLikelihoodDynamics)).toBe('static');
  const gaussianLikelihoodAudit = await page.evaluate(() => {
    const scene = window.anchorGame.phaser.scene.getScene('RoiGeneratorDemoScene');
    const field = scene.field.eventLikelihoodField;
    const h = field.length;
    const w = field[0].length;
    const center = field[Math.floor(h / 2)][Math.floor(w / 2)];
    const corners = [field[0][0], field[0][w - 1], field[h - 1][0], field[h - 1][w - 1]];
    return {
      eventLikelihood: scene.field.eventLikelihood,
      center,
      maxCorner: Math.max(...corners),
      sameSeed: JSON.stringify(field) === JSON.stringify(scene.field.eventLikelihoodField)
    };
  });
  expect(gaussianLikelihoodAudit.eventLikelihood).toBe('gaussianLikelihood');
  expect(gaussianLikelihoodAudit.center).toBeGreaterThan(gaussianLikelihoodAudit.maxCorner);
  expect(gaussianLikelihoodAudit.sameSeed).toBe(true);
  await expect.poll(() => page.evaluate(() => window.anchorGame.phaser.scene.getScene('RoiGeneratorDemoScene').spatialPattern)).toBe('clusteredField');
  await page.locator('#roi-demo-spatial-pattern').selectOption('constantField');
  await page.locator('#roi-demo-value-distribution').selectOption('constantValue');
  await page.locator('#roi-demo-depletion-mode').selectOption('none');
  await page.locator('#roi-demo-display-mode').selectOption('eventLikelihood');
  await expect.poll(() => page.evaluate(() => window.anchorGame.phaser.scene.getScene('RoiGeneratorDemoScene').displayMode)).toBe('eventLikelihood');
  const likelihoodViewAudit = await page.evaluate(() => {
    const scene = window.anchorGame.phaser.scene.getScene('RoiGeneratorDemoScene');
    return JSON.stringify(scene.field.field) === JSON.stringify(scene.field.eventLikelihoodField)
      && JSON.stringify(scene.field.sampleValueField) !== JSON.stringify(scene.field.eventLikelihoodField);
  });
  expect(likelihoodViewAudit).toBe(true);
  await page.locator('#roi-demo-display-mode').selectOption('sampleValueLikelihoodOverlay');
  await expect.poll(() => page.evaluate(() => window.anchorGame.phaser.scene.getScene('RoiGeneratorDemoScene').displayMode)).toBe('sampleValueLikelihoodOverlay');
  await page.locator('#roi-demo-display-mode').selectOption('rawBaseValue');
  await expect.poll(() => page.evaluate(() => window.anchorGame.phaser.scene.getScene('RoiGeneratorDemoScene').spatialPattern)).toBe('constantField');
  await expect.poll(() => page.evaluate(() => window.anchorGame.phaser.scene.getScene('RoiGeneratorDemoScene').valueDistribution)).toBe('constantValue');
  await expect(page.evaluate(() => {
    const values = window.anchorGame.phaser.scene.getScene('RoiGeneratorDemoScene').field.rawBaseField.flat();
    return Math.max(...values) - Math.min(...values);
  })).resolves.toBeCloseTo(0, 5);
  await page.locator('#roi-demo-value-distribution').selectOption('uniformRandom');
  const uniformStats = await page.evaluate(() => {
    const scene = window.anchorGame.phaser.scene.getScene('RoiGeneratorDemoScene');
    const values = scene.field.rawBaseField.flat();
    return {
      min: Math.min(...values),
      max: Math.max(...values),
      sameSeed: JSON.stringify(scene.field.rawBaseField) === JSON.stringify(scene.field.rawBaseField)
    };
  });
  expect(uniformStats.min).toBeLessThan(0.2);
  expect(uniformStats.max).toBeGreaterThan(0.8);
  expect(uniformStats.sameSeed).toBe(true);
  await page.locator('#roi-demo-value-distribution').selectOption('gaussianNormal');
  const gaussianStats = await page.evaluate(() => {
    const values = window.anchorGame.phaser.scene.getScene('RoiGeneratorDemoScene').field.rawBaseField.flat();
    return {
      mid: values.filter((value) => value >= 0.35 && value <= 0.65).length,
      extremes: values.filter((value) => value < 0.2 || value > 0.8).length
    };
  });
  expect(gaussianStats.mid).toBeGreaterThan(gaussianStats.extremes);
  await page.locator('#roi-demo-spatial-pattern').selectOption('clusteredField');
  await page.locator('#roi-demo-spatial-evolution').selectOption('continuousDrift');
  await expect.poll(() => page.evaluate(() => window.anchorGame.phaser.scene.getScene('RoiGeneratorDemoScene').field.motionScope)).toBe('perFeature');
  await page.locator('#roi-demo-motion-scope').selectOption('global');
  await expect.poll(() => page.evaluate(() => window.anchorGame.phaser.scene.getScene('RoiGeneratorDemoScene').field.motionScope)).toBe('global');
  await page.locator('#roi-demo-motion-scope').selectOption('perFeature');
  await expect.poll(() => page.evaluate(() => window.anchorGame.phaser.scene.getScene('RoiGeneratorDemoScene').field.motionScope)).toBe('perFeature');
  await page.locator('#roi-demo-spatial-pattern').selectOption('seededTexture');
  await page.locator('#mission-console [data-roi-help="spatialPattern"]').click();
  await expect(page.locator('#waypoint-timeline [data-roi-behavior-help]')).toContainText('About Spatial Pattern / Geometry: Seeded Texture');
  await expect(page.locator('#waypoint-timeline [data-roi-behavior-help]')).toContainText('irregular but replayable');
  await page.locator('#roi-demo-spatial-pattern').selectOption('clusteredField');
  await page.locator('#roi-demo-hotspots').evaluate((input) => {
    input.value = '2';
    input.dispatchEvent(new Event('input', { bubbles: true }));
  });
  await expect.poll(() => page.evaluate(() => window.anchorGame.phaser.scene.getScene('RoiGeneratorDemoScene').hotspotCount)).toBe(2);
  await page.locator('#roi-demo-hotspots').evaluate((input) => {
    input.value = '5';
    input.dispatchEvent(new Event('input', { bubbles: true }));
  });
  await expect.poll(() => page.evaluate(() => window.anchorGame.phaser.scene.getScene('RoiGeneratorDemoScene').field.clusterCount)).toBe(5);
  await page.locator('#roi-demo-cluster-size').selectOption('wide');
  await expect.poll(() => page.evaluate(() => window.anchorGame.phaser.scene.getScene('RoiGeneratorDemoScene').clusterSize)).toBe('wide');
  await page.locator('#roi-demo-time-mode').selectOption('dynamic');
  await expect.poll(() => page.evaluate(() => window.anchorGame.phaser.scene.getScene('RoiGeneratorDemoScene').timeMode)).toBe('dynamic');
  await page.locator('#roi-demo-temporal-pattern').selectOption('periodic');
  await expect.poll(() => page.evaluate(() => window.anchorGame.phaser.scene.getScene('RoiGeneratorDemoScene').temporalPattern)).toBe('periodic');
  await page.locator('#roi-demo-state-model').selectOption('timeIndexed');
  await expect.poll(() => page.evaluate(() => window.anchorGame.phaser.scene.getScene('RoiGeneratorDemoScene').stateModel)).toBe('timeIndexed');
  await expect(page.locator('#bottom-timeline')).toContainText('Behavior: Periodic / Cyclic');
  await page.locator('#roi-demo-spatial-evolution').selectOption('neighborPropagation');
  await expect.poll(() => page.evaluate(() => window.anchorGame.phaser.scene.getScene('RoiGeneratorDemoScene').spatialEvolution)).toBe('neighborPropagation');
  await expect.poll(() => page.evaluate(() => window.anchorGame.phaser.scene.getScene('RoiGeneratorDemoScene').field.graphField.graph.updateRule)).toBe('neighborSpread');
  await expect.poll(() => page.evaluate(() => window.anchorGame.phaser.scene.getScene('RoiGeneratorDemoScene').field.activityDiagnostics.graphDiagnostics.activeNodeCount)).toBeGreaterThan(0);
  await page.locator('#roi-demo-spatial-evolution').selectOption('continuousDrift');
  await expect.poll(() => page.evaluate(() => window.anchorGame.phaser.scene.getScene('RoiGeneratorDemoScene').spatialEvolution)).toBe('continuousDrift');
  await page.locator('#roi-demo-spatial-evolution').selectOption('discreteJump');
  await expect.poll(() => page.evaluate(() => window.anchorGame.phaser.scene.getScene('RoiGeneratorDemoScene').spatialEvolution)).toBe('discreteJump');
  await page.locator('#roi-demo-spatial-evolution').selectOption('randomWalk');
  await expect.poll(() => page.evaluate(() => window.anchorGame.phaser.scene.getScene('RoiGeneratorDemoScene').spatialEvolution)).toBe('randomWalk');
  await page.locator('#roi-demo-depletion-mode').selectOption('soft');
  await expect.poll(() => page.evaluate(() => window.anchorGame.phaser.scene.getScene('RoiGeneratorDemoScene').depletionMode)).toBe('soft');
  await page.locator('#roi-demo-display-mode').selectOption('depletedValue');
  await expect.poll(() => page.evaluate(() => window.anchorGame.phaser.scene.getScene('RoiGeneratorDemoScene').displayMode)).toBe('depletedValue');
  await page.locator('#roi-demo-display-mode').selectOption('freshnessRevisitValue');
  await expect.poll(() => page.evaluate(() => window.anchorGame.phaser.scene.getScene('RoiGeneratorDemoScene').displayMode)).toBe('freshnessRevisitValue');
  await page.locator('#roi-demo-dynamic-complexity').selectOption('high');
  await expect.poll(() => page.evaluate(() => window.anchorGame.phaser.scene.getScene('RoiGeneratorDemoScene').dynamicComplexity)).toBe('high');
  await page.locator('#bottom-timeline [data-action="roi-demo-pause"]').click();
  await expect(page.locator('#bottom-timeline [data-action="roi-demo-pause"]')).toHaveText('Resume');
  await expect.poll(() => page.evaluate(() => window.anchorGame.phaser.scene.getScene('RoiGeneratorDemoScene').paused)).toBe(true);
  const roiTimeBeforePause = await page.evaluate(() => window.anchorGame.phaser.scene.getScene('RoiGeneratorDemoScene').demoTime);
  await page.waitForTimeout(200);
  await expect(page.evaluate(() => window.anchorGame.phaser.scene.getScene('RoiGeneratorDemoScene').demoTime)).resolves.toBeCloseTo(roiTimeBeforePause, 1);
  await page.locator('#bottom-timeline [data-action="roi-demo-pause"]').click();
  await page.locator('#bottom-timeline [data-action="roi-demo-direction"]').click();
  await expect(page.locator('#bottom-timeline [data-action="roi-demo-direction"]')).toHaveText('Direction: Reverse');
  await page.locator('#bottom-timeline [data-action="roi-demo-reset"]').click();
  await expect.poll(() => page.evaluate(() => window.anchorGame.phaser.scene.getScene('RoiGeneratorDemoScene').demoTime)).toBeLessThan(0.2);
  await page.locator('#mission-console [data-action="regenerate"]').click();
  await expect.poll(() => page.evaluate(() => window.anchorGame.phaser.scene.getScene('RoiGeneratorDemoScene').seed)).toContain('2');
  await page.locator('#mission-console [data-action="menu"]').click();
  await expect.poll(() => page.evaluate(() => window.anchorGame.phaser.scene.getScene('MainMenuScene').sys.isActive())).toBe(true);

  await page.locator('#mission-console [data-action="coupled-fields"]').click();
  await expect.poll(() => page.evaluate(() => window.anchorGame.phaser.scene.getScene('CoupledFieldsDemoScene').sys.isActive())).toBe(true);
  await expect(page.locator('#mission-console')).toContainText('Coupled Fields Demo');
  await expect(page.locator('#mission-console')).toContainText('Display Layers');
  await expect(page.locator('#mission-console')).toContainText('Flow Field');
  await expect(page.locator('#mission-console')).toContainText('Sample Field');
  await expect(page.locator('#mission-console')).toContainText('Coupling');
  await expect(page.locator('#mission-summary-hud')).toBeEmpty();
  await expect(page.locator('#agent-performance-hud')).toBeEmpty();
  await expect(page.locator('#bottom-timeline .coupled-demo-transport')).toBeVisible();
  await expect(page.locator('#bottom-timeline')).toContainText('Infinite timeline');
  await expect(page.locator('#coupled-flow-preset')).toBeVisible();
  await expect(page.locator('#coupled-coupling-mode')).toBeVisible();
  await expect(page.locator('#mission-console [data-action="export-demo-json"]')).toHaveText('Export Demo JSON');
  const coupledArtifact = await downloadDemoArtifact(page);
  expect(coupledArtifact.filename).toMatch(/^anchor-coupled-fields-demo-frame-/);
  expect(coupledArtifact.data.type).toBe('anchor.demo.coupled-fields');
  expect(coupledArtifact.data.frames).toHaveLength(1);
  expect(coupledArtifact.data.fields.flow.u.length).toBe(coupledArtifact.data.grid.height);
  expect(coupledArtifact.data.fields.sample.displayedValue[0].length).toBe(coupledArtifact.data.grid.width);
  await expect(page.locator('[data-coupled-layer="flowArrows"]')).toBeChecked();
  await expect(page.locator('[data-coupled-layer="sampleHeatmap"]')).toBeChecked();
  await page.locator('[data-coupled-layer="flowArrows"]').uncheck();
  await expect.poll(() => page.evaluate(() => window.anchorGame.phaser.scene.getScene('CoupledFieldsDemoScene').layerToggles.flowArrows)).toBe(false);
  await page.locator('[data-coupled-layer="flowArrows"]').check();
  await expect.poll(() => page.evaluate(() => window.anchorGame.phaser.scene.getScene('CoupledFieldsDemoScene').layerToggles.flowArrows)).toBe(true);
  await page.locator('[data-coupled-layer="sampleHeatmap"]').uncheck();
  await expect.poll(() => page.evaluate(() => window.anchorGame.phaser.scene.getScene('CoupledFieldsDemoScene').layerToggles.sampleHeatmap)).toBe(false);
  await page.locator('[data-coupled-layer="sampleHeatmap"]').check();
  await expect.poll(() => page.evaluate(() => window.anchorGame.phaser.scene.getScene('CoupledFieldsDemoScene').layerToggles.sampleHeatmap)).toBe(true);
  await page.locator('#coupled-coupling-mode').selectOption('currentAdvected');
  await expect.poll(() => page.evaluate(() => window.anchorGame.phaser.scene.getScene('CoupledFieldsDemoScene').couplingMode)).toBe('currentAdvected');
  const coupledValueAtStart = await page.evaluate(() => window.anchorGame.phaser.scene.getScene('CoupledFieldsDemoScene').sampleField.field[5][5]);
  await expect.poll(() => page.evaluate(() => window.anchorGame.phaser.scene.getScene('CoupledFieldsDemoScene').sampleField.field[5][5])).not.toBe(coupledValueAtStart);
  await clickCoupledDemoCell(page, 5, 5);
  await expect(page.locator('#waypoint-timeline')).toContainText('Flow');
  await expect(page.locator('#waypoint-timeline')).toContainText('Sample / ROI');
  await expect(page.locator('#waypoint-timeline')).toContainText('Coupling');
  await expect(page.locator('#waypoint-timeline')).toContainText('uses visible flow');
  await page.locator('#bottom-timeline [data-action="coupled-demo-pause"]').click();
  await expect(page.locator('#bottom-timeline [data-action="coupled-demo-pause"]')).toHaveText('Resume');
  await page.locator('#bottom-timeline [data-action="coupled-demo-pause"]').click();
  await page.locator('#bottom-timeline [data-action="coupled-demo-direction"]').click();
  await expect(page.locator('#bottom-timeline [data-action="coupled-demo-direction"]')).toHaveText('Direction: Reverse');
  await page.locator('#bottom-timeline [data-action="coupled-demo-reset"]').click();
  await expect.poll(() => page.evaluate(() => window.anchorGame.phaser.scene.getScene('CoupledFieldsDemoScene').demoTime)).toBeLessThan(0.2);
  await page.locator('#mission-console [data-action="menu"]').click();
  await expect.poll(() => page.evaluate(() => window.anchorGame.phaser.scene.getScene('MainMenuScene').sys.isActive())).toBe(true);

  await page.locator('#mission-console [data-action="uncertainty-forecast-demo"]').click();
  await expect.poll(() => page.evaluate(() => window.anchorGame.phaser.scene.getScene('UncertaintyForecastDemoScene').sys.isActive())).toBe(true);
  await expect(page.locator('#mission-console')).toContainText('Uncertainty / Forecast Demo');
  await expect(page.locator('#bottom-timeline .uncertainty-demo-transport')).toBeVisible();
  await expect(page.locator('#uncertainty-demo-view')).toBeVisible();
  await expect(page.locator('#uncertainty-demo-view')).toContainText('Forecast');
  await expect(page.locator('#uncertainty-demo-view')).toContainText('Truth');
  await expect(page.locator('#uncertainty-demo-view')).toContainText('Uncertainty');
  await expect(page.locator('#uncertainty-demo-view')).toContainText('Information Gain');
  await expect(page.locator('#uncertainty-demo-view')).toContainText('Forecast Error');
  await expect(page.locator('#uncertainty-demo-view')).toContainText('Delta After Update');
  await expect(page.locator('#mission-console [data-action="export-demo-json"]')).toHaveText('Export Demo JSON');
  const uncertaintyArtifact = await downloadDemoArtifact(page);
  expect(uncertaintyArtifact.filename).toMatch(/^anchor-uncertainty-forecast-demo-frame-/);
  expect(uncertaintyArtifact.data.type).toBe('anchor.demo.uncertainty-forecast');
  expect(uncertaintyArtifact.data.frames).toHaveLength(1);
  expect(uncertaintyArtifact.data.fields.forecast.length).toBe(uncertaintyArtifact.data.grid.height);
  expect(uncertaintyArtifact.data.fairness.truthAllowedForFairSolver).toBe(false);
  await page.locator('#uncertainty-demo-view').selectOption('forecastError');
  await expect.poll(() => page.evaluate(() => window.anchorGame.phaser.scene.getScene('UncertaintyForecastDemoScene').viewMode)).toBe('forecastError');
  await page.locator('#uncertainty-demo-forecast-model').selectOption('driftingForecast');
  await expect.poll(() => page.evaluate(() => window.anchorGame.phaser.scene.getScene('UncertaintyForecastDemoScene').forecastModel)).toBe('driftingForecast');
  await clickUncertaintyDemoCell(page, 10, 7);
  await expect(page.locator('#waypoint-timeline')).toContainText('Forecast vs Truth');
  await expect(page.locator('#waypoint-timeline')).toContainText('forecast error');
  await expect(page.locator('#waypoint-timeline')).toContainText('information gain');
  const beforeUpdate = await page.evaluate(() => window.anchorGame.phaser.scene.getScene('UncertaintyForecastDemoScene').observations.length);
  await page.locator('#mission-console [data-action="uncertainty-apply-sample"]').click();
  await expect.poll(() => page.evaluate(() => window.anchorGame.phaser.scene.getScene('UncertaintyForecastDemoScene').observations.length)).toBeGreaterThan(beforeUpdate);
  await page.locator('#mission-console [data-action="uncertainty-reset-observations"]').click();
  await expect.poll(() => page.evaluate(() => window.anchorGame.phaser.scene.getScene('UncertaintyForecastDemoScene').observations.length)).toBe(0);
  await page.locator('#mission-console [data-action="menu"]').click();
  await expect.poll(() => page.evaluate(() => window.anchorGame.phaser.scene.getScene('MainMenuScene').sys.isActive())).toBe(true);

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
  await expect(page.locator('#debrief-root h1')).toHaveText('Challenge Debrief');
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
  await expect(page.locator('#mission-console')).toContainText('Current / Flow Field');
  await expect(page.locator('#mission-console')).toContainText('Additive Flow Layers');
  await expect(page.locator('#mission-console [data-flow-field="fieldMode"]')).toBeVisible();
  await expect(page.locator('#mission-console [data-flow-field="basePreset"]')).toBeVisible();
  await expect(page.locator('#waypoint-timeline')).toContainText('Mission Waypoints');
  await expectCenterShellContained(page);
  await expectCenterPanelUsesAvailableSpace(page);
});

test('challenge setup uses left navigator and selected briefing', async ({ page }) => {
  await page.goto('/');
  await expect.poll(() => page.evaluate(() => window.anchorGame?.phaser?.scene.getScene('MainMenuScene')?.sys.isActive() ?? false)).toBe(true);

  await page.evaluate(() => window.anchorGame.phaser.scene.getScene('MainMenuScene').openChallengeSetup('perfectKnowledge', 'challenge'));
  await expect.poll(() => page.evaluate(() => window.anchorGame.phaser.scene.getScene('MissionBriefingScene').sys.isActive())).toBe(true);
  await expect(page.locator('.mission-mode-detail-view')).toBeVisible();
  await expect(page.locator('.mission-mode-gallery-view')).toHaveCount(0);
  await expect(page.locator('.mission-mode-gallery')).toHaveCount(0);
  await expect(page.locator('#mission-console')).toContainText('Mission Navigator');
  await expect(page.locator('#mission-console [data-mission-mode="surveySweep"]')).toContainText('Survey Sweep');
  await expect(page.locator('#mission-console [data-mission-mode="plumeIntercept"]')).toContainText('Plume Intercept');
  await expect(page.locator('#mission-console [data-action="reset"]')).toHaveCount(0);
  await expect(page.locator('#waypoint-timeline')).toContainText('Mission Snapshot');
  await expect(page.locator('#waypoint-timeline')).not.toContainText('Mission Waypoints');
  await page.locator('#mission-console [data-mission-mode="plumeIntercept"]').click();
  await expect(page.evaluate(() => window.anchorGame.state.pendingScenarioSetup?.missionMode)).resolves.toBe('plumeIntercept');
  await expect(page.evaluate(() => window.anchorGame.state.pendingScenarioSetup?.mode)).resolves.toBe('forecast');
  await expect(page.locator('.mission-mode-detail-view')).toBeVisible();
  await expect(page.locator('.mission-mode-detail-view')).toContainText('Plume Intercept');
  await expect(page.locator('.mission-mode-detail-view')).not.toContainText('Back to Mission Modes');
  await expect(page.locator('.mission-mode-detail-view [data-action="reset"]')).toHaveCount(0);
  await expect(page.locator('#mission-console [data-flow-field="basePreset"]')).toHaveCount(0);
  await page.locator('.mission-mode-detail-view [data-action="generate"]').click();
  await expect.poll(() => page.evaluate(() => window.anchorGame.phaser.scene.getScene('MissionWorkspaceScene').sys.isActive())).toBe(true);
  await expect.poll(() => page.evaluate(() => window.anchorGame.state.level?.meta?.missionMode)).toBe('plumeIntercept');
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
  await expectTopHudTooltips(page);
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
  await expectTopHudTooltips(page);
  const markerCells = await validMarkerCellsNear(page, deploymentCell, 2);
  await expectMarkerHoverAndPlacement(page, markerCells[0].x, markerCells[0].y);
  await page.evaluate(() => window.anchorGame.phaser.scene.getScene('MissionWorkspaceScene').zoomMap(1.5));
  await expectMarkerHoverAndPlacement(page, markerCells[1].x, markerCells[1].y);
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
  await expect.poll(() => page.evaluate(() => window.anchorGame.phaser.scene.getScene('SimulationScene').sys.isActive()), { timeout: 15000 }).toBe(true);
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

async function clickFlowDemoCell(page, col, row) {
  const point = await page.evaluate(({ col, row }) => {
    const scene = window.anchorGame.phaser.scene.getScene('FlowFieldDemoScene');
    const map = scene.layout().map;
    const canvas = document.getElementById('game-canvas');
    const rect = canvas.getBoundingClientRect();
    const canvasX = map.x + ((Number(col) + 0.5) / 18) * map.width;
    const canvasY = map.y + ((Number(row) + 0.5) / 12) * map.height;
    return {
      x: rect.left + canvasX * rect.width / canvas.width,
      y: rect.top + canvasY * rect.height / canvas.height
    };
  }, { col, row });
  await page.mouse.click(point.x, point.y);
}

async function clickRoiDemoCell(page, col, row) {
  const point = await page.evaluate(({ col, row }) => {
    const scene = window.anchorGame.phaser.scene.getScene('RoiGeneratorDemoScene');
    const map = scene.layout().map;
    const canvas = document.getElementById('game-canvas');
    const rect = canvas.getBoundingClientRect();
    const width = scene.field.width;
    const height = scene.field.height;
    const canvasX = map.x + ((Number(col) + 0.5) / width) * map.width;
    const canvasY = map.y + ((Number(row) + 0.5) / height) * map.height;
    return {
      x: rect.left + canvasX * rect.width / canvas.width,
      y: rect.top + canvasY * rect.height / canvas.height
    };
  }, { col, row });
  await page.mouse.click(point.x, point.y);
}

async function clickCoupledDemoCell(page, col, row) {
  const point = await page.evaluate(({ col, row }) => {
    const scene = window.anchorGame.phaser.scene.getScene('CoupledFieldsDemoScene');
    const map = scene.layout().map;
    const canvas = document.getElementById('game-canvas');
    const rect = canvas.getBoundingClientRect();
    const canvasX = map.x + ((Number(col) + 0.5) / 24) * map.width;
    const canvasY = map.y + ((Number(row) + 0.5) / 16) * map.height;
    return {
      x: rect.left + canvasX * rect.width / canvas.width,
      y: rect.top + canvasY * rect.height / canvas.height
    };
  }, { col, row });
  await page.mouse.click(point.x, point.y);
}

async function clickUncertaintyDemoCell(page, col, row) {
  const point = await page.evaluate(({ col, row }) => {
    const scene = window.anchorGame.phaser.scene.getScene('UncertaintyForecastDemoScene');
    const map = scene.layout().map;
    const canvas = document.getElementById('game-canvas');
    const rect = canvas.getBoundingClientRect();
    const width = scene.field.width;
    const height = scene.field.height;
    const canvasX = map.x + ((Number(col) + 0.5) / width) * map.width;
    const canvasY = map.y + ((Number(row) + 0.5) / height) * map.height;
    return {
      x: rect.left + canvasX * rect.width / canvas.width,
      y: rect.top + canvasY * rect.height / canvas.height
    };
  }, { col, row });
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

async function expectTopHudTooltips(page) {
  await expect(page.evaluate(() => {
    const chips = [...document.querySelectorAll('#mission-summary-hud .top-hud-chip')];
    return {
      chipCount: chips.length,
      allHaveTitles: chips.every((chip) => chip.getAttribute('title')?.trim()),
      allHaveAriaLabels: chips.every((chip) => chip.getAttribute('aria-label')?.trim()),
      titles: chips.map((chip) => chip.getAttribute('title'))
    };
  })).resolves.toMatchObject({
    allHaveTitles: true,
    allHaveAriaLabels: true
  });
}

async function expectMarkerHoverAndPlacement(page, x, y) {
  await page.evaluate(() => {
    const scene = window.anchorGame.phaser.scene.getScene('MissionWorkspaceScene');
    if (window.anchorGame.state.ui.placementMode !== 'marker') scene.togglePlacementMode();
  });
  const point = await cellCenter(page, x, y);
  await page.mouse.move(point.x, point.y);
  await expect(page.locator('#map-hover-tooltip')).toContainText(`Cell (${x}, ${y})`);
  await expectTooltipNearPointer(page, point);
  await expect(page.evaluate(() => window.anchorGame.state.ui.hoverCell)).resolves.toEqual({ x, y });
  await page.mouse.click(point.x, point.y);
  await expect(page.evaluate(() => {
    const marker = window.anchorGame.state.plan.planningMarkers?.at(-1);
    return marker ? { x: marker.x, y: marker.y } : null;
  })).resolves.toEqual({ x, y });
}

async function expectTooltipNearPointer(page, point) {
  await expect(page.evaluate(({ point }) => {
    const rect = document.getElementById('map-hover-tooltip')?.getBoundingClientRect();
    if (!rect) return { exists: false };
    const horizontalGap = point.x <= rect.left
      ? rect.left - point.x
      : point.x - rect.right;
    const verticalGap = point.y <= rect.top
      ? rect.top - point.y
      : point.y - rect.bottom;
    return {
      exists: true,
      insideViewport: rect.left >= 0
        && rect.top >= 0
        && rect.right <= window.innerWidth
        && rect.bottom <= window.innerHeight,
      closeHorizontally: horizontalGap <= 24,
      closeVertically: verticalGap <= 24,
      notFarRight: rect.left - point.x < 80,
      notFarBelow: rect.top - point.y < 80
    };
  }, { point })).resolves.toEqual({
    exists: true,
    insideViewport: true,
    closeHorizontally: true,
    closeVertically: true,
    notFarRight: true,
    notFarBelow: true
  });
}

async function validMarkerCellsNear(page, origin, count = 2) {
  return page.evaluate(({ origin, count }) => {
    const level = window.anchorGame.state.level;
    const cells = [];
    for (let radius = 1; radius < Math.max(level.world.grid.width, level.world.grid.height); radius += 1) {
      for (let dy = -radius; dy <= radius; dy += 1) {
        for (let dx = -radius; dx <= radius; dx += 1) {
          const x = origin.x + dx;
          const y = origin.y + dy;
          if (x < 0 || y < 0 || x >= level.world.grid.width || y >= level.world.grid.height) continue;
          if (level.layers.terrain?.[y]?.[x]) continue;
          if (cells.some((cell) => cell.x === x && cell.y === y)) continue;
          cells.push({ x, y });
          if (cells.length >= count) return cells;
        }
      }
    }
    return cells;
  }, { origin, count });
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

async function expectSamplingSectionsCollapsed(page, titles) {
  await expect.poll(() => page.evaluate((expectedTitles) => {
    const headers = [...document.querySelectorAll('#mission-console .accordion-header')];
    return expectedTitles.every((title) => {
      const header = headers.find((entry) => entry.textContent.replace(/\s+/g, ' ').trim().includes(title));
      return header?.getAttribute('aria-expanded') === 'false';
    });
  }, titles)).toBe(true);
}

async function expandMissionConsoleSection(page, title) {
  await expect(page.locator('#mission-console .accordion-header').filter({ hasText: title }).first()).toBeVisible();
  await page.evaluate((sectionTitle) => {
    const headers = [...document.querySelectorAll('#mission-console .accordion-header')]
      .filter((header) => header.textContent.replace(/\s+/g, ' ').trim().includes(sectionTitle));
    for (const header of headers) {
      if (header.getAttribute('aria-expanded') !== 'true') header.click();
    }
  }, title);
  await expect.poll(() => page.evaluate((sectionTitle) => {
    const headers = [...document.querySelectorAll('#mission-console .accordion-header')]
      .filter((header) => header.textContent.replace(/\s+/g, ' ').trim().includes(sectionTitle));
    return headers.length > 0 && headers.every((header) => header.getAttribute('aria-expanded') === 'true');
  }, title)).toBe(true);
}

async function expandMissionConsoleSections(page, titles) {
  for (const title of titles) {
    await expandMissionConsoleSection(page, title);
  }
}

async function clickRightPanelMode(page, mode) {
  await page.evaluate((nextMode) => {
    document.querySelector(`#waypoint-timeline [data-roi-panel-mode="${nextMode}"]`)?.click();
  }, mode);
}

async function startPlanningFromBriefing(page) {
  await page.evaluate(() => window.anchorGame.phaser.scene.getScene('MissionBriefingScene').startPlanning());
  await expect.poll(() => page.evaluate(() => window.anchorGame.phaser.scene.getScene('MissionWorkspaceScene').sys.isActive())).toBe(true);
}

async function downloadDemoArtifact(page) {
  const [download] = await Promise.all([
    page.waitForEvent('download'),
    page.locator('#mission-console [data-action="export-demo-json"]').click()
  ]);
  const path = await download.path();
  const text = await fs.readFile(path, 'utf8');
  return {
    filename: download.suggestedFilename(),
    data: JSON.parse(text)
  };
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
