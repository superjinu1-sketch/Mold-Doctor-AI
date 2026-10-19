#!/usr/bin/env node
// kb-research 배치 실행기 — .claude/skills/kb-researcher 절차를 Message Batches API로 돌린다.
// gatherer 전용: KB 파일(lib/defect-kb.ts 등)은 읽기만 하고 절대 수정하지 않는다.
// 리포트는 docs/kb-research/batch-<날짜>/ 에 "미검토 후보"로만 쓴다. 채택은 사람 검토 → mandate 경유.
//
// 과금 격리: dev-eval과 같은 ANTHROPIC_API_KEY_EVAL(eval 워크스페이스 키)만 쓴다. prod 키로는 거부.
// 잔액 보호: 조직 잔액이 바닥나면 운영 앱의 추정이 멈추므로, 노드별 도구 호출·페치 토큰을 상한으로
// 묶고 --budget(USD)을 넘을 수 있는 크기의 배치는 제출하지 않는다.
//
// 사용:
//   node scripts/kb-research-batch.mjs submit --nodes black_specks,warpage --budget 10
//   node scripts/kb-research-batch.mjs collect --batch <batch_id>
import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import Anthropic from '@anthropic-ai/sdk';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const MODEL = 'claude-opus-5-5';

// Batch 단가(USD / 1M 토큰) = 표준가의 50%. Opus 5.5 표준: 입력 $4, 출력 $20, 캐시 읽기 $0.20.
const PRICE = { input: 2.0, output: 10.0, cacheWrite: 2.5, cacheRead: 0.1, perSearch: 0.01 };

// 노드당 도구 상한 — 최악 비용을 묶는 장치. 스킬 규율("과도한 검색 금지")과도 일치.
const MAX_SEARCHES = 6;
const MAX_FETCHES = 6;
const MAX_FETCH_TOKENS = 12000;
const MAX_OUTPUT_TOKENS = 32000;
// 최악 시나리오 노드당 비용(보수적): 도구 왕복마다 누적 컨텍스트를 다시 읽는다고 보고 상한을 잡는다.
const WORST_CASE_PER_NODE_USD = 4.0;

function evalKey() {
  if (process.env.ANTHROPIC_API_KEY_EVAL) return process.env.ANTHROPIC_API_KEY_EVAL;
  const f = join(root, '.env.local');
  if (existsSync(f)) {
    const m = readFileSync(f, 'utf-8').match(/^\s*ANTHROPIC_API_KEY_EVAL\s*=\s*(.+?)\s*$/m);
    if (m) return m[1].trim().replace(/^["']|["']$/g, '');
  }
  return null;
}

function arg(name, fallback = null) {
  const i = process.argv.indexOf(`--${name}`);
  return i > -1 ? process.argv[i + 1] : fallback;
}

function today() {
  return new Date().toISOString().slice(0, 10).replace(/-/g, '');
}

// lib/defect-kb.ts 에서 최상위 노드 블록(`  nodeId: {` ~ 다음 노드 직전)을 원문 그대로 잘라낸다.
function loadNodes() {
  const src = readFileSync(join(root, 'lib/defect-kb.ts'), 'utf-8');
  const version = (src.match(/KB_VERSION\s*=\s*['"]([^'"]+)/) || [])[1] || 'unknown';
  const re = /^ {2}([a-z_]+): \{/gm;
  const marks = [...src.matchAll(re)].map(m => ({ id: m[1], at: m.index }));
  const nodes = {};
  marks.forEach((m, i) => {
    const end = i + 1 < marks.length ? marks[i + 1].at : src.length;
    nodes[m.id] = src.slice(m.at, end).trim();
  });
  return { version, nodes };
}

function buildPrompt(nodeId, nodeText, kbVersion, skillText) {
  return [
    `아래 절차서(kb-researcher 스킬)를 그대로 따라 defect-kb 노드 \`${nodeId}\` 의 검토용 후보 리포트 한 장을 작성하라.`,
    '',
    '<procedure>',
    skillText,
    '</procedure>',
    '',
    `<kb_version>${kbVersion}</kb_version>`,
    `<node id="${nodeId}">`,
    nodeText,
    '</node>',
    '',
    '실행 조건:',
    `- 웹 검색은 최대 ${MAX_SEARCHES}회, 웹 페치는 최대 ${MAX_FETCHES}회. 핵심 정량 주장 위주로 쓴다.`,
    '- 페치로 실제 열어 확인하지 못한 출처는 "NOT verified"로 표기한다. DOI·서지정보를 지어내지 않는다.',
    '- 너는 파일을 쓸 수 없다. 절차서의 "출력" 형식 그대로 마크다운 리포트 본문만 최종 답으로 출력하라.',
    `- 리포트 날짜는 ${new Date().toISOString().slice(0, 10)}.`,
    '- 리포트 최상단 인용 블록에 "생성: API 배치(미검토 후보)" 한 줄을 추가하라.',
  ].join('\n');
}

function costOf(usage) {
  if (!usage) return 0;
  const searches = usage.server_tool_use?.web_search_requests ?? 0;
  return (
    ((usage.input_tokens ?? 0) * PRICE.input +
      (usage.output_tokens ?? 0) * PRICE.output +
      (usage.cache_creation_input_tokens ?? 0) * PRICE.cacheWrite +
      (usage.cache_read_input_tokens ?? 0) * PRICE.cacheRead) / 1e6 +
    searches * PRICE.perSearch
  );
}

async function submit(client) {
  const ids = (arg('nodes') || '').split(',').map(s => s.trim()).filter(Boolean);
  const budget = Number(arg('budget', '0'));
  if (!ids.length) throw new Error('--nodes 필요');
  if (!(budget > 0)) throw new Error('--budget(USD) 필요');

  const worst = ids.length * WORST_CASE_PER_NODE_USD;
  if (worst > budget) {
    throw new Error(`최악 비용 $${worst.toFixed(2)} 가 예산 $${budget} 초과 — 노드 수를 줄이세요. 제출하지 않음.`);
  }

  const { version, nodes } = loadNodes();
  const missing = ids.filter(id => !nodes[id]);
  if (missing.length) throw new Error(`KB에 없는 노드: ${missing.join(', ')}`);
  const skillText = readFileSync(join(root, '.claude/skills/kb-researcher/SKILL.md'), 'utf-8');

  const requests = ids.map(id => ({
    custom_id: id,
    params: {
      model: MODEL,
      max_tokens: MAX_OUTPUT_TOKENS,
      thinking: { type: 'adaptive' },
      output_config: { effort: 'high' },
      tools: [
        { type: 'web_search_20260209', name: 'web_search', max_uses: MAX_SEARCHES },
        { type: 'web_fetch_20260209', name: 'web_fetch', max_uses: MAX_FETCHES, max_content_tokens: MAX_FETCH_TOKENS },
      ],
      messages: [{ role: 'user', content: buildPrompt(id, nodes[id], version, skillText) }],
    },
  }));

  const batch = await client.messages.batches.create({ requests });
  const outDir = join(root, 'docs/kb-research', `batch-${today()}`);
  mkdirSync(outDir, { recursive: true });
  const ledgerPath = join(outDir, '_ledger.json');
  const ledger = existsSync(ledgerPath) ? JSON.parse(readFileSync(ledgerPath, 'utf-8')) : { batches: [] };
  ledger.batches.push({ id: batch.id, nodes: ids, kbVersion: version, submittedAt: new Date().toISOString(), budget, worstCase: worst });
  writeFileSync(ledgerPath, JSON.stringify(ledger, null, 2));
  console.log(JSON.stringify({ batchId: batch.id, status: batch.processing_status, nodes: ids, worstCaseUsd: worst }, null, 1));
}

async function collect(client) {
  const id = arg('batch');
  if (!id) throw new Error('--batch 필요');
  const batch = await client.messages.batches.retrieve(id);
  if (batch.processing_status !== 'ended') {
    console.log(JSON.stringify({ batchId: id, status: batch.processing_status, counts: batch.request_counts }, null, 1));
    return;
  }
  const outDir = join(root, 'docs/kb-research', `batch-${today()}`);
  mkdirSync(outDir, { recursive: true });
  const rows = [];
  let total = 0;
  // 결과 묶음이 크면(페치한 웹 원문 포함) SDK 스트림이 중간에 끊긴다("terminated"). 원본 JSONL을
  // 먼저 디스크로 통째로 내려받고(재시도 포함) 로컬에서 한 줄씩 처리한다.
  const rawPath = join(outDir, `_raw-${id}.jsonl`);
  if (!existsSync(rawPath)) {
    let lastErr;
    for (let attempt = 1; attempt <= 4; attempt++) {
      try {
        const res = await fetch(batch.results_url, {
          headers: { 'x-api-key': client.apiKey, 'anthropic-version': '2023-06-01' },
          signal: AbortSignal.timeout(30 * 60 * 1000),
        });
        if (!res.ok) throw new Error(`results HTTP ${res.status}`);
        writeFileSync(rawPath, Buffer.from(await res.arrayBuffer()));
        lastErr = null;
        break;
      } catch (e) { lastErr = e; }
    }
    if (lastErr) throw lastErr;
  }
  const lines = readFileSync(rawPath, 'utf-8').split('\n').filter(Boolean);
  for (const line of lines) {
    const r = JSON.parse(line);
    const row = { node: r.custom_id, type: r.result.type };
    if (r.result.type === 'succeeded') {
      const msg = r.result.message;
      const text = msg.content.filter(b => b.type === 'text').map(b => b.text).join('\n').trim();
      const cost = costOf(msg.usage);
      total += cost;
      Object.assign(row, {
        stop: msg.stop_reason,
        inTok: msg.usage?.input_tokens,
        outTok: msg.usage?.output_tokens,
        searches: msg.usage?.server_tool_use?.web_search_requests ?? 0,
        fetches: msg.usage?.server_tool_use?.web_fetch_requests ?? 0,
        costUsd: Number(cost.toFixed(3)),
        chars: text.length,
      });
      // pause_turn·refusal 은 미완 — 리포트로 저장하지 않고 표시만 한다.
      if (msg.stop_reason === 'end_turn' && text) {
        writeFileSync(join(outDir, `${r.custom_id}-${today()}.md`), text + '\n');
      }
    } else {
      row.error = r.result.type === 'errored' ? (r.result.error?.error?.message || JSON.stringify(r.result.error)) : r.result.type;
    }
    rows.push(row);
  }
  writeFileSync(join(outDir, `_results-${id}.json`), JSON.stringify({ batchId: id, totalUsd: total, rows }, null, 2));
  console.log(JSON.stringify({ batchId: id, totalUsd: Number(total.toFixed(3)), rows }, null, 1));
}

const key = evalKey();
if (!key) {
  console.error('[kb-research] ANTHROPIC_API_KEY_EVAL 미설정 — prod 키로는 실행하지 않습니다.');
  process.exit(1);
}
const client = new Anthropic({ apiKey: key });
const cmd = process.argv[2];
try {
  if (cmd === 'submit') await submit(client);
  else if (cmd === 'collect') await collect(client);
  else { console.error('usage: submit --nodes a,b --budget N | collect --batch ID'); process.exit(1); }
} catch (e) {
  if (e instanceof Anthropic.APIError) console.error(`[kb-research] API ${e.status}: ${e.message}`);
  else console.error(`[kb-research] ${e.message}`);
  process.exit(1);
}
