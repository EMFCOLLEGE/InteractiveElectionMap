// Full-resolution TLC election plans. Never simplify or round lookup geometry.
import { execFile } from 'node:child_process';
import { createHash } from 'node:crypto';
import { mkdir, mkdtemp, readFile, rename, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { promisify } from 'node:util';
import { gzipSync } from 'node:zlib';

const run = promisify(execFile);
const root = process.cwd();
const plans = {
  us_house: { plan: 'PLANC2333', count: 38, resource: '748c952b-e926-4f44-8d01-a738884b3ec8/resource/5712ebe1-d777-4d4a-b836-0534e17bca01' },
  state_senate: { plan: 'PLANS2168', count: 31, resource: '70836384-f10c-423d-a36e-748d7e000872/resource/8247dbc6-b942-4a29-813c-1ebc603a7236' },
  state_house: { plan: 'PLANH2316', count: 150, resource: '71af633c-21bf-42cf-ad48-4fe95593a897/resource/a4d3230f-47f2-4253-85f3-51a6c3c9ad0a' },
  state_board: { plan: 'PLANE2106', count: 15, resource: 'ad1ae979-6df9-4322-98cf-6771cc67f02d/resource/640a507d-e26e-4b50-861c-7913c152bdc7' },
};
const hash = (bytes) => createHash('sha256').update(bytes).digest('hex');

function bounds(coordinates, bbox = [Infinity, Infinity, -Infinity, -Infinity]) {
  if (typeof coordinates[0] === 'number') {
    const [x, y] = coordinates;
    if (!Number.isFinite(x) || !Number.isFinite(y) || x < -107 || x > -93 || y < 25 || y > 37) throw new Error('Invalid Texas coordinate');
    bbox[0] = Math.min(bbox[0], x); bbox[1] = Math.min(bbox[1], y);
    bbox[2] = Math.max(bbox[2], x); bbox[3] = Math.max(bbox[3], y);
  } else coordinates.forEach((child) => bounds(child, bbox));
  return bbox;
}

const work = await mkdtemp(path.join(tmpdir(), 'tx-districts-'));
try {
  const output = path.join(work, 'output');
  await mkdir(output);
  const manifest = {
    state: 'TX', electionDate: '2026-11-03', generatedAt: new Date().toISOString(),
    verificationSource: 'https://redistricting.capitol.texas.gov/Current-districts',
    courtOrder: 'https://www.supremecourt.gov/opinions/25pdf/25a608_7khn.pdf',
    geometry: 'Full-resolution WGS84 GeoJSON, lossless gzip; no simplification, snapping, or coordinate rounding',
    converter: `mapshaper ${JSON.parse(await readFile(path.join(root, 'node_modules/mapshaper/package.json'), 'utf8')).version}`,
    plans: {},
  };
  for (const [category, { plan, count, resource }] of Object.entries(plans)) {
    const source = `https://data.capitol.texas.gov/dataset/${resource}/download/${plan.toLowerCase()}.zip`;
    const response = await fetch(source, { signal: AbortSignal.timeout(120000) });
    if (!response.ok) throw new Error(`TLC download failed: ${response.status} (${plan})`);
    const bytes = Buffer.from(await response.arrayBuffer());
    const archive = path.join(work, `${plan}.zip`);
    const geojsonPath = path.join(work, `${plan}.geojson`);
    await writeFile(archive, bytes);
    await run(process.execPath, [path.join(root, 'node_modules/mapshaper/bin/mapshaper'),
      '-i', archive, 'no-topology', '-proj', 'wgs84', '-o', geojsonPath, 'format=geojson']);
    const geojson = JSON.parse(await readFile(geojsonPath, 'utf8'));
    const ids = new Set();
    for (const feature of geojson.features) {
      const district = Number(feature.properties.District);
      if (!Number.isInteger(district) || district < 1 || district > count || ids.has(district) ||
          !['Polygon', 'MultiPolygon'].includes(feature.geometry?.type)) throw new Error(`Invalid district in ${plan}`);
      ids.add(district);
      feature.properties = { district: String(district) };
      feature.bbox = bounds(feature.geometry.coordinates);
    }
    if (ids.size !== count) throw new Error(`Expected ${count} districts in ${plan}, got ${ids.size}`);
    const metadata = { plan, source, dataset: `https://data.capitol.texas.gov/dataset/${plan.toLowerCase()}`, sourceSha256: hash(bytes) };
    Object.assign(geojson, { plan, source });
    const content = Buffer.from(JSON.stringify(geojson));
    const compressed = gzipSync(content, { level: 9 });
    const file = `${plan.toLowerCase()}.geojson.gz`;
    await writeFile(path.join(output, file), compressed);
    manifest.plans[category] = { ...metadata, count, file, geojsonSha256: hash(content) };
    console.log(`${plan}: ${count} districts, ${(content.length / 1e6).toFixed(2)} MB GeoJSON / ${(compressed.length / 1e6).toFixed(2)} MB gzip`);
  }
  await writeFile(path.join(output, 'manifest.json'), JSON.stringify(manifest, null, 2) + '\n');
  const target = path.join(root, 'server/data/tx-districts');
  await mkdir(path.dirname(target), { recursive: true });
  // Publish only after every download and conversion has passed validation.
  await rm(target, { recursive: true, force: true });
  await rename(output, target);
} finally {
  await rm(work, { recursive: true, force: true });
}
