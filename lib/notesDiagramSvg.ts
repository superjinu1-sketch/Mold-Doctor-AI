// public/notes/*.svg 원본을 빌드 타임에 읽어 상세/목록 페이지에 인라인 삽입하기 위한 헬퍼.
// <img src="...">로 넣으면 SVG 내부의 var(--ok) 등 CSS 커스텀 프로퍼티가 별도 문서 컨텍스트라
// 페이지 :root를 상속받지 못해 색이 사라진다 — 그래서 파일을 그대로 읽어 DOM에 인라인 주입한다.
// (서버 컴포넌트 전용 — Node fs 사용, 클라이언트 번들에 포함되지 않는다. NoteThumbId는 lib/notes.ts에서
// import — lib/notes.ts를 클라이언트 컴포넌트(app/page.tsx)가 가져다 쓰므로, 이 파일이 반대로
// lib/notes.ts를 참조해 fs를 그쪽으로 끌고 들어가지 않게 방향을 고정했다.)
import fs from 'node:fs';
import path from 'node:path';
import type { NoteThumbId, NoteDiagramId } from './notes';

const FILES: Record<NoteDiagramId, string> = {
  'cross-section': 'splay-fiber-cross-section.svg',
  flow: 'splay-fiber-flow.svg',
  'weld-flow': 'weld-line-flow.svg',
  'weld-section': 'weld-line-cross-section.svg',
  'clamp-calc': 'clamp-tonnage-calc.svg',
  'clamp-flow': 'clamp-tonnage-flow.svg',
  'fr-paths': 'fr-paths.svg',
  'fr-ppa-grades': 'fr-ppa-grades.svg',
  'fr-barrel': 'fr-barrel.svg',
  'fr-levers': 'fr-levers.svg',
  'fiber-float-fountain': 'fiber-float-fountain.svg',
  'fiber-float-resins': 'fiber-float-resins.svg',
  'fiber-float-section': 'fiber-float-section.svg',
  'nmt-pores': 'nmt-pores.svg',
  'nmt-families': 'nmt-families.svg',
  'nmt-frame': 'nmt-frame.svg',
  'nmt-app-map': 'nmt-app-map.svg',
};

export function readNoteDiagramSvg(id: NoteDiagramId): string {
  const filePath = path.join(process.cwd(), 'public', 'notes', FILES[id]);
  return fs.readFileSync(filePath, 'utf-8');
}

const THUMB_FILES: Record<NoteThumbId, string> = {
  'splay-branch': 'thumb-splay-branch.svg',
  'weld-strength': 'thumb-weld-strength.svg',
  'clamp-window': 'thumb-clamp-window.svg',
  'fr-corrosion': 'thumb-fr-corrosion.svg',
  'fiber-float': 'thumb-fiber-float.svg',
  'nmt-bond': 'thumb-nmt-bond.svg',
  'nmt-frame': 'thumb-nmt-frame.svg',
};

export function readNoteThumbSvg(id: NoteThumbId): string {
  const filePath = path.join(process.cwd(), 'public', 'notes', THUMB_FILES[id]);
  return fs.readFileSync(filePath, 'utf-8');
}
