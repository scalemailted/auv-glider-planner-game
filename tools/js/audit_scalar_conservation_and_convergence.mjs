import {
  DEFAULT_DEPTH_COORDINATES,
  assertCondition,
  createScalarField4d,
  round,
  sampleScalarFixture,
  scalarFieldMass
} from './scientific_baseline_helpers.mjs';

function gaussianField(width, height, sigmaScale = 1) {
  return createScalarField4d({
    width,
    height,
    evaluator: ({ x, y, depthMeters, timeSeconds }) => {
      const cx = (width - 1) * 0.47 + timeSeconds / 1800;
      const cy = (height - 1) * 0.54;
      const sigma = Math.max(1, width * 0.16 * sigmaScale);
      return Math.exp(-(((x - cx) ** 2 + (y - cy) ** 2) / (2 * sigma * sigma))) * Math.exp(-depthMeters / 240);
    }
  });
}

const coarse = gaussianField(8, 6);
const fine = gaussianField(16, 12);
const coarseSample = sampleScalarFixture(coarse, { x: 3.5, y: 2.5, depthMeters: 35, timeSeconds: 300 }).value;
const fineSample = sampleScalarFixture(fine, { x: 7, y: 5, depthMeters: 35, timeSeconds: 300 }).value;
const sampleDifference = Math.abs(coarseSample - fineSample);
const massByTime = [0, 300, 600, 900].map((timeSeconds) => scalarFieldMass(createScalarField4d({
  width: 10,
  height: 8,
  timeCoordinates: [timeSeconds],
  evaluator: ({ x, y, depthMeters }) => {
    const sigma = 2 + timeSeconds / 600;
    return Math.exp(-(((x - 4.8) ** 2 + (y - 3.8) ** 2) / (2 * sigma * sigma))) * Math.exp(-depthMeters / 240) / Math.max(1, sigma * sigma);
  }
})));
const massRatio = Math.max(...massByTime) / Math.max(1e-12, Math.min(...massByTime));

assertCondition(DEFAULT_DEPTH_COORDINATES.length >= 4, 'Scalar baseline should exercise multiple depth coordinates.');
assertCondition(Number.isFinite(coarseSample) && Number.isFinite(fineSample), 'Scalar convergence samples must be finite.');
assertCondition(sampleDifference < 0.18, 'Scalar resolution comparison drift is too large for a smooth manufactured Gaussian.', { coarseSample, fineSample, sampleDifference });
assertCondition(massRatio < 1.8, 'Normalized diffusion proxy should not lose/gain excessive total mass on the compact grid.', { massByTime, massRatio });

console.log('audit_scalar_conservation_and_convergence: ok', JSON.stringify({
  coarseSample: round(coarseSample),
  fineSample: round(fineSample),
  sampleDifference: round(sampleDifference),
  massByTime,
  massRatio: round(massRatio)
}, null, 2));
