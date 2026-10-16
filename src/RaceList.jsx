// src/RaceList.jsx
import { useState } from 'react';

const GROUPS = [
  { category: 'us_senate', label: 'U.S. Senate' },
  { category: 'us_house', label: 'U.S. House' },
  { category: 'statewide', label: 'Statewide Offices' },
  { category: 'state_senate', label: 'State Senate' },
  { category: 'state_house', label: 'State House' },
  { category: 'state_board', label: 'State Board of Education' },
  { category: 'judicial', label: 'Courts & District Attorneys' },
  { category: 'county', label: 'County Offices' },
];

// Groups this large start collapsed so the list stays scannable.
const COLLAPSE_OVER = 15;

function raceSummary(race) {
  const incumbent = race.candidates.find((c) => c.incumbent);
  const count = `${race.candidates.length} candidate${race.candidates.length === 1 ? '' : 's'}`;
  return incumbent ? `${count} · Incumbent: ${incumbent.name}` : `${count} · Open seat`;
}

export default function RaceList({ races, onSelect }) {
  const [query, setQuery] = useState('');
  const q = query.trim().toLowerCase();

  const matches = q
    ? races.filter((r) => r.office.toLowerCase().includes(q) || r.candidates.some((c) => c.name.toLowerCase().includes(q)))
    : races;

  return (
    <div>
      <input
        className="race-search"
        type="search"
        placeholder="Search offices or candidates…"
        aria-label="Search offices or candidates"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
      />

      {matches.length === 0 && <p className="muted">No races match “{query}”.</p>}

      {GROUPS.map(({ category, label }) => {
        const groupRaces = matches.filter((r) => r.category === category);
        if (groupRaces.length === 0) return null;
        const collapsed = !q && groupRaces.length > COLLAPSE_OVER;

        return (
          <details key={category} className="race-group" open={!collapsed}>
            <summary>
              {label} <span className="race-group-count">{groupRaces.length}</span>
            </summary>
            {groupRaces.map((race) => (
              <button key={race.id} className="position-card" onClick={() => onSelect(race)}>
                <h3>{race.office}</h3>
                <div className="race-meta">
                  {race.unexpiredTerm && <span className="tag">Unexpired term</span>}
                  {raceSummary(race)}
                </div>
              </button>
            ))}
          </details>
        );
      })}
    </div>
  );
}
