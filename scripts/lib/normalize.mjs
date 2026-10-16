// Shared helpers for turning raw state election data into the schema in docs/data-schema.md.
import { mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';

export const SCHEMA_VERSION = 1;

export const PARTY_NAMES = {
  R: 'Republican',
  D: 'Democratic',
  L: 'Libertarian',
  G: 'Green',
  I: 'Independent',
  W: 'Write-in',
  O: 'Other',
};

const SMALL_WORDS = new Set(['of', 'the', 'and', 'for', 'in', 'on', 'at', 'to', 'a', 'an', 'de', 'la', 'del']);

// "JUSTICE, 15TH COURT OF APPEALS DISTRICT" -> "Justice, 15th Court of Appeals District"
export function titleCase(text) {
  if (!text) return '';
  return text
    .trim()
    .replace(/\s+/g, ' ')
    .toLowerCase()
    .split(' ')
    .map((word, i) => {
      if (i > 0 && SMALL_WORDS.has(word)) return word;
      if (/^\d+(st|nd|rd|th)$/.test(word)) return word; // ordinals stay lowercase
      if (/^(ii|iii|iv)$/.test(word)) return word.toUpperCase(); // suffixes
      return word
        .replace(/(^|[-'"(/.])([a-z])/g, (_, pre, ch) => pre + ch.toUpperCase())
        .replace(/^(["(]?)Mc([a-z])/, (_, pre, ch) => `${pre}Mc${ch.toUpperCase()}`);
    })
    .join(' ');
}

// Campaign websites are filed free-form ("www.example.com", "Perez for Texas.com").
export function normalizeWebsite(raw) {
  if (!raw) return null;
  let url = raw.trim();
  if (!url || /\s/.test(url)) return null;
  if (!/^https?:\/\//i.test(url)) url = `https://${url}`;
  try {
    const parsed = new URL(url);
    if (!parsed.hostname.includes('.')) return null;
    return parsed.href;
  } catch {
    return null;
  }
}

export function slugify(text) {
  return text
    .toLowerCase()
    .replace(/&/g, ' and ')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

const LEVEL_ORDER = { federal: 0, state: 1, county: 2 };
const CATEGORY_ORDER = ['us_senate', 'us_house', 'statewide', 'state_senate', 'state_house', 'state_board', 'judicial', 'county'];

// Federal -> state -> county, then by category, county name, and numeric district.
export function compareRaces(a, b) {
  return (
    LEVEL_ORDER[a.level] - LEVEL_ORDER[b.level] ||
    CATEGORY_ORDER.indexOf(a.category) - CATEGORY_ORDER.indexOf(b.category) ||
    (a.county || '').localeCompare(b.county || '') ||
    (parseInt(a.district, 10) || 0) - (parseInt(b.district, 10) || 0) ||
    a.office.localeCompare(b.office, undefined, { numeric: true })
  );
}

export async function writeStateFile(stateCode, data) {
  const outPath = path.join(process.cwd(), 'public', 'data', `${stateCode.toLowerCase()}.json`);
  await mkdir(path.dirname(outPath), { recursive: true });
  const body = { schemaVersion: SCHEMA_VERSION, ...data, races: [...data.races].sort(compareRaces) };
  await writeFile(outPath, JSON.stringify(body, null, 1) + '\n');
  return outPath;
}
