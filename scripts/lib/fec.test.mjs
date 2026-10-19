import assert from 'node:assert/strict';
import test from 'node:test';
import { fetchFecCandidates, matchCandidate, namesMatch, resolveFecIds } from './fec.mjs';

const race = { id: 'us-house-7', category: 'us_house', district: '7' };
const candidate = { ballotName: 'JOSÉ A. GREENE-SCOTT III', party: 'D', writeIn: true };
const record = { candidate_id: 'H6TX07151', name: 'GREENE SCOTT, JOSE ANTONIO', state: 'TX', office: 'H', district: '07', party: 'DEM' };

test('normalize accents, punctuation, middle initials, suffixes, and explicit nicknames', () => {
  assert.ok(namesMatch(candidate.ballotName, record.name));
  assert.ok(namesMatch('BRADFORD “BRAD” HALL', 'HALL, BRADFORD WINSTON'));
  assert.ok(namesMatch('BRADFORD "BRAD" HALL', 'HALL, BRAD'));
  assert.ok(namesMatch('ANGELA "HELI" RODRIGUEZ PRILLIMAN', 'RODRIGUEZ PRILLIMAN, ANGELA'));
  assert.ok(namesMatch('John O’Neil Jr.', "O'NEIL, JOHN"));
  assert.equal(namesMatch('JOSE B GREENE-SCOTT', record.name), false);
  assert.equal(namesMatch('KEN PAXTON', 'PAXTON, WARREN KENNETH JR.'), false);
  assert.equal(namesMatch('JOSE SCOTT', record.name), false);
});

test('require office/state/district, allow party differences and write-ins, reject ambiguity', () => {
  assert.equal(matchCandidate(candidate, race, 'TX', [{ ...record, party: 'IND' }]).fecId, record.candidate_id);
  for (const change of [{ state: 'GA' }, { office: 'S' }, { district: '8' }, { candidate_id: 'S6TX07151' }]) {
    assert.equal(matchCandidate(candidate, race, 'TX', [{ ...record, ...change }]).fecId, null);
  }
  const duplicate = { ...record, candidate_id: 'H6TX07169' };
  assert.equal(matchCandidate(candidate, race, 'TX', [record, duplicate]).fecId, null);
  assert.equal(matchCandidate(candidate, race, 'TX', [record, { ...duplicate, party: 'REP' }]).fecId, record.candidate_id);
  assert.equal(matchCandidate(candidate, race, 'TX', [record, record]).fecId, record.candidate_id);
  assert.equal(matchCandidate(candidate, race, 'TX', []).fecId, null);
});

test('query each office once with pagination and no per-candidate requests', async () => {
  const calls = [];
  const fetchImpl = async (url) => {
    calls.push(url);
    return { ok: true, json: async () => ({ results: [record], pagination: { pages: url.searchParams.get('office') === 'H' ? 2 : 1 } }) };
  };
  await fetchFecCandidates('TX', 2026, ['S', 'H', 'H'], { fetchImpl, apiKey: 'private-test-key' });
  assert.equal(calls.length, 3);
  assert.deepEqual(calls.map((u) => [u.searchParams.get('office'), u.searchParams.get('page')]), [['S', '1'], ['H', '1'], ['H', '2']]);
  calls.forEach((url) => {
    assert.equal(url.searchParams.get('state'), 'TX');
    assert.equal(url.searchParams.get('election_year'), '2026');
    assert.equal(url.searchParams.get('per_page'), '100');
  });
});

test('fail closed on API errors without printing secrets', async () => {
  await assert.rejects(fetchFecCandidates('TX', 2026, ['S'], {
    apiKey: 'private-test-key', fetchImpl: async () => { throw new Error('private-test-key'); },
  }), (error) => !error.message.includes('private-test-key'));
  await assert.rejects(fetchFecCandidates('TX', 2026, ['S'], {
    fetchImpl: async () => ({ ok: false, status: 429 }),
  }), /HTTP 429/);
});

test('set non-federal IDs to null, report unresolved candidates, validate overrides', async () => {
  const races = [{ ...race, candidates: [{ ...candidate }] }, { category: 'county', candidates: [{ ...candidate }] }];
  const fetchImpl = async () => ({ ok: true, json: async () => ({ results: [record], pagination: { pages: 1 } }) });
  const report = await resolveFecIds(races, { state: 'TX', year: 2026, fetchImpl, log: () => {} });
  assert.equal(report.matched, 1);
  assert.equal(report.total, 1);
  assert.equal(races[1].candidates[0].fecId, null);
  const unmatched = [{ ...race, candidates: [{ ballotName: 'OTHER PERSON' }] }];
  const missing = await resolveFecIds(unmatched, { state: 'TX', year: 2026, fetchImpl, log: () => {} });
  assert.equal(missing.unresolved.length, 1);
  assert.equal(unmatched[0].candidates[0].fecId, null);
  await assert.rejects(resolveFecIds(races, { state: 'TX', year: 2026, fetchImpl, overrides: {
    [race.id]: { [candidate.ballotName]: { fecId: record.candidate_id, source: 'https://example.com' } },
  } }), /Invalid FEC override/);
});
