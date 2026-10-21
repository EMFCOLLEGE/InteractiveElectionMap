// Parses Texas Government Code chapter 24 into { districtKey: [county, ...] }.
// Each judicial district has a section headed like
// "Sec. 24.207. 105TH JUDICIAL DISTRICT (KENEDY, KLEBERG, AND NUECES COUNTIES)."
// followed by "(a) The 105th Judicial District is composed of Kenedy, Kleberg, and Nueces counties."
import { titleCase } from './normalize.mjs';

export { judicialDistrictKey } from '../../src/judicialOffice.js';

export const decode = (s) => s
  .replace(/<[^>]+>/g, ' ')
  .replace(/&nbsp;/g, ' ').replace(/&amp;/g, '&').replace(/&#(\d+);/g, (_, n) => String.fromCharCode(Number(n)))
  .replace(/\s+/g, ' ');

const HEADING = /(Text of section effective (?:until|on) [A-Za-z]+ \d{2}, \d{4} )?Sec\. (24\.\d+[A-Z]?)\. (?:(\d+)(?:ST|ND|RD|TH) JUDICIAL DISTRICT|JUDICIAL DISTRICT (\d+-A)) \(([^)]*)\)\./g;

export const splitCounties = (list) => list
  .replace(/ COUNT(?:Y|IES)$/i, '')
  .split(/,? AND |, /i)
  .map((name) => titleCase(name.trim()));

// "105th" -> "105", "1-A" -> "1a", the same keys judicialDistrictKey gives SOS office names.
export const districtKey = (raw) => raw.replace('-', '').toLowerCase();

export function parseJudicialDistricts(html) {
  const text = decode(html);
  const districts = {};
  const skipped = [];
  for (const m of text.matchAll(HEADING)) {
    const [, version, section, ordinal, lettered, heading] = m;
    const key = districtKey(ordinal ?? lettered);
    // A future version ("effective on January 01, 2027") isn't law yet.
    if (version?.includes('effective on')) { skipped.push({ key, section, reason: version.trim() }); continue; }
    const counties = splitCounties(heading);
    const body = text.slice(m.index + m[0].length, m.index + m[0].length + 400);
    const composed = /is composed of (.+?count(?:y|ies))/i.exec(body);
    if (!composed) throw new Error(`Sec. ${section}: no "is composed of" clause`);
    const bodyCounties = splitCounties(composed[1]);
    if (bodyCounties.join('|') !== counties.join('|')) {
      throw new Error(`Sec. ${section}: heading (${counties}) and body (${bodyCounties}) disagree`);
    }
    if (districts[key]) throw new Error(`District ${key} defined twice (Sec. ${districts[key].section} and ${section})`);
    districts[key] = { section, counties };
  }
  return { districts, skipped };
}
