import { NextResponse } from 'next/server';
import { readFileSync, existsSync } from 'fs';
import { join } from 'path';

const FIXTURES = join(process.cwd(), 'tests', 'fixtures', 'responses');

/**
 * MOCK_AI=1이면 픽스처 JSON을 즉시 반환 (Claude 호출 0).
 * body에 __fixture 필드가 있으면 해당 픽스처, 없으면 defaultFixture.
 */
export function tryMock(body: Record<string, unknown>, defaultFixture = 'normal'): NextResponse | null {
  if (process.env.NODE_ENV === 'production') return null;  // prod에선 MOCK_AI 무시(실수 방지)
  if (process.env.MOCK_AI !== '1') return null;
  const name = String(body.__fixture ?? defaultFixture);
  const path = join(FIXTURES, `${name}.json`);
  if (!existsSync(path)) {
    return NextResponse.json({ error: `MOCK: fixture '${name}' not found` }, { status: 404 });
  }
  try {
    return NextResponse.json(JSON.parse(readFileSync(path, 'utf-8')));
  } catch {
    return NextResponse.json({ error: `MOCK: fixture '${name}' parse error` }, { status: 500 });
  }
}
