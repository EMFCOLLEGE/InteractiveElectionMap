import { countyKey } from './states.js';

// County offices vs precinct offices: Texas Election Code 52.092(e)-(f).
// https://statutes.capitol.texas.gov/Docs/EL/htm/EL.52.htm#52.092
const COUNTYWIDE_OFFICES = new Set([
  'County Attorney', 'County Clerk', 'County Judge', 'County Surveyor',
  'County Tax Assessor-Collector', 'County Treasurer', 'County and District Clerk',
  'District Clerk', 'District and County Clerk', 'Sheriff', 'Sheriff/County Tax Assessor-Collector',
]);
const countywide = (office) => COUNTYWIDE_OFFICES.has(office) ||
  /^(?:Judge, )?(?:County (?:Civil |Criminal )?Court(?: of Appeals| at Law)?|(?:County )?Probate Court)(?: at Law)?(?: No\. \d+)?$/.test(office);
// Criminal district attorneys and criminal district courts named for one county
// ("Criminal District Attorney Bexar County", "Criminal District Judge, Dallas County Number 1").
const SINGLE_COUNTY_JUDICIAL = /^Criminal District (?:Attorney|Judge)(?:,| #\d+)? (.+?) County(?: Number \d+)?$/;
const judicialCounty = (office) => SINGLE_COUNTY_JUDICIAL.exec(office)?.[1] ?? null;
const DISTRICT_CATEGORIES = new Set(['us_house', 'state_senate', 'state_house', 'state_board']);
const districtKey = (value) => /^\d+$/.test(String(value)) ? String(Number(value)) : null;

export function ballotForAddress(data, lookup) {
  if (!data || lookup?.state !== 'TX' || data.state !== lookup.state || !countyKey(lookup.county)) {
    return { races: [], otherCountyRaces: [] };
  }
  const otherCountyRaces = [];
  const races = data.races.filter((race) => {
    if (race.category === 'us_senate' || race.category === 'statewide') return true;
    if (DISTRICT_CATEGORIES.has(race.category)) {
      const district = districtKey(lookup.districts?.[race.category]);
      return district !== null && districtKey(race.district) === district;
    }
    if (race.category === 'county' && countyKey(race.county) === countyKey(lookup.county)) {
      if (countywide(race.office)) return true;
      // A county match does not establish precinct eligibility. Keep these separate.
      otherCountyRaces.push(race);
    }
    if (race.category === 'judicial' && countyKey(judicialCounty(race.office)) === countyKey(lookup.county)) {
      return true;
    }
    // Other judicial districts overlap counties and need a separate authoritative mapping.
    return false;
  });
  return { races, otherCountyRaces };
}
