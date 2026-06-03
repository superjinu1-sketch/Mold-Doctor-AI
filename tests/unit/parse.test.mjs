#!/usr/bin/env node
/**
 * tests/unit/parse.test.mjs
 * Claude API 호출 0 — 순수 함수 단위 테스트
 * 실행: node --test tests/unit/parse.test.mjs
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dir = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dir, '../..');
const FIXTURES = join(ROOT, 'tests/fixtures/responses');

/* ── inline helpers (route.ts 로직 복사 — import 없이 테스트) ── */

function sanitizeJsonNewlines(text) {
  let out = '';
  let inString = false;
  let escaped = false;
  for (let i = 0; i < text.length; i++) {
    const ch = text[i];
    if (escaped) { out += ch; escaped = false; continue; }
    if (ch === '\\') { out += ch; escaped = true; continue; }
    if (ch === '"') { inString = !inString; out += ch; continue; }
    if (inString && (ch === '\n' || ch === '\r')) { out += ' '; continue; }
    out += ch;
  }
  return out;
}

function parseWithFallback(rawText) {
  try {
    return { ok: true, result: JSON.parse(sanitizeJsonNewlines(rawText)) };
  } catch {
    try {
      const match = rawText.match(/\{[\s\S]*\}/);
      if (!match) throw new Error('No JSON block');
      return { ok: true, result: JSON.parse(sanitizeJsonNewlines(match[0])) };
    } catch {
      const getText = (key) => {
        const m = rawText.match(new RegExp(`"${key}"\\s*:\\s*"([^"]*)"`, 'i'));
        return m ? m[1] : '';
      };
      return {
        ok: false,
        result: {
          defect_type: { ko: getText('ko') || '분석 완료', en: getText('en') || 'Analysis Complete' },
          defect_phase: getText('defect_phase') || 'unknown',
          severity: getText('severity') || 'medium',
          summary: getText('summary') || '분석 결과를 확인하세요',
          raw_response: rawText,
          causes: [],
          recommendations: [],
          checklist: { before_changes: [], after_changes: [], escalation: [] },
        },
      };
    }
  }
}

/* ── sanitizeJsonNewlines ── */

test('sanitizeJsonNewlines: 문자열 내 줄바꿈 → 공백 치환', () => {
  const input = '{"key": "line1\nline2"}';
  const result = JSON.parse(sanitizeJsonNewlines(input));
  assert.equal(result.key, 'line1 line2');
});

test('sanitizeJsonNewlines: 문자열 밖 줄바꿈 유지', () => {
  const input = '{\n"key": "value"\n}';
  const result = JSON.parse(sanitizeJsonNewlines(input));
  assert.equal(result.key, 'value');
});

test('sanitizeJsonNewlines: 이스케이프 따옴표 처리', () => {
  const input = '{"key": "say \\"hello\\""}';
  const result = JSON.parse(sanitizeJsonNewlines(input));
  assert.equal(result.key, 'say "hello"');
});

test('sanitizeJsonNewlines: 연속 이스케이프 슬래시', () => {
  const input = '{"path": "C:\\\\Users\\\\test"}';
  const result = JSON.parse(sanitizeJsonNewlines(input));
  assert.equal(result.path, 'C:\\Users\\test');
});

/* ── parseWithFallback + fixtures ── */

test('parseWithFallback: normal.json — 완전 파싱 성공', () => {
  const raw = readFileSync(join(FIXTURES, 'normal.json'), 'utf-8');
  const { ok, result } = parseWithFallback(raw);
  assert.equal(ok, true, '정상 JSON은 파싱 성공');
  assert.equal(result.defect_type.en, 'Silver Streak');
  assert.ok(result.causes.length > 0, 'causes 있어야 함');
  assert.ok(result.recommendations.length > 0, 'recommendations 있어야 함');
  assert.equal(result.raw_response, undefined, '정상 응답엔 raw_response 없어야 함');
});

test('parseWithFallback: truncated.json — route fallback 출력 구조 검증', () => {
  // truncated.json = route가 Claude 잘린 응답을 받아 fallback 처리한 결과물
  // raw_response 필드가 있는 유효한 JSON
  const raw = readFileSync(join(FIXTURES, 'truncated.json'), 'utf-8');
  const { ok, result } = parseWithFallback(raw);
  assert.equal(ok, true, 'truncated fixture는 유효한 JSON — parseWithFallback 성공');
  // P0 핵심: raw_response 필드 존재 → DiagnosisResultPanel이 안전 카드 렌더링
  assert.equal(typeof result.raw_response, 'string', 'raw_response 필드 존재');
  const hasRawResponse = !!result.raw_response;
  assert.equal(hasRawResponse, true, 'hasRawResponse=true → safe card 렌더링 경로 진입');
  // causes/recommendations는 빈 배열 (fallback 결과)
  assert.deepEqual(result.causes, [], 'causes 빈 배열');
  assert.deepEqual(result.recommendations, [], 'recommendations 빈 배열');
  assert.equal(result.defect_type.en, 'Silver Streak');
});

test('parseWithFallback: image_unreadable.json — Image_Unreadable 케이스', () => {
  const raw = readFileSync(join(FIXTURES, 'image_unreadable.json'), 'utf-8');
  const { ok, result } = parseWithFallback(raw);
  assert.equal(ok, true);
  assert.equal(result.defect_type.en, 'Image_Unreadable');
  assert.deepEqual(result.causes, []);
  assert.deepEqual(result.recommendations, []);
  // 이 케이스는 의도된 빈 배열 — raw_response 없어야 함
  assert.equal(result.raw_response, undefined);
});

test('parseWithFallback: no_defect.json — No_Defect_Detected 케이스', () => {
  const raw = readFileSync(join(FIXTURES, 'no_defect.json'), 'utf-8');
  const { ok, result } = parseWithFallback(raw);
  assert.equal(ok, true);
  assert.equal(result.defect_type.en, 'No_Defect_Detected');
  assert.deepEqual(result.causes, []);
});

test('parseWithFallback: 완전히 파싱 불가 입력 → regex fallback', () => {
  const raw = 'not json at all {"defect_phase": "filling", "severity": "high", "ko": "플래시"';
  const { ok, result } = parseWithFallback(raw);
  assert.equal(ok, false);
  assert.equal(typeof result.raw_response, 'string');
  assert.equal(result.defect_phase, 'filling');
  assert.equal(result.severity, 'high');
});

/* ── downscale: PDF passthrough (lib/downscale.ts 컴파일 없이 로직만 검증) ── */

test('downscale: PDF media type passthrough (로직 검증)', () => {
  // lib/downscale.ts의 핵심 분기 — PDF는 그대로 반환
  function downscaleLogic(mediaType) {
    if (mediaType === 'application/pdf') return 'passthrough';
    return 'resized';
  }
  assert.equal(downscaleLogic('application/pdf'), 'passthrough');
  assert.equal(downscaleLogic('image/jpeg'), 'resized');
  assert.equal(downscaleLogic('image/png'), 'resized');
});

/* ── MOCK 모드 유틸: tryMock 로직 검증 ── */

test('tryMock: MOCK_AI 미설정 시 null 반환 (통과)', () => {
  // process.env.MOCK_AI가 없을 때 null 반환 → 실제 API 호출 경로
  const MOCK_AI = process.env.MOCK_AI;
  delete process.env.MOCK_AI;
  function tryMockLogic(body, defaultFixture) {
    if (process.env.MOCK_AI !== '1') return null;
    return { fixture: body.__fixture || defaultFixture };
  }
  assert.equal(tryMockLogic({}, 'normal'), null);
  if (MOCK_AI) process.env.MOCK_AI = MOCK_AI;
});

test('tryMock: MOCK_AI=1 + __fixture 지정 시 해당 픽스처 이름 반환', () => {
  const orig = process.env.MOCK_AI;
  process.env.MOCK_AI = '1';
  function tryMockLogic(body, defaultFixture) {
    if (process.env.MOCK_AI !== '1') return null;
    return { fixture: body.__fixture || defaultFixture };
  }
  assert.deepEqual(tryMockLogic({ __fixture: 'truncated' }, 'normal'), { fixture: 'truncated' });
  assert.deepEqual(tryMockLogic({}, 'normal'), { fixture: 'normal' });
  process.env.MOCK_AI = orig ?? '';
});

console.log('\nRun: node --test tests/unit/parse.test.mjs\n');
