// Parses Texas Government Code section 22.201 into { districtKey: [county, ...] | 'all' }.
// Each subsection reads like "(b) The First Court of Appeals District is composed of the counties of Austin, ..., and Washington."
// The Fifteenth is "composed of all counties in this state."
import { decode } from './judicialDistricts.mjs';

export { appealsDistrictKey } from '../../src/judicialOffice.js';

export const ALL_COUNTIES = 'all';
const ORDINALS = ['First', 'Second', 'Third', 'Fourth', 'Fifth', 'Sixth', 'Seventh', 'Eighth', 'Ninth', 'Tenth',
  'Eleventh', 'Twelfth', 'Thirteenth', 'Fourteenth', 'Fifteenth'];
// Names are already in proper case here ("DeWitt", "McLennan"), unlike chapter 24's uppercase headings.
const splitCounties = (list) => list.split(/,? and |, /).map((name) => name.trim());
const SUBSECTION = /\([a-z]\) The (\w+) Court of Appeals District is composed of (?:the counties of (.+?)|(all counties in this state))\./g;

export function parseAppealsDistricts(html) {
  const text = decode(html);
  const starts = [...text.matchAll(/Sec\. 22\.201\. COURTS OF APPEALS DISTRICTS\./g)];
  if (starts.length !== 1) throw new Error(`Expected one Sec. 22.201, found ${starts.length}`);
  const end = text.indexOf('Sec. 22.202.', starts[0].index);
  const section = text.slice(starts[0].index, end === -1 ? undefined : end);
  const count = /organized into (\d+) courts of appeals districts/.exec(section)?.[1];
  if (!count) throw new Error('Sec. 22.201: no district count');
  const districts = {};
  for (const [, ordinal, list, all] of section.matchAll(SUBSECTION)) {
    const n = ORDINALS.indexOf(ordinal) + 1;
    if (!n) throw new Error(`Sec. 22.201: unknown ordinal "${ordinal}"`);
    if (districts[n]) throw new Error(`Sec. 22.201: district ${n} defined twice`);
    districts[n] = all ? ALL_COUNTIES : splitCounties(list);
  }
  const keys = Object.keys(districts);
  if (keys.length !== Number(count)) throw new Error(`Sec. 22.201 says ${count} districts, parsed ${keys.length}`);
  return districts;
}
