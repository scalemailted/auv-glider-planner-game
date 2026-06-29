export const REFERENCE_ATLAS_BOUNDARY_BUDGET_VERSION = 'reference-atlas-boundary-budget-r1';

export const REFERENCE_ATLAS_ALPHA_BUDGET = Object.freeze({
  okSourceCellsMax: 150000,
  warnSourceCellsMax: 262144,
  sourceRowsHardMax: 512,
  sourceColumnsHardMax: 512,
  sourceRowsWarnMax: 384,
  sourceColumnsWarnMax: 384,
  previewMeshRowsHardMax: 200,
  previewMeshColumnsHardMax: 200,
  fieldGridRowsHardMax: 160,
  fieldGridColumnsHardMax: 160,
  depthLayersMax: 6,
  timeFramesMax: 12
});

export const REFERENCE_ATLAS_BUDGET_BLOCKED_MESSAGE = 'Region is too large for live browser generation in Alpha. Export a patch request or select a smaller window.';

const DEFAULT_BOUNDS = Object.freeze({
  westLon: -123,
  eastLon: -121.5,
  southLat: 36,
  northLat: 37.2
});

export function estimateReferenceAtlasBoundaryBudget(boundsInput = DEFAULT_BOUNDS, options = {}) {
  const budget = { ...REFERENCE_ATLAS_ALPHA_BUDGET, ...(options.budget ?? {}) };
  const bounds = normalizeBudgetBounds(boundsInput);
  const sourceResolutionArcSeconds = positiveNumber(
    options.sourceResolutionArcSeconds
      ?? options.actualRasterResolutionArcSeconds
      ?? options.availability?.matchedFixture?.actualRasterResolutionArcSeconds
      ?? options.fixture?.actualRasterResolutionArcSeconds
      ?? options.atlas?.sourceDataset?.actualRasterResolutionArcSeconds
      ?? parseArcSeconds(options.availability?.matchedFixture?.sourceResolution)
      ?? parseArcSeconds(options.fixture?.sourceResolution)
      ?? parseArcSeconds(options.atlas?.sourceDataset?.sourceResolution),
    15
  );
  const resolutionDegrees = sourceResolutionArcSeconds / 3600;
  const depthLayerCount = clampInteger(options.depthLayerCount ?? options.depthAxisMeters?.length ?? 5, 1, budget.depthLayersMax);
  const timeFrameCount = clampInteger(options.timeFrameCount ?? options.timeAxisSeconds?.length ?? 4, 1, budget.timeFramesMax);
  const validation = validateBudgetBounds(boundsInput, bounds);
  const widthDegrees = Math.max(0, Number(bounds.eastLon) - Number(bounds.westLon));
  const heightDegrees = Math.max(0, Number(bounds.northLat) - Number(bounds.southLat));
  const centerLat = (Number(bounds.southLat) + Number(bounds.northLat)) / 2;
  const approximateWidthKm = round(widthDegrees * 111.32 * Math.max(0.05, Math.cos(centerLat * Math.PI / 180)), 3);
  const approximateHeightKm = round(heightDegrees * 111.32, 3);
  const estimatedColumns = widthDegrees > 0 ? Math.max(1, Math.ceil(widthDegrees / resolutionDegrees)) : 0;
  const estimatedRows = heightDegrees > 0 ? Math.max(1, Math.ceil(heightDegrees / resolutionDegrees)) : 0;
  const sourceCellCount = estimatedRows * estimatedColumns;
  const previewMeshEstimate = gridEstimate(estimatedRows, estimatedColumns, budget.previewMeshRowsHardMax, budget.previewMeshColumnsHardMax);
  const fieldGridEstimate = gridEstimate(estimatedRows, estimatedColumns, budget.fieldGridRowsHardMax, budget.fieldGridColumnsHardMax);
  const estimatedFieldSampleCount = fieldGridEstimate.rows * fieldGridEstimate.columns * depthLayerCount * timeFrameCount;
  const budgetReasons = [];
  let budgetStatus = 'OK';

  if (!validation.valid) {
    budgetStatus = 'BLOCKED';
    budgetReasons.push(...validation.reasons);
  }
  if (estimatedRows > budget.sourceRowsHardMax) {
    budgetStatus = 'BLOCKED';
    budgetReasons.push(`Source rows ${estimatedRows} exceed Alpha hard limit ${budget.sourceRowsHardMax}.`);
  }
  if (estimatedColumns > budget.sourceColumnsHardMax) {
    budgetStatus = 'BLOCKED';
    budgetReasons.push(`Source columns ${estimatedColumns} exceed Alpha hard limit ${budget.sourceColumnsHardMax}.`);
  }
  if (sourceCellCount > budget.warnSourceCellsMax) {
    budgetStatus = 'BLOCKED';
    budgetReasons.push(`Source cells ${sourceCellCount} exceed Alpha hard limit ${budget.warnSourceCellsMax}.`);
  }
  if (budgetStatus !== 'BLOCKED') {
    if (sourceCellCount > budget.okSourceCellsMax) {
      budgetStatus = 'WARN';
      budgetReasons.push(`Source cells ${sourceCellCount} exceed Alpha OK budget ${budget.okSourceCellsMax}.`);
    }
    if (estimatedRows > budget.sourceRowsWarnMax) {
      budgetStatus = 'WARN';
      budgetReasons.push(`Source rows ${estimatedRows} are near the browser hard limit.`);
    }
    if (estimatedColumns > budget.sourceColumnsWarnMax) {
      budgetStatus = 'WARN';
      budgetReasons.push(`Source columns ${estimatedColumns} are near the browser hard limit.`);
    }
    if (previewMeshEstimate.decimationFactor > 1) {
      budgetStatus = budgetStatus === 'OK' ? 'WARN' : budgetStatus;
      budgetReasons.push(`Preview mesh will be decimated by ${previewMeshEstimate.decimationFactor}x.`);
    }
    if (fieldGridEstimate.decimationFactor > 1) {
      budgetStatus = budgetStatus === 'OK' ? 'WARN' : budgetStatus;
      budgetReasons.push(`Field grid will be decimated by ${fieldGridEstimate.decimationFactor}x.`);
    }
  }

  const patchRequestAllowed = validation.valid
    && validation.unsupportedAntimeridian !== true
    && widthDegrees > 0
    && heightDegrees > 0;
  const generationAllowed = budgetStatus !== 'BLOCKED' && patchRequestAllowed;
  const recommendedAction = recommendedActionForStatus(budgetStatus, patchRequestAllowed);

  return {
    version: REFERENCE_ATLAS_BOUNDARY_BUDGET_VERSION,
    bounds,
    sourceResolutionArcSeconds,
    resolutionDegrees: round(resolutionDegrees, 8),
    approximateWidthKm,
    approximateHeightKm,
    estimatedColumns,
    estimatedRows,
    sourceCellCount,
    previewMeshEstimate,
    fieldGridEstimate,
    depthLayerCount,
    timeFrameCount,
    estimatedFieldSampleCount,
    estimatedBenchmarkBundleClass: benchmarkClassForBudget(budgetStatus, sourceCellCount),
    budgetStatus,
    budgetReasons: budgetReasons.length ? budgetReasons : ['Selected region is within the Alpha live-generation budget.'],
    recommendedAction,
    generationAllowed,
    patchRequestAllowed,
    claimBoundary: {
      selectionEstimateOnly: true,
      browserGenerationBudgetGate: true,
      hiddenTruthExposed: false,
      currentField4DGenerated: false,
      scalarField4DGenerated: false,
      certifiedForNavigation: false,
      operationalOceanForecast: false
    }
  };
}

export function sourceResolutionArcSecondsFromReference(input = {}, fallback = 15) {
  return positiveNumber(
    input.actualRasterResolutionArcSeconds
      ?? input.sourceResolutionArcSeconds
      ?? parseArcSeconds(input.sourceResolution)
      ?? input.matchedFixture?.actualRasterResolutionArcSeconds
      ?? parseArcSeconds(input.matchedFixture?.sourceResolution),
    fallback
  );
}

export function referenceAtlasBudgetAllowsGeneration(boundaryBudget = null) {
  return boundaryBudget?.budgetStatus !== 'BLOCKED' && boundaryBudget?.generationAllowed !== false;
}

function validateBudgetBounds(rawInput = {}, bounds = {}) {
  const reasons = [];
  const rawWest = Number(rawInput?.westLon ?? rawInput?.west);
  const rawEast = Number(rawInput?.eastLon ?? rawInput?.east);
  const rawSouth = Number(rawInput?.southLat ?? rawInput?.south);
  const rawNorth = Number(rawInput?.northLat ?? rawInput?.north);
  if (![rawWest, rawEast, rawSouth, rawNorth].every(Number.isFinite)) reasons.push('Selected bounds must include finite west/east/south/north lon/lat values.');
  const unsupportedAntimeridian = Number.isFinite(rawWest) && Number.isFinite(rawEast) && rawEast <= rawWest;
  if (unsupportedAntimeridian || rawInput?.crossesAntimeridian === true) reasons.push('Antimeridian-crossing selections are not supported by the Alpha browser generator.');
  if (Number(bounds.westLon) < -180 || Number(bounds.eastLon) > 180) reasons.push('Selected longitude bounds must stay within -180..180 degrees.');
  if (Number(bounds.southLat) < -90 || Number(bounds.northLat) > 90) reasons.push('Selected latitude bounds must stay within -90..90 degrees.');
  if (Number(bounds.northLat) <= Number(bounds.southLat)) reasons.push('Selected latitude span must be positive.');
  if (Number(bounds.eastLon) <= Number(bounds.westLon)) reasons.push('Selected longitude span must be positive.');
  return {
    valid: reasons.length === 0,
    reasons,
    unsupportedAntimeridian
  };
}

function normalizeBudgetBounds(input = DEFAULT_BOUNDS) {
  const westLon = finite(input?.westLon ?? input?.west, DEFAULT_BOUNDS.westLon);
  const eastLon = finite(input?.eastLon ?? input?.east, DEFAULT_BOUNDS.eastLon);
  const southLat = finite(input?.southLat ?? input?.south, DEFAULT_BOUNDS.southLat);
  const northLat = finite(input?.northLat ?? input?.north, DEFAULT_BOUNDS.northLat);
  return {
    westLon: round(westLon),
    eastLon: round(eastLon),
    southLat: round(southLat),
    northLat: round(northLat)
  };
}

function gridEstimate(sourceRows = 0, sourceColumns = 0, maxRows = 1, maxColumns = 1) {
  const decimationFactor = Math.max(
    1,
    Math.ceil(Math.max(
      positiveNumber(sourceRows, 0) / Math.max(1, maxRows),
      positiveNumber(sourceColumns, 0) / Math.max(1, maxColumns)
    ))
  );
  return {
    rows: sourceRows ? Math.max(1, Math.ceil(sourceRows / decimationFactor)) : 0,
    columns: sourceColumns ? Math.max(1, Math.ceil(sourceColumns / decimationFactor)) : 0,
    maxRows,
    maxColumns,
    decimationFactor
  };
}

function recommendedActionForStatus(status = 'OK', patchRequestAllowed = false) {
  if (status === 'BLOCKED') return patchRequestAllowed ? 'Export a patch request or select a smaller window.' : 'Select a valid non-antimeridian lon/lat window.';
  if (status === 'WARN') return 'Proceed only with a staged patch or export a patch request for offline preprocessing.';
  return 'Region is within Alpha live browser generation budget.';
}

function benchmarkClassForBudget(status = 'OK', cells = 0) {
  if (status === 'BLOCKED') return 'OVERSIZED_PATCH_REQUEST_ONLY';
  if (status === 'WARN') return 'MEDIUM_BROWSER_DECIMATED';
  return cells <= 100000 ? 'SMALL_BROWSER_READY' : 'BROWSER_READY';
}

function parseArcSeconds(value) {
  const match = String(value ?? '').match(/([0-9]+(?:\.[0-9]+)?)\s*(?:arc[- ]?second|arcsec|s)\b/i);
  return match ? Number(match[1]) : null;
}

function finite(value, fallback = 0) {
  const number = Number(value);
  return Number.isFinite(number) ? number : fallback;
}

function positiveNumber(value, fallback = 1) {
  const number = Number(value);
  return Number.isFinite(number) && number > 0 ? number : fallback;
}

function clampInteger(value, min, max) {
  const number = Math.round(finite(value, min));
  return Math.min(max, Math.max(min, number));
}

function round(value, digits = 6) {
  const number = Number(value);
  return Number.isFinite(number) ? Number(number.toFixed(digits)) : 0;
}
