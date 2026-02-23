// src/Sidebar.jsx
import React, { useState, useEffect } from 'react';
import { federalPositions, statePositions } from './data';
import { useCandidates } from './useCandidates';

export default function Sidebar({ viewLevel, selectedState, selectedCounty, onBack }) {
  const [selectedPosition, setSelectedPosition] = useState(null);
  const [partyFilter, setPartyFilter] = useState('All'); 

  // Call the custom hook to fetch live data!
  const { candidatesData, dynamicCountyPositions, isLoading } = useCandidates();

  useEffect(() => {
    setSelectedPosition(null);
    setPartyFilter('All');
  }, [viewLevel, selectedState, selectedCounty]);

  const renderHeader = () => {
    if (viewLevel === 'federal') return "United States";
    if (viewLevel === 'state') return statePositions[selectedState] ? "Texas State" : selectedState;
    return `${selectedCounty} County`;
  };

  if (isLoading) {
    return (
      <div className="sidebar">
        <div className="sidebar-header"><h1>Loading Database...</h1></div>
        <p style={{ padding: '20px', color: '#666', fontStyle: 'italic' }}>Fetching candidates safely from the cloud...</p>
      </div>
    );
  }

  const renderCandidateView = () => {
    // Failsafe in case the data hasn't loaded properly for this specific position
    if (!candidatesData || !candidatesData[selectedPosition.id]) {
        return (
          <div className="sidebar-content">
            <button className="back-btn" onClick={() => setSelectedPosition(null)}>← Back</button>
            <p>No candidate data available for this position.</p>
          </div>
        );
    }

    const data = candidatesData[selectedPosition.id];

    const filterByParty = (person) => {
      if (partyFilter === 'All') return true;
      if (partyFilter === 'Republican' && person.party === 'Rep') return true;
      if (partyFilter === 'Democrat' && person.party === 'Dem') return true;
      if (partyFilter === 'Other' && !['Rep', 'Dem'].includes(person.party)) return true;
      return false;
    };

    const filteredCurrent = data?.current.filter(filterByParty) || [];
    const filteredCandidates = data?.candidates.filter(filterByParty) || [];

    return (
      <div className="sidebar-content">
        <button className="back-btn" onClick={() => {
            setSelectedPosition(null);
            setPartyFilter('All'); 
        }}>
          ← Back
        </button>
        <h2 style={{color: 'var(--primary)'}}>{selectedPosition.title}</h2>
        <p>{selectedPosition.summary}</p>
        
        <div style={{ margin: '20px 0', padding: '10px', backgroundColor: '#e9ecef', borderRadius: '6px' }}>
          <label style={{ fontWeight: 'bold', marginRight: '10px', color: '#333' }}>
            Filter Party:
          </label>
          <select 
            value={partyFilter} 
            onChange={(e) => setPartyFilter(e.target.value)}
            style={{ padding: '6px', borderRadius: '4px', border: '1px solid #ccc', cursor: 'pointer' }}
          >
            <option value="All">All Parties</option>
            <option value="Republican">Republican</option>
            <option value="Democrat">Democrat</option>
            <option value="Other">Other / Independent</option>
          </select>
        </div>
        
        <h3 style={{marginTop: '20px'}}>Current Holder</h3>
        {filteredCurrent.length > 0 ? filteredCurrent.map((person, idx) => (
          <div key={idx} className="candidate-card" style={{borderLeft: `4px solid ${person.party === 'Rep' ? '#bf0a30' : person.party === 'Dem' ? '#002868' : '#888'}`}}>
             <div className="candidate-profile-header">
               <img src={person.photoUrl || 'https://via.placeholder.com/150'} alt={person.name} className="candidate-img" />
               <strong style={{ fontSize: '1.2rem' }}>{person.name}</strong>
             </div>
             <div style={{ textAlign: 'center' }}>
               <span className="party-pill" style={{backgroundColor: person.party === 'Rep' ? '#bf0a30' : person.party === 'Dem' ? '#002868' : '#888'}}>
                 {person.party}
               </span>
               <div style={{marginTop: '10px', fontSize: '0.9rem'}}>
                 {person.website && person.website !== '#' && <a href={person.website} target="_blank" rel="noreferrer">Contact/Site</a>} 
                 {person.website && person.website !== '#' && person.openSecrets && person.openSecrets !== '#' && " • "}
                 {person.openSecrets && person.openSecrets !== '#' && <a href={person.openSecrets} target="_blank" rel="noreferrer">Funding Data</a>}
               </div>
             </div>
          </div>
        )) : <p style={{ color: '#666', fontStyle: 'italic' }}>No matches found.</p>}

        <h3 style={{marginTop: '20px'}}>Candidates</h3>
        {filteredCandidates.length > 0 ? filteredCandidates.map((cand, idx) => (
          <div key={idx} className="candidate-card" style={{borderLeft: `4px solid ${cand.party === 'Rep' ? '#bf0a30' : cand.party === 'Dem' ? '#002868' : '#888'}`}}>
             <div className="candidate-profile-header">
               <img src={cand.photoUrl || 'https://via.placeholder.com/150'} alt={cand.name} className="candidate-img" />
               <h4 style={{ margin: '5px 0' }}>{cand.name}</h4>
             </div>
            <div style={{ textAlign: 'center' }}>
              <span className="party-pill" style={{backgroundColor: cand.party === 'Rep' ? '#bf0a30' : cand.party === 'Dem' ? '#002868' : '#888'}}>
                 {cand.party}
              </span>
              <div style={{marginTop: '10px', fontSize: '0.9rem'}}>
                 {cand.website && cand.website !== '#' && <a href={cand.website} target="_blank" rel="noreferrer">Contact/Site</a>} 
                 {cand.website && cand.website !== '#' && cand.openSecrets && cand.openSecrets !== '#' && " • "}
                 {cand.openSecrets && cand.openSecrets !== '#' && <a href={cand.openSecrets} target="_blank" rel="noreferrer">Funding Data</a>}
              </div>
            </div>
          </div>
        )) : <p style={{ color: '#666', fontStyle: 'italic' }}>No matches found.</p>}
      </div>
    );
  };

  const renderList = (items, emptyMsg) => (
    <div className="sidebar-content">
      {viewLevel !== 'federal' && <button className="back-btn" onClick={onBack}>← Zoom Out</button>}
      <p style={{fontStyle: 'italic', color: '#666'}}>Select a position below:</p>
      
      {items && items.length > 0 ? items.map((pos) => (
        <div key={pos.id} className="position-card" onClick={() => setSelectedPosition(pos)}>
          <h3>{pos.title}</h3>
          <div style={{fontSize: '0.9rem', color: '#555'}}>{pos.summary}</div>
        </div>
      )) : <p>{emptyMsg}</p>}
    </div>
  );

  return (
    <div className="sidebar">
      <div className="sidebar-header">
        <h1>{renderHeader()}</h1>
      </div>
      
      {selectedPosition ? renderCandidateView() : (
        <>
          {viewLevel === 'federal' && renderList(federalPositions)}
          {viewLevel === 'state' && selectedState === 'TX' && renderList(statePositions.TX)}
          
          {viewLevel === 'county' && renderList(
            dynamicCountyPositions[selectedCounty], 
            "No county-level candidates on file for this specific county."
          )}
        </>
      )}
    </div>
  );
}