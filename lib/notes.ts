// 영문 콘텐츠 축 B(/en/notes) 글 데이터 단일 소스. 본문은 진우 확정본 — 문구를 다듬지 않는다.
// /en/about과 동일 원칙: 문법 교정·표현 개선·문장 병합 전부 금지.
export type NoteBlock =
  | { type: 'p'; text: string }
  | { type: 'h2'; text: string }
  | { type: 'diagram'; id: 'cross-section' | 'flow' };

export interface Note {
  slug: string;
  title: string;
  description: string;
  publishedAt: string; // ISO
  body: NoteBlock[];
}

const p = (text: string): NoteBlock => ({ type: 'p', text });
const h2 = (text: string): NoteBlock => ({ type: 'h2', text });
const diagram = (id: 'cross-section' | 'flow'): NoteBlock => ({ type: 'diagram', id });

export const NOTES: Note[] = [
  {
    slug: 'splay-or-fiber-readout',
    title: 'If the drying data is clean, it might not be splay',
    description: "Moisture is the usual answer for splay on glass-filled nylon. When the dryer checks out, the next answer isn't a longer drying cycle.",
    publishedAt: '2026-07-28',
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
