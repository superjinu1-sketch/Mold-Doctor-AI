# 샘플 무료체험 더미결과 영어 버전 + locale 분기

## 배경 / 목적
"Try with an Example"(PA66 GF33% 은줄) 샘플은 `lib/sample-demo.ts`의 `SAMPLE_DEMO_RESULT`(한국어 하드코딩)를 그대로 반환한다. 언어를 EN으로 바꿔도 결과 내용이 한글로 나옴. → KO/EN 두 버전을 만들고 `locale`로 분기.

client는 이미 demo 요청에도 `locale`을 실어 보냄(page.tsx handleDiagnose payload). route의 `isDemo` 분기에서 locale만 읽어 고르면 됨.

## 원칙
- `defect_type: { ko, en }`는 이미 양쪽 다 있으니 그대로 둠. 나머지 단일언어 필드만 EN 병렬본 생성.
- 내용/수치/구조는 KO와 1:1 대응(번역만, 진단 로직·확률·권장수치 변경 금지).
- 끝나면 `npx tsc --noEmit` + `npm run build` 통과, push 금지, 변경파일 보고.

────────────────────────────────────
## 작업 1 — lib/sample-demo.ts 에 EN 본 + 셀렉터 추가

기존 `SAMPLE_DEMO_RESULT`(KO, `as const`)는 **그대로 유지**. 파일 끝에 아래 EN 본과 셀렉터 추가:

```ts
// 영어 버전 (locale === 'en' 일 때 반환). KO와 1:1 대응, 번역만.
export const SAMPLE_DEMO_RESULT_EN = {
  defect_type: { ko: "은줄", en: "Silver Streak" },
  defect_phase: "material",
  severity: "medium",
  summary: "Intermittent silver streak; suspected moisture / check-ring slippage",
  process_window_check: {
    melt_temp: { status: "ok", note: "Nozzle 285°C, within recommended 260-290°C" },
    mold_temp: { status: "ok", note: "80°C, within GF33% recommended range" },
    injection_speed: { status: "ok", note: "60%/40% staged speed appropriate" },
    pack_pressure: { status: "ok", note: "Hold 80MPa, 67% of 120MPa fill pressure — appropriate" },
    drying: { status: "warning", note: "Drying conditions not entered, needs confirmation" }
  },
  causes: [
    {
      rank: 1, category: "Material", probability: 55,
      description: "Gas from residual moisture — consistent with the intermittent pattern",
      scientific_reasoning: "PA66 GF33% equilibrium moisture is ~2.5% at RH50%. Hot-air drying cannot control dew point, so 0.1%+ residual moisture is possible. At 285°C, amide-bond hydrolysis generates CO2/NH3 gas, producing silver streak near the gate. The intermittent occurrence (1 in 5 shots) comes from uneven resin residence time in the hopper causing moisture variation.",
      evidence: "Drying conditions not entered. Nozzle 285°C is within the PA66 hydrolysis threshold range. The defect originating near the gate matches gas expansion from shear as material passes the gate.",
      elimination: "Temperature, speed, and hold pressure are all within the process window. The only unverified item is drying, so it ranks #1. A check-ring issue would be accompanied by cushion instability, but the current 5mm cushion setpoint shows no abnormality.",
      verification: "Measure resin moisture just before hopper feed. ≤0.08% → not drying-related, check #2. ≥0.1% → re-dry with a desiccant dryer 80°C 4hr+ and retry. Silver streak disappearing confirms drying as the root cause."
    },
    {
      rank: 2, category: "Machine", probability: 30,
      description: "Unstable shot volume from intermittent check-ring slippage → gas entrainment",
      scientific_reasoning: "Check-ring wear or trapped debris causes backflow, making pressure unstable at injection start and entraining air/gas in the melt front near the gate. The irregular 1-in-5-shot pattern is typical of intermittent check-ring slippage.",
      evidence: "Defect frequency is irregular at 1 in 5 shots. Metering 85mm, cushion 5mm setpoint, but actual cushion variation is unverified. Back pressure 5MPa is on the low side for PA66 GF33% — possible metering instability.",
      elimination: "If drying is confirmed normal, the check-ring becomes #1. An intermittent pattern is characteristic of mechanical wear. Temperature and speed are normal, so thermal causes are excluded.",
      verification: "Record actual cushion over 20 consecutive shots. Variation ≥±2mm → suspect check-ring slippage; disassemble and inspect. Variation within ±1mm → check-ring normal, examine #3."
    },
    {
      rank: 3, category: "Mold", probability: 15,
      description: "Air trapping from poor venting near the side gate",
      scientific_reasoning: "In a cold runner + side gate structure, an insufficient air-escape path during early cavity filling traps air near the gate into the melt, causing silver streak. With 4-cavity runner imbalance, selective occurrence in a specific cavity is possible.",
      evidence: "Silver streak starting near the gate matches an early-fill air-trapping pattern. Fill-rate differences per cavity are possible in a 4-cavity cold runner.",
      elimination: "A venting issue should concentrate in a specific cavity, but no specific cavity is currently noted. Low probability, but examine after confirming drying and check-ring are normal.",
      verification: "Record the defect cavity location (confirm number). Concentrated in one cavity → add a 0.02mm-deep vent to that cavity. Random → not a venting cause."
    }
  ],
  recommendations: [
    { priority: 1, parameter: "Verify drying conditions and switch to a desiccant dryer", current: "Not entered (drying conditions unknown)", recommended: "Desiccant dryer 80°C, 4-6hr, dew point ≤ -30°C", reason: "PA66 GF33% requires moisture ≤0.08%. Hot-air dryers cannot control dew point.", expected_result: "Expect a significant reduction in silver streak frequency near the gate", risk: "Production wait from increased drying time", interaction_note: "Melt viscosity changes after drying — fine-tune hold pressure" },
    { priority: 2, parameter: "Back pressure", current: "5 MPa", recommended: "8-12 MPa", reason: "Higher back pressure improves metering uniformity and compresses/expels gas.", expected_result: "Cushion stabilizes, intermittent silver streak decreases", risk: "Possible GF fiber breakage; caution above 10MPa", interaction_note: "Keep screw speed at 80rpm and re-measure cushion variation" },
    { priority: 3, parameter: "Injection speed stage 1", current: "60%", recommended: "40-50% (decelerate through the gate)", reason: "Suppress shear heating near the gate and prevent air entrainment.", expected_result: "Observable improvement in silver streak location near the gate", risk: "Possible short shot; injection pressure monitoring required", interaction_note: "Confirm fill completes within the 120MPa stage-1 pressure limit" },
    { priority: 4, parameter: "Check-ring inspection", current: "Not inspected", recommended: "Measure cushion over 20 shots; disassemble and inspect if variation ≥±2mm", reason: "An intermittent pattern is typical of check-ring wear. If condition adjustments don't resolve it, the cause is mechanical.", expected_result: "Intermittent silver streak pattern resolves as cushion stabilizes", risk: "Production stop required for disassembly inspection", interaction_note: "If no cushion variation, judge the check-ring normal and examine mold venting" }
  ],
  checklist: {
    before_changes: ["Measure resin moisture (target <0.08%)", "Record actual cushion over 20 consecutive shots", "Confirm the defect cavity number"],
    after_changes: ["Confirm cushion stability over 10 shots after the back-pressure change", "Re-measure silver streak frequency after the drying change", "Confirm fill pattern after the injection speed change"],
    escalation: ["If 1-in-5-shot persists after drying + back-pressure adjustment, disassemble the check-ring", "If concentrated in one cavity, add a vent to that cavity", "If unresolved after 3 adjustments, consider changing gate location/size"]
  },
  resin_specific_notes: "PA66 GF33% is highly hygroscopic; desiccant drying is mandatory. Excessive back pressure causes GF breakage — beware of reduced mechanical strength.",
  drying_assessment: "Drying conditions not entered. Recommend desiccant drying 80°C/4hr+, dew point ≤ -30°C.",
  tier: "simple",
  round: 1,
  is_demo: true,
} as const;

// locale 셀렉터 — 둘 다 as const라 union 반환(NextResponse.json은 union 허용).
export function getSampleDemo(locale?: string): typeof SAMPLE_DEMO_RESULT | typeof SAMPLE_DEMO_RESULT_EN {
  return locale === 'en' ? SAMPLE_DEMO_RESULT_EN : SAMPLE_DEMO_RESULT;
}
```

## 작업 2 — app/api/diagnose/route.ts 분기 교체

1. import 수정: 기존 `import { SAMPLE_DEMO_RESULT } from '@/lib/sample-demo';` 를 `import { getSampleDemo } from '@/lib/sample-demo';` 로 변경(또는 getSampleDemo 추가 import). SAMPLE_DEMO_RESULT를 route에서 다른 데 안 쓰면 import에서 빼도 됨.
2. isDemo 분기(현재 ~L382):
   ```ts
   if (body?.isDemo === true) {
     return NextResponse.json(getSampleDemo(body.locale), {
       headers: { 'X-Diagnosis-Tier': 'simple', 'X-Diagnosis-Round': '1', 'X-Demo': '1' },
     });
   }
   ```
   (`body.locale`은 이 시점에 이미 body에 있음 — destructure 전이면 `body.locale` 직접 접근. 기존 코드가 body 파싱 후이므로 안전.)

## 변경 파일 요약
- 수정: `lib/sample-demo.ts`(EN 본 + getSampleDemo 추가), `app/api/diagnose/route.ts`(import + isDemo 분기).
- 불변: page.tsx(이미 locale 전송 중), 기타.

## 검증
1. `npx tsc --noEmit` 에러 0 + `npm run build` 통과.
2. KO 토글 + "Try with an Example" 진단 → 기존 한글 결과 그대로(회귀 0).
3. EN 토글 + 같은 샘플 진단 → summary/causes/why/recommendations/checklist 전부 영어로 출력.
4. defect_type 칩은 양 언어 모두 정상(ko/en 객체 그대로).
