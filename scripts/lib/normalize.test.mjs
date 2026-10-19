import assert from 'node:assert/strict';
import test from 'node:test';
import { normalizeWebsite } from './normalize.mjs';

test('retain valid campaign domains, paths and query strings with HTTPS', () => {
  assert.equal(normalizeWebsite('www.example.com'), 'https://www.example.com/');
  assert.equal(normalizeWebsite('http://example.com/campaign?year=2026'), 'https://example.com/campaign?year=2026');
  assert.equal(normalizeWebsite(' https://example.com/ '), 'https://example.com/');
});

test('reject email addresses, credentials, invalid domains, and malformed schemes', () => {
  for (const raw of [null, '', 'Terri601@hotmail.com', 'https://Ctherwhanger@me.com/', 'mailto:nikita.fridia@co.morris.tx.us',
    'https://user:password@example.com', 'javascript:alert(1)', 'ftp://example.com', 'https://https://example.com',
    'https://example..com', 'https://example_com.org', 'https://-example.com', 'Perez for Texas.com']) {
    assert.equal(normalizeWebsite(raw), null, raw);
  }
});
