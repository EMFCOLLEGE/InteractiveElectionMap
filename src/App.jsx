// src/App.jsx
import React, { useState } from 'react';
import './App.css';
import Sidebar from './sidebar';
import MapDisplay from './MapDisplay';

function App() {
  const [viewLevel, setViewLevel] = useState('federal'); // federal, state, county
  const [selectedState, setSelectedState] = useState(null);
  const [selectedCounty, setSelectedCounty] = useState(null);

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
      <MapDisplay 
        viewLevel={viewLevel} 
        selectedState={selectedState}   // <--- ADD THIS LINE
        onSelectState={handleStateSelect}
        onSelectCounty={handleCountySelect}
      />
    </div>
  );
}

export default App;