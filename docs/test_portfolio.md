# Test Portfolio

## Profile Counts

| Profile | Tests |
|---|---:|
| smoke | 17 |
| release | 59 |
| visual | 13 |
| full | 80 |

## Capability Matrix

| Title | File | Group | Capability | Contract | Proposed action |
|---|---|---|---|---|---|
| Bathymetry Package Powers Production Planning Terrain | tests/e2e/bathy_pkg_r1.spec.js | executionWaterColumn | bathymetry/terrain | canonical contract | KEEP_E2E |
| Bathymetry Package Powers Production Simulation Terrain | tests/e2e/bathy_pkg_r1.spec.js | executionWaterColumn | bathymetry/terrain | canonical contract | KEEP_E2E |
| Bathymetry Package Powers the Standalone Bathymetric World View | tests/e2e/bathy_pkg_r1.spec.js | executionWaterColumn | bathymetry/terrain | canonical contract | MERGE_E2E |
| Bathymetry Package Runs From GitHub Pages Subpath | tests/e2e/bathy_pkg_r1.spec.js | executionWaterColumn | bathymetry/terrain | canonical contract | KEEP_E2E |
| Waypoint Panel Edits the Incoming Segment Flight Profile | tests/e2e/dive_r1_1_segment_profiles.spec.js | executionWaterColumn | planning/dive profile | browser UI behavior | MERGE_E2E |
| Segment Profile Inheritance Is Visible and Editable | tests/e2e/dive_r1_1_segment_profiles.spec.js | executionWaterColumn | planning/dive profile | browser UI behavior | MERGE_E2E |
| Different Segments Use Different Dive Strategies | tests/e2e/dive_r1_1_segment_profiles.spec.js | executionWaterColumn | planning/dive profile | user workflow | MERGE_E2E |
| Surface Arrival Behavior Is Separate From Dive Profile | tests/e2e/dive_r1_1_segment_profiles.spec.js | executionWaterColumn | planning/dive profile | user workflow | MERGE_E2E |
| Water Column Explorer Shows Depth-Specific Layer Values | tests/e2e/dive_r1_1_segment_profiles.spec.js | executionWaterColumn | planning/dive profile | user workflow | MERGE_E2E |
| Water Column Explorer Supports Stacked and Integrated Views | tests/e2e/dive_r1_1_segment_profiles.spec.js | executionWaterColumn | planning/dive profile | user workflow | MERGE_E2E |
| Actual Observation Appears on Its Sampled Depth Layer | tests/e2e/dive_r1_1_segment_profiles.spec.js | executionWaterColumn | planning/dive profile | user workflow | MERGE_E2E |
| Surfacing Replan Can Change Future Segment Dive Profiles | tests/e2e/dive_r1_1_segment_profiles.spec.js | executionWaterColumn | planning/dive profile | user workflow | KEEP_E2E |
| Segment Flight Profiles Roundtrip Through Plan and Replay | tests/e2e/dive_r1_1_segment_profiles.spec.js | executionWaterColumn | replay/debrief | user workflow | MERGE_E2E |
| Layer Explorer Runs From GitHub Pages Subpath | tests/e2e/dive_r1_1_segment_profiles.spec.js | executionWaterColumn | static hosting | static-host compatibility | KEEP_E2E |
| Same Horizontal Location Produces Depth-Specific Science Samples | tests/e2e/dive_r1_depth_sampling.spec.js | executionWaterColumn | planning/dive profile | user workflow | KEEP_E2E |
| Dive Profile Changes Science Outcome Along the Same Horizontal Route | tests/e2e/dive_r1_depth_sampling.spec.js | executionWaterColumn | planning/dive profile | user workflow | MERGE_E2E |
| Selected Waypoint Card Edits Its Incoming Segment Flight Profile | tests/e2e/dive_ux_r1_right_panel_segment_editor.spec.js | executionWaterColumn | planning/dive profile | user workflow | KEEP_E2E |
| First Waypoint Card Edits Start to W1 Flight Profile | tests/e2e/dive_ux_r1_right_panel_segment_editor.spec.js | executionWaterColumn | planning/dive profile | user workflow | MERGE_E2E |
| Waypoint Selection Synchronizes Right Panel Timeline and Three View | tests/e2e/dive_ux_r1_right_panel_segment_editor.spec.js | executionWaterColumn | planning/dive profile | browser UI behavior | MERGE_E2E |
| Segment Flight Profile Draft Does Not Mutate Plan Until Apply | tests/e2e/dive_ux_r1_right_panel_segment_editor.spec.js | executionWaterColumn | planning/dive profile | user workflow | MERGE_E2E |
| Cancel Segment Flight Profile Restores Canonical Values | tests/e2e/dive_ux_r1_right_panel_segment_editor.spec.js | executionWaterColumn | planning/dive profile | canonical contract | MERGE_E2E |
| Apply Segment Flight Profile to Remaining Selected Glider Segments | tests/e2e/dive_ux_r1_right_panel_segment_editor.spec.js | executionWaterColumn | planning/dive profile | user workflow | MERGE_E2E |
| Waypoint Reorder Preserves Documented Incoming Profile Semantics | tests/e2e/dive_ux_r1_right_panel_segment_editor.spec.js | executionWaterColumn | planning/dive profile | user workflow | MERGE_E2E |
| Right Panel Segment Profile Survives Export Import and Execute | tests/e2e/dive_ux_r1_right_panel_segment_editor.spec.js | executionWaterColumn | planning/dive profile | browser UI behavior | KEEP_E2E |
| Compact Viewport Keeps Selected Segment Editor Usable | tests/e2e/dive_ux_r1_right_panel_segment_editor.spec.js | executionWaterColumn | mission editor | user workflow | MERGE_E2E |
| DIVE-UX-R1 Full Headed Contextual Segment Profile Editor Walkthrough | tests/e2e/dive_ux_r1_right_panel_segment_editor.spec.js | executionWaterColumn | mission editor | user workflow | MOVE_TO_VISUAL_ACCEPTANCE |
| Cold Repo Root Boot Reaches Main Menu Through Package Modules | tests/e2e/flow_pkg_r1_1_boot_readiness.spec.js | coreMission | application workflow | canonical contract | KEEP_E2E |
| Cold Pages Subpath Boot Reaches Main Menu Through Package Modules | tests/e2e/flow_pkg_r1_1_boot_readiness.spec.js | coreMission | static hosting | canonical contract | KEEP_E2E |
| Core Mission Tests Use the Production Readiness Contract | tests/e2e/flow_pkg_r1_1_boot_readiness.spec.js | coreMission | application workflow | user workflow | KEEP_E2E |
| Main Menu Boot Does Not Generate Mission Science | tests/e2e/flow_pkg_r1_1_boot_readiness.spec.js | coreMission | application workflow | user workflow | MERGE_E2E |
| Repeated App Boot and Teardown Leave No Runtime Processes | tests/e2e/flow_pkg_r1_1_boot_readiness.spec.js | coreMission | application workflow | user workflow | KEEP_E2E |
| Current Package Loads After Stable Main Menu Boot | tests/e2e/flow_pkg_r1_1_boot_readiness.spec.js | coreMission | currents | canonical contract | MERGE_E2E |
| Current Package Powers Production Planning Currents | tests/e2e/flow_pkg_r1_current_package.spec.js | executionWaterColumn | currents | canonical contract | KEEP_E2E |
| Current Package Preserves Visible Planning Timeline Evolution | tests/e2e/flow_pkg_r1_current_package.spec.js | executionWaterColumn | currents | canonical contract | CONVERT_TO_NODE |
| Current Package Powers Production Simulation Drift | tests/e2e/flow_pkg_r1_current_package.spec.js | executionWaterColumn | currents | canonical contract | MERGE_E2E |
| Current Package Preserves Headless and Browser Current Parity | tests/e2e/flow_pkg_r1_current_package.spec.js | executionWaterColumn | currents | canonical contract | CONVERT_TO_NODE |
| Current Package Runs From GitHub Pages Subpath | tests/e2e/flow_pkg_r1_current_package.spec.js | executionWaterColumn | currents | canonical contract | KEEP_E2E |
| Depth Uniform Current Is Explicitly Labeled Barotropic | tests/e2e/flow_pkg_r2_depth_structured_currents.spec.js | executionWaterColumn | currents | user workflow | CONVERT_TO_NODE |
| Mixed Regional Current Varies Across Physical Depth | tests/e2e/flow_pkg_r2_depth_structured_currents.spec.js | executionWaterColumn | currents | user workflow | MERGE_E2E |
| Current Layer Explorer Shows a Vertical Velocity Profile | tests/e2e/flow_pkg_r2_depth_structured_currents.spec.js | executionWaterColumn | currents | user workflow | MERGE_E2E |
| Different Dive Profiles Experience Different Currents | tests/e2e/flow_pkg_r2_depth_structured_currents.spec.js | executionWaterColumn | currents | user workflow | MERGE_E2E |
| Barotropic Control Produces Depth-Independent Drift | tests/e2e/flow_pkg_r2_depth_structured_currents.spec.js | executionWaterColumn | planning/dive profile | browser UI behavior | CONVERT_TO_NODE |
| Depth Structured Currents Run From GitHub Pages Subpath | tests/e2e/flow_pkg_r2_depth_structured_currents.spec.js | executionWaterColumn | currents | static-host compatibility | KEEP_E2E |
| Simulation Launch Reaches Interactive Frame With Volumetric Currents | tests/e2e/flow_r2a_1_launch_stability.spec.js | executionWaterColumn | currents | user workflow | MERGE_E2E |
| Current Cube Is Built Once Per Mission Launch | tests/e2e/flow_r2a_1_launch_stability.spec.js | executionWaterColumn | currents | user workflow | MERGE_E2E |
| Simulation Current Sampling Does Not Rebuild the Current Field | tests/e2e/flow_r2a_1_launch_stability.spec.js | executionWaterColumn | currents | user workflow | MERGE_E2E |
| Current Glyph Presentation Failure Does Not Freeze Simulation | tests/e2e/flow_r2a_1_launch_stability.spec.js | executionWaterColumn | currents | user workflow | MERGE_E2E |
| Malformed Canonical Current Field Aborts Launch Cleanly | tests/e2e/flow_r2a_1_launch_stability.spec.js | executionWaterColumn | currents | canonical contract | MERGE_E2E |
| Regional Simulation Launch Remains Responsive | tests/e2e/flow_r2a_1_launch_stability.spec.js | executionWaterColumn | application workflow | user workflow | MERGE_E2E |
| Legacy Mission Launch Remains Compatible After FLOW-R2A | tests/e2e/flow_r2a_1_launch_stability.spec.js | executionWaterColumn | application workflow | user workflow | DEFER_REVIEW |
| Camera and Current Layer Changes Do Not Reallocate the Current Cube | tests/e2e/flow_r2a_1_launch_stability.spec.js | executionWaterColumn | currents | user workflow | MERGE_E2E |
| FLOW-R2A Simulation Launch Works From GitHub Pages Subpath | tests/e2e/flow_r2a_1_launch_stability.spec.js | executionWaterColumn | static hosting | static-host compatibility | KEEP_E2E |
| Current Display Safe Mode Keeps Canonical Current Physics | tests/e2e/flow_r2a_1_launch_stability.spec.js | executionWaterColumn | currents | canonical contract | MERGE_E2E |
| FLOW-R2A.1 Full Headed Simulation Launch Stability Walkthrough | tests/e2e/flow_r2a_1_launch_stability.spec.js | visualAcceptance | application workflow | user workflow | MOVE_TO_VISUAL_ACCEPTANCE |
| Simulation Displays Current Vectors by Default | tests/e2e/flow_r2a_2_visible_currents.spec.js | executionWaterColumn | currents | user workflow | MERGE_E2E |
| Planning Displays the Active Current Slice | tests/e2e/flow_r2a_2_visible_currents.spec.js | executionWaterColumn | currents | user workflow | MERGE_E2E |
| Current Glyphs Remain Visible Over Scalar and Water Column Slabs | tests/e2e/flow_r2a_2_visible_currents.spec.js | executionWaterColumn | currents | browser UI behavior | MERGE_E2E |
| Current Vectors Follow Selected Glider Depth | tests/e2e/flow_r2a_2_visible_currents.spec.js | executionWaterColumn | currents | user workflow | MERGE_E2E |
| Safe Current Display Is Disabled Only by Explicit Query | tests/e2e/flow_r2a_2_visible_currents.spec.js | executionWaterColumn | currents | user workflow | MERGE_E2E |
| Current Glyph Camera Presets Preserve Visibility | tests/e2e/flow_r2a_2_visible_currents.spec.js | executionWaterColumn | currents | user workflow | MERGE_E2E |
| Visible Current Glyphs Do Not Change Mission Outcome | tests/e2e/flow_r2a_2_visible_currents.spec.js | executionWaterColumn | currents | browser UI behavior | MERGE_E2E |
| Visible Current Vectors Run From GitHub Pages Subpath | tests/e2e/flow_r2a_2_visible_currents.spec.js | executionWaterColumn | currents | browser UI behavior | KEEP_E2E |
| FLOW-R2A.2 Full Headed Visible Current Vector Walkthrough | tests/e2e/flow_r2a_2_visible_currents.spec.js | visualAcceptance | currents | browser UI behavior | MOVE_TO_VISUAL_ACCEPTANCE |
| Current Vectors Render Across Multiple Physical Depths | tests/e2e/flow_r2a_3_scientific_currents.spec.js | executionWaterColumn | currents | user workflow | MERGE_E2E |
| Volumetric Current Mode Displays a Three Dimensional Vector Volume | tests/e2e/flow_r2a_3_scientific_currents.spec.js | executionWaterColumn | currents | user workflow | MERGE_E2E |
| Canonical Timeline Evolves the Current Field | tests/e2e/flow_r2a_3_scientific_currents.spec.js | executionWaterColumn | currents | canonical contract | MERGE_E2E |
| Tidal Current Reverses Without Random Jitter | tests/e2e/flow_r2a_3_scientific_currents.spec.js | executionWaterColumn | currents | user workflow | MERGE_E2E |
| Synthetic Coastal Current Respects the Coastline Boundary | tests/e2e/flow_r2a_3_scientific_currents.spec.js | executionWaterColumn | currents | user workflow | MERGE_E2E |
| Canyon Exchange Occurs Only in the Declared Scenario Region | tests/e2e/flow_r2a_3_scientific_currents.spec.js | executionWaterColumn | application workflow | user workflow | MERGE_E2E |
| Glider Samples Current at Actual Depth and Time | tests/e2e/flow_r2a_3_scientific_currents.spec.js | executionWaterColumn | currents | user workflow | MERGE_E2E |
| Depth Strategy Changes Mission Outcome in a Sheared Current | tests/e2e/flow_r2a_3_scientific_currents.spec.js | executionWaterColumn | currents | user workflow | MERGE_E2E |
| Departure Time Changes Mission Outcome in a Tidal Current | tests/e2e/flow_r2a_3_scientific_currents.spec.js | executionWaterColumn | currents | user workflow | MERGE_E2E |
| Manufactured Current Benchmarks Match Analytical Expectations | tests/e2e/flow_r2a_3_scientific_currents.spec.js | executionWaterColumn | currents | user workflow | CONVERT_TO_NODE |
| Volumetric Current Display Does Not Change Mission Outcome | tests/e2e/flow_r2a_3_scientific_currents.spec.js | executionWaterColumn | currents | user workflow | MERGE_E2E |
| Scientific Volumetric Currents Run From GitHub Pages Subpath | tests/e2e/flow_r2a_3_scientific_currents.spec.js | executionWaterColumn | currents | static-host compatibility | KEEP_E2E |
| FLOW-R2A.3 Full Headed Scientific Volumetric Current Walkthrough | tests/e2e/flow_r2a_3_scientific_currents.spec.js | visualAcceptance | currents | user workflow | MOVE_TO_VISUAL_ACCEPTANCE |
| Normal Generated Challenge Displays Current Vectors in Planning | tests/e2e/flow_r2a_4_production_current_visibility.spec.js | executionWaterColumn | currents | user workflow | MERGE_E2E |
| Normal Generated Challenge Displays Current Vectors in Simulation | tests/e2e/flow_r2a_4_production_current_visibility.spec.js | executionWaterColumn | currents | user workflow | MERGE_E2E |
| Current Visibility Survives Planning to Simulation Transition | tests/e2e/flow_r2a_4_production_current_visibility.spec.js | executionWaterColumn | currents | user workflow | MERGE_E2E |
| Current Visibility Survives Return Replan and Second Execute | tests/e2e/flow_r2a_4_production_current_visibility.spec.js | executionWaterColumn | currents | user workflow | MERGE_E2E |
| Current Display Is Not Limited to the Regional Benchmark Fixture | tests/e2e/flow_r2a_4_production_current_visibility.spec.js | executionWaterColumn | currents | user workflow | MERGE_E2E |
| Idle Optional Gliders Do Not Disable Current Presentation | tests/e2e/flow_r2a_4_production_current_visibility.spec.js | executionWaterColumn | currents | user workflow | MERGE_E2E |
| Safe Current Display Requires an Explicit Query | tests/e2e/flow_r2a_4_production_current_visibility.spec.js | executionWaterColumn | currents | user workflow | MERGE_E2E |
| Default and Next Runtime Shells Use Shared Current Presentation Contracts | tests/e2e/flow_r2a_4_production_current_visibility.spec.js | executionWaterColumn | currents | user workflow | MERGE_E2E |
| Current Presentation Failure Shows a Visible Recovery Reason | tests/e2e/flow_r2a_4_production_current_visibility.spec.js | executionWaterColumn | currents | browser UI behavior | MERGE_E2E |
| Production Current Vectors Run From GitHub Pages Subpath | tests/e2e/flow_r2a_4_production_current_visibility.spec.js | executionWaterColumn | currents | static-host compatibility | KEEP_E2E |
| FLOW-R2A.4 Full Headed Production Current Visibility Walkthrough | tests/e2e/flow_r2a_4_production_current_visibility.spec.js | visualAcceptance | currents | user workflow | MOVE_TO_VISUAL_ACCEPTANCE |
| Normal Generated Currents Span Full Mission Time | tests/e2e/flow_r2a_5_1_environment_and_time.spec.js | executionWaterColumn | currents | user workflow | MERGE_E2E |
| Periodic Current Fields Wrap Instead of Clamping | tests/e2e/flow_r2a_5_1_environment_and_time.spec.js | executionWaterColumn | currents | user workflow | MERGE_E2E |
| Current Depth Layer Filters Hide Only Requested Layers | tests/e2e/flow_r2a_5_1_environment_and_time.spec.js | executionWaterColumn | currents | user workflow | MERGE_E2E |
| Calm Wet Cells Render Neutral Current Markers | tests/e2e/flow_r2a_5_1_environment_and_time.spec.js | executionWaterColumn | currents | user workflow | MERGE_E2E |
| Environment Generator Manifest Is Reproducible In Browser | tests/e2e/flow_r2a_5_1_environment_and_time.spec.js | executionWaterColumn | application workflow | user workflow | CONVERT_TO_NODE |
| FLOW-R2A.5.1 Full Headed Environment Time and Layer Walkthrough | tests/e2e/flow_r2a_5_1_environment_and_time.spec.js | visualAcceptance | application workflow | user workflow | MOVE_TO_VISUAL_ACCEPTANCE |
| Canonical Current Timeline Updates Three GPU Current Attributes | tests/e2e/flow_r2a_5_2_timeline_to_gpu.spec.js | executionWaterColumn | currents | canonical contract | MERGE_E2E |
| Adaptive Current Density Classifies Rendered and Filtered Samples | tests/e2e/flow_r2a_5_2_timeline_to_gpu.spec.js | executionWaterColumn | currents | user workflow | MERGE_E2E |
| FLOW-R2A.5.2 Pixel Evidence Shows Dynamic Current Frames | tests/e2e/flow_r2a_5_2_timeline_to_gpu.spec.js | executionWaterColumn | currents | user workflow | MERGE_E2E |
| Normal Production Currents Differ Across Physical Depths | tests/e2e/flow_r2a_5_current_dynamics.spec.js | executionWaterColumn | currents | user workflow | KEEP_E2E |
| Normal Production Currents Evolve With Canonical Mission Time | tests/e2e/flow_r2a_5_current_dynamics.spec.js | executionWaterColumn | currents | canonical contract | KEEP_E2E |
| Current Glyph Length Represents Physical Speed | tests/e2e/flow_r2a_5_current_dynamics.spec.js | executionWaterColumn | currents | user workflow | MERGE_E2E |
| Production Current Field Is Spatially Coherent | tests/e2e/flow_r2a_5_current_dynamics.spec.js | executionWaterColumn | currents | user workflow | MERGE_E2E |
| Stacked Current Field Uses Distinct Depth Data | tests/e2e/flow_r2a_5_current_dynamics.spec.js | executionWaterColumn | currents | user workflow | MERGE_E2E |
| Sparse Volumetric Current Field Occupies the Wet Water Column | tests/e2e/flow_r2a_5_current_dynamics.spec.js | executionWaterColumn | currents | user workflow | MERGE_E2E |
| Synthetic Coastal Current Does Not Flow Generically Downhill | tests/e2e/flow_r2a_5_current_dynamics.spec.js | executionWaterColumn | currents | user workflow | MERGE_E2E |
| Tidal Current Evolves and Reverses Deterministically | tests/e2e/flow_r2a_5_current_dynamics.spec.js | executionWaterColumn | currents | user workflow | MERGE_E2E |
| Eddy Current Has a Calm Center and Magnitude Gradient | tests/e2e/flow_r2a_5_current_dynamics.spec.js | executionWaterColumn | currents | user workflow | MERGE_E2E |
| Glider Drift Uses Current at Actual Depth and Time | tests/e2e/flow_r2a_5_current_dynamics.spec.js | executionWaterColumn | currents | user workflow | MERGE_E2E |
| Current Display Modes Do Not Change Mission Outcome | tests/e2e/flow_r2a_5_current_dynamics.spec.js | executionWaterColumn | currents | user workflow | MERGE_E2E |
| Scientific Production Currents Run From GitHub Pages Subpath | tests/e2e/flow_r2a_5_current_dynamics.spec.js | executionWaterColumn | currents | static-host compatibility | KEEP_E2E |
| FLOW-R2A.5 Full Headed Production 4D Current Dynamics Walkthrough | tests/e2e/flow_r2a_5_current_dynamics.spec.js | visualAcceptance | currents | user workflow | MOVE_TO_VISUAL_ACCEPTANCE |
| Current Vectors Differ Across Water Column Depths | tests/e2e/flow_r2a_current_cubes.spec.js | executionWaterColumn | currents | user workflow | KEEP_E2E |
| Current Vectors Change With Canonical Mission Time | tests/e2e/flow_r2a_current_cubes.spec.js | executionWaterColumn | currents | canonical contract | KEEP_E2E |
| Active Current Slab Uses Instanced Three Glyphs | tests/e2e/flow_r2a_current_cubes.spec.js | executionWaterColumn | currents | user workflow | MERGE_E2E |
| Glider Drift Uses Current at Actual Dive Depth | tests/e2e/flow_r2a_current_cubes.spec.js | executionWaterColumn | currents | user workflow | MERGE_E2E |
| Current Display Modes Do Not Change Mission Outcome | tests/e2e/flow_r2a_current_cubes.spec.js | executionWaterColumn | currents | user workflow | MERGE_E2E |
| Current Vertical Profile Uses One Four Dimensional Field | tests/e2e/flow_r2a_current_cubes.spec.js | executionWaterColumn | currents | user workflow | MERGE_E2E |
| Volumetric Current Slabs Run From GitHub Pages Subpath | tests/e2e/flow_r2a_current_cubes.spec.js | executionWaterColumn | currents | static-host compatibility | KEEP_E2E |
| Visible Planning Next Button Updates Current Vectors | tests/e2e/flow_runtime_r1_1_manual_planning_timeline.spec.js | executionWaterColumn | currents | browser UI behavior | MERGE_E2E |
| Visible Planning Start Prev Next and End Share One Time Authority | tests/e2e/flow_runtime_r1_1_manual_planning_timeline.spec.js | executionWaterColumn | application workflow | browser UI behavior | MERGE_E2E |
| Visible Planning Timeline Input Updates Current Vectors | tests/e2e/flow_runtime_r1_1_manual_planning_timeline.spec.js | executionWaterColumn | currents | browser UI behavior | MERGE_E2E |
| Planning Current Test Does Not Use a Direct Time Mutation | tests/e2e/flow_runtime_r1_1_manual_planning_timeline.spec.js | executionWaterColumn | currents | user workflow | CONVERT_TO_NODE |
| Manual Planning Current Workflow Runs From GitHub Pages Subpath | tests/e2e/flow_runtime_r1_1_manual_planning_timeline.spec.js | executionWaterColumn | currents | static-host compatibility | KEEP_E2E |
| FLOW-RUNTIME-R1.1 Full Headed Manual Planning Timeline Walkthrough | tests/e2e/flow_runtime_r1_1_manual_planning_timeline.spec.js | visualAcceptance | application workflow | user workflow | MOVE_TO_VISUAL_ACCEPTANCE |
| Planning Timeline Updates Visible Current Vectors | tests/e2e/flow_runtime_r1_dynamic_currents.spec.js | executionWaterColumn | currents | browser UI behavior | KEEP_E2E |
| Current Vectors Update Within a Source Time Bracket | tests/e2e/flow_runtime_r1_dynamic_currents.spec.js | executionWaterColumn | currents | user workflow | MERGE_E2E |
| Simulation Play Pause and Step Control Current Evolution | tests/e2e/flow_runtime_r1_dynamic_currents.spec.js | executionWaterColumn | currents | browser UI behavior | KEEP_E2E |
| Rendered Current Matches Glider Applied Current | tests/e2e/flow_runtime_r1_dynamic_currents.spec.js | executionWaterColumn | currents | user workflow | MERGE_E2E |
| Current Display Does Not Change Mission Outcome | tests/e2e/flow_runtime_r1_dynamic_currents.spec.js | executionWaterColumn | currents | user workflow | MERGE_E2E |
| Dynamic Current Vectors Run From GitHub Pages Subpath | tests/e2e/flow_runtime_r1_dynamic_currents.spec.js | executionWaterColumn | currents | static-host compatibility | KEEP_E2E |
| FLOW-RUNTIME-R1 Full Headed Canonical Current Evolution Walkthrough | tests/e2e/flow_runtime_r1_dynamic_currents.spec.js | visualAcceptance | currents | canonical contract | MOVE_TO_VISUAL_ACCEPTANCE |
| THREE-R1.2C Full Headed Production Walkthrough | tests/e2e/three_r1_2c_headed_acceptance.spec.js | visualAcceptance | application workflow | user workflow | MOVE_TO_VISUAL_ACCEPTANCE |
| THREE-R2A Full Headed Replay and Debrief Walkthrough | tests/e2e/three_r2a_headed_acceptance.spec.js | visualAcceptance | replay/debrief | user workflow | MOVE_TO_VISUAL_ACCEPTANCE |
| Three Debrief Opens Canonical Replay Review | tests/e2e/three_r2a_replay_review.spec.js | threeReplayReview | replay/debrief | canonical contract | KEEP_E2E |
| Three Replay Play Pause Step and Checkpoint Navigation | tests/e2e/three_r2a_replay_review.spec.js | threeReplayReview | replay/debrief | user workflow | KEEP_E2E |
| Three Replay Scrub Reconstructs Public State Deterministically | tests/e2e/three_r2a_replay_review.spec.js | threeReplayReview | replay/debrief | user workflow | MERGE_E2E |
| Three Replay Distinguishes Planned Predicted and Realized Paths | tests/e2e/three_r2a_replay_review.spec.js | threeReplayReview | replay/debrief | user workflow | MERGE_E2E |
| Three Replay Shows Terrain Events and Depth Observations | tests/e2e/three_r2a_replay_review.spec.js | threeReplayReview | replay/debrief | user workflow | MERGE_E2E |
| Three Replay Supports Multi-Agent Selection | tests/e2e/three_r2a_replay_review.spec.js | threeReplayReview | replay/debrief | user workflow | MERGE_E2E |
| Three Replay Rejects Tampered Checkpoint Digest | tests/e2e/three_r2a_replay_review.spec.js | threeReplayReview | replay/debrief | canonical contract | KEEP_E2E |
| Three Replay Resources Dispose Across Scene Transitions | tests/e2e/three_r2a_replay_review.spec.js | threeReplayReview | replay/debrief | user workflow | MERGE_E2E |
| Browser and Headless Replay Share Reducer Semantics | tests/e2e/three_r2a_replay_review.spec.js | threeReplayReview | replay/debrief | canonical contract | KEEP_E2E |
| THREE-R2B Full Headed Mission Editor Walkthrough | tests/e2e/three_r2b_headed_acceptance.spec.js | visualAcceptance | mission editor | user workflow | MOVE_TO_VISUAL_ACCEPTANCE |
| Three Mission Editor Opens Existing Mission Without Schema Drift | tests/e2e/three_r2b_mission_editor.spec.js | threeMissionEditor | mission editor | user workflow | KEEP_E2E |
| Three Mission Editor Supports Canonical Terrain and Mission Object Editing | tests/e2e/three_r2b_mission_editor.spec.js | threeMissionEditor | mission editor | canonical contract | MERGE_E2E |
| Three Mission Editor Preserves Continuous and Legacy Cell Coordinates | tests/e2e/three_r2b_mission_editor.spec.js | threeMissionEditor | mission editor | user workflow | DEFER_REVIEW |
| Three Mission Editor Export Reimport Roundtrip Is Lossless | tests/e2e/three_r2b_mission_editor.spec.js | threeMissionEditor | mission editor | user workflow | KEEP_E2E |
| Three Mission Editor Preview Uses Production Mission Lifecycle | tests/e2e/three_r2b_mission_editor.spec.js | threeMissionEditor | mission editor | user workflow | KEEP_E2E |
| Three Mission Editor Validation Blocks Invalid Export and Preview | tests/e2e/three_r2b_mission_editor.spec.js | threeMissionEditor | mission editor | user workflow | KEEP_E2E |
| Three Mission Editor Resources Dispose Across Scene Transitions | tests/e2e/three_r2b_mission_editor.spec.js | threeMissionEditor | mission editor | user workflow | MERGE_E2E |
| Production Mission Routes Do Not Instantiate Legacy Phaser World Renderers | tests/e2e/three_r2b_mission_editor.spec.js | threeMissionEditor | application workflow | user workflow | DEFER_REVIEW |
| Browser and Headless Validate Edited Mission Identically | tests/e2e/three_r2b_mission_editor.spec.js | threeMissionEditor | application workflow | canonical contract | MERGE_E2E |
| THREE-R3A Current Shell Visual and Route Baseline | tests/e2e/three_r3a_current_shell_baseline.spec.js | productionShellR3A | currents | user workflow | MERGE_E2E |
| THREE-R3A Full Headed Phaser-Free Production Shell Walkthrough | tests/e2e/three_r3a_headed_acceptance.spec.js | visualAcceptance | application workflow | user workflow | MOVE_TO_VISUAL_ACCEPTANCE |
| Next Shell Product Hub Preserves Production Content and Styling | tests/e2e/three_r3a_production_shell.spec.js | productionShellR3A | application workflow | user workflow | KEEP_E2E |
| Next Shell Preserves Setup Briefing Planning Simulation and Debrief | tests/e2e/three_r3a_production_shell.spec.js | productionShellR3A | replay/debrief | user workflow | KEEP_E2E |
| Next Shell Reuses Canonical Three Replay and Mission Editor | tests/e2e/three_r3a_production_shell.spec.js | productionShellR3A | replay/debrief | canonical contract | MERGE_E2E |
| Next Shell Route Transitions Dispose Previous View | tests/e2e/three_r3a_production_shell.spec.js | productionShellR3A | application workflow | user workflow | MERGE_E2E |
| Next Shell Import Export and Headless Viewer Preserve Tool Behavior | tests/e2e/three_r3a_production_shell.spec.js | productionShellR3A | application workflow | canonical contract | MERGE_E2E |
| Next Shell Supports Keyboard Route and Mission Control | tests/e2e/three_r3a_production_shell.spec.js | productionShellR3A | application workflow | browser UI behavior | KEEP_E2E |
| Next Shell Honors Reduced Motion Without Changing Mission Outcomes | tests/e2e/three_r3a_production_shell.spec.js | productionShellR3A | application workflow | user workflow | MERGE_E2E |
| Next Shell Runs From GitHub Pages Subpath Without Phaser | tests/e2e/three_r3a_production_shell.spec.js | productionShellR3A | static hosting | static-host compatibility | KEEP_E2E |
| Next Shell Loads Legacy Learning Lab Only On Demand | tests/e2e/three_r3a_production_shell.spec.js | productionShellR3A | learning lab | user workflow | DEFER_REVIEW |
| Three Simulation Uses Incremental Presentation Updates | tests/e2e/environment_rendering.spec.js | executionWaterColumn | application workflow | user workflow | MERGE_E2E |
| Finish Instantly Avoids Per-Step Three Rebuilds | tests/e2e/environment_rendering.spec.js | executionWaterColumn | application workflow | user workflow | MERGE_E2E |
| Three Quality Profiles Preserve Canonical Simulation Result | tests/e2e/environment_rendering.spec.js | executionWaterColumn | application workflow | canonical contract | MERGE_E2E |
| Three Context Slabs Reduce Cost Without Losing Dive Context | tests/e2e/environment_rendering.spec.js | executionWaterColumn | planning/dive profile | user workflow | MERGE_E2E |
| Three Mission Uses Continuous Bathymetric Terrain | tests/e2e/environment_rendering.spec.js | executionWaterColumn | bathymetry/terrain | user workflow | MERGE_E2E |
| Three Terrain Camera Gestures Do Not Rebuild Bathymetry Mesh | tests/e2e/environment_rendering.spec.js | executionWaterColumn | bathymetry/terrain | user workflow | MERGE_E2E |
| Bathymetry Limits Predicted and Realized Dive Depth | tests/e2e/environment_rendering.spec.js | executionWaterColumn | bathymetry/terrain | user workflow | KEEP_E2E |
| Continuous Coastline Blocks Invalid Surface Waypoints | tests/e2e/environment_rendering.spec.js | executionWaterColumn | planning/dive profile | user workflow | MERGE_E2E |
| Water-Column Layers Respect Continuous Seabed | tests/e2e/environment_rendering.spec.js | executionWaterColumn | bathymetry/terrain | user workflow | MERGE_E2E |
| Bathymetric Demo and Mission Renderer Share Terrain Geometry | tests/e2e/environment_rendering.spec.js | executionWaterColumn | bathymetry/terrain | user workflow | MERGE_E2E |
| All Production Mission Phases Share One Bathymetry Contract | tests/e2e/environment_rendering.spec.js | executionWaterColumn | bathymetry/terrain | user workflow | MERGE_E2E |
| Three Bathymetry Resources Dispose Across Scene Transitions | tests/e2e/environment_rendering.spec.js | executionWaterColumn | bathymetry/terrain | user workflow | MERGE_E2E |
| Three Bathymetric Terrain Preserves Render-Cost Gate | tests/e2e/environment_rendering.spec.js | executionWaterColumn | bathymetry/terrain | user workflow | MERGE_E2E |
| Three Camera Remains Responsive Under Live Simulation Load | tests/e2e/environment_rendering.spec.js | executionWaterColumn | application workflow | user workflow | MERGE_E2E |
| Segment Distance Changes Predicted Dive Geometry | tests/e2e/environment_rendering.spec.js | threePlanning | planning/dive profile | user workflow | MERGE_E2E |
| Predicted and Realized Dive Paths Remain Distinct | tests/e2e/environment_rendering.spec.js | threePlanning | planning/dive profile | user workflow | MERGE_E2E |
| Bathymetry Demo and Mission Dive Paths Share Coordinates | tests/e2e/environment_rendering.spec.js | threePlanning | bathymetry/terrain | user workflow | MERGE_E2E |
| Continuous Mission Planning Starts Without Overlay Errors | tests/e2e/mission_planning.spec.js | threePlanning | application workflow | user workflow | KEEP_E2E |
| Continuous Mission Controls Are Visible and Functional | tests/e2e/mission_planning.spec.js | threePlanning | application workflow | browser UI behavior | KEEP_E2E |
| Continuous Mission Plan Executes Through Canonical 3D Dive | tests/e2e/mission_planning.spec.js | threePlanning | planning/dive profile | canonical contract | KEEP_E2E |
| Surface Waypoints Produce a Predicted Three-Dimensional Dive | tests/e2e/mission_planning.spec.js | threePlanning | planning/dive profile | user workflow | KEEP_E2E |
| Three Camera Reveals Full Water-Column Dive | tests/e2e/mission_planning.spec.js | threePlanning | planning/dive profile | user workflow | MERGE_E2E |
| Surface Waypoints and Sampling Targets Have Distinct Semantics | tests/e2e/mission_planning.spec.js | threePlanning | planning/dive profile | user workflow | MERGE_E2E |
| Sampling Target Drives Predicted Dive Without Becoming a Navigation Point | tests/e2e/mission_planning.spec.js | threePlanning | planning/dive profile | user workflow | KEEP_E2E |
| Predicted Multi-Yo Profile Executes Through Canonical Simulation | tests/e2e/mission_planning.spec.js | threePlanning | application workflow | canonical contract | KEEP_E2E |
| Three Camera Interaction Does Not Rebuild Mission Models | tests/e2e/mission_planning.spec.js | threePlanning | application workflow | user workflow | MERGE_E2E |
| Three Mission Renderer Resources Remain Stable | tests/e2e/mission_planning.spec.js | threePlanning | application workflow | user workflow | MERGE_E2E |
| Three Mission Interaction Performance Invariants | tests/e2e/mission_planning.spec.js | threePlanning | application workflow | user workflow | MERGE_E2E |
| Three Sampling Target and Dive Planning Headed Workflow | tests/e2e/mission_planning.spec.js | threePlanning | planning/dive profile | user workflow | MERGE_E2E |
| learning labs static page is linked from the main menu | tests/e2e/product_hub_and_labs.spec.js | coreMission | learning lab | user workflow | KEEP_E2E |
| Benchmark modes overview opens from Simulation Lab | tests/e2e/product_hub_and_labs.spec.js | coreMission | learning lab | user workflow | KEEP_E2E |
| Motion Planning Demo opens from Simulation Lab and preserves benchmark/headless routes | tests/e2e/product_hub_and_labs.spec.js | coreMission | learning lab | canonical contract | MERGE_E2E |
| Bathymetric World View opens from Simulation Lab and preserves adjacent routes | tests/e2e/product_hub_and_labs.spec.js | coreMission | learning lab | user workflow | MERGE_E2E |
| Renderer Architecture Preview opens from Simulation Lab | tests/e2e/product_hub_and_labs.spec.js | coreMission | learning lab | user workflow | MERGE_E2E |
| Headless Bundle Viewer opens from Simulation Lab and exports browser summary | tests/e2e/product_hub_and_labs.spec.js | coreMission | learning lab | canonical contract | KEEP_E2E |
| Planner Benchmark debrief exports benchmark records from synthetic result | tests/e2e/product_hub_and_labs.spec.js | coreMission | replay/debrief | user workflow | KEEP_E2E |
| Adaptive Benchmark synthetic debrief shows surfacing review and exports P8 session records | tests/e2e/product_hub_and_labs.spec.js | coreMission | replay/debrief | user workflow | MERGE_E2E |
| campaign planning smoke flow reaches debrief | tests/e2e/product_hub_and_labs.spec.js | coreMission | replay/debrief | user workflow | MERGE_E2E |
| Execute Mission Through Three Simulation | tests/e2e/simulation_and_terrain.spec.js | executionWaterColumn | application workflow | user workflow | KEEP_E2E |
| Three Volumetric Water Column Planning | tests/e2e/simulation_and_terrain.spec.js | executionWaterColumn | planning/dive profile | user workflow | MERGE_E2E |
| Three Depth-Aware Dive and Sampling | tests/e2e/simulation_and_terrain.spec.js | executionWaterColumn | planning/dive profile | user workflow | KEEP_E2E |
| Three Mission Scene Isolation | tests/e2e/simulation_and_terrain.spec.js | executionWaterColumn | application workflow | user workflow | MERGE_E2E |
| Three Scene Cleanup Is Null-Safe and Idempotent | tests/e2e/simulation_and_terrain.spec.js | executionWaterColumn | application workflow | user workflow | MERGE_E2E |
| Generated Mission Opens a Visible Volumetric Water Column | tests/e2e/simulation_and_terrain.spec.js | executionWaterColumn | planning/dive profile | browser UI behavior | MERGE_E2E |
| Legacy Mission Uses Explicit Surface Compatibility Mode | tests/e2e/simulation_and_terrain.spec.js | executionWaterColumn | application workflow | user workflow | DEFER_REVIEW |
| Three Vehicle Pose Guidance and Grid Alignment | tests/e2e/simulation_and_terrain.spec.js | executionWaterColumn | application workflow | user workflow | MERGE_E2E |
| Three Waypoint Validation and Mission Window Semantics | tests/e2e/simulation_and_terrain.spec.js | executionWaterColumn | planning/dive profile | user workflow | MERGE_E2E |
| Terrain-Aware Placement Preview Prevents Invalid Mission Mutation | tests/e2e/simulation_and_terrain.spec.js | executionWaterColumn | bathymetry/terrain | user workflow | MERGE_E2E |
| Continuous Route Validation Detects Coastline and Clearance Risks | tests/e2e/simulation_and_terrain.spec.js | executionWaterColumn | application workflow | user workflow | MERGE_E2E |
| Sampling Targets Respect Canonical Seabed and Reachability | tests/e2e/simulation_and_terrain.spec.js | executionWaterColumn | bathymetry/terrain | canonical contract | MERGE_E2E |
| Mission Readiness Separates Errors Warnings and Advisories | tests/e2e/simulation_and_terrain.spec.js | executionWaterColumn | application workflow | user workflow | MERGE_E2E |
| Planned and Realized Paths Share Terrain Validation | tests/e2e/simulation_and_terrain.spec.js | executionWaterColumn | bathymetry/terrain | user workflow | MERGE_E2E |
| Terrain Validation Persists Through Export Headless and Replay | tests/e2e/simulation_and_terrain.spec.js | executionWaterColumn | replay/debrief | canonical contract | MERGE_E2E |
| Three Terrain Presentation Clearly Distinguishes Mission Semantics | tests/e2e/simulation_and_terrain.spec.js | executionWaterColumn | bathymetry/terrain | user workflow | MERGE_E2E |
| Legacy and Three Simulation Produce Identical Canonical Result | tests/e2e/simulation_and_terrain.spec.js | executionWaterColumn | application workflow | canonical contract | DEFER_REVIEW |
| legacy saved level registry scene still opens | tests/e2e/simulation_and_terrain.spec.js | executionWaterColumn | application workflow | user workflow | DEFER_REVIEW |
| Three Mission Workspace Stabilization | tests/e2e/workspace_and_challenge_setup.spec.js | workspaceScenario | application workflow | user workflow | MERGE_E2E |
| Three Mission renderer preserves live Mission Planning state | tests/e2e/workspace_and_challenge_setup.spec.js | workspaceScenario | application workflow | user workflow | MERGE_E2E |
| Three Planning Pointer Interaction dispatches canonical workspace commands | tests/e2e/workspace_and_challenge_setup.spec.js | workspaceScenario | application workflow | canonical contract | KEEP_E2E |
| Three Waypoint Pipeline and Standard Camera Gestures | tests/e2e/workspace_and_challenge_setup.spec.js | workspaceScenario | planning/dive profile | user workflow | KEEP_E2E |
| Three Mission Planning Tools and Camera Controls | tests/e2e/workspace_and_challenge_setup.spec.js | workspaceScenario | application workflow | browser UI behavior | MERGE_E2E |
| Three Simulation Selection inspects canonical public simulation objects | tests/e2e/workspace_and_challenge_setup.spec.js | workspaceScenario | application workflow | canonical contract | MERGE_E2E |
| scenario setup stays inside the center viewport | tests/e2e/workspace_and_challenge_setup.spec.js | workspaceScenario | application workflow | user workflow | MERGE_E2E |
| challenge setup uses left navigator and selected briefing | tests/e2e/workspace_and_challenge_setup.spec.js | workspaceScenario | application workflow | user workflow | KEEP_E2E |
| level generator opens from main menu | tests/e2e/workspace_and_challenge_setup.spec.js | workspaceScenario | application workflow | user workflow | MERGE_E2E |
| deterministic challenge generates a fresh perfect-knowledge level | tests/e2e/workspace_and_challenge_setup.spec.js | workspaceScenario | application workflow | user workflow | KEEP_E2E |
| load level json imports a level and offers play/edit actions | tests/e2e/workspace_and_challenge_setup.spec.js | workspaceScenario | application workflow | user workflow | MERGE_E2E |
| stochastic mode exposes ensemble and risk controls | tests/e2e/workspace_and_challenge_setup.spec.js | workspaceScenario | application workflow | browser UI behavior | KEEP_E2E |
