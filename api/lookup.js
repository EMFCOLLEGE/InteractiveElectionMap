import { LookupError, lookupAddress } from '../server/lib/lookup.js';

export function createHandler(lookup = lookupAddress) {
  return async function handler(req, res) {
    res.setHeader('Cache-Control', 'no-store, private');
    res.setHeader('X-Content-Type-Options', 'nosniff');
    if (req.method !== 'POST') {
      res.setHeader('Allow', 'POST');
      return res.status(405).json({ error: { code: 'METHOD_NOT_ALLOWED' } });
    }
    let body;
    try { body = typeof req.body === 'string' ? JSON.parse(req.body) : req.body; } catch {
      return res.status(400).json({ error: { code: 'INVALID_ADDRESS' } });
    }
    try {
      return res.status(200).json(await lookup(body?.address));
    } catch (error) {
      // Never log the request, response, address, or upstream error.
      const known = error instanceof LookupError;
      return res.status(known ? error.status : 500).json({ error: { code: known ? error.code : 'LOOKUP_UNAVAILABLE' } });
    }
  };
}

export default createHandler();
