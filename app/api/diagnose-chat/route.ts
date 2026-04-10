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

export async function POST(req: NextRequest) {
  try {
    const { question, diagnosisResult, chatHistory = [], resinType, machineSettings } = await req.json();

    if (!question?.trim()) {
      return NextResponse.json({ error: '질문을 입력해주세요.' }, { status: 400 });
    }

    const apiKey = getApiKey();
    if (!apiKey) {
      return NextResponse.json({ error: 'API 키가 설정되지 않았습니다.' }, { status: 401 });
    }

    // 진단 결과에서 핵심 필드만 추출 (비용 최적화)
    const contextResult = diagnosisResult ? {
      defect_type: diagnosisResult.defect_type,
      severity: diagnosisResult.severity,
      summary: diagnosisResult.summary,
      causes: diagnosisResult.causes,
      recommendations: diagnosisResult.recommendations,
      resin_specific_notes: diagnosisResult.resin_specific_notes,
      raw_response: diagnosisResult.raw_response,
    } : null;

    const contextLines = [
      '당신은 사출 성형 불량 진단 전문가입니다. 이전 진단 결과를 바탕으로 사용자의 후속 질문에 답변합니다.',
      '',
      '사용자의 질문에 대해:',
      '1. 진단 결과와 관련된 질문이면 구체적으로 답변',
      '2. 추가 조건 변경이 필요하면 구체적 수치로 제안',
      '3. 진단과 무관한 질문이면 정중히 범위를 안내',
      '4. 한국어로 답변, 기술 용어는 영문 병기',
      '5. 답변은 간결하게 2~3문단 이내',
    ];

    if (resinType) contextLines.push(`\n수지 종류: ${resinType}`);
    if (machineSettings) contextLines.push(`사출기 설정: ${JSON.stringify(machineSettings)}`);
    if (contextResult) contextLines.push(`\n이전 진단 결과:\n${JSON.stringify(contextResult, null, 2)}`);

    const systemPrompt = contextLines.join('\n');

    // chatHistory 최근 5턴만 유지
    const recentHistory = chatHistory.slice(-10); // user+assistant 쌍 기준 5턴 = 10개

    const client = new Anthropic({ apiKey });
    const response = await client.messages.create({
      model: 'claude-sonnet-4-6',
      max_tokens: 500,
      system: systemPrompt,
      messages: [
        ...recentHistory.map((m: { role: string; content: string }) => ({
          role: m.role as 'user' | 'assistant',
          content: m.content,
        })),
        { role: 'user', content: question.trim() },
      ],
    });

    const answer = response.content[0].type === 'text' ? response.content[0].text : '';
    return NextResponse.json({ answer });
  } catch (error) {
    console.error('Chat API error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : '채팅 응답 중 오류가 발생했습니다.' },
      { status: 500 }
    );
  }
}
