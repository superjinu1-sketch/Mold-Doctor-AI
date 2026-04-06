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
    const { image } = await request.json();
    if (!image) return NextResponse.json({ error: '이미지가 없습니다.' }, { status: 400 });

    const client = new Anthropic({ apiKey: getApiKey() });
    const response = await client.messages.create({
      model: 'claude-sonnet-4-6',
      max_tokens: 1024,
      messages: [{
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
            text: `이 사진은 사출 성형기의 셋팅값 화면입니다. 보이는 수치를 최대한 읽어서 JSON으로 반환하세요.

값이 보이지 않거나 확인 불가한 항목은 빈 문자열("")로 두세요.

반드시 아래 JSON 형식만 반환하세요 (마크다운 없이):
{
  "nozzleTemp": "",
  "zone1Temp": "",
  "zone2Temp": "",
  "zone3Temp": "",
  "zone4Temp": "",
  "moldTempFixed": "",
  "moldTempMoving": "",
  "injPressure1": "",
  "holdPressure": "",
  "injSpeed1": "",
  "injSpeed2": "",
  "holdTime": "",
  "coolTime": "",
  "injTime": "",
  "metering": "",
  "cushion": "",
  "backPressure": "",
  "screwRpm": "",
  "clampForce": ""
}

각 항목 설명:
- nozzleTemp: 노즐 온도 (℃)
- zone1~4Temp: 실린더 1~4존 온도 (℃)
- moldTempFixed: 고정측 금형온도 (℃)
- moldTempMoving: 가동측 금형온도 (℃)
- injPressure1: 1차 사출압력 (MPa 또는 bar)
- holdPressure: 보압 (MPa 또는 bar)
- injSpeed1: 1차 사출속도 (% 또는 mm/s)
- injSpeed2: 2차 사출속도
- holdTime: 보압 시간 (sec)
- coolTime: 냉각 시간 (sec)
- injTime: 사출 시간 (sec)
- metering: 계량 위치 (mm)
- cushion: 쿠션 (mm)
- backPressure: 배압 (MPa)
- screwRpm: 스크류 회전수 (rpm)
- clampForce: 형체력 (ton)`,
          },
        ],
      }],
    });

    const textBlock = response.content.find((b) => b.type === 'text');
    if (!textBlock || textBlock.type !== 'text') {
      return NextResponse.json({ error: '분석 실패' }, { status: 500 });
    }

    let jsonText = textBlock.text.trim()
      .replace(/^```json\s*/i, '').replace(/\s*```$/, '')
      .replace(/^```\s*/i, '').replace(/\s*```$/, '');

    const result = JSON.parse(jsonText);
    return NextResponse.json(result);
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : '셋팅값 추출 실패' },
      { status: 500 }
    );
  }
}
