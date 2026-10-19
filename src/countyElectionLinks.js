import { countyKey } from './states';

// Official county election pages, opened and verified October 19, 2026.
// Each URL is the county office's own source; other counties use the SOS directory.
const OFFICES = {
  harris: 'https://www.harrisvotes.com/',
  dallas: 'https://www.dallascountyvotes.org/',
  travis: 'https://votetravis.gov/',
  bexar: 'https://elections.bexar.gov/',
  fortbend: 'https://www.fortbendcountytx.gov/government/departments/elections-voter-registration',
  blanco: 'https://www.blancocountytexas.gov/page/Elections.Information',
  hidalgo: 'https://www.hidalgocounty.us/105/Elections-Department',
  cameron: 'https://www.cameroncountytx.gov/elections/',
};

export function countyElectionLink(county) {
  const url = OFFICES[countyKey(county)];
  return url ? { url, label: `${county} County elections office` } : {
    url: `https://www.sos.state.tx.us/elections/voter/county.shtml#${county[0].toUpperCase()}`,
    label: `Find your ${county} County elections office (SOS directory)`,
  };
}
