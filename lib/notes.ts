// 영문 콘텐츠 축 B(/en/notes) 글 데이터 단일 소스. 본문은 진우 확정본 — 문구를 다듬지 않는다.
// /en/about과 동일 원칙: 문법 교정·표현 개선·문장 병합 전부 금지.
export type NoteDiagramId = 'cross-section' | 'flow' | 'weld-flow' | 'weld-section' | 'clamp-calc' | 'clamp-flow' | 'fr-paths' | 'fr-ppa-grades' | 'fr-barrel' | 'fr-levers' | 'fiber-float-fountain' | 'fiber-float-resins' | 'fiber-float-section' | 'nmt-pores' | 'nmt-families';

export type NoteBlock =
  | { type: 'p'; text: string }
  | { type: 'h2'; text: string }
  | { type: 'diagram'; id: NoteDiagramId };

// lib/notesDiagramSvg.ts(node:fs 사용, 서버 전용)가 이 타입을 가져다 쓴다 — 반대 방향(이 파일이
// notesDiagramSvg.ts에서 import)이면 lib/notes.ts를 가져다 쓰는 클라이언트 컴포넌트(app/page.tsx)가
// 번들러 설정에 따라 fs를 함께 끌고 들어올 위험이 있어 여기서 정의한다(notes-list-thumbnail-v1).
export type NoteThumbId = 'splay-branch' | 'weld-strength' | 'clamp-window' | 'fr-corrosion' | 'fiber-float' | 'nmt-bond';

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
  publishedAt: string;
  thumbSvg: string | null; // 서버에서 읽은 인라인 SVG. thumb 없으면 null
}
