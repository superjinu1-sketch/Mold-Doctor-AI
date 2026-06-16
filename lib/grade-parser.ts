// lib/grade-parser.ts
// resin-grade Tier-1 패턴 파서 (외부 호출 0, 순수 동기 함수).
// 정본 스펙: specs/grade-parser-pattern-spec-v1.md / 검증: specs/grade-parser-test-matrix-v1.md
// 핵심 원칙(§5): 환각 채움 0. 확실한 것만 채우고, 불확실하면 빈칸/null → LLM 폴백.
// 매칭 순서(§3): 3a 직접 화학표기 → 3b 트레이드명 매핑 → 3c 벤더 필러코드. 앞에서 확정되면 중단.

export type Filler =
  | '없음' | 'GF(유리섬유)' | 'CF(탄소섬유)' | 'GF+CF'
  | '미네랄' | '탈크' | 'GB(유리비드)' | '기타';

export type FlameRetardant =
  | '없음' | 'UL94 V-0' | 'UL94 V-1' | 'UL94 V-2'
  | 'UL94 HB' | 'UL94 5VA' | 'UL94 5VB';

export type FlameRetardantType =
  | '해당없음' | '할로겐' | '할로겐프리' | '적인계' | '멜라민계';

export interface GradeParseResult {
  resinType: string | null;            // RESIN_KB 키(§부록 A) 또는 null
  filler: Filler;
  fillerContent: string;               // 숫자 문자열 또는 ''
  flameRetardant: FlameRetardant;
  flameRetardantType: FlameRetardantType;
  confidence: 'high' | 'med' | 'low';  // 패턴 파서는 high/med만 산출
  source: 'pattern';
  note?: string;
}

/* ── §부록 A — RESIN_KB 52키 자기-별칭 + 약어 별칭 ────────────────────────────
 * alias(정규화 후 대문자) → canonical RESIN_KB 키. 긴 별칭 우선 매칭(§3a CRITICAL). */
const FAMILY_ALIASES: ReadonlyArray<readonly [string, string]> = [
  // 블렌드 (먼저) — RESIN_KB는 '/' 표기. 입력 '+'는 매칭 전 '/'로 정규화한다.
  ['PC/ABS', 'PC/ABS'], ['PC/PBT', 'PC/PBT'], ['PA/ABS', 'PA/ABS'],
  ['PA/PP', 'PA/PP'], ['PPE/PA', 'PPE/PA'], ['PBT/ABS', 'PBT/ABS'],
  ['PPE/PPO', 'PPE/PPO'], ['PA6/66', 'PA6/66'],
  // PA 계열 — 긴 키 우선 (PA66을 PA6으로 오인 금지)
  ['PA1010', 'PA1010'], ['PA12T', 'PA12T'], ['PA10T', 'PA10T'],
  ['PA410', 'PA410'], ['PA610', 'PA610'], ['PA612', 'PA612'],
  ['PA46', 'PA46'], ['PA4T', 'PA4T'], ['PA6T', 'PA6T'], ['PA9T', 'PA9T'],
  ['PA12', 'PA12'], ['PA66', 'PA66'], ['PA6', 'PA6'], ['MXD6', 'MXD6'],
  // 한글/약어 병기 키
  ['POM(아세탈)', 'POM(아세탈)'], ['아세탈', 'POM(아세탈)'], ['ACETAL', 'POM(아세탈)'], ['POM', 'POM(아세탈)'],
  ['PMMA(아크릴)', 'PMMA(아크릴)'], ['아크릴', 'PMMA(아크릴)'], ['PMMA', 'PMMA(아크릴)'],
  ['PE(HDPE)', 'PE(HDPE)'], ['HDPE', 'PE(HDPE)'],
  ['PE(LLDPE)', 'PE(LLDPE)'], ['LLDPE', 'PE(LLDPE)'],
  ['PE(LDPE)', 'PE(LDPE)'], ['LDPE', 'PE(LDPE)'],
  ['M-PPE', 'm-PPE'],
  // 단일 키 — 긴 것 우선
  ['PPSU', 'PPSU'], ['PEEK', 'PEEK'], ['TPEE', 'TPEE'],
  ['PCT', 'PCT'], ['PEN', 'PEN'], ['PPS', 'PPS'], ['LCP', 'LCP'],
  ['PEI', 'PEI'], ['PAI', 'PAI'], ['PSU', 'PSU'], ['PES', 'PES'],
  ['PPO', 'PPE/PPO'], ['PPE', 'PPE/PPO'],
  ['PBT', 'PBT'], ['PET', 'PET'], ['ABS', 'ABS'], ['SAN', 'SAN'],
  ['ASA', 'ASA'], ['PVC', 'PVC'], ['TPU', 'TPU'], ['TPC', 'TPC'],
  ['TPO', 'TPO'], ['TPE', 'TPE'],
  ['PC', 'PC'], ['PP', 'PP'], ['PS', 'PS'],
];

/* ── §3b 트레이드명 → 계열 (교차검증된 것만). 표에 없으면 추측 금지(LLM 위임). ── */
type Vendor = 'dupont' | 'lanxess' | 'basf' | null;
interface BrandEntry {
  brand: string;                 // 정규화(대문자) 후 매칭할 브랜드 토큰
  vendor: Vendor;                // §3c 필러코드 디코드용
  conf: 'high' | 'med';          // 계열 확신도
  family?: string;               // 고정 계열
  defaultFiller?: Filler;        // 브랜드 자체가 함의하는 필러(예: MINLON=미네랄)
  sub?: ReadonlyArray<readonly [RegExp, string]>; // 접미문자 → 계열 (ULTRAMID 등)
}

// 긴 브랜드 우선 매칭 (ULTRAMID/ULTRADUR/ULTRAFORM/ULTRASON 혼동 방지)
const BRANDS: ReadonlyArray<BrandEntry> = [
  { brand: 'MINLON', vendor: 'dupont', conf: 'high', family: 'PA66', defaultFiller: '미네랄' },
  { brand: 'ULTRAMID', vendor: 'basf', conf: 'high', sub: [
    [/\bC/, 'PA6/66'], [/\bT/, 'PA6T'], [/\bA/, 'PA66'], [/\bB/, 'PA6'],
  ] },
  { brand: 'ULTRADUR', vendor: null, conf: 'high', family: 'PBT' },
  { brand: 'ULTRAFORM', vendor: null, conf: 'high', family: 'POM(아세탈)' },
  { brand: 'ULTRASON', vendor: null, conf: 'med', sub: [
    [/\bE/, 'PES'], [/\bS/, 'PSU'], [/\bP/, 'PPSU'],
  ] },
  { brand: 'DURETHAN', vendor: 'lanxess', conf: 'high', sub: [
    [/\bAKV/, 'PA66'], [/\bBKV/, 'PA6'], [/\bA/, 'PA66'], [/\bB/, 'PA6'],
  ] },
  { brand: 'ZYTEL', vendor: 'dupont', conf: 'high', family: 'PA66' },
  { brand: 'RYNITE', vendor: 'dupont', conf: 'high', family: 'PET' },
  { brand: 'CRASTIN', vendor: 'dupont', conf: 'high', family: 'PBT' },
  { brand: 'DELRIN', vendor: null, conf: 'high', family: 'POM(아세탈)' },
  { brand: 'HYTREL', vendor: null, conf: 'med', family: 'TPC' },
  { brand: 'POCAN', vendor: null, conf: 'high', family: 'PBT' },
  { brand: 'LEXAN', vendor: null, conf: 'high', family: 'PC' },
  { brand: 'VALOX', vendor: null, conf: 'high', family: 'PBT' },
  { brand: 'NORYL', vendor: null, conf: 'high', family: 'm-PPE' },
  { brand: 'XENOY', vendor: null, conf: 'high', family: 'PC/PBT' },
  { brand: 'CYCOLOY', vendor: null, conf: 'high', family: 'PC/ABS' },
  { brand: 'CYCOLAC', vendor: null, conf: 'high', family: 'ABS' },
  { brand: 'GELOY', vendor: null, conf: 'high', family: 'ASA' },
  { brand: 'ULTEM', vendor: null, conf: 'high', family: 'PEI' },
  { brand: 'HOSTAFORM', vendor: null, conf: 'high', family: 'POM(아세탈)' },
  { brand: 'CELCON', vendor: null, conf: 'high', family: 'POM(아세탈)' },
  { brand: 'CELANEX', vendor: null, conf: 'high', family: 'PBT' },
  { brand: 'FORTRON', vendor: null, conf: 'high', family: 'PPS' },
  { brand: 'VECTRA', vendor: null, conf: 'high', family: 'LCP' },
  { brand: 'ZENITE', vendor: null, conf: 'high', family: 'LCP' },
  { brand: 'LAPEROS', vendor: null, conf: 'high', family: 'LCP' },
  { brand: 'DURACON', vendor: null, conf: 'high', family: 'POM(아세탈)' },
  { brand: 'DURANEX', vendor: null, conf: 'high', family: 'PBT' },
  { brand: 'AKULON', vendor: null, conf: 'med', family: 'PA6' },
  { brand: 'STANYL', vendor: null, conf: 'high', family: 'PA46' },
  { brand: 'ARNITEL', vendor: null, conf: 'med', family: 'TPC' },
  { brand: 'ARNITE', vendor: null, conf: 'med', family: 'PBT' },
  { brand: 'FORTII', vendor: null, conf: 'med', family: 'PA4T' },
  { brand: 'LEONA', vendor: null, conf: 'med', family: 'PA66' },
  { brand: 'AMILAN', vendor: null, conf: 'med', family: 'PA6' },
  { brand: 'TORAYCON', vendor: null, conf: 'high', family: 'PBT' },
  { brand: 'TORELINA', vendor: null, conf: 'high', family: 'PPS' },
  { brand: 'TENAC', vendor: null, conf: 'high', family: 'POM(아세탈)' },
  { brand: 'IUPILON', vendor: null, conf: 'high', family: 'PC' },
  { brand: 'NOVAREX', vendor: null, conf: 'high', family: 'PC' },
  { brand: 'RENY', vendor: null, conf: 'high', family: 'MXD6' },
  { brand: 'AMODEL', vendor: null, conf: 'med', family: 'PA6T' },
  { brand: 'RYTON', vendor: null, conf: 'high', family: 'PPS' },
  { brand: 'UDEL', vendor: null, conf: 'high', family: 'PSU' },
  { brand: 'RADEL', vendor: null, conf: 'high', family: 'PPSU' },
  { brand: 'KETASPIRE', vendor: null, conf: 'high', family: 'PEEK' },
  { brand: 'VICTREX', vendor: null, conf: 'high', family: 'PEEK' },
  { brand: 'TORLON', vendor: null, conf: 'high', family: 'PAI' },
  { brand: 'KEPITAL', vendor: null, conf: 'high', family: 'POM(아세탈)' },
  { brand: '케피탈', vendor: null, conf: 'high', family: 'POM(아세탈)' },
  { brand: 'LUPOY', vendor: null, conf: 'high', family: 'PC' },
  { brand: 'LUPOX', vendor: null, conf: 'high', family: 'PBT' },
];

/* ── §2 정규화 ─────────────────────────────────────────────────────────── */
export function normalizeGrade(raw: string): string {
  let s = (raw ?? '').trim();
  // 전각→반각
  s = s.replace(/[！-～]/g, (c) => String.fromCharCode(c.charCodeAt(0) - 0xFEE0))
       .replace(/　/g, ' ');
  // 로마자만 대문자화 (한글 등은 보존)
  s = s.replace(/[a-z]/g, (c) => c.toUpperCase());
  // 언더스코어/연속 하이픈 → 공백, 다중 공백 축약
  s = s.replace(/_/g, ' ').replace(/-{2,}/g, ' ').replace(/\s+/g, ' ').trim();
  return s;
}

// 매칭용 문자열: 하이픈→공백, '+'→'/'(블렌드), 공백 축약. (§2: 매칭은 공백/하이픈에 관대)
function toMatchString(normalized: string): string {
  return normalized.replace(/-/g, ' ').replace(/\+/g, '/').replace(/\s+/g, ' ').trim();
}

function notAlnum(ch: string | undefined): boolean {
  return ch === undefined || !/[A-Za-z0-9]/.test(ch);
}

/* ── §3a(1) 수지계열 — 긴 별칭 우선, 경계 검사 ──────────────────────────── */
function detectFamily(M: string): string | null {
  for (const [alias, canonical] of FAMILY_ALIASES) {
    let from = 0;
    while (true) {
      const idx = M.indexOf(alias, from);
      if (idx === -1) break;
      const before = idx > 0 ? M[idx - 1] : undefined;
      const after = M[idx + alias.length];
      // 선행: 영숫자 아님. 후행: 숫자가 아니어야 함(PA6를 PA66/PA610에서 오인 방지).
      // (후행이 글자면 필러코드 등으로 허용: PA66GF30)
      if (notAlnum(before) && (after === undefined || !/[0-9]/.test(after))) {
        return canonical;
      }
      from = idx + 1;
    }
  }
  return null;
}

/* ── §3b 브랜드 → 계열 ─────────────────────────────────────────────────── */
interface BrandHit { family: string | null; conf: 'high' | 'med'; vendor: Vendor; defaultFiller?: Filler; }
function detectBrand(M: string): BrandHit | null {
  for (const b of BRANDS) {
    const idx = M.indexOf(b.brand);
    if (idx === -1) continue;
    const before = idx > 0 ? M[idx - 1] : undefined;
    if (!notAlnum(before)) continue; // 브랜드 토큰 경계
    let family: string | null = b.family ?? null;
    if (b.sub) {
      const rest = M.slice(idx + b.brand.length); // 브랜드 뒤 (예: " A3EG6")
      family = null;
      for (const [re, fam] of b.sub) {
        if (re.test(rest)) { family = fam; break; }
      }
    }
    return { family, conf: b.conf, vendor: b.vendor, defaultFiller: b.defaultFiller };
  }
  return null;
}

/* ── §3a(2) ISO 필러 토큰 + 리터럴 % ───────────────────────────────────── */
const FILLER_TOKEN: ReadonlyArray<readonly [RegExp, Filler, string]> = [
  // [감지 정규식, filler, 함량 추출용 코드심볼]
  [/GF|GR|유리섬유|GLASS\s*FIB/, 'GF(유리섬유)', 'GF'],
  [/CF|탄소섬유|CARBON\s*FIB/, 'CF(탄소섬유)', 'CF'],
  [/GB|유리비드|GLASS\s*BEAD/, 'GB(유리비드)', 'GB'],
  [/TD|탈크|TALC(UM)?/, '탈크', 'TD'],
  [/MD|미네랄|MINERAL/, '미네랄', 'MD'],
];

function extractContentFor(M: string, code: string): string {
  // 코드 뒤 또는 앞(%선행)의 1~2자리 숫자. 변형 허용: GF30 / GF 30 / 30%GF / (GF30)
  const after = new RegExp(code + '\\s*(\\d{1,2})').exec(M);
  if (after) return after[1];
  // %선행 변형(예 "30%GF")만 허용. '%' 필수 — 계열 숫자(PA66 등)를 함량으로 오인 금지.
  const before = new RegExp('(\\d{1,2})\\s*%\\s*' + code).exec(M);
  if (before) return before[1];
  return '';
}

function detectFillerISO(M: string): { filler: Filler; content: string } {
  const hasGF = FILLER_TOKEN[0][0].test(M);
  const hasCF = FILLER_TOKEN[1][0].test(M);
  if (hasGF && hasCF) return { filler: 'GF+CF', content: '' };
  for (const [re, filler, code] of FILLER_TOKEN) {
    if (re.test(M)) return { filler, content: extractContentFor(M, code) };
  }
  return { filler: '없음', content: '' };
}

/* ── §3c 벤더 필러코드 디코드 (벤더 확정 시에만) ───────────────────────── */
function decodeVendorFiller(M: string, vendor: Vendor): { filler: Filler; content: string } | null {
  if (vendor === 'lanxess') {
    const m = /[AB]KV(\d{1,2})/.exec(M);
    if (m) return { filler: 'GF(유리섬유)', content: m[1] }; // KV = 유리강화, 리터럴 %
    return null;
  }
  if (vendor === 'dupont') {
    const m = /G(\d{1,2})/.exec(M);
    if (m) return { filler: 'GF(유리섬유)', content: m[1] }; // G## = GF, 리터럴 %
    return null;
  }
  if (vendor === 'basf') {
    const m = /G(\d)/.exec(M);
    if (m) return { filler: 'GF(유리섬유)', content: String(Number(m[1]) * 5) }; // ⚠ ×5 예외
    return null;
  }
  return null;
}

/* ── §3a(3) 난연 ──────────────────────────────────────────────────────── */
function detectFlame(M: string): { flame: FlameRetardant; type: FlameRetardantType; note?: string } {
  let flame: FlameRetardant = '없음';
  let note: string | undefined;
  if (/\b5VA\b/.test(M)) flame = 'UL94 5VA';
  else if (/\b5VB\b/.test(M)) flame = 'UL94 5VB';
  else if (/\b(?:UL94\s*)?(?:94)?V\s*-?\s*0\b/.test(M)) flame = 'UL94 V-0';
  else if (/\b(?:UL94\s*)?(?:94)?V\s*-?\s*1\b/.test(M)) flame = 'UL94 V-1';
  else if (/\b(?:UL94\s*)?(?:94)?V\s*-?\s*2\b/.test(M)) flame = 'UL94 V-2';
  else if (/\bHB\b/.test(M)) flame = 'UL94 HB';
  else if (/\bFR\b|난연/.test(M)) note = 'FR-unclassified'; // 등급 불명 → 추측 금지

  let type: FlameRetardantType = '해당없음';
  if (/HF|할로겐프리|HALOGEN.?FREE|NON.?HALOGEN/.test(M)) type = '할로겐프리';
  else if (/적인|RED\s*PHOSPH/.test(M)) type = '적인계';
  else if (/멜라민|MELAMINE/.test(M)) type = '멜라민계';
  return { flame, type, note };
}

/* ── 메인: parseGrade ──────────────────────────────────────────────────── */
export function parseGrade(raw: string): GradeParseResult | null {
  const normalized = normalizeGrade(raw);
  if (!normalized) return null; // 빈 입력 방어
  const M = toMatchString(normalized);

  // 계열 확정: 3a 직접 화학표기 → 3b 브랜드
  let resinType = detectFamily(M);
  let famConf: 'high' | 'med' = 'high';
  let vendor: Vendor = null;
  let brandDefaultFiller: Filler | undefined;

  if (!resinType) {
    const brand = detectBrand(M);
    if (brand && brand.family) {
      resinType = brand.family;
      famConf = brand.conf;
      vendor = brand.vendor;
      brandDefaultFiller = brand.defaultFiller;
    }
  }

  // 계열 미확정 → 전체 null (LLM 위임 신호, §5-1)
  if (!resinType) return null;

  // 필러: 브랜드 디폴트 > ISO 토큰(직접표기) > 벤더 코드(3c)
  let filler: Filler = '없음';
  let fillerContent = '';
  if (brandDefaultFiller) {
    filler = brandDefaultFiller;
    fillerContent = ''; // 미네랄 등 디폴트는 % 추측 금지
  } else {
    const iso = detectFillerISO(M);
    if (iso.filler !== '없음') {
      filler = iso.filler;
      fillerContent = iso.content;
    } else if (vendor) {
      const dec = decodeVendorFiller(M, vendor);
      if (dec) { filler = dec.filler; fillerContent = dec.content; }
    }
  }

  // 난연
  const fr = detectFlame(M);

  // confidence (§4)
  let confidence: 'high' | 'med' | 'low' = 'high';
  if (famConf === 'med') {
    confidence = 'med'; // 브랜드 계열 세부 불확정
  } else if (filler !== '없음' && fillerContent === '') {
    confidence = 'med'; // 필러 종류는 알지만 % 불명
  } else if (vendor === 'dupont' && filler === '없음') {
    // DuPont 계열은 GF를 G## 코드로 표기 → 코드 없으면 무강화 여부 불확실 → 확인 필요
    confidence = 'med';
  }

  return {
    resinType,
    filler,
    fillerContent,
    flameRetardant: fr.flame,
    flameRetardantType: fr.type,
    confidence,
    source: 'pattern',
    ...(fr.note ? { note: fr.note } : {}),
  };
}
