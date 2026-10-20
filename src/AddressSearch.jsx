import { useId } from 'react';

export default function AddressSearch({ address, onAddressChange, onSubmit, isLoading, error, heading = false }) {
  const id = useId();
  return (
    <form className="address-search" onSubmit={onSubmit} aria-busy={isLoading}>
      {heading && <h2>See what&apos;s on your ballot</h2>}
      <label htmlFor={id}>Texas street address</label>
      <div className="address-input-row">
        <input id={id} name="address" type="text" autoComplete="off" maxLength={300}
          placeholder="Street address, city, TX ZIP" value={address}
          onChange={(event) => onAddressChange(event.target.value)}
          aria-describedby={`${id}-privacy ${id}-status`} aria-invalid={Boolean(error)} required />
        <button type="submit" disabled={isLoading}>{isLoading ? 'Looking up…' : 'Find my races'}</button>
      </div>
      <p id={`${id}-privacy`} className="muted small address-privacy">Sent to the Census Geocoder; we don&apos;t save, log, or track your address.</p>
      <div id={`${id}-status`} className={error ? 'error-text small' : 'small'} role="status" aria-live="polite" aria-atomic="true">
        {isLoading ? 'Looking up your address and official districts…' : error}
      </div>
    </form>
  );
}
