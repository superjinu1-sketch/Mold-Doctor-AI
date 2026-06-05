# Mandate: 토큰 실측 → COGS 확정 (가격 fix용)

> 단방향: Cowork(기획·검수) → CC(코드 반영). 이 파일이 정본.
> 작성 2026-06-05. 목적 = 잠정가(placeholder) 떼고 크레딧 가격 확정에 쓸 실 원가 측정.

## 목적
크레딧 1개 = "진단 상담" 1회의 실 원가(COGS)를 케이스별로 측정해 분포(min/median/p90/max)를 뽑는다.
Cowork가 이 숫자로 margin HTML을 true-up 하고 가격을 확정한다.
**정확도 개선·기능 추가 아님. 순수 계측 작업이다.**

## 배경 (이미 아는 것)
- 단건 실측(2026-06-03): 텍스트 진단 in 700 / out 2430 tok · sonnet-4-6 · ≈₩58. 이미지 +₩6. **출력이 비용 지배.**
- 한계: 단건이라 분산을 모른다. 수지·불량별 출력 길이 편차가 커서 band가 필요하다.
- 인프라: `npm run eval`(tests/eval/run.mjs)이 dev서버 + HTTP로 `/api/diagnose`를 친다. judge=haiku, diagnose 응답 7일 캐시. 이걸 재활용한다.

## 작업 범위

### A. route usage 노출 (4개 엔드포인트)
대상: `app/api/{diagnose, analyze-image, diagnose-chat, extract-settings}/route.ts`
각 route의 Anthropic `messages.create` 응답 객체에 `response.usage`가 있다:
`{ input_tokens, output_tokens, cache_creation_input_tokens?, cache_read_input_tokens? }`.

성공 응답(NextResponse)에 헤더를 추가한다:
- `X-Usage-In`: input_tokens
- `X-Usage-Out`: output_tokens
- `X-Usage-CacheRead`: cache_read_input_tokens ?? 0
- `X-Usage-CacheWrite`: cache_creation_input_tokens ?? 0
- `X-Usage-Model`: 사용 모델 문자열

패턴은 베타-B의 `X-Session-Id` 헤더 다는 방식과 동일(diagnose route 346행 근방 참고).
멀티 콜 경로(이미지 진단 = analyze-image → diagnose 2콜)는 각 엔드포인트가 **자기 콜 usage만** 노출(eval이 경로별로 합산).
주의: 실패/throw 응답엔 헤더 불필요. 관측 전용이라 실패해도 기능 영향 0. 노출되는 건 토큰 수·모델명뿐(민감정보 없음, 거버넌스 클린).

### B. KRW 환산 유틸 — `tests/eval/cost.mjs` (신규)
상수는 한 곳에 모아 조정 쉽게:
```
const USD_KRW = 1500;
const PRICE = { // per 1M tokens, USD
  'claude-sonnet-4-6':         { in: 3, out: 15 },
  'claude-haiku-4-5-20251001': { in: 1, out: 5 },
};
// cache: read = in * 0.1, write = in * 1.25 (Anthropic 표준 비율)
```
함수 `costKrw({ model, in: inTok, out, cacheRead = 0, cacheWrite = 0 })` → ₩(반올림).
vision 토큰은 input_tokens에 이미 포함되므로 별도 계산 불필요.

### C. eval/run.mjs — cost 측정 모드
- 플래그 `--measure-cost` 추가.
- 켜지면: (1) diagnose **캐시 우회**(실제 콜 강제 — 캐시는 토큰 0이라 무의미), (2) 응답 헤더에서 `X-Usage-*` 수집, (3) `costKrw`로 케이스별 ₩ 계산.
- **judge(haiku) 호출 비용은 별도 집계.** 채점은 우리 내부 QA 원가이지 사용자가 무는 진단 원가가 아니다. 분리 표기.
- 사용자 1크레딧이 실제 무는 원가 = diagnose 경로(+이미지면 analyze-image)만.

### D. 리포트 — `tests/eval/cost-report.json` + 콘솔 표
- 케이스별: id, model, in, out, krw.
- 집계(진단 경로 KRW 기준): min / median / mean / p90 / max. 모델별 토큰 평균.
- judge 원가는 별도 줄.
- 콘솔에 표로 출력 + JSON 파일 저장.
- **진우가 이 JSON을 Cowork에 붙여넣어 가격 확정에 사용한다.**

### E. 이미지 경로 (fixture 준비 완료 — 이제 구현 필수)
**fixture 2장 배치됨: `tests/fixtures/images/defect-silver-streak.jpg`, `defect-burn-mark.jpg` (둘 다 1024x768 jpeg q80 = route downscale 후 실제 전송 크기와 동일).**
현재 eval은 `run.mjs:143`에서 항상 `images: []`로 보내 이미지 경로를 안 탄다. `--measure-cost` 모드에서:
- 이미지 케이스 2개 정의(은줄→silver-streak, 버닝→burn-mark). 기존 cases.json의 case-001(PA66 은줄)·case-002(POM 버닝) 입력을 재사용하되 fixture를 base64로 읽어 payload `images`에 실어 별도 케이스로 1회씩 측정.
- diagnose가 이미지 포함 시 analyze-image도 타면 두 콜 usage 합산. 안 타면 diagnose 콜 usage만.
- 리포트에 `text_path` / `image_path` COGS band를 분리 표기.
주의: 이미지 케이스는 캐시 무관(원래 이미지 미측정). 측정용 1회 콜이면 충분.

### F. 재료분석 (DSC/FTIR/TGA)
기능 미존재 → 측정 불가. 리포트에 `material_analysis: "N/A — feature not built"` 명시. 추정 3~5크레딧 유지.

## 검증
1. `npm run build` + `npm run verify` 통과(타입/빌드/console.log/API키/필수파일).
2. dev서버 띄우고 `node tests/eval/run.mjs --measure-cost --port 3000` → 10케이스 토큰 표 + `cost-report.json` 생성 확인.
3. 회귀: 일반 진단 1건이 정상 응답(베타-B 게이트·1크레딧 차감 그대로)인지 확인. 헤더 추가가 기존 동작 안 깨는지.
4. 거버넌스: 노출 헤더·로그에 제조사·브랜드명 없음. 토큰 수·모델명만.

## 산출물
- `tests/eval/cost-report.json` (케이스별 + 집계)
- 콘솔 요약 표
→ 진우가 JSON을 Cowork에 전달 → Cowork가 margin HTML true-up + 잠정 팩 4종 가격 fix.

## 주의 (수지 KB 교훈)
- 큰 ts 파일 편집 시 Write/Edit가 truncate할 수 있음 → 큰 청크는 bash heredoc(quoted EOF) append 권장.
- 작업 후 tsc/verify + 커밋 + push는 CC가.
