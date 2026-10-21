import { ballotForAddress } from './ballotForAddress';
import RaceList from './RaceList';
import { countyElectionLink } from './countyElectionLinks';
import VotingInfo from './VotingInfo';

export default function AddressBallot({ data, lookup, onSelect, onClear }) {
  const { races, otherCountyRaces } = ballotForAddress(data, lookup);
  const districts = lookup.districts;
  const countyOffice = countyElectionLink(lookup.county);
  return (
    <section className="address-ballot" aria-labelledby="ballot-heading">
      <div role="status" aria-live="polite" aria-atomic="true">
        <h2 id="ballot-heading" tabIndex={-1}>Your ballot guide</h2>
        <p className="matched-address">{lookup.matchedAddress}</p>
        <p>Your districts: Congressional {districts.us_house} · State Senate {districts.state_senate} · State House {districts.state_house} · SBOE {districts.state_board}</p>
        <p>{lookup.county} County · {data.election.name}</p>
      </div>
      <button type="button" className="back-btn" onClick={onClear}>Clear / change address</button>
      <div className="ballot-disclaimer">
        <p>Districts are based on official maps; confirm with your official sample ballot.</p>
        <p className="small">Street geocoding can be approximate. City, school district, other local elections, and propositions are also outside this guide. A district with no race up this election is omitted.</p>
      </div>
      <VotingInfo stateCode={lookup.state} stateName="Texas" countyOffice={countyOffice} />
      <RaceList races={races} onSelect={(race) => onSelect(race, false)} />
      {otherCountyRaces.length > 0 && (
        <details className="other-county-races">
          <summary>Other races in your county ({otherCountyRaces.length})</summary>
          <p>These precinct or other local races may not be on your ballot. County alone does not confirm eligibility. Check your official sample ballot before choosing a race.</p>
          <RaceList races={otherCountyRaces} onSelect={(race) => onSelect(race, true)} />
        </details>
      )}
      <details className="ballot-map-sources">
        <summary>Official district maps used</summary>
        <ul>{Object.entries(lookup.plans).map(([category, plan]) => (
          <li key={category}><a href={plan.url} target="_blank" rel="noreferrer">{plan.plan}</a></li>
        ))}</ul>
      </details>
    </section>
  );
}
