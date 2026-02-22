// src/MapDisplay.jsx
import React, { useState, useEffect } from 'react';
// FIXED: Added Marker and Popup to imports for the Gulf buttons
import { MapContainer, TileLayer, GeoJSON, useMap, Marker, Popup } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import L from 'leaflet'; 

// --- 1. Inset Controls (Gulf of Mexico Buttons) ---
function InsetControls({ onSelectState }) {
  // Coordinates for the Gulf of Mexico
  const gulfPosition = [27, -88]; 

  return (
    <Marker position={gulfPosition} opacity={0}> 
      {/* Invisible marker just to anchor the popup */}
      <Popup 
        permanent 
        interactive 
        direction="center" 
        className="gulf-popup"
        autoClose={false} 
        closeButton={false}
      >
        <div style={{ textAlign: 'center', fontSize: '12px' }}>
          <strong>View:</strong><br/>
          <button style={{margin: '2px', cursor: 'pointer'}} onClick={() => onSelectState('AK')}>Alaska</button>
          <button style={{margin: '2px', cursor: 'pointer'}} onClick={() => onSelectState('HI')}>Hawaii</button>
        </div>
      </Popup>
    </Marker>
  );
}

// --- 2. Zoom Handler (Handles Mainland vs State vs AK/HI) ---
function ZoomHandler({ viewLevel, selectedState }) {
  const map = useMap();

  useEffect(() => {
    // Priority 1: Handle Alaska/Hawaii specific selections
    if (selectedState === 'AK') {
       map.setView([64, -150], 4); 
    } else if (selectedState === 'HI') {
       map.setView([20.5, -157.5], 6);
    } 
    // Priority 2: Mainland Federal View
    else if (viewLevel === 'federal') {
       map.flyToBounds([[24.39, -125.0], [49.38, -66.93]], { padding: [20, 20], duration: 1.5 });
    } 
    // Priority 3: Specific State View (Texas)
    else if (viewLevel === 'state' && selectedState === 'TX') {
       map.flyToBounds([[25.83, -106.64], [36.5, -93.5]], { padding: [50, 50], duration: 1.5 });
    }
  }, [viewLevel, selectedState, map]);

  return null;
}

// --- 3. Main Component ---
export default function MapDisplay({ viewLevel, selectedState, onSelectState, onSelectCounty }) {
  const [usData, setUsData] = useState(null);
  const [txCountyData, setTxCountyData] = useState(null);

  // Fetch US States
  useEffect(() => {
    fetch('https://raw.githubusercontent.com/PublicaMundi/MappingAPI/master/data/geojson/us-states.json')
      .then(res => res.json())
      .then(data => setUsData(data));
  }, []);

  // Fetch TX Counties (Using the reliable Cincome source)
  useEffect(() => {
    if (viewLevel === 'state' || viewLevel === 'county') {
      fetch('https://raw.githubusercontent.com/Cincome/tx.geojson/master/counties/tx_counties.geojson')
        .then(res => {
          if (!res.ok) { throw new Error("HTTP error " + res.status); }
          return res.json();
        })
        .then(data => {
            console.log("Counties loaded:", data);
            setTxCountyData(data);
        })
        .catch(err => console.error("Error loading counties:", err));
    }
  }, [viewLevel]);

  const stateStyle = {
    fillColor: '#ecf0f1', weight: 1, opacity: 1, color: 'white', dashArray: '3', fillOpacity: 0.7
  };

  // UPDATED: Black lines for counties
  const countyStyle = {
    fillColor: '#ffedcc', 
    weight: 1,       
    opacity: 1, 
    color: 'black',  // Black border
    fillOpacity: 0.5
  };

  const onEachFeature = (feature, layer) => {
    layer.on({
      mouseover: (e) => {
        const layer = e.target;
        layer.setStyle({ fillOpacity: 0.9, weight: 2, color: '#333', dashArray: '' });
      },
      mouseout: (e) => {
        const layer = e.target;
        layer.setStyle(viewLevel === 'federal' ? stateStyle : countyStyle);
      },
      click: (e) => {
        L.DomEvent.stopPropagation(e);

        if (viewLevel === 'federal') {
          if (feature.properties.name === 'Texas') {
            onSelectState('TX');
          } else {
             alert(`You clicked ${feature.properties.name}. Only Texas is active in this demo!`);
          }
        } else if (viewLevel === 'state' || viewLevel === 'county') {
          // Robust check for County Name
          const props = feature.properties;
          // Checks for COUNTY (all caps) or standard name
          const rawName = props.COUNTY || props.name || "Unknown County";
          // Removes " County" from the string if present (e.g., "Cameron County" -> "Cameron")
          const cleanName = rawName.replace(" County", "");
          
          console.log("Clicked County:", cleanName); 
          onSelectCounty(cleanName);
          e.target._map.fitBounds(e.target.getBounds());
        }
      }
    });
  };

  return (
    <div className="map-container">
      <MapContainer 
        center={[38.5, -96]} // Mainland center
        zoom={4.5}           // Zoomed in on Mainland
        zoomSnap={0.5}       
        scrollWheelZoom={true} 
        style={{ height: '100%', width: '100%' }}
        maxBounds={[[24, -125], [50, -66]]} // Restricts panning to US area
      >
        <TileLayer
          url="https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png"
          attribution='&copy; OpenStreetMap contributors'
        />
        
        {/* Handles all zoom logic */}
        <ZoomHandler viewLevel={viewLevel} selectedState={selectedState} />

        {/* The Gulf of Mexico Buttons */}
        <InsetControls onSelectState={onSelectState} />

        {/* Federal View Layer */}
        {viewLevel === 'federal' && usData && (
          <GeoJSON data={usData} style={stateStyle} onEachFeature={onEachFeature} />
        )}

        {/* State/County View Layer */}
        {(viewLevel === 'state' || viewLevel === 'county') && txCountyData && (
          <GeoJSON data={txCountyData} style={countyStyle} onEachFeature={onEachFeature} />
        )}
      </MapContainer>
    </div>
  );
}