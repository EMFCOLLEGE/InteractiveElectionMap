import { countyKey } from './states.js';
import { appealsDistrictKey, districtAttorneyKey, judicialDistrictKey, multicountyCourtKey } from './judicialOffice.js';
import { TX_APPEALS_DISTRICTS } from './txAppealsDistricts.js';
import { TX_JUDICIAL_DISTRICTS } from './txJudicialDistricts.js';
import { TX_DISTRICT_ATTORNEYS, TX_MULTICOUNTY_COURTS } from './txLocalJudicialOffices.js';

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
// District courts: every voter in each county of the judicial district votes (Gov't Code ch. 24).
const inJudicialDistrict = (office, county) =>
  (TX_JUDICIAL_DISTRICTS[judicialDistrictKey(office)] ?? []).some((c) => countyKey(c) === countyKey(county));
// Courts of appeals: every voter in each county of the district votes (Gov't Code 22.201).
// A county can sit in two districts, and the 15th covers the whole state.
const inAppealsDistrict = (office, county) => {
  const counties = TX_APPEALS_DISTRICTS[appealsDistrictKey(office)];
  return counties === 'all' || (counties ?? []).some((c) => countyKey(c) === countyKey(county));
};
// Judicial-district attorneys (Gov't Code ch. 43) and multicounty courts at law (ch. 25, subch. D).
const inCounties = (counties, county) => (counties ?? []).some((c) => countyKey(c) === countyKey(county));
const inLocalJudicial = (office, county) =>
  inCounties(TX_DISTRICT_ATTORNEYS[districtAttorneyKey(office)], county) ||
  inCounties(TX_MULTICOUNTY_COURTS[multicountyCourtKey(office)], county);
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
    if (race.category === 'judicial') {
      return countyKey(judicialCounty(race.office)) === countyKey(lookup.county) ||
        inJudicialDistrict(race.office, lookup.county) || inAppealsDistrict(race.office, lookup.county) ||
        inLocalJudicial(race.office, lookup.county);
    }
    return false;
  });
  return { races, otherCountyRaces };
}
