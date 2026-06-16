import { analyzeScienceEvidence } from './ScienceDiscoveryLifecycle.js';

export const SCIENCE_DISCOVERY_FIXTURES_VERSION = 'science-discovery-fixtures-p9';

export const SCIENCE_DISCOVERY_FIXTURES = Object.freeze({
  agreesWithForecast: Object.freeze({
    id: 'agreesWithForecast',
    expectedPrimaryDiagnosis: 'agreesWithForecast',
    context: { episodeId: 'science-fixture-agreement', forecastCanExplain: true },
    observations: Object.freeze([
      obs(0, 2, 2, 0.52, 0.5),
      obs(120, 3, 2, 0.49, 0.5),
      obs(240, 3, 3, 0.51, 0.5)
    ])
  }),
  forecastIntensityError: Object.freeze({
    id: 'forecastIntensityError',
    expectedPrimaryDiagnosis: 'forecastIntensityError',
    context: { episodeId: 'science-fixture-forecast-error', forecastCanExplain: true, forecastIssueHint: 'intensity' },
    observations: Object.freeze([
      obs(0, 5, 4, 1.25, 0.45),
      obs(120, 5.4, 4.2, 1.2, 0.42),
      obs(240, 4.8, 4.1, 1.18, 0.4),
      obs(360, 5.2, 3.8, 1.22, 0.43)
    ])
  }),
  likelyHiddenEvent: Object.freeze({
    id: 'likelyHiddenEvent',
    expectedPrimaryDiagnosis: 'likelyHiddenEvent',
    context: { episodeId: 'science-fixture-hidden-event', forecastCanExplain: false, eventFamily: 'hiddenPlume' },
    observations: Object.freeze([
      obs(0, 7, 3, 1.35, 0.35),
      obs(120, 7.2, 3.4, 1.31, 0.34),
      obs(240, 6.8, 3.1, 1.28, 0.36),
      obs(360, 7.1, 2.9, 1.33, 0.35)
    ])
  }),
  likelySensorNoise: Object.freeze({
    id: 'likelySensorNoise',
    expectedPrimaryDiagnosis: 'likelySensorNoise',
    context: { episodeId: 'science-fixture-noise', forecastCanExplain: true },
    observations: Object.freeze([
      obs(0, 1, 1, 1.3, 0.5),
      obs(120, 9, 6, 0.48, 0.5),
      obs(240, 4, 2, 0.52, 0.5)
    ])
  }),
  insufficientEvidence: Object.freeze({
    id: 'insufficientEvidence',
    expectedPrimaryDiagnosis: 'insufficientEvidence',
    context: { episodeId: 'science-fixture-insufficient', forecastCanExplain: true },
    observations: Object.freeze([])
  })
});

export function scienceDiscoveryFixtureIds() {
  return Object.keys(SCIENCE_DISCOVERY_FIXTURES);
}

export function scienceDiscoveryFixtureById(id) {
  return SCIENCE_DISCOVERY_FIXTURES[id] ?? null;
}

export function runScienceDiscoveryFixture(id, options = {}) {
  const fixture = scienceDiscoveryFixtureById(id);
  if (!fixture) throw new Error(`Unknown science discovery fixture: ${id}`);
  const update = analyzeScienceEvidence({
    observations: fixture.observations.map((entry) => ({ ...entry })),
    context: { ...fixture.context },
    options: { createdAt: '2026-06-16T00:00:00.000Z', ...options }
  });
  return {
    fixtureId: fixture.id,
    expectedPrimaryDiagnosis: fixture.expectedPrimaryDiagnosis,
    update,
    passed: update.primaryDiagnosis === fixture.expectedPrimaryDiagnosis
  };
}

export function runAllScienceDiscoveryFixtures() {
  return scienceDiscoveryFixtureIds().map((id) => runScienceDiscoveryFixture(id));
}

function obs(timeSeconds, x, y, observedValue, forecastValue) {
  return Object.freeze({
    observationId: `fixture-${timeSeconds}-${x}-${y}`,
    timeSeconds,
    x,
    y,
    zIndex: 0,
    observedValue,
    forecastValue,
    beliefValue: forecastValue,
    sensorNoiseStd: 0.12
  });
}
