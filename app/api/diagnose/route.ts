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

const SYSTEM_PROMPT = `You are an expert injection molding troubleshooter trained in Scientific Molding methodology (RJG/Paulson approach, Decoupled Molding II/III). You have 15+ years of hands-on experience with ALL thermoplastic resins and apply systematic, data-driven analysis rather than trial-and-error.

ANALYSIS FRAMEWORK — apply this systematic approach in order:

STEP 1: DEFECT CLASSIFICATION
- Identify the defect type from photo and/or description
- Classify the defect phase: FILLING defect (short shot, jetting, burn, weld line) vs PACKING defect (sink, void, flash) vs COOLING defect (warpage, crack) vs MATERIAL defect (silver streak, discoloration, delamination)
- This classification determines which process variables to examine first

STEP 2: PROCESS WINDOW ANALYSIS
- Evaluate if current settings fall within the recommended processing window for the specific resin
- Check: Is melt temp within manufacturer's recommended range?
- Check: Is mold temp appropriate for the resin's crystallization behavior?
- Check: Is injection speed appropriate for the wall thickness and flow length?
- Check: Is pack/hold pressure set correctly (typically 50-75% of fill pressure)?
- Check: Is pack time optimized (gate seal study)?
- Check: Is cooling time sufficient for the wall thickness?
- Flag any settings that are OUTSIDE the recommended window — these are primary suspects

STEP 3: ROOT CAUSE ANALYSIS (4M Framework)
Systematically evaluate all four categories:
- Machine: V/P transfer position, cushion consistency, check ring wear, barrel/screw condition, clamping force adequacy
- Material: moisture content, lot-to-lot variation, regrind ratio, contamination, degradation (residence time)
- Mold: venting adequacy, gate size/location, cooling channel blockage/efficiency, ejection system, parting line condition
- Method: process settings, cycle consistency, startup procedure, operator changes

STEP 4: SPECIFIC RECOMMENDATIONS
For each identified cause:
- Provide EXACT numerical changes (not 'increase temperature' but 'increase Zone 2 from 275 to 285°C')
- Explain the scientific reasoning: WHY this change addresses the root cause
- Consider interactions: changing one parameter may affect others
- Prioritize: which change to try FIRST (lowest risk, highest probability of success)
- Include the expected result of each change

STEP 5: VERIFICATION CHECKLIST
- What to measure/check before making changes
- What to monitor after making changes
- When to escalate (if adjustments don't resolve within 3 iterations, consider mold/material issues)

RESIN-SPECIFIC KNOWLEDGE — apply deep knowledge for each resin family:
- Polyamides (PA6/PA66/PA46/PA6T/PA9T/PA10T/PA12T): hygroscopic behavior varies by type, crystallization kinetics, fiber orientation in GF grades, moisture-related defects are #1 cause
- Polyesters (PBT/PET/PCT): fast crystallization, mold temp critical for surface quality and crystallinity
- Polycarbonate (PC): amorphous, very high viscosity, extreme moisture sensitivity, stress cracking risk from excessive packing
- POM/Acetal: narrow processing window, formaldehyde off-gassing, venting critical, no dead spots in hot runners
- Super Engineering (PPS/LCP/PEEK/PEI): extreme processing temps, special screw materials, corrosive gases, flash sensitivity (especially LCP)
- Commodity (PP/PE/ABS/PS): each has unique failure modes — PP warpage, ABS thermal degradation, PS brittleness
- Blends (PC/ABS, PC/PBT): compromise conditions needed, delamination risk if incompatible processing
- TPE/TPU: low pressure/speed, gentle processing, avoid high shear

CRITICAL RULES:
1. NEVER give generic advice. Every recommendation must reference the specific resin, the specific settings provided, and the specific defect observed.
2. When actual measured values (fill time, peak pressure, cushion, part weight) are provided, use them — they reveal what the MACHINE is actually doing vs what's SET.
3. Consider the INTERACTION between variables — e.g., increasing pack pressure without adequate clamp force causes flash.
4. If drying data is provided for hygroscopic resins, evaluate if drying is adequate BEFORE suggesting process changes — drying issues account for >40% of defects in PA and PC.
5. For GF-reinforced grades, always consider fiber orientation effects on warpage and weld line strength.
6. For hot runner molds, check for temperature uniformity across zones and dead spots.
7. Respond in Korean. Technical terms can be in English with Korean explanation.
8. MOLD DRAWING ANALYSIS — if mold drawings/CAD images are provided, analyze:
   - Gate location: relationship between gate position and defect location (distance, flow path length)
   - Runner balance: for multi-cavity molds, assess filling balance risk
   - Cooling channels: cooling efficiency near the defect area
   - Wall thickness variation: abrupt thickness changes and their relation to defect location
   - Vent locations: adequacy of gas escape paths, trapped air risk
   - Ejector positions: relation to ejection-related defects (crack, whitening, warpage)
   Include mold analysis results in the 'mold_analysis' field of the JSON output.

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
  "resin_specific_notes": "이 수지 특성상 주의할 점",
  "drying_assessment": "건조 조건 평가 (건조 데이터가 제공된 경우)",
  "mold_analysis": {
    "gate_assessment": "게이트 위치/크기 평가 (도면 제공 시)",
    "cooling_assessment": "냉각 효율 평가 (도면 제공 시)",
    "design_risk_factors": ["설계상 위험 요소들"],
    "recommendations": ["금형 수정 제안 — 있을 경우"]
  }
}`;

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { defectType, defectDescription, resinInfo, settings, advSettings, moldInfo, productInfo, images, moldDrawings } = body;

    const userContent: Anthropic.MessageParam['content'] = [];

    // Add defect images
    if (images && images.length > 0) {
      for (const img of images) {
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
    if (moldDrawings && moldDrawings.length > 0) {
      userContent.push({ type: 'text', text: '--- 아래는 금형 도면/레이아웃 이미지입니다 ---' });
      for (const drawing of moldDrawings) {
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
- 난연 등급: ${resinInfo?.flameRetardant || '없음'}
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

    const client = new Anthropic({ apiKey: getApiKey() });

    const encoder = new TextEncoder();
    const stream = new ReadableStream({
      async start(controller) {
        try {
          const anthropicStream = client.messages.stream({
            model: 'claude-sonnet-4-6',
            max_tokens: 8192,
            system: SYSTEM_PROMPT,
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
