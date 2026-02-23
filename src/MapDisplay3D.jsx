// src/MapDisplay3D.jsx
import React, { useState, useEffect } from 'react';
import DeckGL from '@deck.gl/react';
import { GeoJsonLayer } from '@deck.gl/layers';

// Color scale for the heatmap
function getPopulationColor(pop) {
  return pop > 1000000 ? [128, 0, 38] :
         pop > 500000  ? [189, 0, 38] :
         pop > 200000  ? [227, 26, 28] :
         pop > 100000  ? [252, 78, 42] :
         pop > 50000   ? [253, 141, 60] :
         pop > 20000   ? [254, 178, 76] :
         pop > 10000   ? [254, 217, 118] :
                         [255, 237, 160];
}

export default function MapDisplay3D({ viewLevel, onSelectCounty }) {
  const [txCountyData, setTxCountyData] = useState(null);
  const [popData2025, setPopData2025] = useState({}); // Stores the CSV data

  const initialViewState = {
    longitude: -99.9,
    latitude: 31.9,
    zoom: 5.5,
    pitch: 45, 
    bearing: 0
  };

  useEffect(() => {
    // 1. Fetch the Texas County Map Boundaries
    fetch('https://raw.githubusercontent.com/Cincome/tx.geojson/master/counties/tx_counties.geojson')
      .then(res => res.json())
      .then(data => setTxCountyData(data))
      .catch(err => console.error("Error loading map:", err));

    // 2. Fetch and parse the uploaded 2025 Population CSV
    fetch('/2024_txpopest_county.csv')
      .then(res => res.text())
      .then(csvText => {
        const lines = csvText.split('\n');
        const headers = lines[0].toLowerCase().split(',');
        
        // Locate the county and 2025 population columns
        const countyIdx = headers.findIndex(h => h.includes('county'));
        const pop2025Idx = headers.findIndex(h => h.includes('2025') && h.includes('jan'));
        
        // Fallback: If exact column name differs, grab the very last column
        const targetPopIdx = pop2025Idx !== -1 ? pop2025Idx : headers.length - 1;

        if (countyIdx !== -1) {
          const extractedPops = {};
          
          for (let i = 1; i < lines.length; i++) {
            if (!lines[i].trim()) continue;
            
            const cols = lines[i].split(','); 
            
            // Clean up formatting (remove quotes and " County" suffix)
            let countyName = cols[countyIdx].replace(/['"\r]/g, '').replace(/ County/i, '').trim();
            let popStr = cols[targetPopIdx].replace(/['"\r,]/g, '').trim();
            let pop = parseInt(popStr, 10);
            
            if (countyName && !isNaN(pop)) {
              extractedPops[countyName] = pop;
            }
          }
          setPopData2025(extractedPops);
        }
      })
      .catch(err => console.error("Error loading CSV file:", err));
  }, []);

  const layers = [
    new GeoJsonLayer({
      id: 'texas-counties-3d',
      data: txCountyData,
      extruded: true,
      wireframe: true,
      
      // Deck.gl needs to know to redraw when the CSV finishes downloading
      updateTriggers: {
        getFillColor: popData2025,
        getElevation: popData2025
      },
      
      getFillColor: f => {
        const rawName = f.properties.COUNTY || f.properties.name || "Unknown";
        const cleanName = rawName.replace(" County", "");
        
        // Grab the Jan 2025 population from our CSV, default to 50k while loading
        const realPop = popData2025[cleanName] || 50000; 
        return getPopulationColor(realPop);
      },
      
      getLineColor: [255, 255, 255, 100], 
      lineWidthMinPixels: 1,

      getElevation: f => {
        const rawName = f.properties.COUNTY || f.properties.name || "Unknown";
        const cleanName = rawName.replace(" County", "");
        
        const realPop = popData2025[cleanName] || 50000; 
        
        // Scaling factor so high-population counties fit on the screen
        return realPop * 0.05; 
      },
      
      pickable: true,
      onClick: ({object}) => {
        if (object) {
          const cleanName = (object.properties.COUNTY || object.properties.name).replace(" County", "");
          onSelectCounty(cleanName);
        }
      }
    })
  ];

  return (
    <div className="map-container" style={{ position: 'relative', backgroundColor: '#222', flex: 1 }}>
      <DeckGL
        initialViewState={initialViewState}
        controller={true} 
        layers={layers}
        getTooltip={({object}) => {
          if (!object) return null;
          const name = (object.properties.COUNTY || object.properties.name).replace(" County", "");
          const pop = popData2025[name];
          const popDisplay = pop ? pop.toLocaleString() : "Data loading...";
          return `${name} County\nJan 2025 Population: ${popDisplay}`;
        }}
      />
    </div>
  );
}