import assert from 'node:assert/strict';
import test from 'node:test';
import { districtAttorneyKey, multicountyCourtKey, parseDistrictAttorney, parseMulticountyCourts } from './localJudicialOffices.mjs';

const ch43 = [
  '<p>Sec. 43.102. 2ND JUDICIAL DISTRICT. The voters of the 2nd Judicial District elect a district attorney.</p>',
  '<p>Sec. 43.105. 9TH JUDICIAL DISTRICT. (a) The voters of Montgomery County elect a district attorney for the 9th Judicial District.</p>',
  '<p>Sec. 43.119. 33RD JUDICIAL DISTRICT. The voters of Blanco, Burnet, Llano, and San Saba Counties elect a district attorney for the 33rd and 424th Judicial Districts.</p>',
  '<p>Sec. 43.1112. 11TH JUDICIAL DISTRICT. (a) The voters of the 12th Judicial District elect a district attorney.</p>',
].join('');

test('district attorneys elected by a whole judicial district or by named counties', () => {
  assert.deepEqual(parseDistrictAttorney(ch43, '2'), { section: '43.102', judicialDistrict: '2' });
  assert.deepEqual(parseDistrictAttorney(ch43, '9'), { section: '43.105', counties: ['Montgomery'] });
  assert.deepEqual(parseDistrictAttorney(ch43, '33'), { section: '43.119', counties: ['Blanco', 'Burnet', 'Llano', 'San Saba'] });
});

test('fail loudly on a missing section, a mismatched district, or an unknown clause', () => {
  assert.throws(() => parseDistrictAttorney(ch43, '452'), /expected one ch\. 43 section, found 0/);
  assert.throws(() => parseDistrictAttorney(ch43, '11'), /names the 12 district/);
  assert.throws(() => parseDistrictAttorney('<p>Sec. 43.1. 1ST JUDICIAL DISTRICT. The district attorney ...</p>', '1'), /no "The voters of/);
});

test('multicounty courts at law, cross-checked against the body', () => {
  const html = '<p>Sec. 25.2701. 1ST MULTICOUNTY COURT AT LAW (FISHER, MITCHELL, AND NOLAN COUNTIES). Fisher, Mitchell, and Nolan Counties have a multicounty statutory county court composed of those counties.</p>'
    + '<p>Sec. 25.2703. 2ND MULTICOUNTY COURT AT LAW (BEE, LIVE OAK, AND MCMULLEN COUNTIES). Bee, Live Oak, and McMullen Counties have a multicounty statutory county court composed of those counties.</p>';
  assert.deepEqual(parseMulticountyCourts(html), {
    1: { section: '25.2701', counties: ['Fisher', 'Mitchell', 'Nolan'] },
    2: { section: '25.2703', counties: ['Bee', 'Live Oak', 'McMullen'] },
  });
  assert.throws(() => parseMulticountyCourts(html.replace('Fisher, Mitchell', 'Fisher, Scurry')), /disagree/);
});

test('map SOS office names to keys', () => {
  assert.equal(districtAttorneyKey('District Attorney, 268th Judicial District'), '268');
  assert.equal(districtAttorneyKey('District Judge, 268th Judicial District'), null);
  assert.equal(multicountyCourtKey('1st Multicounty Court at Law'), '1');
  assert.equal(multicountyCourtKey('Judge, County Court at Law No. 1'), null);
});
