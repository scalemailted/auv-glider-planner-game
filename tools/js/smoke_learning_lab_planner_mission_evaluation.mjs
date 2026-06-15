import fs from 'node:fs/promises';
import path from 'node:path';

const ROOT = process.cwd();
const articlePath = 'labs/planner-mission-evaluation.html';
const cssPath = 'css/labs.css';
const widgetPath = 'src/labs/widgets/PlannerLearningWidgets.js';

const article = await read(articlePath);
const css = await read(cssPath);
const widgetSource = await read(widgetPath);

[
  'Planner / Mission Evaluation',
  'From fields to routes',
  'What is a waypoint plan?',
  'Reward, cost, risk, and constraints',
  'Reachability and timing',
  'Flow-aware planning',
  'Greedy planning as a baseline',
  'Coverage, boundary, and revisit strategies',
  'Uncertainty-aware sampling',
  'Forecast validation vs hidden-event follow-up',
  'Oracle vs belief planners',
  'Regret and missed opportunity',
  'Surfacing, updates, and replanning',
  'Multi-agent planning',
  'Simulation is the referee',
  'Debrief and mission evaluation',
  'Solver workflow and fairness labels',
  'Example mission strategies'
].forEach((needle) => assertIncludes(article, needle, articlePath));

[
  'P = {p_0',
  'A(x,y,t)',
  'S*',
  'F(x,y,t)',
  'cost(P)',
  'risk(P)',
  'feasible',
  'regret',
  'score',
  'oracle',
  'belief',
  'waypoint',
  'debrief'
].forEach((needle) => assertIncludes(article, needle, articlePath));

[
  'Greedy Planner',
  'forecast validation',
  'hidden-event follow-up',
  'route cost',
  'reachable value',
  'flow-aware',
  'surface update',
  'replan',
  'multi-agent',
  'solver packet',
  'anchor.plan',
  'fairness',
  'Truth-assisted',
  'Oracle'
].forEach((needle) => assertIncludes(article, needle, articlePath));

[
  'Front tracking',
  'Bloom confirmation',
  'Plume source localization',
  'Coverage survey',
  'Revisit monitoring',
  'Flow-assisted sampling'
].forEach((needle) => assertIncludes(article, needle, articlePath));

[
  'data-planner-widget="reward-cost-tradeoff"',
  'data-planner-widget="reachability-timing"',
  'data-planner-widget="flow-aware-route"',
  'data-planner-widget="greedy-planner"',
  'data-planner-widget="uncertainty-aware-planner"',
  'data-planner-widget="oracle-vs-belief-planner"',
  'data-planner-widget="regret-breakdown"',
  'data-planner-widget="surface-replanning"',
  'data-planner-widget="debrief-scorecard"',
  '../src/labs/widgets/PlannerLearningWidgets.js',
  'href="index.html"',
  'href="../index.html"'
].forEach((needle) => assertIncludes(article, needle, articlePath));

[
  '.lab-planner-widget',
  '.lab-route-canvas',
  '.lab-route-card',
  '.lab-score-card',
  '.lab-score-breakdown',
  '.lab-waypoint-list',
  '.lab-planner-comparison',
  '.lab-route-metric-grid',
  '.lab-regret-card',
  '.lab-fairness-table',
  '.lab-debrief-card',
  '.lab-solver-workflow',
  '.lab-route-legend',
  '.lab-replanning-cycle',
  '.lab-multi-agent-card',
  '.lab-mission-strategy-card',
  '.lab-segment-grade-card'
].forEach((needle) => assertIncludes(css, needle, cssPath));

[
  'RewardCostTradeoffWidget',
  'ReachabilityTimingWidget',
  'FlowAwareRouteWidget',
  'GreedyPlannerWidget',
  'UncertaintyAwarePlannerWidget',
  'OracleVsBeliefPlannerWidget',
  'RegretBreakdownWidget',
  'SurfaceReplanningWidget',
  'DebriefScorecardWidget',
  'seededRng'
].forEach((needle) => assertIncludes(widgetSource, needle, widgetPath));

assertNoExternalLinks(article, articlePath);
assertNotIncludes(widgetSource, 'Phaser', widgetPath);
assertNotIncludes(widgetSource, 'anchorGame', widgetPath);
assertNotIncludes(widgetSource, ' from ', widgetPath);
await import(pathToFileUrl(path.join(ROOT, widgetPath)));

console.log('PASS planner mission evaluation learning lab smoke');

async function read(file) {
  return fs.readFile(path.join(ROOT, file), 'utf8');
}

function assertIncludes(haystack, needle, file) {
  if (!haystack.includes(needle)) throw new Error(`${file} missing required text: ${needle}`);
}

function assertNotIncludes(haystack, needle, file) {
  if (haystack.includes(needle)) throw new Error(`${file} should not include: ${needle}`);
}

function assertNoExternalLinks(html, file) {
  if (/https?:\/\//i.test(html)) throw new Error(`${file} should not use external links or assets`);
}

function pathToFileUrl(file) {
  return new URL(`file://${file.replace(/\\/g, '/')}`).href;
}
