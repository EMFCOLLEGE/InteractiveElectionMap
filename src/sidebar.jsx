// src/Sidebar.jsx
import React, { useState, useEffect } from 'react';
import { federalPositions, statePositions } from './data';
import { useCandidates } from './useCandidates';

export default function Sidebar({ viewLevel, selectedState, selectedCounty, onBack }) {
  const [selectedPosition, setSelectedPosition] = useState(null);
  
  // 1. GET THE CURRENT YEAR DYNAMICALLY
  const currentYear = new Date().getFullYear().toString();

  // YOUR ACTIVE FILTERS
  const [partyFilter, setPartyFilter] = useState('All'); 
  // 2. SET THE DEFAULT YEAR TO THE CURRENT YEAR
  const [yearFilter, setYearFilter] = useState(currentYear); 
  const [typeFilter, setTypeFilter] = useState('All'); 
  
  const { candidatesData, dynamicCountyPositions, isLoading } = useCandidates();
  
  // Reset filters when changing views
  useEffect(() => {
    setSelectedPosition(null);
    setPartyFilter('All');
    // 3. RESET TO CURRENT YEAR INSTEAD OF 'All'
    setYearFilter(currentYear); 
    setTypeFilter('Primary');
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

    // Renamed from filterByParty to be a universal filter
    const applyFilters = (person) => {
      // 1. Party Filter
      if (partyFilter === 'Republican' && person.party !== 'Rep') return false;
      if (partyFilter === 'Democrat' && person.party !== 'Dem') return false;
      if (partyFilter === 'Other' && ['Rep', 'Dem'].includes(person.party)) return false;

      // 2. Year Filter (Only applies to challengers, not the hardcoded current incumbents)
      if (yearFilter !== 'All' && person.year && person.year !== yearFilter) return false;

      // 3. Election Type Filter
      if (typeFilter !== 'All' && person.type && person.type !== typeFilter) return false;

      return true;
    };

    const filteredCurrent = data?.current.filter(applyFilters) || [];
    const filteredCandidates = data?.candidates.filter(applyFilters) || [];

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
        
        <div style={{ margin: '20px 0', padding: '15px', backgroundColor: '#e9ecef', borderRadius: '8px', display: 'flex', flexDirection: 'column', gap: '10px' }}>
          <div style={{ fontWeight: 'bold', color: '#333', borderBottom: '1px solid #ccc', paddingBottom: '5px' }}>
            Election Filters
          </div>
          
          <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
            {/* PARTY DROPDOWN */}
            <select 
              value={partyFilter} 
              onChange={(e) => setPartyFilter(e.target.value)}
              style={{ flex: 1, padding: '8px', borderRadius: '4px', border: '1px solid #ccc', cursor: 'pointer' }}
            >
              <option value="All">All Parties</option>
              <option value="Republican">Republican</option>
              <option value="Democrat">Democrat</option>
              <option value="Other">Other</option>
            </select>

            {/* YEAR DROPDOWN */}
            <select 
              value={yearFilter} 
              onChange={(e) => setYearFilter(e.target.value)}
              style={{ flex: 1, padding: '8px', borderRadius: '4px', border: '1px solid #ccc', cursor: 'pointer' }}
            >
              <option value="All">All Years</option>
              <option value="2026">2026</option>
              <option value="2028">2028</option>
            </select>

            {/* ELECTION TYPE DROPDOWN */}
            <select 
              value={typeFilter} 
              onChange={(e) => setTypeFilter(e.target.value)}
              style={{ flex: 1, padding: '8px', borderRadius: '4px', border: '1px solid #ccc', cursor: 'pointer' }}
            >
              <option value="All">All Types</option>
              <option value="Primary">Primary</option>
              <option value="Runoff">Runoff</option>
              <option value="General">General</option>
            </select>
          </div>
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