// 추정 기록에 남기는 접속 플랫폼(웹/앱 구분용 자체 집계, 제3자 트래킹 아님).
// 앱은 lib/apiBase.ts가 X-MD-Platform·X-MD-Version 헤더를 붙여 보낸다(강제 업데이트 게이트와 같은 헤더).
// 헤더가 없으면 웹으로 보고 User-Agent로 모바일/데스크톱만 가른다.
export function clientPlatform(req: Request): string {
  const p = (req.headers.get('X-MD-Platform') || '').toLowerCase();
  if (p === 'ios' || p === 'android') {
    const v = (req.headers.get('X-MD-Version') || '').replace(/[^0-9A-Za-z.-]/g, '').slice(0, 20);
    return v ? `${p} ${v}` : p;
  }
  const ua = req.headers.get('user-agent') || '';
  return /Mobi|Android|iPhone|iPad/i.test(ua) ? 'web-mobile' : 'web-desktop';
}
