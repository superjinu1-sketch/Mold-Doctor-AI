// 서버 전용(route.ts에서만 import) — 클라이언트 번들에 절대 섞이면 안 됨(supabaseAdmin=service_role 키 사용).
// 요청 헤더의 클라이언트 버전을 app_min_version과 비교해 미달이면 426을 반환하는 공용 게이트.
// 헤더가 없으면(웹 브라우저, 또는 이번 릴리스 이전의 구버전 앱) 통과시킨다 — 구버전 앱 차단은
// 클라이언트 게이트(components/UpdateGate.tsx)가 담당. 서버 게이트는 "이번 릴리스 이후" 버전들의 안전망.
// ⚠ webhooks/ 라우트에는 절대 적용하지 말 것 — RevenueCat 등 외부 호출은 이 헤더를 보내지 않는다.
import { NextResponse } from 'next/server';
import { supabaseAdmin } from './supabase/server';

interface MinVersionRow {
  platform: string;
  min_build: number;
  store_url: string;
  message: string | null;
}

const TTL_MS = 60_000;
let cache: { rows: MinVersionRow[]; expiresAt: number } | null = null;

async function getMinVersionRows(): Promise<MinVersionRow[]> {
  if (cache && cache.expiresAt > Date.now()) return cache.rows;
  const { data, error } = await supabaseAdmin
    .from('app_min_version')
    .select('platform, min_build, store_url, message');
  if (error || !data) return cache?.rows ?? []; // 조회 실패 시 직전 캐시(있으면) 또는 빈 배열(통과) — 게이트 장애가 서비스 전체를 막으면 안 됨
  cache = { rows: data as MinVersionRow[], expiresAt: Date.now() + TTL_MS };
  return cache.rows;
}

export async function checkMinVersion(req: Request): Promise<Response | null> {
  const platform = req.headers.get('X-MD-Platform');
  const buildRaw = req.headers.get('X-MD-Build');
  if (!platform || !buildRaw) return null; // 헤더 부재 = 웹 또는 구버전 앱 → 통과(§3-1)

  const build = Number(buildRaw);
  if (!Number.isFinite(build)) return null; // 헤더 파싱 실패 — 차단하지 않고 통과(안전 기본값)

  const rows = await getMinVersionRows();
  const row = rows.find(r => r.platform === platform);
  if (!row) return null; // 해당 플랫폼 설정 없음 → 통과

  if (build >= row.min_build) return null;

  return NextResponse.json(
    {
      error: 'UPGRADE_REQUIRED',
      minBuild: row.min_build,
      storeUrl: row.store_url,
      message: row.message,
    },
    { status: 426 },
  );
}
