// 이중언어 빌드 가드(field-notes-v2 Phase 2) — 모든 EN 노트 슬러그(lib/notes.ts NOTES)가
// lib/notesKo.ts NOTES_KO에도 있는지 검사. 백필 진행 중엔 누락을 경고만 하고 통과시킨다(exit 0).
// 백필 완료(10편 남음 → 0) 후에는 아래 process.exit(1) 분기를 활성화해 CI 하드 실패로 승격할 것
// (lint-banned.sh 관행과 동일하게 package.json "check:notes-ko" 스크립트로 그대로 재사용 가능).
// 실행: node scripts/check-notes-ko-coverage.mjs
import { NOTES } from '../lib/notes.ts';
import { NOTES_KO } from '../lib/notesKo.ts';

const koSlugs = new Set(NOTES_KO.map(n => n.slug));
const missing = NOTES.filter(n => !koSlugs.has(n.slug)).map(n => n.slug);

console.log(`notes-ko coverage: ${NOTES.length - missing.length}/${NOTES.length}`);

if (missing.length > 0) {
  console.log('미번역 슬러그(백필 대기):');
  for (const slug of missing) console.log('  -', slug);
  // 백필 완료 후 하드 실패로 승격: 아래 두 줄 주석 해제.
  // console.error(`\n❌ ${missing.length}건 미번역 — 백필 완료 전까지는 경고 단계`);
  // process.exit(1);
} else {
  console.log('전부 번역 완료.');
}
