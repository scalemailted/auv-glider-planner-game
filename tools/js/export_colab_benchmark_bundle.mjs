#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';

import {
  buildClassicalPlannerBenchmarkBundleFromSolverPacket,
  validateClassicalPlannerBenchmarkBundle
} from '../../src/core/io/ClassicalPlannerBenchmarkBundleExporter.js';
import { encodeArtifact } from '../../packages/codecs/src/index.js';

const root = process.cwd();

try {
  const args = parseArgs(process.argv.slice(2));
  if (args.help) {
    printUsage();
    process.exit(0);
  }
  if (args.allFixtures) {
    exportAllFixtures(args);
  } else {
    if (!args.solverPacket || !args.out) {
      printUsage();
      process.exit(2);
    }
    exportOne(args.solverPacket, args.out, args);
  }
} catch (error) {
  console.error(JSON.stringify({ ok: false, error: error?.message ?? String(error) }, null, 2));
  process.exit(1);
}

function exportAllFixtures(args) {
  const manifestPath = path.resolve(root, args.manifest ?? 'tests/fixtures/colab_benchmark/manifest.json');
  const manifest = readJson(manifestPath);
  const outDir = path.resolve(root, args.outDir ?? 'tests/fixtures/colab_benchmark/bundles');
  fs.mkdirSync(outDir, { recursive: true });
  const exported = [];
  for (const fixture of manifest.fixtures ?? []) {
    const packetPath = path.resolve(root, fixture.path);
    const outPath = path.join(outDir, `${fixture.fixtureId}.classical-planner-benchmark-bundle.json`);
    const record = exportOne(packetPath, outPath, { ...args, bundleId: `${fixture.fixtureId}-public-4d` });
    exported.push({ fixtureId: fixture.fixtureId, path: path.relative(root, outPath).replaceAll('\\', '/'), ...record });
  }
  const updatedManifest = {
    ...manifest,
    phase: 'COLAB-BENCH-R1.1',
    benchmarkBundles: exported.map(({ fixtureId, path, payloadDigest, publicProjectionDigest, solverPacketDigest }) => ({
      fixtureId,
      path,
      payloadDigest,
      publicProjectionDigest,
      solverPacketDigest,
      hiddenTruthIncluded: false
    }))
  };
  writeJson(manifestPath, updatedManifest);
  console.log(JSON.stringify({ ok: true, exported, manifestPath: path.relative(root, manifestPath).replaceAll('\\', '/') }, null, 2));
}

function exportOne(packetPath, outPath, args = {}) {
  const packet = readJson(path.resolve(root, packetPath));
  const bundle = buildClassicalPlannerBenchmarkBundleFromSolverPacket(packet, {
    bundleId: args.bundleId,
    createdAt: args.createdAt ?? '2026-06-25T00:00:00.000Z'
  });
  const validation = validateClassicalPlannerBenchmarkBundle(bundle);
  if (validation.status === 'FAIL') {
    throw new Error(`Benchmark bundle validation failed: ${validation.failures.join('; ')}`);
  }
  const encoded = encodeArtifact('classicalPlannerBenchmarkBundle', bundle, {
    pretty: true,
    trailingNewline: true,
    visibilityClass: 'PUBLIC',
    fairnessClass: 'FORECAST_ONLY'
  });
  const output = path.resolve(root, outPath);
  fs.mkdirSync(path.dirname(output), { recursive: true });
  fs.writeFileSync(output, encoded.text, 'utf8');
  const writtenBundle = JSON.parse(encoded.text);
  const writtenValidation = validateClassicalPlannerBenchmarkBundle(writtenBundle);
  const record = {
    status: writtenValidation.status,
    warningCount: writtenValidation.warnings.length,
    payloadDigest: writtenBundle.payloadDigest,
    publicProjectionDigest: writtenBundle.publicProjectionDigest,
    solverPacketDigest: writtenBundle.solverPacketDigest,
    outputPath: path.relative(root, output).replaceAll('\\', '/')
  };
  if (!args.allFixtures) console.log(JSON.stringify({ ok: true, ...record }, null, 2));
  return record;
}

function parseArgs(argv) {
  const args = {};
  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];
    if (arg === '--help' || arg === '-h') args.help = true;
    else if (arg === '--all-fixtures') args.allFixtures = true;
    else if (arg === '--solver-packet') args.solverPacket = argv[++index];
    else if (arg === '--out') args.out = argv[++index];
    else if (arg === '--out-dir') args.outDir = argv[++index];
    else if (arg === '--manifest') args.manifest = argv[++index];
    else if (arg === '--created-at') args.createdAt = argv[++index];
    else if (arg === '--bundle-id') args.bundleId = argv[++index];
    else throw new Error(`Unknown argument: ${arg}`);
  }
  return args;
}

function readJson(filePath) {
  return JSON.parse(fs.readFileSync(filePath, 'utf8'));
}

function writeJson(filePath, value) {
  fs.writeFileSync(filePath, `${JSON.stringify(value, null, 2)}\n`, 'utf8');
}

function printUsage() {
  console.log(`Usage:
  node tools/js/export_colab_benchmark_bundle.mjs --all-fixtures
  node tools/js/export_colab_benchmark_bundle.mjs --solver-packet tests/fixtures/colab_benchmark/static_additive_routing_solver_packet.json --out tests/fixtures/colab_benchmark/bundles/static_additive_routing.classical-planner-benchmark-bundle.json

Exports public forecast-only anchor.classical-planner-benchmark-bundle artifacts for Python/Colab inspection.
The exporter does not expose hidden truth and does not run simulation or scoring.`);
}
