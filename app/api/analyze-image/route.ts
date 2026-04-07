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

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { image } = body;

    if (!image) {
      return NextResponse.json({ error: '이미지가 없습니다.' }, { status: 400 });
    }

    const apiKey = getApiKey();
    if (!apiKey) return NextResponse.json({ error: 'API 키가 설정되지 않았습니다.' }, { status: 401 });
    const client = new Anthropic({ apiKey });
    const response = await client.messages.create({
      model: 'claude-sonnet-4-6',
      max_tokens: 1024,
      messages: [
        {
          role: 'user',
          content: [
            {
              type: 'image',
              source: {
                type: 'base64',
                media_type: image.mediaType as 'image/jpeg' | 'image/png' | 'image/gif' | 'image/webp',
                data: image.data,
              },
            },
            {
              type: 'text',
              text: `이 사진은 사출 성형 제품의 불량 사진입니다. 불량 유형을 판별하고, 외관 특징을 설명해주세요.

다음 JSON 형식으로만 응답하세요 (마크다운 없이):
{
  "defect_type": {"ko": "한국어 불량명", "en": "English defect name"},
  "confidence": 85,
  "visual_description": "외관 특징 설명 (한국어로 2-3문장)"
}

가능한 불량 유형:
- 미성형 (Short Shot)
- 플래시 (Flash)
- 싱크마크 (Sink Mark)
- 웰드라인 (Weld Line)
- 버닝/가스마크 (Burn Mark)
- 은줄 (Silver Streak)
- 변색 (Discoloration)
- 크랙 (Crack)
- 휨/변형 (Warpage)
- 기포 (Void/Bubble)
- 젯팅 (Jetting)
- 표면 거침 (Surface Roughness)
- 기타 (Other)`,
            },
          ],
        },
      ],
    });

    const textBlock = response.content.find((b) => b.type === 'text');
    if (!textBlock || textBlock.type !== 'text') {
      return NextResponse.json({ error: '이미지 분석 실패' }, { status: 500 });
    }

    let jsonText = textBlock.text.trim();
    jsonText = jsonText.replace(/^```json\s*/i, '').replace(/\s*```$/, '');
    jsonText = jsonText.replace(/^```\s*/i, '').replace(/\s*```$/, '');

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
