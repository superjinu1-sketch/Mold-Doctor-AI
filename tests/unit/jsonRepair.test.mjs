#!/usr/bin/env node
/**
 * tests/unit/jsonRepair.test.mjs
 * 모델 JSON 괄호 짝 오류 복구. 2026-11-25 eval cov-pps-coldslug 응답은 process_window_check 뒤 '}'가 하나 더 있어
 * 파싱 실패 → 원인·조치 빈 결과로 나갔다.
 * 실행: node --test tests/unit/jsonRepair.test.mjs
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { repairJsonBrackets } from '../../lib/json-repair.ts';

test('루트를 일찍 닫는 여분의 } 를 버린다(실측 형태)', () => {
  const raw = '{"severity":"medium","process_window_check":{"melt_temp":{"status":"warning"},"drying":{"status":"ok"}}}},"causes":[{"rank":1,"description":"콜드슬러그웰 미설치 {예시}"}],"recommendations":[{"priority":1}]}';
  assert.throws(() => JSON.parse(raw));
  const o = JSON.parse(repairJsonBrackets(raw));
  assert.equal(o.causes[0].description, '콜드슬러그웰 미설치 {예시}');
  assert.equal(o.recommendations.length, 1);
  assert.equal(o.process_window_check.drying.status, 'ok');
});

test('짝이 안 맞는 닫는 괄호를 버린다', () => {
  const o = JSON.parse(repairJsonBrackets('{"a":[1,2}],"b":"x]"}'));
  assert.deepEqual(o, { a: [1, 2], b: 'x]' });
});

test('끝까지 안 닫힌 괄호를 닫는다', () => {
  const o = JSON.parse(repairJsonBrackets('{"causes":[{"rank":1},'));
  assert.deepEqual(o, { causes: [{ rank: 1 }] });
});

test('정상 JSON은 그대로', () => {
  const s = '{"a":{"b":[1,{"c":"}\\"]"}]}}';
  assert.equal(repairJsonBrackets(s), s);
});
