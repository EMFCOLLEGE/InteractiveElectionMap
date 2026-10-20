// "District Judge, 105th Judicial District" -> "105"; "District Judge, Judicial District 1a" -> "1a".
// Keys match TX_JUDICIAL_DISTRICTS in txJudicialDistricts.js.
export function judicialDistrictKey(office) {
  const m = /^District Judge, (?:(\d+)(?:st|nd|rd|th) Judicial District|Judicial District (\d+-?[a-z]))$/i.exec(office);
  return m ? (m[1] ?? m[2]).replace('-', '').toLowerCase() : null;
}
