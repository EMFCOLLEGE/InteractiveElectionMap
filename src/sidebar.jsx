// src/sidebar.jsx
import { useState, useEffect, useRef } from 'react';
import { STATES, countyKey } from './states';
import { useElectionData } from './useElectionData';
import RaceList from './RaceList';
import RaceDetail from './RaceDetail';
import AddressSearch from './AddressSearch';

const formatDate = (iso, opts) => new Date(iso).toLocaleDateString('en-US', { timeZone: 'UTC', ...opts });

function Skeleton() {
  return (
    <div>
      <div className="muted" style={{ marginBottom: '20px' }}>Loading ballot data…</div>
      {[1, 2, 3].map((i) => (
        <div key={i} className="skeleton-card">
          <div className="skeleton" style={{ width: '60%', height: '20px', marginBottom: '10px' }}></div>
          <div className="skeleton" style={{ width: '40%', height: '15px' }}></div>
        </div>
      ))}
    </div>
  );
}

function DataFooter({ data }) {
  return (
    <div className="data-footer">
      {data.sources.map((s) => (
        <div key={s.url}>Source: <a href={s.url} target="_blank" rel="noreferrer">{s.name}</a></div>
      ))}
      <div>Updated {formatDate(data.generatedAt, { month: 'short', day: 'numeric', year: 'numeric' })}</div>
    </div>
  );
}

export default function Sidebar({ viewLevel, selectedState, selectedCounty, onBack, onSelectState, search }) {
  const [selectedRace, setSelectedRace] = useState(null);
  const { data, error, isLoading } = useElectionData(selectedState);
  const contentRef = useRef(null);

  // Leaving a state or county closes any open race.
  useEffect(() => {
    setSelectedRace(null);
  }, [viewLevel, selectedState, selectedCounty]);

  // Start each view at the top instead of keeping the previous view's scroll position.
  useEffect(() => {
    if (contentRef.current) contentRef.current.scrollTop = 0;
  }, [selectedRace, viewLevel, selectedState, selectedCounty]);

  const stateName = STATES[selectedState]?.name ?? selectedState;
  const header =
    viewLevel === 'federal' ? 'United States' : viewLevel === 'state' ? stateName : `${selectedCounty} County`;

  const renderBody = () => {
    if (viewLevel === 'federal') {
      return (
        <>
          <p>Pick a state to see every race on its Nov 3 ballot.</p>
          {Object.values(STATES).map((s) => (
            <button key={s.code} className="position-card" onClick={() => onSelectState(s.code)}>
              <h3>{s.name}</h3>
              <div className="race-meta">2026 General Election</div>
            </button>
          ))}
          <p className="muted small">More states are on the way.</p>
        </>
      );
    }

    if (isLoading) return <Skeleton />;
    if (error) return <p className="error-text">Couldn&apos;t load ballot data. Please refresh to try again.</p>;
    if (!data) return <p className="muted">No ballot data for this state yet.</p>;

    if (selectedRace) return <RaceDetail race={selectedRace} electionDate={data.election.date} onBack={() => setSelectedRace(null)} />;

    const races =
      viewLevel === 'county'
        ? data.races.filter((r) => r.county && countyKey(r.county) === countyKey(selectedCounty))
        : data.races.filter((r) => r.level !== 'county');

    return (
      <>
        <button className="back-btn" onClick={onBack}>← Zoom Out</button>
        <p className="muted">
          {data.election.name} · {formatDate(data.election.date, { month: 'long', day: 'numeric', year: 'numeric' })}
        </p>
        {viewLevel === 'county' && (
          <p className="muted small">
            County offices only. Federal, statewide, and district races are listed under {stateName}.
          </p>
        )}
        <RaceList races={races} onSelect={setSelectedRace} />
        <DataFooter data={data} />
      </>
    );
  };

  return (
    <div className="sidebar">
      <div className="sidebar-header">
        <h1>{header}</h1>
      </div>
      <div className="sidebar-content" ref={contentRef}>
        <AddressSearch {...search} />
        {renderBody()}
      </div>
    </div>
  );
}
