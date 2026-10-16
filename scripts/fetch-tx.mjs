// Fetches the Texas general election ballot from the Secretary of State's candidate
// information system and writes public/data/tx.json.
//
//   node scripts/fetch-tx.mjs
//
// Source UI: https://goelect.txelections.civixapps.com/ivis-cbp-ui/candidate-information
import { PARTY_NAMES, normalizeWebsite, slugify, titleCase, writeStateFile } from './lib/normalize.mjs';

const API = 'https://goelect.txelections.civixapps.com/api-ivis-cbp/api/cbp';
const SOURCE_UI = 'https://goelect.txelections.civixapps.com/ivis-cbp-ui/candidate-information';
const ELECTION_YEAR = 2026;
const ELECTION_NAME = '2026 NOVEMBER GENERAL ELECTION';
// Special elections held the same day (e.g. vacant legislative seats) are separate SOS elections.

// The API rejects requests without a browser-like user agent.
const HEADERS = {
  'User-Agent': 'Mozilla/5.0 (compatible; InteractiveElectionMap/1.0; +https://votermap.vercel.app)',
  Accept: 'application/json',
  'Content-Type': 'application/json',
};

async function getJson(url, init) {
  const res = await fetch(url, { headers: HEADERS, ...init });
  if (!res.ok) throw new Error(`${res.status} ${res.statusText} for ${url}`);
  return res.json();
}

const LEVELS = { FD: 'federal', SW: 'state', SR: 'state', CW: 'county', CR: 'county' };
const PARTY_CODES = new Set(['R', 'D', 'L', 'G', 'I', 'W']);

// Texas ballot party order (Tex. Elec. Code §52.091): parties by their share of the vote in the
// last gubernatorial election (R, then D in 2022), then other parties, independents, write-ins.
const PARTY_BALLOT_RANK = { R: 0, D: 1, L: 2, G: 3, O: 4, I: 5, W: 6 };

// Short, stable IDs for races that address lookup will match on.
const CATEGORY_ID_PREFIX = { us_senate: 'us-senate', us_house: 'us-house', state_senate: 'state-senate', state_house: 'state-house', state_board: 'sboe' };

// Map a raw office name to { category, district, office } for districted state and federal races.
function classifyOffice(rawOffice, officeType) {
  const name = rawOffice.replace(/\s*-\s*UNEXPIRED TERM$/, '').trim();
  let m;
  if (name === 'U. S. SENATOR') return { category: 'us_senate', district: null, office: 'U.S. Senator' };
  if ((m = name.match(/^U\. S\. REPRESENTATIVE DISTRICT (\d+)$/)))
    return { category: 'us_house', district: m[1], office: `U.S. Representative, District ${m[1]}` };
  if ((m = name.match(/^STATE SENATOR, DISTRICT (\d+)$/)))
    return { category: 'state_senate', district: m[1], office: `State Senator, District ${m[1]}` };
  if ((m = name.match(/^STATE REPRESENTATIVE DISTRICT (\d+)$/)))
    return { category: 'state_house', district: m[1], office: `State Representative, District ${m[1]}` };
  if ((m = name.match(/^MEMBER, STATE BOARD OF EDUCATION, DISTRICT (\d+)$/)))
    return { category: 'state_board', district: m[1], office: `State Board of Education, District ${m[1]}` };
  if (officeType === 'SW') return { category: 'statewide', district: null, office: titleCase(name) };
  if (officeType === 'SR') {
    // Courts of appeals, district judges, district attorneys.
    m = name.match(/(\d+(?:ST|ND|RD|TH)) (COURT OF APPEALS|JUDICIAL) DISTRICT/);
    return { category: 'judicial', district: m ? titleCase(`${m[1]} ${m[2]}`) : null, office: titleCase(name) };
  }
  return { category: 'county', district: null, office: titleCase(name) };
}

function toCandidate(row) {
  const writeIn = row.cdParty === 'W' || row.cdCandType === 'WRTIN';
  const party = writeIn ? 'W' : PARTY_CODES.has(row.cdParty) ? row.cdParty : 'O';
  return {
    name: titleCase(row.txFullNameBallot),
    ballotName: row.txFullNameBallot.trim(),
    party,
    partyName: PARTY_NAMES[party],
    incumbent: row.flIncmbntGen === true,
    writeIn,
    website: normalizeWebsite(row.txWebsiteUrl),
    occupation: row.txOccupation?.trim() ? titleCase(row.txOccupation) : null,
    sortKey: [PARTY_BALLOT_RANK[party], row.txLastNameBallot?.trim() ?? ''],
  };
}

function compareCandidates(a, b) {
  return a.sortKey[0] - b.sortKey[0] || a.sortKey[1].localeCompare(b.sortKey[1]) || a.name.localeCompare(b.name);
}

async function main() {
  const elections = await getJson(`${API}/getElectionsByYear/${ELECTION_YEAR}`);
  const election = elections.find((e) => e.txElectionName?.trim() === ELECTION_NAME);
  if (!election) throw new Error(`Election "${ELECTION_NAME}" not found`);

  const specials = elections.filter(
    (e) => e.dtElectionDate === election.dtElectionDate && /SPECIAL ELECTION/.test(e.txElectionName ?? ''),
  );

  const rows = [];
  for (const e of [election, ...specials]) {
    const result = await getJson(`${API}/findQualifiedCandidates`, {
      method: 'POST',
      body: JSON.stringify({ electionYear: ELECTION_YEAR, electionId: e.idElection, countyId: 0, source: 'TX' }),
    });
    const special = e !== election;
    rows.push(...result.map((r) => ({ ...r, special })));
  }

  // Only accepted filings; withdrawn, rejected, and ineligible candidates are excluded.
  const accepted = rows.filter((r) => r.cdDeclarationStatus === 'A');

  const races = new Map();
  for (const row of accepted) {
    const rawOffice = row.txOfficeName.trim();
    const level = LEVELS[row.cdOfficeType] ?? 'county';
    const county = level === 'county' && row.txCountyName ? titleCase(row.txCountyName) : null;
    // County offices are filed as "HARRIS - COUNTY ATTORNEY".
    const officeName = county ? rawOffice.replace(/^[A-Z .'-]+? - /, '') : rawOffice;
    const { category, district, office } = classifyOffice(officeName, row.cdOfficeType);
    const unexpiredTerm = row.special || /UNEXPIRED TERM$/.test(rawOffice);
    const base = CATEGORY_ID_PREFIX[category] ? [CATEGORY_ID_PREFIX[category], district] : [county && `county-${county}`, office];
    const id = slugify([...base, unexpiredTerm && 'unexpired'].filter(Boolean).join(' '));

    if (!races.has(id)) races.set(id, { id, office, level, category, district, county, unexpiredTerm, candidates: [] });
    races.get(id).candidates.push(toCandidate(row));
  }

  for (const race of races.values()) {
    race.candidates.sort(compareCandidates);
    race.candidates.forEach((c) => delete c.sortKey);
  }

  const outPath = await writeStateFile('TX', {
    state: 'TX',
    stateName: 'Texas',
    election: {
      id: String(election.idElection),
      name: titleCase(election.txElectionName),
      date: election.dtElectionDate,
      type: 'general',
    },
    generatedAt: new Date().toISOString(),
    sources: [{ name: 'Texas Secretary of State – Candidate Information', url: SOURCE_UI }],
    specialElections: specials.map((e) => titleCase(e.txElectionName)),
    races: [...races.values()],
  });

  const candidates = [...races.values()].reduce((n, r) => n + r.candidates.length, 0);
  console.log(`Wrote ${outPath}: ${races.size} races, ${candidates} candidates (${rows.length - accepted.length} non-accepted filings skipped)`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
