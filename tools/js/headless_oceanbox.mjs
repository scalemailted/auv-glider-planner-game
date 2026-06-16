import { runHeadlessMission } from '../../src/core/headless/runtime/HeadlessMissionRunner.js';
import { createDefaultHeadlessRuntimeConfig, headlessRuntimeConfigSummary } from '../../src/core/headless/runtime/HeadlessRuntimeConfig.js';
import { writeHeadlessBundle } from '../../src/core/headless/runtime/HeadlessBundleWriter.js';
import { headlessScoreReportSummary } from '../../src/core/headless/runtime/HeadlessScoring.js';

const args = parseArgs(process.argv.slice(2));

try {
  if (args.command !== 'simulate') {
    printUsage();
    process.exit(args.command ? 1 : 0);
  }
  const config = createDefaultHeadlessRuntimeConfig({
    seed: args.seed ?? 'demo-001',
    width: args.width,
    height: args.height,
    scenario: args.scenario ?? 'coastalBloomFront'
  });
  const episode = runHeadlessMission(config);
  let bundleSummary = null;
  if (!args.summaryOnly) {
    const outputDir = args.out ?? 'tmp/oceanbox-js-demo';
    bundleSummary = writeHeadlessBundle(episode, outputDir, { includeHiddenTruth: !args.noHiddenExport, combinedJson: args.combinedJson });
  }
  const summary = {
    command: 'simulate',
    ok: true,
    config: headlessRuntimeConfigSummary(config),
    episodeId: episode.episodeId,
    seed: episode.seed,
    finalScore: episode.scoreReport.finalScore,
    observationCount: episode.observations.length,
    trackPointCount: episode.tracks.length,
    score: headlessScoreReportSummary(episode.scoreReport),
    bundle: bundleSummary,
    combinedBundle: bundleSummary?.combinedBundle === true,
    boundary: 'Node headless runtime over portable ANCHOR core logic. Browser ANCHOR remains the official visual referee and scoring UI.'
  };
  console.log(JSON.stringify(summary, null, 2));
} catch (error) {
  console.error(JSON.stringify({ ok: false, error: error?.message ?? String(error) }, null, 2));
  process.exit(1);
}

function parseArgs(argv) {
  const result = { command: argv[0] ?? null };
  for (let index = 1; index < argv.length; index += 1) {
    const arg = argv[index];
    if (arg === '--seed') result.seed = argv[++index];
    else if (arg === '--out') result.out = argv[++index];
    else if (arg === '--width') result.width = Number(argv[++index]);
    else if (arg === '--height') result.height = Number(argv[++index]);
    else if (arg === '--scenario') result.scenario = argv[++index];
    else if (arg === '--no-hidden-export') result.noHiddenExport = true;
    else if (arg === '--combined-json') result.combinedJson = true;
    else if (arg === '--summary-only') result.summaryOnly = true;
    else if (arg === '--help' || arg === '-h') result.command = null;
    else throw new Error(`Unknown option ${arg}`);
  }
  return result;
}

function printUsage() {
  console.log('Usage: node tools/js/headless_oceanbox.mjs simulate --seed demo-001 --out tmp/oceanbox-js-demo [--width 32] [--height 24] [--scenario coastal_bloom_front] [--no-hidden-export] [--combined-json] [--summary-only]');
}
