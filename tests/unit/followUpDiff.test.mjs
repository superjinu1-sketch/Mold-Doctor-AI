#!/usr/bin/env node
/**
 * tests/unit/followUpDiff.test.mjs
 * 후속 라운드 셋팅 대조(lib/followUpDiff.ts). 케이스는 10·11월 실사용 2차 라운드(익명)에서 가져왔다.
 * 실행: node --test tests/unit/followUpDiff.test.mjs
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { diffFollowUp } from '../../lib/followUpDiff.ts';

const tpuRecs = [
  { parameter: '쿠션 실측 편차 확인 및 계량량 조정', current: '쿠션 설정 23.2mm (통상 권장 2-8mm 초과)', recommended: '10샷 연속 쿠션 실측 후 편차 ±2mm 이내 목표' },
  { parameter: '보압', current: '122MPa', recommended: '135-140MPa' },
  { parameter: '건조 조건 확인', current: '건조 조건 미입력', recommended: '80-100°C' },
  { parameter: '게이트씰 시험(보압시간 단계별 중량 측정)', current: '보압시간 15초, 중량 미측정', recommended: '5/10/15/20초 각 10샷' },
];

test('11/07 TPU 2차: 보압 그대로, 쿠션만 바뀜', () => {
  const d = diffFollowUp(tpuRecs, { holdPressure: '122.0', cushion: '9.7', holdTime: '15.000' });
  const by = Object.fromEntries(d.map(x => [x.key, x]));
  assert.equal(by.holdPressure.changed, false);
  assert.equal(by.cushion.changed, true);
  assert.equal(by.holdTime, undefined, '시험 절차는 건너뛴다');
});

test('보압을 실제로 올리면 권고 방향 변경으로 본다', () => {
  const d = diffFollowUp(tpuRecs, { holdPressure: '138', cushion: '9.7' });
  const hp = d.find(x => x.key === 'holdPressure');
  assert.equal(hp.changed, true);
  assert.equal(hp.direction, 'with');
});

test('10/06 PA66 2차: 권고와 반대로 바뀐 값, 2단 속도는 injSpeed2로', () => {
  const recs = [
    { parameter: '2단 사출속도', current: '40%', recommended: '55~60%' },
    { parameter: '1단 사출압력', current: '120 MPa', recommended: '130~135 MPa' },
  ];
  const d = diffFollowUp(recs, { injSpeed1: '73', injSpeed2: '', injPressure1: '100' });
  assert.equal(d.length, 1, 'injSpeed2가 비어 있으면 건너뛴다');
  assert.equal(d[0].key, 'injPressure1');
  assert.equal(d[0].direction, 'against');
});

test('bar 입력인데 이전 결과가 MPa 환산값으로 적은 경우 변경 없음', () => {
  const d = diffFollowUp([{ parameter: 'Hold pressure', current: '8 MPa', recommended: '9-9.5 MPa' }], { holdPressure: '80' }, { holdPressure: '8' });
  assert.equal(d[0].changed, false);
});

test('핫러너 노즐·배럴 다구간·숫자 없는 현재값은 건너뛴다', () => {
  const recs = [
    { parameter: '핫러너 노즐 온도', current: '330°C', recommended: '310°C' },
    { parameter: 'Barrel temperature gradient', current: 'Z1 183', recommended: 'Z1 185' },
    { parameter: '금형 온도', current: '미입력', recommended: '80°C' },
  ];
  assert.deepEqual(diffFollowUp(recs, { nozzleTemp: '315', zone1Temp: '183', moldTempFixed: '80' }), []);
});
