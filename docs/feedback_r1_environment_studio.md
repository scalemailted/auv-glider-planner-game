# ENV-STUDIO-R0 Feedback Response

ENV-STUDIO-R0 converts Alpha tester feedback about environment creation into a staged, reproducible Environment Studio plan. It is a requirements, contract, and thin-slice planning pass. It does not change simulation, scoring, current generation, scalar generation, generated mission semantics, or existing Alpha workflows.

## Feedback Classification

The feedback is not a P0/P1 release blocker for the current Alpha because the Guided Mission, benchmark, solver-packet, Colab, Methods & Validation, and diagnostic workflows still operate on the curated deterministic environments.

It is classified as:

| Tag | Classification | Reason |
| --- | --- | --- |
| `P2` | Significant workflow gap | Testers need a clearer way to create and reproduce custom synthetic environments without editing code or JSON by hand. |
| `BENCH` | Benchmark artifact concern | External planners and classroom studies need stable environment identities, digests, and validation reports. |
| `EDU` | Teaching concern | Learners need to see how domain size, bathymetry, currents, scalar layers, and validation fit together. |
| `SCI` | Scientific assumption concern | Authored environments need explicit synthetic/not-calibrated boundaries and reproducible component provenance. |

## Product Decision

The product should have one unified **Environment Studio**, not separate editors for bathymetry, currents, scalar fields, and mission scenarios.

Placement:

```text
Product Hub -> Simulation Lab -> Environment Studio
```

Environment Studio should not become a fifth Product Hub pillar. The four Alpha pillars remain stable.

## What R0 Implements

R0 adds a pure contract layer and a focused Node smoke:

- normalized domain specs with rows/columns derived from physical size and resolution;
- browser-friendly cell-count limits;
- bathymetry archetype specs;
- bathymetry tile manifests;
- edge profile validation;
- mosaic manifests;
- seam validation helpers;
- edit provenance;
- dependency graph states;
- validation report digests;
- hidden-truth rejection;
- codec-friendly canonical JSON checks.

Implementation entry points:

- `src/core/editor/EnvironmentStudioContracts.js`
- `tools/js/smoke_environment_studio_contracts.mjs`

## What R0 Does Not Implement

R0 intentionally does not:

- add a visible Environment Studio route;
- add freeform terrain sculpting;
- regenerate currents or scalar fields from edited bathymetry;
- modify generated environment equations;
- change official scoring;
- change mission generation semantics;
- expose hidden truth;
- add WebGPU, NetCDF, backend services, or ML workflows;
- create multiple editor apps.

## R1 Thin Slice

Recommended next phase:

```text
ENV-STUDIO-R1 - Unified Environment Studio Browser Thin Slice
```

Scope:

1. Add one Simulation Lab entry: `Environment Studio`.
2. Show a domain setup panel with width, height, resolution, depth layers, and time span.
3. Show a deterministic bathymetry archetype selector using the R0 contract.
4. Show a tile/mosaic preview as a low-risk read-only or limited-edit surface.
5. Export and import Environment Studio JSON artifacts with canonical digests.
6. Show the validation report and dependency graph state.
7. Do not run missions from edited environments until validation passes and R1 explicitly maps the Studio artifact into existing environment loaders.

R1 should still avoid changing simulation, scoring, and scientific equations. It should focus on making the contract visible and round-trippable in the browser.
