import assert from 'node:assert/strict';

import { ADAPTIVE_MANAGER_FIXTURE_IDS, adaptiveManagerFixtureOptions, runAdaptiveManagerFixture } from '../../src/core/benchmark/AdaptiveMissionManagerFixtures.js';

assert.equal(adaptiveManagerFixtureOptions().length, ADAPTIVE_MANAGER_FIXTURE_IDS.length, 'fixture options expose all fixtures');
for (const id of ADAPTIVE_MANAGER_FIXTURE_IDS) {
  const fixture = runAdaptiveManagerFixture(id);
  assert.equal(fixture.fixtureId, id, `${id} fixture id`);
  assert.ok(fixture.label.length > 0, `${id} label exists`);
  assert.ok(fixture.teachingNote.length > 0, `${id} teaching note exists`);
  assert.ok(fixture.evidence, `${id} evidence exists`);
  assert.ok(fixture.diagnosis, `${id} diagnosis exists`);
  assert.ok(fixture.transition, `${id} transition exists`);
  assert.equal(fixture.transition.toObjectiveId, fixture.expectedObjectiveId, `${id} expected objective matches result`);
  assert.equal(fixture.matchesExpectedObjective, true, `${id} matchesExpectedObjective`);
  assert.equal(/claims? production autonomy/i.test(fixture.teachingNote), false, `${id} does not claim production autonomy`);
}

console.log('smoke_adaptive_manager_fixtures: ok');
