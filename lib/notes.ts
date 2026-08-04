// 영문 콘텐츠 축 B(/en/notes) 글 데이터 단일 소스. 본문은 진우 확정본 — 문구를 다듬지 않는다.
// /en/about과 동일 원칙: 문법 교정·표현 개선·문장 병합 전부 금지.
export type NoteDiagramId = 'cross-section' | 'flow' | 'weld-flow' | 'weld-section' | 'clamp-calc' | 'clamp-flow';

export type NoteBlock =
  | { type: 'p'; text: string }
  | { type: 'h2'; text: string }
  | { type: 'diagram'; id: NoteDiagramId };

// lib/notesDiagramSvg.ts(node:fs 사용, 서버 전용)가 이 타입을 가져다 쓴다 — 반대 방향(이 파일이
// notesDiagramSvg.ts에서 import)이면 lib/notes.ts를 가져다 쓰는 클라이언트 컴포넌트(app/page.tsx)가
// 번들러 설정에 따라 fs를 함께 끌고 들어올 위험이 있어 여기서 정의한다(notes-list-thumbnail-v1).
export type NoteThumbId = 'splay-branch' | 'weld-strength' | 'clamp-window';

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
    slug: 'clamp-tonnage-calculation',
    title: 'The clamp tonnage formula was off by a factor of 100',
    description: 'How to calculate the clamp force an injection molded part needs, the unit error that inflates the answer 100 times, and why more tonnage than the calculation asks for burns parts.',
    publishedAt: '2026-08-04',
    thumb: 'clamp-window',
    body: [
      p('The first two things I wrote about here were judgment calls. The AI picked a defensible answer and stopped one condition short of the right one.'),
      p('This one was not a judgment call. It was arithmetic.'),
      p('Mold Doctor carried a formula for how much clamp force a part needs, and the formula was wrong. A job that needed 40 tons came back needing 4,082. No press like that exists for a part that size. Anyone who ran the number would have known something was broken, which is the only reason it was harmless.'),
      p('I found it by checking units, before opening a single reference.'),
      h2('The formula'),
      p('Clamp force has to beat the force trying to push the mold open. That force is the pressure inside the cavity acting across the projected area of the part, which is the shadow the part casts on the parting plane. Runners and sprue count, because they are pressurized too.'),
      p('Cavity pressure is not the pressure on the machine gauge. The gauge reads at the injection unit, upstream of the nozzle, the runner and the gate. What arrives in the cavity is a fraction of it.'),
      p('In metric the calculation is F (tonf) = A (cm²) × P (kgf/cm²) ÷ 1000.'),
      p('In US shops the same thing is usually carried as a rule of thumb instead: projected area in square inches times a tonnage factor of 2 to 4 tons per square inch, starting around 3. It is the same physics with the pressure term already folded into the factor.'),
      diagram('clamp-calc'),
      h2('Where the 100 came from'),
      p('The version in the knowledge base divided by 9.8.'),
      p('9.807 is a real constant. It converts kilonewtons to tonnes-force, and if the product in front of it is already in kilonewtons then dividing by it is exactly right. The product in front of it here was in kilogram-force, which is not the same unit and is not off by 9.8.'),
      p('Square centimetres times kilograms-force per square centimetre, divided by 9.8, comes out about 100 times too high. Square centimetres times megapascals, divided by 9.8, comes out 10 times too high. There is no combination of the units people actually use where it is correct.'),
      p('That is what makes this class of error durable. It does not look like a guess. It has a constant in it that anyone can look up and confirm is real, sitting in the one position where it does not belong.'),
      p('The check that catches it needs no sources. Put a part you know into it and see whether the answer is a machine that exists.'),
      h2('The pressure you probably do not have'),
      p('The formula needs cavity pressure, and most shops are not measuring cavity pressure. A formula you cannot put a number into is not usable, and the version I inherited stopped at the formula.'),
      p('The working default is 300 to 500 kgf/cm². The US tonnage factors land in the same place: 2 to 4 tons per square inch works out to roughly 280 to 560 kgf/cm². Two conventions from different places, describing the same band.'),
      p('That agreement is worth something, but it is still a default. Thin walls, long flow lengths and stiff melts push it up. If the part is marginal against your press, the number to use is the one from a cavity pressure sensor, not this one.'),
      h2('More is not safer'),
      p('If 40 tons is enough, 200 tons should be safer. It is not, and this is the part that surprised me most.'),
      p('Vents are shallow on purpose, tens of micrometres, deep enough to let air out and too shallow to let melt through. Clamp harder than the mold needs and you close them. The air that was supposed to leave stays in, gets compressed by the incoming melt, and heats up enough to scorch the resin at the end of fill. RJG puts it plainly: apply more tonnage than needed and the trapped air causes a burn.'),
      p('Plastics Technology documents the more expensive version. A mold that needed around 100 tons, run at 400, came back with a cracked cavity block. Crushed vents and premature parting line wear come with it.'),
      p('So tonnage has a window, not a floor. The calculation gives you the bottom of it. The top is set by the mold.'),
      h2('And flash is not always tonnage'),
      p('The reason any of this matters is flash, and flash gets blamed on tonnage more often than tonnage deserves.'),
      p('Where the flash sits tells you which axis you are on. One repeating location is the mold: parting face wear, debris, ejector pin clearance. Clamping harder will not close a worn face, and it will wear it faster.'),
      p('Flash around the whole perimeter is the machine or the pressure axis. Run the calculation. If the press is genuinely undersized for the projected area, that is the answer and no setting fixes it.'),
      p('If the press already clears the calculation and you still have flash, the cavity is being overfilled rather than the mold being pushed open. Late V/P transfer, hold pressure sitting close to injection pressure. The test costs one shot: drop the hold pressure and see whether the flash drops with it. If it does, raising clamp force was never the lever.'),
      diagram('clamp-flow'),
      h2('What went into the app'),
      p('The formula is corrected, with the cavity pressure default and the US tonnage factor stated next to it so the calculation can actually be completed.'),
      p('The over-tonnage paradox is written in as a caution on the clamp force recommendation itself, rather than sitting in a separate note about burns. Raise clamp force and the app tells you in the same breath that too much of it causes the defect one row down.'),
      p('There is also a regression test now. It feeds a projected area and a machine tonnage and fails if the answer comes back in the thousands. The old error cannot come back quietly.'),
      p('The habit that came out of this one is smaller than the fix. Before checking whether a number matches the literature, check whether its units can produce that number at all. This one was caught on dimensions alone, and it was the fastest of the six errors I found to confirm.'),
      p('Mold Doctor takes a photo of the defect and your process settings and estimates likely causes and what to adjust. The logic above is part of it.'),
    ],
  },
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
