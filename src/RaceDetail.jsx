// src/RaceDetail.jsx
import { partyColor } from './parties';

const initials = (name) =>
  name
    .replace(/"[^"]*"/g, '') // skip nicknames like "Brad"
    .split(/\s+/)
    .filter(Boolean)
    .map((part) => part[0])
    .filter((ch) => /[A-Za-z]/.test(ch))
    .slice(0, 2)
    .join('')
    .toUpperCase();

// FEC is the official campaign finance source for federal candidates.
const fecSearchUrl = (name) => `https://www.fec.gov/data/candidates/?search=${encodeURIComponent(name.replace(/"[^"]*"/g, ''))}`;

function CandidateCard({ candidate, isFederal }) {
  const color = partyColor(candidate.party);

  return (
    <div className="candidate-card" style={{ borderLeft: `4px solid ${color}` }}>
      <div className="candidate-avatar" aria-hidden="true">{initials(candidate.name)}</div>
      <div className="candidate-info">
        <h4>{candidate.name}</h4>
        <div className="candidate-tags">
          <span className="party-pill" style={{ backgroundColor: color }}>{candidate.partyName}</span>
          {candidate.incumbent && <span className="tag">Incumbent</span>}
        </div>
        {candidate.occupation && <div className="muted small">{candidate.occupation}</div>}
        <div className="candidate-links">
          {candidate.website && <a href={candidate.website} target="_blank" rel="noreferrer">Website</a>}
          {isFederal && !candidate.writeIn && (
            <a href={fecSearchUrl(candidate.name)} target="_blank" rel="noreferrer">Campaign finance (FEC)</a>
          )}
        </div>
      </div>
    </div>
  );
}

export default function RaceDetail({ race, onBack }) {
  const onBallot = race.candidates.filter((c) => !c.writeIn);
  const writeIns = race.candidates.filter((c) => c.writeIn);
  const isFederal = race.level === 'federal';
  const hasIncumbent = race.candidates.some((c) => c.incumbent);

  return (
    <div>
      <button className="back-btn" onClick={onBack}>← Back to races</button>

      <h2 className="race-title">{race.office}</h2>
      <div className="candidate-tags">
        {race.county && <span className="tag">{race.county} County</span>}
        {race.unexpiredTerm && <span className="tag">Unexpired term</span>}
        {!hasIncumbent && <span className="tag">Open seat</span>}
      </div>

      <h3>On the ballot</h3>
      {onBallot.length > 0
        ? onBallot.map((c) => <CandidateCard key={c.ballotName + c.party} candidate={c} isFederal={isFederal} />)
        : <p className="muted">Only write-in candidates have filed for this race.</p>}

      {writeIns.length > 0 && (
        <>
          <h3>Declared write-in candidates</h3>
          <p className="muted small">These names won&apos;t be printed on the ballot, but votes written in for them will be counted.</p>
          {writeIns.map((c) => <CandidateCard key={c.ballotName + c.party} candidate={c} isFederal={isFederal} />)}
        </>
      )}
    </div>
  );
}
