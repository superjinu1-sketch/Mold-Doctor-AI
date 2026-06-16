// lib/grade-parser.test.ts
// 검증 매트릭스: specs/grade-parser-test-matrix-v1.md (40케이스)
// 실행: node --test lib/grade-parser.test.ts   (Node 23.6+ 네이티브 TS, 외부 의존성 0)
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { parseGrade } from './grade-parser.ts';
import type { GradeParseResult } from './grade-parser.ts';

// 부분 일치 헬퍼: 매트릭스가 지정한 필드만 검사 (지정 안 한 필드는 무시)
function expectFields(input: string, want: Partial<GradeParseResult>) {
  const got = parseGrade(input);
  assert.notEqual(got, null, `"${input}" → null (계열 미확정?) expected non-null`);
  for (const k of Object.keys(want) as (keyof GradeParseResult)[]) {
    assert.deepEqual(got![k], want[k], `"${input}" field ${k}: got ${JSON.stringify(got![k])}, want ${JSON.stringify(want[k])}`);
  }
}
function expectNull(input: string) {
  assert.equal(parseGrade(input), null, `"${input}" → expected null (LLM 위임)`);
}

/* ── A. 직접 화학표기 (3a) ───────────────────────────────────────────── */
test('A1  PA66-GF30', () => expectFields('PA66-GF30', { resinType: 'PA66', filler: 'GF(유리섬유)', fillerContent: '30', flameRetardant: '없음', confidence: 'high' }));
test('A2  PA6-GF15 (PA66 오인 금지)', () => expectFields('PA6-GF15', { resinType: 'PA6', filler: 'GF(유리섬유)', fillerContent: '15', confidence: 'high' }));
test('A3  PBT-GF30 FR(V0)', () => expectFields('PBT-GF30 FR(V0)', { resinType: 'PBT', filler: 'GF(유리섬유)', fillerContent: '30', flameRetardant: 'UL94 V-0', confidence: 'high' }));
test('A4  PC/ABS (블렌드 키)', () => expectFields('PC/ABS', { resinType: 'PC/ABS', filler: '없음', fillerContent: '', flameRetardant: '없음', confidence: 'high' }));
test('A5  PC+ABS-GF20 (+→/)', () => expectFields('PC+ABS-GF20', { resinType: 'PC/ABS', filler: 'GF(유리섬유)', fillerContent: '20', confidence: 'high' }));
test('A6  PA66 GF 33 (공백 변형)', () => expectFields('PA66 GF 33', { resinType: 'PA66', filler: 'GF(유리섬유)', fillerContent: '33', confidence: 'high' }));
test('A7  30%GF PA6 (%선행)', () => expectFields('30%GF PA6', { resinType: 'PA6', filler: 'GF(유리섬유)', fillerContent: '30', confidence: 'high' }));
test('A8  POM (한글병기 키)', () => expectFields('POM', { resinType: 'POM(아세탈)', filler: '없음', fillerContent: '', confidence: 'high' }));
test('A9  PA66-GF (%없음→비움)', () => expectFields('PA66-GF', { resinType: 'PA66', filler: 'GF(유리섬유)', fillerContent: '', confidence: 'med' }));
test('A10 PPS-GF40', () => expectFields('PPS-GF40', { resinType: 'PPS', filler: 'GF(유리섬유)', fillerContent: '40', confidence: 'high' }));
test('A11 PA6-MD40 (MD=미네랄)', () => expectFields('PA6-MD40', { resinType: 'PA6', filler: '미네랄', fillerContent: '40', confidence: 'high' }));
test('A12 PP-TD20 (TD=탈크)', () => expectFields('PP-TD20', { resinType: 'PP', filler: '탈크', fillerContent: '20', confidence: 'high' }));
test('A13 PC-GF10 V0', () => expectFields('PC-GF10 V0', { resinType: 'PC', filler: 'GF(유리섬유)', fillerContent: '10', flameRetardant: 'UL94 V-0', confidence: 'high' }));
test('A14 PA610-GF50 (긴키 우선)', () => expectFields('PA610-GF50', { resinType: 'PA610', filler: 'GF(유리섬유)', fillerContent: '50', confidence: 'high' }));

/* ── B. 트레이드명 매핑 (3b+3c) ─────────────────────────────────────── */
test('B15 Zytel 70G33L (DuPont 리터럴 33)', () => expectFields('Zytel 70G33L', { resinType: 'PA66', filler: 'GF(유리섬유)', fillerContent: '33', confidence: 'high' }));
test('B16 Zytel 80G33HS1L NC010 (접미 노이즈)', () => expectFields('Zytel 80G33HS1L NC010', { resinType: 'PA66', filler: 'GF(유리섬유)', fillerContent: '33', confidence: 'high' }));
test('B17 Ultramid A3EG6 (BASF G6=30 ×5)', () => expectFields('Ultramid A3EG6', { resinType: 'PA66', filler: 'GF(유리섬유)', fillerContent: '30', confidence: 'high' }));
test('B18 Ultramid B3EG7 (BASF G7=35, B=PA6)', () => expectFields('Ultramid B3EG7', { resinType: 'PA6', filler: 'GF(유리섬유)', fillerContent: '35', confidence: 'high' }));
test('B19 Ultramid B3S (무강화)', () => expectFields('Ultramid B3S', { resinType: 'PA6', filler: '없음', fillerContent: '', confidence: 'high' }));
test('B20 Durethan BKV30 (Lanxess PA6, 30)', () => expectFields('Durethan BKV30', { resinType: 'PA6', filler: 'GF(유리섬유)', fillerContent: '30', confidence: 'high' }));
test('B21 Durethan AKV30 H2.0 (PA66, 노이즈)', () => expectFields('Durethan AKV30 H2.0', { resinType: 'PA66', filler: 'GF(유리섬유)', fillerContent: '30', confidence: 'high' }));
test('B22 Lexan 141 (SABIC PC)', () => expectFields('Lexan 141', { resinType: 'PC', filler: '없음', fillerContent: '', confidence: 'high' }));
test('B23 Noryl GFN3 (브랜드 high, %불명)', () => expectFields('Noryl GFN3', { resinType: 'm-PPE', filler: 'GF(유리섬유)', fillerContent: '', confidence: 'med' }));
test('B24 케피탈 F20-03 (한글 KEP POM)', () => expectFields('케피탈 F20-03', { resinType: 'POM(아세탈)', filler: '없음', fillerContent: '', confidence: 'high' }));
test('B25 Hostaform C9021 (Celanese POM)', () => expectFields('Hostaform C9021', { resinType: 'POM(아세탈)', filler: '없음', fillerContent: '', confidence: 'high' }));
// B26: 매트릭스 filler 칸은 'GF'이나 trap("605=등급코드, 필러 추측 금지")+§3b(CRASTIN 필러 디폴트 없음)+§5(환각 금지)와 모순.
//      스펙 핵심원칙(환각 0)에 따라 filler='없음'으로 검증. (보고서에 셀 오기 명시) conf med는 매트릭스와 일치.
test('B26 Crastin SK605 (DuPont PBT, 필러 추측 금지)', () => expectFields('Crastin SK605', { resinType: 'PBT', filler: '없음', fillerContent: '', confidence: 'med' }));
test('B27 Stanyl TW341 (DSM PA46)', () => expectFields('Stanyl TW341', { resinType: 'PA46', filler: '없음', fillerContent: '', confidence: 'high' }));
test('B28 Akulon K222-D (계열 high/세부 med)', () => expectFields('Akulon K222-D', { resinType: 'PA6', filler: '없음', fillerContent: '', confidence: 'med' }));

/* ── C. 환각 방지 / null ───────────────────────────────────────────── */
test('C29 G6 (브랜드 없음→null)', () => expectNull('G6'));
test('C30 슈퍼플라스틱 A1 (미상→null)', () => expectNull('슈퍼플라스틱 A1'));
test('C31 XYZ-2000 (미상 브랜드→null)', () => expectNull('XYZ-2000'));
test('C32 PA66-GFxx (계열만, %비움)', () => expectFields('PA66-GFxx', { resinType: 'PA66', filler: 'GF(유리섬유)', fillerContent: '' }));
test('C33 나일론 유리 30% (계열 모호→null)', () => expectNull('나일론 유리 30%'));
test('C34 (빈 입력→null)', () => expectNull(''));
test('C35 PA (번호 없음→null)', () => expectNull('PA'));

/* ── D. 난연·타입 ───────────────────────────────────────────────────── */
test('D36 PA66-GF25 UL94 V-0', () => expectFields('PA66-GF25 UL94 V-0', { flameRetardant: 'UL94 V-0', flameRetardantType: '해당없음' }));
test('D37 PBT-GF30 V0 HF (할로겐프리)', () => expectFields('PBT-GF30 V0 HF', { flameRetardant: 'UL94 V-0', flameRetardantType: '할로겐프리' }));
test('D38 PA6-GF30 FR (등급불명→없음+note)', () => expectFields('PA6-GF30 FR', { flameRetardant: '없음', flameRetardantType: '해당없음', note: 'FR-unclassified' }));
test('D39 PC-GF10 5VA', () => expectFields('PC-GF10 5VA', { flameRetardant: 'UL94 5VA', flameRetardantType: '해당없음' }));
test('D40 PA66 적인계 V0', () => expectFields('PA66 적인계 V0', { flameRetardant: 'UL94 V-0', flameRetardantType: '적인계' }));
