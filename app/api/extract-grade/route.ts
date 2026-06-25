import Anthropic from '@anthropic-ai/sdk';
import { NextRequest, NextResponse } from 'next/server';
import { tryMock } from '@/lib/mock';
import { supabaseAdmin } from '@/lib/supabase/server';
import { resolveGradeCore, type CacheValue } from '@/lib/resolve-grade-core';

// 포대 라벨 사진 OCR → 그레이드명 추출 → 서버 내부에서 resolve 연결 (클라 왕복 1회).
// extract-settings 패턴 미러. 사출기 OCR과 rate limit 예산 분리. 무료(무차감).
const ALLOWED_IMAGE_TYPES = new Set(['image/jpeg', 'image/png', 'image/webp', 'image/gif']);
const MAX_IMAGE_BYTES = 4 * 1024 * 1024; // 4 MB (클라 다운스케일·Vercel 페이로드와 정합)
const DAILY_LIMIT = 20;

type Ocr = { manufacturer: string; gradeName: string; resinFamily: string; fillerText: string; flameText: string };

function sanitizeOcr(raw: unknown): Ocr {
  const o = (raw && typeof raw === 'object') ? raw as Record<string, unknown> : {};
  const s = (v: unknown) => (typeof v === 'string' ? v.trim().slice(0, 120) : '');
  return {
    manufacturer: s(o.manufacturer),
    gradeName: s(o.gradeName),
    resinFamily: s(o.resinFamily),
    fillerText: s(o.fillerText),
    flameText: s(o.flameText),
  };
}

export async function POST(request: NextRequest) {
  try {
    const MAX_PAYLOAD = 4.4 * 1024 * 1024;  // Vercel 함수 페이로드 한도(~4.5MB) 안전선
    if (Number(request.headers.get('content-length') || 0) > MAX_PAYLOAD) {
      return NextResponse.json({ error: '요청 용량이 너무 큽니다. 사진을 줄여 다시 시도해주세요.' }, { status: 413 });
    }
    const body = await request.json().catch(() => ({}));
    const mock = tryMock(body, 'extract-grade'); if (mock) return mock;

    // ── 인증 (extract-settings 패턴) ──
    const authHeader = request.headers.get('authorization') || '';
    const token = authHeader.startsWith('Bearer ') ? authHeader.slice(7) : '';
    if (!token) return NextResponse.json({ error: '로그인이 필요합니다.', code: 'AUTH_REQUIRED' }, { status: 401 });
    const { data: userData, error: userErr } = await supabaseAdmin.auth.getUser(token);
    if (userErr || !userData?.user) return NextResponse.json({ error: '로그인이 필요합니다.', code: 'AUTH_REQUIRED' }, { status: 401 });
    const userId = userData.user.id;

    // ── 일일 rate limit (20/일, 사출기 OCR과 분리) ──
    const today = new Date().toISOString().split('T')[0];
    const { data: rlData, error: rlErr } = await supabaseAdmin.rpc('increment_extract_grade_count', {
      p_user_id: userId, p_date: today, p_limit: DAILY_LIMIT,
    });
    if (rlErr) return NextResponse.json({ error: 'Rate limit 확인 중 오류', code: 'RL_ERROR' }, { status: 500 });
    const rl = rlData as { ok: boolean; count: number };
    if (!rl?.ok) {
      return NextResponse.json(
        { error: `오늘 라벨 자동 입력 한도(${DAILY_LIMIT}회)를 초과했습니다. 직접 입력은 계속 가능합니다.`, code: 'RATE_LIMIT' },
        { status: 429 }
      );
    }

    // ── 입력 검증 (MIME + 8MB) ──
    const { image } = body;
    if (!image) return NextResponse.json({ error: '이미지가 없습니다.' }, { status: 400 });
    if (!ALLOWED_IMAGE_TYPES.has(image.mediaType)) {
      return NextResponse.json({ error: '지원하지 않는 파일 형식입니다. (허용: jpeg/png/webp/gif)' }, { status: 415 });
    }
    const decodedBytes = Buffer.byteLength(image.data ?? '', 'base64');
    if (decodedBytes > MAX_IMAGE_BYTES) {
      return NextResponse.json({ error: `이미지가 너무 큽니다. 최대 8 MB (${(decodedBytes / 1024 / 1024).toFixed(1)} MB 수신)` }, { status: 413 });
    }

    // ── Vision OCR ──
    const apiKey = process.env.ANTHROPIC_API_KEY || '';
    if (!apiKey) return NextResponse.json({ error: '서버 환경변수 ANTHROPIC_API_KEY 미설정' }, { status: 500 });
    const client = new Anthropic({ apiKey });
    const response = await client.messages.create({
      model: 'claude-sonnet-4-6',
      max_tokens: 1024,
      messages: [{
        role: 'user',
        content: [
          {
            type: 'image',
            source: {
              type: 'base64',
              media_type: image.mediaType as 'image/jpeg' | 'image/png' | 'image/gif' | 'image/webp',
              data: image.data,
            },
          },
          {
            type: 'text',
            text: `이 사진은 플라스틱 수지 포대(라벨)·박스·성적서다. 사진에 적힌 내용만 읽어 JSON 하나로 반환하라.

반드시 JSON 객체 하나만 반환(머리말·설명·코드펜스 없이 '{'로 시작):
{
  "manufacturer": "",
  "gradeName": "",
  "resinFamily": "",
  "fillerText": "",
  "flameText": ""
}

각 항목:
- manufacturer: 제조사/공급사명(라벨에 적힌 그대로 식별만, 추천 아님).
- gradeName: 수지 그레이드명(예: PA66-GF30, Ultramid A3EG6, 케피탈 F20-03). 라벨에서 가장 핵심 식별자.
- resinFamily: 수지 계열 표기가 따로 있으면(예: PA66, POM).
- fillerText: 강화재/함량 관련 문구(예: GF30, 유리섬유 30%).
- flameText: 난연 관련 문구(예: UL94 V-0, FR).

규칙:
- 인쇄 라벨 우선, 손글씨는 보조. 안 보이거나 확실치 않은 항목은 반드시 빈 문자열("")로 둬라.
- 추측·환각 금지. 라벨에 없는 값을 지어내지 마라. 대체 그레이드·타사 제품 추천 금지.`,
          },
        ],
      }],
    });

    const tb = response.content.find((b) => b.type === 'text');
    let ocr: Ocr;
    try {
      let txt = (tb && tb.type === 'text' ? tb.text : '').trim()
        .replace(/^```json\s*/i, '').replace(/^```\s*/i, '').replace(/\s*```$/, '');
      const a = txt.indexOf('{'); const z = txt.lastIndexOf('}');
      if (a !== -1 && z > a) txt = txt.slice(a, z + 1);
      ocr = sanitizeOcr(JSON.parse(txt));
    } catch {
      ocr = sanitizeOcr(null); // 파싱 실패 → 전부 빈값(환각 금지)
    }

    // ── gradeName 인식 시 서버 내부에서 resolve 연결 ──
    let resolved: CacheValue | null = null;
    let cached = false;
    if (ocr.gradeName) {
      const outcome = await resolveGradeCore(ocr.gradeName, userId);
      if (outcome.kind === 'ok') {
        resolved = outcome.result;
        cached = outcome.cached;
      }
      // rate_limited/rl_error → resolved=null (OCR은 성공, resolve만 보류)
    }

    return NextResponse.json({ ocr, resolved, cached });
  } catch (error) {
    console.error('[extract-grade] error:', error);
    return NextResponse.json(
      { error: '라벨 분석 중 오류가 발생했습니다. 잠시 후 다시 시도해주세요.' },  // 일반화
      { status: 500 }
    );
  }
}
