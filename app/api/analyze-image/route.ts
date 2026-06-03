import Anthropic from '@anthropic-ai/sdk';
import { NextRequest, NextResponse } from 'next/server';
import { downscaleBase64 } from '@/lib/downscale';
import { tryMock } from '@/lib/mock';

function getApiKey(): string {
  return process.env.ANTHROPIC_API_KEY || '';
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const mock = tryMock(body, 'analyze'); if (mock) return mock;
    const { image } = body;

    if (!image) {
      return NextResponse.json({ error: '이미지가 없습니다.' }, { status: 400 });
    }

    // TODO: rate-limit 구현 (과금/크레딧 보호)
    const apiKey = getApiKey();
    if (!apiKey) return NextResponse.json({ error: '서버 환경변수 ANTHROPIC_API_KEY 미설정' }, { status: 401 });

    const scaled = await downscaleBase64(image.data, image.mediaType);

    const client = new Anthropic({ apiKey });
    const response = await client.messages.create({
      model: 'claude-sonnet-4-6',
      max_tokens: 512,
      messages: [
        {
          role: 'user',
          content: [
            {
              type: 'image',
              source: {
                type: 'base64',
                media_type: scaled.mediaType as 'image/jpeg' | 'image/png' | 'image/gif' | 'image/webp',
                data: scaled.data,
              },
            },
            {
              type: 'text',
              text: `이 사진이 사출 성형 제품의 불량 사진인지 판별하고, 불량 유형을 분류하세요.

판별 기준:
1. 사출 성형 제품이 식별되고 불량 형상이 명확히 보이면 → 아래 9종 중 하나로 분류
2. 사출 성형 제품이 식별되지만 불량 형상이 없거나 정상 외관이면 → No_Defect_Detected
3. 단색 이미지·흐린 사진·과노출·사출과 무관한 사진(음식/자연/문서 등)·극저해상도 → Image_Unreadable

다음 JSON 형식으로만 응답하세요 (마크다운 없이):
{
  "defect_type": {"ko": "한국어명", "en": "English name"},
  "confidence": 숫자(0-100),
  "visual_description": "외관 특징 설명 (한국어 1-2문장)"
}

가능한 불량 유형 (en 값):
- Short Shot (미성형)
- Flash (플래시)
- Sink Mark (싱크마크)
- Weld Line (웰드라인)
- Burn Mark (버닝/가스마크)
- Silver Streak (은줄)
- Warpage (휨/변형)
- Crack (크랙)
- Jetting (젯팅)
- No_Defect_Detected (이상없음): confidence는 반드시 30 이하
- Image_Unreadable (판독불가): confidence는 반드시 10 이하`,
            },
          ],
        },
      ],
    });

    const textBlock = response.content.find((b) => b.type === 'text');
    if (!textBlock || textBlock.type !== 'text') {
      return NextResponse.json({ error: '이미지 분석 실패' }, { status: 500 });
    }

    let jsonText = textBlock.text.trim()
      .replace(/^```json\s*/i, '').replace(/\s*```$/, '')
      .replace(/^```\s*/i, '').replace(/\s*```$/, '');

    try {
      const result = JSON.parse(jsonText);
      return NextResponse.json(result);
    } catch {
      return NextResponse.json({ error: '이미지 분석 결과를 파싱할 수 없습니다. 다시 시도해주세요.' }, { status: 422 });
    }
  } catch (error) {
    console.error('Analyze image API error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : '이미지 분석 중 오류가 발생했습니다.' },
      { status: 500 }
    );
  }
}
