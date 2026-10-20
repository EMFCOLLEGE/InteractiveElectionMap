import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';
import { createHandler } from '../api/lookup.js';
import { assignDistricts, loadDistricts } from '../server/lib/districts.js';
import { lookupAddress, LookupError } from '../server/lib/lookup.js';

const addresses = JSON.parse(await readFile(new URL('./fixtures/tx-addresses.json', import.meta.url), 'utf8'));
const publicPlace = addresses[0];
const match = {
  matchedAddress: publicPlace.matchedAddress,
  coordinates: { x: publicPlace.lng, y: publicPlace.lat },
  addressComponents: { state: 'TX' },
  geographies: { States: [{ STATE: '48' }], Counties: [{ STATE: '48', NAME: `${publicPlace.county} County` }],
    // Deliberately wrong Census district: assignments MUST use TLC geometry.
    '119th Congressional Districts': [{ CD119: '99' }] },
};
const census = (matches = [match]) => ({ result: { addressMatches: matches } });
const mockFetch = (payload) => async () => ({ ok: true, json: async () => payload });

for (const location of addresses) test(`assign official TLC districts at ${location.name}`, async () => {
  const { layers } = await loadDistricts();
  assert.deepEqual(assignDistricts(location.lng, location.lat, layers), location.expected);
});

test('reject points outside mapped coverage and ambiguous shared boundaries', async () => {
  const { layers } = await loadDistricts();
  assert.throws(() => assignDistricts(-74, 40, layers), { code: 'DISTRICT_NOT_FOUND' });
  const box = (west, east, district) => ({ type: 'Feature', bbox: [west, 0, east, 1], properties: { district },
    geometry: { type: 'Polygon', coordinates: [[[west, 0], [east, 0], [east, 1], [west, 1], [west, 0]]] } });
  assert.throws(() => assignDistricts(1, .5, { us_house: { features: [box(0, 1, '1'), box(1, 2, '2')] } }), { code: 'DISTRICT_AMBIGUOUS' });
});

test('lookup uses Census only for location/county and TLC for districts', async () => {
  let request;
  const fetchImpl = async (url, init) => {
    request = { url, init };
    return { ok: true, json: async () => census() };
  };
  const result = await lookupAddress(publicPlace.address, { fetchImpl });
  assert.deepEqual(result.districts, publicPlace.expected);
  assert.equal(result.county, publicPlace.county);
  assert.equal(result.state, 'TX');
  assert.equal(result.plans.us_house.plan, 'PLANC2333');
  assert.equal(request.url.searchParams.get('benchmark'), 'Public_AR_Current');
  assert.equal(request.url.searchParams.get('vintage'), 'Current_Current');
  assert.ok(request.init.signal instanceof AbortSignal);
});

test('validate empty, ZIP-only, and oversized inputs before fetching', async () => {
  const fetchImpl = async () => { assert.fail('should not call Census'); };
  for (const [address, code] of [[undefined, 'MISSING_ADDRESS'], ['', 'MISSING_ADDRESS'], ['77002', 'STREET_ADDRESS_REQUIRED'], ['77002-1234', 'STREET_ADDRESS_REQUIRED'], ['x'.repeat(301), 'INVALID_ADDRESS']]) {
    await assert.rejects(lookupAddress(address, { fetchImpl }), { code });
  }
});

test('return distinct no-match, ambiguous, non-Texas and malformed upstream errors', async () => {
  for (const [payload, code] of [[census([]), 'NO_MATCH'], [census([match, match]), 'AMBIGUOUS_ADDRESS'],
    [census([{ ...match, addressComponents: { state: 'NY' }, geographies: { States: [{ STATE: '36' }] } }]), 'NOT_TEXAS'],
    [{}, 'UPSTREAM_FAILURE'], [census([{ ...match, coordinates: {} }]), 'UPSTREAM_FAILURE']]) {
    await assert.rejects(lookupAddress(publicPlace.address, { fetchImpl: mockFetch(payload) }), { code });
  }
  await assert.rejects(lookupAddress(publicPlace.address, { fetchImpl: async () => ({ ok: false }) }), { code: 'UPSTREAM_FAILURE' });
  await assert.rejects(lookupAddress(publicPlace.address, { fetchImpl: async () => { throw new Error('upstream address detail'); } }), { code: 'UPSTREAM_FAILURE' });
});

test('abort a stalled Census request with a timeout', async () => {
  const fetchImpl = (url, { signal }) => new Promise((resolve, reject) => {
    signal.addEventListener('abort', () => reject(signal.reason), { once: true });
    // Keep the test alive long enough for AbortSignal.timeout (which is unrefed).
    const timer = setTimeout(resolve, 100);
    signal.addEventListener('abort', () => clearTimeout(timer), { once: true });
  });
  await assert.rejects(lookupAddress(publicPlace.address, { fetchImpl, timeoutMs: 5 }), { code: 'UPSTREAM_FAILURE' });
});

function response() {
  return { headers: {}, setHeader(key, value) { this.headers[key] = value; }, status(code) { this.statusCode = code; return this; }, json(body) { this.body = body; return this; } };
}

test('API accepts POST JSON, disables caching, and never returns the raw request on error', async () => {
  const handler = createHandler(async (address) => { assert.equal(address, publicPlace.address); return { state: 'TX' }; });
  const res = response();
  await handler({ method: 'POST', body: JSON.stringify({ address: publicPlace.address }) }, res);
  assert.equal(res.statusCode, 200);
  assert.deepEqual(res.body, { state: 'TX' });
  assert.equal(res.headers['Cache-Control'], 'no-store, private');
  const bad = response();
  await createHandler(async () => { throw new Error('PRIVATE ADDRESS'); })({ method: 'POST', body: {} }, bad);
  assert.equal(bad.statusCode, 500);
  assert.deepEqual(bad.body, { error: { code: 'LOOKUP_UNAVAILABLE' } });
  const missing = response();
  await createHandler(async () => { throw new LookupError('MISSING_ADDRESS', 400); })({ method: 'POST', body: {} }, missing);
  assert.equal(missing.statusCode, 400);
});

test('API rejects GET and malformed JSON without invoking lookup', async () => {
  const handler = createHandler(async () => assert.fail('must not invoke lookup'));
  const get = response(); await handler({ method: 'GET', query: { address: 'unused' } }, get);
  assert.equal(get.statusCode, 405); assert.equal(get.headers.Allow, 'POST');
  const malformed = response(); await handler({ method: 'POST', body: '{' }, malformed);
  assert.equal(malformed.statusCode, 400);
});
