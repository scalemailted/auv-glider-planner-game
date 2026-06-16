import assert from 'node:assert/strict';

import { inferCsvColumns, normalizeObservationCsvRows, normalizeTrackCsvRows, parseSimpleCsv, rowsToSimpleCsv } from '../../src/core/headless/HeadlessCsv.js';

const csv = 'observationId,timeSeconds,gliderId,x,y,observedValue,note\nobs-1,60,g1,2.5,3.25,0.8,"quoted, note"\nobs-2,120,g1,4,5,0.4,plain\n';
const parsed = parseSimpleCsv(csv);
assert.deepEqual(parsed.columns, ['observationId', 'timeSeconds', 'gliderId', 'x', 'y', 'observedValue', 'note']);
assert.equal(parsed.rows.length, 2, 'two observation rows parse');
assert.equal(parsed.rows[0].note, 'quoted, note', 'quoted comma parses');
assert.deepEqual(parsed.warnings, [], 'well-formed CSV has no warnings');
const normalizedObservations = normalizeObservationCsvRows(parsed.rows);
assert.equal(normalizedObservations[0].x, 2.5, 'observation x becomes number');
assert.equal(normalizedObservations[0].observedValue, 0.8, 'observed value becomes number');

const tracks = normalizeTrackCsvRows([{ timeSeconds: '0', gliderId: 'g1', x: '1', y: '2', energyUsedIncrement: '0.7', hazard: '0.1' }]);
assert.equal(tracks[0].energyUsedIncrement, 0.7, 'track energy becomes number');
assert.deepEqual(inferCsvColumns([{ b: 1, a: 2 }, { c: 3 }]), ['b', 'a', 'c'], 'column inference preserves first-seen order');
const exported = rowsToSimpleCsv([{ a: 'x,y', b: 'quote "mark"' }], ['a', 'b']);
assert.ok(exported.includes('"x,y"'), 'CSV export quotes commas');
assert.ok(exported.includes('"quote ""mark"""'), 'CSV export escapes quotes');

console.log('Headless CSV smoke passed');
