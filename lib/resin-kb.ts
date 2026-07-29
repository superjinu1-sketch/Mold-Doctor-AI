// lib/resin-kb.ts
// 수지 가공윈도우 KB. 자유서술 → 구조화 전환.
// 수치 = 만국 공통 / commonDefects = defect_taxonomy.md 9종 enum / notes = 모델 주입용(영어)
// source/confidence: 현재 전부 experience/estimated. CAMPUS 교차검증 후 verified로 승격.
// 데이터 불완전(불소수지 PTFE/FEP/PFA/ETFE, PI, TPA, TPV)은 미수록 → route가 기존 resinKnowledge로 폴백.

export type Tier = 'commodity' | 'engineering' | 'super-engineering' | 'blend' | 'elastomer';
export type Hygro = 'none' | 'low' | 'moderate' | 'high' | 'very-high';

// defect_taxonomy.md MVP 9종과 1:1 일치
export type DefectKey =
  | 'flash' | 'short_shot' | 'sink_mark' | 'weld_line' | 'burn_mark'
  | 'flow_mark' | 'jetting' | 'silver_streak' | 'warpage';

// ── 수지 심층 KB Phase 0 (스키마만, 값은 미채움 — resin-mechanism-schema-v1) ──
// 절대 규칙: 어떤 수지에도 mechanism/moldInteraction 값을 채우지 마라. AI 지식으로 채우는 것이
// 이 로드맵이 고치려는 실수 그 자체다. 값은 Phase 1에서 공급사 TDS·문헌 검증 후 코워크가 하나씩 넘긴다.
//
// 필드별로 바뀌는 진단(로드맵 제1원칙 — 진단 분기를 바꾸는 필드만 추가):
//   moistureMode          hydrolysis 수지(PC·PBT 등)의 습기 성형품 → "재건조로 회복 불가, 로트 물성 손상"
//                         안내. plasticization(PA)과 구분
//   polymerizationClass   가수분해 리스크의 기전적 파생(축중합=물이 부산물=역반응). moistureMode
//                         정합성 검사용 — addition인데 hydrolysis면 데이터 오류(콘솔 경고, formatMechanism 참조)
//   residualMonomerRisk   plate-out·금형 퇴적·가스 불량의 재료 기인 분기(PA6→카프로락탐, POM→포름알데히드)
//   mwdSensitivity        협폭(메탈로센계)=전단박화 작음 → 충전 개선에 속도↑가 안 먹히는 이유
//   lotVariationNotes     "조건 무변경 + 간헐·로트성 발생" → 재료 로트 축 확인 항목
//   crystallizationRate   fast(POM·PBT) 싱크 → 보압시간보다 게이트 동결 선검토
//   viscositySensitivity  충전 불량에서 온도↑ vs 속도↑ 선택
//   residenceSensitivity  high(POM·PVC·난연) 흑점·변색 → 체류시간 원인 가중
//   shrinkageAnisotropy   GF 휨 → 배향(게이트 위치) 원인 우선
//   ventingDemand         번마크·미성형 → 벤트 원인 가중
//   corrosivity           반복 불량 → 금형 손상 가능성 언급
export interface ResinMechanism {
  moistureMode?: 'hydrolysis' | 'plasticization' | 'both' | 'none';
  crystallizationRate?: 'fast' | 'medium' | 'slow';
  viscositySensitivity?: 'temp-dominant' | 'shear-dominant' | 'balanced';
  residenceSensitivity?: 'high' | 'medium' | 'low';
  // ── 업스트림·중합 레이어 ──
  polymerizationClass?: 'condensation' | 'addition' | 'ring-opening';
  residualMonomerRisk?: { monomer: string; consequence: string };  // 영문
  mwdSensitivity?: 'broad' | 'narrow' | 'grade-dependent';
  lotVariationNotes?: string;  // 영문 — "조건 무변경+간헐 발생" 시나리오용
  notes?: string;              // 영문, 프롬프트 주입용 기전 특이사항
  sourceRefs?: string[];       // defect-kb와 동일 규율 — 실제 문헌·TDS 인용. 프롬프트엔 절대 미포함
  verifiedAt?: string;         // ISO date
}

export interface MoldInteraction {
  shrinkageAnisotropy?: { flow: [number, number]; transverse: [number, number] };
  ventingDemand?: 'high' | 'medium' | 'low';
  corrosivity?: 'none' | 'moderate' | 'high';
  gateSensitivity?: string;    // 영문
  sourceRefs?: string[];
  verifiedAt?: string;
}

export interface ResinSpec {
  id: string;
  tier: Tier;
  crystalline: boolean;
  hygroscopic: Hygro;
  drying: { tempC: number; hours: [number, number]; targetMoisturePct: number | null } | null;
  meltC: { min: number; max: number; degradeAbove?: number };
  moldC: { min: number; max: number; gf?: [number, number] };
  shrinkagePct?: [number, number];
  commonDefects: DefectKey[];
  notes: string;
  source: 'experience' | 'verified';
  confidence: 'estimated' | 'verified';
  mechanism?: ResinMechanism;
  moldInteraction?: MoldInteraction;
}

// 키는 기존 resinKnowledge(route.ts) 키와 동일하게 유지 → UI/lookup 호환
export const RESIN_KB: Record<string, ResinSpec> = {
  // ── PA 계열 ──
  'PA6': { id: 'PA6', tier: 'engineering', crystalline: true, hygroscopic: 'high',
    drying: { tempC: 80, hours: [4, 6], targetMoisturePct: 0.08 },
    meltC: { min: 240, max: 270, degradeAbove: 300 }, moldC: { min: 60, max: 90, gf: [80, 100] }, shrinkagePct: [0.8, 1.5],
    commonDefects: ['silver_streak', 'sink_mark', 'warpage'],
    notes: 'PA6: hygroscopic, always check drying first. Moisture is the #1 cause of silver streak. Crystallization shrinkage 0.8-1.5%. GF grades warp from fiber orientation. Lower melt bound 240°C = Tm 222 + margin; below this expect unmelt/low-melt defects. Max residence ~10min at melt temp.',
    source: 'verified', confidence: 'verified',
    mechanism: {
      moistureMode: 'both',
      crystallizationRate: 'fast',
      viscositySensitivity: 'shear-dominant',
      residenceSensitivity: 'medium',
      polymerizationClass: 'ring-opening',
      notes: 'Moisture acts at two stages — keep them separate when advising: (1) WET PELLETS at melt temp → hydrolysis; parts molded from wet resin have permanently reduced strength/toughness (cannot be restored by re-drying or reprocessing). (2) MOLDED PARTS absorbing ambient moisture → plasticization; reversible, and conditioning to ~2-3% water is standard practice for toughness.',
      residualMonomerRisk: {
        monomer: 'caprolactam',
        consequence: 'Residual/regenerated caprolactam volatilizes at melt temperature and condenses as mold/vent deposits (plate-out), surface bloom, and odor; also contributes to splay and voids. If deposits recur on PA6 but not on PA66 under the same mold and conditions, suspect this material axis rather than process settings.',
      },
      sourceRefs: [
        'DuPont Zytel/Minlon Molding Guide — moisture <0.2%; hydrolysis above; "cannot be restored by further processing"; part conditioning ~3% water (verified 2026-07-29)',
        'Interplas Insights — caprolactam residual monomer in PA: outgassing, deposit formation, surface bloom, splay/voids (verified 2026-07-29)',
        'DuPont Zytel Molding Guide — "crystallize rapidly"; HUT at 310°C: MW −6%/10min, −17%/30min; viscosity shear-dominant, less temp-sensitive unreinforced (verified 2026-07-29)',
      ],
      verifiedAt: '2026-07-29',
    } },
  'PA66': { id: 'PA66', tier: 'engineering', crystalline: true, hygroscopic: 'very-high',
    drying: { tempC: 80, hours: [4, 8], targetMoisturePct: 0.08 },
    meltC: { min: 275, max: 300, degradeAbove: 310 }, moldC: { min: 70, max: 100, gf: [80, 100] }, shrinkagePct: [1.2, 2.0],
    commonDefects: ['silver_streak', 'burn_mark', 'warpage'],
    notes: 'PA66: narrow processing window. Moisture is almost always the #1 suspect (40%+ of silver streak). Thermal degradation above 300°C. GF grades warp from fiber orientation. Normal molding up to 305°C is possible; above 300°C minimize residence time.',
    source: 'verified', confidence: 'verified',
    mechanism: {
      moistureMode: 'both',
      crystallizationRate: 'fast',
      viscositySensitivity: 'shear-dominant',
      residenceSensitivity: 'medium',
      polymerizationClass: 'condensation',
      notes: 'Moisture acts at two stages — keep them separate when advising: (1) WET PELLETS at melt temp → hydrolysis; parts molded from wet resin have permanently reduced strength/toughness (cannot be restored by re-drying or reprocessing). (2) MOLDED PARTS absorbing ambient moisture → plasticization; reversible, and conditioning to ~2-3% water is standard practice for toughness.',
      sourceRefs: [
        'DuPont Zytel/Minlon Molding Guide — moisture <0.2%; hydrolysis above; "cannot be restored by further processing"; part conditioning ~3% water (verified 2026-07-29)',
        'DuPont Zytel Molding Guide — "crystallize rapidly"; HUT at 310°C: MW −6%/10min, −17%/30min; viscosity shear-dominant, less temp-sensitive unreinforced (verified 2026-07-29)',
      ],
      verifiedAt: '2026-07-29',
    } },
  'PA46': { id: 'PA46', tier: 'super-engineering', crystalline: true, hygroscopic: 'very-high',
    drying: { tempC: 80, hours: [16, 24], targetMoisturePct: 0.05 },
    meltC: { min: 310, max: 330, degradeAbove: 330 }, moldC: { min: 120, max: 150 }, shrinkagePct: [1.5, 2.5],
    commonDefects: ['silver_streak', 'flash'],
    notes: 'PA46: extremely hygroscopic, Tm 295°C. Drying 16-24hrs (3-4x PA66) with dehumidifying dryer is mandatory — hot air dryers are insufficient. PA46-specific: blistering after reflow soldering (260°C+). Beyond 9-type: thermal degradation above 330°C.',
    source: 'experience', confidence: 'estimated' },
  'PA410': { id: 'PA410', tier: 'engineering', crystalline: true, hygroscopic: 'moderate',
    drying: { tempC: 80, hours: [4, 6], targetMoisturePct: 0.08 },
    meltC: { min: 270, max: 310 }, moldC: { min: 80, max: 120 }, shrinkagePct: [1.5, 2.5],
    commonDefects: ['sink_mark', 'warpage'],
    notes: 'PA410(bio-based): castor oil-derived, ~30% lower moisture uptake than PA66, crystallizes faster. Mold below 80°C gives amorphous surface with poor gloss. Sink at bosses: raise mold temp + optimize gate.',
    source: 'experience', confidence: 'estimated' },
  'PA4T': { id: 'PA4T', tier: 'super-engineering', crystalline: true, hygroscopic: 'low',
    drying: { tempC: 120, hours: [4, 6], targetMoisturePct: 0.05 },
    meltC: { min: 340, max: 360, degradeAbove: 360 }, moldC: { min: 130, max: 160 },
    commonDefects: ['flash'],
    notes: 'PA4T: semi-aromatic PPA, excellent flow (thin walls 0.3mm+), flashes into micro-gaps so PL face precision is critical. Beyond 9-type: blistering after reflow (260-288°C), thermal degradation above 360°C.',
    source: 'experience', confidence: 'estimated' },
  'PA6T': { id: 'PA6T', tier: 'super-engineering', crystalline: true, hygroscopic: 'moderate',
    drying: { tempC: 120, hours: [4, 6], targetMoisturePct: null },
    meltC: { min: 320, max: 340 }, moldC: { min: 130, max: 150 },
    commonDefects: ['flash', 'burn_mark', 'short_shot'],
    notes: 'PA6T(PPA): semi-aromatic, high heat resistance. High fluidity → flash. High-temp processing → burn risk. Fast solidification → short shot.',
    source: 'experience', confidence: 'estimated' },
  'PA9T': { id: 'PA9T', tier: 'super-engineering', crystalline: true, hygroscopic: 'low',
    drying: { tempC: 120, hours: [4, 4], targetMoisturePct: null },
    meltC: { min: 310, max: 330 }, moldC: { min: 120, max: 140 },
    commonDefects: ['flash', 'weld_line'],
    notes: 'PA9T: semi-aromatic, excellent flow, less moisture sensitive than PA6T, easier to process. Very good flow → flash. Weld line weakness.',
    source: 'experience', confidence: 'estimated' },
  'PA10T': { id: 'PA10T', tier: 'super-engineering', crystalline: true, hygroscopic: 'low',
    drying: { tempC: 100, hours: [4, 4], targetMoisturePct: null },
    meltC: { min: 310, max: 340 }, moldC: { min: 120, max: 150 },
    commonDefects: ['flash'],
    notes: 'PA10T: semi-aromatic, bio-based option, similar to PA9T. Properties vary significantly by grade — check specific grade TDS.',
    source: 'experience', confidence: 'estimated' },
  'PA12T': { id: 'PA12T', tier: 'super-engineering', crystalline: true, hygroscopic: 'low',
    drying: { tempC: 90, hours: [4, 4], targetMoisturePct: null },
    meltC: { min: 300, max: 330 }, moldC: { min: 110, max: 140 },
    commonDefects: ['flash'],
    notes: 'PA12T: semi-aromatic, good dimensional stability, lower moisture absorption than aliphatic PAs.',
    source: 'experience', confidence: 'estimated' },
  'PA12': { id: 'PA12', tier: 'engineering', crystalline: true, hygroscopic: 'low',
    drying: { tempC: 75, hours: [4, 4], targetMoisturePct: null },
    meltC: { min: 180, max: 220 }, moldC: { min: 40, max: 70 }, shrinkagePct: [0.5, 1.5],
    commonDefects: ['sink_mark', 'warpage'],
    notes: 'PA12: flexible, low moisture absorption, most forgiving PA to process. Warpage less than PA6/66.',
    source: 'experience', confidence: 'estimated' },
  'PA610': { id: 'PA610', tier: 'engineering', crystalline: true, hygroscopic: 'moderate',
    drying: { tempC: 80, hours: [4, 6], targetMoisturePct: null },
    meltC: { min: 220, max: 240 }, moldC: { min: 60, max: 90 },
    commonDefects: ['silver_streak', 'sink_mark'],
    notes: 'PA610: less hygroscopic than PA6/66, good balance of properties, similar processing approach.',
    source: 'experience', confidence: 'estimated' },
  'PA612': { id: 'PA612', tier: 'engineering', crystalline: true, hygroscopic: 'low',
    drying: { tempC: 80, hours: [4, 4], targetMoisturePct: null },
    meltC: { min: 220, max: 240 }, moldC: { min: 60, max: 90 },
    commonDefects: ['sink_mark', 'warpage'],
    notes: 'PA612: low moisture absorption (similar to PA12), better dimensional stability than PA6.',
    source: 'experience', confidence: 'estimated' },
  'PA1010': { id: 'PA1010', tier: 'engineering', crystalline: true, hygroscopic: 'low',
    drying: { tempC: 80, hours: [4, 4], targetMoisturePct: null },
    meltC: { min: 200, max: 220 }, moldC: { min: 60, max: 80 },
    commonDefects: ['sink_mark', 'warpage'],
    notes: 'PA1010: bio-based, low moisture absorption, excellent chemical resistance. Processes similar to PA12.',
    source: 'experience', confidence: 'estimated' },
  'PA6/66': { id: 'PA6/66', tier: 'engineering', crystalline: true, hygroscopic: 'high',
    drying: { tempC: 80, hours: [4, 6], targetMoisturePct: null },
    meltC: { min: 240, max: 270 }, moldC: { min: 60, max: 90 },
    commonDefects: ['silver_streak', 'sink_mark', 'warpage'],
    notes: 'PA6/66 copolymer: intermediate between PA6 and PA66, broader processing window than PA66. Still hygroscopic — check drying.',
    source: 'experience', confidence: 'estimated' },
  'MXD6': { id: 'MXD6', tier: 'engineering', crystalline: true, hygroscopic: 'moderate',
    drying: { tempC: 120, hours: [4, 6], targetMoisturePct: null },
    meltC: { min: 240, max: 270 }, moldC: { min: 100, max: 140 },
    commonDefects: ['warpage', 'sink_mark'],
    notes: 'MXD6: high Tg, high barrier, used in barrier applications. Higher mold temp needed for good crystallinity.',
    source: 'experience', confidence: 'estimated' },

  // ── 폴리에스터 / PPE ──
  'PBT': { id: 'PBT', tier: 'engineering', crystalline: true, hygroscopic: 'moderate',
    drying: { tempC: 120, hours: [4, 4], targetMoisturePct: 0.03 },
    meltC: { min: 250, max: 270, degradeAbove: 280 }, moldC: { min: 60, max: 100 }, shrinkagePct: [1.5, 2.2],
    commonDefects: ['warpage', 'sink_mark', 'flash'],
    notes: 'PBT: fast crystallization. Mold temp dramatically affects surface & crystallinity (60-80°C amorphous / 80-100°C crystalline). Warpage from fast uneven crystallization. Above 280°C degradation begins; ~290°C releases CO/THF fumes.',
    source: 'verified', confidence: 'verified',
    mechanism: {
      moistureMode: 'hydrolysis',
      crystallizationRate: 'fast',
      residenceSensitivity: 'medium',
      polymerizationClass: 'condensation',
      notes: 'Residence caution: for some grades, properties are lost within ~6 min at 260°C melt (grade-dependent) — at the top of the melt range, keep residence short and downsize the barrel before blaming mold or resin lot.',
      sourceRefs: [
        'Plastics Technology — You Must Dry Hygroscopic Resins (PBT in hydrolysis list); BASF Ultradur B4500 PDS — moisture <0.04% (verified 2026-07-29)',
        'Celanese Celanex Tech Manual p.5 — "almost instantaneous crystallization from the melt"; PT Residence Time Pt.1 — PBT 260°C/6min property loss (verified 2026-07-29)',
      ],
      verifiedAt: '2026-07-29',
    } },
  'PET': { id: 'PET', tier: 'engineering', crystalline: true, hygroscopic: 'high',
    drying: { tempC: 120, hours: [4, 6], targetMoisturePct: 0.02 },
    meltC: { min: 260, max: 290 }, moldC: { min: 130, max: 140 },
    commonDefects: ['silver_streak', 'warpage'],
    notes: 'PET: slow crystallization. Mold temp controls crystalline (130-140°C) vs amorphous/transparent (20-30°C). Moisture → splay/silver. Beyond 9-type: acetaldehyde from overheating.',
    source: 'experience', confidence: 'estimated' },
  'PCT': { id: 'PCT', tier: 'engineering', crystalline: true, hygroscopic: 'moderate',
    drying: { tempC: 120, hours: [4, 4], targetMoisturePct: null },
    meltC: { min: 280, max: 310 }, moldC: { min: 100, max: 130 },
    commonDefects: ['warpage', 'sink_mark'],
    notes: 'PCT: higher heat resistance than PBT/PET, similar to PBT but higher processing temperatures.',
    source: 'experience', confidence: 'estimated' },
  'PEN': { id: 'PEN', tier: 'engineering', crystalline: true, hygroscopic: 'moderate',
    drying: { tempC: 120, hours: [4, 4], targetMoisturePct: null },
    meltC: { min: 270, max: 290 }, moldC: { min: 80, max: 120 },
    commonDefects: ['warpage'],
    notes: 'PEN: high barrier, high Tg, higher performance than PET, used in specialty applications.',
    source: 'experience', confidence: 'estimated' },
  'PC': { id: 'PC', tier: 'engineering', crystalline: false, hygroscopic: 'high',
    drying: { tempC: 120, hours: [3, 4], targetMoisturePct: 0.02 },
    meltC: { min: 280, max: 320, degradeAbove: 320 }, moldC: { min: 70, max: 110 }, shrinkagePct: [0.5, 0.7],
    commonDefects: ['silver_streak'],
    notes: 'PC: amorphous, very high viscosity, extreme moisture sensitivity. Never mix regrind from other resins. Beyond 9-type: stress cracking from excessive pack pressure, splay, yellowing when overheated. Above 320°C or long residence time: thermal degradation + yellowing.',
    source: 'verified', confidence: 'verified',
    mechanism: {
      moistureMode: 'hydrolysis',
      polymerizationClass: 'condensation',
      sourceRefs: ['Plastics Technology — You Must Dry Hygroscopic Resins (PC hydrolysis, premature failure); PT Resin Types — PC target 0.02%/200ppm (verified 2026-07-29)'],
      verifiedAt: '2026-07-29',
    } },
  'PPE/PPO': { id: 'PPE/PPO', tier: 'engineering', crystalline: false, hygroscopic: 'low',
    drying: { tempC: 90, hours: [2, 4], targetMoisturePct: null },
    meltC: { min: 260, max: 300 }, moldC: { min: 80, max: 100 },
    commonDefects: ['weld_line'],
    notes: 'PPE/PPO: amorphous, usually alloyed (rarely processed alone) as PPE/PS or m-PPE alloy.',
    source: 'experience', confidence: 'estimated' },
  'm-PPE': { id: 'm-PPE', tier: 'engineering', crystalline: false, hygroscopic: 'low',
    drying: { tempC: 80, hours: [2, 4], targetMoisturePct: null },
    meltC: { min: 260, max: 300 }, moldC: { min: 80, max: 100 },
    commonDefects: ['weld_line'],
    notes: 'm-PPE(modified PPE): good hydrolytic stability, better processability than pure PPE, handles similar to PC.',
    source: 'experience', confidence: 'estimated' },
  // ── POM ──
  'POM(아세탈)': { id: 'POM', tier: 'engineering', crystalline: true, hygroscopic: 'low',
    drying: { tempC: 80, hours: [2, 2], targetMoisturePct: null },
    meltC: { min: 190, max: 210, degradeAbove: 230 }, moldC: { min: 80, max: 100 }, shrinkagePct: [1.8, 2.2],
    commonDefects: ['sink_mark'],
    notes: 'POM(acetal): high shrinkage. Releases formaldehyde gas above 230°C → needs excellent venting, no dead spots in hot runners. Narrow processing window. Beyond 9-type: formaldehyde deposits, center-gated voids. Copolymer baseline (Korean market default). Homopolymer melt 205-225°C, hard limit 230°C; copolymer hard limit 238°C. Copolymer: avoid residence >15min above 193°C (formaldehyde).',
    source: 'verified', confidence: 'verified',
    mechanism: {
      moistureMode: 'none',
      residenceSensitivity: 'high',
      notes: 'Very low moisture uptake; drying normally unnecessary (recommended only for consistency). Surface moisture can cause splay/odor but does not degrade the polymer.',
      residualMonomerRisk: {
        monomer: 'formaldehyde',
        consequence: 'Overheating or excess residence regenerates formaldehyde gas (Celanese: never above 238°C; do not hold above 193°C for more than 15 min without purging) — odor, gas-related defects, vent deposits. Safety: ventilation required; blocked vents can cause pressure blow-back. For POM odor/burn complaints, check residence time and temperature before mold-side causes.',
      },
      sourceRefs: [
        'Celanese Celcon Processing Guide — no drying normally required; splay/odor only, no degradation (verified 2026-07-29)',
        'Celanese Celcon Processing Guide — degradation above 238°C / >15min above 193°C releases formaldehyde; ventilation & blow-back warnings (verified 2026-07-29)',
        'Tangram Plastics Data File POM — thermal damage >230°C unless residence kept short (corroborates Celcon limits) (verified 2026-07-29)',
      ],
      verifiedAt: '2026-07-29',
    } },
  // ── 고성능 (super engineering) ──
  'PPS': { id: 'PPS', tier: 'super-engineering', crystalline: true, hygroscopic: 'low',
    drying: { tempC: 130, hours: [3, 3], targetMoisturePct: null },
    meltC: { min: 300, max: 340 }, moldC: { min: 130, max: 150 }, shrinkagePct: [0.1, 0.5],
    commonDefects: ['flash', 'weld_line'],
    notes: 'PPS: super engineering, very flash-prone (low viscosity at process temp). High mold temp essential for crystallization. Generates corrosive gases → frequent mold cleaning. Weld line weakness. Shrinkage 0.1-0.5% with GF.',
    source: 'experience', confidence: 'estimated' },
  'LCP': { id: 'LCP', tier: 'super-engineering', crystalline: true, hygroscopic: 'low',
    drying: { tempC: 120, hours: [4, 4], targetMoisturePct: null },
    meltC: { min: 280, max: 350 }, moldC: { min: 80, max: 120 }, shrinkagePct: [0.1, 0.5],
    commonDefects: ['flash', 'weld_line', 'warpage'],
    notes: 'LCP: liquid crystal polymer, extreme flash (can flash into 5-micron gaps), self-reinforcing. Gate design & fill pattern are everything. Weld line near-zero strength. Anisotropic warpage. Melt 280-350°C grade-dependent.',
    source: 'experience', confidence: 'estimated' },
  'PEEK': { id: 'PEEK', tier: 'super-engineering', crystalline: true, hygroscopic: 'low',
    drying: { tempC: 150, hours: [3, 4], targetMoisturePct: null },
    meltC: { min: 360, max: 400, degradeAbove: 400 }, moldC: { min: 160, max: 200 },
    commonDefects: ['warpage'],
    notes: 'PEEK: highest performance, very expensive (minimize purging waste), needs special high-temp screw/barrel. Mold too cold → amorphous/poor surface. Degradation above 400°C.',
    source: 'experience', confidence: 'estimated' },
  'PEI': { id: 'PEI', tier: 'super-engineering', crystalline: false, hygroscopic: 'moderate',
    drying: { tempC: 150, hours: [4, 6], targetMoisturePct: null },
    meltC: { min: 340, max: 370 }, moldC: { min: 140, max: 175 },
    commonDefects: ['short_shot', 'silver_streak'],
    notes: 'PEI: very high melt viscosity → needs high injection pressure → short shot risk. Moisture → splay. Beyond 9-type: stress cracking. Transparent amber.',
    source: 'experience', confidence: 'estimated' },
  'PAI': { id: 'PAI', tier: 'super-engineering', crystalline: false, hygroscopic: 'high',
    drying: { tempC: 120, hours: [16, 16], targetMoisturePct: null },
    meltC: { min: 330, max: 370 }, moldC: { min: 200, max: 230 },
    commonDefects: [],
    notes: 'PAI: highest performance thermoplastic, requires post-cure and special equipment/expertise. Drying 16hrs minimum.',
    source: 'experience', confidence: 'estimated' },
  'PSU': { id: 'PSU', tier: 'super-engineering', crystalline: false, hygroscopic: 'moderate',
    drying: { tempC: 120, hours: [4, 4], targetMoisturePct: null },
    meltC: { min: 330, max: 380 }, moldC: { min: 80, max: 120 },
    commonDefects: ['silver_streak'],
    notes: 'PSU(Polysulfone): transparent, chemical resistance but sensitive to certain solvents. Moisture → splay. Beyond 9-type: stress cracking.',
    source: 'experience', confidence: 'estimated' },
  'PPSU': { id: 'PPSU', tier: 'super-engineering', crystalline: false, hygroscopic: 'moderate',
    drying: { tempC: 150, hours: [4, 4], targetMoisturePct: null },
    meltC: { min: 340, max: 380 }, moldC: { min: 100, max: 140 },
    commonDefects: ['silver_streak'],
    notes: 'PPSU: sterilizable (medical applications), better hydrolytic stability than PSU.',
    source: 'experience', confidence: 'estimated' },
  'PES': { id: 'PES', tier: 'super-engineering', crystalline: false, hygroscopic: 'moderate',
    drying: { tempC: 150, hours: [4, 4], targetMoisturePct: null },
    meltC: { min: 340, max: 380 }, moldC: { min: 100, max: 140 },
    commonDefects: ['silver_streak'],
    notes: 'PES: high temperature performance, similar to PPSU.',
    source: 'experience', confidence: 'estimated' },
  // ── 범용 (commodity) ──
  'PP': { id: 'PP', tier: 'commodity', crystalline: true, hygroscopic: 'none',
    drying: null, meltC: { min: 200, max: 250, degradeAbove: 290 }, moldC: { min: 20, max: 60 }, shrinkagePct: [1.0, 2.5],
    commonDefects: ['warpage', 'sink_mark', 'flow_mark'],
    notes: 'PP: warpage is dominant (uneven crystallization). High, anisotropic shrinkage with fiber. Mold temp uniformity is key to warpage control. Sink at thick sections.',
    source: 'verified', confidence: 'verified',
    mechanism: {
      moistureMode: 'none',
      polymerizationClass: 'addition',
      sourceRefs: ['Plastics Technology — Resin Types: non-hygroscopic, surface moisture only (verified 2026-07-29)'],
      verifiedAt: '2026-07-29',
    } },
  'PE(HDPE)': { id: 'HDPE', tier: 'commodity', crystalline: true, hygroscopic: 'none',
    drying: null, meltC: { min: 200, max: 250 }, moldC: { min: 20, max: 50 }, shrinkagePct: [1.5, 3.0],
    commonDefects: ['warpage', 'sink_mark'],
    notes: 'HDPE: commodity, high shrinkage 1.5-3.0%. Similar to PP but lower stiffness. Warpage and sink mark.',
    source: 'verified', confidence: 'verified',
    mechanism: {
      moistureMode: 'none',
      polymerizationClass: 'addition',
      sourceRefs: ['Plastics Technology — Resin Types: non-hygroscopic, surface moisture only (verified 2026-07-29)'],
      verifiedAt: '2026-07-29',
    } },
  'PE(LDPE)': { id: 'LDPE', tier: 'commodity', crystalline: true, hygroscopic: 'none',
    drying: null, meltC: { min: 160, max: 210 }, moldC: { min: 20, max: 50 },
    commonDefects: ['sink_mark', 'warpage'],
    notes: 'LDPE: very flexible, low melting point.',
    source: 'experience', confidence: 'estimated' },
  'PE(LLDPE)': { id: 'LLDPE', tier: 'commodity', crystalline: true, hygroscopic: 'none',
    drying: null, meltC: { min: 180, max: 240 }, moldC: { min: 20, max: 60 },
    commonDefects: ['sink_mark', 'warpage'],
    notes: 'LLDPE: better impact than HDPE, used in film/flexible parts.',
    source: 'experience', confidence: 'estimated' },
  'PS': { id: 'PS', tier: 'commodity', crystalline: false, hygroscopic: 'none',
    drying: null, meltC: { min: 180, max: 240, degradeAbove: 280 }, moldC: { min: 20, max: 50 }, shrinkagePct: [0.3, 0.6],
    commonDefects: ['burn_mark', 'flow_mark'],
    notes: 'PS: amorphous, very brittle, easy to process. Burn marks from poor venting. Flow lines. Beyond 9-type: cracking (brittle).',
    source: 'verified', confidence: 'verified',
    mechanism: {
      moistureMode: 'none',
      polymerizationClass: 'addition',
      sourceRefs: ['Plastics Technology — Resin Types: non-hygroscopic, surface moisture only (verified 2026-07-29)'],
      verifiedAt: '2026-07-29',
    } },
  'ABS': { id: 'ABS', tier: 'commodity', crystalline: false, hygroscopic: 'low',
    drying: { tempC: 80, hours: [2, 4], targetMoisturePct: null },
    meltC: { min: 220, max: 260, degradeAbove: 260 }, moldC: { min: 40, max: 80 }, shrinkagePct: [0.4, 0.7],
    commonDefects: ['silver_streak', 'weld_line'],
    notes: 'ABS: degrades above 260°C (turns yellow/brown). Moisture or degradation → splay/silver. Beyond 9-type: gloss variation from mold temp, weld line visibility.',
    source: 'verified', confidence: 'verified',
    mechanism: {
      moistureMode: 'none',
      polymerizationClass: 'addition',
      notes: 'Hygroscopic (needs drying, see drying spec) BUT no hydrolysis — C-C backbone has no hydrolyzable bonds. Wet-molding damage is cosmetic (splay/bubbles) only; the resin itself recovers with re-drying. Never tell the user a wet ABS lot is chemically damaged.',
      sourceRefs: ['M.Holland EI Thermoplastic Drying — ABS hygroscopic; Toray TOYOLAC — drying <0.1%; no-hydrolysis = C-C backbone [Common Practice] (verified 2026-07-29)'],
      verifiedAt: '2026-07-29',
    } },
  'SAN': { id: 'SAN', tier: 'commodity', crystalline: false, hygroscopic: 'low',
    drying: { tempC: 80, hours: [2, 4], targetMoisturePct: null },
    meltC: { min: 200, max: 260 }, moldC: { min: 40, max: 80 },
    commonDefects: ['silver_streak'],
    notes: 'SAN: transparent, similar to ABS but more brittle. Moisture → splay.',
    source: 'experience', confidence: 'estimated' },
  'ASA': { id: 'ASA', tier: 'commodity', crystalline: false, hygroscopic: 'low',
    drying: { tempC: 80, hours: [2, 4], targetMoisturePct: null },
    meltC: { min: 220, max: 260 }, moldC: { min: 50, max: 80 },
    commonDefects: ['silver_streak', 'weld_line'],
    notes: 'ASA: outdoor UV stability better than ABS, similar processing.',
    source: 'experience', confidence: 'estimated' },
  'PMMA(아크릴)': { id: 'PMMA', tier: 'engineering', crystalline: false, hygroscopic: 'moderate',
    drying: { tempC: 80, hours: [3, 4], targetMoisturePct: null },
    meltC: { min: 220, max: 260 }, moldC: { min: 60, max: 90 }, shrinkagePct: [0.3, 0.6],
    commonDefects: ['silver_streak'],
    notes: 'PMMA(acrylic): transparent. Optical clarity needs careful drying & clean processing. Moisture → silver streak. Beyond 9-type: crazing, bubbles, haze. Dehumidifying dryer up to 98°C, 2-3h. Mold below 60°C risks surface stress on optical faces.',
    source: 'experience', confidence: 'estimated' },
  'PVC': { id: 'PVC', tier: 'commodity', crystalline: false, hygroscopic: 'none',
    drying: null, meltC: { min: 160, max: 200, degradeAbove: 210 }, moldC: { min: 20, max: 50 },
    commonDefects: ['burn_mark'],
    notes: 'PVC: narrow processing window, degrades above 210°C releasing corrosive HCl gas, requires specialized equipment. Beyond 9-type: discoloration from overheating.',
    source: 'experience', confidence: 'estimated' },
  // ── 블렌드 ──
  'PC/ABS': { id: 'PC/ABS', tier: 'blend', crystalline: false, hygroscopic: 'moderate',
    drying: { tempC: 105, hours: [3, 4], targetMoisturePct: 0.02 },
    meltC: { min: 240, max: 280, degradeAbove: 280 }, moldC: { min: 70, max: 100 }, shrinkagePct: [0.5, 0.7],
    commonDefects: ['silver_streak'],
    notes: 'PC/ABS: amorphous blend. Drying is critical, processing window narrower than either component alone. Moisture → splay. Beyond 9-type: delamination, color streaks. Dry-air 100-110°C; residual moisture max 0.02%.',
    source: 'verified', confidence: 'verified',
    mechanism: {
      moistureMode: 'hydrolysis',
      notes: 'PC fraction governs moisture behavior — same 0.02% max moisture as neat PC. Wet-molded lots are degraded even if appearance is acceptable.',
      sourceRefs: ['Covestro Bayblend T65 XF TDS — max moisture 0.02%, drying 95-110°C 4h (verified 2026-07-29)'],
      verifiedAt: '2026-07-29',
    } },
  'PC/PBT': { id: 'PC/PBT', tier: 'blend', crystalline: false, hygroscopic: 'moderate',
    drying: { tempC: 120, hours: [4, 4], targetMoisturePct: null },
    meltC: { min: 250, max: 280 }, moldC: { min: 60, max: 90 },
    commonDefects: ['sink_mark', 'warpage'],
    notes: 'PC/PBT: chemical resistance + impact, needs compromise processing. PBT crystallization can cause surface issues.',
    source: 'experience', confidence: 'estimated' },
  'PA/ABS': { id: 'PA/ABS', tier: 'blend', crystalline: false, hygroscopic: 'moderate',
    drying: { tempC: 80, hours: [4, 4], targetMoisturePct: null },
    meltC: { min: 240, max: 270 }, moldC: { min: 60, max: 80 },
    commonDefects: ['silver_streak'],
    notes: 'PA/ABS: two-phase blend, impact-modified PA. PA phase is hygroscopic → drying critical.',
    source: 'experience', confidence: 'estimated' },
  'PA/PP': { id: 'PA/PP', tier: 'blend', crystalline: true, hygroscopic: 'moderate',
    drying: { tempC: 80, hours: [4, 4], targetMoisturePct: null },
    meltC: { min: 230, max: 260 }, moldC: { min: 60, max: 80 },
    commonDefects: ['warpage'],
    notes: 'PA/PP: blend with compatibilizer. Potential delamination if processing is incorrect.',
    source: 'experience', confidence: 'estimated' },
  'PPE/PA': { id: 'PPE/PA', tier: 'blend', crystalline: false, hygroscopic: 'moderate',
    drying: { tempC: 100, hours: [4, 4], targetMoisturePct: null },
    meltC: { min: 270, max: 300 }, moldC: { min: 80, max: 100 },
    commonDefects: ['weld_line', 'warpage'],
    notes: 'PPE/PA blend: combines PPE heat resistance and PA chemical resistance.',
    source: 'experience', confidence: 'estimated' },
  'PBT/ABS': { id: 'PBT/ABS', tier: 'blend', crystalline: false, hygroscopic: 'moderate',
    drying: { tempC: 120, hours: [3, 3], targetMoisturePct: null },
    meltC: { min: 240, max: 270 }, moldC: { min: 60, max: 80 },
    commonDefects: ['sink_mark', 'weld_line'],
    notes: 'PBT/ABS: good surface quality, chemical resistance. Process at lower end to avoid ABS degradation.',
    source: 'experience', confidence: 'estimated' },
  // ── 엘라스토머 ──
  'TPU': { id: 'TPU', tier: 'elastomer', crystalline: false, hygroscopic: 'moderate',
    drying: { tempC: 90, hours: [2, 4], targetMoisturePct: null },
    meltC: { min: 180, max: 230 }, moldC: { min: 30, max: 50 },
    commonDefects: ['silver_streak'],
    notes: 'TPU: thermoplastic elastomer. Gentle processing, low shear, moisture sensitive (bubbles). Beyond 9-type: stringing, surface defects. Melt varies with hardness.',
    source: 'experience', confidence: 'estimated' },
  'TPE': { id: 'TPE', tier: 'elastomer', crystalline: false, hygroscopic: 'low',
    drying: null, meltC: { min: 180, max: 220 }, moldC: { min: 20, max: 50 },
    commonDefects: [],
    notes: 'TPE (general): low injection speed and pressure, gentle processing. Check grade TDS for drying.',
    source: 'experience', confidence: 'estimated' },
  'TPC': { id: 'TPC', tier: 'elastomer', crystalline: true, hygroscopic: 'moderate',
    drying: { tempC: 100, hours: [4, 4], targetMoisturePct: null },
    meltC: { min: 220, max: 250 }, moldC: { min: 30, max: 60 },
    commonDefects: [],
    notes: 'TPC: thermoplastic copolyester elastomer, good oil/chemical resistance.',
    source: 'experience', confidence: 'estimated' },
  'TPEE': { id: 'TPEE', tier: 'elastomer', crystalline: true, hygroscopic: 'moderate',
    drying: { tempC: 100, hours: [4, 4], targetMoisturePct: null },
    meltC: { min: 210, max: 240 }, moldC: { min: 30, max: 60 },
    commonDefects: [],
    notes: 'TPEE: thermoplastic polyester elastomer, good flex fatigue resistance.',
    source: 'experience', confidence: 'estimated' },
  'TPO': { id: 'TPO', tier: 'elastomer', crystalline: false, hygroscopic: 'none',
    drying: null, meltC: { min: 180, max: 230 }, moldC: { min: 20, max: 50 },
    commonDefects: ['warpage', 'sink_mark'],
    notes: 'TPO: thermoplastic olefin, automotive bumper/trim, good impact at low temp.',
    source: 'experience', confidence: 'estimated' },
};

// 구조화 KB에 있으면 spec 반환, 없으면 null(route는 기존 resinKnowledge로 폴백)
export function getResinSpec(resinType: string): ResinSpec | null {
  if (!resinType) return null;
  if (RESIN_KB[resinType]) return RESIN_KB[resinType];
  const partial = Object.keys(RESIN_KB).find(k => resinType.startsWith(k));
  return partial ? RESIN_KB[partial] : null;
}

// ── 수치 대조 (입력 셋팅값 vs KB 권장범위) ──
// 철학 A: 코드는 객관적 앵커만 제공(가이드레일). 최종 판단은 모델이 맥락 종합.
export type CheckStatus = 'ok' | 'low' | 'high' | 'degrade';
export interface SettingCheck {
  label: string;
  value: number;
  unit: string;
  rangeText: string;
  status: CheckStatus;
}

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

  const nozzle = toNum(s.nozzleTemp);
  if (nozzle !== null) {
    const { min, max, degradeAbove } = spec.meltC;
    let status: CheckStatus = nozzle < min ? 'low' : nozzle > max ? 'high' : 'ok';
    if (degradeAbove !== undefined && nozzle >= degradeAbove) status = 'degrade';
    const range = `${min}-${max}℃${degradeAbove !== undefined ? `, ${degradeAbove}℃+ 열분해` : ''}`;
    out.push({ label: '노즐 온도', value: nozzle, unit: '℃', rangeText: range, status });
  }

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

  // ─── 수지무관 관계식 앵커(가이드레일 v2) — 각 입력 존재 시에만, 보수적 임계. 압력은 route에서 MPa 환산됨. ───
  // 1) 보압/사출압 비율
  const fillP = toNum(a.actualPeakPressure) ?? toNum(s.injPressure1);
  const holdP = toNum(s.holdPressure);
  if (fillP !== null && fillP > 0 && holdP !== null) {
    const ratio = holdP / fillP;
    const status: CheckStatus = ratio < 0.30 ? 'low' : ratio > 0.85 ? 'high' : 'ok';
    out.push({ label: '보압/사출압 비', value: Math.round(ratio * 100), unit: '%', rangeText: '50-75% 통상', status });
  }

  // 2) 쿠션
  const cushion = toNum(a.actualCushion) ?? toNum(s.cushion);
  if (cushion !== null) {
    const metering = toNum(s.metering);
    let status: CheckStatus = 'ok';
    // <2mm = 기계 최소 클리어런스(~1.5mm) 근접 → 스크류 바닥·보압 전달 불안정(싱크·치수변동·샷간편차).
    // 0 이하(완전 바닥)도 이 조건에 포함되어 기존 동작을 흡수.
    if (cushion < 2) status = 'low';
    else if (metering !== null && metering > 0 && cushion > 0.3 * metering) status = 'high';
    out.push({ label: '쿠션', value: cushion, unit: 'mm', rangeText: '2-8mm 통상·<2mm 바닥 위험', status });
  }

  // 3) 피크 사출압 vs 기계 최대
  const peakP = toNum(a.actualPeakPressure);
  const maxInjP = toNum(a.maxInjPressure);
  if (peakP !== null && maxInjP !== null && maxInjP > 0) {
    const status: CheckStatus = peakP >= 0.90 * maxInjP ? 'high' : 'ok';
    out.push({ label: '피크압/기계최대', value: Math.round((peakP / maxInjP) * 100), unit: '%', rangeText: '<90% 권장', status });
  }

  // 4) 형체력 여유
  const clamp = toNum(s.clampForce);
  const maxClamp = toNum(a.maxClampForce);
  if (clamp !== null && maxClamp !== null && maxClamp > 0 && clamp >= 0.90 * maxClamp) {
    out.push({ label: '형체력/기계최대', value: Math.round((clamp / maxClamp) * 100), unit: '%', rangeText: '<90% 권장', status: 'high' });
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
  const hasFlag = checks.some(c => c.status !== 'ok');
  const flagNote = hasFlag
    ? '\n※ 위 ⚠ 항목은 가공윈도우 이탈이다. 외관·치수 불량의 직접 원인일 수 있으니 원인 후보에서 우선 검토하라.'
    : '';
  return `## 가공윈도우 사전 대조 (KB 기준, 참고용)
${lines}${flagNote}
※ 일반 가공윈도우 기준이다. 등급·충전재·벽두께에 따라 적정값이 달라질 수 있어 절대 기준이 아니다. 최종 판단은 전체 맥락으로 하라.`;
}

const MOISTURE_MODE_LABEL: Record<NonNullable<ResinMechanism['moistureMode']>, string> = {
  hydrolysis: 'hydrolysis (chain scission — properties do NOT recover after re-drying)',
  plasticization: 'plasticization (properties recover after re-drying)',
  both: 'both hydrolysis and plasticization',
  none: 'none (no hydrolysis — any moisture effect is cosmetic/surface only; polymer is not degraded)',
};

// mechanism KB(Phase 1에서 문헌 검증 후 채움) → 프롬프트 주입용 텍스트.
// 검증된 필드가 있는 수지만 텍스트를 반환 — mechanism 미채움(현재 52종 전부)이면 빈 문자열(0토큰).
// sourceRefs·verifiedAt은 개발자 메타데이터라 프롬프트에 절대 포함하지 않는다(defect-kb와 동일 규율).
export function formatMechanism(spec: ResinSpec): string {
  const m = spec.mechanism;
  if (!m) return '';

  // 모순 감지: addition(부가중합)인데 hydrolysis(가수분해)는 기전적으로 성립하지 않는다 —
  // 가수분해는 축중합(condensation) 계열의 특징(에스터·아미드 결합이 물로 역가수분해). 데이터 오류 가능성.
  if (m.polymerizationClass === 'addition' && (m.moistureMode === 'hydrolysis' || m.moistureMode === 'both')) {
    console.warn(
      `[resin-kb] ${spec.id}: polymerizationClass='addition'인데 moistureMode='${m.moistureMode}' — ` +
      `가수분해는 축중합(condensation) 계열 특성이라 모순 가능성. mechanism 데이터를 확인하라.`
    );
  }

  const lines: string[] = [];
  if (m.moistureMode) lines.push(`- Moisture mode: ${MOISTURE_MODE_LABEL[m.moistureMode]}`);
  if (m.crystallizationRate) lines.push(`- Crystallization rate: ${m.crystallizationRate}`);
  if (m.viscositySensitivity) lines.push(`- Viscosity sensitivity: ${m.viscositySensitivity}`);
  if (m.residenceSensitivity) lines.push(`- Residence time sensitivity: ${m.residenceSensitivity}`);
  if (m.polymerizationClass) lines.push(`- Polymerization class: ${m.polymerizationClass}`);
  if (m.residualMonomerRisk) lines.push(`- Residual monomer risk: ${m.residualMonomerRisk.monomer} — ${m.residualMonomerRisk.consequence}`);
  if (m.mwdSensitivity) lines.push(`- MWD sensitivity: ${m.mwdSensitivity}`);
  if (m.lotVariationNotes) lines.push(`- Lot variation: ${m.lotVariationNotes}`);
  if (m.notes) lines.push(`- Notes: ${m.notes}`);

  if (lines.length === 0) return '';

  return `[Resin mechanism — ${spec.id}]
${lines.join('\n')}`;
}
