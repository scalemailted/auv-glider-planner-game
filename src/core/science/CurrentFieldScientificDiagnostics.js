import { coastlineNormal } from './CurrentTerrainBoundaryCondition.js';

export const CURRENT_FIELD_SCIENTIFIC_DIAGNOSTICS_VERSION = 'current-field-scientific-diagnostics-flow-r2a-5';

export function computeCurrentFieldScientificDiagnostics(field = {}, options = {}) {
  const dims = dimensions(field);
  const speeds = [];
  const divergence = [];
  const vorticity = [];
  const coastlineNormalSpeeds = [];
  const verticalShear = [];
  const temporalChange = [];
  const alongFractions = [];
  const crossFractions = [];
  const alongSpeeds = [];
  const crossShelfSpeeds = [];
  const adjacentDirectionDifferences = [];
  const adjacentMagnitudeDifferences = [];
  const adjacentCosines = [];
  const calmThreshold = finite(options.calmThresholdMetersPerSecond ?? field.sourceMetadata?.calmThresholdMetersPerSecond, 0.035);
  let validVectorCount = 0;
  let invalidVectorCount = 0;
  let landVectorCount = 0;
  let belowBottomVectorCount = 0;
  let calmVectorCount = 0;
  let canyonExchangeVectorCount = 0;
  let undeclaredCrossShelfVectorCount = 0;
  for (let t = 0; t < dims.time; t += 1) {
    for (let z = 0; z < dims.depth; z += 1) {
      const depth = Number(field.depthAxisMeters?.[z] ?? z);
      for (let y = 0; y < dims.height; y += 1) {
        for (let x = 0; x < dims.width; x += 1) {
          const u = Number(field.uEastMetersPerSecond?.[t]?.[z]?.[y]?.[x]);
          const v = Number(field.vNorthMetersPerSecond?.[t]?.[z]?.[y]?.[x]);
          const finiteVector = Number.isFinite(u) && Number.isFinite(v);
          const wet2d = field.wetMask?.[y]?.[x] !== false;
          const bottom = Number(field.bottomDepthMeters?.[y]?.[x] ?? Infinity);
          const belowBottom = Number.isFinite(bottom) && depth > bottom + 1e-6;
          if (!finiteVector) {
            invalidVectorCount += 1;
            continue;
          }
          if (!wet2d && Math.hypot(u, v) > 1e-8) landVectorCount += 1;
          if (belowBottom && Math.hypot(u, v) > 1e-8) belowBottomVectorCount += 1;
          if (!wet2d || belowBottom) continue;
          validVectorCount += 1;
          const speed = Math.hypot(u, v);
          if (speed <= calmThreshold) calmVectorCount += 1;
          speeds.push(speed);
          const normal = coastlineNormal(field.wetMask ?? [], x, y);
          if (normal) coastlineNormalSpeeds.push(Math.abs(u * normal.x + v * normal.y));
          const steering = bathymetrySteeringAt(field, x, y, u, v);
          if (steering) {
            alongFractions.push(steering.alongFraction);
            crossFractions.push(steering.crossFraction);
            alongSpeeds.push(steering.alongSpeed);
            crossShelfSpeeds.push(steering.crossSpeed);
            if (steering.crossSpeed > calmThreshold && inDeclaredCanyon(field, x, y)) canyonExchangeVectorCount += 1;
            if (steering.crossFraction > 0.7 && steering.crossSpeed > calmThreshold && !inDeclaredCanyon(field, x, y)) undeclaredCrossShelfVectorCount += 1;
          }
          for (const [nx, ny] of [[x + 1, y], [x, y + 1]]) {
            if (!cellWetAtDepth(field, nx, ny, depth)) continue;
            const u2 = Number(field.uEastMetersPerSecond?.[t]?.[z]?.[ny]?.[nx]);
            const v2 = Number(field.vNorthMetersPerSecond?.[t]?.[z]?.[ny]?.[nx]);
            if (!Number.isFinite(u2) || !Number.isFinite(v2)) continue;
            const speed2 = Math.hypot(u2, v2);
            adjacentMagnitudeDifferences.push(Math.abs(speed2 - speed));
            if (speed > calmThreshold && speed2 > calmThreshold) {
              const dot = (u * u2 + v * v2) / Math.max(1e-12, speed * speed2);
              const clamped = Math.max(-1, Math.min(1, dot));
              adjacentCosines.push(clamped);
              adjacentDirectionDifferences.push(Math.acos(clamped) * 180 / Math.PI);
            }
          }
        }
      }
      for (let y = 1; y < dims.height - 1; y += 1) {
        for (let x = 1; x < dims.width - 1; x += 1) {
          if (!cellWetAtDepth(field, x, y, field.depthAxisMeters?.[z] ?? z)) continue;
          const d = divergenceAt(field, t, z, x, y);
          if (d) {
            divergence.push(d.divergence);
            vorticity.push(d.vorticity);
          }
        }
      }
    }
  }
  for (let t = 0; t < dims.time; t += 1) {
    for (let z = 0; z < dims.depth - 1; z += 1) {
      for (let y = 0; y < dims.height; y += 1) {
        for (let x = 0; x < dims.width; x += 1) {
          if (!cellWetAtDepth(field, x, y, field.depthAxisMeters?.[z] ?? z) || !cellWetAtDepth(field, x, y, field.depthAxisMeters?.[z + 1] ?? z + 1)) continue;
          const du = Number(field.uEastMetersPerSecond?.[t]?.[z + 1]?.[y]?.[x] ?? 0) - Number(field.uEastMetersPerSecond?.[t]?.[z]?.[y]?.[x] ?? 0);
          const dv = Number(field.vNorthMetersPerSecond?.[t]?.[z + 1]?.[y]?.[x] ?? 0) - Number(field.vNorthMetersPerSecond?.[t]?.[z]?.[y]?.[x] ?? 0);
          const dz = Math.max(1e-9, Number(field.depthAxisMeters?.[z + 1] ?? z + 1) - Number(field.depthAxisMeters?.[z] ?? z));
          verticalShear.push(Math.hypot(du, dv) / dz);
        }
      }
    }
  }
  for (let t = 0; t < dims.time - 1; t += 1) {
    for (let z = 0; z < dims.depth; z += 1) {
      for (let y = 0; y < dims.height; y += 1) {
        for (let x = 0; x < dims.width; x += 1) {
          if (!cellWetAtDepth(field, x, y, field.depthAxisMeters?.[z] ?? z)) continue;
          const du = Number(field.uEastMetersPerSecond?.[t + 1]?.[z]?.[y]?.[x] ?? 0) - Number(field.uEastMetersPerSecond?.[t]?.[z]?.[y]?.[x] ?? 0);
          const dv = Number(field.vNorthMetersPerSecond?.[t + 1]?.[z]?.[y]?.[x] ?? 0) - Number(field.vNorthMetersPerSecond?.[t]?.[z]?.[y]?.[x] ?? 0);
          temporalChange.push(Math.hypot(du, dv));
        }
      }
    }
  }
  const warnings = [];
  const failures = [];
  if (invalidVectorCount > 0) failures.push(`${invalidVectorCount} current vectors are non-finite.`);
  if (landVectorCount > 0) failures.push(`${landVectorCount} nonzero vectors are on land.`);
  if (belowBottomVectorCount > 0) failures.push(`${belowBottomVectorCount} nonzero vectors are below seabed.`);
  const divergenceStats = metricStats(divergence.map(Math.abs));
  const coastlineStats = metricStats(coastlineNormalSpeeds);
  const adjacentDirectionStats = metricStats(adjacentDirectionDifferences);
  const adjacentMagnitudeStats = metricStats(adjacentMagnitudeDifferences);
  const spatialAutocorrelation = round(adjacentCosines.length ? adjacentCosines.reduce((sum, value) => sum + value, 0) / adjacentCosines.length : 1);
  const highFrequencyEnergyFraction = round(Math.max(0, Math.min(1, 1 - ((spatialAutocorrelation + 1) / 2))));
  const lowFrequencyEnergyFraction = round(1 - highFrequencyEnergyFraction);
  const cellwiseDirectionNoiseScore = round(Math.max(0, Math.min(1, ((adjacentDirectionStats.mean ?? 0) / 180) * 0.65 + highFrequencyEnergyFraction * 0.35)));
  const estimatedCorrelationLengthMeters = round(estimateCorrelationLengthMeters(field, spatialAutocorrelation));
  const coherentRegionCount = countCoherentRegions(field, calmThreshold, false);
  const calmRegionCount = countCoherentRegions(field, calmThreshold, true);
  const divergenceLimit = Number(options.divergenceRmsLimit ?? field.sourceMetadata?.expectedDiagnostics?.divergenceRmsMaximum ?? Infinity);
  const coastlineLimit = Number(options.coastlineNormalSpeedRmsLimit ?? field.sourceMetadata?.expectedDiagnostics?.coastlineNormalSpeedRmsMaximum ?? Infinity);
  const noiseLimit = Number(options.cellwiseDirectionNoiseScoreMaximum ?? field.sourceMetadata?.expectedDiagnostics?.cellwiseDirectionNoiseScoreMaximum ?? 0.75);
  const highFrequencyLimit = Number(options.highFrequencyEnergyFractionMaximum ?? field.sourceMetadata?.expectedDiagnostics?.highFrequencyEnergyFractionMaximum ?? 0.7);
  if (Number.isFinite(divergenceLimit) && divergenceStats.rms > divergenceLimit) warnings.push(`Divergence RMS ${round(divergenceStats.rms)} exceeds declared limit ${divergenceLimit}.`);
  if (Number.isFinite(coastlineLimit) && coastlineStats.rms > coastlineLimit) warnings.push(`Coastline normal RMS ${round(coastlineStats.rms)} exceeds declared limit ${coastlineLimit}.`);
  if (cellwiseDirectionNoiseScore > noiseLimit) failures.push(`Direction-noise score ${cellwiseDirectionNoiseScore} is characteristic of a cellwise mosaic.`);
  if (highFrequencyEnergyFraction > highFrequencyLimit) warnings.push(`High-frequency energy fraction ${highFrequencyEnergyFraction} exceeds declared limit ${highFrequencyLimit}.`);
  const speedStats = metricStats(speeds);
  const alongStats = metricStats(alongSpeeds);
  const crossStats = metricStats(crossShelfSpeeds);
  return {
    type: 'anchor.science.current-field-scientific-diagnostics',
    version: CURRENT_FIELD_SCIENTIFIC_DIAGNOSTICS_VERSION,
    validVectorCount,
    invalidVectorCount,
    speedMinimum: speedStats.minimum,
    speedMean: speedStats.mean,
    speedMaximum: speedStats.maximum,
    calmThresholdMetersPerSecond: calmThreshold,
    calmVectorCount,
    divergenceRms: divergenceStats.rms,
    divergenceP95: divergenceStats.p95,
    divergenceMaximum: divergenceStats.maximum,
    vorticityMinimum: metricStats(vorticity).minimum,
    vorticityMean: metricStats(vorticity).mean,
    vorticityMaximum: metricStats(vorticity.map(Math.abs)).maximum,
    coastlineNormalSpeedRms: coastlineStats.rms,
    coastlineNormalSpeedMaximum: coastlineStats.maximum,
    belowBottomVectorCount,
    landVectorCount,
    verticalShearRms: metricStats(verticalShear).rms,
    temporalChangeRms: metricStats(temporalChange).rms,
    temporalDiscontinuityMaximum: metricStats(temporalChange).maximum,
    wetVolumeCoverage: round(validVectorCount / Math.max(1, dims.time * dims.depth * dims.height * dims.width)),
    alongIsobathSpeedRms: alongStats.rms,
    crossIsobathSpeedRms: crossStats.rms,
    alongIsobathFraction: metricStats(alongFractions).mean,
    crossIsobathFraction: metricStats(crossFractions).mean,
    crossShelfSpeedRms: crossStats.rms,
    crossShelfSpeedMaximum: crossStats.maximum,
    canyonExchangeVectorCount,
    undeclaredCrossShelfVectorCount,
    adjacentDirectionDifferenceMeanDegrees: adjacentDirectionStats.mean,
    adjacentDirectionDifferenceP50Degrees: adjacentDirectionStats.p50,
    adjacentDirectionDifferenceP95Degrees: adjacentDirectionStats.p95,
    adjacentMagnitudeDifferenceMean: adjacentMagnitudeStats.mean,
    adjacentMagnitudeDifferenceP95: adjacentMagnitudeStats.p95,
    spatialAutocorrelation,
    estimatedCorrelationLengthMeters,
    coherentRegionCount,
    calmRegionCount,
    cellwiseDirectionNoiseScore,
    lowFrequencyEnergyFraction,
    highFrequencyEnergyFraction,
    status: failures.length ? 'FAIL' : warnings.length ? 'WARN' : 'PASS',
    warnings,
    failures
  };
}

export function bathymetrySteeringAt(field = {}, x = 0, y = 0, u = 0, v = 0) {
  const b = field.bottomDepthMeters ?? [];
  if (!b.length) return null;
  const x0 = Math.max(0, x - 1);
  const x1 = Math.min((b[0]?.length ?? 1) - 1, x + 1);
  const y0 = Math.max(0, y - 1);
  const y1 = Math.min(b.length - 1, y + 1);
  const dx = Math.max(1e-9, Number(field.eastAxisMeters?.[x1] ?? x1) - Number(field.eastAxisMeters?.[x0] ?? x0));
  const dy = Math.max(1e-9, Number(field.northAxisMeters?.[y1] ?? y1) - Number(field.northAxisMeters?.[y0] ?? y0));
  const gradX = (Number(b[y]?.[x1] ?? b[y]?.[x]) - Number(b[y]?.[x0] ?? b[y]?.[x])) / dx;
  const gradY = (Number(b[y1]?.[x] ?? b[y]?.[x]) - Number(b[y0]?.[x] ?? b[y]?.[x])) / dy;
  const gradLength = Math.hypot(gradX, gradY);
  const speed = Math.hypot(Number(u), Number(v));
  if (!Number.isFinite(gradLength) || gradLength <= 1e-9 || speed <= 1e-9) return null;
  const nx = gradX / gradLength;
  const ny = gradY / gradLength;
  const tx = -ny;
  const ty = nx;
  const along = Math.abs(Number(u) * tx + Number(v) * ty);
  const cross = Math.abs(Number(u) * nx + Number(v) * ny);
  return {
    alongSpeed: round(along),
    crossSpeed: round(cross),
    alongFraction: round(along / speed),
    crossFraction: round(cross / speed),
    bathymetryNormal: { x: round(nx), y: round(ny) },
    isobathTangent: { x: round(tx), y: round(ty) }
  };
}

function divergenceAt(field, t, z, x, y) {
  const u = field.uEastMetersPerSecond;
  const v = field.vNorthMetersPerSecond;
  const left = Number(u?.[t]?.[z]?.[y]?.[x - 1]);
  const right = Number(u?.[t]?.[z]?.[y]?.[x + 1]);
  const down = Number(v?.[t]?.[z]?.[y - 1]?.[x]);
  const up = Number(v?.[t]?.[z]?.[y + 1]?.[x]);
  const bottom = Number(u?.[t]?.[z]?.[y - 1]?.[x]);
  const top = Number(u?.[t]?.[z]?.[y + 1]?.[x]);
  const leftV = Number(v?.[t]?.[z]?.[y]?.[x - 1]);
  const rightV = Number(v?.[t]?.[z]?.[y]?.[x + 1]);
  if (![left, right, down, up, bottom, top, leftV, rightV].every(Number.isFinite)) return null;
  const dx = Math.max(1e-9, Number(field.eastAxisMeters?.[x + 1] ?? x + 1) - Number(field.eastAxisMeters?.[x - 1] ?? x - 1));
  const dy = Math.max(1e-9, Number(field.northAxisMeters?.[y + 1] ?? y + 1) - Number(field.northAxisMeters?.[y - 1] ?? y - 1));
  const dudx = (right - left) / dx;
  const dvdy = (up - down) / dy;
  const dvdx = (rightV - leftV) / dx;
  const dudy = (top - bottom) / dy;
  return { divergence: dudx + dvdy, vorticity: dvdx - dudy };
}

function cellWetAtDepth(field = {}, x = 0, y = 0, depth = 0) {
  if (y < 0 || x < 0 || y >= (field.wetMask?.length ?? 0) || x >= (field.wetMask?.[y]?.length ?? 0)) return false;
  const wet = field.wetMask?.[y]?.[x] !== false;
  const bottom = Number(field.bottomDepthMeters?.[y]?.[x] ?? Infinity);
  return wet && Number.isFinite(bottom) && Number(depth) <= bottom + 1e-6;
}

function inDeclaredCanyon(field = {}, x = 0, y = 0) {
  const params = field.sourceMetadata?.parameters ?? {};
  const width = Math.max(1, (field.eastAxisMeters?.length ?? 1) - 1);
  const height = Math.max(1, (field.northAxisMeters?.length ?? 1) - 1);
  const xFrac = Number(x) / width;
  const yFrac = Number(y) / height;
  const cx = finite(params.canyonCenterX, 0.5);
  const cy = finite(params.canyonCenterY, 0.58);
  const sx = finite(params.canyonWidth, 0.075) * 1.8;
  const sy = finite(params.canyonLength, 0.24) * 1.4;
  return Math.abs(xFrac - cx) <= sx && Math.abs(yFrac - cy) <= sy;
}

function countCoherentRegions(field = {}, calmThreshold = 0.035, calmOnly = false) {
  const t = 0;
  const z = Math.min(1, (field.depthAxisMeters?.length ?? 1) - 1);
  const height = field.northAxisMeters?.length ?? 0;
  const width = field.eastAxisMeters?.length ?? 0;
  const seen = new Set();
  let regions = 0;
  for (let y = 0; y < height; y += 1) {
    for (let x = 0; x < width; x += 1) {
      const key = `${x},${y}`;
      if (seen.has(key) || !cellWetAtDepth(field, x, y, field.depthAxisMeters?.[z] ?? z)) continue;
      const speed = Math.hypot(Number(field.uEastMetersPerSecond?.[t]?.[z]?.[y]?.[x] ?? 0), Number(field.vNorthMetersPerSecond?.[t]?.[z]?.[y]?.[x] ?? 0));
      const isCalm = speed <= calmThreshold;
      if (calmOnly !== isCalm) continue;
      regions += 1;
      const stack = [[x, y]];
      seen.add(key);
      while (stack.length) {
        const [cx, cy] = stack.pop();
        for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
          const nx = cx + dx;
          const ny = cy + dy;
          const nkey = `${nx},${ny}`;
          if (seen.has(nkey) || !cellWetAtDepth(field, nx, ny, field.depthAxisMeters?.[z] ?? z)) continue;
          const nspeed = Math.hypot(Number(field.uEastMetersPerSecond?.[t]?.[z]?.[ny]?.[nx] ?? 0), Number(field.vNorthMetersPerSecond?.[t]?.[z]?.[ny]?.[nx] ?? 0));
          if ((nspeed <= calmThreshold) !== calmOnly) continue;
          seen.add(nkey);
          stack.push([nx, ny]);
        }
      }
    }
  }
  return regions;
}

function estimateCorrelationLengthMeters(field = {}, autocorrelation = 1) {
  const dx = Math.abs(Number(field.eastAxisMeters?.[1] ?? 1) - Number(field.eastAxisMeters?.[0] ?? 0)) || 1;
  const dy = Math.abs(Number(field.northAxisMeters?.[1] ?? 1) - Number(field.northAxisMeters?.[0] ?? 0)) || dx;
  const spacing = (dx + dy) / 2;
  const ac = Math.max(0, Math.min(0.999, Number(autocorrelation)));
  return spacing * (1 + ac * 8);
}

function dimensions(field = {}) {
  return {
    width: field.eastAxisMeters?.length ?? 0,
    height: field.northAxisMeters?.length ?? 0,
    depth: field.depthAxisMeters?.length ?? 0,
    time: field.timeAxisSeconds?.length ?? 0
  };
}

function metricStats(values = []) {
  const v = values.map(Number).filter(Number.isFinite).sort((a, b) => a - b);
  if (!v.length) return { count: 0, minimum: null, mean: null, maximum: null, rms: null, p50: null, p95: null };
  const mean = v.reduce((sum, value) => sum + value, 0) / v.length;
  const rms = Math.sqrt(v.reduce((sum, value) => sum + value * value, 0) / v.length);
  const p50 = v[Math.min(v.length - 1, Math.max(0, Math.floor(v.length * 0.5)))] ?? v.at(-1);
  const p95 = v[Math.min(v.length - 1, Math.max(0, Math.floor(v.length * 0.95)))] ?? v.at(-1);
  return { count: v.length, minimum: round(v[0]), mean: round(mean), maximum: round(v.at(-1)), rms: round(rms), p50: round(p50), p95: round(p95) };
}

function finite(value, fallback = 0) {
  const number = Number(value);
  return Number.isFinite(number) ? number : fallback;
}

function round(value, digits = 6) {
  const number = Number(value);
  return Number.isFinite(number) ? Number(number.toFixed(digits)) : null;
}
