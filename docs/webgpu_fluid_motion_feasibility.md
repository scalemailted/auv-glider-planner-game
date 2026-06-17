# WebGPU Fluid Motion Feasibility

WebGPU-Ocean-style work is useful inspiration for future ANCHOR fluid-coupled motion experiments. Real-time browser fluid visualization, MLS-MPM, SPH, and screen-space fluid rendering could help explain currents, shear, obstacles, and vehicle/environment coupling in a richer sandbox.

MOTION-R1 deliberately does not integrate WebGPU. ANCHOR first needs a deterministic, portable motion state/control contract that runs in the browser and in Node/OceanBox-JS with repeatable JSON/CSV artifacts. Benchmark scoring, replay, solver-packet roundtrips, and classroom analysis must remain headless-compatible and not depend on GPU availability.

A future WebGPU fluid layer should be a progressive enhancement and environment provider:

```text
velocity / force provider -> MotionEnvironmentSampler -> GliderDynamicsModel -> realized trajectory
```

It should not replace the glider state model, route authority model, solver-packet schema, or Node/headless replay. Feature detection and fallback are required: browsers without WebGPU must still run the deterministic JS motion model.

Non-goals for this phase: no WebGPU dependency, no TypeScript/Vite migration, no benchmark scoring authority, no calibrated ocean model claim, no Python simulator, and no MARL/RL implementation.
