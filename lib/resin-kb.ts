// lib/resin-kb.ts
// 수지 가공윈도우 KB (1차 15종). 자유서술 → 구조화 전환.
// 수치 = 만국 공통 / commonDefects = defect_taxonomy.md 9종 enum / notes = 모델 주입용(영어)
// source/confidence: 1차 전부 experience/estimated. CAMPUS 교차검증 후 verified로 승격.

export type Tier = 'commodity' | 'engineering' | 'super-engineering' | 'blend';
export type Hygro = 'none' | 'low' | 'moderate' | 'high' | 'very-high';

// defect_taxonomy.md MVP 9종과 1:1 일치
export type DefectKey =
  | 'flash' | 'short_shot' | 'sink_mark' | 'weld_line' | 'burn_mark'
  | 'flow_mark' | 'jetting' | 'silver_streak' | 'warpage';

export interface ResinSpec {
  id: string;                       // 깔끔한 영문 표기
  tier: Tier;
  crystalline: boolean;             // true=반결정, false=비결정
  hygroscopic: Hygro;
  drying: { tempC: number; hours: [number, number]; targetMoisturePct: number | null } | null; // null=건조 불필요
  meltC: { min: number; max: number; degradeAbove?: number };
  moldC: { min: number; max: number; gf?: [number, number] };
  shrinkagePct?: [number, number];  // 원문에 수치 없으면 생략
  commonDefects: DefectKey[];       // 9종 enum만. 그 외는 notes
  notes: string;                    // 프롬프트 주입용(영어). 출력 언어는 route의 locale이 토글.
  source: 'experience' | 'verified';
  confidence: 'estimated' | 'verified';
}

// 키는 기존 resinKnowledge(route.ts) 키와 동일하게 유지 → UI/lookup 호환
export const RESIN_KB: Record<string, ResinSpec> = {
  'PA6': {
    id: 'PA6', tier: 'engineering', crystalline: true, hygroscopic: 'high',
    drying: { tempC: 80, hours: [4, 6], targetMoisturePct: 0.1 },
    meltC: { min: 230, max: 260 },
    moldC: { min: 60, max: 90, gf: [80, 100] },
    shrinkagePct: [1.5, 2.2],
    commonDefects: ['silver_streak', 'sink_mark', 'warpage'],
    notes: 'PA6: hygroscopic, always check drying first. Moisture is the #1 cause of silver streak. Crystallization shrinkage 1.5-2.2%. GF grades warp from fiber orientation.',
    source: 'experience', confidence: 'estimated',
  },
  'PA66': {
    id: 'PA66', tier: 'engineering', crystalline: true, hygroscopic: 'very-high',
    drying: { tempC: 80, hours: [4, 8], targetMoisturePct: 0.08 },
    meltC: { min: 260, max: 290, degradeAbove: 300 },
    moldC: { min: 70, max: 100, gf: [80, 120] },
    shrinkagePct: [1.2, 2.0],
    commonDefects: ['silver_streak', 'burn_mark', 'warpage'],
    notes: 'PA66: narrow processing window. Moisture is almost always the #1 suspect (40%+ of silver streak). Thermal degradation above 300°C. GF grades warp from fiber orientation.',
    source: 'experience', confidence: 'estimated',
  },
  'PA46': {
    id: 'PA46', tier: 'super-engineering', crystalline: true, hygroscopic: 'very-high',
    drying: { tempC: 80, hours: [16, 24], targetMoisturePct: 0.05 },
    meltC: { min: 310, max: 330, degradeAbove: 330 },
    moldC: { min: 120, max: 150 },
    shrinkagePct: [1.5, 2.5],
    commonDefects: ['silver_streak', 'flash'],
    notes: 'PA46(Stanyl): extremely hygroscopic, Tm 295°C. Drying 16-24hrs (3-4x PA66) with dehumidifying dryer is mandatory — hot air dryers are insufficient. This is the single most common mistake. PA46-specific: blistering after reflow soldering (260°C+) from residual moisture. Beyond 9-type: thermal degradation above 330°C.',
    source: 'experience', confidence: 'estimated',
  },
  'POM(아세탈)': {
    id: 'POM', tier: 'engineering', crystalline: true, hygroscopic: 'low',
    drying: { tempC: 80, hours: [2, 2], targetMoisturePct: null }, // 선택적 권장
    meltC: { min: 190, max: 210, degradeAbove: 220 },
    moldC: { min: 80, max: 100 },
    shrinkagePct: [1.8, 2.5],
    commonDefects: ['sink_mark'],
    notes: 'POM(acetal): high shrinkage. Releases formaldehyde gas above 220°C → needs excellent venting, no dead spots in hot runners. Narrow processing window. Beyond 9-type: formaldehyde deposits, center-gated voids.',
    source: 'experience', confidence: 'estimated',
  },
  'PBT': {
    id: 'PBT', tier: 'engineering', crystalline: true, hygroscopic: 'moderate',
    drying: { tempC: 120, hours: [4, 4], targetMoisturePct: 0.03 },
    meltC: { min: 230, max: 270 },
    moldC: { min: 60, max: 100 },
    shrinkagePct: [1.5, 2.2],
    commonDefects: ['warpage', 'sink_mark', 'flash'],
    notes: 'PBT: fast crystallization. Mold temp dramatically affects surface & crystallinity (60-80°C amorphous surface / 80-100°C crystalline). Warpage from fast uneven crystallization.',
    source: 'experience', confidence: 'estimated',
  },
  'PET': {
    id: 'PET', tier: 'engineering', crystalline: true, hygroscopic: 'high',
    drying: { tempC: 120, hours: [4, 6], targetMoisturePct: 0.02 },
    meltC: { min: 260, max: 290 },
    moldC: { min: 130, max: 140 }, // 결정질 기준. 비결정/투명은 20-30°C(notes)
    commonDefects: ['silver_streak', 'warpage'],
    notes: 'PET: slow crystallization. Mold temp controls crystalline (130-140°C) vs amorphous/transparent (20-30°C) state. Moisture → splay/silver. Beyond 9-type: acetaldehyde from overheating.',
    source: 'experience', confidence: 'estimated',
  },
  'PC': {
    id: 'PC', tier: 'engineering', crystalline: false, hygroscopic: 'high',
    drying: { tempC: 120, hours: [3, 4], targetMoisturePct: 0.02 },
    meltC: { min: 280, max: 320 },
    moldC: { min: 80, max: 120 },
    commonDefects: ['silver_streak'],
    notes: 'PC: amorphous, very high viscosity, extreme moisture sensitivity. Never mix regrind from other resins. Beyond 9-type: stress cracking from excessive pack pressure, splay, yellowing when overheated.',
    source: 'experience', confidence: 'estimated',
  },
  'PMMA(아크릴)': {
    id: 'PMMA', tier: 'engineering', crystalline: false, hygroscopic: 'moderate',
    drying: { tempC: 80, hours: [3, 4], targetMoisturePct: null },
    meltC: { min: 220, max: 260 },
    moldC: { min: 50, max: 80 },
    commonDefects: ['silver_streak'],
    notes: 'PMMA(acrylic): transparent. Optical clarity needs careful drying & clean processing. Moisture → silver streak. Beyond 9-type: crazing, bubbles, haze.',
    source: 'experience', confidence: 'estimated',
  },
  'PP': {
    id: 'PP', tier: 'commodity', crystalline: true, hygroscopic: 'none',
    drying: null,
    meltC: { min: 200, max: 250 },
    moldC: { min: 20, max: 60 },
    shrinkagePct: [1.5, 2.5],
    commonDefects: ['warpage', 'sink_mark', 'flow_mark'],
    notes: 'PP: warpage is dominant (uneven crystallization). High, anisotropic shrinkage with fiber. Mold temp uniformity is key to warpage control. Sink at thick sections.',
    source: 'experience', confidence: 'estimated',
  },
  'ABS': {
    id: 'ABS', tier: 'commodity', crystalline: false, hygroscopic: 'low',
    drying: { tempC: 80, hours: [2, 4], targetMoisturePct: null },
    meltC: { min: 210, max: 250, degradeAbove: 260 },
    moldC: { min: 40, max: 80 },
    shrinkagePct: [0.4, 0.7],
    commonDefects: ['silver_streak', 'weld_line'],
    notes: 'ABS: degrades above 260°C (turns yellow/brown). Moisture or degradation → splay/silver. Beyond 9-type: gloss variation from mold temp, weld line visibility.',
    source: 'experience', confidence: 'estimated',
  },
  'PS': {
    id: 'PS', tier: 'commodity', crystalline: false, hygroscopic: 'none',
    drying: null,
    meltC: { min: 180, max: 240 },
    moldC: { min: 20, max: 50 },
    shrinkagePct: [0.3, 0.6],
    commonDefects: ['burn_mark', 'flow_mark'],
    notes: 'PS: amorphous, very brittle, easy to process. Burn marks from poor venting. Flow lines. Beyond 9-type: cracking (brittle).',
    source: 'experience', confidence: 'estimated',
  },
  'PE(HDPE)': {
    id: 'HDPE', tier: 'commodity', crystalline: true, hygroscopic: 'none',
    drying: null,
    meltC: { min: 200, max: 250 },
    moldC: { min: 20, max: 60 },
    shrinkagePct: [1.5, 3.0],
    commonDefects: ['warpage', 'sink_mark'],
    notes: 'HDPE: commodity, high shrinkage 1.5-3.0%. Similar to PP but lower stiffness. Warpage and sink mark.',
    source: 'experience', confidence: 'estimated',
  },
  'PPS': {
    id: 'PPS', tier: 'super-engineering', crystalline: true, hygroscopic: 'low',
    drying: { tempC: 130, hours: [3, 3], targetMoisturePct: null },
    meltC: { min: 300, max: 340 },
    moldC: { min: 130, max: 150 },
    shrinkagePct: [0.1, 0.5],
    commonDefects: ['flash', 'weld_line'],
    notes: 'PPS: super engineering, very flash-prone (low viscosity at process temp). High mold temp essential for crystallization. Generates corrosive gases → frequent mold cleaning. Weld line weakness. Shrinkage 0.1-0.5% with GF.',
    source: 'experience', confidence: 'estimated',
  },
  'LCP': {
    id: 'LCP', tier: 'super-engineering', crystalline: true, hygroscopic: 'low',
    drying: { tempC: 120, hours: [4, 4], targetMoisturePct: null },
    meltC: { min: 280, max: 350 }, // grade-dependent
    moldC: { min: 80, max: 120 },
    shrinkagePct: [0.1, 0.5],
    commonDefects: ['flash', 'weld_line', 'warpage'],
    notes: 'LCP: liquid crystal polymer, extreme flash (can flash into 5-micron gaps), self-reinforcing fiber structure. Gate design & fill pattern are everything. Weld line near-zero strength. Anisotropic warpage. Melt 280-350°C is grade-dependent.',
    source: 'experience', confidence: 'estimated',
  },
  'PC/ABS': {
    id: 'PC/ABS', tier: 'blend', crystalline: false, hygroscopic: 'moderate',
    drying: { tempC: 100, hours: [3, 4], targetMoisturePct: null },
    meltC: { min: 240, max: 280 },
    moldC: { min: 60, max: 90 },
    commonDefects: ['silver_streak'],
    notes: 'PC/ABS: amorphous blend. Drying is critical, processing window narrower than either component alone. Moisture → splay. Beyond 9-type: delamination from incompatible processing, color streaks.',
    source: 'experience', confidence: 'estimated',
  },
};

// 1차 헬퍼: 구조화 KB에 있으면 spec 반환, 없으면 null(route는 기존 resinKnowledge로 폴백)
export function getResinSpec(resinType: string): ResinSpec | null {
  if (!resinType) return null;
  if (RESIN_KB[resinType]) return RESIN_KB[resinType];
  const partial = Object.keys(RESIN_KB).find(k => resinType.startsWith(k));
  return partial ? RESIN_KB[partial] : null;
}

// ── 수치 대조 (입력 셋팅값 vs KB 권장범위) ──────────────────────────────
// 철학 A: 코드는 객관적 앵커만 제공(가이드레일). 최종 판단은 모델이 맥락 종합.
export type CheckStatus = 'ok' | 'low' | 'high' | 'degrade';
export interface SettingCheck {
  label: string;     // '노즐 온도'
  value: number;
  unit: string;      // '℃'
  rangeText: string; // '260-290℃'
  status: CheckStatus;
}

// 문자열 입력에서 숫자만 추출. 비거나 파싱 불가면 null.
function toNum(v: string | undefined | null): number | null {
  if (v == null) return null;
  const n = parseFloat(String(v).replace(/[^0-9.\-]/g, ''));
  return Number.isFinite(n) ? n : null;
}

export function checkSettings(
  spec: ResinSpec,
  s: Record<string, string>,
  a: Record<string, string>,
  filler?: string,
): SettingCheck[] {
  const out: SettingCheck[] = [];

  // 멜트(노즐온도 근사 — 실측 멜트는 입력에 없음)
  const nozzle = toNum(s.nozzleTemp);
  if (nozzle !== null) {
    const { min, max, degradeAbove } = spec.meltC;
    let status: CheckStatus = nozzle < min ? 'low' : nozzle > max ? 'high' : 'ok';
    if (degradeAbove !== undefined && nozzle >= degradeAbove) status = 'degrade';
    const range = `${min}-${max}℃${degradeAbove !== undefined ? `, ${degradeAbove}℃+ 열분해` : ''}`;
    out.push({ label: '노즐 온도', value: nozzle, unit: '℃', rangeText: range, status });
  }

  // 금형온도(고정/가동 평균). 충전재 입력 있으면 GF 범위 적용.
  const moldVals = [toNum(s.moldTempFixed), toNum(s.moldTempMoving)].filter(
    (v): v is number => v !== null,
  );
  if (moldVals.length > 0) {
    const mold = moldVals.reduce((x, y) => x + y, 0) / moldVals.length;
    const hasFiller = !!filler && filler !== '없음' && filler.toLowerCase() !== 'none';
    const useGf = hasFiller && spec.moldC.gf !== undefined;
    const lo = useGf ? spec.moldC.gf![0] : spec.moldC.min;
    const hi = useGf ? spec.moldC.gf![1] : spec.moldC.max;
    const status: CheckStatus = mold < lo ? 'low' : mold > hi ? 'high' : 'ok';
    out.push({ label: '금형 온도', value: Math.round(mold), unit: '℃', rangeText: `${lo}-${hi}℃${useGf ? '(GF)' : ''}`, status });
  }

  // 건조(필요 수지만). 온도/시간/수분율.
  if (spec.drying !== null) {
    const d = spec.drying;
    const dryTemp = toNum(a.dryTemp);
    if (dryTemp !== null) {
      const status: CheckStatus = dryTemp < d.tempC - 10 ? 'low' : dryTemp > d.tempC + 20 ? 'high' : 'ok';
      out.push({ label: '건조 온도', value: dryTemp, unit: '℃', rangeText: `${d.tempC}℃ 권장`, status });
    }
    const dryTime = toNum(a.dryTime);
    if (dryTime !== null) {
      const status: CheckStatus = dryTime < d.hours[0] ? 'low' : 'ok';
      out.push({ label: '건조 시간', value: dryTime, unit: 'hr', rangeText: `${d.hours[0]}-${d.hours[1]}hr`, status });
    }
    const moisture = toNum(a.moistureContent);
    if (moisture !== null && d.targetMoisturePct !== null) {
      const status: CheckStatus = moisture > d.targetMoisturePct ? 'high' : 'ok';
      out.push({ label: '수분율', value: moisture, unit: '%', rangeText: `<${d.targetMoisturePct}% 목표`, status });
    }
  }

  return out;
}

const STATUS_MARK: Record<CheckStatus, string> = {
  ok: '범위 내 ✓',
  low: '낮음 ⚠',
  high: '높음 ⚠',
  degrade: '상한 초과·열분해 위험 ⚠',
};

// 대조 결과 → 프롬프트 주입용 텍스트(가이드레일). 면책 포함.
export function formatKbCompare(spec: ResinSpec, checks: SettingCheck[]): string {
  if (checks.length === 0) return '';
  const lines = checks
    .map(c => `- ${c.label} ${c.value}${c.unit}: ${spec.id} 권장 ${c.rangeText} → ${STATUS_MARK[c.status]}`)
    .join('\n');
  return `## 가공윈도우 사전 대조 (KB 기준, 참고용)
${lines}
※ 일반 가공윈도우 기준이다. 등급·충전재·벽두께에 따라 적정값이 달라질 수 있어 절대 기준이 아니다. 최종 판단은 전체 맥락으로 하라.`;
}
