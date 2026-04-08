import Anthropic from '@anthropic-ai/sdk';
import { NextRequest, NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';

function getApiKey(): string {
  if (process.env.ANTHROPIC_API_KEY) return process.env.ANTHROPIC_API_KEY;
  try {
    const content = fs.readFileSync(path.join(process.cwd(), '.env.local'), 'utf-8');
    for (const line of content.split('\n')) {
      const match = line.match(/^ANTHROPIC_API_KEY=(.+)$/);
      if (match) return match[1].trim();
    }
  } catch { /* ignore */ }
  return '';
}

// Resin-specific knowledge — only the selected resin is injected into the prompt
const resinKnowledge: Record<string, string> = {
  'PA6': 'PA6: semi-crystalline, hygroscopic. Drying: 80°C 4-6hrs, target moisture <0.1%. Melt: 230-260°C. Mold: 60-90°C. Crystallization rate moderate. GF grades: higher mold temp 80-100°C, fiber orientation causes warpage. Common defects: silver streak(moisture #1), sink mark(crystallization shrinkage 1.5-2.2%), warpage(fiber orientation). Key: always check drying first.',
  'PA66': 'PA66: semi-crystalline, very hygroscopic. Drying: 80°C 4-8hrs, target moisture <0.08%. Melt: 260-290°C, narrow window, degrades above 300°C. Mold: 70-100°C. Shrinkage 1.2-2.0%. GF grades: mold temp 80-120°C. Common defects: silver streak(moisture #1 cause, >40% of all defects), burn mark(narrow processing window), warpage(GF orientation). Key: moisture is almost always the first suspect.',
  'PA46': 'PA46: very high Tm 295°C. Drying: 80°C 16-24hrs(extremely hygroscopic). Melt: 310-330°C. Mold: 120-150°C. Very fast crystallization. Narrow processing window. Common defects: silver streak(long drying needed), flash(high fluidity at process temp), thermal degradation. Key: drying time is 3-4x longer than PA66.',
  'PA6T': 'PA6T(PPA): semi-aromatic, Tm 310-325°C. Drying: 120°C 4-6hrs. Melt: 320-340°C. Mold: 130-150°C. High heat resistance. Common defects: flash(high fluidity), burn(high temp processing), short shot(fast solidification). Key: mold temp critical for surface quality.',
  'PA9T': 'PA9T: semi-aromatic, Tm 300-310°C. Drying: 120°C 4hrs, low moisture absorption vs other PAs. Melt: 310-330°C. Mold: 120-140°C. Excellent flow. Common defects: flash(very good flow), weld line weakness. Key: easier to process than PA6T, less moisture sensitive.',
  'PA10T': 'PA10T: semi-aromatic, Tm 310°C. Drying: 100°C 4hrs. Melt: 310-340°C. Mold: 120-150°C. Bio-based option. Similar processing to PA9T. Key: check specific grade TDS as properties vary significantly.',
  'PA12T': 'PA12T: semi-aromatic, Tm 300°C. Drying: 80-100°C 4hrs. Melt: 300-330°C. Mold: 110-140°C. Good dimensional stability. Key: lower moisture absorption than aliphatic PAs.',
  'PA12': 'PA12: semi-crystalline, low moisture absorption. Drying: 70-80°C 4hrs(less critical than PA6/66). Melt: 180-220°C. Mold: 40-70°C. Flexible, low shrinkage 0.5-1.5%. Common defects: sink mark, warpage(less than PA6/66). Key: most forgiving PA to process.',
  'PA610': 'PA610: semi-crystalline, moderate moisture absorption. Drying: 80°C 4-6hrs. Melt: 220-240°C. Mold: 60-90°C. Good balance of properties. Key: less hygroscopic than PA6/66, similar processing approach.',
  'PA612': 'PA612: semi-crystalline, low moisture absorption. Drying: 80°C 4hrs. Melt: 220-240°C. Mold: 60-90°C. Better dimensional stability than PA6. Key: low moisture absorption similar to PA12.',
  'PA1010': 'PA1010: bio-based, semi-crystalline. Drying: 80°C 4hrs. Melt: 200-220°C. Mold: 60-80°C. Low moisture absorption, excellent chemical resistance. Key: sustainable option, process similar to PA12.',
  'PA6/66': 'PA6/66 copolymer: semi-crystalline. Drying: 80°C 4-6hrs. Melt: 240-270°C. Mold: 60-90°C. Intermediate properties between PA6 and PA66. Key: broader processing window than PA66.',
  'MXD6': 'MXD6: semi-crystalline, high Tg, high barrier. Drying: 120°C 4-6hrs. Melt: 240-270°C. Mold: 100-140°C. Used in barrier applications. Key: higher mold temp needed for good crystallinity.',
  'PBT': 'PBT: semi-crystalline, fast crystallization. Drying: 120°C 4hrs, target moisture <0.03%. Melt: 230-270°C. Mold: 60-80°C(amorphous surface)/80-100°C(crystalline surface). Shrinkage 1.5-2.2%. Common defects: warpage(fast uneven crystallization), sink mark, flash(good fluidity). Key: mold temp dramatically affects surface quality and crystallinity.',
  'PET': 'PET: semi-crystalline, slow crystallization. Drying: 120-140°C 4-6hrs, target moisture <0.02%. Melt: 260-290°C. Mold: 130-140°C(crystalline)/20-30°C(amorphous/transparent). Shrinkage varies with crystallinity. Common defects: moisture defects, acetaldehyde generation(overheating). Key: mold temp controls crystalline vs amorphous state.',
  'PCT': 'PCT: semi-crystalline, higher heat than PBT/PET. Drying: 120°C 4hrs. Melt: 280-310°C. Mold: 100-130°C. Better heat resistance than PBT. Key: similar to PBT but higher processing temperatures.',
  'PEN': 'PEN: semi-crystalline, high barrier, high Tg. Drying: 120°C 4hrs. Melt: 270-290°C. Mold: 80-120°C. Key: higher performance than PET, used in specialty applications.',
  'PC': 'PC: amorphous, transparent possible. Drying: 120°C 3-4hrs, target moisture <0.02%. Melt: 280-320°C. Mold: 80-120°C. Very high viscosity. Zero shrinkage compensation from crystallization. Common defects: silver streak(moisture), stress cracking(overpacking), splay, yellowing(overheating). Key: never mix regrind from other resins, extreme moisture sensitivity, stress cracking from excessive pack pressure.',
  'POM(아세탈)': 'POM: semi-crystalline(acetal). Drying: optional but recommended 80°C 2hrs. Melt: 190-210°C, degrades above 220°C releasing formaldehyde. Mold: 80-100°C. Shrinkage 1.8-2.5%(high). Common defects: sink mark(high shrinkage), formaldehyde deposits(overheating), center-gated void. Key: excellent venting required(formaldehyde gas), no dead spots in hot runners, narrow processing window.',
  'PPE/PPO': 'PPE/PPO: amorphous, usually alloyed. Drying: 80-100°C 2-4hrs. Melt: 260-300°C. Mold: 80-100°C. Key: pure PPE rarely processed alone, usually as PPE/PS or m-PPE alloy.',
  'm-PPE': 'm-PPE(modified PPE): amorphous. Drying: 80°C 2-4hrs. Melt: 260-300°C. Mold: 80-100°C. Good hydrolytic stability. Key: better processability than pure PPE, similar to PC in handling.',
  'PPS': 'PPS: semi-crystalline, super engineering. Drying: 130°C 3hrs. Melt: 300-340°C. Mold: 130-150°C. Generates corrosive gases. Very flash-prone. Shrinkage 0.1-0.5%(with GF). Common defects: flash(#1 issue, very low viscosity at process temp), gas corrosion on mold surface, weld line weakness. Key: frequent mold cleaning needed(corrosive deposits), high mold temp essential for crystallization.',
  'LCP': 'LCP: liquid crystal polymer. Drying: 120°C 4hrs. Melt: 280-350°C(grade dependent). Mold: 80-120°C. Self-reinforcing fiber structure. Extremely low viscosity. Shrinkage 0.1-0.5% but highly anisotropic. Common defects: flash(extreme #1, can flash into 5-micron gaps), weld line(near zero strength), warpage(anisotropic). Key: gate design and fill pattern are everything, flash is almost unavoidable without optimized tooling.',
  'PEEK': 'PEEK: semi-crystalline, highest performance. Drying: 150°C 3-4hrs. Melt: 360-400°C. Mold: 160-200°C. Very expensive material. Common defects: poor surface(insufficient mold temp), amorphous surface(mold too cold), degradation(above 400°C). Key: minimize purging waste(expensive resin), special high-temp screw/barrel needed.',
  'PEI(Ultem)': 'PEI(Ultem): amorphous, high performance. Drying: 150°C 4-6hrs. Melt: 340-370°C. Mold: 140-175°C. Transparent amber color. Very high melt viscosity. Common defects: short shot(high viscosity), stress cracking, moisture splay. Key: very high melt viscosity requires high injection pressure.',
  'PAI': 'PAI: highest performance thermoplastic. Drying: 120°C 16hrs minimum. Melt: 330-370°C. Mold: 200-230°C. Requires post-cure. Key: special equipment and processing expertise required.',
  'PI(폴리이미드)': 'PI: highest thermal performance. Processing varies by type. Key: usually requires specialized processing, consult TDS for each grade.',
  'PSU': 'PSU(Polysulfone): amorphous, transparent. Drying: 120°C 4hrs. Melt: 330-380°C. Mold: 80-120°C. Common defects: stress cracking, splay(moisture). Key: chemical resistance but sensitive to certain solvents.',
  'PPSU': 'PPSU: amorphous, highest PSU family. Drying: 150°C 4hrs. Melt: 340-380°C. Mold: 100-140°C. Key: sterilizable, medical applications, better hydrolytic stability than PSU.',
  'PES': 'PES: amorphous. Drying: 150°C 4hrs. Melt: 340-380°C. Mold: 100-140°C. Key: similar to PPSU, high temperature performance.',
  'PTFE': 'PTFE: not typically injection molded. Key: use compression sintering or RAM extrusion, not conventional IM.',
  'FEP': 'FEP: fluoropolymer, excellent chemical resistance. Melt: 300-380°C. Special equipment needed. Key: highly corrosive, requires specialized screws and barrels.',
  'PFA': 'PFA: fluoropolymer. Melt: 340-380°C. Similar to FEP but higher temperature. Key: extremely corrosive to standard equipment.',
  'ETFE': 'ETFE: fluoropolymer, better processability than PTFE/FEP. Melt: 280-330°C. Key: less corrosive than other fluoropolymers but still requires special equipment.',
  'PP': 'PP: semi-crystalline, commodity. Drying: usually not required. Melt: 200-250°C. Mold: 20-60°C. Shrinkage 1.5-2.5%(high, anisotropic with fiber). Common defects: warpage(#1 issue, uneven crystallization), sink mark(thick sections), flow marks. Key: warpage is the dominant issue, mold temp uniformity critical.',
  'PE(HDPE)': 'HDPE: semi-crystalline, commodity. Drying: not required. Melt: 200-250°C. Mold: 20-60°C. High shrinkage 1.5-3.0%. Common defects: warpage, sink mark. Key: similar to PP but lower stiffness.',
  'PE(LDPE)': 'LDPE: semi-crystalline, flexible. Drying: not required. Melt: 160-210°C. Mold: 20-50°C. Common defects: sink mark, warpage. Key: very flexible, low melting point.',
  'PE(LLDPE)': 'LLDPE: semi-crystalline. Drying: not required. Melt: 180-240°C. Mold: 20-60°C. Key: better impact than HDPE, used in film/flexible parts.',
  'PS': 'PS: amorphous, brittle. Drying: usually not required. Melt: 180-240°C. Mold: 20-50°C. Low shrinkage 0.3-0.6%. Common defects: cracking(brittle), flow lines, burn marks(poor venting). Key: easy to process but very brittle.',
  'ABS': 'ABS: amorphous. Drying: 80°C 2-4hrs. Melt: 210-250°C, degrades above 260°C. Mold: 40-80°C. Low shrinkage 0.4-0.7%. Common defects: splay/silver(moisture or degradation), gloss variation(mold temp), weld line visibility. Key: prone to thermal degradation at high temps, turn yellow/brown if overheated.',
  'SAN': 'SAN: amorphous, transparent. Drying: 80°C 2-4hrs. Melt: 200-260°C. Mold: 40-80°C. Key: similar to ABS but transparent, more brittle.',
  'ASA': 'ASA: amorphous, UV resistant. Drying: 80°C 2-4hrs. Melt: 220-260°C. Mold: 50-80°C. Key: outdoor UV stability better than ABS, similar processing.',
  'PMMA(아크릴)': 'PMMA: amorphous, transparent(acrylic). Drying: 80°C 3-4hrs. Melt: 220-260°C. Mold: 50-80°C. Common defects: silver streak(moisture), crazing, bubbles, haze. Key: optical clarity requires careful drying and clean processing.',
  'PVC': 'PVC: amorphous, thermal degradation risk. Drying: usually not required. Melt: 160-200°C, degrades above 210°C releasing HCl. Mold: 20-50°C. Common defects: discoloration(overheating), burn marks. Key: narrow processing window, corrosive HCl gas, requires specialized equipment.',
  'PC/ABS': 'PC/ABS: amorphous blend. Drying: 100-110°C 3-4hrs. Melt: 240-280°C. Mold: 60-90°C. Compromise between PC and ABS properties. Common defects: splay(moisture), delamination(incompatible processing), color streaks. Key: drying is critical, processing window narrower than either component alone.',
  'PC/PBT': 'PC/PBT: blend. Drying: 120°C 4hrs. Melt: 250-280°C. Mold: 60-90°C. Chemical resistance + impact. Key: needs compromise processing, PBT crystallization can cause surface issues.',
  'PA/ABS': 'PA/ABS: two-phase blend. Drying: 80°C 4hrs. Melt: 240-270°C. Mold: 60-80°C. Impact-modified PA. Key: PA phase is hygroscopic, drying critical.',
  'PA/PP': 'PA/PP: blend with compatibilizer. Drying: 80°C 4hrs. Melt: 230-260°C. Mold: 60-80°C. Key: potential delamination if processing is incorrect.',
  'PPE/PA': 'PPE/PA(Noryl GTX type): blend. Drying: 100°C 4hrs. Melt: 270-300°C. Mold: 80-100°C. Key: good combination of PPE heat resistance and PA chemical resistance.',
  'PBT/ABS': 'PBT/ABS: blend. Drying: 120°C 3hrs. Melt: 240-270°C. Mold: 60-80°C. Key: good surface quality, chemical resistance, process at lower end to avoid ABS degradation.',
  'TPU': 'TPU: thermoplastic elastomer. Drying: 80-100°C 2-4hrs. Melt: 180-230°C(varies with hardness). Mold: 30-50°C. Common defects: bubbles(moisture), stringing, surface defects. Key: gentle processing, low shear, moisture sensitive.',
  'TPE': 'TPE: thermoplastic elastomer(general). Drying: per grade TDS. Melt: 180-220°C. Mold: 20-50°C. Key: low injection speed and pressure, gentle processing.',
  'TPC': 'TPC: thermoplastic copolyester elastomer. Drying: 100°C 4hrs. Melt: 220-250°C. Mold: 30-60°C. Key: good oil/chemical resistance.',
  'TPA': 'TPA: thermoplastic polyamide elastomer. Drying: 80°C 4hrs. Melt: 200-240°C. Key: similar to TPU but PA-based, moisture sensitive.',
  'TPEE': 'TPEE: thermoplastic polyester elastomer. Drying: 100°C 4hrs. Melt: 210-240°C. Mold: 30-60°C. Key: good flex fatigue resistance.',
  'TPV': 'TPV: thermoplastic vulcanizate. Drying: not usually required. Melt: 180-220°C. Key: rubber-like, requires low shear processing.',
  'TPO': 'TPO: thermoplastic olefin. Drying: not required. Melt: 180-230°C. Mold: 20-50°C. Key: automotive bumper/trim applications, good impact at low temp.',
  'default': 'General thermoplastic. Check material TDS for specific processing conditions. Apply standard troubleshooting: verify drying, check melt temp vs recommended range, evaluate mold temp, review fill pattern.',
};

function getResinKnowledge(resinType: string): string {
  if (!resinType) return resinKnowledge['default'];
  // Direct match
  if (resinKnowledge[resinType]) return resinKnowledge[resinType];
  // Blend: combine both components (e.g. "PC/PBT")
  const blendMatch = resinType.match(/^([A-Za-z0-9()]+)\/([A-Za-z0-9()]+)$/);
  if (blendMatch) {
    const a = resinKnowledge[blendMatch[1]] || '';
    const b = resinKnowledge[blendMatch[2]] || '';
    if (a || b) return [a, b].filter(Boolean).join('\n');
  }
  // Partial match (e.g. "PA6 GF30%" → "PA6")
  const partialKey = Object.keys(resinKnowledge).find(k => resinType.startsWith(k));
  if (partialKey) return resinKnowledge[partialKey];
  return resinKnowledge['default'];
}

// TODO: Tier 2 subagent 구현
// - Agent A: 사진 정밀 분석 (불량 위치, 패턴, 심각도)
// - Agent B: 수지 특성 검증 (가공 윈도우 벗어남 여부)
// - Agent C: 유사 사례 검색 (knowledge DB + 사용자 기록)
// - Agent D: 금형 도면 분석 (게이트/냉각/벤트 평가)
// - Final Agent: 4개 결과 종합 → 최종 진단
// 트리거: tier === 'complex' && user.plan === 'pro'

interface ComplexityInput {
  defectDescription?: string;
  moldDrawings?: unknown[];
  images?: unknown[];
  advSettings?: Record<string, string>;
}

function classifyComplexity(input: ComplexityInput): 'simple' | 'complex' {
  let score = 0;

  if (input.defectDescription?.includes('간헐적') ||
      input.defectDescription?.includes('특정 캐비티') ||
      input.defectDescription?.includes('시간대') ||
      input.defectDescription?.includes('때만')) score += 3;

  if (input.defectDescription?.includes('조건 변경해도') ||
      input.defectDescription?.includes('해결 안') ||
      input.defectDescription?.includes('계속')) score += 3;

  if ((input.moldDrawings?.length ?? 0) > 0) score += 2;

  if ((input.images?.length ?? 0) >= 3) score += 1;

  if (input.advSettings?.hrManifoldTemp) score += 2;

  if (Number(input.advSettings?.regrindRatio ?? 0) > 0) score += 1;

  if (input.advSettings?.actualFillTime && input.advSettings?.injSpeed1) score += 1;

  return score >= 5 ? 'complex' : 'simple';
}

function buildSystemPrompt(resinType: string, tier: 'simple' | 'complex' = 'simple'): string {
  const resinNote = getResinKnowledge(resinType);
  return `You are an expert injection molding troubleshooter trained in Scientific Molding methodology (RJG/Paulson approach, Decoupled Molding II/III). You have 15+ years of hands-on experience and apply systematic, data-driven analysis rather than trial-and-error.

RESIN IN USE: ${resinType || 'Unknown'}
RESIN KNOWLEDGE:
${resinNote}

ANALYSIS FRAMEWORK — apply in order:

STEP 1: DEFECT CLASSIFICATION
- Identify defect type from photo and/or description
- Classify phase: FILLING (short shot, jetting, burn, weld line) / PACKING (sink, void, flash) / COOLING (warpage, crack) / MATERIAL (silver streak, discoloration, delamination)

STEP 2: PROCESS WINDOW ANALYSIS
- Is melt temp within the resin's recommended range?
- Is mold temp appropriate for this resin's crystallization behavior?
- Is injection speed appropriate for wall thickness and flow length?
- Is pack/hold pressure correct (typically 50-75% of fill pressure)?
- Is cooling time sufficient?
- Flag settings OUTSIDE the recommended window — these are primary suspects

STEP 3: ROOT CAUSE ANALYSIS (4M Framework)
- Machine: V/P transfer, cushion consistency, check ring wear, clamp force adequacy
- Material: moisture content, regrind ratio, contamination, degradation
- Mold: venting, gate size/location, cooling efficiency, ejection system
- Method: process settings, cycle consistency, startup procedure

STEP 4: SPECIFIC RECOMMENDATIONS
- EXACT numerical changes (e.g. 'increase Zone 2 from 275 to 285°C', not vague)
- Scientific reasoning for each change
- Prioritize: lowest risk, highest probability first
- Note parameter interactions

STEP 5: VERIFICATION CHECKLIST
- Before changes / after changes / escalation criteria

${tier === 'complex' ? `COMPLEX CASE INSTRUCTIONS (복합 원인 케이스):
이 케이스는 복합 원인 가능성이 높습니다.
단순 원인(건조, 온도)으로 결론 내리지 마세요.
간헐적 패턴, 특정 위치, 시간대 변화 등 숨은 단서를 분석하세요.
금형 구조적 원인과 소재 상호작용도 반드시 검토하세요.
최소 3개 이상의 가능한 원인을 제시하고 각각의 확률을 부여하세요.

` : ''}CRITICAL RULES:
1. Every recommendation must reference this specific resin, the settings provided, and the defect observed.
2. When actual measured values (fill time, peak pressure, cushion, part weight) are provided, use them.
3. Consider parameter interactions.
4. For hygroscopic resins, evaluate drying FIRST.
5. For GF-reinforced grades, consider fiber orientation effects.
6. For hot runner molds, check zone temperature uniformity and dead spots.
7. Respond in Korean. Technical terms may be in English with Korean explanation in parentheses.
8. MOLD DRAWING ANALYSIS — if mold drawings are provided, analyze: gate location vs defect, runner balance, cooling near defect area, wall thickness variation, vent locations, ejector positions. Include in 'mold_analysis' field.
9. FLAME RETARDANCY & THICKNESS — if a flame retardant grade and certification thickness are provided, evaluate whether the product's actual wall thickness matches the certified thickness. Thinner walls typically require V-0 at thinner certification (e.g., 0.4mm vs 0.8mm). Thicker walls may relax the flame retardant additive loading but can increase sink/void risk. Flag mismatches between certified thickness and actual wall thickness in resin_specific_notes.

OUTPUT LENGTH LIMITS — strictly enforce to prevent truncation:
- causes: max 3 items. description max 40 chars. scientific_reasoning max 60 chars. evidence max 40 chars.
- recommendations: max 5 items. reason max 50 chars. expected_result max 40 chars. risk max 40 chars. interaction_note max 40 chars.
- checklist each array: max 3 items, each max 40 chars.
- top5_actions: exactly 5. action max 50 chars. why max 40 chars.
- process_window_check notes: max 30 chars each.
- resin_specific_notes: max 80 chars.
- drying_assessment: max 60 chars.
- mold_analysis fields: max 60 chars each, design_risk_factors/recommendations max 3 items.
- summary: max 40 chars.
Be concise. Korean only where specified. No extra explanation outside JSON.

OUTPUT FORMAT (return as JSON only, no markdown):
{
  "defect_type": {"ko": "한국어명", "en": "English name"},
  "defect_phase": "filling/packing/cooling/material",
  "severity": "high/medium/low",
  "summary": "1-line Korean summary",
  "process_window_check": {
    "melt_temp": {"status": "ok/warning/critical", "note": ""},
    "mold_temp": {"status": "ok/warning/critical", "note": ""},
    "injection_speed": {"status": "ok/warning/critical", "note": ""},
    "pack_pressure": {"status": "ok/warning/critical", "note": ""},
    "drying": {"status": "ok/warning/critical", "note": ""}
  },
  "causes": [
    {
      "rank": 1,
      "category": "4M 카테고리 (Machine/Material/Mold/Method)",
      "probability": 70,
      "description": "원인 설명 in Korean",
      "scientific_reasoning": "과학적 메커니즘 상세 설명",
      "evidence": "제공된 데이터에서 이 원인을 뒷받침하는 근거"
    }
  ],
  "recommendations": [
    {
      "priority": 1,
      "parameter": "파라미터명",
      "current": "현재값",
      "recommended": "권장값",
      "reason": "변경 이유 (과학적 근거)",
      "expected_result": "이 변경 후 기대되는 결과",
      "risk": "이 변경의 잠재적 부작용",
      "interaction_note": "이 변경 시 함께 모니터링할 파라미터",
      "direction": "up/down/same"
    }
  ],
  "checklist": {
    "before_changes": ["변경 전 확인 항목"],
    "after_changes": ["변경 후 모니터링 항목"],
    "escalation": ["3회 조정 후에도 해결 안 될 경우 고려할 사항"]
  },
  "top5_actions": [
    {"step": 1, "action": "즉시 해야 할 가장 중요한 조치 (구체적 수치 포함)", "why": "이 조치가 최우선인 이유"},
    {"step": 2, "action": "두 번째 조치", "why": "이유"},
    {"step": 3, "action": "세 번째 조치", "why": "이유"},
    {"step": 4, "action": "네 번째 조치", "why": "이유"},
    {"step": 5, "action": "다섯 번째 조치", "why": "이유"}
  ],
  "resin_specific_notes": "이 수지 특성상 주의할 점",
  "drying_assessment": "건조 조건 평가 (건조 데이터가 제공된 경우)",
  "mold_analysis": {
    "gate_assessment": "게이트 위치/크기 평가 (도면 제공 시)",
    "cooling_assessment": "냉각 효율 평가 (도면 제공 시)",
    "design_risk_factors": ["설계상 위험 요소들"],
    "recommendations": ["금형 수정 제안 — 있을 경우"]
  }
}`;
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { defectType, defectDescription, resinInfo, settings, advSettings, moldInfo, productInfo, images, moldDrawings }: {
  defectType?: string; defectDescription?: string;
  resinInfo?: { resinType?: string; filler?: string; fillerContent?: string; flameRetardant?: string; flameRetardantThickness?: string; flameRetardantType?: string; resinDetail?: string; resinGrade?: string };
  settings?: Record<string, string>; advSettings?: Record<string, string>;
  moldInfo?: Record<string, string>; productInfo?: Record<string, string>;
  images?: { mediaType: string; data: string }[];
  moldDrawings?: { mediaType: string; data: string }[];
} = body;

    // Limit image arrays to prevent token overflow
    const safeImages = (images || []).slice(0, 5);
    const safeDrawings = (moldDrawings || []).slice(0, 3);

    // Classify complexity for 2-tier system
    const tier = classifyComplexity({
      defectDescription,
      moldDrawings: safeDrawings,
      images: safeImages,
      advSettings,
    });
    const maxTokens = tier === 'complex' ? 2500 : 1500;

    const userContent: Anthropic.MessageParam['content'] = [];

    // Add defect images
    if (safeImages.length > 0) {
      for (const img of safeImages) {
        userContent.push({
          type: 'image',
          source: {
            type: 'base64',
            media_type: img.mediaType as 'image/jpeg' | 'image/png' | 'image/gif' | 'image/webp',
            data: img.data,
          },
        });
      }
    }

    // Add mold drawings (images or PDFs)
    if (safeDrawings.length > 0) {
      userContent.push({ type: 'text', text: '--- 아래는 금형 도면/레이아웃 이미지입니다 ---' });
      for (const drawing of safeDrawings) {
        if (drawing.mediaType === 'application/pdf') {
          userContent.push({
            type: 'document',
            source: {
              type: 'base64',
              media_type: 'application/pdf',
              data: drawing.data,
            },
          } as Anthropic.Messages.DocumentBlockParam);
        } else {
          userContent.push({
            type: 'image',
            source: {
              type: 'base64',
              media_type: drawing.mediaType as 'image/jpeg' | 'image/png' | 'image/gif' | 'image/webp',
              data: drawing.data,
            },
          });
        }
      }
    }

    const s = settings || {};
    const a = advSettings || {};

    const diagnosisText = `
다음 사출 불량 정보를 Scientific Molding 방법론으로 체계적으로 분석해주세요.

## 불량 정보
- 불량 유형: ${defectType || '사진 분석 필요'}
- 불량 설명: ${defectDescription || '없음'}

## 수지 정보
- 수지 종류: ${resinInfo?.resinType || '미입력'}
- 강화재: ${resinInfo?.filler || '없음'}${resinInfo?.fillerContent ? ` ${resinInfo.fillerContent}%` : ''}
- 난연 등급: ${resinInfo?.flameRetardant || '없음'}${resinInfo?.flameRetardantThickness ? ` @ ${resinInfo.flameRetardantThickness}mm 인증 두께` : ''}
- 수지 상세: ${resinInfo?.resinDetail || '없음'}
- 수지 Grade: ${resinInfo?.resinGrade || '없음'}

## 사출기 기본 셋팅값
- 사출 온도: 노즐 ${s.nozzleTemp || '-'}℃, Z1 ${s.zone1Temp || '-'}℃, Z2 ${s.zone2Temp || '-'}℃, Z3 ${s.zone3Temp || '-'}℃, Z4 ${s.zone4Temp || '-'}℃
- 금형 온도: 고정측 ${s.moldTempFixed || '-'}℃, 가동측 ${s.moldTempMoving || '-'}℃
- 사출 압력: 1차 ${s.injPressure1 || '-'} MPa, 보압 ${s.holdPressure || '-'} MPa
- 사출 속도: 1차 ${s.injSpeed1 || '-'}%, 2차 ${s.injSpeed2 || '-'}%
- 보압 시간: ${s.holdTime || '-'}sec, 냉각 시간: ${s.coolTime || '-'}sec, 사출 시간: ${s.injTime || '-'}sec
- 계량: ${s.metering || '-'}mm, 쿠션(설정): ${s.cushion || '-'}mm
- 배압: ${s.backPressure || '-'} MPa, 스크류 회전수: ${s.screwRpm || '-'}rpm, 형체력: ${s.clampForce || '-'}ton

${(a.vpTransferPos || a.vpTransferPressure || a.preInjectDecompDist || a.postMeterDecompDist) ? `## V/P 전환 & 감압(석백)
- V/P 전환 위치: ${a.vpTransferPos || '-'}mm, V/P 전환 압력: ${a.vpTransferPressure || '-'} MPa
- 사출 전 감압 거리: ${a.preInjectDecompDist || '-'}mm, 속도: ${a.preInjectDecompSpeed || '-'}mm/s
- 계량 후 감압 거리: ${a.postMeterDecompDist || '-'}mm
` : ''}
${(a.actualFillTime || a.actualPeakPressure || a.actualCushion || a.actualCycleTime || a.actualPartWeight) ? `## 실측값 (모니터 측정값)
- 실제 충전 시간: ${a.actualFillTime || '-'}sec
- 실제 최대 사출압력(피크): ${a.actualPeakPressure || '-'} MPa
- 실제 쿠션량: ${a.actualCushion || '-'}mm
- 실제 사이클 타임: ${a.actualCycleTime || '-'}sec
- 제품 실측 중량: ${a.actualPartWeight || '-'}g
` : ''}
${(a.dryTemp || a.dryTime || a.dryerType !== '없음') ? `## 건조 조건
- 건조 온도: ${a.dryTemp || '-'}℃, 건조 시간: ${a.dryTime || '-'}hr
- 건조기 타입: ${a.dryerType || '-'}
- 수분율 측정값: ${a.moistureContent || '미측정'}%
` : ''}
${(moldInfo?.runnerType === '핫' && (a.hrManifoldTemp || a.hrNozzle1Temp)) ? `## 핫러너 설정
- 매니폴드: ${a.hrManifoldTemp || '-'}℃
- 노즐 1: ${a.hrNozzle1Temp || '-'}℃, 노즐 2: ${a.hrNozzle2Temp || '-'}℃, 노즐 3: ${a.hrNozzle3Temp || '-'}℃, 노즐 4: ${a.hrNozzle4Temp || '-'}℃
- 밸브게이트: ${a.valveGate || '없음'}
` : ''}
${(a.regrindRatio || a.colorType !== '없음') ? `## 재생재 & 컬러
- 재생재 혼합 비율: ${a.regrindRatio || '0'}%
- 컬러 타입: ${a.colorType || '없음'}${a.mbRatio ? `, 투입 비율: ${a.mbRatio}%` : ''}
` : ''}
${(a.machineModel || a.screwDiameter) ? `## 사출기 정보
- 제조사/모델: ${a.machineModel || '-'}
- 스크류 직경: ${a.screwDiameter || '-'}mm
- 최대 형체력: ${a.maxClampForce || '-'}ton, 최대 사출압력: ${a.maxInjPressure || '-'} MPa
` : ''}
## 금형 & 제품 정보
- 금형 타입: ${moldInfo?.moldType || '-'}, 게이트: ${moldInfo?.gateType || '-'}, 캐비티: ${moldInfo?.cavities || '-'}개, 러너: ${moldInfo?.runnerType || '-'}
- 제품 중량: ${productInfo?.weight || '-'}g, 벽 두께: ${productInfo?.wallThicknessMin || '-'}~${productInfo?.wallThicknessMax || '-'}mm
- 특이사항: ${productInfo?.notes || '없음'}

JSON 형식으로만 응답하세요. 마크다운 코드 블록 없이 순수 JSON만 반환하세요.
    `.trim();

    userContent.push({ type: 'text', text: diagnosisText });

    const apiKey = getApiKey();
    if (!apiKey) {
      return NextResponse.json({ error: 'API 키가 설정되지 않았습니다. Vercel 환경 변수 또는 .env.local 파일에 ANTHROPIC_API_KEY를 설정해주세요.' }, { status: 401 });
    }
    const client = new Anthropic({ apiKey });

    const encoder = new TextEncoder();
    const stream = new ReadableStream({
      async start(controller) {
        try {
          const anthropicStream = client.messages.stream({
            model: 'claude-sonnet-4-6',
            max_tokens: maxTokens,
            system: buildSystemPrompt(resinInfo?.resinType || '', tier),
            messages: [{ role: 'user', content: userContent }],
          });

          for await (const chunk of anthropicStream) {
            if (chunk.type === 'content_block_delta' && chunk.delta.type === 'text_delta') {
              controller.enqueue(encoder.encode(chunk.delta.text));
            }
          }
          controller.close();
        } catch (err) {
          controller.error(err);
        }
      },
    });

    return new Response(stream, {
      headers: {
        'Content-Type': 'text/plain; charset=utf-8',
        'Transfer-Encoding': 'chunked',
        'X-Content-Type-Options': 'nosniff',
        'X-Diagnosis-Tier': tier,
      },
    });
  } catch (error) {
    console.error('Diagnose API error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : '진단 중 오류가 발생했습니다.' },
      { status: 500 }
    );
  }
}
