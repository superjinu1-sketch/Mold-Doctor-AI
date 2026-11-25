#!/usr/bin/env node
/**
 * tests/unit/screwSpeed.test.mjs
 * 스크류 주변속도 대조(lib/resin-kb.ts checkSettings). 값은 공급사 상한(BASF·LANXESS·DuPont) 기준.
 * 실행: node --test tests/unit/screwSpeed.test.mjs
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { RESIN_KB, checkSettings } from '../../lib/resin-kb.ts';

const find = (checks) => checks.find(c => c.label.startsWith('스크류'));

test('스크류경 있으면 주변속도를 계산한다: PA6 40mm 180rpm = 0.38 m/s > 0.3', () => {
  const c = find(checkSettings(RESIN_KB['PA6'], { screwRpm: '180' }, { screwDiameter: '40' }, 'GF(유리섬유)'));
  assert.equal(c.value, 0.38);
  assert.equal(c.status, 'high');
});

test('스크류경 없으면 초과 기준 지름을 알려 주고 확인을 요청한다(case-006)', () => {
  const c = find(checkSettings(RESIN_KB['PA6'], { screwRpm: '180' }, {}, 'GF(유리섬유)'));
  assert.equal(c.status, 'verify');
  assert.match(c.rangeText, /32mm 이상이면 초과/);
});

test('PBT GF는 0.25 m/s, 비강화는 0.3 m/s', () => {
  const gf = find(checkSettings(RESIN_KB['PBT'], { screwRpm: '120' }, { screwDiameter: '45' }, 'GF(유리섬유)'));
  const un = find(checkSettings(RESIN_KB['PBT'], { screwRpm: '120' }, { screwDiameter: '45' }, '없음'));
  assert.equal(gf.value, 0.28);
  assert.equal(gf.status, 'high');
  assert.equal(un.status, 'ok');
});

test('상한 데이터가 없는 수지와 낮은 rpm은 건드리지 않는다', () => {
  assert.equal(find(checkSettings(RESIN_KB['ABS'], { screwRpm: '200' }, {}, '없음')), undefined);
  assert.equal(find(checkSettings(RESIN_KB['POM(아세탈)'], { screwRpm: '60' }, {}, '없음')).status, 'ok');
});
