import Anthropic from '@anthropic-ai/sdk';
import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase/server';
import { reportError } from '@/lib/observability/server';
import { checkMinVersion } from '@/lib/appVersionGate';
import { HELP_KB, type HelpKbItem } from '@/lib/help-kb';

// 도움말 위젯 API(help-desk-widget-v1). 크레딧 무소모 — 로그인/비로그인 둘 다 허용.
// 계약: POST {question, locale} → 200 {answer, source:'faq'|'ai'|'fallback', cta?:'diagnose'} | 429 {code:'RATE_LIMITED'}
const LOGIN_DAILY_LIMIT = 10;
const ANON_DAILY_LIMIT = 3;
const HELP_MODEL = 'claude-haiku-4-5-20251001';

function getApiKey(): string {
  return process.env.ANTHROPIC_API_KEY || '';
}

function getClientIp(request: NextRequest): string {
  const xff = request.headers.get('x-forwarded-for');
  if (xff) return xff.split(',')[0].trim();
  return 'unknown';
}

function normalize(s: string): string {
  return s.toLowerCase().replace(/\s+/g, ' ').trim();
}

// FAQ 우선 매칭(비용 0) — 로케일별 keywords 부분 문자열 포함 매칭, 최다 매칭 항목 채택.
function matchFaq(question: string, locale: 'ko' | 'en'): HelpKbItem | null {
  const q = normalize(question);
  let best: HelpKbItem | null = null;
  let bestCount = 0;
  for (const item of HELP_KB) {
    const keywords = locale === 'en' ? item.keywordsEn : item.keywordsKo;
    let count = 0;
    for (const kw of keywords) {
      if (q.includes(normalize(kw))) count++;
    }
    if (count > bestCount) {
      bestCount = count;
      best = item;
    }
  }
  return bestCount >= 1 ? best : null;
}

function buildSystemPrompt(locale: 'ko' | 'en'): string {
  const kbLines = HELP_KB.map(item => `- ${locale === 'en' ? item.answerEn : item.answerKo}`).join('\n');
  if (locale === 'en') {
    return `You are the in-app help assistant for Mold Doctor, an injection-molding defect diagnosis app. Answer ONLY questions about how to use the app, using the facts below. Do not invent features not listed here.

App facts:
${kbLines}

Rules:
- Stay within app usage. Answer in 4 sentences or fewer.
- If the question is a molding/engineering question (why a defect happens, how to fix it) rather than an app-usage question, do not attempt to answer it — instead point the user to the diagnosis feature, and end your reply with the exact token [CTA:DIAGNOSE].
- For anything about payment or buying credits, only say credits can be purchased from the app's Credits menu. Never mention external payment, free credits, or emailing for credits (Apple guideline 3.1.1).
- If the answer is not covered by the facts above, do not guess — tell the user to email jinsimlabs@jinsimlabs.com.`;
  }
  return `당신은 사출 성형 불량 진단 앱 Mold Doctor의 인앱 도움말 어시스턴트입니다. 아래 사실만 근거로 앱 사용법 질문에만 답하세요. 여기 없는 기능을 지어내지 마세요.

앱 사실:
${kbLines}

규칙:
- 앱 사용법 범위에서만 답한다. 4문장 이내로 답한다.
- 성형 기술 질문(왜 불량이 생기는지, 어떻게 고치는지)이면 답을 시도하지 말고 진단 기능으로 안내하고, 답변 끝에 정확히 [CTA:DIAGNOSE] 토큰을 붙인다.
- 결제·크레딧 구매 관련 질문에는 "앱의 충전 메뉴에서 구매할 수 있다"고만 안내한다. 외부 결제·무료 충전·이메일로 충전 등은 절대 언급하지 않는다(Apple 심사 가이드라인 3.1.1).
- 위 사실에 없는 내용은 추측하지 말고 jinsimlabs@jinsimlabs.com으로 문의하라고 안내한다.`;
}

async function logQuestion(question: string, locale: string, source: string): Promise<void> {
  try {
    await supabaseAdmin.from('help_questions').insert({ question, locale, source });
  } catch {
    // insert 실패는 무시 — 로그가 응답을 막으면 안 된다.
  }
}

export async function POST(request: NextRequest) {
  const gate = await checkMinVersion(request);
  if (gate) return gate;
  try {
    const body = await request.json();
    const question = typeof body?.question === 'string' ? body.question.trim() : '';
    const locale: 'ko' | 'en' = body?.locale === 'en' ? 'en' : 'ko';
    if (!question) {
      return NextResponse.json({ error: locale === 'en' ? 'Question is required.' : '질문을 입력해주세요.' }, { status: 400 });
    }

    // ── rate limit: 로그인 유저는 기존 api_usage_window(0007) 재사용, 비로그인은 IP 기반(0015) ──
    const authHeader = request.headers.get('authorization') || '';
    const token = authHeader.startsWith('Bearer ') ? authHeader.slice(7) : '';
    let userId: string | null = null;
    if (token) {
      const { data: userData } = await supabaseAdmin.auth.getUser(token);
      userId = userData?.user?.id ?? null;
    }

    const dayBucket = new Date().toISOString().slice(0, 10);
    if (userId) {
      const { data: rl, error: rlErr } = await supabaseAdmin.rpc('increment_api_count', {
        p_user_id: userId, p_bucket: dayBucket, p_endpoint: 'help', p_limit: LOGIN_DAILY_LIMIT,
      });
      if (rlErr) {
        return NextResponse.json({ error: 'Rate limit 확인 중 오류', code: 'RL_ERROR' }, { status: 500 });
      }
      if (!(rl as { ok: boolean })?.ok) {
        return NextResponse.json({ code: 'RATE_LIMITED' }, { status: 429 });
      }
    } else {
      const ip = getClientIp(request);
      const { data: rl, error: rlErr } = await supabaseAdmin.rpc('increment_help_ip_count', {
        p_ip: ip, p_bucket: dayBucket, p_limit: ANON_DAILY_LIMIT,
      });
      if (rlErr) {
        return NextResponse.json({ error: 'Rate limit 확인 중 오류', code: 'RL_ERROR' }, { status: 500 });
      }
      if (!(rl as { ok: boolean })?.ok) {
        return NextResponse.json({ code: 'RATE_LIMITED' }, { status: 429 });
      }
    }

    // ── 1. FAQ 우선 매칭(비용 0) ──────────────────────────
    const faqHit = matchFaq(question, locale);
    if (faqHit) {
      void logQuestion(question, locale, 'faq');
      return NextResponse.json({
        answer: locale === 'en' ? faqHit.answerEn : faqHit.answerKo,
        source: 'faq',
        ...(faqHit.cta ? { cta: faqHit.cta } : {}),
      });
    }

    // ── 2. LLM 폴백 ────────────────────────────────────
    const apiKey = getApiKey();
    if (!apiKey) {
      void logQuestion(question, locale, 'fallback');
      return NextResponse.json({
        answer: locale === 'en'
          ? 'Something went wrong. Try again, or email jinsimlabs@jinsimlabs.com.'
          : '잠시 오류가 있었어요. 다시 시도하거나 jinsimlabs@jinsimlabs.com 으로 문의해 주세요.',
        source: 'fallback',
      });
    }

    try {
      const client = new Anthropic({ apiKey });
      const response = await client.messages.create({
        model: HELP_MODEL,
        max_tokens: 400,
        system: buildSystemPrompt(locale),
        messages: [{ role: 'user', content: question }],
      });
      const textBlock = response.content.find(b => b.type === 'text');
      let answer = textBlock && textBlock.type === 'text' ? textBlock.text.trim() : '';
      let cta: 'diagnose' | undefined;
      if (answer.includes('[CTA:DIAGNOSE]')) {
        cta = 'diagnose';
        answer = answer.replace('[CTA:DIAGNOSE]', '').trim();
      }
      if (!answer) throw new Error('empty LLM response');

      void logQuestion(question, locale, 'ai');
      return NextResponse.json({ answer, source: 'ai', ...(cta ? { cta } : {}) });
    } catch (llmError) {
      reportError('help-llm-fallback', llmError);
      void logQuestion(question, locale, 'fallback');
      return NextResponse.json({
        answer: locale === 'en'
          ? 'Something went wrong. Try again, or email jinsimlabs@jinsimlabs.com.'
          : '잠시 오류가 있었어요. 다시 시도하거나 jinsimlabs@jinsimlabs.com 으로 문의해 주세요.',
        source: 'fallback',
      });
    }
  } catch (error) {
    reportError('help', error);
    return NextResponse.json(
      { error: '응답 처리 중 오류가 발생했습니다. 잠시 후 다시 시도해주세요.' },
      { status: 500 }
    );
  }
}
