import assert from 'node:assert/strict';
import test from 'node:test';
import { judicialDistrictKey, parseJudicialDistricts } from './judicialDistricts.mjs';

const section = (heading, body) => `<p>Sec. ${heading}.</p><p>&nbsp;&nbsp;(a) ${body}</p>`;

test('parse single, multi-county and lettered districts with matching bodies', () => {
  const html = [
    section('24.112. 11TH JUDICIAL DISTRICT (HARRIS COUNTY)', 'The 11th Judicial District is composed of Harris County.'),
    section('24.207. 105TH JUDICIAL DISTRICT (KENEDY, KLEBERG, AND NUECES COUNTIES)', 'The 105th Judicial District is composed of Kenedy, Kleberg, and Nueces counties.'),
    section('24.105. 5TH JUDICIAL DISTRICT (BOWIE AND CASS COUNTIES)', 'The 5th Judicial District is composed of Bowie and Cass counties.'),
    section('24.351. JUDICIAL DISTRICT 1-A (JASPER, NEWTON, AND TYLER COUNTIES)', 'Judicial District 1-A is composed of Jasper, Newton, and Tyler counties.'),
    section('24.120. 19TH JUDICIAL DISTRICT (MCLENNAN COUNTY)', 'The 19th Judicial District is composed of McLennan County.'),
  ].join('');
  const { districts } = parseJudicialDistricts(html);
  assert.deepEqual(districts['11'], { section: '24.112', counties: ['Harris'] });
  assert.deepEqual(districts['105'].counties, ['Kenedy', 'Kleberg', 'Nueces']);
  assert.deepEqual(districts['5'].counties, ['Bowie', 'Cass']);
  assert.deepEqual(districts['1a'].counties, ['Jasper', 'Newton', 'Tyler']);
  assert.deepEqual(districts['19'].counties, ['McLennan']);
});

test('skip sections not yet in effect and keep the current text', () => {
  const html = `Text of section effective on January 01, 2027 ${section('24.127. 522ND JUDICIAL DISTRICT (GONZALES AND GUADALUPE COUNTIES)', 'The 522nd Judicial District is composed of Gonzales and Guadalupe counties.')}`;
  const { districts, skipped } = parseJudicialDistricts(html);
  assert.equal(districts['522'], undefined);
  assert.deepEqual(skipped.map((s) => s.key), ['522']);
});

test('fail loudly when heading and body disagree or a district repeats', () => {
  assert.throws(() => parseJudicialDistricts(section('24.1. 1ST JUDICIAL DISTRICT (JASPER COUNTY)', 'The 1st Judicial District is composed of Jasper and Newton counties.')), /disagree/);
  const one = section('24.112. 11TH JUDICIAL DISTRICT (HARRIS COUNTY)', 'The 11th Judicial District is composed of Harris County.');
  assert.throws(() => parseJudicialDistricts(one + one), /defined twice/);
});

test('map SOS office names to district keys', () => {
  assert.equal(judicialDistrictKey('District Judge, 105th Judicial District'), '105');
  assert.equal(judicialDistrictKey('District Judge, 1st Judicial District'), '1');
  assert.equal(judicialDistrictKey('District Judge, Judicial District 1a'), '1a');
  assert.equal(judicialDistrictKey('District Attorney, 79th Judicial District'), null);
  assert.equal(judicialDistrictKey('Criminal District Judge, Dallas County Number 1'), null);
});
