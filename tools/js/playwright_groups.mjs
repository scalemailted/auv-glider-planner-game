import { FULL_GROUP_LIMITS, RELEASE_TEST_TITLES, SMOKE_TEST_TITLES, exactTitlePatterns } from '../../tests/e2e/capability_manifest.mjs';
export const PLAYWRIGHT_GROUPS_VERSION = 'playwright-groups-repo-clean-r3';

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
      /^Codec Package Runs From GitHub Pages Subpath$/i,
      /^Planner Benchmark debrief exports benchmark records from synthetic result$/i,
      /^Adaptive Benchmark synthetic debrief shows surfacing review and exports P8 session records$/i,
      /^Cold Repo Root Boot Reaches Main Menu Through Package Modules$/i,
      /^Cold Pages Subpath Boot Reaches Main Menu Through Package Modules$/i,
      /^Core Mission Tests Use the Production Readiness Contract$/i,
      /^Main Menu Boot Does Not Generate Mission Science$/i,
      /^Repeated App Boot and Teardown Leave No Runtime Processes$/i,
      /^Current Package Loads After Stable Main Menu Boot$/i,
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
      /^Browser Simulation Uses Package Kernel as Sole Authority$/i,
      /^Package Kernel Preserves Play Pause Step Finish and Reset$/i,
      /^Browser Headless and Pages Share the Authoritative Kernel$/i,
      /^Surfacing Replan Resumes the Same Package Simulation$/i,
      /^Three Simulation Uses Incremental Presentation Updates$/i,
      /^Finish Instantly Avoids Per-Step Three Rebuilds$/i,
      /^Three Quality Profiles Preserve Canonical Simulation Result$/i,
      /^Three Context Slabs Reduce Cost Without Losing Dive Context$/i,
      /^Three Mission Uses Continuous Bathymetric Terrain$/i,
      /^Three Terrain Camera Gestures Do Not Rebuild Bathymetry Mesh$/i,
      /^Bathymetry Package Powers Production Planning Terrain$/i,
      /^Bathymetry Package Powers Production Simulation Terrain$/i,
      /^Bathymetry Package Powers the Standalone Bathymetric World View$/i,
      /^Bathymetry Package Runs From GitHub Pages Subpath$/i,
      /^Bathymetry Limits Predicted and Realized Dive Depth$/i,
      /^Continuous Coastline Blocks Invalid Surface Waypoints$/i,
      /^Water-Column Layers Respect Continuous Seabed$/i,
      /^Bathymetric Demo and Mission Renderer Share Terrain Geometry$/i,
      /^All Production Mission Phases Share One Bathymetry Contract$/i,
      /^Three Bathymetry Resources Dispose Across Scene Transitions$/i,
      /^Three Bathymetric Terrain Preserves Render-Cost Gate$/i,
      /^Three Camera Remains Responsive Under Live Simulation Load$/i,
      /^Execute Mission Through Three Simulation$/i,
      /^Three Volumetric Water Column Planning$/i,
      /^Three Depth-Aware Dive and Sampling$/i,
      /^Same Horizontal Location Produces Depth-Specific Science Samples$/i,
      /^Dive Profile Changes Science Outcome Along the Same Horizontal Route$/i,
      /^Waypoint Panel Edits the Incoming Segment Flight Profile$/i,
      /^Segment Profile Inheritance Is Visible and Editable$/i,
      /^Different Segments Use Different Dive Strategies$/i,
      /^Surface Arrival Behavior Is Separate From Dive Profile$/i,
      /^Water Column Explorer Shows Depth-Specific Layer Values$/i,
      /^Water Column Explorer Supports Stacked and Integrated Views$/i,
      /^Actual Observation Appears on Its Sampled Depth Layer$/i,
      /^Surfacing Replan Can Change Future Segment Dive Profiles$/i,
      /^Segment Flight Profiles Roundtrip Through Plan and Replay$/i,
      /^Layer Explorer Runs From GitHub Pages Subpath$/i,
      /^Selected Waypoint Card Edits Its Incoming Segment Flight Profile$/i,
      /^First Waypoint Card Edits Start to W1 Flight Profile$/i,
      /^Waypoint Selection Synchronizes Right Panel Timeline and Three View$/i,
      /^Segment Flight Profile Draft Does Not Mutate Plan Until Apply$/i,
      /^Cancel Segment Flight Profile Restores Canonical Values$/i,
      /^Apply Segment Flight Profile to Remaining Selected Glider Segments$/i,
      /^Waypoint Reorder Preserves Documented Incoming Profile Semantics$/i,
      /^Right Panel Segment Profile Survives Export Import and Execute$/i,
      /^Compact Viewport Keeps Selected Segment Editor Usable$/i,
      /^DIVE-UX-R1 Full Headed Contextual Segment Profile Editor Walkthrough$/i,
      /^Current Vectors Differ Across Water Column Depths$/i,
      /^Current Vectors Change With Canonical Mission Time$/i,
      /^Active Current Slab Uses Instanced Three Glyphs$/i,
      /^Glider Drift Uses Current at Actual Dive Depth$/i,
      /^Current Display Modes Do Not Change Mission Outcome$/i,
      /^Current Vertical Profile Uses One Four Dimensional Field$/i,
      /^Volumetric Current Slabs Run From GitHub Pages Subpath$/i,
      /^Current Vectors Render Across Multiple Physical Depths$/i,
      /^Volumetric Current Mode Displays a Three Dimensional Vector Volume$/i,
      /^Canonical Timeline Evolves the Current Field$/i,
      /^Tidal Current Reverses Without Random Jitter$/i,
      /^Synthetic Coastal Current Respects the Coastline Boundary$/i,
      /^Canyon Exchange Occurs Only in the Declared Scenario Region$/i,
      /^Glider Samples Current at Actual Depth and Time$/i,
      /^Depth Strategy Changes Mission Outcome in a Sheared Current$/i,
      /^Departure Time Changes Mission Outcome in a Tidal Current$/i,
      /^Manufactured Current Benchmarks Match Analytical Expectations$/i,
      /^Volumetric Current Display Does Not Change Mission Outcome$/i,
      /^Scientific Volumetric Currents Run From GitHub Pages Subpath$/i,      /^Simulation Launch Reaches Interactive Frame With Volumetric Currents$/i,
      /^Current Cube Is Built Once Per Mission Launch$/i,
      /^Simulation Current Sampling Does Not Rebuild the Current Field$/i,
      /^Current Glyph Presentation Failure Does Not Freeze Simulation$/i,
      /^Malformed Canonical Current Field Aborts Launch Cleanly$/i,
      /^Regional Simulation Launch Remains Responsive$/i,
      /^Legacy Mission Launch Remains Compatible After FLOW-R2A$/i,
      /^Camera and Current Layer Changes Do Not Reallocate the Current Cube$/i,
      /^FLOW-R2A Simulation Launch Works From GitHub Pages Subpath$/i,
      /^Current Display Safe Mode Keeps Canonical Current Physics$/i,
      /^Simulation Displays Current Vectors by Default$/i,
      /^Planning Displays the Active Current Slice$/i,
      /^Current Glyphs Remain Visible Over Scalar and Water Column Slabs$/i,
      /^Current Vectors Follow Selected Glider Depth$/i,
      /^Safe Current Display Is Disabled Only by Explicit Query$/i,
      /^Current Glyph Camera Presets Preserve Visibility$/i,
      /^Visible Current Glyphs Do Not Change Mission Outcome$/i,
      /^Visible Current Vectors Run From GitHub Pages Subpath$/i,
      /^Normal Generated Challenge Displays Current Vectors in Planning$/i,
      /^Normal Generated Challenge Displays Current Vectors in Simulation$/i,
      /^Current Visibility Survives Planning to Simulation Transition$/i,
      /^Current Visibility Survives Return Replan and Second Execute$/i,
      /^Current Display Is Not Limited to the Regional Benchmark Fixture$/i,
      /^Idle Optional Gliders Do Not Disable Current Presentation$/i,
      /^Safe Current Display Requires an Explicit Query$/i,
      /^Default and Next Runtime Shells Use Shared Current Presentation Contracts$/i,
      /^Current Presentation Failure Shows a Visible Recovery Reason$/i,
      /^Production Current Vectors Run From GitHub Pages Subpath$/i,
      /^Canonical Current Timeline Updates Three GPU Current Attributes$/i,
      /^Adaptive Current Density Classifies Rendered and Filtered Samples$/i,
      /^FLOW-R2A\.5\.2 Pixel Evidence Shows Dynamic Current Frames$/i,
      /^Planning Timeline Updates Visible Current Vectors$/i,
      /^Current Package Powers Production Planning Currents$/i,
      /^Current Package Preserves Visible Planning Timeline Evolution$/i,
      /^Current Package Powers Production Simulation Drift$/i,
      /^Current Package Preserves Headless and Browser Current Parity$/i,
      /^Current Package Runs From GitHub Pages Subpath$/i,
      /^Environment Package Powers Generated Planning World$/i,
      /^Planning Execute Simulation Preserve One Environment Identity$/i,
      /^Browser and Headless Share Environment Artifact Samples$/i,
      /^Environment Package Runs From GitHub Pages Subpath$/i,
      /^Visible Planning Next Button Updates Current Vectors$/i,
      /^Visible Planning Start Prev Next and End Share One Time Authority$/i,
      /^Visible Planning Timeline Input Updates Current Vectors$/i,
      /^Planning Current Test Does Not Use a Direct Time Mutation$/i,
      /^Manual Planning Current Workflow Runs From GitHub Pages Subpath$/i,
      /^Current Vectors Update Within a Source Time Bracket$/i,
      /^Simulation Play Pause and Step Control Current Evolution$/i,
      /^Rendered Current Matches Glider Applied Current$/i,
      /^Current Display Does Not Change Mission Outcome$/i,
      /^Dynamic Current Vectors Run From GitHub Pages Subpath$/i,
      /^Normal Generated Currents Span Full Mission Time$/i,
      /^Periodic Current Fields Wrap Instead of Clamping$/i,
      /^Current Depth Layer Filters Hide Only Requested Layers$/i,
      /^Calm Wet Cells Render Neutral Current Markers$/i,
      /^Environment Generator Manifest Is Reproducible In Browser$/i,
      /^Depth Uniform Current Is Explicitly Labeled Barotropic$/i,
      /^Mixed Regional Current Varies Across Physical Depth$/i,
      /^Current Layer Explorer Shows a Vertical Velocity Profile$/i,
      /^Different Dive Profiles Experience Different Currents$/i,
      /^Barotropic Control Produces Depth-Independent Drift$/i,
      /^Depth Structured Currents Run From GitHub Pages Subpath$/i,
      /^Normal Production Currents Differ Across Physical Depths$/i,
      /^Normal Production Currents Evolve With Canonical Mission Time$/i,
      /^Current Glyph Length Represents Physical Speed$/i,
      /^Production Current Field Is Spatially Coherent$/i,
      /^Stacked Current Field Uses Distinct Depth Data$/i,
      /^Sparse Volumetric Current Field Occupies the Wet Water Column$/i,
      /^Synthetic Coastal Current Does Not Flow Generically Downhill$/i,
      /^Tidal Current Evolves and Reverses Deterministically$/i,
      /^Eddy Current Has a Calm Center and Magnitude Gradient$/i,
      /^Glider Drift Uses Current at Actual Depth and Time$/i,
      /^Scientific Production Currents Run From GitHub Pages Subpath$/i,      /^Three Mission Scene Isolation$/i,
      /^Three Scene Cleanup Is Null-Safe and Idempotent$/i,
      /^Generated Mission Opens a Visible Volumetric Water Column$/i,
      /^Legacy Mission Uses Explicit Surface Compatibility Mode$/i,
      /^Three Vehicle Pose Guidance and Grid Alignment$/i,
      /^Three Waypoint Validation and Mission Window Semantics$/i,
      /^Terrain-Aware Placement Preview Prevents Invalid Mission Mutation$/i,
      /^Continuous Route Validation Detects Coastline and Clearance Risks$/i,
      /^Sampling Targets Respect Canonical Seabed and Reachability$/i,
      /^Mission Readiness Separates Errors Warnings and Advisories$/i,
      /^Planned and Realized Paths Share Terrain Validation$/i,
      /^Terrain Validation Persists Through Export Headless and Replay$/i,
      /^Three Terrain Presentation Clearly Distinguishes Mission Semantics$/i,
      /^Legacy and Three Simulation Produce Identical Canonical Result$/i,
      /^legacy saved level registry scene still opens$/i
    ]
  },
  {
    id: 'threeReplayReview',
    label: 'Three.js replay playback and debrief route review parity',
    patterns: [
      /^Three Debrief Opens Canonical Replay Review$/i,
      /^Three Replay Play Pause Step and Checkpoint Navigation$/i,
      /^Three Replay Scrub Reconstructs Public State Deterministically$/i,
      /^Three Replay Distinguishes Planned Predicted and Realized Paths$/i,
      /^Three Replay Shows Terrain Events and Depth Observations$/i,
      /^Three Replay Supports Multi-Agent Selection$/i,
      /^Three Replay Rejects Tampered Checkpoint Digest$/i,
      /^Three Replay Resources Dispose Across Scene Transitions$/i,
      /^Browser and Headless Replay Share Reducer Semantics$/i
    ]
  },
  {
    id: 'threeMissionEditor',
    label: 'Three.js mission editor parity and Phaser editor world retirement',
    patterns: [
      /^Three Mission Editor Opens Existing Mission Without Schema Drift$/i,
      /^Three Mission Editor Supports Canonical Terrain and Mission Object Editing$/i,
      /^Three Mission Editor Preserves Continuous and Legacy Cell Coordinates$/i,
      /^Three Mission Editor Export Reimport Roundtrip Is Lossless$/i,
      /^Three Mission Editor Preview Uses Production Mission Lifecycle$/i,
      /^Three Mission Editor Validation Blocks Invalid Export and Preview$/i,
      /^Three Mission Editor Resources Dispose Across Scene Transitions$/i,
      /^Production Mission Routes Do Not Instantiate Legacy Phaser World Renderers$/i,
      /^Browser and Headless Validate Edited Mission Identically$/i
    ]
  },
  {
    id: 'productionShellR3A',
    label: 'THREE-R3A gated Phaser-free production shell parity',
    patterns: [
      /^THREE-R3A Current Shell Visual and Route Baseline$/i,
      /^Next Shell Product Hub Preserves Production Content and Styling$/i,
      /^Next Shell Preserves Setup Briefing Planning Simulation and Debrief$/i,
      /^Next Shell Reuses Canonical Three Replay and Mission Editor$/i,
      /^Next Shell Route Transitions Dispose Previous View$/i,
      /^Next Shell Import Export and Headless Viewer Preserve Tool Behavior$/i,
      /^Next Shell Supports Keyboard Route and Mission Control$/i,
      /^Next Shell Honors Reduced Motion Without Changing Mission Outcomes$/i,
      /^Next Shell Runs From GitHub Pages Subpath Without Phaser$/i,
      /^Next Shell Loads Legacy Learning Lab Only On Demand$/i
    ]
  },  {
    id: 'visualAcceptance',
    label: 'Headed owner visual acceptance and production walkthroughs',
    patterns: [
      /^THREE-R1\.2C Full Headed Production Walkthrough$/i,
      /^THREE-R2A Full Headed Replay and Debrief Walkthrough$/i,
      /^THREE-R2B Full Headed Mission Editor Walkthrough$/i,
      /^THREE-R3A Full Headed Phaser-Free Production Shell Walkthrough$/i,
      /^FLOW-R2A\.1 Full Headed Simulation Launch Stability Walkthrough$/i,
      /^FLOW-R2A\.2 Full Headed Visible Current Vector Walkthrough$/i,
      /^FLOW-R2A\.3 Full Headed Scientific Volumetric Current Walkthrough$/i,
      /^FLOW-R2A\.4 Full Headed Production Current Visibility Walkthrough$/i,
      /^FLOW-R2A\.5 Full Headed Production 4D Current Dynamics Walkthrough$/i,
      /^FLOW-R2A\.5\.1 Full Headed Environment Time and Layer Walkthrough$/i,
      /^FLOW-RUNTIME-R1\.1 Full Headed Manual Planning Timeline Walkthrough$/i,
      /^FLOW-RUNTIME-R1 Full Headed Canonical Current Evolution Walkthrough$/i
    ]
  }
]);

const RELEASE_PATTERN_SOURCES = new Set(exactTitlePatterns(RELEASE_TEST_TITLES).map((pattern) => pattern.source));
const SMOKE_PATTERN_SOURCES = new Set(exactTitlePatterns(SMOKE_TEST_TITLES).map((pattern) => pattern.source));

export const PLAYWRIGHT_PROFILE_IDS = Object.freeze(['smoke', 'release', 'visual', 'full']);

export function normalizePlaywrightProfile(profile = 'full') {
  const normalized = String(profile ?? 'full').trim();
  return PLAYWRIGHT_PROFILE_IDS.includes(normalized) ? normalized : 'full';
}

export function groupsForProfile(profile = 'full') {
  const normalized = normalizePlaywrightProfile(profile);
  return PLAYWRIGHT_GROUPS.filter((group) => patternsForGroupProfile(group.id, normalized).length > 0);
}

export function patternsForGroupProfile(groupId, profile = 'full') {
  const normalized = normalizePlaywrightProfile(profile);
  const group = PLAYWRIGHT_GROUPS.find((candidate) => candidate.id === groupId);
  if (!group) throw new Error(`Unknown Playwright group: ${groupId}`);
  if (normalized === 'visual') return group.id === 'visualAcceptance' ? group.patterns : [];
  if (normalized === 'smoke') return group.patterns.filter((pattern) => SMOKE_PATTERN_SOURCES.has(pattern.source));
  if (normalized === 'release') return group.patterns.filter((pattern) => RELEASE_PATTERN_SOURCES.has(pattern.source));
  const limit = FULL_GROUP_LIMITS[group.id] ?? 0;
  return group.patterns.slice(0, limit);
}

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

export function grepForGroup(groupId, profile = 'full') {
  const patterns = patternsForGroupProfile(groupId, profile);
  if (!patterns.length) throw new Error(`No Playwright patterns for group ${groupId} in profile ${normalizePlaywrightProfile(profile)}.`);
  return patterns.map((pattern) => pattern.source.replace(/^\^/, '').replace(/\$$/, '')).join('|');
}
