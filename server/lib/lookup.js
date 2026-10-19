import { assignDistricts, DistrictError, loadDistricts } from './districts.js';

export class LookupError extends Error {
  constructor(code, status) { super(code); this.code = code; this.status = status; }
}

export async function lookupAddress(address, { fetchImpl = fetch, load = loadDistricts, timeoutMs = 12000 } = {}) {
  if (typeof address !== 'string' || !address.trim()) throw new LookupError('MISSING_ADDRESS', 400);
  address = address.trim();
  if (address.length > 300 || [...address].some((character) => character.charCodeAt(0) < 32)) throw new LookupError('INVALID_ADDRESS', 400);
  if (/^\d{5}(?:-\d{4})?$/.test(address)) throw new LookupError('STREET_ADDRESS_REQUIRED', 400);

  const url = new URL('https://geocoding.geo.census.gov/geocoder/geographies/onelineaddress');
  for (const [key, value] of Object.entries({ address, benchmark: 'Public_AR_Current', vintage: 'Current_Current', format: 'json' })) url.searchParams.set(key, value);
  let payload;
  try {
    const response = await fetchImpl(url, { signal: AbortSignal.timeout(timeoutMs) });
    if (!response.ok) throw new Error('Census failure');
    payload = await response.json();
  } catch {
    // Do not log errors or upstream URLs: they may contain a private address.
    throw new LookupError('UPSTREAM_FAILURE', 502);
  }
  const matches = payload?.result?.addressMatches;
  if (!Array.isArray(matches)) throw new LookupError('UPSTREAM_FAILURE', 502);
  if (!matches.length) throw new LookupError('NO_MATCH', 404);
  if (matches.length !== 1) throw new LookupError('AMBIGUOUS_ADDRESS', 422);
  const match = matches[0];
  const states = match.geographies?.States;
  const counties = match.geographies?.Counties;
  if (!Array.isArray(states) || states.length !== 1) throw new LookupError('UPSTREAM_FAILURE', 502);
  if (states[0].STATE !== '48' || match.addressComponents?.state !== 'TX') throw new LookupError('NOT_TEXAS', 422);
  const { x: lng, y: lat } = match.coordinates ?? {};
  if (!Array.isArray(counties) || counties.length !== 1 || counties[0].STATE !== '48' ||
      typeof counties[0].NAME !== 'string' || !match.matchedAddress || !Number.isFinite(lng) || !Number.isFinite(lat)) {
    throw new LookupError('UPSTREAM_FAILURE', 502);
  }
  const { manifest, layers } = await load();
  let districts;
  try { districts = assignDistricts(lng, lat, layers); } catch (error) {
    if (error instanceof DistrictError) throw new LookupError(error.code, 422);
    throw error;
  }
  return {
    matchedAddress: match.matchedAddress, lat, lng, state: 'TX',
    county: counties[0].NAME.replace(/ County$/i, ''), districts,
    plans: Object.fromEntries(Object.entries(manifest.plans).map(([category, { plan, dataset, source }]) => [category, { plan, url: dataset, source }])),
  };
}
