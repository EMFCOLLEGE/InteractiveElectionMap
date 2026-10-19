import { readFile } from 'node:fs/promises';
import { gunzipSync } from 'node:zlib';
import booleanPointInPolygon from '@turf/boolean-point-in-polygon';

let cached;
export function loadDistricts() {
  if (!cached) {
    cached = (async () => {
      const directory = new URL('../data/tx-districts/', import.meta.url);
      const manifest = JSON.parse(await readFile(new URL('manifest.json', directory), 'utf8'));
      const layers = {};
      // Read sequentially to limit cold-start memory; cache geometry, never addresses.
      for (const [category, metadata] of Object.entries(manifest.plans)) {
        layers[category] = JSON.parse(gunzipSync(await readFile(new URL(metadata.file, directory))));
      }
      return { manifest, layers };
    })().catch((error) => { cached = undefined; throw error; });
  }
  return cached;
}

export class DistrictError extends Error {
  constructor(code) { super(code); this.code = code; }
}

export function assignDistricts(lng, lat, layers) {
  if (!Number.isFinite(lng) || !Number.isFinite(lat)) throw new DistrictError('DISTRICT_NOT_FOUND');
  const point = [lng, lat];
  const districts = {};
  for (const category of ['us_house', 'state_senate', 'state_house', 'state_board']) {
    const matches = layers[category].features.filter((feature) => {
      const [west, south, east, north] = feature.bbox;
      return lng >= west && lng <= east && lat >= south && lat <= north && booleanPointInPolygon(point, feature);
    });
    if (matches.length !== 1) throw new DistrictError(matches.length ? 'DISTRICT_AMBIGUOUS' : 'DISTRICT_NOT_FOUND');
    districts[category] = matches[0].properties.district;
  }
  return districts;
}
