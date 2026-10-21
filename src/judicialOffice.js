// "District Judge, 105th Judicial District" -> "105"; "District Judge, Judicial District 1a" -> "1a".
// Keys match TX_JUDICIAL_DISTRICTS in txJudicialDistricts.js.
export function judicialDistrictKey(office) {
  const m = /^District Judge, (?:(\d+)(?:st|nd|rd|th) Judicial District|Judicial District (\d+-?[a-z]))$/i.exec(office);
  return m ? (m[1] ?? m[2]).replace('-', '').toLowerCase() : null;
}

// "Justice, 1st Court of Appeals District, Place 3" or "Chief Justice, 15th Court of Appeals District" -> "1" / "15".
// Keys match TX_APPEALS_DISTRICTS in txAppealsDistricts.js.
export function appealsDistrictKey(office) {
  return /^(?:Chief )?Justice, (\d+)(?:st|nd|rd|th) Court of Appeals District(?:, Place \d+)?$/.exec(office)?.[1] ?? null;
}

// "District Attorney, 268th Judicial District" -> "268". Keys match TX_DISTRICT_ATTORNEYS.
export function districtAttorneyKey(office) {
  return /^District Attorney, (\d+)(?:st|nd|rd|th) Judicial District$/.exec(office)?.[1] ?? null;
}

// "1st Multicounty Court at Law" -> "1". Keys match TX_MULTICOUNTY_COURTS.
export function multicountyCourtKey(office) {
  return /^(\d+)(?:st|nd|rd|th) Multicounty Court at Law$/.exec(office)?.[1] ?? null;
}
