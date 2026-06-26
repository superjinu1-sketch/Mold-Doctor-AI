import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase/server';

// 인앱 계정 삭제: auth.users 삭제 → 연결 테이블 ON DELETE CASCADE 연쇄 삭제
export async function POST(request: NextRequest) {
  try {
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

    // 오삭제 방지 확인값
    const body = await request.json().catch(() => ({}));
    if (body?.confirm !== 'DELETE') {
      return NextResponse.json({ error: '삭제 확인이 필요합니다.', code: 'CONFIRM_REQUIRED' }, { status: 400 });
    }

    const { error: delErr } = await supabaseAdmin.auth.admin.deleteUser(userId);
    if (delErr) {
      console.error('[account/delete] deleteUser fail:', delErr);
      return NextResponse.json({ error: '계정 삭제 중 오류가 발생했습니다. 잠시 후 다시 시도해주세요.', code: 'DELETE_FAILED' }, { status: 500 });
    }
    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error('[account/delete] error:', error);
    return NextResponse.json({ error: '계정 삭제 중 오류가 발생했습니다.', code: 'SERVER_ERROR' }, { status: 500 });
  }
}
