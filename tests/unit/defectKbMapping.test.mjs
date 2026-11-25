#!/usr/bin/env node
/**
 * tests/unit/defectKbMapping.test.mjs
 * 앱 폼의 불량 유형 12종이 모두 defect-kb 노드로 연결되는지(연결 안 되면 KB 가이드가 프롬프트에 안 들어간다).
 * '크랙 (Crack)'은 6/5부터 11/25까지 연결이 끊겨 있었다.
 * 실행: node --test tests/unit/defectKbMapping.test.mjs
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { getDefect } from '../../lib/defect-kb.ts';

const page = readFileSync(new URL('../../app/diagnose/page.tsx', import.meta.url), 'utf8');
const block = page.match(/const DEFECT_TYPES = \[([\s\S]*?)\];/)[1];
const types = [...block.matchAll(/'([^']+)'/g)].map(m => m[1]).filter(t => !t.startsWith('기타'));

test('앱 불량 유형 12종이 모두 KB 노드에 연결된다', () => {
  assert.equal(types.length, 12);
  const missing = types.filter(t => !getDefect(t));
  assert.deepEqual(missing, []);
});

test('대표 매핑', () => {
  assert.equal(getDefect('크랙 (Crack)')?.id, 'crack');
  assert.equal(getDefect('Crack')?.id, 'crack');
  assert.equal(getDefect('버닝/가스마크 (Burn Mark)')?.id, 'air_trap_burn');
  assert.equal(getDefect('GF 표면백화 (Fiber Read-out)')?.id, 'fiber_readout');
});
