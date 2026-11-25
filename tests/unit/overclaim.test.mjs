#!/usr/bin/env node
/**
 * tests/unit/overclaim.test.mjs
 * 단정 표현 후처리. confirmed 일괄 치환이 영어를 깨뜨렸던 실측 문장(2026-11-25 eval 캐시)으로 확인한다.
 * 실행: node --test tests/unit/overclaim.test.mjs
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { softenOverclaim as f, softenDeep } from '../../lib/overclaim.ts';

test('원인 단정은 very likely로 낮춘다', () => {
  assert.equal(f('If streaks disappear, moisture is confirmed as root cause'), 'If streaks disappear, moisture is very likely the root cause');
  assert.equal(f('tip overtemperature confirmed as the root cause'), 'tip overtemperature is very likely the root cause');
  assert.equal(f('Root cause is confirmed.'), 'Root cause is highly likely.');
  assert.equal(f('Machine nozzle is confirmed clean'), 'Machine nozzle is very likely clean');
  assert.equal(f('tip overtemperature is the confirmed out-of-window condition'), 'tip overtemperature is the most likely out-of-window condition');
  assert.equal(f('ratio of 96% is a confirmed process deviation'), 'ratio of 96% is a likely process deviation');
});

test('조건·검증 문맥은 verified로 바꿔 문장을 살린다', () => {
  assert.equal(f('do not change value until unit is confirmed'), 'do not change value until unit is verified');
  assert.equal(f('without gate data, shear cannot be confirmed'), 'without gate data, shear cannot be verified');
  assert.equal(f('supplier lot test if defect persists with confirmed dry material'), 'supplier lot test if defect persists with verified dry material');
  assert.equal(f('Back pressure must be confirmed first'), 'Back pressure must be verified first');
  assert.equal(f('Confirmed OK.'), 'Very likely OK.');
});

test('한국어·기타 치환은 그대로', () => {
  assert.equal(f('원인 확정'), '원인 가능성 높음');
  assert.equal(f('수분이 확실히 확정적이다'), '수분이 확실히 가능성이 높다');
  assert.equal(f('This confirms moisture. It is definitely wet.'), 'This strongly suggests moisture. It is most likely wet.');
  assert.equal(f('is confirmed by the heat test'), 'is strongly supported by the heat test');
  assert.deepEqual(softenDeep({ defect_type: { en: 'confirmed' }, a: ['Confirmed as cause'] }), { defect_type: { en: 'confirmed' }, a: ['Very likely the cause'] });
});
