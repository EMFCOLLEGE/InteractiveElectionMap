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
  assert.ok(races.some((r) => r.office === 'District Judge, 240th Judicial District'));
  assert.ok(races.some((r) => r.office === 'Chief Justice, 14th Court of Appeals District'));
  const appeals = races.map((r) => /^(?:Chief )?Justice, (\d+)\w\w Court of Appeals/.exec(r.office)?.[1]).filter(Boolean);
  assert.deepEqual([...new Set(appeals)], ['1', '14', '15']);
  assert.deepEqual(races.filter((r) => /^District Attorney,/.test(r.office)).map((r) => r.office), ['District Attorney, 268th Judicial District']);
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

test('include criminal district attorney and court races named for the county only', () => {
  const judicial = (county) => ballotForAddress(data, { ...lookup, county }).races
    .filter((r) => r.category === 'judicial').map((r) => r.office);
  const bexar = judicial('Bexar County');
  assert.ok(bexar.includes('Criminal District Attorney Bexar County'));
  assert.ok(bexar.every((o) => /Bexar County|^District Judge, |Court of Appeals District/.test(o)));
  const dallas = judicial('Dallas');
  assert.ok(dallas.includes('Criminal District Attorney Dallas County'));
  assert.ok(dallas.filter((o) => /^Criminal District Judge,? Dallas County Number \d+$/.test(o)).length >= 4);
  assert.ok(dallas.every((o) => /Dallas County|^District Judge, |Court of Appeals District/.test(o)));
  const tarrant = judicial('Tarrant County');
  assert.ok(tarrant.includes('Criminal District Attorney Tarrant County'));
  assert.ok(tarrant.some((o) => /^Criminal District Judge #\d+ Tarrant County$/.test(o)));
  assert.ok(judicial('Jefferson').includes('Criminal District Judge Jefferson County'));
  assert.ok(!judicial('Fort Bend County').some((o) => /^Criminal District/.test(o)));
});

test('include district judges for every county in the judicial district, and no others', async () => {
  const { TX_JUDICIAL_DISTRICTS } = await import('../src/txJudicialDistricts.js');
  const judges = (county) => ballotForAddress(data, { ...lookup, county }).races
    .filter((r) => r.office.startsWith('District Judge')).map((r) => r.office);
  // 424th: Blanco, Burnet, Llano, and San Saba counties (Gov't Code 24.568).
  assert.deepEqual(TX_JUDICIAL_DISTRICTS['424'], ['Blanco', 'Burnet', 'Llano', 'San Saba']);
  for (const county of ['Blanco', 'Burnet', 'Llano', 'San Saba']) {
    assert.ok(judges(county).includes('District Judge, 424th Judicial District'), county);
  }
  assert.ok(!judges('Travis').includes('District Judge, 424th Judicial District'));
  // Judicial District 1-A: Jasper, Newton, and Tyler counties (Gov't Code 24.351).
  assert.ok(judges('Tyler').includes('District Judge, Judicial District 1a'));
  assert.ok(!judges('Sabine').includes('District Judge, Judicial District 1a'));
  // Single-county districts never leak into neighbors.
  const harris = judges('Harris');
  assert.ok(harris.length > 20 && harris.every((o) => TX_JUDICIAL_DISTRICTS[o.match(/(\d+)/)[1]].includes('Harris')));
  assert.ok(!judges('Fort Bend').some((o) => harris.includes(o)));
  // Every District Judge race on the ballot reaches the voters of at least one county.
  const counties = [...new Set(data.races.filter((r) => r.county).map((r) => r.county))];
  const reached = new Set(counties.flatMap(judges));
  const all = data.races.filter((r) => r.office.startsWith('District Judge')).map((r) => r.office);
  assert.equal(all.length, 269);
  assert.deepEqual(all.filter((o) => !reached.has(o)), []);
});

test('include court of appeals races for every county in the district, including overlaps', () => {
  const appeals = (county) => ballotForAddress(data, { ...lookup, county }).races
    .filter((r) => /Court of Appeals District/.test(r.office)).map((r) => r.office);
  const districts = (county) => [...new Set(appeals(county).map((o) => o.match(/(\d+)\w\w Court/)[1]))].sort((a, b) => a - b);
  // Gov't Code 22.201: Harris is in the 1st and 14th; Travis the 3rd; the 15th is statewide.
  assert.deepEqual(districts('Harris County'), ['1', '14', '15']);
  assert.deepEqual(districts('Travis'), ['3', '15']);
  assert.deepEqual(districts('Loving'), ['8', '15']);
  // Hunt is in both the 5th and 6th; Gregg in both the 6th and 12th.
  assert.deepEqual(districts('Hunt'), ['5', '6', '15']);
  assert.deepEqual(districts('Gregg'), ['6', '12', '15']);
  assert.ok(appeals('Harris').includes('Justice, 1st Court of Appeals District, Place 3'));
  assert.ok(appeals('Harris').includes('Chief Justice, 14th Court of Appeals District'));
  // County criminal courts of appeals are county offices, not courts of appeals districts.
  assert.ok(!appeals('Dallas').some((o) => /County Criminal/.test(o)));
  // Every court of appeals race reaches some county.
  const counties = [...new Set(data.races.filter((r) => r.county).map((r) => r.county))];
  const reached = new Set(counties.flatMap(appeals));
  assert.equal(reached.size, data.races.filter((r) => r.category === 'judicial' && /Court of Appeals District/.test(r.office)).length);
  assert.equal(reached.size, 25);
});

test('include judicial-district attorneys and multicounty courts for their counties only', () => {
  const offices = (county) => ballotForAddress(data, { ...lookup, county }).races.map((r) => r.office);
  const das = (county) => offices(county).filter((o) => o.startsWith('District Attorney,'));
  // Gov't Code 43.105: the voters of Montgomery County elect the 9th Judicial District attorney.
  assert.deepEqual(das('Montgomery'), ['District Attorney, 9th Judicial District']);
  // 43.117: the voters of the 31st Judicial District (Gray, Hemphill, Lipscomb, Roberts, Wheeler, per 24.133).
  for (const county of ['Gray', 'Hemphill', 'Lipscomb', 'Roberts', 'Wheeler']) {
    assert.deepEqual(das(county), ['District Attorney, 31st Judicial District'], county);
  }
  assert.deepEqual(das('Harris'), []);
  // 25.2701: Fisher, Mitchell, and Nolan counties compose the 1st Multicounty Court at Law.
  for (const county of ['Fisher', 'Mitchell', 'Nolan']) assert.ok(offices(county).includes('1st Multicounty Court at Law'), county);
  assert.ok(!offices('Scurry').includes('1st Multicounty Court at Law'));
  // Every judicial race on the ballot now reaches the voters of at least one county.
  const counties = [...new Set(data.races.filter((r) => r.county).map((r) => r.county))];
  const reached = new Set(counties.flatMap(offices));
  assert.deepEqual(data.races.filter((r) => r.category === 'judicial' && !reached.has(r.office)).map((r) => r.office), []);
});
