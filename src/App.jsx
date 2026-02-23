// src/App.jsx
import React, { useState } from 'react';
import './App.css';
import Sidebar from './sidebar';
import MapDisplay from './MapDisplay';
import MapDisplay3D from './MapDisplay3D'; 

function App() {
  const [viewLevel, setViewLevel] = useState('federal'); // federal, state, county
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
      // Optional: Automatically turn off 3D mode when zooming back out to the US
      setIs3DMode(false); 
    }
  };

  return (
    <div className="app-container">
      <Sidebar 
        viewLevel={viewLevel} 
        selectedState={selectedState} 
        selectedCounty={selectedCounty}
        onBack={handleBack}
      />
      
      <div style={{ flex: 1, position: 'relative', display: 'flex', flexDirection: 'column' }}>
        
        {/* UPDATED: Only show the 3D toggle if the user is currently viewing Texas */}
        {selectedState === 'TX' && (
          <div style={{
            position: 'absolute',
            top: '20px',
            right: '20px',
            zIndex: 2000, 
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

        {/* UPDATED: Only render the 3D map if 3D mode is true AND we are looking at Texas */}
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