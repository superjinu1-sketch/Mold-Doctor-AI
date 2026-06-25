import Anthropic from '@anthropic-ai/sdk';
import { NextRequest, NextResponse } from 'next/server';
import { tryMock } from '@/lib/mock';
import { supabaseAdmin } from '@/lib/supabase/server';
function getApiKey(): string {
  return process.env.ANTHROPIC_API_KEY || '';
}

// 컨텍스트 길이 상한 — 토큰 예산 상한 + 프롬프트 인젝션 표면 축소 (rate-limit은 add_follow_up 세션당 5회가 이미 방어).
const MAX_QUESTION = 2000;
const MAX_DIAGNOSIS = 8000;
const MAX_HISTORY_TURNS = 6;   // user+assistant 쌍 6턴
const MAX_MSG = 2000;
const capStr = (s: unknown, n: number): string => {
  const t = typeof s === 'string' ? s : String(s ?? '');
  return t.length > n ? t.slice(0, n) + '…(생략)' : t;
};
// machineSettings 허용 키 화이트리스트 (diagnose 입력 스키마 settings + advSettings). 자유 객체 통째 직렬화 금지.
const MS_ALLOWED = new Set([
  'nozzleTemp', 'zone1Temp', 'zone2Temp', 'zone3Temp', 'zone4Temp', 'moldTempFixed', 'moldTempMoving',
  'injPressure1', 'holdPressure', 'injSpeed1', 'injSpeed2', 'holdTime', 'coolTime', 'injTime',
  'metering', 'cushion', 'backPressure', 'screwRpm', 'clampForce', 'pressureUnit',
  'vpTransferPos', 'vpTransferPressure', 'preInjectDecompDist', 'preInjectDecompSpeed', 'postMeterDecompDist',
  'actualFillTime', 'actualPeakPressure', 'actualCushion', 'actualCycleTime', 'actualPartWeight',
  'dryTemp', 'dryTime', 'dryerType', 'moistureContent',
  'hrManifoldTemp', 'hrNozzle1Temp', 'hrNozzle2Temp', 'hrNozzle3Temp', 'hrNozzle4Temp', 'valveGate',
  'regrindRatio', 'colorType', 'mbRatio', 'machineModel', 'screwDiameter', 'maxClampForce', 'maxInjPressure', 'heatingMethod',
]);
function pickSettings(obj: unknown): Record<string, string | number> {
  if (!obj || typeof obj !== 'object') return {};
  const out: Record<string, string | number> = {};
  for (const [k, v] of Object.entries(obj as Record<string, unknown>)) {
    if (MS_ALLOWED.has(k) && (typeof v === 'string' || typeof v === 'number')) {
      out[k] = typeof v === 'string' ? v.slice(0, 100) : v;
    }
  }
  return out;
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const mock = tryMock(body, 'chat'); if (mock) return mock;
    const { question, diagnosisResult, chatHistory = [], resinType, machineSettings, locale } = body;

    if (!question?.trim()) {
      return NextResponse.json({ error: '질문을 입력해주세요.' }, { status: 400 });
    }

    const authHeader = req.headers.get('authorization') || '';
    const token = authHeader.startsWith('Bearer ') ? authHeader.slice(7) : '';
    if (!token) {
      return NextResponse.json({ error: '로그인이 필요합니다.', code: 'AUTH_REQUIRED' }, { status: 401 });
    }
    const { data: userData, error: userErr } = await supabaseAdmin.auth.getUser(token);
    if (userErr || !userData?.user) {
      return NextResponse.json({ error: '로그인이 필요합니다.', code: 'AUTH_REQUIRED' }, { status: 401 });
    }
    const userId = userData.user.id;

    const sessionId = body.session_id as string | undefined;
    if (!sessionId) {
      return NextResponse.json({ error: '세션 정보가 없습니다. 새 추정을 시작해주세요.', code: 'NO_SESSION' }, { status: 400 });
    }
    const { data: fuRaw, error: fuErr } = await supabaseAdmin.rpc('add_follow_up', {
      p_session_id: sessionId,
      p_user_id: userId,
    });
    if (fuErr) {
      return NextResponse.json({ error: '팔로업 처리 중 오류가 발생했습니다.', code: 'FOLLOWUP_ERROR' }, { status: 500 });
    }
    const fu = fuRaw as { ok: boolean; code?: string; follow_up_count?: number };
    if (!fu?.ok) {
      if (fu?.code === 'FOLLOWUP_LIMIT') {
        return NextResponse.json({ error: '이 추정의 추가 질문 5회를 모두 사용했습니다. 새 추정을 시작해 주세요.', code: 'FOLLOWUP_LIMIT' }, { status: 402 });
      }
      return NextResponse.json({ error: '세션을 찾을 수 없습니다.', code: 'NOT_FOUND' }, { status: 403 });
    }

    // rate-limit 미적용(의도): 세션 생성은 진단(크레딧) 필요 + add_follow_up 세션당 5회 제한이 봇 무한반복을 이미 차단. 대신 컨텍스트 길이 상한으로 토큰 abuse 방어.
    const apiKey = getApiKey();
    if (!apiKey) {
      return NextResponse.json({ error: '서버 환경변수 ANTHROPIC_API_KEY 미설정' }, { status: 500 });
    }

    // 진단 결과에서 핵심 필드만 추출 (비용 최적화)
    const contextResult = diagnosisResult ? {
      defect_type: diagnosisResult.defect_type,
      severity: diagnosisResult.severity,
      summary: diagnosisResult.summary,
      causes: diagnosisResult.causes,
      recommendations: diagnosisResult.recommendations,
      resin_specific_notes: diagnosisResult.resin_specific_notes,
      raw_response: diagnosisResult.raw_response,
    } : null;

    const isEn = locale === 'en';
    const contextLines = isEn ? [
      'You are an injection molding defect troubleshooting expert. Answer follow-up questions based on the previous analysis result.',
      '',
      'Guidelines:',
      '1. If the question relates to the analysis result, answer specifically and concisely.',
      '2. If parameter changes are needed, suggest exact numerical values.',
      '3. If the question is unrelated to injection molding, politely clarify scope.',
      '4. Respond in English. Technical terms in English.',
      '5. Keep answers to 2-3 paragraphs maximum.',
    ] : [
      '당신은 사출 성형 불량 추정 전문가입니다. 이전 추정 결과를 바탕으로 사용자의 후속 질문에 답변합니다.',
      '',
      '사용자의 질문에 대해:',
      '1. 추정 결과와 관련된 질문이면 구체적으로 답변',
      '2. 추가 조건 변경이 필요하면 구체적 수치로 제안',
      '3. 분석과 무관한 질문이면 정중히 범위를 안내',
      '4. 한국어로 답변, 기술 용어는 영문 병기',
      '5. 답변은 간결하게 2~3문단 이내',
    ];

    if (resinType) contextLines.push(`\n수지 종류: ${capStr(resinType, 200)}`);
    const safeSettings = pickSettings(machineSettings);
    if (Object.keys(safeSettings).length > 0) contextLines.push(`사출기 설정: ${JSON.stringify(safeSettings)}`);
    if (contextResult) contextLines.push(`\n이전 추정 결과:\n${capStr(JSON.stringify(contextResult, null, 2), MAX_DIAGNOSIS)}`);

    const systemPrompt = contextLines.join('\n');

    // chatHistory 최근 6턴만 유지 + 각 메시지 길이 상한
    const recentHistory = chatHistory.slice(-(MAX_HISTORY_TURNS * 2)); // user+assistant 쌍 6턴 = 12개

    const client = new Anthropic({ apiKey });
    const response = await client.messages.create({
      model: 'claude-sonnet-4-6',
      max_tokens: 500,
      system: systemPrompt,
      messages: [
        ...recentHistory.map((m: { role: string; content: string }) => ({
          role: m.role as 'user' | 'assistant',
          content: capStr(m.content, MAX_MSG),
        })),
        { role: 'user', content: capStr(question.trim(), MAX_QUESTION) },
      ],
    });

    const answer = response.content[0].type === 'text' ? response.content[0].text : '';
    const cu = response.usage as unknown as Record<string, number>;
    return NextResponse.json({ answer }, {
      headers: {
        'X-Usage-In': String(cu.input_tokens ?? 0),
        'X-Usage-Out': String(cu.output_tokens ?? 0),
        'X-Usage-CacheRead': String(cu.cache_read_input_tokens ?? 0),
        'X-Usage-CacheWrite': String(cu.cache_creation_input_tokens ?? 0),
        'X-Usage-Model': response.model,
      },
    });
  } catch (error) {
    console.error('Chat API error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : '채팅 응답 중 오류가 발생했습니다.' },
      { status: 500 }
    );
  }
}
