import { NextRequest, NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';

const ENV_PATH = path.join(process.cwd(), '.env.local');

function readEnvFile(): Record<string, string> {
  try {
    const content = fs.readFileSync(ENV_PATH, 'utf-8');
    const result: Record<string, string> = {};
    for (const line of content.split('\n')) {
      const match = line.match(/^([^=]+)=(.*)$/);
      if (match) result[match[1].trim()] = match[2].trim();
    }
    return result;
  } catch {
    return {};
  }
}

function writeEnvFile(vars: Record<string, string>) {
  const content = Object.entries(vars)
    .map(([k, v]) => `${k}=${v}`)
    .join('\n') + '\n';
  fs.writeFileSync(ENV_PATH, content, 'utf-8');
}

// GET: return current API key status
export async function GET() {
  const vars = readEnvFile();
  const key = vars['ANTHROPIC_API_KEY'] || '';
  const isSet = key.length > 0 && key !== '여기에_본인_API키_입력';
  return NextResponse.json({
    isSet,
    // Return masked key for display
    maskedKey: isSet ? key.slice(0, 10) + '...' + key.slice(-4) : '',
  });
}

// POST: save API key to .env.local
export async function POST(request: NextRequest) {
  try {
    const { apiKey } = await request.json();
    if (!apiKey || typeof apiKey !== 'string') {
      return NextResponse.json({ error: 'API 키가 없습니다.' }, { status: 400 });
    }
    const vars = readEnvFile();
    vars['ANTHROPIC_API_KEY'] = apiKey.trim();
    writeEnvFile(vars);
    return NextResponse.json({ ok: true });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : '저장 실패' },
      { status: 500 }
    );
  }
}
