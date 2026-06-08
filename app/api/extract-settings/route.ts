import Anthropic from '@anthropic-ai/sdk';
import { NextRequest, NextResponse } from 'next/server';
import { tryMock } from '@/lib/mock';
import { supabaseAdmin } from '@/lib/supabase/server';

const ALLOWED_IMAGE_TYPES = new Set(['image/jpeg', 'image/png', 'image/webp', 'image/gif']);
const MAX_IMAGE_BYTES = 8 * 1024 * 1024; // 8 MB
const DAILY_LIMIT = 20;

function getApiKey(): string {
  return process.env.ANTHROPIC_API_KEY || '';
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const mock = tryMock(body, 'extract'); if (mock) return mock;

    // ── 인증 ──────────────────────────────────────────────
    const authHeader = request.headers.get('authorization') || '';
    const token = authHeader.startsWith('Bearer ') ? authHeader.slice(7) : '';
    if (!token) {
      return NextResponse.json({ error: '로그인이 필요합니다.', code: 'AUTH_REQUIRED' }, { status: 401 });
    }
    const { data: userData, error: userErr } = await supabaseAdmin.auth.getUser(token);
    if (userErr || !userData?.user) {
      return NextResponse.json({ error: '로그인이 필요합니다.', code: 'AUTH_REQUIRED' }, { status: 401 });
    }
    const userId = userData.user.id;

    // ── 일일 rate limit (20회/일) ──────────────────────────
    const today = new Date().toISOString().split('T')[0];
    const { data: rlData, error: rlErr } = await supabaseAdmin.rpc('increment_extract_count', {
      p_user_id: userId,
      p_date: today,
      p_limit: DAILY_LIMIT,
    });
    if (rlErr) {
      return NextResponse.json({ error: 'Rate limit 확인 중 오류', code: 'RL_ERROR' }, { status: 500 });
    }
    const rl = rlData as { ok: boolean; count: number };
    if (!rl?.ok) {
      return NextResponse.json(
        { error: `일일 사용 한도(${DAILY_LIMIT}회)를 초과했습니다. 내일 다시 시도하세요.`, code: 'RATE_LIMIT' },
        { status: 429 }
      );
    }

    // ── 입력 검증 (MIME + 크기) ───────────────────────────
    const { image } = body;
    if (!image) return NextResponse.json({ error: '이미지가 없습니다.' }, { status: 400 });
    if (!ALLOWED_IMAGE_TYPES.has(image.mediaType)) {
      return NextResponse.json(
        { error: '지원하지 않는 파일 형식입니다. (허용: jpeg/png/webp/gif)' },
        { status: 415 }
      );
    }
    const decodedBytes = Buffer.byteLength(image.data ?? '', 'base64');
    if (decodedBytes > MAX_IMAGE_BYTES) {
      return NextResponse.json(
        { error: `이미지가 너무 큽니다. 최대 8 MB (${(decodedBytes / 1024 / 1024).toFixed(1)} MB 수신)` },
        { status: 413 }
      );
    }

    // ── Anthropic 호출 ────────────────────────────────────
    const apiKey = getApiKey();
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
            text: `이 사진은 사출 성형기의 셋팅값 화면입니다. 보이는 수치를 최대한 읽어서 JSON으로 반환하세요.

값이 보이지 않거나 확인 불가한 항목은 빈 문자열("")로 두세요.

반드시 아래 JSON 형식만 반환하세요 (마크다운 없이):
{
  "nozzleTemp": "",
  "zone1Temp": "",
  "zone2Temp": "",
  "zone3Temp": "",
  "zone4Temp": "",
  "moldTempFixed": "",
  "moldTempMoving": "",
  "injPressure1": "",
  "holdPressure": "",
  "injSpeed1": "",
  "injSpeed2": "",
  "holdTime": "",
  "coolTime": "",
  "injTime": "",
  "metering": "",
  "cushion": "",
  "backPressure": "",
  "screwRpm": "",
  "clampForce": ""
}

각 항목 설명:
- nozzleTemp: 노즐 온도 (℃)
- zone1~4Temp: 실린더 1~4존 온도 (℃)
- moldTempFixed: 고정측 금형온도 (℃)
- moldTempMoving: 가동측 금형온도 (℃)
- injPressure1: 1차 사출압력 (MPa 또는 bar)
- holdPressure: 보압 (MPa 또는 bar)
- injSpeed1: 1차 사출속도 (% 또는 mm/s)
- injSpeed2: 2차 사출속도
- holdTime: 보압 시간 (sec)
- coolTime: 냉각 시간 (sec)
- injTime: 사출 시간 (sec)
- metering: 계량 위치 (mm)
- cushion: 쿠션 (mm)
- backPressure: 배압 (MPa)
- screwRpm: 스크류 회전수 (rpm)
- clampForce: 형체력 (ton)`,
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

    try {
      const result = JSON.parse(jsonText);
      const eu = response.usage as unknown as Record<string, number>;
      return NextResponse.json(result, {
        headers: {
          'X-Usage-In': String(eu.input_tokens ?? 0),
          'X-Usage-Out': String(eu.output_tokens ?? 0),
          'X-Usage-CacheRead': String(eu.cache_read_input_tokens ?? 0),
          'X-Usage-CacheWrite': String(eu.cache_creation_input_tokens ?? 0),
          'X-Usage-Model': response.model,
        },
      });
    } catch {
      return NextResponse.json({ error: 'AI 응답을 파싱할 수 없습니다. 사출기 화면이 선명한 사진을 사용해주세요.' }, { status: 422 });
    }
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : '셋팅값 추출 실패' },
      { status: 500 }
    );
  }
}
