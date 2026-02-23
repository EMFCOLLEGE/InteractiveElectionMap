// src/useCandidates.js
import { useState, useEffect } from 'react';

const officeMapping = {
  "GOVERNOR": "gov",
  "LIEUTENANT GOVERNOR": "lt_gov",
  "ATTORNEY GENERAL": "ag",
  "U. S. SENATOR": "senator" 
};

export function useCandidates() {
  const [candidatesData, setCandidatesData] = useState(null);
  const [dynamicCountyPositions, setDynamicCountyPositions] = useState({});
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // 1. PUT ALL YOUR RAW GIST URLS IN THIS ARRAY
    const gistUrls = [
      'https://raw.githubusercontent.com/EMFCOLLEGE/Texas-Election-API/refs/heads/main/DemCandidates2026.json',
      'https://raw.githubusercontent.com/EMFCOLLEGE/Texas-Election-API/refs/heads/main/RepCandidates2026.json'
      // You can add as many URLs as you want here!
    ];

    // 2. FETCH ALL URLS SIMULTANEOUSLY
    Promise.all(gistUrls.map(url => fetch(url).then(res => res.json())))
      .then(results => {
        // results is an array of arrays (e.g., [demArray, repArray])
        // 3. MERGE THEM ALL INTO ONE MASSIVE LIST
        const apiData = results.flat(); 

        const generatedCandidatesData = {
          gov: { current: [], candidates: [] },
          lt_gov: { current: [], candidates: [] },
          ag: { current: [], candidates: [] },
          senator: { current: [], candidates: [] }
        };
        const generatedDynamicCountyPositions = {};

        // Hardcode Current State Incumbents
        generatedCandidatesData.gov.current.push({ name: 'Greg Abbott', party: 'Rep', website: 'https://gregabbott.com/', openSecrets: 'https://www.opensecrets.org/officeholders/greg-abbott/summary?id=11484190', photoUrl: 'https://upload.wikimedia.org/wikipedia/commons/d/db/Greg_Abbott_at_NASA_2024_%28cropped%29.jpg' });
        generatedCandidatesData.lt_gov.current.push({ name: 'Dan Patrick', party: 'Rep', website: 'https://www.danpatrick.org/', openSecrets: 'https://www.opensecrets.org/search?q=Dan+Patrick&type=site', photoUrl: 'https://ui-avatars.com/api/?name=Dan+Patrick&background=random&color=fff&size=150' });
        generatedCandidatesData.ag.current.push({ name: 'Ken Paxton', party: 'Rep', website: 'https://kenpaxton.com/', openSecrets: 'https://www.opensecrets.org/search?q=Ken+Paxton&type=site', photoUrl: 'https://ui-avatars.com/api/?name=Ken+Paxton&background=random&color=fff&size=150' });
        generatedCandidatesData.senator.current.push({ name: 'John Cornyn', party: 'Rep', website: 'https://www.johncornyn.com/', openSecrets: 'https://www.opensecrets.org/search?q=John+Cornyn&type=site', photoUrl: 'https://ui-avatars.com/api/?name=John+Cornyn&background=random&color=fff&size=150' });

        const formatCountyName = (name) => name ? name.split(' ').map(w => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase()).join(' ') : "";

        // ... THE REST OF YOUR LOGIC STAYS EXACTLY THE SAME!
        // (Keep the apiData.forEach loop and everything below it)
        // Process the API Data
        apiData.forEach(row => {
          const rawOffice = row.txOfficeName?.trim() || "";
          const rawCounty = row.txCountyName?.trim() || "";
          const party = row.cdParty === 'D' ? 'Dem' : row.cdParty === 'R' ? 'Rep' : 'Other';

          if (rawCounty === "STATEWIDE" || rawCounty === "DISTRICT" || rawCounty === "ALL" || !rawCounty) {
            const positionId = officeMapping[rawOffice];
            if (positionId && generatedCandidatesData[positionId]) {
              generatedCandidatesData[positionId].candidates.push({
                name: row.txFullNameBallot,
                party: party,
                website: row.txEmail ? `mailto:${row.txEmail}` : '#',
                openSecrets: `https://www.opensecrets.org/search?q=${row.txFirstNameBallot}+${row.txLastNameBallot}&type=site`,
                photoUrl: `https://ui-avatars.com/api/?name=${row.txFirstNameBallot}+${row.txLastNameBallot}&background=random&color=fff&size=150`
              });
            }
          } else {
            const countyName = formatCountyName(rawCounty);
            const positionId = `${countyName}_${rawOffice.replace(/\s+/g, '_')}`;

            if (!generatedDynamicCountyPositions[countyName]) {
              generatedDynamicCountyPositions[countyName] = [];
            }
            
            if (!generatedDynamicCountyPositions[countyName].find(p => p.id === positionId)) {
              generatedDynamicCountyPositions[countyName].push({ id: positionId, title: rawOffice, summary: `Local office for ${countyName} County.` });
            }

            if (!generatedCandidatesData[positionId]) {
              generatedCandidatesData[positionId] = { current: [], candidates: [] };
            }
            
            generatedCandidatesData[positionId].candidates.push({
              name: row.txFullNameBallot, 
              party: party,
              website: row.txEmail ? `mailto:${row.txEmail}` : '#',
              openSecrets: `https://www.opensecrets.org/search?q=${row.txFirstNameBallot}+${row.txLastNameBallot}&type=site`,
              photoUrl: `https://ui-avatars.com/api/?name=${row.txFirstNameBallot}+${row.txLastNameBallot}&background=random&color=fff&size=150`
            });
          }
        });

        // Alphabetize candidates
        Object.keys(generatedCandidatesData).forEach(id => {
          generatedCandidatesData[id].candidates.sort((a, b) => a.name.localeCompare(b.name));
        });

        // Save to React State
        setCandidatesData(generatedCandidatesData);
        setDynamicCountyPositions(generatedDynamicCountyPositions);
        setIsLoading(false);
      })
      .catch(err => {
        console.error("API Fetch Error:", err);
        setIsLoading(false);
      });
  }, []); 

  return { candidatesData, dynamicCountyPositions, isLoading };
}