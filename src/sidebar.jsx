// src/Sidebar.jsx
import React, { useState, useEffect } from 'react';
import { federalPositions, statePositions, countyPositions, candidatesData } from './data';

export default function Sidebar({ viewLevel, selectedState, selectedCounty, onBack }) {
  const [selectedPosition, setSelectedPosition] = useState(null);

  // Reset local selection when the map view changes
  useEffect(() => {
    setSelectedPosition(null);
  }, [viewLevel, selectedState]);

  const renderHeader = () => {
    if (viewLevel === 'federal') return "United States";
    if (viewLevel === 'state') return statePositions[selectedState] ? "Texas State" : selectedState;
    return `${selectedCounty}`;
  };

  const renderCandidateView = () => {
    const data = candidatesData[selectedPosition.id];
    return (
      <div className="sidebar-content">
        <button className="back-btn" onClick={() => setSelectedPosition(null)}>← Back</button>
        <h2 style={{color: 'var(--primary)'}}>{selectedPosition.title}</h2>
        <p>{selectedPosition.summary}</p>
        
        <h3 style={{marginTop: '20px'}}>Current Holder</h3>
        {data?.current.map((person, idx) => (
          <div key={idx} className="candidate-card" style={{borderLeft: `4px solid ${person.party === 'Rep' ? '#bf0a30' : '#002868'}`}}>
             <strong>{person.name}</strong> <br/>
             <span className="party-pill" style={{backgroundColor: person.party === 'Rep' ? '#bf0a30' : '#002868'}}>
               {person.party}
             </span>
          </div>
        )) || <p>No data.</p>}

        <h3 style={{marginTop: '20px'}}>Candidates</h3>
        {data?.candidates.map((cand, idx) => (
          <div key={idx} className="candidate-card">
            <h4>{cand.name}</h4>
            <span className="party-pill" style={{backgroundColor: cand.party === 'Rep' ? '#bf0a30' : '#002868'}}>
               {cand.party}
            </span>
            <div style={{marginTop: '10px', fontSize: '0.9rem'}}>
              <a href={cand.website} target="_blank">Campaign Site</a> • 
              <a href={cand.openSecrets} target="_blank"> Funding Data</a>
            </div>
          </div>
        ))}
      </div>
    );
  };

  const renderList = (items, emptyMsg) => (
    <div className="sidebar-content">
      {viewLevel !== 'federal' && <button className="back-btn" onClick={onBack}>← Zoom Out</button>}
      <p style={{fontStyle: 'italic', color: '#666'}}>Select a position below:</p>
      {items ? items.map((pos) => (
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
          {viewLevel === 'state' && selectedState !== 'TX' && renderList(null, "Data coming soon for this state.")}
          {viewLevel === 'county' && renderList(countyPositions.default)}
        </>
      )}
    </div>
  );
}