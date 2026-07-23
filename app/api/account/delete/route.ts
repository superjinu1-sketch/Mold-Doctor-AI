import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase/server';
import { reportError } from '@/lib/observability/server';

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

    // 작업표준 저장소 Storage 사진 정리 — DB는 FK cascade로 정리되지만 Storage 객체는 별도 삭제 필수
    // (사진 잔존 = 법무 리스크). 베스트에포트: 실패해도 계정 삭제 자체는 막지 않고 로그만 남긴다
    // (실패해도 유저 삭제 후엔 RLS로 아무도 접근 불가 — 노출 위험은 없고 저장공간만 남음).
    try {
      const { data: files, error: listErr } = await supabaseAdmin.storage.from('condition-photos').list(userId);
      if (!listErr && files && files.length > 0) {
        const paths = files.map(f => `${userId}/${f.name}`);
        await supabaseAdmin.storage.from('condition-photos').remove(paths);
      }
    } catch (storageErr) {
      reportError('account/delete.storageCleanup', storageErr);
    }

    const { error: delErr } = await supabaseAdmin.auth.admin.deleteUser(userId);
    if (delErr) {
      console.error('[account/delete] deleteUser fail:', delErr);
      return NextResponse.json({ error: '계정 삭제 중 오류가 발생했습니다. 잠시 후 다시 시도해주세요.', code: 'DELETE_FAILED' }, { status: 500 });
    }
    return NextResponse.json({ ok: true });
  } catch (error) {
    reportError('account/delete', error);
    return NextResponse.json({ error: '계정 삭제 중 오류가 발생했습니다.', code: 'SERVER_ERROR' }, { status: 500 });
  }
}
