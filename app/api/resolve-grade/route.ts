import { NextRequest, NextResponse } from 'next/server';
import { tryMock } from '@/lib/mock';
import { supabaseAdmin } from '@/lib/supabase/server';
import { normalizeGrade } from '@/lib/grade-parser';
import { resolveGradeCore } from '@/lib/resolve-grade-core';

// thin wrapper: 인증·입력검증만. 파이프라인은 resolveGradeCore (extract-grade와 공유).
// 외부 계약(200 {...result, cached} / 401 / 400 EMPTY_INPUT / 429 RATE_LIMIT / 500)은 작업2와 동일.
export async function POST(request: NextRequest) {
  try {
    const body = await request.json().catch(() => ({}));
    const mock = tryMock(body, 'resolve'); if (mock) return mock;

    const authHeader = request.headers.get('authorization') || '';
    const token = authHeader.startsWith('Bearer ') ? authHeader.slice(7) : '';
    if (!token) return NextResponse.json({ error: '로그인이 필요합니다.', code: 'AUTH_REQUIRED' }, { status: 401 });
    const { data: userData, error: userErr } = await supabaseAdmin.auth.getUser(token);
    if (userErr || !userData?.user) return NextResponse.json({ error: '로그인이 필요합니다.', code: 'AUTH_REQUIRED' }, { status: 401 });
    const userId = userData.user.id;

    const rawGrade = typeof body.grade === 'string' ? body.grade : (typeof body.gradeName === 'string' ? body.gradeName : '');
    if (!normalizeGrade(rawGrade)) return NextResponse.json({ error: '그레이드명이 비어 있습니다.', code: 'EMPTY_INPUT' }, { status: 400 });

    const outcome = await resolveGradeCore(rawGrade, userId);
    if (outcome.kind === 'rl_error') return NextResponse.json({ error: 'Rate limit 확인 중 오류', code: 'RL_ERROR' }, { status: 500 });
    if (outcome.kind === 'rate_limited') {
      return NextResponse.json(
        { error: '오늘 자동 조회 한도(30회)를 초과했습니다. 직접 입력은 계속 가능합니다.', code: 'RATE_LIMIT' },
        { status: 429 }
      );
    }
    return NextResponse.json({ ...outcome.result, cached: outcome.cached });
  } catch (error) {
    console.error('[resolve-grade] error:', error);
    return NextResponse.json(
      { error: '그레이드 해석 중 오류가 발생했습니다. 잠시 후 다시 시도해주세요.' },  // 일반화
      { status: 500 }
    );
  }
}
