// 영문 콘텐츠 축 B(/en/notes) 글 데이터 단일 소스. 본문은 진우 확정본 — 문구를 다듬지 않는다.
// /en/about과 동일 원칙: 문법 교정·표현 개선·문장 병합 전부 금지.
export type NoteDiagramId = 'cross-section' | 'flow' | 'weld-flow' | 'weld-section';

export type NoteBlock =
  | { type: 'p'; text: string }
  | { type: 'h2'; text: string }
  | { type: 'diagram'; id: NoteDiagramId };

// lib/notesDiagramSvg.ts(node:fs 사용, 서버 전용)가 이 타입을 가져다 쓴다 — 반대 방향(이 파일이
// notesDiagramSvg.ts에서 import)이면 lib/notes.ts를 가져다 쓰는 클라이언트 컴포넌트(app/page.tsx)가
// 번들러 설정에 따라 fs를 함께 끌고 들어올 위험이 있어 여기서 정의한다(notes-list-thumbnail-v1).
export type NoteThumbId = 'splay-branch' | 'weld-strength';

export interface Note {
  slug: string;
  title: string;
  description: string;
  publishedAt: string; // ISO
  thumb?: NoteThumbId;  // 목록 카드용 축약 도식. 없으면 텍스트만 렌더
  body: NoteBlock[];
}

const p = (text: string): NoteBlock => ({ type: 'p', text });
const h2 = (text: string): NoteBlock => ({ type: 'h2', text });
const diagram = (id: NoteDiagramId): NoteBlock => ({ type: 'diagram', id });

export const NOTES: Note[] = [
  {
    slug: 'weld-line-appearance-vs-strength',
    title: "A weld line that looks better isn't stronger",
    description: 'More heat is the standard fix for a weld line. On glass-filled grades it changes how the line looks without changing what the part can carry.',
    publishedAt: '2026-08-03',
    thumb: 'weld-strength',
    body: [
      p('The second thing Mold Doctor kept getting almost right was the weld line.'),
      p("Ask about one and the answer comes back the same way nearly every time. Raise the melt temperature. Raise the mold temperature. Fill faster. It isn't wrong, and on plenty of parts it works."),
      p('What bothered me was the case where all of that had already been done, the line was barely visible, and the part still broke at it.'),
      h2('Where the standard answer comes from'),
      p('Two flow fronts meet. Each arrives with a skin that has already started to cool. For the joint to hold, polymer chains have to diffuse back and forth across the boundary and knit the two sides together.'),
      p('Hotter melt means more of that diffusion. It is a real mechanism, and for unfilled resins it is the main thing you have to work with. On PP and HDPE the literature points to melt temperature as the dominant factor in how strong the weld ends up.'),
      p('There is a visible version of the same effect. The small V-notch left at the surface where the fronts meet gets shallower as melt temperature rises. I have seen it quoted going from around 7 μm to 3 μm for a 10°C increase.'),
      p('That is a measurement of the notch. It is not a measurement of strength. Holding onto that distinction is most of what this note is about.'),
      diagram('weld-section'),
      h2('Where it splits'),
      p('Put glass in the resin and the mechanism changes underneath the same-looking defect.'),
      p('Fibers do not cross the weld plane. They travel with the flow front, and when two fronts meet head-on the fibers end up lying parallel to the plane on both sides of it. What is left at the interface is resin meeting resin, with no fiber carrying load across the joint.'),
      p('Heat does not move fibers. It still helps the resin diffuse, which shows up as better elongation and a cleaner-looking line, but the ultimate tensile strength at the weld barely responds.'),
      p('On PA6 with 30% glass, the setting that moves weld tensile strength is packing pressure. Melt temperature moves elongation. Those are two different results from the same test, and it is easy to read one and think you got the other.'),
      h2('The number'),
      p('From a 2024 published test on PA6-GF30: the base material came in at 110 MPa, the weld line at 65 to 73 MPa. Retention somewhere around 60 to 66 percent.'),
      p('You will also see 50 to 80 percent loss quoted for glass-filled weld lines. That is a wider claim than the measurements I could verify actually support. Retention shifts with the resin, the glass content, and the angle the fronts meet at. Treat any single figure as a starting estimate rather than a spec, and measure your own part if the number matters.'),
      p('What holds is the direction. A weld line in a glass-filled part carries meaningfully less than the base material, and no combination of process settings closes that gap.'),
      h2('What to actually do'),
      p('If the resin has no glass in it, the standard answer stands. Melt temperature first, then mold temperature.'),
      p('If it does have glass, look at packing pressure before you reach for heat. That is the setting with a measured effect on weld strength in filled grades, and it is the one most likely to be sitting lower than it needs to be.'),
      p('And if the part has to carry load right there, the answer is not in the settings at all. A weld line forms where two flow fronts meet, and where they meet is decided by gate position. Moving the gate moves the weld to somewhere it does not matter. That is a mold change, slower and more expensive than turning a dial, which is exactly why it keeps getting postponed in favor of another round of condition tweaks.'),
      diagram('weld-flow'),
      h2('The part that does not change'),
      p('Nothing above restores base material properties. Conditions narrow the gap. They do not close it.'),
      p('The failure mode I care about most is the quiet one. The line stops being visible, the appearance complaint goes away, everyone moves on, and the load capacity is exactly where it was. If the part is structural, a weld line you cannot see is still a weld line.'),
      h2('What went into the app'),
      p('Mold Doctor branches on glass content for weld lines now. Unfilled goes to melt temperature. Filled puts packing pressure ahead of heat, and when the description mentions breakage or a strength requirement it moves gate position to the top and states plainly that conditions alone will not reach base material.'),
      p('It also stopped treating a cleaner-looking line as a solved problem.'),
      p('Mold Doctor takes a photo of the defect and your process settings and estimates likely causes and what to adjust. The logic above is part of it.'),
    ],
  },
  {
    slug: 'splay-or-fiber-readout',
    title: 'If the drying data is clean, it might not be splay',
    description: "Moisture is the usual answer for splay on glass-filled nylon. When the dryer checks out, the next answer isn't a longer drying cycle.",
    publishedAt: '2026-07-28',
    thumb: 'splay-branch',
    body: [
      p('The longest-running wrong answer I dealt with while building Mold Doctor was a white streak on glass-filled PA66.'),
      p("The AI called moisture every time. It called moisture even when the drying conditions entered were fine. Temperature, time, moisture target, all within the recommended range for PA66, and the answer didn't move."),
      p("It wasn't a bad answer. PA66 picks up moisture readily and a large share of splay on it really is moisture. If you had to bet once, you'd bet moisture."),
      p("The problem was what happened next. The fact that drying had already been done changed nothing about the response. From the user's side, that reads as being told to redo something they just did."),
      h2('What to rule out first'),
      p('Before asking what caused a white mark, ask what kind of mark it is.'),
      p("If it wipes off, or fades when you rub it, it's sitting on the surface. Resin volatiles and additives condensing on the mold face and transferring to the part. Gas condensing where venting is poor. Release agent carrying over."),
      p("None of that is a process condition problem. You can move temperatures and pressures all day and it won't clear, because the deposit is on the mold, not in the part."),
      p("If it doesn't wipe off, it's structural. Everything below is about that case."),
      diagram('flow'),
      h2('Then what splits'),
      p("Marks that don't wipe off still come in more than one kind."),
      p('Moisture splay is a gas trace. It fans out from the gate along the flow direction. Silvery, with some shine to it.'),
      p("Fiber read-out is glass showing through near the surface. Whiter, and rough. Run a finger over it and it isn't smooth. It stands out most on black parts."),
      p("The reliable split isn't visual, though. If the resin has no glass in it, read-out isn't on the table at all and you stay on the splay branch. If the drying data meets the material's recommendation, moisture drops down the list."),
      p('Check those two first. Surface texture is what you look at after, not before.'),
      h2('Why it happens'),
      p('Glass and resin have different densities and they want to separate during fill.'),
      p('Normally the melt hits the cavity wall, forms a thin resin layer there, and the fibers end up behind it. What you see on the surface is resin.'),
      p("When the mold runs cold, that layer doesn't form properly. The melt freezes on contact and there's no time for resin to wrap the fibers, so the glass stays close to the surface where you can see it."),
      p('The wider the gap between melt and mold temperature, the worse it gets.'),
      diagram('cross-section'),
      h2('What to change'),
      p('Raise the mold temperature. Of the single adjustments available, it does the most here.'),
      p("I'm not going to put a number on it. Recommended mold temperature varies by grade and by part geometry, and glass-filled grades are usually listed separately from unfilled ones on the same datasheet. Check the sheet for the grade you're actually running."),
      p("The check is simple enough. Bring the mold temperature up, run it, see if the surface improves. If it does, you're pointed the right way. If nothing changes, it's something else."),
      p('Barrel temperature is worth looking at too. Glass-filled grades generally run hotter than unfilled, but past the degradation limit the problem just moves somewhere else. That limit is on the datasheet as well.'),
      h2("Don't reorder this"),
      p('If this reads as "white streak means raise the mold temperature," that\'s the wrong takeaway.'),
      p("The order holds. Check whether it wipes off. Check the drying data. If drying is short, it's a moisture problem and mold temperature won't touch it. Worse, you'll have moved on from the actual cause."),
      p('Glass only comes into it after drying checks out.'),
      h2('What went into the app'),
      p('Mold Doctor now switches the classification when three things line up at once. The resin is glass-filled. The drying conditions meet the recommendation. The mark doesn\'t wipe off.'),
      p('In that case it reports fiber read-out rather than moisture, and puts mold temperature first. Where drying is short, none of this applies and the original answer stands.'),
      p("It's less a different answer than the same answer with a condition attached. That's most of what the work looks like: finding where a reasonable answer stops being reasonable, and drawing the line there."),
      p('Mold Doctor takes a photo of the defect and your process settings and estimates likely causes and what to adjust. The logic above is part of it.'),
    ],
  },
];

export function getNoteBySlug(slug: string): Note | undefined {
  return NOTES.find(n => n.slug === slug);
}

/**
 * 최신 글 1건(publishedAt 내림차순 첫 항목) — 홈 노트 블록(internal-links-to-notes-v1)용.
 * NOTES는 항상 1건 이상 하드코딩되어 있으므로 undefined 분기 없이 반환한다 —
 * 호출부에서 `latestNote &&` 같은 조건부 렌더를 만들지 않기 위함(그게 이 mandate가 고치려는 버그다).
 */
export function getLatestNote(): Note {
  return [...NOTES].sort((a, b) => b.publishedAt.localeCompare(a.publishedAt))[0];
}
