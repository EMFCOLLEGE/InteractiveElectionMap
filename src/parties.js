// src/parties.js
// Party colors for pills and card accents. Codes match docs/data-schema.md.

const PARTY_COLORS = {
  R: '#bf0a30',
  D: '#002868',
  L: '#c9a400',
  G: '#2e7d32',
  I: '#6c5ce7',
  W: '#888',
  O: '#888',
};

export const partyColor = (code) => PARTY_COLORS[code] || PARTY_COLORS.O;
