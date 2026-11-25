#!/usr/bin/env node
/**
 * tests/unit/unitCheck.test.mjs
 * 제출 직전 단위 착오 점검(lib/unitCheck.ts). 케이스는 10·11월 실제 입력(익명)에서 가져왔다.
 * 실행: node --test tests/unit/unitCheck.test.mjs
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { checkUnits } from '../../lib/unitCheck.ts';

const kinds = r => r.map(i => i.kind);

test('°C로 둔 채 °F 실린더·금형 값(10/20 PA/ABS 475, 금형 460)', () => {
  const r = checkUnits({ nozzleTemp: '475', zone1Temp: '475', zone4Temp: '460', moldTempFixed: '460' }, 'C', 'bar');
  assert.deepEqual(kinds(r), ['temp_f', 'mold_temp_f']);
});

test('°F와 psi를 °C·bar로 입력(11/20 PBT 510, 30000, 배압 2000)', () => {
  const r = checkUnits({ nozzleTemp: '510', zone1Temp: '500', moldTempFixed: '120', injPressure1: '30000', holdPressure: '30000', backPressure: '2000' }, 'C', 'bar');
  assert.deepEqual(kinds(r), ['temp_f', 'bar_looks_psi']);
  assert.equal(r[1].field, 'inj');
});

test('kgf/cm²로 보이는 배압을 MPa로(10/30 TPU 35, 11/07 TPU 28)', () => {
  assert.deepEqual(kinds(checkUnits({ injPressure1: '223', holdPressure: '167', backPressure: '35.0' }, 'C', 'MPa')), ['mpa_too_high']);
  const r = checkUnits({ injPressure1: '235', holdPressure: '122', backPressure: '28.0' }, 'C', 'MPa');
  assert.equal(r[0].field, 'back');
});

test('°F로 바르게 고른 경우는 조용하다', () => {
  assert.deepEqual(checkUnits({ nozzleTemp: '510', moldTempFixed: '250' }, 'F', 'psi'), []);
});

test('정상 입력은 경고하지 않는다', () => {
  // PA66 예시값
  assert.deepEqual(checkUnits({ nozzleTemp: '285', zone1Temp: '280', moldTempFixed: '80', injPressure1: '120', holdPressure: '80', backPressure: '5' }, 'C', 'MPa'), []);
  // PEEK 고온(실린더 400, 금형 200)
  assert.deepEqual(checkUnits({ nozzleTemp: '400', zone1Temp: '395', moldTempFixed: '200' }, 'C', 'bar'), []);
  // bar 일반값(사출 1200, 보압 800, 배압 80)
  assert.deepEqual(checkUnits({ injPressure1: '1200', holdPressure: '800', backPressure: '80' }, 'C', 'bar'), []);
  // psi는 유압값이 작게 들어올 수 있어 점검하지 않는다
  assert.deepEqual(checkUnits({ injPressure1: '75', holdPressure: '50' }, 'C', 'psi'), []);
  // 빈 값·쉼표
  assert.deepEqual(checkUnits({ nozzleTemp: '', injPressure1: '1,200' }, 'C', 'bar'), []);
});
