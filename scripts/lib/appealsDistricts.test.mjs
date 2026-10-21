import assert from 'node:assert/strict';
import test from 'node:test';
import { ALL_COUNTIES, appealsDistrictKey, parseAppealsDistricts } from './appealsDistricts.mjs';

const statute = (...subsections) => `<p>Sec. 22.201. COURTS OF APPEALS DISTRICTS. (a) The state is organized into ${subsections.length} courts of appeals districts with a court of appeals in each district.</p>`
  + subsections.map((s, i) => `<p>&nbsp;&nbsp;(${'bcdefghijklmnop'[i]}) ${s}</p>`).join('')
  + '<p>Sec. 22.202. FIRST COURT OF APPEALS. (a) The Court of Appeals ...</p>';

test('parse county lists and the statewide district', () => {
  const districts = parseAppealsDistricts(statute(
    'The First Court of Appeals District is composed of the counties of Austin, Brazoria, Fort Bend, and Washington.',
    'The Second Court of Appeals District is composed of the counties of DeWitt and McLennan.',
    'The Third Court of Appeals District is composed of all counties in this state.',
  ));
  assert.deepEqual(districts, { 1: ['Austin', 'Brazoria', 'Fort Bend', 'Washington'], 2: ['DeWitt', 'McLennan'], 3: ALL_COUNTIES });
});

test('fail loudly when the district count disagrees or a district repeats', () => {
  const first = 'The First Court of Appeals District is composed of the counties of Austin and Harris.';
  assert.throws(() => parseAppealsDistricts(statute(first, first)), /defined twice/);
  const html = statute(first).replace('organized into 1 ', 'organized into 2 ');
  assert.throws(() => parseAppealsDistricts(html), /says 2 districts, parsed 1/);
  assert.throws(() => parseAppealsDistricts('<p>nothing here</p>'), /Expected one Sec\. 22\.201/);
});

test('map SOS office names to court of appeals district keys', () => {
  assert.equal(appealsDistrictKey('Justice, 1st Court of Appeals District, Place 3'), '1');
  assert.equal(appealsDistrictKey('Chief Justice, 15th Court of Appeals District'), '15');
  assert.equal(appealsDistrictKey('Judge, County Criminal Court of Appeals No. 1'), null);
  assert.equal(appealsDistrictKey('District Judge, 105th Judicial District'), null);
});
