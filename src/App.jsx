// src/App.jsx
import React, { useState } from 'react';
import './App.css';
import Sidebar from './sidebar';
import MapDisplay from './MapDisplay';
import MapDisplay3D from './MapDisplay3D'; 

// --- NEW: Landing Page Component ---
function LandingPage({ onEnter }) {
  return (
    <div className="landing-overlay">
      <div className="landing-card">
        <h1 className="landing-title">Interactive Election Map</h1>
        <p className="landing-subtitle">Democracy is in the details.</p>
        
        <div className="landing-body">
          <p>
            Welcome to the <strong>Interactive Election Map</strong>. Our goal is to make it easier 
            for you to get informed about your federal, state, and local elections.
          </p>
          <p>
            This tool aggregates data to show you exactly who currently holds office 
            and who is running against them in the upcoming election.
          </p>
        </div>

        <div className="landing-instructions">
          <strong>How to use this map:</strong>
          <ul style={{ margin: '10px 0 0 20px', padding: 0 }}>
            <li>📍 <strong>Explore:</strong> Click on Texas to see county-level data.</li>
            <li>🏛️ <strong>Discover:</strong> Select a position in the sidebar to see candidates.</li>
            <li>🗳️ <strong>Analyze:</strong> Use filters to sort by party or election year.</li>
          </ul>
        </div>

        <button className="enter-btn" onClick={onEnter}>
          Start Exploring
        </button>
      </div>
    </div>
  );
}

// --- Main App Component ---
function App() {
  // 1. State for Landing Page (Defaults to TRUE so it shows on load)
  const [showLanding, setShowLanding] = useState(true);

  const [viewLevel, setViewLevel] = useState('federal'); 
  const [selectedState, setSelectedState] = useState(null);
  const [selectedCounty, setSelectedCounty] = useState(null);
  const [is3DMode, setIs3DMode] = useState(false); 

  const handleStateSelect = (stateCode) => {
    setSelectedState(stateCode);
    setViewLevel('state');
  };

  const handleCountySelect = (countyName) => {
    setSelectedCounty(countyName);
    setViewLevel('county');
  };

  const handleBack = () => {
    if (viewLevel === 'county') {
      setViewLevel('state');
      setSelectedCounty(null);
    } else if (viewLevel === 'state') {
      setViewLevel('federal');
      setSelectedState(null);
      setIs3DMode(false); 
    }
  };

  return (
    <div className="app-container">
      
      {/* 2. Show Landing Page if state is true */}
      {showLanding && <LandingPage onEnter={() => setShowLanding(false)} />}

      <Sidebar 
        viewLevel={viewLevel} 
        selectedState={selectedState} 
        selectedCounty={selectedCounty}
        onBack={handleBack}
      />
      
      <div style={{ flex: 1, position: 'relative', display: 'flex', flexDirection: 'column' }}>
        
        {/* 3D Toggle (Only visible for Texas) */}
        {selectedState === 'TX' && (
          <div style={{
            position: 'absolute',
            top: '20px',
            right: '20px',
            zIndex: 500, /* Lower than Landing Page (9999) */
            backgroundColor: 'white',
            padding: '10px 15px',
            borderRadius: '8px',
            boxShadow: '0 4px 6px rgba(0,0,0,0.1)',
            fontFamily: 'sans-serif'
          }}>
            <label style={{ cursor: 'pointer', fontWeight: 'bold', color: 'var(--primary)', display: 'flex', alignItems: 'center' }}>
              <input 
                type="checkbox" 
                checked={is3DMode} 
                onChange={(e) => setIs3DMode(e.target.checked)} 
                style={{ marginRight: '10px', width: '18px', height: '18px', cursor: 'pointer' }}
              />
              Enable 3D Heatmap
            </label>
          </div>
        )}

        {/* Map Logic */}
        {is3DMode && selectedState === 'TX' ? (
          <MapDisplay3D 
            viewLevel={viewLevel} 
            selectedState={selectedState}
            onSelectState={handleStateSelect}
            onSelectCounty={handleCountySelect}
          />
        ) : (
          <MapDisplay 
            viewLevel={viewLevel} 
            selectedState={selectedState}   
            onSelectState={handleStateSelect}
            onSelectCounty={handleCountySelect}
          />
        )}
      </div>
    </div>
  );
}

export default App;