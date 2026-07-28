// lib/resin-mechanism.test.ts
// 수지 심층 KB Phase 0(resin-mechanism-schema-v1) 검증. mock ResinSpec은 이 파일 안에만 존재 —
// 프로덕션 RESIN_KB에는 어떤 mechanism 값도 채우지 않는다(이번 mandate의 절대 규칙).
// 실행: node --test lib/resin-mechanism.test.ts
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { formatMechanism, RESIN_KB, type ResinSpec } from './resin-kb.ts';

// mechanism이 전부 채워진 mock — 테스트 전용, RESIN_KB에 없는 가상 id.
const MOCK_FULL: ResinSpec = {
  id: 'MOCK-PA66',
  tier: 'engineering',
  crystalline: true,
  hygroscopic: 'high',
  drying: { tempC: 80, hours: [4, 6], targetMoisturePct: 0.08 },
  meltC: { min: 260, max: 290, degradeAbove: 320 },
  moldC: { min: 60, max: 90 },
  commonDefects: [],
  notes: 'mock',
  source: 'experience',
  confidence: 'estimated',
  mechanism: {
    moistureMode: 'plasticization',
    crystallizationRate: 'medium',
    viscositySensitivity: 'balanced',
    residenceSensitivity: 'medium',
    polymerizationClass: 'condensation',
    residualMonomerRisk: { monomer: 'caprolactam', consequence: 'plate-out on mold surface' },
    mwdSensitivity: 'grade-dependent',
    lotVariationNotes: 'lot-to-lot moisture variance observed even with unchanged drying settings',
    notes: 'test note for prompt injection',
    sourceRefs: ['Fake Journal 2099 — should never appear in prompt output'],
    verifiedAt: '2099-01-01',
  },
};

test('formatMechanism: mechanism 필드가 채워진 mock은 기대 형식으로 주입된다', () => {
  const out = formatMechanism(MOCK_FULL);
  assert.ok(out.startsWith('[Resin mechanism — MOCK-PA66]'), 'header missing');
  assert.match(out, /- Moisture mode: plasticization \(properties recover after re-drying\)/);
  assert.match(out, /- Crystallization rate: medium/);
  assert.match(out, /- Viscosity sensitivity: balanced/);
  assert.match(out, /- Residence time sensitivity: medium/);
  assert.match(out, /- Polymerization class: condensation/);
  assert.match(out, /- Residual monomer risk: caprolactam — plate-out on mold surface/);
  assert.match(out, /- MWD sensitivity: grade-dependent/);
  assert.match(out, /- Lot variation: lot-to-lot moisture variance/);
  assert.match(out, /- Notes: test note for prompt injection/);
});

test('formatMechanism: sourceRefs·verifiedAt은 절대 프롬프트에 포함되지 않는다', () => {
  const out = formatMechanism(MOCK_FULL);
  assert.doesNotMatch(out, /Fake Journal/);
  assert.doesNotMatch(out, /2099-01-01/);
  assert.doesNotMatch(out, /sourceRefs/);
  assert.doesNotMatch(out, /verifiedAt/);
});

test('formatMechanism: mechanism 필드 자체가 없으면 빈 문자열(0토큰)', () => {
  const noMechanism: ResinSpec = { ...MOCK_FULL, id: 'MOCK-NO-MECHANISM', mechanism: undefined };
  assert.equal(formatMechanism(noMechanism), '');
});

test('formatMechanism: 실제 프로덕션 수지(PP, mechanism 미채움)는 빈 문자열 — 현 상태 무변화 확인', () => {
  const pp = RESIN_KB['PP'];
  assert.ok(pp, 'RESIN_KB.PP가 존재해야 이 테스트가 의미 있다');
  assert.equal(pp.mechanism, undefined, 'Phase 0에서는 어떤 수지도 mechanism 값이 채워지면 안 된다');
  assert.equal(formatMechanism(pp), '');
});

test('formatMechanism: RESIN_KB 전 수지(52종) mechanism 미채움 — 프로덕션 데이터 무변경 재확인', () => {
  const withMechanism = Object.values(RESIN_KB).filter(spec => spec.mechanism !== undefined);
  assert.deepEqual(withMechanism, [], `mechanism이 채워진 수지가 있으면 안 된다: ${withMechanism.map(s => s.id).join(', ')}`);
});

test('formatMechanism: polymerizationClass=addition + moistureMode=hydrolysis → 콘솔 경고', () => {
  const contradictory: ResinSpec = {
    ...MOCK_FULL,
    id: 'MOCK-CONTRADICTION',
    mechanism: { polymerizationClass: 'addition', moistureMode: 'hydrolysis' },
  };
  const warnings: unknown[][] = [];
  const original = console.warn;
  console.warn = (...args: unknown[]) => { warnings.push(args); };
  try {
    formatMechanism(contradictory);
  } finally {
    console.warn = original;
  }
  assert.equal(warnings.length, 1, '모순 조합에서 콘솔 경고가 정확히 1건 발생해야 한다');
  assert.match(String(warnings[0][0]), /MOCK-CONTRADICTION/);
  assert.match(String(warnings[0][0]), /addition/);
  assert.match(String(warnings[0][0]), /hydrolysis/);
});

test('formatMechanism: polymerizationClass=condensation + moistureMode=hydrolysis → 경고 없음(정합)', () => {
  const consistent: ResinSpec = {
    ...MOCK_FULL,
    id: 'MOCK-CONSISTENT',
    mechanism: { polymerizationClass: 'condensation', moistureMode: 'hydrolysis' },
  };
  const warnings: unknown[][] = [];
  const original = console.warn;
  console.warn = (...args: unknown[]) => { warnings.push(args); };
  try {
    formatMechanism(consistent);
  } finally {
    console.warn = original;
  }
  assert.equal(warnings.length, 0, '축중합+가수분해는 기전적으로 정합이라 경고가 없어야 한다');
});

test('formatMechanism: polymerizationClass=addition + moistureMode=plasticization → 경고 없음(모순 아님)', () => {
  const notContradictory: ResinSpec = {
    ...MOCK_FULL,
    id: 'MOCK-ADDITION-PLASTICIZATION',
    mechanism: { polymerizationClass: 'addition', moistureMode: 'plasticization' },
  };
  const warnings: unknown[][] = [];
  const original = console.warn;
  console.warn = (...args: unknown[]) => { warnings.push(args); };
  try {
    formatMechanism(notContradictory);
  } finally {
    console.warn = original;
  }
  assert.equal(warnings.length, 0, 'plasticization은 addition 계열(PE·PP 흡습)과 모순되지 않는다');
});
