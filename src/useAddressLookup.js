import { useEffect, useRef, useState } from 'react';

const ERRORS = {
  MISSING_ADDRESS: 'Enter your street address, city, and Texas ZIP code.',
  INVALID_ADDRESS: 'Enter a street address of 300 characters or fewer.',
  STREET_ADDRESS_REQUIRED: 'A ZIP code can span districts. Enter your full street address.',
  NO_MATCH: 'No matching address found. Check the street address, city, and ZIP code and try again.',
  AMBIGUOUS_ADDRESS: 'More than one address matched. Add your city and ZIP code and try again.',
  NOT_TEXAS: 'This lookup currently supports Texas addresses only.',
  UPSTREAM_FAILURE: 'The Census address service is unavailable. Please try again shortly.',
  DISTRICT_NOT_FOUND: 'We couldn’t confirm every district at this address. Check your official sample ballot.',
  DISTRICT_AMBIGUOUS: 'This location is on a district boundary. Confirm your districts with your county elections office.',
};

export function useAddressLookup(onSuccess, onStart) {
  const [address, setAddress] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const request = useRef(null);
  const success = useRef(onSuccess);
  success.current = onSuccess;
  const start = useRef(onStart);
  start.current = onStart;
  useEffect(() => () => request.current?.abort(), []);

  const cancel = () => {
    request.current?.abort();
    request.current = null;
    setIsLoading(false);
    setError('');
  };
  const clear = () => { cancel(); setAddress(''); };
  const submit = async (event) => {
    event.preventDefault();
    cancel();
    start.current?.();
    const value = address.trim();
    if (!value) { setError(ERRORS.MISSING_ADDRESS); return; }
    if (/^\d{5}(?:-\d{4})?$/.test(value)) { setError(ERRORS.STREET_ADDRESS_REQUIRED); return; }
    const controller = new AbortController();
    request.current = controller;
    setIsLoading(true);
    const timer = setTimeout(() => controller.abort(), 25000);
    try {
      const response = await fetch('/api/lookup', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ address: value }), signal: controller.signal, cache: 'no-store',
      });
      const result = await response.json();
      if (request.current !== controller) return;
      if (!response.ok) { setError(ERRORS[result.error?.code] || 'Address lookup is unavailable. Please try again.'); return; }
      // Clear the typed address once the matched result is available in memory.
      setAddress('');
      success.current(result);
    } catch {
      if (request.current === controller) setError('Address lookup took too long or is unavailable. Please try again.');
    } finally {
      clearTimeout(timer);
      if (request.current === controller) { request.current = null; setIsLoading(false); }
    }
  };
  return { address, onAddressChange: (value) => { cancel(); setAddress(value); }, onSubmit: submit, isLoading, error, clear };
}
