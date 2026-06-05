# Mandate: defect-kb v1 (불량 진단 트리 DB)

> 단방향: Cowork(기획·검수) → CC(코드 반영). 정본 = 이 파일.
> 작성 2026-06-05. **출시 후 수정·추가가 쉬운 확장 구조가 최우선 요구.**

## 목적
불량별 진단 분기 로직을 구조화한 `lib/defect-kb.ts` 신규 + 진단 route 연결.
기존 진단(route.ts FIXED_FRAMEWORK 프롬프트)의 약한 고리 보강:
KB가 코드 강제 아닌 프롬프트 권고 / 불량별 우선순위·증상변별이 산문으로 흩어짐 / taxonomy.md를 진단이 안 읽음.

## 입력 자료 (반드시 먼저 읽기)
- `docs/defect_taxonomy.md` (v1.0, 정본/규범) — 불량 목록 30종 + 공유 게이트 + 규범 요약
- `docs/defect-research-synthesis.md` (근거·출처·메커니즘·검증 수치)
- `lib/resin-kb.ts` (수치 범위 — defect-kb는 이걸 참조만, 수치 중복 금지)

## 설계 (확장·버전 우선)

### 1. 스키마 (resin-kb.ts 패턴)
```
KB_VERSION = 'defect-kb-v1.0'   // 변경 시 bump → eval 캐시 무효화 (run.mjs PROMPT_VERSION처럼)

type Cause = {
  rank: number; cause: string; category: 'Machine'|'Material'|'Mold'|'Method';
  baseProbability?: number;        // 기본 확률(가변은 생략 가능). 피드백 플라이휠로 보정될 필드
  trigger: string;                 // 활성 조건(자연어 + resin-kb 참조 키워드)
  evidence: string;                // 인용할 입력 항목
  verification: string;            // 현장 검증 + 판정 수치
  adjustment: string;              // 조정 방향(파라미터 + ↑/↓, 절대수치 금지)
};
type DefectNode = {
  id: string; nameKo: string; nameEn: string; phase: string;
  discriminators: string;          // 식별/유사불량 구분
  causes: Cause[];                 // 우선순위 순
  patternHints?: Record<string,string>; // defect_description 키워드 → 가중 분기
  sharedGates?: string[];          // 참조하는 공유 게이트 id (예: 'mold_temp_insufficient')
  priorityLogic?: string;          // 분기 간 우선순위 규칙(resin-kb 윈도우 이탈 최우선 등)
  source?: string; confidence?: 'high'|'med'|'low'; // 출처/신뢰도(synthesis 기준)
};
type SharedGate = {
  id: string; appliesTo: string[]; trigger: string; guidance: string; flags?: string;
};
```

### 2. 데이터 (확장 쉽게 = 데이터/로직 분리)
- `DEFECT_KB: Record<string, DefectNode>` — taxonomy.md 목록 순. **노드 1개 = 불량 1개, 독립 추가 가능**(기존 노드 안 건드림).
- `SHARED_GATES: Record<string, SharedGate>` — 우선 `mold_temp_insufficient` 1개(taxonomy.md §4.1 내용 그대로). 여러 불량이 id로 참조.
- v1 채울 범위: taxonomy.md 진입점 12종(★) 우선 풀로 + 나머지는 최소 골격(id/이름/phase/주원인 1~2개)이라도 넣어 확장 토대. 은선은 synthesis 3.1의 5분기(수분/열분해/전단/공기/오염) 풀로(파일럿 검증용).
- 큰 ts 파일은 Write/Edit truncate 위험 → **bash heredoc(quoted EOF) 청크 append**로 작성(resin-kb 교훈).

### 3. 헬퍼
- `getDefect(defectKey)`: 정확매칭 → 부분매칭 → undefined.
- `getGate(gateId)`, `gatesFor(defectKey)`: 노드의 sharedGates 해석.
- `formatDefectGuide(node, resinSpec, settings)`: route에 주입할 가이드레일 텍스트 생성. 활성 게이트(트리거 충족 시)의 guidance를 조건부로 포함. **모델 강제판정 아니라 가이드레일**(resin-kb checkSettings 패턴과 동일).

### 4. route 연결 (route.ts /api/diagnose)
- resin-kb의 `formatKbCompare` 주입과 같은 자리에서 `formatDefectGuide` 결과를 diagnosisText에 **추가 주입**(기존 동작 보존, 순수 add).
- 금형온도 게이트: 입력에 가열방식(온수기/온유기/카트리지) **선택** 필드 추가(page.tsx advSettings). 미입력 허용. 게이트 트리거는 셋팅 금형온도 vs resin-kb 권장 + super EP/GF 플래그로 판정, 실측 입력은 요구하지 않음.
- 거버넌스: 출력 "추정/조정안", 게이트 출력은 "조언" 톤("~일 수 있다"), 제조사 브랜드명 미노출.

## 검증
1. `npm run build` + `npm run verify` 통과.
2. eval 회귀: 은선(case-001) on/off 비교 — 분기·게이트 주입이 기존 정확도 회귀 없는지. KB_VERSION bump로 캐시 무효화 후 측정.
3. 파일럿 스팟체크: production /diagnose에서 (a) PA66 GF + 웰드라인 + 금형온도 낮음 → 금형온도 게이트 가이드 출력되는지 (b) 은선 진단에 금형온도 게이트 안 뜨는지(미적용 확인) (c) super EP(PPS 등) + 표면불량 → 카트리지 히터 조언 뜨는지.
4. 거버넌스: 출력에 "진단" 단어·브랜드명 0.

## 산출물
- `lib/defect-kb.ts` (스키마 + DEFECT_KB + SHARED_GATES + 헬퍼)
- route.ts 연결 (formatDefectGuide 주입 + 가열방식 선택 입력)
- 검증 통과 후 commit + push. 결과(빌드/verify/스팟체크) 콘솔 출력.

## 주의
- taxonomy.md가 정본. 코드가 충돌하면 문서 우선. v1 이후 수정은 taxonomy.md → defect-kb.ts → KB_VERSION bump → eval 순서.
- 수치 범위는 resin-kb.ts 참조(중복 금지). defect-kb는 분기 로직만.
