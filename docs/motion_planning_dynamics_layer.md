# Motion Planning Dynamics Layer

MOTION-R1 adds a deterministic glider motion-dynamics layer and a Simulation Lab sandbox. Motion planning is an execution model, not a fourth top-level authority mode. Planner Benchmark, Adaptive Benchmark, and Full Autonomy Benchmark remain the authority modes.

Path planning chooses waypoint intent. Motion planning evaluates how the glider actually moves through currents, depth-layer choices, bathymetry/constraints, heading-rate limits, energy limits, and sampling intervals. The player or solver still chooses or imports a plan; the motion layer converts that plan to controls and simulates the realized trajectory.

## Core Objects

- Motion state: `anchor.motion.glider-state` stores glider id, time, x/y/z, depth layer, heading, speed through water, pitch, vertical speed, energy remaining, battery fraction, last control mode, and warnings.
- Control command: `anchor.motion.control-command` stores waypoint-tracking or heading/dive/sampling intent such as target waypoint, desired heading, speed through water, target depth layer, sampling flag, and surfacing request.
- Environment sample: `anchor.motion.environment-sample` samples public current vectors `F_u/F_v/F_w` where available, hazard, constraint mask, bathymetry clearance, and water-column layer metadata.
- Motion trajectory: `anchor.motion.trajectory` records planned waypoints, control commands, realized track, sampled observations, planned-vs-realized metrics, diagnostics, energy summary, and warnings.

## Diagnostics

MOTION-R1 reports planned distance, realized distance, final/mean/max track error, drift distance, current assist/opposition, cross-current, energy used, constraint and bottom-clearance warnings, sample coverage, and arrival status. Sampling happens along the realized trajectory, not the dashed planned line.

The diagnostics are educational execution diagnostics. They do not redesign Challenge Mode scoring, do not replace browser official scoring, and do not add a new planner.

## Headless And Bundle Support

Node/OceanBox-JS remains the canonical non-browser runtime. Motion-aware headless execution is optional via runtime config or CLI flags. When enabled, episodes and public bundles can include `motion_trajectory.json`, `control_trace.json`, `motion_diagnostics.json`, plus combined-bundle `motionTrajectory`, `controlTrace`, and `motionDiagnostics` fields. Public motion trajectory exports redact hidden-truth field identifiers and truth values.

Solver-packet roundtrips can accept old plans or plans with optional motion intent such as `desiredSpeedThroughWater`, `diveProfileId`, `sampleIntervalSeconds`, and `surfaceAtEnd`. Roundtrip reports may include `motionSummary`, `plannedVsRealized`, `motionDiagnostics`, and `motionModelId` while preserving `usesNewPlanner: false`, `usesWebGPUFluid: false`, and `usesMARL: false`.

## Motion Planning Demo

Simulation Lab now includes Motion Planning Demo. It shows a fixed waypoint route as intent, a realized trajectory under currents/control limits, sampled points, current vectors, dive-profile controls, energy, drift, and track-error summaries. It is a sandbox for teaching and debugging execution fidelity, not a separate final game mode.

## Boundaries

MOTION-R1 does not implement WebGPU, WebGPU-Ocean, full 3D vehicle dynamics, production hydrodynamics, calibrated ocean physics, A*/Dijkstra/RRT/MPC/RL/MARL, Python simulation, backend services, or benchmark scoring authority. WebGPU fluid coupling is a future optional provider that must plug into the environment-sampler interface without replacing deterministic Node/headless replay.
