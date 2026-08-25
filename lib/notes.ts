// 영문 콘텐츠 축 B(/en/notes) 글 데이터 단일 소스. 본문은 진우 확정본 — 문구를 다듬지 않는다.
// /en/about과 동일 원칙: 문법 교정·표현 개선·문장 병합 전부 금지.
export type NoteDiagramId = 'cross-section' | 'flow' | 'weld-flow' | 'weld-section' | 'clamp-calc' | 'clamp-flow' | 'fr-paths' | 'fr-ppa-grades' | 'fr-barrel' | 'fr-levers' | 'fiber-float-fountain' | 'fiber-float-resins' | 'fiber-float-section' | 'nmt-pores' | 'nmt-families' | 'nmt-frame' | 'nmt-app-map' | 'nmt-cte' | 'nmt-resin-map' | 'nmt-freeze-race' | 'nmt-defect-tree' | 'flake-tilt' | 'metallic-split' | 'shortshot-split' | 'gf-cross-section' | 'settings-profile' | 'plateout-wipe-branch';

export type NoteBlock =
  | { type: 'p'; text: string }
  | { type: 'h2'; text: string }
  | { type: 'diagram'; id: NoteDiagramId }
  | { type: 'image'; src: string; alt: string; caption?: string };

// lib/notesDiagramSvg.ts(node:fs 사용, 서버 전용)가 이 타입을 가져다 쓴다 — 반대 방향(이 파일이
// notesDiagramSvg.ts에서 import)이면 lib/notes.ts를 가져다 쓰는 클라이언트 컴포넌트(app/page.tsx)가
// 번들러 설정에 따라 fs를 함께 끌고 들어올 위험이 있어 여기서 정의한다(notes-list-thumbnail-v1).
export type NoteThumbId = 'splay-branch' | 'weld-strength' | 'clamp-window' | 'fr-corrosion' | 'fiber-float' | 'nmt-bond' | 'nmt-frame' | 'nmt-resin' | 'nmt-troubleshoot' | 'metallic-streak' | 'shortshot' | 'gf-warpage' | 'settings-sheet' | 'plateout-wipe';

export interface Note {
  slug: string;
  title: string;
  description: string;
  publishedAt: string; // ISO
  thumb?: NoteThumbId;  // 목록 카드용 축약 도식. 없으면 텍스트만 렌더
  thumbImage?: string;  // 목록 카드용 래스터 사진(있으면 렌더러가 thumb SVG보다 우선 사용)
  body: NoteBlock[];
}

const p = (text: string): NoteBlock => ({ type: 'p', text });
const h2 = (text: string): NoteBlock => ({ type: 'h2', text });
const diagram = (id: NoteDiagramId): NoteBlock => ({ type: 'diagram', id });
const image = (src: string, alt: string, caption?: string): NoteBlock => ({ type: 'image', src, alt, caption });

export const NOTES: Note[] = [
  {
    slug: 'plate-out-wipe-test',
    title: "A silver streak that wipes off was never in the plastic",
    description: "A white mark near the gate reads like a silver streak, so you dry the resin and back off the heat and the speed. Sometimes it was never in the plastic at all, it was sitting on the tool. Here is the test that tells the two apart before you burn a shift on the wrong window.",
    publishedAt: '2026-08-25',
    thumb: 'plateout-wipe',
    thumbImage: '/notes/plateout-wipe-thumb.jpg',
    body: [
      p("A hazy white mark near the gate was another one Mold Doctor kept getting almost right. Ask about one and the read comes back the way you'd expect. Silver streak. Dry the resin. Bring the melt down. Slow the fill. So that is what we did. The dryer ran longer, the barrel came down, the injection slowed, and a shift went by with the mark sitting in the same spot, the same size it started. That was the one that kept bothering me."),
      image('/notes/plateout-wipe-hero.jpg', "A white cloth wiping a hazy white plate-out film off a black glossy molded panel, the wiped half clean and the residue transferred to the cloth.", "A white plate-out film wiping off a black glossy part, the cloth carrying the residue. Illustrative."),
      p("That read isn't wrong. Moisture makes a silver streak. So does shear. So does too much heat in the barrel. When the mark is genuinely in the plastic, those fixes are the right ones, and they work. The only mistake is assuming the mark is in the plastic. Sometimes it never was. It was sitting on the tool the whole time."),
      h2("The wipe test"),
      p("The quick version takes a rag. Wipe the mark on the part. If the residue lifts and the surface underneath comes up clean, it was never molded in. You can check the tool the same way. Run a clean cloth across the steel at the gate and along the vents. If a film comes off on the rag, that film is what you have been printing onto every part."),
      p("The stronger tell is what happens after a full cleaning. Clean the mold, run it again, and if the mark is gone on the first shot and then creeps back over the course of the run, that is plate-out. Nothing truly in the plastic behaves that way. A weld line, a flow mark, a real silver streak is there from the first shot and does not wipe off the tool. Where the mark sits tells you the same thing. Plate-out collects at the gate, at the vents, in the last place to fill, or in one particular cavity. It does not trace the flow path across the part the way a flow line or a weld line does."),
      diagram('plateout-wipe-branch'),
      h2("What it actually is"),
      p("Plate-out is a deposit. The additives blended into the resin, the flame retardants, the lubricants and slip agents, the plasticizers, are lighter and more volatile than the polymer around them. Hold the melt hot, or let it sit in the barrel too long, and some of them boil off. They find the coolest surface around, which is the tool, and they condense on it. Every shot after that carries a little of the deposit back out on the part. Its close cousins reach the part a different way. Vent gas that cannot get out, because the vents are blocked or there were never enough of them, condenses at the gate or the last-fill area. And release agent oversprayed onto the steel transfers straight onto the part."),
      p("The move is to fix the source, not the process window. Confirm it first, with the wipe and the clean-then-return test. Then go after where it comes from. Clean the tool. Clear the vents, open them up, or add more where there are not enough. Bring the melt temperature and the residence time down so less boils off to begin with. If release agent is the culprit, cut it back. What you do not do is spend the shift chasing drying, temperature, and speed on a mark that was never in the plastic."),
      h2("Where this one goes wrong"),
      p("A few ways to get it wrong. Do not file a wipe-off residue as a weld line, a flow mark, or a silver streak and then chase drying, temperature, and speed forever, which is the whole trap running in reverse. Do not just keep wiping, either. Wiping clears the part in front of you, but if the source stays put the deposit builds right back up every run. Go easy on the cleaning itself, because over-aggressive polishing or scrubbing wears away the tool texture you are trying to keep. And do not swing the other way and call every white mark a deposit. A whitening that will not wipe off, sits on a glass-filled part, runs in a radial pattern, and shows up with drying you have already confirmed good is more likely fiber read-out. That is a different call, not plate-out."),
      p("So when the description says the mark wipes off, or that it clears and comes back over the run, Mold Doctor runs this reclassification first, before it chases the process window. Then it does the usual. It takes a photo of the defect along with your process settings, estimates the likely causes, and tells you what to adjust. And your shop's own history builds up as you log each run."),
    ],
  },
  {
    slug: 'before-you-trust-the-settings-sheet',
    title: "You diagnosed the melt. The number was never real.",
    description: "Every diagnosis assumes the settings sheet is true, but the sheet is filled in by hand. It lies in two ways before the diagnosis even starts: a back pressure that can only be the wrong unit, and a nozzle that reads colder than the barrel, which is a deliberate profile for some resins and a typo for others. The number has to be possible before it's worth diagnosing.",
    publishedAt: '2026-08-23',
    thumb: 'settings-sheet',
    body: [
      p("A defect comes in, and the first thing anyone reaches for is the settings sheet. Melt temperature, back pressure, the zone profile, the pack. You read the numbers, compare them to what the resin wants, and build a cause. Every troubleshooting guide works this way, and so does every AI: the sheet is the ground truth, and the diagnosis is only ever as good as the sheet."),
      p("When the sheet is right, that diagnosis is right. This isn't an argument against reading the numbers. It's a warning about the step just before, the moment the numbers land on the sheet. Somebody read them off a machine screen and wrote them down, or typed them into a form, or copied last week's sheet and changed a few. That step is where a real setting quietly becomes a wrong number, and a wrong number produces a confident, well-reasoned, completely useless answer."),
      p("So before you trust a value, ask a smaller question first: is this number even possible for what it claims to be? A sheet lies in two ways, and both are easy to catch once you look for them."),
      h2("The number that can't be real"),
      p("The first is units. A back pressure comes in that no screw could ever pull, a value that would cook the melt and stall recovery if it were real. It isn't real. It's the right setting read in the wrong unit: the machine shows one thing, the sheet claims another, and the two are a factor apart. Korea and Japan make this especially easy, because one floor can carry three unit systems at once, the old gauge, the newer controller, and a training sheet written somewhere else. The moment a back pressure looks impossible, the answer isn't that the operator ran it far too high. It's which unit that number is in, and you don't diagnose off it until you know."),
      h2("The profile that sits upside down"),
      p("The second is the profile. The nozzle reads far colder than the barrel, and the obvious call is that the melt is too cold and the barrel should come up. Sometimes that's exactly backwards, because a cool nozzle is a setting, not a symptom. Acetal is run with the nozzle held well down on purpose, since letting it get hot degrades the material. Nylon and rigid PVC are often run with the back of the barrel hotter than the front. On any of those, a nozzle sitting below the barrel is the process working as intended, and turning the barrel up to fix the cold melt walks you away from a part that was fine."),
      p("But the same reading wears two other faces. It's what you'd see if the zones were typed in backwards, the profile entered upside down, so the sheet says cold nozzle while the machine is set the other way. And it's what you'd see if the nozzle really had frozen off. The number alone can't separate those. What separates them is the resin. A material meant to run the nozzle hot has no business showing a cold one, and an LCP will freeze in the gate if you let the nozzle drop, so there the low reading is a real flag and not a profile choice. Read the number against what this resin actually wants, not against a generic rule that the nozzle is always the hottest thing on the barrel."),
      diagram('settings-profile'),
      h2("Neither reflex is safe"),
      p("Here's the part to hold onto, because it cuts both ways. Don't harden into the idea that an odd number is always a typo, because reverse profiles and cool nozzles are real and common, and you'll start correcting settings that were never wrong. And don't harden the other way into trusting whatever the sheet says, because the sheet is the least reliable thing in the room. The discipline is narrow and a little boring: when a value is physically strange, stop and check the input, the unit, and the actual machine before you let it drive anything. The failure mode here isn't a bad diagnosis. It's a clean diagnosis of a number that was never true, which is the most convincing kind of wrong there is."),
      h2("What went into the app"),
      p("Mold Doctor checks the sheet before it reads it, so a back pressure that can only be the wrong unit, or a profile that sits upside down for the resin, gets held up to verify instead of quietly becoming the cause. A careful answer built on a mistyped number is still wrong, and nobody in the room is more sure of it than the person who typed it."),
    ],
  },
  {
    slug: 'glass-filled-warpage-fiber-orientation',
    title: "You balanced the cooling. The glass-filled part still warps.",
    description: "A glass-filled part comes off bowed, so you balance the cooling and add pack, and nothing moves it. The warp isn't a heat story: the fibers lined up with the flow, so the part shrinks less along them and more across. The tell is that the warp follows the fill and not the cooling layout, which is also where the fix is.",
    publishedAt: '2026-08-22',
    thumbImage: '/notes/gf-warpage-thumb.jpg',
    body: [
      p("A flat part comes off the tool bowed, so you do the standard thing. You even out the cooling between the two halves of the mold. You bring the mold temperatures into balance. You add a little pack to hold the geometry, and you look at whether a rib would stiffen the axis that's moving. This is the warpage playbook. Every guide teaches it in that order, and every troubleshooting AI hands it back to you in the same order. You run the shots, you check the part, and it comes back with the same bow it had before."),
      image('/notes/gf-warpage-hero.jpg', "A warped glass-filled nylon housing cover resting on a surface plate, one side lifted off the granite.", "A glass-filled nylon cover lifting off a surface plate. Illustrative."),
      p("And it works. On an unfilled part that warped because one side of the tool ran hotter than the other, cooling balance is the fix, and the rest of that list is the fix. That warp is a heat story: uneven cooling leaves uneven shrink, so evening out the heat evens out the part. As far as that goes, the playbook is right."),
      p("So before you turn another knob, look at where this part is actually lifting. Set it on the surface plate and see which corners come off the granite. The lift doesn't line up with the hot side of the tool. It lines up with the way the plastic flowed in. Sight down the part from the gate and follow the fill: the warp runs with it, not with the cooling layout. That's the tell. When the warp axis follows the flow and the material is glass-filled, you're not looking at a cooling problem. You're looking at the glass."),
      h2("What the glass is doing"),
      p("As the melt fills, the fibers line up with the flow, most strongly in the skin where the shear is highest. A fiber doesn't draw in the way the plastic around it does; it holds its length. So along the flow, where the fibers point, the part barely shrinks. Across the flow, where nothing is holding it, the plastic shrinks the way it always wanted to. Now the part is shrinking by different amounts in two directions at once, and a flat panel can't do that and stay flat. It pulls itself into a bow, or into a twist. Which one you get depends on how the fibers lie across the part, but the driver is the same. The shape isn't coming from where you cooled it. It's coming from where the fibers ended up."),
      diagram('gf-cross-section'),
      h2("Why cooling can't reach it"),
      p("That's why the cooling work didn't land. You were correcting a heat gradient, and there wasn't one driving this. The shrink difference is built into the fiber layout, and cooling symmetry doesn't reach it. Packing harder doesn't reach it either; it can pin the dimension you're watching while the imbalance sits underneath, still loaded. And this is where a nuisance turns into a field failure. If you fight the warp by running one side of the tool deliberately cold, or by clamping the part flat while it sets, you don't erase the imbalance. You lock it in as stress. The part measures flat on the bench, then walks in the heat of assembly, or splits later at the corner you forced down."),
      h2("What actually moves it"),
      p("The lever that actually moves this is the one that set the fiber direction in the first place: where the gate is, and the path the fill takes across the part. Move the gate, change the fill pattern, and you change how the fibers lay down and how those two shrink directions fall on the part. On a tool that's already cut, the honest move is sometimes to build the counter-shape into the steel so the part springs back to flat, instead of forcing it flat after the fact. None of these is a knob you turn between shots; they're changes to the tool or the fill, and that's the point. The cause was decided the moment the part filled, not while it cooled. What you don't do is keep turning cooling and pack harder because those are the knobs in front of you. On this defect, turning them harder is how you bury the stress instead of removing it."),
      h2("What went into the app"),
      p("Mold Doctor looks at the part and the flow before it reaches for a setting, so a fiber-orientation warp doesn't come back with a cooling answer. Keeping those two apart is the whole point."),
    ],
  },
  {
    slug: 'gate-mark-short-shot-test',
    title: "If a short shot hides the mark, it isn't the flow front",
    description: 'A faint mark by the gate on a clear PP part reads like a flow line, except a short shot makes it vanish and any hold brings it back. It grew in after a day of running and jumped to the next cavity when the core was swapped, and those three facts move the whole search off the cavity and onto the gate.',
    publishedAt: '2026-08-19',
    thumb: 'shortshot',
    body: [
      p("A mark shows up near the gate on a small clear part and it reads, at a glance, like a flow line: a faint set of rings, a short streak running back toward the gate. So the crew treats it like one. Speed up, slow down, warm the mold, chase the front. On a translucent PP part with the mark sitting right at the gate, that is the natural first move, and on plenty of parts it is the right one."),
      p("Here is the part that should stop you. Pull the shot short, dropping the speed or the transfer position until the part is not filling out, and the mark is gone. Fill it out, or put any hold on it, and the mark is back, every time. That single observation is worth more than the photo, and it points the opposite way from where most people start looking."),
      h2('What the short shot is telling you'),
      p("Defects sort by when in the shot they are written. A flow mark, jetting, a record-groove pattern from a front that hesitates and restarts: those are filling defects. They are drawn by the flow front as it moves, which means a short shot shows them plainly, and often shows them better, because the front is right there on the part. If the mark you are chasing survives a short shot, that is where to work: the front, the speed profile, the gate entry."),
      p("A mark that is absent on a short shot and only appears once you fill out or pack is a different animal. It is not being written by the moving front. It is being written at the end of fill and into hold, when the melt is pressed hard against the steel at the gate. Whatever is happening, it needs pressure to happen. That rules out most of the fill-front playbook before you touch a dial, and it moves the whole investigation to the gate under pressure, which on a clear part usually means gate blush: a hazy, blushed, or blistered patch right where the melt is worked hardest as it comes through the gate."),
      p("The crew in this case had already run that test without knowing it was a test. They mentioned, in passing, that short-shotting hides the mark and that full fill or hold brings it back. That was the diagnosis. They read it as a nuisance instead of a clue."),
      h2('Two more clues, and both point away from the cavity'),
      p("The mark was clean for the first day of a continuous run, then started, then stayed for a week. Read that timeline carefully. A defect born from geometry or a fixed setting is there on the first shot; the tool does not know it is Tuesday. A defect that grows in over hours of running is thermal, or it is contamination. Heat soaks into the tool over a long run, and on a hot-runner tool it soaks into the manifold and the tips, so the gate steel and the melt right behind it are hotter at hour eight than at hour one. Deposit is the other slow-onset story: PP gives off a little volatile over a run, and it plates out where the gas concentrates, which is often the gate land. Either way, slow onset means look at what changes over the run, not at what was set at the start."),
      p("Then the tell that settles it. They replaced the core in the bad cavity, and the mark showed up in the cavity next door. Sit with that. If the mark were the core's fault, a scratch, a polish line running the wrong way, a tired surface, then a fresh core fixes that cavity and you are done. Instead it hopped to the neighbor. That points straight away from the individual cavity's steel and toward something the neighboring cavities share: the manifold arm and its heat, the melt they are fed, the venting along that stretch of the tool. In a twelve-cavity hot-runner tool, adjacent cavities are thermal neighbors. The defect is telling you it lives upstream of any one core."),
      p("Put the three together, near the gate, needs pressure to appear, grows in with heat over a run, indifferent to which core is in the pocket, and the center of gravity is the gate's thermal and shear condition, driven by the hot runner. Not the cavity polish. Not the core. And not the base settings alone."),
      diagram('shortshot-split'),
      h2('Why the photo cannot close it and the behavior can'),
      p("The image is honestly ambiguous, and it is worth saying so. There are faint concentric rings, which could read as a record-groove flow mark. There is a raised spot at the gate, which could be a blister or could be nothing but the gate vestige. A still photo of a translucent part under shop light will support two or three stories at once. What it cannot do is tell you when the mark was born. The short-shot behavior does that, the onset timeline and the cavity swap do the rest, and on this kind of defect the behavior outranks the picture. A crew that can describe the behavior is further along than one with a sharper photo."),
      h2('What to try, in order'),
      p("Measure before you move. The leading explanations here are all thermal, and this is exactly the tool you cannot tune blind: put a surface pyrometer on the gate area and read the hot-runner tip and the mold surface at hour one and again at hour eight. It is telling that the process screen for this job shows pressures, positions, speeds, and times in detail and not one temperature. The numbers that would confirm or kill the thermal story are the ones nobody is watching."),
      p("Then the tip. If the gate mark is hot, low-viscosity melt blushing under pressure, the most direct lever is the hot-runner tip temperature, brought down in small steps, five degrees at a time, watching the mark and watching that the tip does not freeze off. It is also the lever that fits the evidence: a shared manifold running hot is exactly what would carry the mark to the next cavity."),
      p("Ease the pressure it needs. The mark appears only when the part is packed out, so back the hold pressure down, or shorten it, or step it down instead of holding one flat stage, and see whether the mark softens before you lose the dimension or pick up a sink. The screen shows a firm single-stage hold; a gentler, stepped pressurization works the gate face less violently."),
      p("Slow the melt through the gate. The stage where the melt crosses the gate is where shear at the gate is highest, so easing that one velocity stage cuts gate shear without disturbing the rest of the fill. It is the classic gate-blush move, and it is cheap and reversible, which is why it comes before anything in the tool."),
      p("And wipe the gate. If deposit is the story, cleaning the gate land and checking the vent will change the next few shots, and if it does, you have found it without turning a dial. Slow onset over a day and a spread along neighboring cavities both fit a plate-out that builds where the gas collects."),
      p("If none of that moves it, the honest reading is that the fix is in the tool, not on the press: the gate size or type, the tip geometry and its temperature control on that manifold arm, the polish direction on the gate land, the venting. Those are changes to make deliberately, with the same measure-first discipline, not another week of walking the speed profile up and down."),
      h2('What went into the app'),
      p("The useful part of this generalizes, and it is the kind of split the app is built to make. A mark near the gate is not one defect; it is at least two, and the short-shot test separates them. Survives a short shot and you are on the flow front, jetting, a cold-slug mark, a record groove. Absent on a short shot and present only under fill and hold, and you are at the gate under pressure, gate blush and its thermal cousins. Onset over a run and a jump to the neighboring cavity push you further still, off the cavity surface and onto the hot runner."),
      p("Mold Doctor takes a photo of the defect and your process settings and estimates the likely causes and what to adjust, and it keeps the settings and the outcome as history, so 'clean at hour one, marked at hour eight' is something the tool can read off the record instead of something a tired crew has to remember at the end of a shift. The behavior is the diagnosis. The photo is just where it starts."),
    ],
  },
  {
    slug: 'metallic-flake-white-streaks',
    title: "If the streak changes when you tilt the part, it isn't gas",
    description: 'On metallic molded-in-color parts, some white streaks carry no gas and no moisture at all: the aluminum flakes froze at the wrong angle. Two checks split the optical streak from the real splay, and the fixes barely overlap.',
    publishedAt: '2026-08-14',
    thumb: 'metallic-streak',
    body: [
      p('A white streak on a molded part has a well-worn answer path. Dry the resin. If the drying data checks out, look at heat and shear. If the grade is glass-filled and the mark will not wipe off, consider fiber read-out. I wrote that logic into Mold Doctor, and on most parts it holds.'),
      p('Metallic parts are where it stopped holding. A molded-in-color TPO with aluminum flake in the grade, a big exterior part with a long flow path, white streaks running just past the gate, and a reject rate that will not move. Speed up, speed down. Barrel hotter, barrel cooler. The resin dried again to be safe. The streak stays where it was.'),
      p('It stays because on an effect-pigmented part there is a kind of streak that has no gas in it, no moisture in it, and nothing wrong with the dispersion. The material is fine. The pigment is lying at the wrong angle, and a patch of tilted flakes reads as a pale line from where you stand.'),
      p('That sounds like a cosmetic distinction. It changes every fix that follows.'),
      h2('What the flake is doing'),
      p('An aluminum effect pigment is a flat metal platelet, tens of micrometres across and a fraction of one thick. The metallic look depends on those platelets lying parallel to the surface, just under the skin, acting as millions of small mirrors facing the same way. Flow does the aligning: shear during filling lays the flakes down flat, the way a current lays down leaves.'),
      p('Anywhere the flow is disturbed, the alignment breaks. Two fronts recombining behind a hole or a rib. The swirl just downstream of a gate. A step or a sharp corner in the runner that folds the melt before it enters the cavity. A front that hesitates, slows, and restarts. In each of those zones the flakes freeze in at an angle to the surface, and a tilted mirror does not send light back at you.'),
      p('The published work on this is recent and consistent: visible defects track how sharply flake orientation changes between neighboring regions, and a zone of steeply tilted flakes reads darker or brighter than its surroundings depending on where you stand. Nothing is in the streak. The streak is an angle.'),
      diagram('flake-tilt'),
      h2('Why the gas playbook did not close it'),
      p('None of the standard moves are wrong. They treat real defects. They just were not treating this one.'),
      p('Drying first. On a polyolefin like TPO the base resin barely takes up water, which is the first quiet sign the drying loop was never going to close the case; what moisture there is usually rides in on the masterbatch or a filler. Drying it again costs a shift and moves nothing.'),
      p('Speed is the same story with more sweat in it. Slower filling calms shear splay and jetting. Faster filling can carry a front through before it freezes. Both directions treat something real, and crews will walk the profile up and down for days on a streak like this. One published test that stepped process settings across a flake-pigmented grade found injection rate and mold temperature mattered most, and the direction runs against instinct: the slower fill and the cooler mold scored better. But the gains were incremental, not categorical. The marks softened. They did not leave, because the zones that scramble orientation are built into the flow path, and they scramble it at every speed you are willing to run.'),
      p('The trap hiding in the playbook is back pressure. A streaky colored part normally invites more of it: richer mixing, better dispersion, and for an ordinary pigment that is decent advice. Aluminum flakes are metal foil. Work them hard enough with back pressure and screw speed and they fold and tear, and a torn flake stops working as a mirror. The whole part drifts duller and grayer while the streak you were chasing sits exactly where it was. Effect pigment suppliers write low shear into their processing guidance for exactly this reason.'),
      h2('The split'),
      p('So the question, as usual, is not what causes a white streak. It is which white streak you have. The checks run in an order, and the order is the point.'),
      p('The first check is the one this site keeps coming back to. If the mark wipes off, it is deposit sitting on the mold, not a defect in the part. The second is definitional: if the grade carries no effect pigment, none of what follows applies — stay on the splay path.'),
      p("Then the two that belong to metallics. Hold one marked part under a fixed light and roll it. A gas streak stays put visually: the same dull, silvery patch from every direction, stronger from one angle and fainter from another, but always the same thing in the same place. A flake mark comes and goes: it darkens, it brightens, and it can swap sides with its background as the part turns, because you are swinging in and out of the tilted mirrors' line of reflection."),
      p('Second, mark where the streak sits on ten consecutive shots. Moisture splay wanders, because the gas is wherever the gas happened to be. A flake mark is geometry. It holds its shape and its position shot after shot, parked downstream of whatever disturbed the flow. One caveat, and it is the reason the tilt check comes first: shear-driven gas also parks itself near the gate. A streak that holds its position but never moves with the light is shear territory, not orientation.'),
      p('If you want the confirming run, mold the same tool in the natural or a solid color. If the streak is gone, the flow disturbance was always there — the effect pigment was just the first colorant honest enough to show it. If a mark survives in the solid color, it was never about the flakes: you are back to gas or deposit, and the earlier notes apply.'),
      diagram('metallic-split'),
      h2('What actually moves it'),
      p('Once the streak is confirmed as orientation, the working set changes. You are no longer managing gas. You are managing where the flow gets disturbed, and how steadily the front moves through the zone you can see.'),
      p('Steadiness is the process half. A profile that decelerates and re-accelerates across the visible face plants a hesitation band right where it shows, so the aim is one speed through the surfaces that matter, with the stage changes pushed to where the eye does not go. And check that the profile you set is the profile you get: a machine riding its injection pressure limit has quietly stopped following your speed settings, the front wanders and hesitates on its own schedule, and the flakes record every wobble. That gap between set speed and actual speed is worth a note of its own.'),
      p('Geometry is the other half, and honestly the bigger one. Every step and sharp corner in the runner, the gate land, and the gate exit folds the flow once, and a metallic surface prints every fold. Shops that run molded-in metallics as a specialty converge on the same tooling habits: generous gates, radiused transitions, no steps on the melt path ahead of a show surface, and gates placed so their disturbance lands where the eye does not. If the streak is parked behind a feature, no dial on the press moves the feature.'),
      p('Mold temperature deserves an honest sentence. It is the reflex answer for surface appearance, and for plenty of defects raising it is right. On flake marks the measured evidence is thinner and does not all point the same way; the test above scored the cooler mold better. Treat it as a variable to test on your part, not a direction to assume.'),
      p('And material sets the floor. Finer flakes forgive more, because each mirror is smaller and the eye averages them; coarse bright flakes flop harder and print every disturbance. A higher-flow grade fills at lower pressure, which keeps the machine off its limit and the front steady. Some combinations of geometry and effect cannot be molded clean, and that is the point where the honest answer is paint, film, or a different pigment shape rather than another week of trials.'),
      h2("Don't reorder this"),
      p('If the drying data is short, dry first. Moisture splay is still the most common white streak on hygroscopic grades, and this note does not move it out of first place. The metallic branch opens when the grade actually carries effect pigment, and after the old checks pass, not instead of them.'),
      p("And do not stretch this over TPO's other famous mark. Tiger stripes are alternating gloss bands, roughly perpendicular to flow, marching away from the gate at intervals: a flow-front instability with its own logic and its own fixes. Same material family, different defect. If the mark is a repeating band pattern rather than a streak parked at one feature, that is the branch to read instead."),
      h2('What went into the app'),
      p('Mold Doctor now switches to flake orientation when three things line up at once. The grade carries effect pigment — metallic, MIC, aluminum flake, pearl. The complaint is a streak. And the answers point to an optic: it moves with the viewing angle, and it repeats in place. When the description leaves those two checks open, it tells you to run them before it lets the gas logic decide.'),
      p('Two guards came with it. The usual dispersion fix for color streaks, more back pressure, is suppressed on effect pigments, because the adjustment that helps an ordinary pigment is the one that grinds a metallic dull. And when the drying data is short, moisture keeps first place. The new branch opens after the fundamentals, not around them.'),
      p('Mold Doctor takes a photo of the defect and your process settings and estimates likely causes and what to adjust. The logic above is part of it.'),
    ],
  },
  {
    slug: 'nmt-bond-failure-troubleshooting',
    title: 'When the bond fails, the mold was probably too cold',
    description: 'The last of four notes on nano molding: why a weak metal-resin bond is almost always an infiltration problem, why mold temperature is read at the steel and not off the setpoint, and how to tell the failures you can fix at the press from the ones that arrived in the box of inserts.',
    publishedAt: '2026-08-13',
    thumb: 'nmt-troubleshoot',
    body: [
      p('This is where the series has been heading. Three notes on how the bond works, where it is used, and what it is made of, all to arrive at the one that matters on a shop floor: the part came out, the plastic peels off the metal, and someone has to say why. Insert-molded metal-resin parts fail in a way that is easy to misread, because the failure is invisible until you pull on it, and by then the shot is long gone.'),
      p('The single most useful idea for reading these failures is that bond strength is a product, not a sum. It is the quality of the surface treatment multiplied by how completely the resin filled it. Multiply, because if either one is zero, the joint is zero — a perfect treatment molded cold gives you nothing, and a perfect molding onto a dead surface gives you nothing. That framing splits every bond failure into two questions with very different answers: was the surface good when it arrived, and did I fill it. You own one of those. You can only inspect the other.'),
      h2('The two failures that came in the box'),
      p('Two of the three ways a bond fails are decided before the insert reaches your press, and no setting recovers them.'),
      p('The first is the treatment itself — an under-etched or mis-processed surface that never had the pore structure to grip. The second is more common and more frustrating: a good surface that was spoiled in handling. The nanopores that do the gripping are tens of nanometres across; a fingerprint, an oil film, condensed moisture, or simply too many days on a shelf will contaminate or degrade them. Treated inserts have a shelf life and a handling spec for exactly this reason, and a batch that sat too long or got touched with bare hands can look identical to a good one and bond like a stranger.'),
      p('Neither of these is yours to fix at the press, and the important discipline is to not try. Cranking the process to force a bond onto a bad surface makes a part that passes the pull test today and fails in the field, which is worse than a part that fails now. The press\'s job with an upstream failure is to detect it and send it back — confirm the treatment and the handling, quarantine the suspect lot, and do not mold through it.'),
      p('There is a tell that separates the two worlds, and it comes straight from part one. A good bond fails in the plastic: force it apart and the resin tears and stays behind on the metal. A bond that fails clean — the resin lifts off and the metal underneath looks bare and shiny — never wet into the surface at all. Clean separation points upstream, to treatment or contamination. Resin left on the metal, but not enough strength, points at you: the surface was good and you did not fill it. Learn to read the fracture face and you have already narrowed the cause in half.'),
      diagram('nmt-defect-tree'),
      h2('Mold temperature, and why you measure it instead of setting it'),
      p('When the surface is good and the bond is still weak, the cause is almost always the same, and it is the most under-used lever on the machine: the mold was too cold.'),
      p('Here is the physics, and it is worth holding onto because everything else follows from it. When the melt hits the metal, it starts to freeze against it immediately, forming a solid skin. The patent behind this whole field states the failure in one line: the injected resin solidifies before it enters the fine recesses of the treated surface. Those recesses are tens of nanometres wide. The skin that freezes against a cold wall is orders of magnitude thicker than that. So the moment a skin forms at the interface, the pores below it are sealed off with air still in them, and no amount of pressure afterward pushes resin through a frozen lid. The bond is decided in the instant the melt arrives, and mold temperature is the one lever that buys the melt time to stay liquid at the wall long enough to flow in before it sets.'),
      p('This is why the resins in this family are all the fast-freezing, semi-crystalline ones — PPS, PA, PBT, PET, glass-filled — and why they are so unforgiving. They crystallize quickly against cold steel. The datasheet mold temperature for a glass-filled PPS bonding grade sits around 120°C, and here is the trap: that is a setpoint, and the setpoint is not what the melt feels. The temperature that matters is the actual cavity-surface temperature where the resin meets the insert, and measured with a surface pyrometer that number is routinely lower than the controller reads. The working rule from the floor is to measure, not assume, and to hold the measured surface at 150°C or higher for these parts. The patent goes further still and describes preheating the metal insert itself above 200°C — the same idea taken to its limit, keeping the interface hot enough that the resin stays fluid until it has rooted.'),
      p('There is a practical trap in how you reach that number. Most shops raise mold temperature with a water or oil unit circulating fluid through the tool, and set to 150°C that way, a probe on the cavity face often reads under 100°C — the circulating fluid cannot carry enough heat to the surface against the losses. Hitting a measured 150°C at the steel usually takes cartridge heaters inserted directly into the mold, not a higher number on the controller. And 150°C is a floor, not a target: for these joints hotter is better, and holding the measured surface at 180°C or above is fine and often helps the resin find the pores.'),
      p('If you change one thing on a weak-bond part with a good insert, change this, and confirm it with a thermocouple on the steel rather than a number on a screen. It is also the change shops resist most, because a hotter mold means a longer cooling time and a slower cycle. That trade — cycle time against bond integrity — is the real decision hiding inside most of these failures.'),
      diagram('nmt-freeze-race'),
      h2('Speed, pressure, and hold'),
      p('Mold temperature buys time; the other three levers use it.'),
      p('Injection speed works the opposite way from intuition. Filling faster gives the flow front less time to freeze against the wall on its way to the joint, so it arrives hotter and more fluid and with more of its skin still molten. On a part fighting a weak bond, a faster fill often helps for the same reason a hotter mold does — it keeps the interface alive.'),
      p('Pressure and hold do the actual driving. Once the melt is against the treated surface and still molten, packing pressure is what forces it down into the pores, and holding that pressure while the interface freezes is what keeps it there until it sets. Too little pack, or a hold that releases before the skin has solidified, and the resin relaxes back out of the structure it was starting to fill. The instinct to read this as "push harder" is a trap, though: past a point, more pressure and more speed mean more shear and more heat, and you begin degrading the resin and the fiber-to-polymer bond at the very interface you are trying to build. The goal is not force. It is to keep the melt molten and fill the pores — hot enough, fast enough, packed and held long enough — not to hammer a cold shot into a surface that has already sealed.'),
      h2('The defects that are not the bond'),
      p('Not every insert-molding defect is a bond-strength problem, and the surface finish tells you about the ones that are not.'),
      p('Sink marks and flow marks in the resin right around the insert usually mean the metal is chilling the melt locally — a cold insert acting as a heat sink, pulling the surface down as the material around it freezes unevenly. The answer is the same family as before: raise the mold temperature, and preheat the insert so it is not the coldest thing in the cavity. Flash, by contrast, is rarely about temperature; it points to the insert\'s dimensions or a damaged shut-off, which is an incoming-inspection and tooling problem, not a process one. An insert that shifts or deforms during the shot is a fixturing and gating problem — the support was not there, or the melt hit it one-sided and pushed it. These are worth separating out precisely because the reflex — reach for the process — is wrong for them.'),
      p('And then there is the failure that hides, the one part two warned about. When the part\'s job is to seal, a bond that is merely weak is not the worst outcome; a bond that leaks is. A joint can pull-test fine and still have a local void, a discontinuity in the treatment, or a weld line running across the interface where two flow fronts met — any of which is a path for water. A seal does not average. It is why these parts are checked with air or helium leak tests and not just mechanical pulls, and why a weld line that lands on the joint is worth moving with a gate change before it ever becomes a leak. The pull test asks whether the joint is strong. The leak test asks whether it is continuous, and for a sealed part that is the question that ships or scraps it.'),
      h2('The order of operations'),
      p('So a bond failure has a sequence, and the value is in running it in order.'),
      p('First, confirm the insert. Read the fracture face: clean metal means the surface or its handling failed, and the part goes back upstream, not through a hotter mold. Resin left behind but weak means the surface was good and the fill was not — now it is yours. Then, in order of cost and impact: raise the mold temperature and verify it with a probe on the steel, not the setpoint, at 150°C or above for these resins. Raise injection speed. Increase pack and hold enough to drive the resin into the pores and keep it there while it freezes, without tipping into the shear that degrades it. And if the part must seal, prove it with a leak test, not a pull. The sequence matters because the first step decides whether any of the others can possibly help — and most of the wasted shifts on these parts come from skipping it and molding harder into a surface that was never going to hold.'),
      p('That is the series. The bond is nano-scale geometry, filled in the first seconds against cold metal, on a surface someone else prepared — invisible physics that decides whether a phone survives a drop, a battery cover stays sealed, a hydrogen tank holds. Most of it happens away from the press. But the last variable, the one that turns a good surface into a good joint or wastes it, is the press, and it comes down to keeping the melt alive at the metal long enough to fill what it was given.'),
      p('Mold Doctor takes a photo of the defect and your process settings and estimates the likely causes and what to adjust. For an insert-molded metal-resin part, tell it the resin is glass-filled and the insert is treated metal, and the questions it already asks — mold temperature, fill speed, packing — are the same ones this note has been about, pointed at the smallest and most demanding joint injection molding makes.'),
    ],
  },
  {
    slug: 'nmt-resin-metal-combinations',
    title: 'The resin must flow like water, then move like metal',
    description: 'Why the shortlist for metal-bonding resins is so short — the melt has to enter nanometre pores in a fraction of a second, then match aluminum\'s thermal expansion for the life of the part. How PPS, PBT and PA divide the work, always glass-filled, and what the metal choice locks in.',
    publishedAt: '2026-08-12',
    thumb: 'nmt-resin',
    body: [
      p('On paper, insert molding onto treated metal accepts any thermoplastic. In practice the shortlist is four resins — PPS, PBT, PA, PET — almost always glass-filled, almost always on aluminum. That is not fashion. The joint makes two demands that pull in opposite directions, and only a narrow band of compounds satisfies both.'),
      p('The first demand comes from part one: the melt must enter pores tens of nanometres wide in the fraction of a second before it freezes. That asks for a resin that flows like water. The second demand comes from the durability data: once frozen, the resin must expand and contract with the metal through every temperature swing of the part\'s life. That asks for a resin that moves like metal. Flow like water, then move like metal — everything about the material choice follows from that pair.'),
      h2('The expansion problem'),
      p('Aluminum expands about 23 parts per million per degree. Unfilled thermoplastics run 60 to 100. Bond the two rigidly and every heating and cooling cycle turns that difference into shear at the interface — the joint gets worked back and forth like a wire being bent. Part one showed where that ends: cycling between −40 and 120°C grinds a joint from around 45 MPa toward 25. The interface does not fail in one event; it fatigues.'),
      p('Taisei Plas\'s patent is explicit about the fix: the resin composition should sit at 20 to 40 parts per million — at or near the metal it bonds to. No neat polymer gets there. The way down is filler, and mostly that means glass fiber: stiff, cheap, and with almost no thermal expansion of its own, it drags the compound\'s expansion toward the metal\'s. This is why every bonding grade on the market is glass-filled, usually at 30 percent or more, and why the patent goes further and specifies glass fiber plus glass powder together — the powder trims the shrinkage that fiber alone leaves direction-dependent, pulling molding shrinkage down to around 0.4 to 0.5 percent and evening it out.'),
      p('There is a catch, and it connects to a note I wrote earlier about fiber at surfaces. A glass fiber is around ten micrometres thick. The pores are two hundred times smaller. The fiber cannot enter the treatment layer — only the polymer between the fibers can. So the compound has to do two things at once: carry enough glass to move like metal in bulk, and still present a resin-rich skin at the wall where the actual anchoring happens. Bonding grades are formulated around that balance, and it is one reason a generic glass-filled pellet and a bonding grade of the same resin are not the same material.'),
      diagram('nmt-cte'),
      h2('Why PPS became the default'),
      p('Within the shortlist, PPS with glass fiber is the combination the published numbers keep coming from, and its dominance is easy to defend. It is thermally rigid — it takes reflow soldering, paint ovens and anodizing lines without complaint, which matters because these parts usually go through more processing after molding. It barely absorbs water, so the dimensions and the interface it froze with are the dimensions it keeps. It crystallizes into a stiff, chemically resistant solid that concedes little to the environment. And in the melt it runs thin, which is exactly what demand one asks for.'),
      p('Its published processing window in the bonding literature — melt around 290 to 330°C, mold around 120°C — already hints at part four\'s argument: this is a hot process, hotter than most shops\' habits, and the mold temperature line in particular is where field practice and datasheet part ways. I will leave that fight for the next note.'),
      p('PPS has known weaknesses: unfilled it is brittle — another reason the glass is always there — and its dielectric properties are middling. Which is where the rest of the shortlist comes in.'),
      h2('The rest of the shortlist'),
      p('PBT takes the antenna work. Where the molded line is a radio window, the resin\'s dielectric behavior joins the selection list, and PBT grades are commonly chosen for those zones. The clearest sign of how established this niche is: resin makers sell PBT grades developed specifically for nano molding — SABIC introduced a flame-retardant PBT for exactly this joint — and specialty suppliers like Syensqo list bonding grades as a product category of their own. When the resin industry builds SKUs for your process, the process has stopped being exotic.'),
      p('PA66 and PPA carry the structural and automotive end — tougher than PPS, happier in impact, and PPA in particular holds strength at underhood temperatures. Their tax is moisture: polyamides absorb water, swell, and shift properties, which has to be engineered around in a joint whose whole job is dimensional fidelity to a piece of metal. PET appears where cost and dielectric behavior favor it. All of them show up in the field glass-filled — the expansion argument does not care which polymer you picked.'),
      diagram('nmt-resin-map'),
      h2('The metal side'),
      p('Aluminum is the standard for reasons that mirror the resin logic. The etching chemistry that started this field was developed on it; it anodizes readily, which is the TRI route; it is light and machines well; and its expansion is low enough that a filled resin can actually reach it. The common frame and housing alloys — 5052, 6063 and their neighbors — are the ones the published strength numbers are measured on.'),
      p('Other metals come with asterisks. Copper enters the picture with battery terminals — part two\'s cover modules molded aluminum and copper into the same PPS part — because current wants copper. Stainless and titanium appear in premium housings and specialized parts. Each can be surface-treated, but not by the same bath: the pore-forming chemistry is metal-specific, and a treatment that texturizes aluminum does nothing for stainless. Practically, that means the metal choice picks the treatment vendor and process, and mixing metals in one part means qualifying two treatments that must both survive the same molding conditions.'),
      h2('How to read a combination'),
      p('So a combination sheet reads in five columns. Can the melt flow into the pores — viscosity, and the press conditions of part four. Does the compound move like the metal — filler content, shrinkage, CTE. Does the skin stay resin-rich enough to anchor. If the part is a radio window, what are the dielectrics. And what does the part endure after molding — soldering, anodizing, paint. Aluminum 5052 with 30 to 40 percent glass PPS answers all five for most sealed structural parts, which is why it is the default; the moment one column changes — antenna, terminal, underhood — the shortlist rotates but never leaves the family.'),
      p('Part four is where this series has been heading: the defect list. Because here is the uncomfortable truth of the materials story — you can specify the right alloy, the right bonding grade, the right glass loading, and still ship joints that leak, because the last variable is the press. The best compound in the shortlist only moves like metal after it has entered the pores, and whether it enters is decided in seconds, by settings.'),
      p('Mold Doctor takes a photo of the defect and your process settings and estimates likely causes and what to adjust. It already knows the resins in this note — PPS, PBT, PA and their glass-filled forms — and part four will put its home-ground levers, mold temperature first, against the specific ways this joint fails.'),
    ],
  },
  {
    slug: 'nmt-antenna-lines-waterproofing',
    title: 'Why metal phones need plastic lines, and where the technology went next',
    description: 'Metal blocks radio and waterproofing hates openings — the two jobs that made nano molding standard in phones, and how the same sealed pass-through problem is now moving into EV battery covers, hydrogen tanks, and connectors.',
    publishedAt: '2026-08-12',
    thumb: 'nmt-frame',
    body: [
      p('Part one of this series was about how the bond works: a treated metal surface full of nanometre-scale pores, filled by melt under pressure, frozen into millions of anchors. This part is about why anyone goes to that much trouble. The answer starts with a problem that has nothing to do with bonding at all — metal blocks radio.'),
      p('Once you see the two jobs this technology does in a phone, you will recognize the same pair everywhere it spreads: let something pass through a metal wall, and seal the opening so nothing else does. Phones needed radio waves to pass. The applications lining up behind them — battery covers, hydrogen tanks, connectors — need current, and the stakes of the seal go up each time.'),
      h2('The radio problem'),
      p('A phone frame made entirely of metal is a beautiful object with one defect: it is a shield around the radios. Antennas cannot radiate through a closed conductive shell, so a metal phone has to be opened up — slots cut through the frame where the antennas need to see out. Those slots are the thin plastic lines from part one, and their placement is not styling. They sit where the antennas sit, which is why they cluster near the corners.'),
      p('The slot itself creates the engineering problem. It cannot stay empty: the frame would lose stiffness at exactly the cut, and water would walk straight in. It has to be filled with something rigid, radio-transparent, and bonded well enough to restore the frame into one structural piece — at a wall thickness of a couple of millimetres, with no room for screws, gaskets or a bead of glue. That specification is what nano molding was commercialized to meet. Reports of phone makers testing NMT for exactly this go back to 2011, and filled antenna lines have been the standard construction for metal phones since. More radios per phone has only pushed it further — every band added is another place the shell has to open.'),
      p('There were other ways out, and the market tried them: all-glass backs, plastic unibodies, antenna bands worn on the outside of the case. They trade away the thing metal was chosen for — stiffness at low thickness, and the feel of the material. The combination a flagship phone actually demands — metal construction, a dozen radio paths, an IP rating and a couple of millimetres of wall — has, so far, exactly one construction that meets all of it at once: molding the windows in.'),
      h2('The water problem'),
      p('The second job hides inside the first. A waterproof phone is rated to keep water out under pressure — and every antenna line is a through-cut in the structural wall. There is no gasket around it, no O-ring, no adhesive bead. The seal is the metal-resin interface itself: the same nanoporous bond from part one, doing double duty as a barrier. If the resin filled the treatment layer completely, the joint is tight. If it filled ninety percent, the missing ten percent is a leak path that no inspection of the outside will show you.'),
      p('This is worth pausing on, because it changes what a good part means. A mechanical joint that lost a fraction of its strength usually still works. A seal that lost a fraction of its continuity has failed — water does not average. It is why these parts are leak-tested, not just pull-tested, and why part four of this series spends so much time on molding conditions: the leak path is usually made at the press, invisibly, in the first seconds of fill.'),
      diagram('nmt-frame'),
      h2('The quiet third job: structure'),
      p('Look at the inside of a metal frame part and there is usually a resin skeleton molded onto it: bosses for screws, ribs, snap hooks, insulated zones keeping the metal away from the electronics. That is the third job — the one nobody advertises. Metal gives the part its stiffness and its feel; resin carries all the small functional geometry that would be expensive or impossible to machine into the metal. One insert-molded part replaces a bracket, fasteners and an assembly step.'),
      p('That anatomy is why the technology did not stay in phones. Laptop chassis, watch cases, camera bodies, connector housings — anywhere a designer wants metal outside and functional plastic inside, the same construction shows up. These applications are less demanding than the antenna lines; they mostly borrow the structural trick. The demanding ones came later, and from a different industry.'),
      h2('The next wave: batteries, hydrogen, heat'),
      p('The supplier behind TRI publishes its application list, and reading it is like watching the technology change jobs. An ultracapacitor seal for an automaker. Cover modules for automotive lithium-ion batteries — aluminum and copper terminals molded into a PPS cover that has to insulate, carry current through the wall, and stay waterproof under pressure. Parts for hydrogen tanks in fuel-cell vehicles. PTC heaters. Hermetic connectors. Every one of them is the phone problem restated: something must pass through a sealed wall — this time current or heat instead of radio — and the pass-through must not leak.'),
      p('The stakes climb with each of these. A phone that leaks kills a phone. A battery cover that leaks, or an insulation zone that breaks down, is a safety event — and a hydrogen tank raises that again. The engineering answer is the same nanoporous interface, but the durability envelope from part one now matters far more than it did in a pocket: automotive parts live through the −40 to 120°C kind of thermal cycling that grinds a metal-resin joint down toward half its strength if the materials are not chosen for it. That is why copper appears next to aluminum on the terminal side, why PPS keeps appearing on the resin side, and why part three of this series is about materials at all.'),
      diagram('nmt-app-map'),
      h2('What every one of them asks of the press'),
      p('Strip the applications down and they make one demand in common: a joint that is simultaneously structure and seal, formed in a few seconds inside a mold, on an insert whose invisible surface treatment someone else already paid for. The molder does not choose the antenna layout or the battery chemistry. The molder decides whether the melt reached the bottom of the pores before it froze — and in every application above, that decision is the difference between a part and a leak.'),
      p('Part three looks at the materials that make the joint possible — why glass-filled PPS became the default resin, what the aluminum grades bring, and what changes when copper or stainless enters. Part four is the troubleshooting note: the defects, the levers, and which failures belong to the press versus which arrived in the box of inserts.'),
      p('Mold Doctor takes a photo of the defect and your process settings and estimates likely causes and what to adjust. If your parts are the kind in this note — an insert that must seal, not just hold — the stakes of every setting it reasons about are higher, and part four will bring the two together.'),
    ],
  },
  {
    slug: 'nmt-metal-resin-bonding',
    title: 'The plastic lines in a metal phone frame are not glued in',
    description: 'How nano molding technologies like NMT and TRI bond resin directly to metal — where the strength actually comes from, why the pores matter more than the chemistry, and why the press ends up deciding whether it holds.',
    publishedAt: '2026-08-12',
    thumb: 'nmt-bond',
    body: [
      p('Look at the metal frame of almost any phone. Somewhere along the edge there are thin plastic lines breaking up the metal — usually near the corners, always where the antennas live. Those lines are not glued in, and they are not snapped in. They were injection molded directly onto the metal, and if the part was made right, you could tear the frame apart and the plastic would break before the joint does.'),
      p('The family of technologies that makes this possible goes by several names — NMT, nano molding, TRI — and it sits in an odd position: it is chemistry and surface engineering on the front end, but whether the bond actually holds is decided at the injection molding machine. That makes it our kind of topic. This is the first of four notes on it: what the technology actually is, where it is used, what materials it works with, and what to do when the bond fails.'),
      h2('The problem it solves'),
      p('Metal and plastic do not want to stick to each other. A polymer melt will happily flow over a machined aluminum surface, freeze, and then pop off with almost no force — the surface is too smooth to grip and too foreign to bond. For decades the answers were mechanical: screws, heat stakes, snap features, or a bead of adhesive. All of them add parts, thickness, process steps, or a material that ages.'),
      p('Phones broke that compromise. A metal frame needs slots for antennas to radiate through, the slots need to be filled with something rigid that will not leak water, and the whole assembly has to survive drops and years of thermal cycling at a thickness of a couple of millimetres. Screws and glue do not fit in that space. What fits is resin molded straight onto the metal — if you can make it hold.'),
      h2('Where the strength actually comes from'),
      p('The trick is not an adhesive and it is not, mostly, chemistry. It is geometry at a scale you cannot see.'),
      p('Before molding, the metal goes through a surface treatment that covers it with pores on the order of 20 to 50 nanometres — thousands of times smaller than the surface roughness you can feel with a fingernail. During molding, the melt is forced against this surface and into the pores. When it freezes there, the joint is held by millions of microscopic anchors per square millimetre. Pull on it and you are not peeling a glue line; you are trying to shear off a forest of resin roots embedded in the metal.'),
      p('What surprised me in the research is which pore geometry wins. A study comparing two treated surfaces found that deeper is not better: a surface with isolated, straight pores about 500 nanometres deep bonded worse than one with a shallower, three-dimensionally interconnected pore network about 100 nanometres deep. The reason is filling. Resin could penetrate the connected network completely, while the deep isolated holes trapped air and filled partway. The strength comes from how much of the structure the resin actually occupies — not from how impressive the structure looks in a cross-section. Keep that idea; it comes back in part four, because everything the press does either helps or prevents that filling.'),
      p('There is a chemical assist on top. On treated aluminum, the surface carries hydroxides that decompose under the heat of molding, and the reaction favors intimate contact between resin and metal. Suppliers formulate bonding grades around this. But the load-bearing mechanism — the thing you can measure in a lap-shear test — is the anchor structure.'),
      diagram('nmt-pores'),
      h2('Two families: etched pores and anodized films'),
      p('The treatments that create this surface fall into two main families, and the two names in this series\' title are one of each.'),
      p('NMT — Nano Molding Technology — is the name coined by Taisei Plas in Japan, and it is chemical etching: the aluminum is immersed in a treatment bath (the patented step is an amine-family solution) that eats nanoscale pits into the surface itself. This is the lineage behind the antenna lines on most metal phones, and the one with the deepest paper trail — patents, bonding-grade resins sold specifically for it, and published strength data.'),
      p('TRI is the other family: anodizing. Instead of etching pits into the raw metal, the process grows an oxide film on the aluminum electrochemically, and that film carries the nanopores. TRI itself is the system commercialized by GEO Nation in Korea, in an exclusive partnership with Toa Denka of Japan, and it has shipped in waterproof phone housings for years. Same principle — a nanoporous surface the resin can root into — reached by growing a structured layer rather than carving one.'),
      p('For a molding engineer the distinction matters less than the shared consequence: in both families, the metal arrives at your press already carrying its nanostructure, invisible and finished. You cannot see whether it is good. You can only mold it well or ruin it.'),
      diagram('nmt-families'),
      h2('How strong is it, in numbers'),
      p('Published lap-shear values for well-made aluminum–PPS joints sit around 44 MPa, with butt-joint tensile strength in the same band. For scale, that is stronger than most structural adhesives manage on the same joint, and it is why suppliers can afford the confident demonstration: break the assembly and the fracture runs through the plastic, not along the interface. GEO Nation says it plainly about TRI joints — force the joint apart and the resin breaks and stays behind on the metal.'),
      p('Durability is where the numbers get more interesting than the brochure. In published aging tests, an aluminum–PPS joint held its ~45 MPa through 3,000 hours at 85°C and 85% humidity, and through 1,500 thermal-shock cycles between −40 and 85°C. Stretch the cycle to −40 to 120°C and the joint degrades toward 25 MPa within 500 to 1,000 cycles — the thermal expansion mismatch between metal and resin grinds at the interface until it gives. The bond is strong, but it is strong within an envelope, and the envelope is set by temperature swing. That is a materials-selection problem, and it is most of why part three of this series exists.'),
      h2('Why this lands on the molder\'s desk'),
      p('Everything above happens before and after the press. The treatment is bought. The resin grade is specified. So why write about this in a series about injection molding?'),
      p('Because the joint is formed in the first seconds after injection starts, and the press owns those seconds. The melt has to reach nanometre-scale pores and fill them before it freezes — and a melt freezes fast against metal. Taisei Plas\'s own patent states the failure mode in one line: the injected resin solidifies before entering the fine recesses of the treated surface. Every setting that governs how long the melt stays alive at the metal surface — mold temperature above all — is deciding, invisibly, whether those millions of anchors get formed or not. A perfectly treated insert molded cold gives you a part that looks identical and holds a fraction of the load.'),
      p('That is the through-line of this series. Part two looks at where the technology shows up — phones first, then batteries, hydrogen tanks and everything else being built on it. Part three covers the resin and metal combinations and why PPS with glass fiber became the default. Part four is the one closest to this app\'s home ground: what goes wrong at the press, what the levers are, and which failures are yours to fix versus which arrived in the box of inserts.'),
      p('Mold Doctor takes a photo of the defect and your process settings and estimates likely causes and what to adjust. Insert-molded metal-resin parts push the same physics the app already reasons about — skin formation, mold temperature, packing — to a scale where they decide everything.'),
    ],
  },
  {
    slug: 'fiber-float-surface-whitening',
    title: 'The white haze on a glass-filled part is the fiber, and drying won\'t touch it',
    description: 'Why glass fiber floats to the surface and turns a part white, why mold temperature is the first lever that pulls it back under the skin, and what to reach for — process, then material, then mold — when it does not.',
    publishedAt: '2026-08-11',
    thumb: 'fiber-float',
    body: [
      p('A glass-filled part comes out with a white, hazy surface, and the reflex is to blame drying. On a glass-filled resin that reflex is usually wrong. The white is the glass fiber sitting in the surface, showing through a skin that is too thin to hide it, and no amount of drying moves it.'),
      p('I wrote earlier about telling that white mark apart — whether it wipes off, whether the resin is even glass-filled, whether the drying was actually done. That note ends at the point where the fiber is confirmed and everything else is ruled out. This is the branch that starts there. The fiber is the cause; now it has to be pulled back under the surface, and the lever that does it is mold temperature. The reason is worth understanding before reaching for the setting.'),
      h2('Why the fiber floats'),
      p('Melt does not fill a cavity like water filling a glass. It fills by fountain flow: the material at the center of the stream is fastest, and when it reaches the flow front it rolls outward and forward, laying itself against the cold mold wall like a fountain turning over. Whatever is riding near the front gets rolled onto the surface and frozen there.'),
      p('In a glass-filled resin, what rides near the front is the fiber. Glass and polymer do not flow the same — different density, different response to shear — so they separate a little as they move, and the fiber ends up at the leading edge. Fountain flow then rolls it onto the wall, where it hits cold steel and freezes before the resin behind it can flow over and bury it. The skin that should be a smooth resin layer is instead full of fiber ends sitting at the surface, and that is what reads as white haze.'),
      p('The interface makes it worse. If the bond between fiber and polymer is weak — and low melt viscosity and high shear both weaken it — the fiber sheds its resin coating more easily and sits more proud of the surface. So the same conditions that shear the melt hard are the ones that leave the most fiber showing.'),
      diagram('fiber-float-fountain'),
      h2('Some resins float more than others'),
      p('None of this is specific to one resin. The mechanism is physics, not chemistry — fountain flow and a density difference — so any short-glass-reinforced thermoplastic does it. PA, PBT, PP, PC, PPS, POM: fill any of them with chopped glass and the fiber will try to reach the surface. What changes from one to the next is how hard it tries.'),
      p('The dividing line is crystallinity. A semi-crystalline resin — nylon, PBT, PP, POM, PPS — shrinks more as it cools, because the polymer packs into crystals and pulls in on itself. That shrink draws the resin back off the fiber and leaves the fiber standing more proud, so semi-crystalline grades float worse. An amorphous resin — PC, ABS, PC/ABS — shrinks less and floats less, though it is often chosen for a glossy surface where the little float there is shows up more.'),
      p('Two other things push it up. Higher glass loading floats more, simply because there is more fiber trying to reach the surface — a 30% grade is worse than a 15% one. And polypropylene is a case of its own: it is non-polar, so the bond between glass and polymer is weak to start with and the fiber sheds its coating easily, which is why glass-filled PP almost always carries a maleic-anhydride compatibilizer and still floats readily.'),
      p('The practical point is that the levers are the same for all of them — mold temperature first — but the numbers are not. A semi-crystalline nylon and an amorphous polycarbonate reach a clean surface at different mold temperatures, and the band that works for one is not the band for the other.'),
      diagram('fiber-float-resins'),
      h2('The setting that pulls it back'),
      p('The metallurgy of the problem is set by the resin, but how much fiber ends up frozen at the surface is set at the press, and mold temperature is the first thing to move.'),
      p('A hot mold wall lets the surface skin stay molten a moment longer. In that moment the resin behind the frozen front has time to flow forward and over the fiber, burying it under a resin-rich layer instead of freezing it exposed. On a glass-filled nylon the working band is roughly 80 to 120°C, and for a part fighting fiber float it belongs at the top of that band, not the bottom. This is the single change that fixes most floating-fiber surfaces, and it is the one shops skip because a hotter mold means a longer cycle.'),
      p('Injection speed is the second lever, and it works the opposite way from intuition. Faster filling shortens the time the flow front spends freezing against the wall, so less fiber locks in before the resin can cover it. It also cuts the relative slip between fiber and polymer that separates them in the first place.'),
      p('Melt temperature helps at the margin — a glass-filled nylon runs around 270 to 300°C, and the hotter end keeps the resin fluid enough to flow over the fiber — but it has a ceiling. Push it too high and the extra shear and heat degrade the fiber-resin bond, which is the interface problem above, and you lose on the interface what you gained on flow. Injection pressure sits high already on these resins, around 75 to 100 MPa, because glass raises the viscosity; that is a consequence of the filler, not a lever for the surface.'),
      diagram('fiber-float-section'),
      h2('When the press can\'t reach it'),
      p('Sometimes the process band is not enough — the part is thin, the flow length is long, or the surface spec is cosmetic and unforgiving. Then the fix moves off the press.'),
      p('The material side comes first. Compounders sell low-float or surface-improved grades of the same resin, and the difference is usually the coupling chemistry — silane treatments and maleic-anhydride-grafted compatibilizers that make the fiber hold its resin coating instead of shedding it. If a standard grade floats no matter what the press does, a surface grade of the same resin and fiber loading is the cheaper answer than fighting it shot to shot.'),
      p('The mold side is the expensive answer. Rapid-heat-cycle or variotherm molding heats the cavity surface well above the normal mold temperature during fill, so the skin stays molten across the whole flow path, then cools it for ejection. It is the most complete fix for fiber float and weld-line whitening both, and it costs the most in tooling and cycle. Short of that, a matte or textured surface finish does not stop the fiber floating but stops it reading as a defect — it breaks up the reflection that makes the haze visible, which is why so many glass-filled parts are specified textured in the first place.'),
      h2('The short version'),
      p('Floating fiber is not a diagnosis problem once the fiber is confirmed — it is an order-of-operations problem. Raise the mold temperature toward the top of the band first, because that fixes most of them. Raise injection speed next. Nudge melt temperature up, but not past the point where it degrades the bond. If the process band runs out, move to a surface grade of the resin, and only then to variotherm tooling or a texture that hides what you cannot prevent. The sequence matters because each step costs more than the one before it, and most parts never need to leave the first.'),
      p('Mold Doctor takes a photo of the defect and your process settings and estimates the likely causes and what to adjust. Tell it the resin is glass-filled and the white surface stops reading as drying and starts reading as fiber, with mold temperature at the top of the list where it belongs.'),
    ],
  },
  {
    slug: 'halogen-free-flame-retardant-corrosion',
    title: 'A halogen-free flame retardant wore out the feed screw in three months',
    description: 'Why flame-retardant PPA corrodes the screw and barrel, why the halogen-free grade can be harder on the machine than the halogenated one it replaced, and the three process levers — drying, heat, shutdown — that decide how fast it happens.',
    publishedAt: '2026-08-11',
    thumb: 'fr-corrosion',
    body: [
      p('Flame-retardant PPA is one of the few resins that damages the machine faster than it damages the part. A feed screw that would last years on unfilled nylon can come out of a flame-retardant PPA job looking etched in a matter of weeks. The corrosion is not a defect in the usual sense. It is chemistry doing exactly what it does, and most of the levers that slow it down are set at the press.'),
      p('The part that surprised me is the direction. The industry moved off halogenated flame retardants for good reasons, and the halogen-free grade that replaced them is often the more corrosive one to run.'),
      h2('What is actually attacking the metal'),
      p('A flame retardant works by releasing something during thermal decomposition. That is the whole point of it. The question for the machine is what gets released, and whether it is acidic.'),
      p('Halogenated systems — brominated or chlorinated, usually with an antimony trioxide synergist — release hydrogen halides when they get hot. HBr, HCl. Those combine with any moisture present and become acid, and that acid etches steel. This is old and well understood, and it is why halogenated resins have a reputation for eating tooling.'),
      p('Halogen-free flame retardants for high-temperature nylons are mostly phosphorus. Two kinds matter here. Metal phosphinates — aluminum diethylphosphinate is the common one, sold under names like Exolit OP — and red phosphorus in the cheaper grades. Both are phosphorus, and under heat and moisture both can end up as phosphorus oxyacids: phosphoric and phosphorous acid. Red phosphorus is the more aggressive of the two, because it reacts with moisture and heat to give off phosphine gas and leave acid behind, and it carries its own black color into any speck it forms.'),
      p('Here is the part that trips people up. The datasheet for a phosphorus flame retardant will often say it avoids the corrosion problem of halogenated systems, and for a lot of resins that is true — the aromatic phosphates used in PC and ABS are genuinely mild. But PPA is not PC. It melts around 320 to 345°C, far hotter than the halogenated PA66 it often replaces, and phosphoric acid does not boil off at those temperatures the way a hydrogen halide partly does. It stays, it concentrates, and it sits on the screw. The chemistry the datasheet measured and the chemistry that happens in a hot PPA barrel at the end of a shift are not the same event.'),
      p('The clearest evidence that this is real is that the material suppliers now sell around it. BASF released a flame-retardant PPA in 2022 whose headline feature was that it does not corrode the connector\'s metal contacts. You do not engineer and market a non-corrosive grade unless the corrosive one was a problem people were living with.'),
      diagram('fr-paths'),
      h2('The grade sets the speed'),
      p('PPA is not one material. It is a family — PA6T, PA6T/66, PA9T, PA10T and a few more — and they do not all run at the same temperature. The flame retardant is what corrodes the barrel, not the base resin. But the base resin decides how hot the barrel has to be, and heat is what turns the retardant into acid.'),
      p('The spread is real. A PA10T grade processes around 310 to 330°C. A PA6T grade runs 330 to 340°C. That is twenty or thirty degrees on a resin where the retardant is already close to its own decomposition point, and the hotter grade gives the same retardant more chance to break down on every shot. If the grade is yours to choose and the part allows it, the cooler-running one is easier on the screw.'),
      p('Moisture cuts the other way, and it is the part people get backwards. The semi-aromatic PPAs are low-absorption resins — the aromatic rings in the backbone block water from bonding to the amide groups, so they take up around 0.3 to 0.5%, against 1.5 to 2% for a standard PA66. PA9T and PA10T are the lowest of the low. That reads like permission to run them wet. It is not. The corrosion does not care how much water the resin holds at equilibrium; it cares how much is in the barrel during the shot, and even a low-absorption grade holds enough to feed the reaction if it goes in undried.'),
      p('So the base grade is usually not your call — it is set by the part\'s temperature and mechanical spec. But it tells you how much margin you are working with. A hot PA6T grade on a flame-retardant compound is the combination that eats screws fastest, and it is the one where the levers below stop being optional.'),
      diagram('fr-ppa-grades'),
      h2('The three levers that decide how fast'),
      p('The metallurgy is mostly bought, not set. But how quickly the metal you have gets consumed is set at the press, and it comes down to three things.'),
      p('The first lever is moisture, and it is the one most often lost. PPA is hygroscopic, so it arrives wet and picks up more from the air. Water does two bad things at once here. It hydrolyzes the polymer, which drops molecular weight and shows up as splay and brittleness. And it feeds the reaction that turns the flame retardant into acid. So under-drying does not just give you a cosmetic defect — it accelerates the corrosion underneath it. Amodel\'s guide asks for the resin under 0.10% moisture, dried at 110 to 120°C for at least four hours, on a desiccant dryer holding a −30°C dew point. Those numbers are not about surface finish. They are the difference between running dry acid precursors and running wet ones.'),
      p('The second lever is heat and residence time. Every degree and every extra minute in the barrel gives the flame retardant more chance to break down into acid. PPA already runs hot; the instruction is to stay in the 320 to 345°C band and treat 350°C as a ceiling, above which the polymer itself degrades. Residence time should stay under about six minutes. This is where an oversized barrel quietly hurts you: a small shot in a large barrel sits hot for a long time, and a flame-retardant grade punishes that far more than a plain resin does. If the shot-to-barrel ratio is wrong for the job, the corrosion clock runs faster than the cycle does.'),
      p('The third lever is shutdown. The acid does its worst work when the machine is not moving. Resin left sitting in a hot barrel over a break, a weekend, or overnight is acid in contact with steel with nothing flushing it. The fix is to purge the machine empty before it goes cold. Amodel\'s procedure is to purge the screw clear of resin and then run high-density polyethylene through until it comes out clean. HDPE has no flame retardant in it, so what is sitting against the screw through the shutdown is inert.'),
      diagram('fr-levers'),
      h2('When the screw is already going'),
      p('If the levers were missed for long enough, the machine tells you before the parts do. A screw that is corroding takes on a rough, pitted surface — one coatings vendor describes it as orange-peel after four to six weeks, and powder-metallurgy screws consumed in as little as three months on this kind of material. Non-return valve check rings wear out and stop sealing, so cushion and shot size drift. Flakes of corrosion product then show up in the parts as black specks.'),
      diagram('fr-barrel'),
      p('The metallurgy answer is not a process setting, but it is worth knowing so the problem gets sent to the right place. Standard hardened tool steel is not enough for a steady diet of flame-retardant PPA. Tungsten-carbide encapsulation applied by HVOF, or a genuinely corrosion-resistant barrel and screw, is what takes a three-month screw life out to eighteen or twenty-four months. That is a capital decision, not a shift decision — but a molder who knows the black specks are corrosion product, not contamination, is the one who makes the case for it instead of chasing a phantom material problem.'),
      h2('How it reaches you as a defect'),
      p('The reason a process engineer cares about barrel chemistry is that it arrives disguised as ordinary defects. Black specks read as contamination. Splay reads as wet resin. Discoloration reads as overheating. On a flame-retardant PPA all three can be the same underlying event — the flame retardant breaking down and taking the metal with it — and the fix for each is on the same three levers above, not on the ones you would reach for if you took the defect at face value.'),
      p('That is the case this note is really about. On a flame-retardant PPA, "black specks" is not one cause. It could be corrosion product from a going screw, unpurged degraded resin from the last shutdown, or scorch from trapped air. They look alike and they do not share a fix.'),
      p('Mold Doctor takes a photo of the defect and your process settings and estimates the likely causes and what to adjust. Telling it the resin is a flame-retardant PPA is what lets it weigh drying, residence time and shutdown discipline ahead of the causes that would top the list on a plainer material.'),
    ],
  },
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

/** 홈 Notes 섹션(home-notes-redesign-v1)용 — 배열 앞에서 count건. /en/notes와 동일한 배열 순서. */
export function getLatestNotes(count: number): Note[] {
  return NOTES.slice(0, count);
}

export interface HomeNoteCard {
  slug: string;
  title: string;
  description: string;
  titleKo: string | null; // KO 있으면 KO 제목, 없으면 null(EN 폴백)
  descriptionKo: string | null;
  publishedAt: string;
  thumbSvg: string | null; // 서버에서 읽은 인라인 SVG(EN). thumb 없으면 null
  thumbSvgKo: string | null; // KO 인라인 SVG(.ko.svg). 없으면 null(EN 폴백)
  thumbImage?: string | null; // 래스터 사진 경로. 있으면 렌더러가 thumbSvg보다 우선 사용(로케일 무관)
}

// ── 노트 시리즈 (en-notes-series-nav-v1) ─────────────────────────
// slugs는 읽는 순서(1→N). NOTES 배열(최신순)의 역순 — 손으로 확정, 배열에서 자동 도출 금지.
export interface NoteSeries {
  id: string;
  name: string;      // 사용자 노출 시리즈명
  slugs: string[];
}

export const NOTE_SERIES: NoteSeries[] = [
  { id: 'nmt', name: 'Nano molding: NMT & TRI', slugs: [
    'nmt-metal-resin-bonding',            // part 1 원리·정의
    'nmt-antenna-lines-waterproofing',    // part 2 적용사례
    'nmt-resin-metal-combinations',       // part 3 레진·금속 조합
    'nmt-bond-failure-troubleshooting',   // part 4 불량·트러블슈팅
  ]},
];

export function getSeriesForNote(slug: string): { series: NoteSeries; index: number } | null {
  for (const s of NOTE_SERIES) {
    const i = s.slugs.indexOf(slug);
    if (i >= 0) return { series: s, index: i };
  }
  return null;
}
