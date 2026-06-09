# OCR — 응답 파싱 견고화 (종이 조건표 추출 실패 수정)

## 증상 / 진단
종이 조건표 사진 추출 시 "추출 실패. 사출기 화면이 선명한 사진을 사용해주세요." (422) 발생.
이 메시지는 `app/api/extract-settings/route.ts`의 **JSON.parse catch 블록**에서만 나온다. 즉:
- Anthropic 호출 성공 + 텍스트 응답 수신 ✓
- 그 텍스트를 `JSON.parse` 하다 실패 ✗ ← 진짜 원인

프롬프트 인식 문제 아님. **응답 포맷/파싱 문제.** raw 응답 미확보라 원인은 아래 셋 중 하나로 추정되며, 셋 다 방어한다:
1. 모델이 JSON 앞뒤에 설명 산문을 덧붙임(현 파서는 코드펜스만 제거 → 산문 있으면 실패). **가장 유력.**
2. `max_tokens: 1024`에서 JSON이 잘림(종이표는 항목 많고 모델이 앞에 사고를 길게 쓰면 미완결).
3. 모델이 거부/설명 산문만 반환.

## 원칙
- 기존 화면 인식·스키마·인증·rate limit 회귀 0. 파싱·토큰·로그만 손댄다.
- `npx tsc --noEmit` + `npm run build` 통과, **push 금지**, 변경파일 보고.

────────────────────────────────────
## 수정 1 — 방어적 JSON 추출 (route.ts, 현 L161~163)

현재:
```ts
let jsonText = textBlock.text.trim()
  .replace(/^```json\s*/i, '').replace(/\s*```$/, '')
  .replace(/^```\s*/i, '').replace(/\s*```$/, '');
```
아래로 교체(코드펜스 제거 후 **첫 `{` ~ 마지막 `}`** 만 슬라이스 → 앞뒤 산문 방어):
```ts
let jsonText = textBlock.text.trim()
  .replace(/^```json\s*/i, '').replace(/\s*```$/, '')
  .replace(/^```\s*/i, '').replace(/\s*```$/, '');
// 모델이 JSON 앞뒤에 설명을 붙여도 객체만 추출
const firstBrace = jsonText.indexOf('{');
const lastBrace = jsonText.lastIndexOf('}');
if (firstBrace !== -1 && lastBrace > firstBrace) {
  jsonText = jsonText.slice(firstBrace, lastBrace + 1);
}
```

## 수정 2 — max_tokens 상향 (route.ts, 현 L72)
`max_tokens: 1024` → `max_tokens: 2048`. (JSON 잘림 방지. 비용 미미.)

## 수정 3 — 프롬프트에 출력 형식 재강조 (route.ts)
기존 `반드시 아래 JSON 형식만 반환하세요 (마크다운 없이):` 문장을 아래로 교체:
```
반드시 JSON 객체 하나만 반환하세요. 머리말·설명·주석·마크다운 코드펜스 없이 첫 글자가 '{'로 시작해야 합니다. 형식:
```

## 수정 4 — 파싱 실패 원인 로깅 (route.ts, catch 블록, 현 L161~163의 try/catch)
`JSON.parse` 실패 catch에서 raw 응답 앞부분을 서버 로그로 남긴다(원인 확정용, 사용자 응답엔 노출 안 함):
```ts
} catch {
  console.error('[extract-settings] JSON parse fail. raw head:', textBlock.text.slice(0, 500));
  return NextResponse.json({ error: 'AI 응답을 파싱할 수 없습니다. 사출기 화면이 선명한 사진을 사용해주세요.' }, { status: 422 });
}
```

## 검증
1. `npx tsc --noEmit` 0 + `npm run build` 통과.
2. 진우가 그 조건표 이미지 재추출 → 정답 근사(노즐 320 / 금형 78.6·72.8 / 보압 90 / 쿠션 16.2 / 냉각 20 / 배압 15).
3. 만약 여전히 실패하면 **Vercel 함수 로그의 `[extract-settings] JSON parse fail. raw head:`** 줄을 진우가 복사해 오면 원인 확정 후 1라운드 추가 조정.
4. 회귀: 기존 기기 화면 사진 1장 → 종전과 동일 추출.

## 변경 파일
- 수정: `app/api/extract-settings/route.ts` (파싱 4줄·max_tokens·프롬프트 1줄·로그 1줄).
- 불변: 스키마·인증·rate limit·diagnose·디자인.
