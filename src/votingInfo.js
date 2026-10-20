// How-to-vote dates and links per state, keyed like STATES.
// TX dates: SOS "Important 2026 Election Dates", checked October 19, 2026.
// https://www.sos.state.tx.us/elections/voter/important-election-dates.shtml
// TX links: VoteTexas.gov (official SOS voter site), opened and checked October 19, 2026.
export const VOTING_INFO = {
  TX: {
    electionDate: '2026-11-03',
    registrationDeadline: '2026-10-05',
    earlyVoting: { start: '2026-10-19', end: '2026-10-30' },
    mailApplicationDeadline: '2026-10-23',
    pollHours: '7 a.m. to 7 p.m.',
    mailReturn: 'Mail ballots must arrive by 7 p.m. on Election Day, or by 5 p.m. Nov. 4 if postmarked by 7 p.m. on Election Day. Overseas and military deadlines differ.',
    links: [
      { label: 'Am I registered? / Find my polling place', url: 'https://goelect.txelections.civixapps.com/ivis-mvp-ui/#/login' },
      { label: 'Photo ID you need to vote', url: 'https://www.votetexas.gov/voting/need-id.html' },
      { label: 'Early voting', url: 'https://www.votetexas.gov/voting/early-voting.html' },
      { label: 'Voting by mail', url: 'https://www.votetexas.gov/voting-by-mail/index.html' },
      { label: 'Voters with special needs', url: 'https://www.votetexas.gov/voters-with-special-needs/index.html' },
    ],
    resultsUrl: 'https://goelect.txelections.civixapps.com/ivis-enr-ui/races',
    source: { name: 'VoteTexas.gov', url: 'https://www.votetexas.gov/' },
    datesSource: { name: 'Texas SOS important election dates', url: 'https://www.sos.state.tx.us/elections/voter/important-election-dates.shtml' },
    timeZone: 'America/Chicago',
  },
};

// Today's date (YYYY-MM-DD) in the state's time zone. Deadlines are whole days.
export const todayIn = (timeZone, now = new Date()) => now.toLocaleDateString('en-CA', { timeZone });

export const formatDay = (iso, opts = { weekday: 'short', month: 'short', day: 'numeric' }) =>
  new Date(`${iso}T12:00:00Z`).toLocaleDateString('en-US', { timeZone: 'UTC', ...opts });

// Ordered key dates. `passed` marks dates already behind us.
export function keyDates(info, today) {
  const { registrationDeadline, earlyVoting, mailApplicationDeadline, electionDate, pollHours } = info;
  return [
    { label: 'Last day to register', when: formatDay(registrationDeadline), last: registrationDeadline },
    { label: 'Early voting', when: `${formatDay(earlyVoting.start)} – ${formatDay(earlyVoting.end)}`, last: earlyVoting.end },
    { label: 'Mail ballot application must be received', when: formatDay(mailApplicationDeadline), last: mailApplicationDeadline },
    { label: 'Election Day', when: `${formatDay(electionDate)}, ${pollHours}`, last: electionDate },
  ].map((d) => ({ ...d, passed: today > d.last }));
}

// One-line status for where we are in the voting calendar.
export function votingStatus(info, today) {
  const { earlyVoting, electionDate, pollHours } = info;
  if (today > electionDate) return { phase: 'over', text: 'This election is over.' };
  if (today === electionDate) return { phase: 'election-day', text: `Today is Election Day. Polls are open ${pollHours}.` };
  if (today >= earlyVoting.start && today <= earlyVoting.end) {
    return { phase: 'early', text: `Early voting is open now through ${formatDay(earlyVoting.end)}. You can vote at any early voting location in your county.` };
  }
  if (today > earlyVoting.end) {
    return { phase: 'between', text: `Early voting has ended. Election Day is ${formatDay(electionDate)}, ${pollHours}.` };
  }
  return { phase: 'before', text: `Early voting starts ${formatDay(earlyVoting.start)}. Election Day is ${formatDay(electionDate)}.` };
}
