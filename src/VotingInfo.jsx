import { VOTING_INFO, keyDates, todayIn, votingStatus } from './votingInfo';

// "How to vote" panel: where we are in the calendar, key dates, and official links.
// `countyOffice` ({ url, label }) adds the voter's county elections office when known.
export default function VotingInfo({ stateCode, stateName, countyOffice }) {
  const info = VOTING_INFO[stateCode];
  if (!info) return null;
  const today = todayIn(info.timeZone);
  const status = votingStatus(info, today);
  const over = status.phase === 'over';
  return (
    <details className="voting-info" open={!over}>
      <summary>How to vote in {stateName}</summary>
      <p className={`voting-status voting-status-${status.phase}`}>{status.text}</p>
      {over ? (
        <p><a href={info.resultsUrl} target="_blank" rel="noreferrer">Official election results</a></p>
      ) : (
        <>
          <dl className="voting-dates">
            {keyDates(info, today).map((d) => (
              <div key={d.label} className={d.passed ? 'passed' : undefined}>
                <dt>{d.label}</dt>
                <dd>{d.when}{d.passed && <span className="visually-hidden"> (passed)</span>}</dd>
              </div>
            ))}
          </dl>
          <p className="small">{info.mailReturn}</p>
          <ul className="voting-links">
            {info.links.map((l) => (
              <li key={l.url}><a href={l.url} target="_blank" rel="noreferrer">{l.label}</a></li>
            ))}
            {countyOffice && <li><a href={countyOffice.url} target="_blank" rel="noreferrer">{countyOffice.label}</a></li>}
          </ul>
        </>
      )}
      <p className="muted small">
        Sources: <a href={info.source.url} target="_blank" rel="noreferrer">{info.source.name}</a>
        {' · '}<a href={info.datesSource.url} target="_blank" rel="noreferrer">{info.datesSource.name}</a>
      </p>
    </details>
  );
}
