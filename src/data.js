// src/data.js

export const federalPositions = [
  { id: 'pres', title: 'President', cycle: '4 years', summary: 'Head of State and Government.' }
];

export const statePositions = {
  TX: [
    { id: 'gov', title: 'Governor', summary: 'Chief executive of the state.' },
    { id: 'lt_gov', title: 'Lieutenant Governor', summary: 'Presides over the Senate.' },
    { id: 'ag', title: 'Attorney General', summary: 'Top legal officer.' },
    { id: 'senator', title: 'U.S. Senator', summary: 'Represents the state in DC.' }
    // Add other positions from your document here
  ]
};

export const countyPositions = {
  // Generic list for any county in TX for this prototype
  default: [
    { id: 'judge', title: 'County Judge', summary: 'Presiding officer of the Commissioners Court.' },
    { id: 'sheriff', title: 'Sheriff', summary: 'Chief law enforcement officer.' },
    { id: 'clerk', title: 'County Clerk', summary: 'Record keeper for the county.' }
  ]
};

// Mock data for candidates
export const candidatesData = {
  gov: {
    current: [{ name: 'Greg Abbott', party: 'Rep' }],
    candidates: [
      { name: 'Candidate A', party: 'Dem', website: '#', openSecrets: '#' },
      { name: 'Candidate B', party: 'Rep', website: '#', openSecrets: '#' }
    ]
  }
};