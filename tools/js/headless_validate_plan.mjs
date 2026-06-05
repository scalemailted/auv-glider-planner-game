#!/usr/bin/env node
import fs from 'node:fs';
import { readHeadlessSolverPacket } from '../../src/core/headless/SolverPacketReader.js';
import { buildHeadlessPlanningWorld } from '../../src/core/headless/HeadlessPlanningWorld.js';
import { validatePlanForExecution } from '../../src/core/planning/PlanExecutionValidator.js';

const [packetPath, planPath] = process.argv.slice(2);
if (!packetPath || !planPath) {
  console.error('Usage: node tools/js/headless_validate_plan.mjs anchor.solver-packet.json anchor.plan.json');
  process.exit(2);
}

const packet = JSON.parse(fs.readFileSync(packetPath, 'utf8'));
const plan = JSON.parse(fs.readFileSync(planPath, 'utf8'));
if (packet.type !== 'anchor.solverPacket') {
  console.error('First argument must be an anchor.solverPacket JSON file.');
  process.exit(2);
}
const context = readHeadlessSolverPacket(packet, { oracle: process.argv.includes('--oracle') });
const world = buildHeadlessPlanningWorld(context);

const validation = validatePlanForExecution({
  level: makeValidationLevel(packet.level, world),
  mission: packet.mission,
  plan
});

if (!validation.ok) {
  console.error('Plan invalid.');
  for (const diagnostic of validation.diagnostics ?? []) {
    if (diagnostic.severity !== 'blocking') continue;
    console.error('');
    console.error(`[${diagnostic.severity}] ${diagnostic.agentId ?? 'agent'} ${diagnostic.segment?.fromWaypointLabel ?? 'start'} -> ${diagnostic.segment?.toWaypointLabel ?? 'waypoint'}`);
    console.error(`Category: ${diagnostic.category}`);
    if (diagnostic.blocking?.blockedCell) {
      console.error(`Blocked cell: (${diagnostic.blocking.blockedCell.x}, ${diagnostic.blocking.blockedCell.y})`);
    }
    console.error(`Fix: ${diagnostic.fixHint}`);
  }
}

console.log(JSON.stringify({
  ok: validation.ok,
  errors: validation.errors,
  warnings: validation.warnings,
  routeIssueCount: validation.routeAudit?.issueCount ?? 0,
  diagnostics: validation.diagnostics ?? [],
  solverFeedback: validation.solverFeedback ?? null
}, null, 2));
process.exit(validation.ok ? 0 : 1);

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
