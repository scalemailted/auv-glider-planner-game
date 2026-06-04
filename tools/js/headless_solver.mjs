#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import { readHeadlessSolverPacket, summarizeHeadlessPacket } from '../../src/core/headless/SolverPacketReader.js';
import { buildHeadlessPlanningWorld, solveGreedyHeadlessPlan } from '../../src/core/headless/HeadlessPlanningWorld.js';
import { buildHeadlessPlan, sanityCheckHeadlessPlan } from '../../src/core/headless/HeadlessPlanExporter.js';
import { validatePlanForExecution } from '../../src/core/planning/PlanExecutionValidator.js';

const args = parseArgs(process.argv.slice(2));
if (!args.input || !args.output) {
  usage();
  process.exit(2);
}
if (args.planner !== 'greedy') {
  console.error(`Unsupported planner "${args.planner}". Only "greedy" is currently implemented.`);
  process.exit(2);
}

const packet = JSON.parse(fs.readFileSync(args.input, 'utf8'));
const context = readHeadlessSolverPacket(packet, { oracle: args.oracle });
const world = buildHeadlessPlanningWorld(context);
const agentPlans = solveGreedyHeadlessPlan(world, { maxWaypoints: args.maxWaypoints });
let plan = buildHeadlessPlan(packet, agentPlans, {
  plannerLabel: args.oracle ? 'node-headless-greedy-oracle-v1' : 'node-headless-greedy-v1',
  oracle: args.oracle
});

const sanity = sanityCheckHeadlessPlan(plan, world);
const validationLevel = makeValidationLevel(packet.level, world);
const validation = validatePlanForExecution({ level: validationLevel, mission: packet.mission, plan });
plan = buildHeadlessPlan(packet, agentPlans, {
  plannerLabel: args.oracle ? 'node-headless-greedy-oracle-v1' : 'node-headless-greedy-v1',
  oracle: args.oracle,
  validation
});

fs.mkdirSync(path.dirname(path.resolve(args.output)), { recursive: true });
fs.writeFileSync(args.output, `${JSON.stringify(plan, null, 2)}\n`, 'utf8');

const waypointCount = plan.agentPlans.reduce((sum, agentPlan) => sum + (agentPlan.waypoints?.length ?? 0), 0);
console.log(`Wrote ${args.output} with ${waypointCount} waypoint(s).`);
if (args.debug) {
  console.log(JSON.stringify({
    packet: summarizeHeadlessPacket(context),
    sanity,
    validation: {
      ok: validation.ok,
      errors: validation.errors,
      warnings: validation.warnings
    }
  }, null, 2));
}
if (!sanity.ok || !validation.ok) {
  console.warn('Headless checks found issues. ANCHOR browser import/Play validation remains authoritative.');
  for (const error of [...sanity.errors, ...validation.errors]) console.warn(`- ${error}`);
}

function parseArgs(argv) {
  const parsed = {
    input: null,
    output: null,
    planner: 'greedy',
    debug: false,
    oracle: false,
    maxWaypoints: 4
  };
  const positional = [];
  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];
    if (arg === '--debug') parsed.debug = true;
    else if (arg === '--oracle') parsed.oracle = true;
    else if (arg === '--planner') parsed.planner = argv[++index] ?? parsed.planner;
    else if (arg === '--max-waypoints') parsed.maxWaypoints = Math.max(0, Number(argv[++index] ?? parsed.maxWaypoints) || parsed.maxWaypoints);
    else positional.push(arg);
  }
  [parsed.input, parsed.output] = positional;
  return parsed;
}

function usage() {
  console.error('Usage: node tools/js/headless_solver.mjs anchor.solver-packet.json anchor.plan.json [--planner greedy] [--debug] [--oracle]');
}

function makeValidationLevel(level, world) {
  if (level?.layers?.truth?.frames?.length) return level;
  return {
    ...level,
    layers: {
      ...(level?.layers ?? {}),
      truth: {
        frames: world.frame ? [{
          t: Number(world.frame.t ?? 0),
          current: world.frame.current ?? world.current ?? [],
          roi: world.frame.roi ?? world.roi ?? []
        }] : []
      }
    }
  };
}
