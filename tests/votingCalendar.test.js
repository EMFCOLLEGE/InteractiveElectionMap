import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';
import { VOTING_INFO, keyDates, todayIn, votingStatus } from '../src/votingCalendar.js';

const tx = VOTING_INFO.TX;

test('Texas voting info matches the election in tx.json', async () => {
  const data = JSON.parse(await readFile(new URL('../public/data/tx.json', import.meta.url), 'utf8'));
  assert.equal(data.election.date.slice(0, 10), tx.electionDate);
  assert.ok(tx.registrationDeadline < tx.earlyVoting.start);
  assert.ok(tx.earlyVoting.start < tx.mailApplicationDeadline && tx.mailApplicationDeadline < tx.earlyVoting.end);
  assert.ok(tx.earlyVoting.end < tx.electionDate);
  assert.ok([...tx.links, tx.source, tx.datesSource].every((l) => l.url.startsWith('https://')));
});

test('status follows the voting calendar', () => {
  assert.equal(votingStatus(tx, '2026-10-01').phase, 'before');
  assert.equal(votingStatus(tx, '2026-10-19').phase, 'early');
  assert.match(votingStatus(tx, '2026-10-19').text, /through Fri, Oct 30/);
  assert.equal(votingStatus(tx, '2026-10-30').phase, 'early');
  assert.equal(votingStatus(tx, '2026-10-31').phase, 'between');
  assert.equal(votingStatus(tx, '2026-11-03').phase, 'election-day');
  assert.equal(votingStatus(tx, '2026-11-04').phase, 'over');
});

test('key dates are ordered and mark only past deadlines', () => {
  const dates = keyDates(tx, '2026-10-19');
  assert.deepEqual(dates.map((d) => d.passed), [true, false, false, false]);
  assert.equal(dates[0].when, 'Mon, Oct 5');
  assert.equal(dates[1].when, 'Mon, Oct 19 – Fri, Oct 30');
  assert.equal(dates[3].when, 'Tue, Nov 3, 7 a.m. to 7 p.m.');
  assert.ok(keyDates(tx, '2026-11-04').every((d) => d.passed));
});

test('today is computed in Texas time, not UTC', () => {
  // 11:30 p.m. Oct 18 in Austin is already Oct 19 in UTC.
  assert.equal(todayIn('America/Chicago', new Date('2026-10-19T04:30:00Z')), '2026-10-18');
});
