// src/useElectionData.js
import { useState, useEffect } from 'react';
import { STATES } from './states';

// Each state's file is fetched at most once per page load.
const cache = new Map();

function loadState(code) {
  if (!cache.has(code)) {
    const promise = fetch(STATES[code].dataUrl).then((res) => {
      if (!res.ok) throw new Error(`HTTP ${res.status} loading ${STATES[code].dataUrl}`);
      return res.json();
    });
    promise.catch(() => cache.delete(code)); // allow a retry after a failure
    cache.set(code, promise);
  }
  return cache.get(code);
}

export function useElectionData(stateCode) {
  const [result, setResult] = useState({ data: null, error: null, isLoading: false });

  useEffect(() => {
    if (!stateCode || !STATES[stateCode]) {
      setResult({ data: null, error: null, isLoading: false });
      return;
    }

    let active = true;
    setResult({ data: null, error: null, isLoading: true });
    loadState(stateCode)
      .then((data) => active && setResult({ data, error: null, isLoading: false }))
      .catch((error) => active && setResult({ data: null, error, isLoading: false }));

    return () => { active = false; };
  }, [stateCode]);

  return result;
}
