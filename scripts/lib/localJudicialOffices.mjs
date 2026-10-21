// Parses who votes for judicial-district attorneys (Government Code chapter 43) and
// multicounty courts at law (chapter 25, subchapter D).
import { decode, splitCounties } from './judicialDistricts.mjs';

export { districtAttorneyKey, multicountyCourtKey } from '../../src/judicialOffice.js';

const ordinal = (n) => {
  const tens = n % 100;
  const suffix = tens >= 11 && tens <= 13 ? 'TH' : ({ 1: 'ST', 2: 'ND', 3: 'RD' })[n % 10] ?? 'TH';
  return `${n}${suffix}`;
};

// "Sec. 43.181. 268TH JUDICIAL DISTRICT. (a) The voters of the 268th Judicial District elect a district attorney."
// -> { section, judicialDistrict: '268' }, whose counties are chapter 24's.
// "Sec. 43.105. 9TH JUDICIAL DISTRICT. (a) The voters of Montgomery County elect a district attorney ..."
// -> { section, counties: ['Montgomery'] }.
export function parseDistrictAttorney(html, key) {
  const text = decode(html);
  const heading = new RegExp(`Sec\\. (43\\.\\d+[A-Z]?)\\. ${ordinal(Number(key))} JUDICIAL DISTRICT\\. `, 'g');
  const matches = [...text.matchAll(heading)];
  if (matches.length !== 1) throw new Error(`${ordinal(Number(key))} Judicial District: expected one ch. 43 section, found ${matches.length}`);
  const [m] = matches;
  const body = text.slice(m.index + m[0].length, m.index + m[0].length + 300);
  const voters = /^(?:\(a\) )?The voters of (?:the (\d+)(?:st|nd|rd|th) Judicial District|(.+?) count(?:y|ies)) elect a district attorney/i.exec(body);
  if (!voters) throw new Error(`Sec. ${m[1]}: no "The voters of ... elect a district attorney" clause`);
  if (voters[1]) {
    if (voters[1] !== key) throw new Error(`Sec. ${m[1]}: names the ${voters[1]} district, expected ${key}`);
    return { section: m[1], judicialDistrict: key };
  }
  return { section: m[1], counties: splitCounties(voters[2]) };
}

// "Sec. 25.2701. 1ST MULTICOUNTY COURT AT LAW (FISHER, MITCHELL, AND NOLAN COUNTIES). Fisher, Mitchell, and
// Nolan Counties have a multicounty statutory county court ..." -> { '1': { section, counties } }.
const COURT = /Sec\. (25\.\d+)\. (\d+)(?:ST|ND|RD|TH) MULTICOUNTY COURT AT LAW \(([^)]+)\)\. (.+?) Counties have a multicounty statutory county court/g;
export function parseMulticountyCourts(html) {
  const courts = {};
  for (const [, section, key, heading, body] of decode(html).matchAll(COURT)) {
    const counties = splitCounties(heading);
    if (splitCounties(body).join('|') !== counties.join('|')) throw new Error(`Sec. ${section}: heading and body disagree`);
    if (courts[key]) throw new Error(`Multicounty court ${key} defined twice`);
    courts[key] = { section, counties };
  }
  return courts;
}
