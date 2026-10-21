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
      description: "잔류 수분에 의한 가스 발생, 간헐적 패턴과 일치",
      scientific_reasoning: "PA66 GF33%의 평형 수분율은 RH50%에서 약 2.5%. 열풍식 건조는 노점 관리 불가로 수분 0.1%+ 잔류 가능. 285°C에서 잔류 수분이 수증기가 되어 표면으로 끌려나오고(게이트 부근 실버 스트릭), 아미드 결합 가수분해로 분자량도 떨어진다. 간헐적(5샷 중 1회)인 이유는 호퍼 내 수지 체류시간 불균일로 수분 편차 발생 때문.",
      evidence: "건조 조건 미입력. 노즐 285°C는 PA66 가수분해 임계 온도 범위 내. 불량이 게이트 부근에서 시작 = 게이트 통과 시 전단으로 가스 팽창 일치.",
      elimination: "온도·속도·보압은 모두 프로세스 윈도우 내. 유일하게 미확인 항목이 건조 조건이므로 1순위. 체크링 문제라면 쿠션 불안정이 동반되나 현재 쿠션 5mm 설정값은 이상 없음.",
      verification: "호퍼 투입 직전 수지 수분 측정. 0.08% 이하 → 건조 원인 아님, 2순위 확인. 0.1% 이상 → 제습식 건조기 80°C 4hr 이상 재건조 후 재시도. 재건조 후 은줄이 사라지면 건조 원인일 가능성이 높다."
    },
    {
      rank: 2, category: "Machine", probability: 30,
      description: "체크링 간헐 슬리핑으로 사출량 불안정 → 가스 혼입",
      scientific_reasoning: "체크링 마모 또는 이물 끼임 시 역류 발생 → 사출 개시 초기 압력 불안정 → 게이트 부근 용융 선단에 공기/가스 혼입. 5샷 중 1회 불규칙 패턴은 체크링 간헐 슬리핑의 전형적 거동.",
      evidence: "불량 빈도 5샷 중 1회로 불규칙. 계량 85mm, 쿠션 5mm 설정이나 실제 쿠션 변동 여부 미확인. 배압 5MPa은 PA66 GF33% 기준 낮은 편이라 계량 불안정 가능성.",
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
    pack_pressure: { status: "ok", note: "Hold 80MPa, 67% of 120MPa fill pressure, appropriate" },
    drying: { status: "warning", note: "Drying conditions not entered, needs confirmation" }
  },
  causes: [
    {
      rank: 1, category: "Material", probability: 55,
      description: "Gas from residual moisture, consistent with the intermittent pattern",
      scientific_reasoning: "PA66 GF33% equilibrium moisture is ~2.5% at RH50%. Hot-air drying cannot control dew point, so 0.1%+ residual moisture is possible. At 285°C, residual water turns to steam that is dragged to the surface, and amide-bond hydrolysis also lowers molecular weight, producing silver streak near the gate. The intermittent occurrence (1 in 5 shots) comes from uneven resin residence time in the hopper causing moisture variation.",
      evidence: "Drying conditions not entered. Nozzle 285°C is within the PA66 hydrolysis threshold range. The defect originating near the gate matches gas expansion from shear as material passes the gate.",
      elimination: "Temperature, speed, and hold pressure are all within the process window. The only unverified item is drying, so it ranks #1. A check-ring issue would be accompanied by cushion instability, but the current 5mm cushion setpoint shows no abnormality.",
      verification: "Measure resin moisture just before hopper feed. ≤0.08% → not drying-related, check #2. ≥0.1% → re-dry with a desiccant dryer 80°C 4hr+ and retry. If the silver streak disappears after redrying, drying is highly likely the root cause."
    },
    {
      rank: 2, category: "Machine", probability: 30,
      description: "Unstable shot volume from intermittent check-ring slippage → gas entrainment",
      scientific_reasoning: "Check-ring wear or trapped debris causes backflow, making pressure unstable at injection start and entraining air/gas in the melt front near the gate. The irregular 1-in-5-shot pattern is typical of intermittent check-ring slippage.",
      evidence: "Defect frequency is irregular at 1 in 5 shots. Metering 85mm, cushion 5mm setpoint, but actual cushion variation is unverified. Back pressure 5MPa is on the low side for PA66 GF33%, so metering may be unstable instability.",
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
    { priority: 1, parameter: "Verify drying conditions and switch to a desiccant dryer", current: "Not entered (drying conditions unknown)", recommended: "Desiccant dryer 80°C, 4-6hr, dew point ≤ -30°C", reason: "PA66 GF33% requires moisture ≤0.08%. Hot-air dryers cannot control dew point.", expected_result: "Expect a significant reduction in silver streak frequency near the gate", risk: "Production wait from increased drying time", interaction_note: "Melt viscosity changes after drying, so fine-tune hold pressure" },
    { priority: 2, parameter: "Back pressure", current: "5 MPa", recommended: "8-12 MPa", reason: "Higher back pressure improves metering uniformity and compresses/expels gas.", expected_result: "Cushion stabilizes, intermittent silver streak decreases", risk: "Possible GF fiber breakage; caution above 10MPa", interaction_note: "Keep screw speed at 80rpm and re-measure cushion variation" },
    { priority: 3, parameter: "Injection speed stage 1", current: "60%", recommended: "40-50% (decelerate through the gate)", reason: "Suppress shear heating near the gate and prevent air entrainment.", expected_result: "Observable improvement in silver streak location near the gate", risk: "Possible short shot; injection pressure monitoring required", interaction_note: "Confirm fill completes within the 120MPa stage-1 pressure limit" },
    { priority: 4, parameter: "Check-ring inspection", current: "Not inspected", recommended: "Measure cushion over 20 shots; disassemble and inspect if variation ≥±2mm", reason: "An intermittent pattern is typical of check-ring wear. If condition adjustments don't resolve it, the cause is mechanical.", expected_result: "Intermittent silver streak pattern resolves as cushion stabilizes", risk: "Production stop required for disassembly inspection", interaction_note: "If no cushion variation, judge the check-ring normal and examine mold venting" }
  ],
  checklist: {
    before_changes: ["Measure resin moisture (target <0.08%)", "Record actual cushion over 20 consecutive shots", "Confirm the defect cavity number"],
    after_changes: ["Confirm cushion stability over 10 shots after the back-pressure change", "Re-measure silver streak frequency after the drying change", "Confirm fill pattern after the injection speed change"],
    escalation: ["If 1-in-5-shot persists after drying + back-pressure adjustment, disassemble the check-ring", "If concentrated in one cavity, add a vent to that cavity", "If unresolved after 3 adjustments, consider changing gate location/size"]
  },
  resin_specific_notes: "PA66 GF33% is highly hygroscopic; desiccant drying is mandatory. Excessive back pressure causes GF breakage; watch for reduced mechanical strength.",
  drying_assessment: "Drying conditions not entered. Recommend desiccant drying 80°C/4hr+, dew point ≤ -30°C.",
  tier: "simple",
  round: 1,
  is_demo: true,
} as const;

// locale 셀렉터 — 둘 다 as const라 union 반환(NextResponse.json은 union 허용).
export function getSampleDemo(locale?: string): typeof SAMPLE_DEMO_RESULT | typeof SAMPLE_DEMO_RESULT_EN {
  return locale === 'en' ? SAMPLE_DEMO_RESULT_EN : SAMPLE_DEMO_RESULT;
}
