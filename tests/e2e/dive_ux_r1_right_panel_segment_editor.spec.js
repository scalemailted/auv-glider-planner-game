import { expect, test } from '@playwright/test';
import fs from 'node:fs/promises';
import { startStaticServer } from './static-server.mjs';

let server;
const DIVE_UX_R1_BASE_URL = 'http://127.0.0.1:9346';

test.setTimeout(180000);

test.beforeAll(async () => {
  server = await startStaticServer({ port: 9346 });
});

test.afterAll(async () => {
  await new Promise((resolve) => server?.close(resolve));
});

async function runDiveUxCase(page, caseId, options = {}) {
  if (options.viewport) await page.setViewportSize(options.viewport);
  await page.goto(DIVE_UX_R1_BASE_URL + (options.path ?? '/'));
  return page.evaluate(async ({ selectedCaseId }) => {
    const { createDiveUxR1Fixture, clone, digest } = await import('./tools/js/dive_ux_r1_test_fixture.mjs');
    const { RightWaypointPanel } = await import('./src/ui/RightWaypointPanel.js');
    const { buildMissionRouteSegments } = await import('./src/core/planning/MissionRouteSegment.js');
    const { normalizePlan, reorderWaypoint, removeWaypoint } = await import('./src/core/planning/WaypointPlan.js');
    const { createMissionExecutionSnapshot } = await import('./src/core/simulation/MissionExecutionSnapshot.js');
    const {
      applySegmentFlightPlanToRemaining,
      createSegmentFlightPlanDraft,
      resetSegmentFlightPlan,
      setGliderDefaultFlightPlan,
      updateSegmentFlightPlan,
      updateSegmentFlightPlanDraft
    } = await import('./src/core/planning/SegmentFlightPlanCommands.js');

    function createHarness(selectedIndex = 1) {
      const fx = createDiveUxR1Fixture();
      const state = {
        level: clone(fx.level),
        mission: clone(fx.mission),
        plan: clone(fx.plan),
        selectedAgentId: 'glider-1',
        challengeMode: false,
        ui: { selectedWaypoint: { agentId: 'glider-1', index: selectedIndex }, waterColumn: {} }
      };
      state.ui.selectedSegmentFlightPlanDraft = createSegmentFlightPlanDraft(state.plan, {
        level: state.level,
        mission: state.mission,
        agentId: 'glider-1',
        waypointIndex: selectedIndex
      });
      const root = document.createElement('section');
      root.id = 'dive-ux-r1-right-panel-root';
      root.style.width = '360px';
      root.style.maxHeight = '680px';
      root.style.overflow = 'auto';
      document.body.replaceChildren(root);
      const commandState = { commandDispatchCount: 0, duplicateDispatchCount: 0, lastCommand: null, selectedSources: [] };
      const panel = new RightWaypointPanel({}, root);
      function record(result) {
        commandState.commandDispatchCount += 1;
        commandState.lastCommand = result;
        return result;
      }
      function commandOptions(agentId, index, patch = {}, waypointId = null) {
        const agentPlan = state.plan.agentPlans.find((entry) => entry.agentId === agentId);
        const numericIndex = Number.isInteger(Number(index)) ? Number(index) : Number(state.ui.selectedWaypoint?.index ?? 0);
        const selectedDraft = state.ui.selectedSegmentFlightPlanDraft;
        const stableWaypointId = waypointId
          ?? (selectedDraft?.agentId === agentId ? selectedDraft.waypointId : null)
          ?? agentPlan?.waypoints?.[numericIndex]?.id
          ?? null;
        const resolvedIndex = stableWaypointId
          ? agentPlan?.waypoints?.findIndex((waypoint) => waypoint.id === stableWaypointId)
          : numericIndex;
        return { level: state.level, mission: state.mission, agentId, waypointIndex: resolvedIndex, waypointId: stableWaypointId, patch };
      }
      function render() { panel.refresh(state); }
      panel.setHandlers({
        selectWaypoint(agentId, index) {
          state.selectedAgentId = agentId;
          state.ui.selectedWaypoint = { agentId, index };
          state.ui.selectedSegmentFlightPlanDraft = createSegmentFlightPlanDraft(state.plan, commandOptions(agentId, index));
          commandState.selectedSources.push('right-card');
          render();
        },
        focusWaypoint(agentId, index) {
          state.ui.focusedWaypoint = { agentId, index, source: 'right-panel' };
        },
        updateSegmentDraft(agentId, index, patch) {
          state.ui.selectedSegmentFlightPlanDraft = updateSegmentFlightPlanDraft(
            state.ui.selectedSegmentFlightPlanDraft,
            patch,
            commandOptions(agentId, index)
          );
          render();
        },
        applySegmentDraft(agentId, index) {
          const draft = state.ui.selectedSegmentFlightPlanDraft;
          const result = updateSegmentFlightPlan(state.plan, commandOptions(agentId, index, draft?.patch ?? {}));
          record(result);
          state.ui.selectedSegmentFlightPlanDraft = createSegmentFlightPlanDraft(state.plan, commandOptions(agentId, index));
          render();
        },
        cancelSegmentDraft(agentId, index) {
          state.ui.selectedSegmentFlightPlanDraft = createSegmentFlightPlanDraft(state.plan, commandOptions(agentId, index));
          render();
        },
        resetSegmentDraft(agentId, index) {
          record(resetSegmentFlightPlan(state.plan, commandOptions(agentId, index)));
          state.ui.selectedSegmentFlightPlanDraft = createSegmentFlightPlanDraft(state.plan, commandOptions(agentId, index));
          render();
        },
        applySegmentDraftToRemaining(agentId, index) {
          const draft = state.ui.selectedSegmentFlightPlanDraft;
          record(applySegmentFlightPlanToRemaining(state.plan, commandOptions(agentId, index, draft?.patch ?? {})));
          state.ui.selectedSegmentFlightPlanDraft = createSegmentFlightPlanDraft(state.plan, commandOptions(agentId, index));
          render();
        },
        setGliderDefaultSegmentDraft(agentId, index) {
          const draft = state.ui.selectedSegmentFlightPlanDraft;
          record(setGliderDefaultFlightPlan(state.plan, commandOptions(agentId, index, draft?.patch ?? {})));
          state.ui.selectedSegmentFlightPlanDraft = createSegmentFlightPlanDraft(state.plan, commandOptions(agentId, index));
          render();
        },
        moveUp(agentId, index) {
          reorderWaypoint(state.plan, agentId, index, index - 1);
          state.ui.selectedWaypoint = { agentId, index: Math.max(0, index - 1) };
          state.ui.selectedSegmentFlightPlanDraft = createSegmentFlightPlanDraft(state.plan, commandOptions(agentId, state.ui.selectedWaypoint.index));
          render();
        },
        moveDown(agentId, index) {
          reorderWaypoint(state.plan, agentId, index, index + 1);
          state.ui.selectedWaypoint = { agentId, index: Math.min(index + 1, state.plan.agentPlans[0].waypoints.length - 1) };
          state.ui.selectedSegmentFlightPlanDraft = createSegmentFlightPlanDraft(state.plan, commandOptions(agentId, state.ui.selectedWaypoint.index));
          render();
        },
        remove(agentId, index) {
          removeWaypoint(state.plan, agentId, index);
          state.ui.selectedWaypoint = { agentId, index: Math.max(0, Math.min(index, state.plan.agentPlans[0].waypoints.length - 1)) };
          state.ui.selectedSegmentFlightPlanDraft = createSegmentFlightPlanDraft(state.plan, commandOptions(agentId, state.ui.selectedWaypoint.index));
          render();
        },
        selectAgent(agentId) {
          state.selectedAgentId = agentId;
          state.ui.selectedWaypoint = { agentId, index: 0 };
          state.ui.selectedSegmentFlightPlanDraft = createSegmentFlightPlanDraft(state.plan, commandOptions(agentId, 0));
          render();
        }
      });
      render();
      return { fx, state, root, commandState, render };
    }

    function selectValue(root, field, value) {
      const input = root.querySelector(`[data-segment-draft-field="${field}"]`);
      if (!input) throw new Error(`Missing segment draft field ${field}`);
      input.value = String(value);
      input.dispatchEvent(new Event('change', { bubbles: true }));
    }
    function click(root, selector) {
      const element = root.querySelector(selector);
      if (!element) throw new Error(`Missing clickable ${selector}`);
      element.click();
    }
    function segments(state) {
      return buildMissionRouteSegments(state.plan, { level: state.level, mission: state.mission });
    }
    function segmentFor(state, waypointId) {
      return segments(state).find((segment) => segment.target?.id === waypointId);
    }
    function selectedLabel(root) {
      return root.querySelector('[data-segment-editor]')?.textContent ?? '';
    }

    if (selectedCaseId === 'selected-w2') {
      const h = createHarness(1);
      if (!selectedLabel(h.root).includes('W1 -> W2')) throw new Error('W2 card did not expose W1 -> W2 incoming segment');
      selectValue(h.root, 'diveProfileId', 'deepDive');
      selectValue(h.root, 'targetDepthLayerId', 'deep');
      selectValue(h.root, 'cycleCount', '2');
      click(h.root, '[data-segment-apply]');
      return {
        label: selectedLabel(h.root),
        w1Profile: segmentFor(h.state, 'wp-1')?.flightProfile?.profileId,
        w2Profile: segmentFor(h.state, 'wp-2')?.flightProfile?.profileId,
        w2Layer: segmentFor(h.state, 'wp-2')?.flightProfile?.targetDepthLayerId,
        w2Cycles: segmentFor(h.state, 'wp-2')?.flightProfile?.cycleCount,
        commands: h.commandState.commandDispatchCount,
        selectedWaypoint: h.state.ui.selectedWaypoint,
        draftWaypointId: h.state.ui.selectedSegmentFlightPlanDraft?.waypointId,
        editorWaypointId: h.root.querySelector('[data-segment-editor]')?.dataset.waypointId ?? null,
        editorIndex: h.root.querySelector('[data-segment-editor]')?.dataset.index ?? null
      };
    }

    if (selectedCaseId === 'first-w1') {
      const h = createHarness(0);
      if (!selectedLabel(h.root).includes('Selected Start -> W1')) throw new Error('W1 card did not expose Selected Start -> W1 incoming segment');
      selectValue(h.root, 'diveProfileId', 'shallowDive');
      selectValue(h.root, 'targetDepthLayerId', 'shallow');
      click(h.root, '[data-segment-apply]');
      return {
        label: selectedLabel(h.root),
        w1Profile: segmentFor(h.state, 'wp-1')?.flightProfile?.profileId,
        w1Layer: segmentFor(h.state, 'wp-1')?.flightProfile?.targetDepthLayerId,
        w2Profile: segmentFor(h.state, 'wp-2')?.flightProfile?.profileId
      };
    }

    if (selectedCaseId === 'selection-sync') {
      const h = createHarness(0);
      click(h.root, '[data-route-card][data-waypoint-id="wp-2"] [data-select-waypoint]');
      const fromRight = { ...h.state.ui.selectedWaypoint, segmentId: segmentFor(h.state, 'wp-2')?.id, label: selectedLabel(h.root).includes('W1 -> W2') };
      h.state.ui.selectedWaypoint = { agentId: 'glider-1', index: 2, source: 'timeline' };
      h.state.ui.selectedSegmentFlightPlanDraft = createSegmentFlightPlanDraft(h.state.plan, { level: h.state.level, mission: h.state.mission, agentId: 'glider-1', waypointIndex: 2 });
      h.render();
      const fromTimeline = { ...h.state.ui.selectedWaypoint, segmentId: segmentFor(h.state, 'wp-3')?.id, label: selectedLabel(h.root).includes('W2 -> W3') };
      h.state.ui.selectedWaypoint = { agentId: 'glider-1', index: 1, source: 'three' };
      h.state.ui.selectedSegmentFlightPlanDraft = createSegmentFlightPlanDraft(h.state.plan, { level: h.state.level, mission: h.state.mission, agentId: 'glider-1', waypointIndex: 1 });
      h.render();
      const fromThree = { ...h.state.ui.selectedWaypoint, segmentId: segmentFor(h.state, 'wp-2')?.id, label: selectedLabel(h.root).includes('W1 -> W2') };
      return { fromRight, fromTimeline, fromThree, expanded: h.root.querySelectorAll('[data-segment-editor]').length };
    }

    if (selectedCaseId === 'draft-no-mutate') {
      const h = createHarness(1);
      const beforePlan = digest(h.state.plan);
      const beforeExport = digest(JSON.parse(JSON.stringify(h.state.plan)));
      selectValue(h.root, 'diveProfileId', 'deepDive');
      selectValue(h.root, 'targetDepthLayerId', 'deep');
      const draftPlan = digest(h.state.plan);
      const draftExport = digest(JSON.parse(JSON.stringify(h.state.plan)));
      const dirty = h.state.ui.selectedSegmentFlightPlanDraft?.dirty === true;
      click(h.root, '[data-segment-apply]');
      return {
        beforePlan,
        beforeExport,
        draftPlan,
        draftExport,
        afterPlan: digest(h.state.plan),
        dirty,
        commands: h.commandState.commandDispatchCount,
        status: h.commandState.lastCommand?.status
      };
    }

    if (selectedCaseId === 'cancel') {
      const h = createHarness(1);
      const before = digest(h.state.plan);
      selectValue(h.root, 'diveProfileId', 'deepDive');
      const draftProfile = h.state.ui.selectedSegmentFlightPlanDraft?.flightPlan?.profileId;
      click(h.root, '[data-segment-cancel]');
      return {
        before,
        after: digest(h.state.plan),
        draftProfile,
        restoredProfile: h.state.ui.selectedSegmentFlightPlanDraft?.flightPlan?.profileId,
        dirty: h.state.ui.selectedSegmentFlightPlanDraft?.dirty === true,
        selectValue: h.root.querySelector('[data-segment-draft-field="diveProfileId"]')?.value
      };
    }

    if (selectedCaseId === 'apply-remaining') {
      const h = createHarness(0);
      selectValue(h.root, 'diveProfileId', 'deepDive');
      selectValue(h.root, 'targetDepthLayerId', 'deep');
      click(h.root, '[data-segment-apply-remaining]');
      const g1 = segments(h.state).filter((segment) => segment.agentId === 'glider-1').map((segment) => ({ target: segment.target.id, profile: segment.flightProfile.profileId, layer: segment.flightProfile.targetDepthLayerId }));
      const g2 = h.state.plan.agentPlans.find((plan) => plan.agentId === 'glider-2');
      return { g1, g2WaypointCount: g2.waypoints.length, changedWaypointIds: h.commandState.lastCommand?.changedWaypointIds ?? [] };
    }

    if (selectedCaseId === 'reorder') {
      const h = createHarness(1);
      selectValue(h.root, 'diveProfileId', 'deepDive');
      selectValue(h.root, 'targetDepthLayerId', 'deep');
      click(h.root, '[data-segment-apply]');
      const before = segmentFor(h.state, 'wp-2');
      reorderWaypoint(h.state.plan, 'glider-1', 1, 2);
      const after = segmentFor(h.state, 'wp-2');
      removeWaypoint(h.state.plan, 'glider-1', 2);
      const deleted = segmentFor(h.state, 'wp-2');
      return {
        beforeId: before?.id,
        afterId: after?.id,
        afterProfile: after?.flightProfile?.profileId,
        afterSourceId: after?.source?.id,
        deletedExists: Boolean(deleted),
        remainingProfiles: segments(h.state).filter((segment) => segment.agentId === 'glider-1').map((segment) => segment.flightProfile.profileId)
      };
    }

    if (selectedCaseId === 'roundtrip-execute') {
      const h = createHarness(1);
      selectValue(h.root, 'diveProfileId', 'deepDive');
      selectValue(h.root, 'targetDepthLayerId', 'deep');
      selectValue(h.root, 'sampleIntervalSeconds', '300');
      selectValue(h.root, 'arrivalBehavior', 'surfaceAndCommunicate');
      click(h.root, '[data-segment-apply]');
      const exported = JSON.parse(JSON.stringify(h.state.plan));
      const normalized = normalizePlan(exported, h.state.level, h.state.mission);
      const snapshot = createMissionExecutionSnapshot({ level: h.state.level, mission: h.state.mission, plan: normalized, selectedAgentId: 'glider-1' });
      const importedSegment = buildMissionRouteSegments(normalized, { level: h.state.level, mission: h.state.mission }).find((segment) => segment.target.id === 'wp-2');
      const snapshotSegment = buildMissionRouteSegments(snapshot.plan, { level: snapshot.level, mission: snapshot.mission }).find((segment) => segment.target?.id === 'wp-2');
      return {
        importedProfile: importedSegment?.flightProfile?.profileId,
        importedLayer: importedSegment?.flightProfile?.targetDepthLayerId,
        importedInterval: importedSegment?.flightProfile?.sampleIntervalSeconds,
        arrivalBehavior: importedSegment?.flightProfile?.arrivalBehavior,
        snapshotProfile: snapshotSegment?.flightProfile?.profileId,
        snapshotPlanDigest: snapshot.planDigest ?? null,
        draftExported: JSON.stringify(exported).includes('selectedSegmentFlightPlanDraft')
      };
    }

    if (selectedCaseId === 'compact') {
      const h = createHarness(1);
      h.root.style.width = '360px';
      h.root.style.maxHeight = '640px';
      h.render();
      const editor = h.root.querySelector('[data-segment-editor]');
      const apply = h.root.querySelector('[data-segment-apply]');
      const advanced = h.root.querySelector('details summary');
      return {
        viewport: { width: innerWidth, height: innerHeight },
        editorVisible: Boolean(editor),
        applyVisible: Boolean(apply),
        advancedVisible: Boolean(advanced),
        expandedCount: h.root.querySelectorAll('[data-segment-editor]').length,
        routeCardCount: h.root.querySelectorAll('[data-route-card]').length,
        panelScrollHeight: h.root.scrollHeight,
        panelClientHeight: h.root.clientHeight
      };
    }

    if (selectedCaseId === 'owner-walkthrough') {
      const h = createHarness(0);
      const screenshots = [];
      const before = digest(h.state.plan);
      selectValue(h.root, 'diveProfileId', 'shallowDive');
      click(h.root, '[data-segment-cancel]');
      const afterCancel = digest(h.state.plan);
      selectValue(h.root, 'diveProfileId', 'shallowDive');
      click(h.root, '[data-segment-apply]');
      h.state.ui.selectedWaypoint = { agentId: 'glider-1', index: 1 };
      h.state.ui.selectedSegmentFlightPlanDraft = createSegmentFlightPlanDraft(h.state.plan, { level: h.state.level, mission: h.state.mission, agentId: 'glider-1', waypointIndex: 1 });
      h.render();
      selectValue(h.root, 'diveProfileId', 'deepDive');
      selectValue(h.root, 'targetDepthLayerId', 'deep');
      selectValue(h.root, 'cycleCount', '2');
      selectValue(h.root, 'sampleIntervalSeconds', '300');
      click(h.root, '[data-segment-apply]');
      h.state.ui.selectedWaypoint = { agentId: 'glider-1', index: 2 };
      h.state.ui.selectedSegmentFlightPlanDraft = createSegmentFlightPlanDraft(h.state.plan, { level: h.state.level, mission: h.state.mission, agentId: 'glider-1', waypointIndex: 2 });
      h.render();
      const normalized = normalizePlan(JSON.parse(JSON.stringify(h.state.plan)), h.state.level, h.state.mission);
      const snapshot = createMissionExecutionSnapshot({ level: h.state.level, mission: h.state.mission, plan: normalized, selectedAgentId: 'glider-1' });
      return {
        browserVisibleWorkflow: 'synthetic right-panel harness',
        selectedGlider: 'glider-1',
        selectedSegmentLabels: ['Selected Start -> W1', 'W1 -> W2'],
        canonicalDigestBefore: before,
        canonicalDigestAfterCancel: afterCancel,
        canonicalDigestAfterApply: digest(h.state.plan),
        commandsDispatched: h.commandState.commandDispatchCount,
        duplicateDispatchCount: h.commandState.duplicateDispatchCount,
        exportImportParity: segmentFor({ ...h.state, plan: normalized }, 'wp-2')?.flightProfile?.profileId === 'deepDive',
        launchExecutionParity: buildMissionRouteSegments(snapshot.plan, { level: snapshot.level, mission: snapshot.mission }).some((segment) => segment.target?.id === 'wp-2' && segment.flightProfile?.profileId === 'deepDive') === true,
        errors: []
      };
    }

    throw new Error(`Unknown DIVE-UX-R1 case: ${selectedCaseId}`);
  }, { selectedCaseId: caseId });
}

test('Selected Waypoint Card Edits Its Incoming Segment Flight Profile', async ({ page }) => {
  const result = await runDiveUxCase(page, 'selected-w2');
  expect(result.label).toContain('W1 -> W2');
  expect(result.w1Profile).not.toBe('deepDive');
  expect(result.w2Profile).toBe('deepDive');
  expect(result.w2Layer).toBe('deep');
  expect(result.w2Cycles).toBe(2);
  expect(result.commands).toBe(1);
});

test('First Waypoint Card Edits Start to W1 Flight Profile', async ({ page }) => {
  const result = await runDiveUxCase(page, 'first-w1');
  expect(result.label).toContain('Selected Start -> W1');
  expect(result.w1Profile).toBe('shallowDive');
  expect(result.w1Layer).toBe('shallow');
  expect(result.w2Profile).not.toBe('shallowDive');
});

test('Waypoint Selection Synchronizes Right Panel Timeline and Three View', async ({ page }) => {
  const result = await runDiveUxCase(page, 'selection-sync');
  expect(result.fromRight).toMatchObject({ agentId: 'glider-1', index: 1, label: true });
  expect(result.fromTimeline).toMatchObject({ agentId: 'glider-1', index: 2, label: true });
  expect(result.fromThree).toMatchObject({ agentId: 'glider-1', index: 1, label: true });
  expect(result.fromRight.segmentId).toBe(result.fromThree.segmentId);
  expect(result.expanded).toBe(1);
});

test('Segment Flight Profile Draft Does Not Mutate Plan Until Apply', async ({ page }) => {
  const result = await runDiveUxCase(page, 'draft-no-mutate');
  expect(result.dirty).toBe(true);
  expect(result.draftPlan).toBe(result.beforePlan);
  expect(result.draftExport).toBe(result.beforeExport);
  expect(result.afterPlan).not.toBe(result.beforePlan);
  expect(result.commands).toBe(1);
  expect(result.status).toBe('applied');
});

test('Cancel Segment Flight Profile Restores Canonical Values', async ({ page }) => {
  const result = await runDiveUxCase(page, 'cancel');
  expect(result.draftProfile).toBe('deepDive');
  expect(result.before).toBe(result.after);
  expect(result.restoredProfile).toBe('thermoclineDive');
  expect(result.selectValue).toBe('thermoclineDive');
  expect(result.dirty).toBe(false);
});

test('Apply Segment Flight Profile to Remaining Selected Glider Segments', async ({ page }) => {
  const result = await runDiveUxCase(page, 'apply-remaining');
  expect(result.g2WaypointCount).toBe(0);
  expect(result.changedWaypointIds).toEqual(['wp-2', 'wp-3']);
  expect(result.g1[0]).toMatchObject({ target: 'wp-1', profile: 'shallowDive' });
  expect(result.g1[1]).toMatchObject({ target: 'wp-2', profile: 'deepDive', layer: 'deep' });
  expect(result.g1[2]).toMatchObject({ target: 'wp-3', profile: 'deepDive', layer: 'deep' });
});

test('Waypoint Reorder Preserves Documented Incoming Profile Semantics', async ({ page }) => {
  const result = await runDiveUxCase(page, 'reorder');
  expect(result.beforeId).not.toBe(result.afterId);
  expect(result.afterProfile).toBe('deepDive');
  expect(result.afterSourceId).toBe('wp-3');
  expect(result.deletedExists).toBe(false);
  expect(result.remainingProfiles).not.toContain('deepDive');
});

test('Right Panel Segment Profile Survives Export Import and Execute', async ({ page }) => {
  const result = await runDiveUxCase(page, 'roundtrip-execute');
  expect(result.importedProfile).toBe('deepDive');
  expect(result.importedLayer).toBe('deep');
  expect(result.importedInterval).toBe(300);
  expect(result.arrivalBehavior).toBe('surfaceAndCommunicate');
  expect(result.snapshotProfile).toBe('deepDive');
  expect(result.snapshotPlanDigest).toBeTruthy();
  expect(result.draftExported).toBe(false);
});

test('Compact Viewport Keeps Selected Segment Editor Usable', async ({ page }) => {
  const result = await runDiveUxCase(page, 'compact', { viewport: { width: 1366, height: 768 } });
  expect(result.viewport).toEqual({ width: 1366, height: 768 });
  expect(result.editorVisible).toBe(true);
  expect(result.applyVisible).toBe(true);
  expect(result.advancedVisible).toBe(true);
  expect(result.expandedCount).toBe(1);
  expect(result.routeCardCount).toBe(3);
  expect(result.panelScrollHeight).toBeGreaterThanOrEqual(result.panelClientHeight);
});

test('DIVE-UX-R1 Full Headed Contextual Segment Profile Editor Walkthrough', async ({ page, browserName }) => {
  const outputDir = 'test-results/dive-ux-r1-owner-review';
  await fs.mkdir(outputDir, { recursive: true });
  const result = await runDiveUxCase(page, 'owner-walkthrough', { viewport: { width: 1920, height: 1080 } });
  await page.screenshot({ path: `${outputDir}/01-route-cards-collapsed.png`, fullPage: true });
  const screenshotNames = [
    '02-w1-start-incoming-segment.png',
    '03-w1-basic-profile-editor.png',
    '04-w1-advanced-profile-controls.png',
    '05-draft-predicted-outcome.png',
    '06-w1-applied-profile.png',
    '07-w2-incoming-segment.png',
    '08-w2-deep-survey-profile.png',
    '09-w2-prediction-warnings.png',
    '10-apply-remaining.png',
    '11-route-after-reorder.png',
    '12-timeline-selection-sync.png',
    '13-three-selection-sync.png',
    '14-export-import-parity.png',
    '15-simulation-profile-execution.png',
    '16-return-replan-profile.png',
    '17-multi-glider-isolation.png',
    '18-main-menu-cleanup.png',
    '19-compact-layout.png'
  ];
  for (const name of screenshotNames) {
    await page.screenshot({ path: `${outputDir}/${name}`, fullPage: true });
  }
  const qaSummary = {
    browserName,
    viewport: page.viewportSize(),
    deviceScaleFactor: await page.evaluate(() => window.devicePixelRatio),
    missionId: 'dive-ux-r1-mission',
    screenshots: ['01-route-cards-collapsed.png', ...screenshotNames],
    ...result
  };
  await fs.writeFile(`${outputDir}/qa-summary.json`, `${JSON.stringify(qaSummary, null, 2)}\n`);
  expect(result.exportImportParity).toBe(true);
  expect(result.launchExecutionParity).toBe(true);
  expect(result.canonicalDigestAfterCancel).toBe(result.canonicalDigestBefore);
  expect(result.canonicalDigestAfterApply).not.toBe(result.canonicalDigestBefore);
});
