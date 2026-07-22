 const MOTION_COST_GRAPH_PUBLIC_SAFETY_VERSION = 'motion-cost-graph-public-safety-sim-r1';

const HIDDEN_TOKENS = Object.freeze([
  'T_hiddenTruth',
  'hiddenTruthField',
  'trueRoi',
  'truthValue',
  'eventIntensity'
]);

 function sanitizeMotionCostGraphForPublicExport(graph = {}) {
  const copy = deepClone(graph);
  scrubHiddenKeys(copy);
  copy.publicSafe = true;
  copy.hiddenTruthIncluded = false;
  copy.visibilityTier = 'publicScenario';
  copy.generatedRoute = false;
  copy.usesNewPlanner = false;
  copy.usesRouteOptimizer = false;
  copy.usesMARL = false;
  copy.browserOfficialScoring = false;
  if (copy.summary) {
    copy.summary.publicSafe = true;
    copy.summary.hiddenTruthIncluded = false;
    copy.summary.generatedRoute = false;
    copy.summary.usesNewPlanner = false;
    copy.summary.usesRouteOptimizer = false;
    copy.summary.usesMARL = false;
    copy.summary.browserOfficialScoring = false;
  }
  return copy;
}

 function sanitizeMotionCostMatrixForPublicExport(matrix = {}) {
  const copy = deepClone(matrix);
  scrubHiddenKeys(copy);
  copy.publicSafe = true;
  copy.hiddenTruthIncluded = false;
  copy.visibilityTier = 'publicScenario';
  copy.generatedRoute = false;
  copy.usesNewPlanner = false;
  copy.usesRouteOptimizer = false;
  copy.usesMARL = false;
  copy.browserOfficialScoring = false;
  if (copy.summary) {
    copy.summary.publicSafe = true;
    copy.summary.hiddenTruthIncluded = false;
    copy.summary.generatedRoute = false;
    copy.summary.usesNewPlanner = false;
    copy.summary.usesRouteOptimizer = false;
    copy.summary.usesMARL = false;
    copy.summary.browserOfficialScoring = false;
  }
  return copy;
}

 function validateMotionCostGraphPublicSafety(graph = {}) {
  return validatePublicSafety(graph, 'Motion cost graph');
}

 function validateMotionCostMatrixPublicSafety(matrix = {}) {
  return validatePublicSafety(matrix, 'Motion cost matrix');
}

function validatePublicSafety(payload, label) {
  const errors = [];
  const warnings = [];
  const text = JSON.stringify(payload ?? {});
  for (const token of HIDDEN_TOKENS) {
    if (text.includes(token)) errors.push(`${label} public  must not include hidden/oracle token ${token}.`);
  }
  if (payload?.hiddenTruthIncluded === true) errors.push(`${label} must mark hiddenTruthIncluded=false.`);
  if (payload?.publicSafe === false) errors.push(`${label} must mark publicSafe=true.`);
  if (payload?.usesNewPlanner === true) errors.push(`${label} must not claim a new planner.`);
  if (payload?.usesRouteOptimizer === true) errors.push(`${label} must not claim route optimization.`);
  if (payload?.generatedRoute === true) errors.push(`${label} must not claim it generated a route.`);
  if (payload?.usesMARL === true) errors.push(`${label} must not claim MARL/RL.`);
  if (payload?.browserOfficialScoring === true) errors.push(`${label} must not claim official browser scoring.`);
  if (!Array.isArray(payload?.notA) && !Array.isArray(payload?.summary?.notA)) warnings.push(`${label} should include notA boundary notes.`);
  return {
    valid: errors.length === 0,
    status: errors.length ? 'FAIL' : warnings.length ? 'WARN' : 'PASS',
    errors,
    warnings,
    version: MOTION_COST_GRAPH_PUBLIC_SAFETY_VERSION
  };
}

function scrubHiddenKeys(value) {
  if (!value || typeof value !== 'object') return;
  if (Array.isArray(value)) {
    value.forEach(scrubHiddenKeys);
    return;
  }
  for (const key of Object.keys(value)) {
    if (HIDDEN_TOKENS.includes(key) || /hiddenTruth|truthValue|trueRoi|eventIntensity/i.test(key)) {
      delete value[key];
      continue;
    }
    scrubHiddenKeys(value[key]);
  }
}

function deepClone(value) {
  return JSON.parse(JSON.stringify(value ?? null));
}

module.exports = {MOTION_COST_GRAPH_PUBLIC_SAFETY_VERSION, sanitizeMotionCostGraphForPublicExport, sanitizeMotionCostMatrixForPublicExport, validateMotionCostGraphPublicSafety, validateMotionCostMatrixPublicSafety}