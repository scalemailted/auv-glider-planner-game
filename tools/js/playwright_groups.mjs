export const PLAYWRIGHT_GROUPS_VERSION = 'playwright-groups-r1-2a-4-3';

export const PLAYWRIGHT_GROUPS = Object.freeze([
  {
    id: 'coreMission',
    label: 'Core mission, labs, benchmark, and headless entry flows',
    patterns: [
      /^learning labs static page is linked from the main menu$/i,
      /^Benchmark modes overview opens from Simulation Lab$/i,
      /^Motion Planning Demo opens from Simulation Lab and preserves benchmark\/headless routes$/i,
      /^Bathymetric World View opens from Simulation Lab and preserves adjacent routes$/i,
      /^Renderer Architecture Preview opens from Simulation Lab$/i,
      /^Headless Bundle Viewer opens from Simulation Lab and exports browser summary$/i,
      /^Planner Benchmark debrief exports benchmark records from synthetic result$/i,
      /^Adaptive Benchmark synthetic debrief shows surfacing review and exports P8 session records$/i,
      /^campaign planning smoke flow reaches debrief$/i
    ]
  },
  {
    id: 'threePlanning',
    label: 'Continuous planning, camera, sampling target, and prediction flows',
    patterns: [
      /^Continuous Mission Planning Starts Without Overlay Errors$/i,
      /^Continuous Mission Controls Are Visible and Functional$/i,
      /^Continuous Mission Plan Executes Through Canonical 3D Dive$/i,
      /^Surface Waypoints Produce a Predicted Three-Dimensional Dive$/i,
      /^Three Camera Reveals Full Water-Column Dive$/i,
      /^Surface Waypoints and Sampling Targets Have Distinct Semantics$/i,
      /^Sampling Target Drives Predicted Dive Without Becoming a Navigation Point$/i,
      /^Predicted Multi-Yo Profile Executes Through Canonical Simulation$/i,
      /^Three Camera Interaction Does Not Rebuild Mission Models$/i,
      /^Three Mission Renderer Resources Remain Stable$/i,
      /^Three Mission Interaction Performance Invariants$/i,
      /^Three Sampling Target and Dive Planning Headed Workflow$/i,
      /^Segment Distance Changes Predicted Dive Geometry$/i,
      /^Predicted and Realized Dive Paths Remain Distinct$/i,
      /^Bathymetry Demo and Mission Dive Paths Share Coordinates$/i
    ]
  },
  {
    id: 'workspaceScenario',
    label: 'Workspace stabilization, pointer pipeline, scenario, and level setup',
    patterns: [
      /^Three Mission Workspace Stabilization$/i,
      /^Three Mission renderer preserves live Mission Planning state$/i,
      /^Three Planning Pointer Interaction dispatches canonical workspace commands$/i,
      /^Three Waypoint Pipeline and Standard Camera Gestures$/i,
      /^Three Mission Planning Tools and Camera Controls$/i,
      /^Three Simulation Selection inspects canonical public simulation objects$/i,
      /^scenario setup stays inside the center viewport$/i,
      /^challenge setup uses left navigator and selected briefing$/i,
      /^level generator opens from main menu$/i,
      /^deterministic challenge generates a fresh perfect-knowledge level$/i,
      /^load level json imports a level and offers play\/edit actions$/i,
      /^stochastic mode exposes ensemble and risk controls$/i
    ]
  },
  {
    id: 'executionWaterColumn',
    label: 'Execution, water-column, generated/legacy, and parity flows',
    patterns: [
      /^Three Simulation Uses Incremental Presentation Updates$/i,
      /^Finish Instantly Avoids Per-Step Three Rebuilds$/i,
      /^Three Quality Profiles Preserve Canonical Simulation Result$/i,
      /^Execute Mission Through Three Simulation$/i,
      /^Three Volumetric Water Column Planning$/i,
      /^Three Depth-Aware Dive and Sampling$/i,
      /^Three Mission Scene Isolation$/i,
      /^Three Scene Cleanup Is Null-Safe and Idempotent$/i,
      /^Generated Mission Opens a Visible Volumetric Water Column$/i,
      /^Legacy Mission Uses Explicit Surface Compatibility Mode$/i,
      /^Three Vehicle Pose Guidance and Grid Alignment$/i,
      /^Three Waypoint Validation and Mission Window Semantics$/i,
      /^Legacy and Three Simulation Produce Identical Canonical Result$/i,
      /^legacy saved level registry scene still opens$/i
    ]
  }
]);

export function groupTitle(title) {
  const matches = PLAYWRIGHT_GROUPS.filter((group) => group.patterns.some((pattern) => pattern.test(String(title ?? ''))));
  return matches.map((group) => group.id);
}

export function auditPlaywrightGroupCoverage(titles = []) {
  const rows = titles.map((title) => ({ title, groups: groupTitle(title) }));
  const unassigned = rows.filter((row) => row.groups.length === 0);
  const duplicate = rows.filter((row) => row.groups.length > 1);
  const byGroup = Object.fromEntries(PLAYWRIGHT_GROUPS.map((group) => [group.id, rows.filter((row) => row.groups.includes(group.id)).map((row) => row.title)]));
  return {
    version: PLAYWRIGHT_GROUPS_VERSION,
    total: rows.length,
    rows,
    byGroup,
    unassigned,
    duplicate,
    valid: rows.length > 0 && unassigned.length === 0 && duplicate.length === 0
  };
}

export function grepForGroup(groupId) {
  const group = PLAYWRIGHT_GROUPS.find((candidate) => candidate.id === groupId);
  if (!group) throw new Error(`Unknown Playwright group: ${groupId}`);
  return group.patterns.map((pattern) => pattern.source.replace(/^\^/, '').replace(/\$$/, '')).join('|');
}
