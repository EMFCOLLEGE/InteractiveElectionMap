import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';
import { ballotForAddress } from '../src/ballotForAddress.js';

const data = JSON.parse(await readFile(new URL('../public/data/tx.json', import.meta.url), 'utf8'));
const lookup = { state: 'TX', county: 'Fort Bend County', districts: { us_house: '22', state_senate: '18', state_house: '26', state_board: '7' } };

test('select statewide, correct district and countywide races without changing ordering', () => {
  const original = JSON.stringify(data);
  const { races, otherCountyRaces } = ballotForAddress(data, lookup);
  assert.ok(races.some((r) => r.id === 'us-senate'));
  assert.ok(races.some((r) => r.id === 'us-house-22'));
  assert.ok(!races.some((r) => r.category === 'us_house' && r.district !== '22'));
  assert.ok(races.some((r) => /Supreme Court/.test(r.office)));
  assert.ok(races.some((r) => /Court of Criminal Appeals/.test(r.office)));
  assert.ok(races.some((r) => r.office === 'County Judge' && r.county === 'Fort Bend'));
  assert.ok(!races.some((r) => r.category === 'judicial'));
  assert.ok(!races.some((r) => /Precinct|Constable|Justice of the Peace/.test(r.office)));
  assert.ok(otherCountyRaces.some((r) => /Commissioner Precinct/.test(r.office)));
  assert.ok(otherCountyRaces.every((r) => r.county === 'Fort Bend'));
  assert.ok(races.every((r, i) => !i || data.races.indexOf(races[i - 1]) < data.races.indexOf(r)));
  assert.equal(JSON.stringify(data), original);
});

test('join county names with countyKey including spaces, case and County suffix', () => {
  const expected = ballotForAddress(data, lookup);
  for (const county of ['fort bend', 'FortBend County', 'FORT BEND COUNTY']) {
    assert.deepEqual(ballotForAddress(data, { ...lookup, county }), expected);
  }
});

test('omit districts with no seat up and never substitute another district', () => {
  const existing = new Set(data.races.filter((r) => r.category === 'state_senate').map((r) => r.district));
  const noSeat = Array.from({ length: 31 }, (_, i) => String(i + 1)).find((district) => !existing.has(district));
  assert.ok(noSeat);
  const { races } = ballotForAddress(data, { ...lookup, districts: { ...lookup.districts, state_senate: noSeat } });
  assert.ok(!races.some((r) => r.category === 'state_senate'));
});

test('retain both regular races and unexpired-term specials for HD 93 and SD 22', () => {
  const { races } = ballotForAddress(data, { ...lookup, districts: { ...lookup.districts, state_house: '93', state_senate: '22' } });
  assert.ok(races.some((r) => r.id === 'state-house-93-unexpired'));
  assert.ok(races.some((r) => r.id === 'state-house-93'));
  assert.ok(races.some((r) => r.id === 'state-senate-22-unexpired'));
  assert.ok(!races.some((r) => ['state_house', 'state_senate'].includes(r.category) && !['93', '22'].includes(r.district)));
});

test('fail closed without a Texas/county lookup and never match null districts', () => {
  assert.deepEqual(ballotForAddress(data, null), { races: [], otherCountyRaces: [] });
  assert.deepEqual(ballotForAddress(data, { ...lookup, state: 'NY' }), { races: [], otherCountyRaces: [] });
  const { races } = ballotForAddress(data, { ...lookup, districts: {} });
  assert.ok(!races.some((r) => ['us_house', 'state_senate', 'state_house', 'state_board'].includes(r.category)));
});
