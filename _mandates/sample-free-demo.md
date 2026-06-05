# 샘플 무료 체험 데모 — CC mandate

> 목적: 신규 유저가 가입 보너스 5크레딧을 "샘플 구경"으로 날리는 구멍 차단.
> 설계: 샘플 카드를 **PA66 은줄 1개로 축소**. 그 샘플을 **수정 없이 그대로** 진단하면 → 미리 박은 실제 결과를 무료로 즉시 반환(인증·크레딧·Anthropic 호출 0). 입력칸을 하나라도 손대면 → 일반 유료 진단.
> 악용 안전: 데모는 PA66 은줄 고정 결과 1개라 자기 불량(다른 수지/사진) 진단엔 무가치. 무한 호출해도 이득 0.

대상 4개:
1. `lib/sample-demo.ts` (신규) — 데모 결과 픽스처
2. `app/api/diagnose/route.ts` — isDemo 분기 (게이트 前)
3. `app/diagnose/page.tsx` — 샘플 1개 축소 + 스냅샷 비교 + isDemo 분기
4. `components/DiagnosisResultPanel.tsx` — is_demo면 팔로업 숨기고 "직접 진단" CTA

---

## 1. lib/sample-demo.ts (신규)

```ts
// PA66 은줄 샘플의 무료 체험 데모 결과 (실제 진단 출력 캡처본).
// 이 샘플을 수정 없이 진단하면 이 고정 결과를 무료로 반환한다.
export const SAMPLE_DEMO_RESULT = {
  defect_type: { ko: "은줄", en: "Silver Streak" },
  defect_phase: "material",
  severity: "medium",
  summary: "간헐적 은줄, 수분·체크링 슬리핑 추정",
  process_window_check: {
    melt_temp: { status: "ok", note: "노즐285°C, 권장 260-290°C 범위 내" },
    mold_temp: { status: "ok", note: "80°C, GF33% 권장 범위 내" },
    injection_speed: { status: "ok", note: "60%/40% 단계속도 적정" },
    pack_pressure: { status: "ok", note: "보압80MPa, 충진압120의 67% 적정" },
    drying: { status: "warning", note: "건조조건 미입력, 확인 필요" }
  },
  causes: [
    {
      rank: 1, category: "Material", probability: 55,
      description: "잔류 수분에 의한 가스 발생 — 간헐적 패턴과 일치",
      scientific_reasoning: "PA66 GF33%의 평형 수분율은 RH50%에서 약 2.5%. 열풍식 건조는 노점 관리 불가로 수분 0.1%+ 잔류 가능. 285°C에서 아미드 결합 가수분해 → CO2/NH3 가스 생성 → 게이트 부근 실버 스트릭. 간헐적(5샷 중 1회)인 이유는 호퍼 내 수지 체류시간 불균일로 수분 편차 발생 때문.",
      evidence: "건조 조건 미입력. 노즐 285°C는 PA66 가수분해 임계 온도 범위 내. 불량이 게이트 부근에서 시작 = 게이트 통과 시 전단으로 가스 팽창 일치.",
      elimination: "온도·속도·보압은 모두 프로세스 윈도우 내. 유일하게 미확인 항목이 건조 조건이므로 1순위. 체크링 문제라면 쿠션 불안정이 동반되나 현재 쿠션 5mm 설정값은 이상 없음.",
      verification: "호퍼 투입 직전 수지 수분 측정. 0.08% 이하 → 건조 원인 아님, 2순위 확인. 0.1% 이상 → 제습식 건조기 80°C 4hr 이상 재건조 후 재시도. 은줄 소멸 시 건조 원인 확진."
    },
    {
      rank: 2, category: "Machine", probability: 30,
      description: "체크링 간헐 슬리핑으로 사출량 불안정 → 가스 혼입",
      scientific_reasoning: "체크링 마모 또는 이물 끼임 시 역류 발생 → 사출 개시 초기 압력 불안정 → 게이트 부근 용융 선단에 공기/가스 혼입. 5샷 중 1회 불규칙 패턴은 체크링 간헐 슬리핑의 전형적 거동.",
      evidence: "불량 빈도 5샷 중 1회로 불규칙. 계량 85mm, 쿠션 5mm 설정이나 실제 쿠션 변동 여부 미확인. 배압 5MPa은 PA66 GF33% 기준 낮은 편 — 계량 불안정 가능성.",
      elimination: "건조가 정상임이 확인될 경우 체크링이 1순위. 간헐적 패턴은 기계적 마모의 특징. 온도·속도 조건은 정상이므로 열적 원인 배제.",
      verification: "연속 20샷 쿠션 실측 기록. 변동 ±2mm 이상 → 체크링 슬리핑 의심, 분해 점검. 변동 ±1mm 이내 → 체크링 정상, 3순위 검토."
    },
    {
      rank: 3, category: "Mold", probability: 15,
      description: "사이드 게이트 부근 벤팅 불량으로 공기 포집",
      scientific_reasoning: "콜드 러너 + 사이드 게이트 구조에서 캐비티 충진 초기 공기 배출 경로 부족 시 게이트 인근 공기가 용융수지에 포집 → 은줄. 4캐비티 러너 불균형이 있으면 특정 캐비티에서 선택적 발생 가능.",
      evidence: "게이트 부근에서 은줄 시작 = 충진 초기 공기 포집 패턴과 일치. 4캐비티 콜드 러너에서 캐비티별 충진 속도 차이 가능.",
      elimination: "벤팅 문제라면 특정 캐비티에 집중되어야 하나 현재 특이 캐비티 언급 없음. 확률 낮으나 건조·체크링 정상 확인 후 검토 필요.",
      verification: "불량 캐비티 위치 기록 (번호 확인). 특정 캐비티 집중 → 해당 캐비티 벤트 0.02mm 깊이 추가. 랜덤 → 벤팅 원인 아님."
    }
  ],
  recommendations: [
    { priority: 1, parameter: "건조 조건 확인 및 제습식 건조기 전환", current: "미입력 (건조 조건 불명)", recommended: "제습식 건조기 80°C, 4~6hr, 노점 -30°C 이하", reason: "PA66 GF33% 수분 0.08% 이하 필수. 열풍식은 노점 관리 불가.", expected_result: "게이트 부근 은줄 빈도 대폭 감소 예상", risk: "건조 시간 증가로 생산 대기 발생", interaction_note: "건조 후 용융 점도 변화로 보압 미세 조정 필요" },
    { priority: 2, parameter: "배압", current: "5 MPa", recommended: "8~12 MPa", reason: "배압 상승으로 계량 균일성 향상, 가스 압축 배출 효과.", expected_result: "쿠션 안정화, 간헐적 은줄 감소", risk: "GF 섬유 파단 가능, 10MPa 초과 주의", interaction_note: "스크류 회전수 80rpm 유지하며 쿠션 변동 재측정" },
    { priority: 3, parameter: "사출 속도 1단", current: "60%", recommended: "40~50% (게이트 통과 구간 감속)", reason: "게이트 부근 전단발열 억제 및 공기 혼입 방지.", expected_result: "게이트 인근 은줄 위치 개선 확인 가능", risk: "충진 부족(쇼트샷) 가능, 사출 압력 모니터링 필수", interaction_note: "1차 압력 120MPa 한계 내에서 충진 완료 확인" },
    { priority: 4, parameter: "체크링 점검", current: "점검 미실시", recommended: "20샷 쿠션 실측 후 ±2mm 이상 변동 시 분해 점검", reason: "간헐적 패턴은 체크링 마모의 전형. 조건 조정으로 해결 안 될 경우 기계 원인.", expected_result: "쿠션 안정화 시 은줄 간헐 패턴 해소", risk: "분해 점검 시 생산 중단 필요", interaction_note: "쿠션 변동 없으면 체크링 정상 판정, 금형 벤팅 검토" }
  ],
  checklist: {
    before_changes: ["수지 수분 측정 (목표 <0.08%)", "연속 20샷 쿠션 실측 기록", "불량 발생 캐비티 번호 확인"],
    after_changes: ["배압 변경 후 10샷 쿠션 안정성 확인", "건조 조건 변경 후 은줄 발생 빈도 재측정", "사출 속도 변경 후 충진 패턴 확인"],
    escalation: ["건조+배압 조정 후에도 5샷 중 1회 지속 시 체크링 분해", "특정 캐비티 집중 시 해당 캐비티 벤트 추가", "3회 조정 후 미해결 시 게이트 위치·크기 변경 검토"]
  },
  resin_specific_notes: "PA66 GF33%는 흡습성 강함. 제습식 건조 필수. 배압 과다 시 GF 파단으로 기계적 강도 저하 주의.",
  drying_assessment: "건조 조건 미입력. 제습식 건조 80°C/4hr 이상, 노점 -30°C 이하 권장.",
  tier: "simple",
  round: 1,
  is_demo: true,
} as const;
```

---

## 2. app/api/diagnose/route.ts — isDemo 무료 분기

import 추가:
```ts
import { SAMPLE_DEMO_RESULT } from '@/lib/sample-demo';
```

POST 안, `const mock = tryMock(body); if (mock) return mock;` **바로 아래** (인증 게이트보다 앞)에 삽입:

```ts
    // ── 샘플 무료 체험 데모: 인증·크레딧·Anthropic 호출 없이 고정 결과 반환 ──
    if (body?.isDemo === true) {
      return NextResponse.json(SAMPLE_DEMO_RESULT, {
        headers: { 'X-Diagnosis-Tier': 'simple', 'X-Diagnosis-Round': '1', 'X-Demo': '1' },
        // X-Session-Id 없음(데모는 세션 미생성) → 클라가 팔로업 비활성 처리
      });
    }
```

> 위치 핵심: 인증 게이트(401)·start_session(차감)보다 **앞**이라 비로그인도 데모 체험 가능, 크레딧 0.

---

## 3. app/diagnose/page.tsx

### 3-a. SAMPLE_CASES를 PA66 은줄 1개로 축소
기존 `const SAMPLE_CASES = [ {PA66...}, {PC...}, {POM...}, {PP...}, {ABS...} ]`에서 **PA66 은줄 객체 1개만 남기고 나머지 4개 삭제.**

### 3-b. 데모 스냅샷 state + loadSample에서 스냅샷 저장
다른 useState 근처:
```ts
  const [demoSnapshot, setDemoSnapshot] = useState<string | null>(null);
```
`loadSample` 맨 끝(window.scrollTo 직전)에, 방금 채운 폼을 직렬화해 스냅샷 저장:
```ts
    setDemoSnapshot(JSON.stringify({
      defectType: d.defectType, resinType: d.resinType,
      nozzleTemp: d.nozzleTemp, zone1Temp: d.zone1Temp, zone2Temp: d.zone2Temp,
      moldTempFixed: d.moldTempFixed, injPressure1: d.injPressure1, holdPressure: d.holdPressure,
      injSpeed1: d.injSpeed1, holdTime: d.holdTime, coolTime: d.coolTime,
    }));
```

### 3-c. handleDiagnose — 데모 판별 + 분기
`handleDiagnose` 진입부, 현재 폼이 스냅샷과 동일한지 검사:
```ts
    const currentSnapshot = JSON.stringify({
      defectType, resinType,
      nozzleTemp: settings.nozzleTemp, zone1Temp: settings.zone1Temp, zone2Temp: settings.zone2Temp,
      moldTempFixed: settings.moldTempFixed, injPressure1: settings.injPressure1, holdPressure: settings.holdPressure,
      injSpeed1: settings.injSpeed1, holdTime: settings.holdTime, coolTime: settings.coolTime,
    });
    const isDemo = demoSnapshot !== null && currentSnapshot === demoSnapshot;
```
로그인 게이트는 **데모가 아닐 때만**:
```ts
    if (!user && !isDemo) {
      setError(t('auth.login_required'));
      await signInWithGoogle();
      return;
    }
```
fetch — 데모면 auth 헤더·게이트 분기 스킵:
```ts
      const res = await fetch('/api/diagnose', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...(isDemo ? {} : await authHeaders()) },
        body: JSON.stringify({ ...payload, isDemo }),
      });

      if (!isDemo) {
        if (res.status === 401) { setError(t('auth.login_required')); await signInWithGoogle(); return; }
        if (res.status === 402) { setError(t('credit.insufficient')); router.push('/pricing'); return; }
      }
      if (!res.ok) { /* 기존 에러 처리 */ }

      const newSessionId = res.headers.get('X-Session-Id');   // 데모는 null
      setSessionId(newSessionId);   // 데모면 null → 팔로업 비활성
```
> 데모 결과는 `is_demo: true`로 내려오므로 패널이 알아서 팔로업 숨김 처리(4번).
> 데모 결과는 localStorage 저장 안 해도 됨(원하면 저장하되 session_id 없음). 기존 저장 로직 유지해도 무방.

---

## 4. components/DiagnosisResultPanel.tsx — 데모는 팔로업 숨김

`DiagnosisResult` 인터페이스에 `is_demo?: boolean;` 추가.

결과 하단의 **추가질문(chat)·팔로업 추정·재진단 UI**를 `result.is_demo`일 때 숨기고, 대신 안내 CTA 표시:

```tsx
{result.is_demo ? (
  <div className="rounded-xl border border-[var(--brand-border)] bg-brand-tint p-4 text-center">
    <p className="text-muted text-base mb-3">{t('demo.notice')}</p>
    <button type="button" onClick={onStartFollowUp ? undefined : undefined}
      className="...">{/* 생략 가능 */}</button>
  </div>
) : (
  /* 기존 추가질문/팔로업 UI */
)}
```
> 최소 구현: `result.is_demo`면 추가질문 입력창과 "추가 추정/팔로업" 버튼을 렌더 안 함 + `t('demo.notice')` 안내문만. 데모에서 chat 호출 시 어차피 session_id 없어 `NO_SESSION` 400이므로, UI에서 막는 게 깔끔.

i18n 키 추가 (`messages/ko.ts`·`en.ts`):
```
demo.notice  ko: '체험용 예시 결과예요. 내 불량 사진과 셋팅값으로 직접 진단하면 추가 질문까지 할 수 있어요.'
             en: 'This is a sample preview. Run a real diagnosis with your own photo and settings to ask follow-up questions.'
```

---

## 5. 검증
```bash
npx tsc --noEmit
npm run verify
```
- 비로그인으로 PA66 샘플 그대로 진단 → 결과 뜸 + Supabase `user_credits` **차감 없음** + `credit_ledger` 변화 없음.
- 샘플 로드 후 아무 입력값(예: 노즐온도) 1개 수정 → 진단 시 일반 경로(비로그인이면 401 로그인 유도 / 로그인이면 1크레딧 차감).
- 데모 결과 화면엔 추가질문 UI 없고 안내문만.

통과하면 commit + push.
