// src/Sidebar.jsx
import React, { useState, useEffect } from 'react';
import { federalPositions, statePositions } from './data';
import { useCandidates } from './useCandidates';

export default function Sidebar({ viewLevel, selectedState, selectedCounty, onBack }) {
  const [selectedPosition, setSelectedPosition] = useState(null);
  
  const currentYear = new Date().getFullYear().toString();

  // Filters
  const [partyFilter, setPartyFilter] = useState('All'); 
  const [yearFilter, setYearFilter] = useState(currentYear); 
  const [typeFilter, setTypeFilter] = useState('Primary'); 
  
  const { candidatesData, dynamicCountyPositions, isLoading } = useCandidates();
  
  // Reset filters when changing views
  useEffect(() => {
    setSelectedPosition(null);
    setPartyFilter('All');
    setYearFilter(currentYear); 
    setTypeFilter('Primary');
  }, [viewLevel, selectedState, selectedCounty]);

  const renderHeader = () => {
    if (viewLevel === 'federal') return "United States";
    if (viewLevel === 'state') return "Texas State";
    return `${selectedCounty} County`;
  };

  // --- NEW: Skeleton Loading Component ---
  const renderSkeleton = () => (
    <div className="sidebar-content">
      <div style={{ marginBottom: '20px', color: '#666' }}>Fetching database...</div>
      {[1, 2, 3].map((i) => (
        <div key={i} className="skeleton-card">
          <div className="skeleton" style={{ width: '100px', height: '100px', borderRadius: '50%', margin: '0 auto 10px auto' }}></div>
          <div className="skeleton" style={{ width: '60%', height: '20px', margin: '0 auto 10px auto' }}></div>
          <div className="skeleton" style={{ width: '40%', height: '15px', margin: '0 auto' }}></div>
        </div>
      ))}
    </div>
  );

  const renderCandidateView = () => {
    if (!candidatesData || !candidatesData[selectedPosition.id]) {
        return (
          <div className="sidebar-content">
            <button className="back-btn" onClick={() => setSelectedPosition(null)}>← Back</button>
            <p>No candidate data available for this position.</p>
          </div>
        );
    }

    const data = candidatesData[selectedPosition.id];

    const applyFilters = (person) => {
      if (partyFilter === 'Republican' && person.party !== 'Rep') return false;
      if (partyFilter === 'Democrat' && person.party !== 'Dem') return false;
      if (partyFilter === 'Other' && ['Rep', 'Dem'].includes(person.party)) return false;
      if (yearFilter !== 'All' && person.year && person.year !== yearFilter) return false;
      if (typeFilter !== 'All' && person.type && person.type !== typeFilter) return false;
      return true;
    };

    const filteredCurrent = data?.current.filter(applyFilters) || [];
    const filteredCandidates = data?.candidates.filter(applyFilters) || [];

    return (
      <div className="sidebar-content">
        <button className="back-btn" onClick={() => setSelectedPosition(null)}>
          ← Back to List
        </button>
        
        <h2 style={{color: 'var(--primary)', marginTop: 0}}>{selectedPosition.title}</h2>
        <p>{selectedPosition.summary}</p>
        
        {/* Filters Panel */}
        <div style={{ margin: '15px 0', padding: '15px', backgroundColor: '#e9ecef', borderRadius: '4px' }}>
          <div style={{ fontSize: '0.9rem', fontWeight: 'bold', marginBottom: '10px' }}>Filters</div>
          <div style={{ display: 'flex', gap: '5px', flexWrap: 'wrap' }}>
            <select value={partyFilter} onChange={(e) => setPartyFilter(e.target.value)} style={{ padding: '5px' }}>
              <option value="All">All Parties</option>
              <option value="Republican">Republican</option>
              <option value="Democrat">Democrat</option>
            </select>
            <select value={yearFilter} onChange={(e) => setYearFilter(e.target.value)} style={{ padding: '5px' }}>
              <option value="All">All Years</option>
              <option value="2026">2026</option>
              <option value="2028">2028</option>
            </select>
            <select value={typeFilter} onChange={(e) => setTypeFilter(e.target.value)} style={{ padding: '5px' }}>
              <option value="All">All Types</option>
              <option value="Primary">Primary</option>
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
                 {/* Explicit Website/Funding Links */}
                 {person.website && person.website !== '#' && <a href={person.website} target="_blank" rel="noreferrer" style={{color: 'var(--primary)', fontWeight: 'bold'}}>Website</a>} 
                 
                 {person.website && person.website !== '#' && person.openSecrets && person.openSecrets !== '#' && " | "}
                 
                 {person.openSecrets && person.openSecrets !== '#' && <a href={person.openSecrets} target="_blank" rel="noreferrer" style={{color: 'var(--primary)', fontWeight: 'bold'}}>Funding</a>}
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
                 {cand.website && cand.website !== '#' && <a href={cand.website} target="_blank" rel="noreferrer" style={{color: 'var(--primary)', fontWeight: 'bold'}}>Website</a>} 
                 
                 {cand.website && cand.website !== '#' && cand.openSecrets && cand.openSecrets !== '#' && " | "}
                 
                 {cand.openSecrets && cand.openSecrets !== '#' && <a href={cand.openSecrets} target="_blank" rel="noreferrer" style={{color: 'var(--primary)', fontWeight: 'bold'}}>Funding</a>}
              </div>
            </div>
          </div>
        )) : <p style={{ color: '#666', fontStyle: 'italic' }}>No matches found.</p>}
      </div>
    );
  };

  const renderList = (items, emptyMsg) => (
    <div className="sidebar-content">
      {/* 2. FEATURE: Back Navigation Button */}
      {viewLevel !== 'federal' && (
        <button className="back-btn" onClick={onBack}>
          ← Zoom Out
        </button>
      )}
      
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
      
      {/* 1. FEATURE: Skeleton Loading Logic */}
      {isLoading ? renderSkeleton() : (
        <>
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
        </>
      )}
    </div>
  );
}