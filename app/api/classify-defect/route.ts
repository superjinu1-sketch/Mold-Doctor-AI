import Anthropic from '@anthropic-ai/sdk';
import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase/server';
import { VISUAL_DIFFERENTIAL } from '@/app/api/diagnose/route';
import { reportError } from '@/lib/observability/server';

// 경량 불량유형 분류(사진→제안). 보조 기능: 크레딧·진단 카운트 차감 없음(과금 RPC 호출 안 함).
const ALLOWED_IMAGE_TYPES = new Set(['image/jpeg', 'image/png', 'image/webp', 'image/gif']);
const MAX_IMAGE_BYTES = 4 * 1024 * 1024; // 4 MB (Vercel 함수 페이로드 ~4.5MB보다 작게 — 413 가드)

// 봇/abuse 차단 rate-limit (정상 사용자 천장보다 훨씬 높게 — 조정: 진우). 크레딧 0 엔드포인트라 user당 윈도우 한도가 유일 방어.
const CLASSIFY_HOURLY_LIMIT = 10;
const CLASSIFY_DAILY_LIMIT = 30;

function getApiKey(): string {
  return process.env.ANTHROPIC_API_KEY || '';
}

export async function POST(request: NextRequest) {
  try {
    const MAX_PAYLOAD = 4.4 * 1024 * 1024;  // Vercel 함수 페이로드 한도(~4.5MB) 안전선
    if (Number(request.headers.get('content-length') || 0) > MAX_PAYLOAD) {
      return NextResponse.json({ error: '요청 용량이 너무 큽니다. 사진을 줄여 다시 시도해주세요.' }, { status: 413 });
    }
    const body = await request.json();

    // ── 인증 (extract-settings 패턴) — 크레딧/카운트 차감은 하지 않음 ──
    const authHeader = request.headers.get('authorization') || '';
    const token = authHeader.startsWith('Bearer ') ? authHeader.slice(7) : '';
    if (!token) {
      return NextResponse.json({ error: '로그인이 필요합니다.', code: 'AUTH_REQUIRED' }, { status: 401 });
    }
    const { data: userData, error: userErr } = await supabaseAdmin.auth.getUser(token);
    if (userErr || !userData?.user) {
      return NextResponse.json({ error: '로그인이 필요합니다.', code: 'AUTH_REQUIRED' }, { status: 401 });
    }

    // ── rate-limit (시간당 + 일일 이중) — user당 윈도우 카운터 ──
    const now = new Date().toISOString();
    const dayBucket = now.slice(0, 10);   // 2026-06-24
    const hourBucket = now.slice(0, 13);  // 2026-06-24T13
    const ep = 'classify-defect';
    for (const [bucket, limit, label] of [
      [hourBucket, CLASSIFY_HOURLY_LIMIT, '시간당'],
      [dayBucket, CLASSIFY_DAILY_LIMIT, '일일'],
    ] as const) {
      const { data: rl, error: rlErr } = await supabaseAdmin.rpc('increment_api_count', {
        p_user_id: userData.user.id, p_bucket: bucket, p_endpoint: ep, p_limit: limit,
      });
      if (rlErr) {
        return NextResponse.json({ error: 'Rate limit 확인 중 오류', code: 'RL_ERROR' }, { status: 500 });
      }
      if (!(rl as { ok: boolean })?.ok) {
        return NextResponse.json({ error: `${label} 사용 한도(${limit}회)를 초과했습니다.`, code: 'RATE_LIMIT' }, { status: 429 });
      }
    }

    // ── 입력 검증 (MIME + 크기) ───────────────────────────
    const { image } = body;
    if (!image) return NextResponse.json({ error: '이미지가 없습니다.' }, { status: 400 });
    if (!ALLOWED_IMAGE_TYPES.has(image.mediaType)) {
      return NextResponse.json({ error: '지원하지 않는 파일 형식입니다. (허용: jpeg/png/webp/gif)' }, { status: 415 });
    }
    const decodedBytes = Buffer.byteLength(image.data ?? '', 'base64');
    if (decodedBytes > MAX_IMAGE_BYTES) {
      return NextResponse.json(
        { error: `이미지가 너무 큽니다. 최대 8 MB (${(decodedBytes / 1024 / 1024).toFixed(1)} MB 수신)` },
        { status: 413 }
      );
    }

    // ── Anthropic 경량 분류 호출 ──────────────────────────
    const apiKey = getApiKey();
    if (!apiKey) return NextResponse.json({ error: '서버 환경변수 ANTHROPIC_API_KEY 미설정' }, { status: 500 });
    const client = new Anthropic({ apiKey });
    const response = await client.messages.create({
      model: 'claude-sonnet-4-6',
      max_tokens: 256,
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
            text: `이 사진은 사출 성형 불량 제품입니다. 아래 외관 감별 기준으로 가장 가능성 높은 불량 유형 1개와 신뢰도를 판별하세요.

${VISUAL_DIFFERENTIAL}

후보 12종(en): Short Shot, Flash, Sink Mark, Weld Line, Burn Mark, Silver Streak, Discoloration, Crack, Warpage, Void/Bubble, Jetting, Other
규칙: 불명확하거나 판독 어려우면 confidence='low'. 사출 불량이 안 보이면 defect_type을 비우고 confidence='low'.
en 값은 위 후보 목록 문자열을 그대로 사용하세요.
JSON 객체 하나만 반환(머리말·설명·코드펜스 없이 첫 글자가 '{'로 시작):
{ "defect_type": { "ko": "", "en": "" }, "confidence": "high|med|low" }`,
          },
        ],
      }],
    });

    const textBlock = response.content.find((b) => b.type === 'text');
    if (!textBlock || textBlock.type !== 'text') {
      return NextResponse.json({ error: '분석 실패' }, { status: 500 });
    }

    let jsonText = textBlock.text.trim()
      .replace(/^```json\s*/i, '').replace(/\s*```$/, '')
      .replace(/^```\s*/i, '').replace(/\s*```$/, '');
    const firstBrace = jsonText.indexOf('{');
    const lastBrace = jsonText.lastIndexOf('}');
    if (firstBrace !== -1 && lastBrace > firstBrace) {
      jsonText = jsonText.slice(firstBrace, lastBrace + 1);
    }

    try {
      const result = JSON.parse(jsonText);
      return NextResponse.json(result);
    } catch {
      console.error('[classify-defect] JSON parse fail. raw head:', textBlock.text.slice(0, 300));
      return NextResponse.json({ error: 'AI 응답을 파싱할 수 없습니다.' }, { status: 422 });
    }
  } catch (error) {
    reportError('classify-defect', error);
    return NextResponse.json(
      { error: '분류 중 오류가 발생했습니다. 잠시 후 다시 시도해주세요.' },  // 일반화
      { status: 500 }
    );
  }
}
