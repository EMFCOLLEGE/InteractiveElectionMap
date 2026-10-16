// src/states.js
// Registry of states with election data. Add a state here once public/data/<code>.json exists.

export const STATES = {
  TX: { code: 'TX', name: 'Texas', dataUrl: '/data/tx.json' },
};

// Normalizes county names so map and data sources match ("DeWitt" vs "Dewitt", "La Salle" vs "Lasalle").
export const countyKey = (name) => (name || '').toLowerCase().replace(/ county$/, '').replace(/[^a-z]/g, '');
