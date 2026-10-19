// OpenFEC enrichment runs only at data-build time. Never expose the API key in output.
const API = 'https://api.open.fec.gov/v1/candidates/';
const OFFICES = { us_senate: 'S', us_house: 'H' };
const PARTIES = { R: 'REP', D: 'DEM', L: 'LIB', G: 'GRE', I: 'IND' };
const TITLES = new Set(['jr', 'sr', 'ii', 'iii', 'iv', 'mr', 'mrs', 'ms', 'mx', 'dr', 'sen', 'rep', 'honorable']);

function tokens(name) {
  return name.normalize('NFKD').replace(/\p{M}/gu, '').toLowerCase()
    .replace(/[.'’]/g, '').replace(/[^a-z0-9]+/g, ' ').trim().split(/\s+/)
    .filter((word) => word && !TITLES.has(word));
}

function variants(name) {
  // Use either the filed given name or an explicitly quoted nickname, never inferred aliases.
  const nicknames = [...name.matchAll(/["“]([^"”]+)["”]/g)].map((m) => tokens(m[1]));
  const plain = tokens(name.replace(/["“][^"”]+["”]/g, ''));
  return [plain, ...nicknames.map((nickname) => [...nickname, ...plain.slice(1)])];
}

const compatibleToken = (a, b) => a === b || (Math.min(a.length, b.length) === 1 && a[0] === b[0]);

function compatibleGiven(a, b) {
  if (!a.length || !b.length || !compatibleToken(a[0], b[0])) return false;
  // Missing middle names are fine; conflicting middle names/initials are not.
  return a.slice(1, Math.min(a.length, b.length)).every((word, i) => compatibleToken(word, b[i + 1]));
}

export function namesMatch(ballotName, fecName) {
  const comma = fecName.indexOf(',');
  if (comma < 0) return variants(ballotName).some((a) => variants(fecName).some((b) => a.join('') === b.join('')));
  const surname = tokens(fecName.slice(0, comma)).join('');
  return variants(ballotName).some((ballot) => {
    // Compare complete surnames, including compound/hyphenated forms.
    for (let split = 1; split < ballot.length; split++) {
      if (ballot.slice(split).join('') !== surname) continue;
      if (variants(fecName.slice(comma + 1)).some((given) => compatibleGiven(ballot.slice(0, split), given))) return true;
    }
    return false;
  });
}

function sameRace(record, race, state) {
  const office = OFFICES[race.category];
  return record.state === state && record.office === office &&
    new RegExp(`^${office}\\d${state}\\d{5}$`).test(record.candidate_id) &&
    (office !== 'H' || Number(record.district) === Number(race.district));
}

export function matchCandidate(candidate, race, state, records) {
  let matches = records.filter((record) => sameRace(record, race, state) && namesMatch(candidate.ballotName, record.name));
  matches = [...new Map(matches.map((record) => [record.candidate_id, record])).values()];
  if (matches.length > 1 && PARTIES[candidate.party]) {
    const partyMatches = matches.filter((record) => record.party === PARTIES[candidate.party]);
    if (partyMatches.length) matches = partyMatches;
  }
  return matches.length === 1
    ? { fecId: matches[0].candidate_id, reason: null }
    : { fecId: null, reason: matches.length ? `ambiguous: ${matches.map((m) => m.candidate_id).join(', ')}` : 'no matching office/state/district/name' };
}

export async function fetchFecCandidates(state, year, offices, { fetchImpl = fetch, apiKey = process.env.FEC_API_KEY || 'DEMO_KEY' } = {}) {
  const records = [];
  for (const office of new Set(offices)) {
    let pages = 1;
    for (let page = 1; page <= pages; page++) {
      const url = new URL(API);
      for (const [key, value] of Object.entries({ api_key: apiKey, state, office, election_year: year, per_page: 100, page })) {
        url.searchParams.set(key, value);
      }
      // Don't print fetch errors or request URLs: either could contain the API key.
      let response;
      try { response = await fetchImpl(url); } catch { throw new Error(`OpenFEC network failure (${state}/${office}, page ${page})`); }
      if (!response.ok) throw new Error(`OpenFEC HTTP ${response.status} (${state}/${office}, page ${page}); retry later or set FEC_API_KEY`);
      const data = await response.json();
      if (!Array.isArray(data.results) || !Number.isInteger(data.pagination?.pages) || data.pagination.pages < 0) {
        throw new Error(`Invalid OpenFEC response (${state}/${office}, page ${page})`);
      }
      pages = data.pagination.pages;
      records.push(...data.results);
    }
  }
  return records;
}

export async function resolveFecIds(races, { state, year, overrides = {}, fetchImpl = fetch, log = console.log } = {}) {
  const federal = races.filter((race) => OFFICES[race.category]);
  const records = await fetchFecCandidates(state, year, federal.map((race) => OFFICES[race.category]), { fetchImpl });
  let matched = 0;
  let total = 0;
  const unresolved = [];
  for (const race of races) {
    for (const candidate of race.candidates) {
      candidate.fecId = null;
      if (!OFFICES[race.category]) continue;
      total++;
      const override = overrides[race.id]?.[candidate.ballotName];
      let result = matchCandidate(candidate, race, state, records);
      if (override) {
        // Overrides must cite the exact fec.gov page and agree with the queried race.
        if (override.source !== `https://www.fec.gov/data/candidate/${override.fecId}/` ||
            !records.some((record) => record.candidate_id === override.fecId && sameRace(record, race, state))) {
          throw new Error(`Invalid FEC override: ${race.id} / ${candidate.ballotName}`);
        }
        result = { fecId: override.fecId, reason: null };
      }
      candidate.fecId = result.fecId;
      if (result.fecId) matched++;
      else unresolved.push(`${race.id} / ${candidate.ballotName}: ${result.reason}`);
    }
  }
  log(`FEC match report (${state}, ${year}): ${matched}/${total} matched; ${total - matched} unresolved`);
  unresolved.forEach((line) => log(`  ${line}`));
  return { matched, total, unresolved };
}
