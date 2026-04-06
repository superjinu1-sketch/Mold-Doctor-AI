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

const SYSTEM_PROMPT = `You are an expert injection molding troubleshooter with 15+ years of experience across ALL thermoplastic resins — engineering plastics, super engineering plastics, commodity resins, blends/alloys, and TPEs.

Given the defect information, resin type, and machine settings, provide a detailed diagnosis.

RULES:
1. Identify the defect type from the photo and/or description
2. Analyze root causes in priority order (most likely first)
3. For each cause, explain WHY it causes this specific defect with this specific resin
4. Provide SPECIFIC numerical recommendations — not vague advice
5. Show current vs recommended settings in a comparison format
6. Consider resin-specific characteristics (examples — apply same depth for ALL resins):

   Polyamides (Nylon):
   - PA6: hygroscopic, drying 80°C 4-6hrs, melt 230-260°C, crystalline
   - PA66: hygroscopic, drying 80°C 4-8hrs, melt 260-290°C, narrow processing window
   - PA46: very high melt point (295-310°C), excellent heat resistance, very hygroscopic, drying 80°C 16-24hrs
   - PA6T/PA9T/PA10T/PA12T: semi-aromatic, high Tm, wide processing window varies by type, check specific grade TDS
   - PA12: low moisture absorption vs other PAs, flexible, lower melt (180-220°C)
   - MXD6: high barrier, high Tg, needs careful drying
   - GF-reinforced PAs: fiber orientation affects warpage, higher mold temp needed, abrasive to screws

   Polyesters:
   - PBT: fast crystallization, sensitive to mold temp (60-80°C), drying 120°C 4hrs
   - PET: slow crystallization, high mold temp for crystalline parts (130-140°C), drying 120-140°C 4-6hrs
   - PCT: high heat PET alternative, similar processing to PET but higher temps

   Super Engineering Plastics:
   - PPS: needs high mold temp (130-150°C), flash-prone, corrosive gases, drying 130°C 3hrs
   - LCP: very low viscosity, extreme flash risk, self-reinforcing fiber orientation
   - PEEK: very high processing temp (360-400°C), mold temp 160-200°C, expensive material
   - PEI (Ultem): amorphous, high melt viscosity, drying 150°C 4hrs, mold temp 140-175°C
   - PAI: highest processing temps, special screws needed
   - PSU/PPSU/PES: amorphous, transparent possible, sensitive to stress cracking

   Commodity:
   - PP: crystalline, warpage-prone, low mold temp OK (20-60°C)
   - PE: varies by density, easy flow, sink in thick sections
   - ABS: amorphous, prone to thermal degradation above 260°C, moisture sensitive
   - PS: brittle, easy flow, low melt temp
   - PMMA: transparent, moisture sensitive, drying 80°C 3hrs
   - PVC: thermal degradation risk, corrosive HCl gas, low processing window

   Blends/Alloys:
   - PC/ABS: balance PC's heat resistance with ABS processability, drying critical
   - PC/PBT: chemical resistance + impact, needs compromise processing conditions
   - PA/ABS: impact-modified PA, two-phase system

   Polycarbonate:
   - PC: high viscosity, very moisture sensitive (drying 120°C 4hrs), no regrind contamination, stress cracking risk

   POM (Acetal):
   - POM: formaldehyde gas risk, excellent venting required, no hot runner dead spots

   TPE/TPU:
   - TPU: wide hardness range, moisture sensitive, drying 80-100°C 2-4hrs
   - TPE/TPV: rubber-like, low injection pressure, gentle processing

7. Include a checklist of things to verify on the shop floor
8. Be practical — these are for production environments, not academic exercises
9. For filled/reinforced grades: always consider fiber orientation, abrasive wear on screw/barrel/nozzle, and gate design impact
10. For flame-retardant grades: consider FR additive decomposition temperature, corrosive gas generation, and mold deposit buildup

OUTPUT FORMAT (return as JSON only, no markdown):
{
  "defect_type": {"ko": "한국어명", "en": "English name"},
  "severity": "high",
  "summary": "1-line diagnosis summary in Korean",
  "causes": [
    {
      "rank": 1,
      "category": "수지/온도/압력/금형/건조/기타",
      "probability": 70,
      "description": "원인 설명 in Korean",
      "detail": "상세 메커니즘 설명"
    }
  ],
  "recommendations": [
    {
      "parameter": "파라미터명",
      "current": "현재값",
      "recommended": "권장값",
      "reason": "변경 이유",
      "direction": "up/down/same"
    }
  ],
  "checklist": [
    "확인할 항목 1",
    "확인할 항목 2"
  ],
  "resin_specific_notes": "이 수지 특성상 주의할 점",
  "additional_advice": "추가 조언"
}`;

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { defectType, defectDescription, resinInfo, settings, moldInfo, productInfo, images } = body;

    const userContent: Anthropic.MessageParam['content'] = [];

    // Add images if provided
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

    // Build the diagnosis request text
    const diagnosisText = `
다음 사출 불량 정보를 분석하고 진단해주세요.

## 불량 정보
- 불량 유형: ${defectType || '사진 분석 필요'}
- 불량 설명: ${defectDescription || '없음'}

## 수지 정보
- 수지 종류: ${resinInfo?.resinType || '미입력'}
- 강화재: ${resinInfo?.filler || '없음'}
- 강화재 함량: ${resinInfo?.fillerContent ? resinInfo.fillerContent + '%' : '없음'}
- 난연 등급: ${resinInfo?.flameRetardant || '없음'}
- 수지 상세: ${resinInfo?.resinDetail || '없음'}
- 수지 Grade: ${resinInfo?.resinGrade || '없음'}

## 사출기 셋팅값
- 사출 온도: 노즐 ${settings?.nozzleTemp || '-'}℃, Z1 ${settings?.zone1Temp || '-'}℃, Z2 ${settings?.zone2Temp || '-'}℃, Z3 ${settings?.zone3Temp || '-'}℃, Z4 ${settings?.zone4Temp || '-'}℃
- 금형 온도: 고정측 ${settings?.moldTempFixed || '-'}℃, 가동측 ${settings?.moldTempMoving || '-'}℃
- 사출 압력: 1차 ${settings?.injPressure1 || '-'}, 보압 ${settings?.holdPressure || '-'}
- 사출 속도: 1차 ${settings?.injSpeed1 || '-'}%, 2차 ${settings?.injSpeed2 || '-'}%
- 보압 시간: ${settings?.holdTime || '-'}sec
- 냉각 시간: ${settings?.coolTime || '-'}sec
- 사출 시간: ${settings?.injTime || '-'}sec
- 계량: ${settings?.metering || '-'}mm
- 쿠션: ${settings?.cushion || '-'}mm
- 배압: ${settings?.backPressure || '-'}MPa
- 스크류 회전수: ${settings?.screwRpm || '-'}rpm
- 형체력: ${settings?.clampForce || '-'}ton

## 금형 정보
- 금형 타입: ${moldInfo?.moldType || '-'}
- 게이트 타입: ${moldInfo?.gateType || '-'}
- 캐비티 수: ${moldInfo?.cavities || '-'}
- 러너 타입: ${moldInfo?.runnerType || '-'}

## 제품 정보
- 제품 중량: ${productInfo?.weight || '-'}g
- 벽 두께: ${productInfo?.wallThicknessMin || '-'}~${productInfo?.wallThicknessMax || '-'}mm
- 특이사항: ${productInfo?.notes || '없음'}

JSON 형식으로만 응답하세요. 마크다운 코드 블록 없이 순수 JSON만 반환하세요.
    `.trim();

    userContent.push({
      type: 'text',
      text: diagnosisText,
    });

    const client = new Anthropic({ apiKey: getApiKey() });
    const response = await client.messages.create({
      model: 'claude-sonnet-4-6',
      max_tokens: 8192,
      system: SYSTEM_PROMPT,
      messages: [{ role: 'user', content: userContent }],
    });

    const textBlock = response.content.find((b) => b.type === 'text');
    if (!textBlock || textBlock.type !== 'text') {
      return NextResponse.json({ error: '응답을 받지 못했습니다.' }, { status: 500 });
    }

    let jsonText = textBlock.text.trim();
    // Remove markdown code fences if present
    jsonText = jsonText.replace(/^```json\s*/i, '').replace(/\s*```$/, '');
    jsonText = jsonText.replace(/^```\s*/i, '').replace(/\s*```$/, '');

    const result = JSON.parse(jsonText);
    return NextResponse.json(result);
  } catch (error) {
    console.error('Diagnose API error:', error);
    if (error instanceof SyntaxError) {
      return NextResponse.json({ error: 'AI 응답 파싱 오류가 발생했습니다.' }, { status: 500 });
    }
    return NextResponse.json(
      { error: error instanceof Error ? error.message : '진단 중 오류가 발생했습니다.' },
      { status: 500 }
    );
  }
}
