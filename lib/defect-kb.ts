// lib/defect-kb.ts — 불량 진단 트리 KB v1.6
// 정본: docs/defect_taxonomy.md. 수치 범위: lib/resin-kb.ts 참조(중복 금지).
// 거버넌스: 출력은 "추정/조정안", 게이트는 "조언"톤("~일 수 있다"), 제조사 브랜드명 0.
// 수정 순서: taxonomy.md → 이 파일 → KB_VERSION bump → eval 회귀.
import type { ResinSpec } from './resin-kb';

export const KB_VERSION = 'defect-kb-v1.7';

export type Cause = {
  rank: number;
  cause: string;
  category: 'Machine' | 'Material' | 'Mold' | 'Method';
  baseProbability?: number;
  trigger: string;
  evidence: string;
  verification: string;
  adjustment: string;
};

export type DefectNode = {
  id: string;
  nameKo: string;
  nameEn: string;
  phase: string;
  discriminators: string;
  typicalSeverity?: string;   // 통상 심각도 힌트 — 모델 과대평가 방지용 가이드
  causes: Cause[];
  patternHints?: Record<string, string>;
  sharedGates?: string[];
  priorityLogic?: string;
  source?: string;
  confidence?: 'high' | 'med' | 'low';
};

export type SharedGate = {
  id: string;
  appliesTo: string[];
  trigger: string;
  guidance: string;
  flags?: string;
};

// ── 공유 게이트 ────────────────────────────────────────────────
export const SHARED_GATES: Record<string, SharedGate> = {
  mold_temp_insufficient: {
    id: 'mold_temp_insufficient',
    appliesTo: ['weld_line','flow_mark','short_shot','fiber_readout','surface_gloss','tiger_stripe','record_groove','gate_blush'],
    trigger: '금형온도 설정값 < resin-kb 권장 하한, 또는 super-engineering 수지(PPS·LCP·PEEK·PEI·PPSU 등), 또는 GF 강화 수지인 경우',
    guidance: `[금형온도 조언 — 참고용]
- 셋팅값과 실제 금형표면 온도는 차이가 있을 수 있습니다. 배관 열손실로 실제 온도가 설정보다 최대 40°C 낮을 수 있습니다.
- 금형 개폐 시 heat sink, 웜업샷 부족(예열 10샷·15분+) 시 실제 온도가 낮을 수 있습니다.
- GF 강화 수지: 금형온도 부족 → 섬유 표면노출·백화 가능성이 있습니다.
- Super EP(PPS·PEEK 등): 결정화 부족 → 강도·치수 불안정 가능성이 있습니다.
- 초기 샷에만 발생 → 워밍업 부족 가능성. 지속 발생 → 가열 용량 부족 가능성.
- 온수기(상한 ~149°C)·가압수(~160°C)·오일 TCU(~288°C) 한계 시 카트리지(히터봉) 직접 삽입 방식이 도움될 수 있습니다.
- 금형 실측(표면 2mm 내 열전대)이 가능하면 확인 권장(강제 X).`,
    flags: 'exclude:silver_streak,flash,burn_mark,sink_mark',
  },
};

// ── 불량 KB (진입점 12종 풀 + 나머지 18종 골격) ─────────────────
export const DEFECT_KB: Record<string, DefectNode> = {

  // ─── 1. Short Shot (미성형) ─────────────────────────────────
  short_shot: {
    id: 'short_shot', nameKo: '미성형', nameEn: 'Short Shot', phase: '충전',
    typicalSeverity: 'medium~high (전수 미충전·기능부품 강도 직결 시 high)',
    discriminators: '말단·리브·보스 미충전. 단면 매끄럽고 광택=단순 미충전 / 끝단 탄화=Air Trap 겸발 / 복수 캐비티 균등=사출량·밸런스 문제.',
    causes: [
      { rank: 1, cause: '사출 압력·속도·멜트온도 부족', category: 'Machine',
        baseProbability: 50,
        trigger: '충전 말단 20~30% 고저항 구간에서 압력·속도 부족',
        evidence: '사출압·속도·멜트온도 입력값. resin-kb meltC·moldC 범위 대비.',
        verification: '사출속도 10% 씩↑ 단계 테스트. 최대 캐비티압 모니터.',
        adjustment: '멜트온도↑, 사출속도↑(과하면 제팅·플래시), 사출압↑.' },
      { rank: 2, cause: '게이트·런너 과소 또는 특정캐비티 밸런스 불량', category: 'Mold',
        baseProbability: 25,
        trigger: '특정 캐비티만 반복 미충전, 또는 게이트 단면 < 벽두께 50%',
        evidence: '게이트 타입·캐비티 수. 특정 캐비티 패턴 여부.',
        verification: '불량 캐비티 위치 기록. 런너 밸런스 검토.',
        adjustment: '게이트 확대, 런너 밸런스 수정, 캐비티 수 조정.' },
      { rank: 3, cause: '금형온도 과저 또는 벤트 막힘', category: 'Mold',
        baseProbability: 15,
        trigger: 'resin-kb 권장 금형온도 미달 또는 Air Trap 겸발(끝단 탄화)',
        evidence: '금형온도 입력값. 벤트 청소 이력.',
        verification: '금형온도 10°C 올린 후 재시험. 벤트 청소 후 재시험.',
        adjustment: '금형온도↑, 벤트 추가·청소.' },
    ],
    patternHints: {
      '특정 캐비티': '2순위(게이트 밸런스) 강점 분기',
      '끝단 탄화': 'Air Trap 겸발 — 벤팅 먼저 확인',
      '배치 산발': 'Material/계량 불안정 검토',
    },
    sharedGates: ['mold_temp_insufficient'],
    priorityLogic: '특정캐비티만=Mold 우선. 전체 균등=Machine/Method. Air Trap 겸발=벤팅 먼저.',
    source: 'synthesis-1.1,taxonomy-1', confidence: 'high',
  },

  // ─── 2. Flash (플래시/버) ──────────────────────────────────
  flash: {
    id: 'flash', nameKo: '플래시/버', nameEn: 'Flash', phase: '충전/보압(형체력·점도 침투)',
    typicalSeverity: 'medium (소량·외관). 치수·기능 직결 시 medium~high',
    discriminators: '파팅면 전체둘레=클램프 부족·과압 / 특정위치 반복=금형마모·핀 clearance / 이젝터핀 주변=clearance.',
    causes: [
      { rank: 1, cause: '클램프력 부족 + 과도 사출·홀드압', category: 'Machine',
        baseProbability: 55,
        trigger: '캐비티압×투영면적 > 클램프력. 사출·홀드압 과고.',
        evidence: '클램프력·사출압·홀드압 입력값.',
        verification: '클램프력 계산(투영면적×캐비티압÷9.8≈ton). 블루마킹(밀착패턴).',
        adjustment: '클램프력↑(과도시 벤트 압착→Diesel 주의), 홀드압↓, V/P 전환 앞당김.' },
      { rank: 2, cause: '파팅면 마모·이물·평행도 불량', category: 'Mold',
        baseProbability: 30,
        trigger: '특정 위치 반복. 금형 장기 사용 이력.',
        evidence: '게이트 타입. 불량 위치 패턴.',
        verification: '블루마킹(파팅면 밀착 패턴). 이물 육안 확인.',
        adjustment: '파팅면 재연마, 이물 제거, 이젝터핀 clearance 수정.' },
      { rank: 3, cause: '극저점도 super EP(LCP·PPS·PA4T·PA6T) — 홀딩압·정밀도 우선', category: 'Material',
        baseProbability: 10,
        trigger: 'resin-kb super-engineering 수지(LCP·PPS·PA4T·PA6T 등) + 파팅면 전체 or 미세 버.',
        evidence: '수지 종류(resin-kb tier=super-engineering). 불량 분포.',
        verification: '홀딩압↓ + V/P 전환 앞당김 후 재시험.',
        adjustment: 'holding/packing 압력 최소화, V/P 전환 위치 앞당김, PL면 정밀도 점검. (단순 클램프력↑만으론 한계)' },
      { rank: 4, cause: '저점도 수지 + 고온', category: 'Material',
        baseProbability: 5,
        trigger: 'PP·PA·POM 등 저점도 수지, 멜트온도 과고',
        evidence: '수지 종류(resin-kb 참조). 멜트온도.',
        verification: '멜트온도 10°C↓ 후 재시험.',
        adjustment: '멜트온도 소폭↓, 사출속도↓.' },
    ],
    patternHints: {
      '전체 둘레': '1순위(클램프·과압) 강점 분기',
      '특정 위치': '2순위(금형마모) 강점 분기',
      '이젝터 주변': '이젝터 clearance 확인',
      'LCP|PPS|극저점도': '3순위(super EP) — holding압↓+V/P 앞당김 우선',
    },
    sharedGates: [],
    priorityLogic: '역설 주의: 클램프력 과도 → 벤트 압착 → Diesel 겸발. 필요최소 클램프력 사용. LCP·PPS 등 극저점도=holding압↓+V/P 전환+PL면 정밀도 우선.',
    source: 'synthesis-1.2,taxonomy-2', confidence: 'high',
  },

  // ─── 3. Jetting (제팅) ─────────────────────────────────────
  jetting: {
    id: 'jetting', nameKo: '제팅', nameEn: 'Jetting', phase: '충전',
    typicalSeverity: 'medium (외관)',
    discriminators: '게이트서 시작하는 구불구불한 지렁이·뱀 줄무늬. 동심원=흐름자국 / 직선=웰드라인(게이트서 시작 X)과 구분.',
    causes: [
      { rank: 1, cause: '게이트 위치·크기 부적절 + 사출속도 과고', category: 'Mold',
        baseProbability: 60,
        trigger: '게이트가 오픈공간 정면. 게이트 두께 < 벽두께 50~80%.',
        evidence: '게이트 타입. 사출속도. 불량 패턴(구불선).',
        verification: '사단사출 1단 속도만↓ → 소멸=Process / 미소멸=Gate 설계.',
        adjustment: '게이트통과 속도↓(다단), 게이트 위치 벽면방향, 게이트 확대.' },
      { rank: 2, cause: '멜트온도·금형온도 과저', category: 'Method',
        baseProbability: 25,
        trigger: '멜트온도 resin-kb 권장 하한 근방. 제트 조기 고화.',
        evidence: '멜트온도·금형온도 입력값.',
        verification: '멜트온도 10°C↑ 후 재시험.',
        adjustment: '멜트온도↑, 금형온도↑.' },
    ],
    patternHints: {
      '구불구불': '제팅 특징. 게이트 속도·위치 확인.',
      '동심원': '흐름자국(flow mark)으로 재분류 검토',
    },
    sharedGates: [],
    source: 'synthesis-1.3,taxonomy-3', confidence: 'high',
  },

  // ─── 4. Weld Line (웰드라인) ───────────────────────────────
  weld_line: {
    id: 'weld_line', nameKo: '웰드라인', nameEn: 'Weld Line', phase: '충전',
    typicalSeverity: 'medium (외관). GF 수지 강도 직결·기능부품 시 high',
    discriminators: '홀·보스·코어핀 주변, 멀티게이트 합류부 가는 선. 합류각<135°=weld(강도저하 큼) / >135°=meld. GF수지=강도 모재 50~80%↓. 닦아도 안 지워지는 구조적 선. 닦으면 옅어지는 백색 잔류물이면 웰드 아님 → mold_deposit(석출) 검토.',
    causes: [
      { rank: 1, cause: '멜트온도 부족 (강도 기여 71%)', category: 'Method',
        baseProbability: 45,
        trigger: '멜트온도 resin-kb meltC.min 근방 또는 미달',
        evidence: '노즐·배럴 온도 입력값. resin-kb meltC 범위 대비.',
        verification: '멜트온도 +10℃ 후 V홈 깊이 감소 확인(7→3μm 사례).',
        adjustment: '멜트온도↑(최우선), 금형온도↑.' },
      { rank: 2, cause: '홀드압·사출속도 부족', category: 'Machine',
        baseProbability: 20,
        trigger: '홀드압 사출1차압의 50% 미만. 사출속도 느림.',
        evidence: '홀드압·사출속도 입력값.',
        verification: '홀드압 단계↑ 후 웰드선 감소 확인.',
        adjustment: '홀드압↑, 사출속도↑.' },
      { rank: 3, cause: '게이트 위치·구조적 웰드 불가피', category: 'Mold',
        baseProbability: 20,
        trigger: '홀·보스·코어핀 존재. 멀티게이트. 구조상 합류 위치 이동 필요. GF 함유 + 강도·파단 요구 기능부품이면 본 순위를 우선 검토.',
        evidence: '게이트 수·위치. 제품 구조(홀·보스 유무). GF 함유 여부·강도/파단 요구 여부.',
        verification: '게이트 위치 이동 시뮬레이션(Moldflow).',
        adjustment: '게이트 위치 이동(근본), 웰드 예측위치 벤트, 고유동 그레이드.' },
    ],
    patternHints: {
      '홀 주변 반복': '3순위(구조적 웰드) — 게이트 위치 변경 검토',
      '특정 캐비티': '런너 밸런스 검토',
      '강도 저하': 'GF 수지=섬유 배향 문제. 조건 조정 한계 → 게이트 위치 검토',
      '파단|부러짐|강도 부족|기능 불량': 'GF 수지면 섬유 배향 단절 = 조건 조정으로 해결 불가 영역. 게이트 위치 이동·웰드 위치 이동(금형)이 근본 대책. 조건 권고 시 한계를 명시할 것',
    },
    sharedGates: ['mold_temp_insufficient'],
    priorityLogic: '멜트온도 최우선(Taguchi 71% 기여). 구조적 웰드=조건만으론 한계, 게이트 위치 이동이 근본. 강도·파단 요구 시나리오(기능부품·GF 수지)에서는 Mold(게이트 위치) 원인을 우선 검토 — 멜트온도↑·보압↑은 V홈 외관을 개선해도 섬유 배향 단절로 인한 웰드부 강도는 모재 대비 크게 회복 못 함. 외관 양품 ≠ 강도 OK.',
    source: 'synthesis-1.4,taxonomy-4', confidence: 'high',
  },

  // ─── 5. Air Trap / Burn Mark (에어트랩·버닝) ───────────────
  air_trap_burn: {
    id: 'air_trap_burn', nameKo: '버닝/가스마크', nameEn: 'Burn Mark', phase: '충전',
    typicalSeverity: 'high (탄화·열분해 가스 안전 위험. POM=포름알데히드)',
    discriminators: '흑갈~흑색 탄화, 최말단·리브끝·보스내부·코너, 탄냄새. 은선(흰색·게이트서 시작·탄화없음)·변색(전체·위치 비선택)과 구분.',
    causes: [
      { rank: 1, cause: '벤트 부족·막힘', category: 'Mold',
        baseProbability: 55,
        trigger: '벤트 없음 또는 탄화 퇴적 막힘. 동일 위치 반복.',
        evidence: '불량 위치(말단·리브끝·보스 내). 기존 금형 갑작 발생=막힘 의심.',
        verification: '벤트 청소 후 재시험. Progressive Short-Shot(에어트랩 위치 확인).',
        adjustment: '벤트 추가·청소(최우선). 깊이: 결정성 0.025mm·비결정성 0.038mm.' },
      { rank: 2, cause: '사출속도 과고', category: 'Machine',
        baseProbability: 30,
        trigger: '사출속도 입력값 과다. 속도↓ 시 소멸 확인.',
        evidence: '사출속도 입력값.',
        verification: '사출속도 30~50%↓ 후 재시험.',
        adjustment: '사출속도↓, 다단 사출 적용.' },
      { rank: 3, cause: '클램프력 과고 → 벤트 압착', category: 'Machine',
        baseProbability: 10,
        trigger: '클램프력 계산값 대비 과도 적용. 플래시 없는데 버닝.',
        evidence: '클램프력 입력값. 투영면적 대비.',
        verification: '클램프력 필요최소로↓ 후 벤트 개방 확인.',
        adjustment: '클램프력 필요최소로↓.' },
    ],
    patternHints: {
      '말단 고정': '벤팅 먼저 확인(SPE: 항상 불충분 벤팅의 신호)',
      '기존 금형 갑작 발생': '벤트 막힘(탄화 퇴적) 확인',
      '탄냄새': 'POM·ABS 포름알데히드·부산물. 온도 엄수.',
    },
    sharedGates: [],
    priorityLogic: '벤팅 최우선(SPE). 클램프력 과도=벤트 압착 역설. 신금형=벤트 설계 누락 검토.',
    source: 'synthesis-1.5,taxonomy-5', confidence: 'high',
  },

  // ─── 6. Flow Mark (흐름자국) ───────────────────────────────
  flow_mark: {
    id: 'flow_mark', nameKo: '흐름자국', nameEn: 'Flow Mark', phase: '충전',
    typicalSeverity: 'medium (외관)',
    discriminators: '유동방향 물결·줄무늬. 제팅(구불선)·타이거스트라이프(유동수직 광택밴드)·레코드홈(동심원)과 구분. 닦아도 안 지워지는 표면 요철. 닦으면 옅어지는 백색 가루·얼룩이면 flow 아님 → mold_deposit(석출)·가스 응축 검토.',
    causes: [
      { rank: 1, cause: '금형온도 과저', category: 'Mold',
        baseProbability: 50,
        trigger: 'resin-kb moldC.min 미달. 특히 초기샷·워밍업 불충분.',
        evidence: '금형온도 입력값. resin-kb 권장 대비.',
        verification: '금형온도 10°C↑ 후 줄무늬 감소 확인.',
        adjustment: '금형온도↑.' },
      { rank: 2, cause: '사출속도 과저·멜트온도 과저', category: 'Method',
        baseProbability: 30,
        trigger: '멜트온도 resin-kb min 근방. 속도 느림.',
        evidence: '멜트온도·속도 입력값.',
        verification: '속도 단계↑ 또는 멜트온도↑ 후 재시험.',
        adjustment: '멜트온도↑, 사출속도↑, 사출압↑.' },
    ],
    patternHints: {
      '초기 샷에만': '워밍업 부족. 금형온도 안정화 후 재확인.',
      '레코드홈(동심원)': 'record_groove 분기 참조. 게이트 확대 검토.',
      '충전 끝(90%↑)에서만·전체 동시 발생': 'air_trap_burn 분기 우선 검토. 온도·속도·압력 방향과 무관하게 충전율(중량)에만 의존하면 유동현상이 아니라 last-fill 가스 포집(벤팅 불량)이다. Progressive Short-Shot으로 얼룩 첫 발생 위치 매핑 → 그 자리가 last-fill = 벤트 가공 대상.',
      '신규 금형·이관 직후': 'air_trap_burn 분기 참조. 신금형은 벤트 설계 누락이 흔하다. 같은 재료가 다른 금형에서 정상이면 재료 원인은 강등하고 금형(벤팅) 우선.',
    },
    sharedGates: ['mold_temp_insufficient'],
    source: 'synthesis-3.2,taxonomy-6', confidence: 'high',
  },

  // ─── 7. Sink Mark (싱크마크) ───────────────────────────────
  sink_mark: {
    id: 'sink_mark', nameKo: '싱크마크', nameEn: 'Sink Mark', phase: '보압',
    typicalSeverity: 'medium (외관)',
    discriminators: '두꺼운 벽·리브·보스 이면 얕은 함몰. Void/Bubble과 감별: 가열 시 더 꺼짐=진공보이드 / 부풂=가스포켓.',
    causes: [
      { rank: 1, cause: '보압·보압시간 부족', category: 'Machine',
        baseProbability: 50,
        trigger: '홀드압 < 사출1차압의 50% 또는 보압시간 < 게이트씰 시간',
        evidence: '홀드압·보압시간·게이트 크기.',
        verification: 'Gate Seal Study: 보압시간 1초씩↑ → 중량 안정(±0.1g)=씰 확인.',
        adjustment: '보압↑(1차압의 50~80%), 보압시간↑(게이트씰까지+1~2초).' },
      { rank: 2, cause: '게이트 조기 고화', category: 'Mold',
        baseProbability: 25,
        trigger: '게이트 과소 또는 금형온도 과저 → 게이트 동결 빠름.',
        evidence: '게이트 타입·크기. 금형온도.',
        verification: 'Gate Seal Study로 씰 시점 확인. 게이트 확대 후 재시험.',
        adjustment: '게이트 확대, 런너 가이드 없는 부분 두께 증대.' },
      { rank: 3, cause: '결정성 고수축 수지', category: 'Material',
        baseProbability: 15,
        trigger: 'PP·PA·POM·PBT 등 결정성 수지 + 두꺼운 벽.',
        evidence: '수지 종류(resin-kb crystalline 여부). 벽두께.',
        verification: '보압 충분 적용 후에도 지속=설계(coring) 검토.',
        adjustment: '보압↑, 냉각시간↑, coring으로 벽두께 균일화.' },
    ],
    patternHints: {
      '리브·보스 이면': '게이트씰 우선 확인(Gate Seal Study)',
      '보압 올려도 지속': '게이트 조기고화 또는 설계 문제 검토',
    },
    sharedGates: [],
    source: 'synthesis-2.1,taxonomy-7', confidence: 'high',
  },

  // ─── 8. Void / Bubble (보이드/기포) ───────────────────────
  void_bubble: {
    id: 'void_bubble', nameKo: '기포/보이드', nameEn: 'Void/Bubble', phase: '보압',
    typicalSeverity: 'medium~high (구조부품 강도 직결 시 high)',
    discriminators: '내부 공동. 진공보이드(보압부족·스킨 견고) vs 가스포켓(수분·공기·압해제 팽창). 가열 감별: 꺼짐=진공 / 부풂=가스.',
    causes: [
      { rank: 1, cause: '결정성+두꺼운벽+보압 부족', category: 'Machine',
        baseProbability: 40,
        trigger: '결정성 수지(PP·PA·POM·PBT) + 두꺼운 단면 + 보압↓',
        evidence: '수지 종류·벽두께·보압.',
        verification: '가열테스트(진공=꺼짐). 보압↑후 소멸=보압부족 확진.',
        adjustment: '보압↑, 보압시간↑, 게이트 두꺼운부위 배치.' },
      { rank: 2, cause: '수분 미건조(가스포켓)', category: 'Material',
        baseProbability: 30,
        trigger: '흡습성 수지(PA·PC·PBT·PET) + 건조 미흡. 가열 시 부풂.',
        evidence: '건조조건 입력값. resin-kb drying 권장 대비.',
        verification: '건조 강화 후 소멸=수분 확진.',
        adjustment: '건조 규정 엄수, 배압 5~10bar↑(가스 압축 배출).' },
      { rank: 3, cause: '배압 부족으로 탈기 불충분', category: 'Machine',
        baseProbability: 20,
        trigger: '배압 낮음(<5MPa). 스크루 계량 시 가스 포함.',
        evidence: '배압 입력값.',
        verification: '배압 5~10bar씩↑ 후 보이드 감소 확인.',
        adjustment: '배압 소폭↑(GF 수지=섬유 파손 주의).' },
      { rank: 4, cause: '환경 온도 드리프트(낮밤 기온차) → 금형/배럴 온도 불안정', category: 'Machine',
        baseProbability: 25,
        trigger: '낮밤 기온차 큰 환경 + 두꺼운부 + 간헐 발생(겨울 문닫으면 정상). 성형조건 조정과 무관.',
        evidence: '주야·계절 발생 패턴. 금형/배럴 실측온도 안정성.',
        verification: '기온차 측정 + 사출기 차폐/격리 후 재현 확인.',
        adjustment: '사출기 차폐·격리(비닐 등)로 낮밤 온도차 차단(근본), 금형·배럴 온도 일정 유지.' },
      { rank: 5, cause: '설비·금형 하드웨어(스크류/체크링 마모·노즐후퇴 미사용·코어측 벤트/오버플로우 부재)', category: 'Machine',
        baseProbability: 20,
        trigger: '성형조건 다 조정해도 무효 + 두꺼운부 보이드 고정위치. 스크류서 기포 혼입.',
        evidence: '스크류·체크링 마모 이력. 보이드 위치 고정성.',
        verification: '노즐후퇴(decompression) 적용·스크류 점검. 고정위치면 코어측 벤트/오버플로우 추가 후 확인.',
        adjustment: '노즐후퇴로 기포 배출, 스크류/체크링 점검, 보이드 고정위치면 코어측 오버플로우·가스밴트 추가.' },
    ],
    patternHints: {
      '성형조건(보압·배압·온도·속도) 다 조정해도 무효 + 두꺼운부 + 낮밤 간헐': '공정 원인 아님 → 환경 온도드리프트·설비(스크류/노즐후퇴)·금형(코어측 벤트/오버플로우) 하드웨어 우선. 성형조건 미세조정 반복은 함정.',
      '대형기·고점도(PMMA 등)인데 배럴온도 수지 권장 하한 근처': '배럴온도 충분히 확보(수지 권장범위 상단). 과저 시 두꺼운부 충전·탈기 불리 → 보이드 가중.',
    },
    priorityLogic: '조건무효 시 공정 미세조정에 머물지 말고 환경(온도 드리프트)·설비(스크류·노즐후퇴)·금형(벤트/오버플로우) 하드웨어 축으로 전환. 단 보압부족(rank1)·수분(rank2) 기본 단서가 명확하면 그대로 우선.',
    sharedGates: [],
    source: 'synthesis-2.2,taxonomy-8', confidence: 'high',
  },

  // ─── 9. Warpage (휨/변형) ──────────────────────────────────
  warpage: {
    id: 'warpage', nameKo: '휨/변형', nameEn: 'Warpage', phase: '냉각',
    typicalSeverity: 'medium~high (치수규격 이탈·조립불가 시 high)',
    discriminators: '이젝트 후 형상 이탈. 전체 한방향 틀어짐=warpage / 균일 크기 변화=수축 문제(구분). GF 결정성 수지=최악.',
    causes: [
      { rank: 1, cause: 'GF 결정성 수지 + 비대칭 냉각(최악)', category: 'Mold',
        baseProbability: 40,
        trigger: 'GF 강화재 + 결정성(PA·PBT·PP) + 코어-캐비티 온도차 >5~10°C',
        evidence: '수지 종류·강화재. 금형 고정/가동측 온도차.',
        verification: 'CMM 정량화. 코어/캐비티 열전대 실측.',
        adjustment: '코어-캐비티 온도차 최소화(<5°C 목표), 냉각시간↑.' },
      { rank: 2, cause: '냉각 불균일', category: 'Mold',
        baseProbability: 30,
        trigger: '냉각채널 편재·유량 불균일. 금형 양면 온도차.',
        evidence: '금형 고정/가동측 온도 차이.',
        verification: '냉각회로 유량밸런스 측정.',
        adjustment: '냉각채널 점검, 금형온도 균일화.' },
      { rank: 3, cause: '결정성 고수축 + 두께 불균일', category: 'Material',
        baseProbability: 20,
        trigger: '결정성 수지(PP·POM) + 두께 편차 큼.',
        evidence: '수지 종류. 벽두께 min/max.',
        verification: '두께 단면 확인. 균일화 가능 여부.',
        adjustment: '금형온도↑(결정화 완료 촉진), 이젝트 직후 냉각지그.' },
    ],
    patternHints: {
      '특정 방향 휨': 'GF 수지=섬유 배향 방향 확인',
      '냉각 후 악화': '후수축(결정성) 가능성',
      '게이트 비대칭': '게이트 대칭 배치 검토',
    },
    sharedGates: [],
    priorityLogic: 'GF+결정성=코어-캐비티 온도차 최우선. 비결정성=보압 불균일 검토.',
    source: 'synthesis-2.3,taxonomy-9', confidence: 'high',
  },

  // ─── 10. Crack / Crazing (크랙/균열) ──────────────────────
  crack: {
    id: 'crack', nameKo: '크랙/균열', nameEn: 'Crack/Crazing', phase: '보압(과보압 잔류응력)/냉각·이형(이형응력·ESC)',
    typicalSeverity: 'medium~high (파단·강도 직결·안전 시 high, 외관 미세균열 medium)',
    discriminators: '이젝터핀 주변=이젝트 크랙 / 게이트 방사상=과보압 / 웰드부=후발 / 시간차+용제노출=ESC(잔류응력).',
    causes: [
      { rank: 1, cause: '미건조/가수분해 (PA·PC·PBT·PET 최다)', category: 'Material',
        baseProbability: 35,
        trigger: '흡습성 수지(PA·PC·PBT·PET) + 건조 조건 미흡 또는 미입력.',
        evidence: '건조 조건. resin-kb drying 권장 대비.',
        verification: '건조 강화 후 재시험. 수분계(Karl Fischer) 측정.',
        adjustment: '건조 규정 엄수. 재생재↓(<20~30%).' },
      { rank: 2, cause: '과보압 → 잔류응력 (PC·비결정성 수지)', category: 'Machine',
        baseProbability: 35,
        trigger: '홀드압 > 사출1차압의 60~70%. 게이트 방사상 크랙. 시간차 발현(ESC). 특히 PC.',
        evidence: '홀드압 입력값. 발생 시점(즉시 vs 시간차). 보압 이력(싱크 해결 위해 올린 경우).',
        verification: '보압 10% 단계↓ 후 재시험. 편광 응력분석.',
        adjustment: '보압↓(1차압의 40~60%), 금형온도↑(잔류응력 완화, resin-kb moldC 범위 내 상향), PC 어닐링(125~135°C×1~4h). 주의: 금형온도↑는 싱크 재발 가능 → 게이트 확대 병행 검토.' },
      { rank: 3, cause: '이젝터 불량(과대·불균일)', category: 'Mold',
        baseProbability: 20,
        trigger: '이젝터핀 주변 집중. 냉각시간 부족+조기 이젝션.',
        evidence: '발생 위치(이젝터핀 주변). 냉각시간.',
        verification: '냉각시간↑ 후 재시험.',
        adjustment: '냉각시간↑, 이젝터 면적↑·균일화, 드래프트↑.' },
    ],
    patternHints: {
      '시간차 발현': '2순위(잔류응력·ESC) 강점 분기 — 보압↓ + 금형온도↑ + 어닐링',
      '이젝터 주변': '3순위(이젝트 크랙) 강점 분기',
      '용제 접촉': '2순위(ESC) — 잔류응력 >15MPa 의심',
      '싱크마크 해결 후 발생': '2순위(과보압) 강점 분기 — 보압↓ + 금형온도↑ 병행',
    },
    sharedGates: [],
    priorityLogic: '건조 조건(dryTemp·dryTime)이 resin-kb 권장 범위를 충족하면 수분(1순위) 분기를 하향하고 과보압(2순위)를 우선 검토. 홀드압이 1차압 60% 초과+시간차 발현=잔류응력 거의 확진.',
    source: 'synthesis-2.4,taxonomy-10', confidence: 'high',
  },

  // ─── 11. Silver Streak (은선/은줄) — 5분기 풀 ─────────────
  silver_streak: {
    id: 'silver_streak', nameKo: '은선/은줄', nameEn: 'Silver Streak', phase: '재료준비',
    typicalSeverity: 'medium (외관)',
    discriminators: '게이트서 유동방향 방사상 은빛 줄무늬. 3종 변별: moisture(전면분산·건조후 소멸) / shear(게이트주변·지속) / thermal(황변·냄새 동반). 박리(층분리)·버닝(탄화·흑갈색)과 구분. GF 강화수지에서 흑색·안 닦이는 방사상 백화 + 건조 정상이면 은줄(splay) 아니라 GF 표면백화(fiber read-out) 의심 — 분류 전환 검토.',
    causes: [
      { rank: 1, cause: '잔류 수분에 의한 가스 발생 (moisture splay)', category: 'Material',
        baseProbability: 55,
        trigger: '흡습성 수지(PA·PC·PBT·PET·ABS) + 건조 조건 미달 또는 미입력',
        evidence: '수지 흡습성(resin-kb hygroscopic 참조). 건조 온도·시간·이슬점. 허용수분: PA66≤0.20%, PC·PBT≤0.02%, ABS≤0.10%.',
        verification: '건조 강화 후 소멸=수분 확진. 수분계 측정. 이슬점 −29~−40°C 확인.',
        adjustment: '건조 시간·온도↑, 제습식 건조기 전환. resin-kb drying 참조.' },
      { rank: 2, cause: '열분해에 의한 가스 발생 (thermal splay)', category: 'Machine',
        baseProbability: 20,
        trigger: '배럴온도 resin-kb meltC.degradeAbove 초과 또는 체류 과다(사이클 정지·shot<배럴 20%). 황변·냄새 동반 시.',
        evidence: '노즐·배럴 온도. 사이클 시간. resin-kb meltC.degradeAbove 값 대비.',
        verification: '배럴온도 5~10°C↓ 재시험. 퍼지 3~5shot 후 소멸=잔류탄화.',
        adjustment: '배럴온도↓, 사이클단축, 체류↓(shot 비율 20~80% 범위 유지).' },
      { rank: 3, cause: '과도 전단에 의한 가스 발생 (shear splay)', category: 'Machine',
        baseProbability: 15,
        trigger: '게이트 과소, 또는 사출속도·스크루 RPM이 수지 권장 상한(resin-kb 참조) 초과. 게이트 주변 집중, 건조 정상인데 지속.',
        evidence: '사출속도·배압·RPM 입력값(resin-kb 권장 상한 대비). 게이트 타입.',
        verification: '사출속도 30~50%↓ 재시험. RPM↓(GF 수지=섬유파손 주의). 배압↓ 테스트.',
        adjustment: '사출속도↓, 스크루 RPM↓(권장 상한 이하로), 배압↓(단 계량 불안정 주의), 게이트 확대, 배럴온도 소폭↑.' },
      { rank: 4, cause: '공기 혼입 (air inclusion splay)', category: 'Method',
        baseProbability: 7,
        trigger: '서크백(감압) 과다 또는 벤팅 불량. 비흡습 수지(PP·PE·PS)에서 발생.',
        evidence: '서크백 설정값. 수지 흡습성(resin-kb 참조).',
        verification: '서크백 축소 후 재시험. 벤팅 청소 후 재시험.',
        adjustment: '서크백↓, 벤팅 청소·추가, 사출속도↓.' },
      { rank: 5, cause: '리그라인드·오염에 의한 가스 (contamination splay)', category: 'Material',
        baseProbability: 3,
        trigger: '재생재 비율 >20% 또는 이종수지·마스터배치 오염.',
        evidence: '재생재 비율 입력값. 원료 로트 이력.',
        verification: '버진 수지 단독 런 후 소멸=오염 확진.',
        adjustment: '재생재 비율↓(<20%), 원료 검사, 완전 퍼지.' },
    ],
    patternHints: {
      '건조후 소멸': '1순위(수분) 확진 경로',
      '황변동반': '2순위(열분해) 강점 분기',
      '게이트주변 지속': '3순위(전단) 강점 분기',
      'PP|PE|PS|비흡습': '즉시 3~4순위(전단/공기) 분기. 수분 원인 아님.',
      '재가동 첫 샷': '1순위(수분 재흡수) 또는 2순위(체류 열분해)',
      '오후|시간경과|간헐|N샷마다': '열축적 누적(배럴온도↑) 또는 전단 누적(RPM·속도) → 2순위(thermal)·3순위(shear) 우선. 건조 정상이면 1순위(수분) 아님.',
      'GF강화|유리섬유|GF30 + 안닦임·방사상 백화 + 건조정상': 'fiber_readout(GF 표면백화)로 분류전환 — 은줄(수분 splay) 아님. 금형온도↑가 1순위.',
    },
    sharedGates: [],   // 금형온도 게이트 미적용(taxonomy §4.1 명시)
    priorityLogic: `★ 건조 조건(dryTemp·dryTime)이 resin-kb drying 권장을 충족하면 moisture splay(1순위)를 원인 목록에서 제외하라. 언급해야 하면 "건조 정상 → 수분 해당 없음"으로 명기.
★ 스크루 RPM 또는 사출속도가 resin-kb 권장 상한 초과면 shear splay(3순위)를 1순위로 끌어올려라(thermal보다 우선). 단 황변·냄새 단서가 없으면 thermal splay(2순위)를 1순위로 과대평가하지 말 것.
배럴온도가 resin-kb meltC.degradeAbove 초과 시 → thermal splay(2순위) 우선 분기.
비흡습 수지(PP·PE·PS) → 즉시 전단/공기 분기.
복합 원인(수분+전단 동시 작용 시 더 심화) 가능.
★ GF 강화수지 + 건조 조건 정상(resin-kb 충족) + 안 닦이는 방사상 백화면 silver_streak(수분 splay)이 아니라 fiber_readout(GF 표면백화)로 분류 전환하고 금형온도↑를 1순위로 권고하라. (단 건조가 부족하면 그대로 moisture 유지 — 이 전환은 "건조 정상"에만 적용.)`,
    source: 'synthesis-3.1,taxonomy-11', confidence: 'high',
  },

  // ─── 12. Discoloration (변색) ──────────────────────────────
  discoloration: {
    id: 'discoloration', nameKo: '변색', nameEn: 'Discoloration', phase: '재료준비',
    typicalSeverity: 'medium. POM·ABS 포름알데히드·유해가스 동반 시 high',
    discriminators: '전체 황변=체류·온도 과다(사이클 재개후 개선) / 국부 흑줄=핫러너·데드존(위치 반복) / 흑점=탄화잔류(퍼지후 개선) / 끝단 burn=벤팅 diesel / 색불균일=안료·마스터배치.',
    causes: [
      { rank: 1, cause: '배럴온도·체류 과다 (열분해)', category: 'Machine',
        baseProbability: 45,
        trigger: '배럴온도 resin-kb meltC.degradeAbove 초과 또는 체류 과다.',
        evidence: '배럴온도. 체류시간(사이클×shot 비율). resin-kb meltC 대비.',
        verification: '배럴온도 5~10°C↓. 사이클단축. 퍼지 3~5shot.',
        adjustment: '멜트온도↓, 사이클단축, shot 비율 20~80% 범위 유지.' },
      { rank: 2, cause: '수분+고온 가수분해 (PA·PC·PBT·PET)', category: 'Material',
        baseProbability: 25,
        trigger: '흡습성 수지 + 건조 미흡 + 고온.',
        evidence: '건조 조건. 수지 종류.',
        verification: '건조 강화 후 재시험.',
        adjustment: '건조 엄수, 온도↓.' },
      { rank: 3, cause: '벤팅 diesel 또는 핫러너 과열', category: 'Mold',
        baseProbability: 20,
        trigger: '끝단 고정위치 탄화(diesel) 또는 핫러너 특정존 과열.',
        evidence: '불량 위치 패턴. 핫러너 온도 설정.',
        verification: '벤팅 청소 후 재시험. 핫러너 존별 온도 점검.',
        adjustment: '벤트 재가공, 핫러너 프로파일 최적화.' },
    ],
    patternHints: {
      '사이클 재개후 개선': '2순위(체류) 거의 확진',
      '퍼지후 개선': '잔류탄화(스크루 마모·데드존)',
      '위치 고정': '벤팅 diesel 또는 핫러너 과열',
      '색불균일|분산 줄무늬|마스터배치 분산': '안료·MB 분산 불량(전체 열변색 아님 — 분산 줄무늬는 color_streaks 계열). 배압 상향은 소폭이 아니라 단계적 대폭(현재 대비 2배 수준 목표) + 스크루 RPM 하향 병행(체류·혼련 확보). GF 수지는 섬유 파손 주의.',
    },
    sharedGates: [],
    source: 'synthesis-3.3,taxonomy-12', confidence: 'high',
  },

  // ── 나머지 18종 골격 (append-friendly) ──────────────────────

  delamination: {
    id: 'delamination', nameKo: '박리', nameEn: 'Delamination', phase: '재료준비',
    discriminators: 'fish scale 층 분리. 손톱으로 층 벗겨짐. 은선(흰 줄)과 구분.',
    causes: [
      { rank: 1, cause: '이종수지 오염', category: 'Material',
        trigger: '재료교체 이력. 비상용 폴리머 혼입.',
        evidence: '원료 로트 이력. DSC 용융점(이종 피크).',
        verification: 'DSC. 버진 수지 단독 런.',
        adjustment: '완전 퍼지·원료검사·리그라인드 배제.' },
      { rank: 2, cause: '이형제 과다', category: 'Mold',
        trigger: '이형제 사용량 과다.',
        evidence: '이형제 사용 로그.',
        verification: '이형제 없이 테스트.',
        adjustment: '이형제 최소화, 금형 청소.' },
    ],
    source: 'synthesis-3.4,taxonomy-13', confidence: 'high',
  },

  fiber_readout: {
    id: 'fiber_readout', nameKo: 'GF 표면백화', nameEn: 'Fiber Read-out', phase: '표면',
    discriminators: 'GF수지 표면 흰 방사상 흔적·거침. 흑색 부품서 두드러짐.',
    causes: [
      { rank: 1, cause: '금형온도 과소(섬유 캡슐화 실패)', category: 'Mold',
        baseProbability: 60,
        trigger: 'GF 강화 + resin-kb moldC.gf 범위 미달.',
        evidence: '금형온도. resin-kb moldC.gf 대비.',
        verification: '금형온도 10°C↑ 후 개선 확인.',
        adjustment: '금형온도↑(단일 최대 효과), 배럴온도 GF 비강화 대비 10~30°C↑.' },
    ],
    sharedGates: ['mold_temp_insufficient'],
    source: 'synthesis-3.5,taxonomy-14', confidence: 'high',
  },

  surface_gloss: {
    id: 'surface_gloss', nameKo: '표면거침/광택불균일', nameEn: 'Surface Roughness/Gloss', phase: '표면',
    discriminators: '광택 전이(고/저광택 교대 경계선) vs 전체 거침. flow mark(유동방향 줄무늬)와 구분.',
    causes: [
      { rank: 1, cause: '금형온도 과저·불균일', category: 'Mold',
        baseProbability: 55,
        trigger: 'resin-kb moldC.min 미달 또는 금형면 온도 편차 >5°C.',
        evidence: '금형온도. resin-kb 권장 대비.',
        verification: '광택계(60°/20° GU) 매핑.',
        adjustment: '금형온도↑, 냉각채널 점검, 폴리싱.' },
      { rank: 2, cause: '보압 과소(표면 복제 불충분)', category: 'Machine',
        trigger: '홀드압 낮음.',
        evidence: '홀드압 입력값.',
        verification: '홀드압↑ 후 gloss 개선 확인.',
        adjustment: '보압↑.' },
    ],
    sharedGates: ['mold_temp_insufficient'],
    source: 'synthesis-3.6,taxonomy-15', confidence: 'high',
  },

  dimensional_instability: {
    id: 'dimensional_instability', nameKo: '치수 불안정', nameEn: 'Dimensional Instability', phase: '보압/냉각',
    discriminators: '동일조건 lot간·캐비티간·시간경과 치수 변동. warpage(형상)와 구분.',
    causes: [
      { rank: 1, cause: '결정성 수지 냉각·보압 변동', category: 'Machine',
        trigger: '결정성 수지. 보압·사이클 불안정.',
        evidence: '수지 종류. 사이클 중량 변동.',
        verification: '사이클 중량 ±0.5% 모니터.',
        adjustment: '냉각시간↑, 보압 안정화, 사이클 일정.' },
      { rank: 2, cause: 'PA 흡습 팽창 (수분 1%≈치수 0.2~0.3%↑)', category: 'Material',
        trigger: 'PA 수지. 측정타이밍 불일치.',
        evidence: '수지 종류. 측정 환경.',
        verification: '이젝트 24h 후 65%RH 안정화 후 측정.',
        adjustment: '측정 타이밍 표준화. 어닐링(후수축 선처리).' },
    ],
    patternHints: {
      '직후 양품|시간경과 치수증가|다습 보관|이틀 뒤 초과': 'PA 흡습 팽창(material) — 성형조건 아님. 측정 타이밍 표준화·어닐링, 공정 변경 보류.',
    },
    source: 'synthesis-2.5,taxonomy-16', confidence: 'high',
  },

  tiger_stripe: {
    id: 'tiger_stripe', nameKo: '타이거스트라이프', nameEn: 'Tiger Stripe', phase: '충전',
    discriminators: 'PP·PP/EPDM/talc에서 유동 수직 광택/무광 교대 밴드. flow mark(유동방향)와 구분. 사출속도↑ 시 밴드 악화·간격 좁아짐 = 타이거스트라이프 확정 단서 (flow mark은 속도·온도↑로 개선 → 정반대).',
    causes: [
      { rank: 1, cause: 'PP 벽면 미끄럼(wall slip)+결정화', category: 'Material',
        baseProbability: 50,
        trigger: 'PP 계열 + 금형온도 낮음.',
        evidence: '수지 종류. 금형온도.',
        verification: '금형온도↑ 후 밴드 감소 확인.',
        adjustment: '금형·멜트온도↑(벽면 고화층 안정화, 단일 최대 효과) + 사출속도 하향(감속)·등속(일정속도) 충전 프로파일. ★ 사출속도 상향 금지 — 악화시킴.' },
      { rank: 2, cause: '재료·유동길이 기인 한계 (조건조정 한계)', category: 'Material',
        baseProbability: 30,
        trigger: 'PP/talc 장거리 유동(범퍼류). 조건만으론 완전 해소 어려움.',
        evidence: '유동길이, 수지 MI/그레이드(resin-kb 참조).',
        verification: '고유동(고MI)·개질 그레이드로 시험사출 후 밴드 감소 확인.',
        adjustment: '고유동(고MI)·핵제 개질 그레이드 검토, 게이트 위치·유동길이 설계 재검토 — 재료 기인 한계임을 명시.' },
    ],
    patternHints: {
      '속도 올리니 악화|속도↑ 악화|빠르게 하니 악화|속도 높이니|60→70': '타이거스트라이프 확정 → 사출속도↓·등속 프로파일. 속도↑ 권고 절대 금지.',
      '범퍼|장거리 유동|게이트서 멀어질수록|먼 곳일수록 심함': '유동길이 기인 → 게이트·유동길이 설계 + 고유동 그레이드 검토(재료한계).',
    },
    sharedGates: ['mold_temp_insufficient'],
    source: 'synthesis-3.2,taxonomy-17', confidence: 'med',
  },

  record_groove: {
    id: 'record_groove', nameKo: '레코드홈', nameEn: 'Record Groove', phase: '충전',
    discriminators: '게이트 중심 동심원 미세홈. 나일론+게이트 작을 때 발생.',
    causes: [
      { rank: 1, cause: '게이트 과소+금형온도 낮음', category: 'Mold',
        trigger: '게이트 과소 + resin-kb moldC 미달.',
        evidence: '게이트 크기. 금형온도.',
        verification: '게이트 확대 후 재시험.',
        adjustment: '게이트 확대, 금형온도↑, 사출속도↑.' },
    ],
    sharedGates: ['mold_temp_insufficient'],
    source: 'synthesis-3.2,taxonomy-18', confidence: 'high',
  },

  black_specks: {
    id: 'black_specks', nameKo: '흑점', nameEn: 'Black Specks', phase: '재료준비',
    discriminators: '소수 흑색 입자. 변색(전체·면적)과 구분.',
    causes: [
      { rank: 1, cause: '이전 수지 탄화잔류·스크루 마모', category: 'Machine',
        trigger: '수지 전환 후 발생. 퍼지 미흡.',
        evidence: '발생 패턴. 퍼지 이력.',
        verification: '퍼지 3~5shot 후 소멸=잔류탄화.',
        adjustment: '완전 퍼지, 스크루 점검, 원료 검사.' },
    ],
    source: 'synthesis-4,taxonomy-19', confidence: 'high',
  },

  color_streaks: {
    id: 'color_streaks', nameKo: '색줄', nameEn: 'Color Streaks', phase: '재료준비',
    typicalSeverity: 'medium (외관)',
    discriminators: '안료·마스터배치 분산 불량 줄무늬. 이종수지 박리(층 분리)·변색(전체)과 구분.',
    causes: [
      { rank: 1, cause: '배압 부족 → 마스터배치 분산 불량', category: 'Machine',
        baseProbability: 55,
        trigger: '배압이 낮아 전단에너지 부족. 마스터배치 캐리어 수지 불일치.',
        evidence: '배압 입력값. 마스터배치 비율·캐리어 정보. resin-kb 권장 배압 대비.',
        verification: '배압 단계적 대폭↑(현재의 2배 수준까지) 후 줄무늬 감소 확인.',
        adjustment: '배압 대폭 상향(단계적, 현재 대비 2배 수준 목표, GF 수지=섬유파손 주의), 마스터배치 비율·캐리어 수지 적합성 확인.' },
      { rank: 2, cause: '스크루 전단·혼련 부족', category: 'Machine',
        baseProbability: 30,
        trigger: '스크루 RPM 과저(혼련 불충분) 또는 체류시간 부족.',
        evidence: 'RPM 입력값. 사이클 시간(체류).',
        verification: 'RPM 소폭↓(체류시간 늘리기) 후 재시험. 혼련 구간 확인.',
        adjustment: '스크루 RPM↓(체류·혼련 시간 확보), 배압↑ 병행.' },
      { rank: 3, cause: '이종수지·오염 혼입', category: 'Material',
        baseProbability: 15,
        trigger: '재료교체 이력. 리그라인드 오염. 내추럴 컬러에서는 없음.',
        evidence: '원료 로트 이력. 리그라인드 비율.',
        verification: '버진 수지+마스터배치 단독 런 후 소멸=오염 확진.',
        adjustment: '완전 퍼지·원료검사·리그라인드 배제.' },
    ],
    patternHints: {
      '내추럴 컬러서 없음': '1~2순위(배압·혼련) 분기. 마스터배치 관련.',
      '배압↑후 개선': '1순위(배압) 확진',
      '재료교체 후 발생': '3순위(오염) 강점 분기',
    },
    source: 'synthesis-4,taxonomy-20', confidence: 'high',
  },

  cold_slug: {
    id: 'cold_slug', nameKo: '콜드슬러그', nameEn: 'Cold Slug', phase: '충전',
    discriminators: '스프루·노즐 냉각 선단(고화수지) 캐비티 유입.',
    causes: [
      { rank: 1, cause: '스프루·노즐 냉각 과다', category: 'Mold',
        trigger: '노즐온도 낮음. 콜드슬러그웰 없음.',
        evidence: '노즐온도. 금형 구조.',
        verification: '노즐온도↑ 후 재시험.',
        adjustment: '노즐온도↑, 콜드슬러그웰 추가.' },
    ],
    source: 'synthesis-4,taxonomy-21', confidence: 'high',
  },

  sticking: {
    id: 'sticking', nameKo: '이형 불량', nameEn: 'Sticking', phase: '이형',
    discriminators: '캐비티 내 부착·이형 불량.',
    causes: [
      { rank: 1, cause: '드래프트 부족 + 언더컷 + 과보압', category: 'Mold',
        trigger: '드래프트 부족. 홀드압 과고.',
        evidence: '홀드압. 제품 드래프트각.',
        verification: '홀드압↓ 후 재시험.',
        adjustment: '드래프트↑, 보압↓, 이형제, 금형 연마.' },
    ],
    source: 'synthesis-4,taxonomy-22', confidence: 'high',
  },

  ejector_marks: {
    id: 'ejector_marks', nameKo: '이젝터 마크', nameEn: 'Ejector Marks', phase: '이형',
    discriminators: '이젝터핀 위치 과도 함몰·자국.',
    causes: [
      { rank: 1, cause: '조기 이젝션 + 이젝터 면적 부족', category: 'Mold',
        trigger: '냉각시간 부족. 이젝터 개수·면적.',
        evidence: '냉각시간. 이젝터 배치.',
        verification: '냉각시간↑ 후 재시험.',
        adjustment: '냉각시간↑, 이젝터 면적↑·균일 배치.' },
    ],
    source: 'synthesis-4,taxonomy-23', confidence: 'high',
  },

  stringing: {
    id: 'stringing', nameKo: '실끌림', nameEn: 'Stringing/Drooling', phase: '이형',
    discriminators: '노즐서 실처럼 끌리는 수지. 드룰링=개형 전 수지 방울.',
    causes: [
      { rank: 1, cause: '노즐온도 과고 + 서크백 부족', category: 'Machine',
        trigger: '노즐온도 과고. 서크백 설정 낮음.',
        evidence: '노즐온도. 서크백 설정.',
        verification: '노즐온도↓ 후 재시험.',
        adjustment: '노즐온도↓, 서크백↑.' },
    ],
    source: 'synthesis-4,taxonomy-24', confidence: 'high',
  },

  parting_line_mismatch: {
    id: 'parting_line_mismatch', nameKo: '파팅라인 단차', nameEn: 'Parting Line Mismatch', phase: '이형/금형',
    discriminators: '파팅면 단차·어긋남.',
    causes: [
      { rank: 1, cause: '금형 마모·평행도 불량', category: 'Mold',
        trigger: '장기 사용 금형. 파팅면 이물.',
        evidence: '금형 사용 이력.',
        verification: '블루마킹.',
        adjustment: '금형 정비, 파팅면 재연마.' },
    ],
    source: 'synthesis-4,taxonomy-25', confidence: 'high',
  },

  brittleness: {
    id: 'brittleness', nameKo: '취성', nameEn: 'Brittleness', phase: '재료준비',
    discriminators: '충격에 쉽게 파손. 인장강도 저하.',
    causes: [
      { rank: 1, cause: '과건조→분자량↓ 또는 재생재 과다', category: 'Material',
        trigger: '건조 과도(온도 과고·시간 과장). 재생재 비율 과다.',
        evidence: '건조 조건. 재생재 비율.',
        verification: '버진 수지 단독 런. 건조조건 표준화.',
        adjustment: '건조조건 최적화, 재생재↓.' },
    ],
    source: 'synthesis-2.4,taxonomy-26', confidence: 'high',
  },

  residual_stress_esc: {
    id: 'residual_stress_esc', nameKo: '잔류응력·ESC', nameEn: 'Residual Stress/ESC', phase: '보압/냉각',
    discriminators: '표면응력 광학무늬. 용제접촉 후 균열(ESC). 사이클 후 시간차 크랙.',
    causes: [
      { rank: 1, cause: '과보압 → 잔류응력 과다', category: 'Machine',
        trigger: 'PC·PS 등 비결정성 + 홀드압 > 1차압 60~70%.',
        evidence: '홀드압. 수지 종류.',
        verification: '편광 응력분석. 보압↓ 테스트.',
        adjustment: '보압↓, 금형온도↑, PC 어닐링(125~135°C×1~4h).' },
    ],
    source: 'synthesis-2.4,taxonomy-27', confidence: 'high',
  },

  overpacking: {
    id: 'overpacking', nameKo: '과충전', nameEn: 'Overpacking', phase: '보압',
    discriminators: '과도한 홀드압→플래시·잔류응력·이형불량 복합.',
    causes: [
      { rank: 1, cause: 'V/P 전환 지연 + 홀드압 과고', category: 'Method',
        trigger: 'V/P 전환 늦음. 홀드압 과다.',
        evidence: 'V/P 전환 위치. 홀드압.',
        verification: 'V/P 전환 앞당김 후 재시험.',
        adjustment: 'V/P 전환 앞당김, 홀드압↓.' },
    ],
    source: 'synthesis,taxonomy-28', confidence: 'high',
  },

  gate_blush: {
    id: 'gate_blush', nameKo: '게이트 블러시', nameEn: 'Gate Blush', phase: '충전',
    discriminators: '게이트 직후 흐림·광택 저하. 흐름자국(멀리까지)과 구분. 밸브게이트 사용·게이트 국한·간헐·조건무효면 게이트 하드웨어(밸브핀·핫러너 온도) 의심. 닦이면 표면 석출(mold_deposit) 감별.',
    causes: [
      { rank: 1, cause: '게이트 과소 + 금형온도 낮음', category: 'Mold',
        trigger: '게이트 과소 → 급속 감압. 금형온도 낮음.',
        evidence: '게이트 크기. 금형온도.',
        verification: '게이트 확대 후 재시험.',
        adjustment: '게이트 확대, 금형온도↑, 사출속도↓.' },
      { rank: 2, cause: '밸브게이트 핀 마모 또는 핀 타이밍/스트로크 불량', category: 'Mold',
        trigger: '밸브게이트 사용 + 게이트 주변 국한 + 간헐 + 성형조건 무효.',
        evidence: '밸브게이트 여부. 간헐성·게이트 국한.',
        verification: '금형 열고 밸브핀 선단 마모·스트로크 실측(설계 대비 ±0.1mm 이상=이상). 핀 교체 후 동일 조건 소멸=확진.',
        adjustment: '밸브핀 선단 점검·스트로크 조정·필요 시 교체.' },
      { rank: 3, cause: '핫러너 게이트 온도 과저 또는 노즐 데드스팟 정체', category: 'Mold',
        trigger: '핫러너 게이트온도가 수지 권장 하한 근처(내열ABS·PC 등) 또는 노즐 데드스팟 정체. 간헐.',
        evidence: '핫러너 게이트온도 vs 수지 권장범위. 간헐 패턴.',
        verification: '핫러너 게이트온도 상향·퍼지 후 재현 확인.',
        adjustment: '핫러너 게이트온도↑(수지 하한 탈출), 퍼지·시트 정체/탄화 점검.' },
    ],
    patternHints: {
      '1점 밸브게이트·게이트 국한·간헐·성형조건 무효': '게이트 하드웨어/열 원인(밸브핀 마모·타이밍 또는 핫러너 게이트온도 과저) 우선. 성형조건 재조정은 함정.',
    },
    priorityLogic: '조건무효 + 밸브게이트면 게이트 하드웨어(밸브핀·핫러너온도)로 전환. 핫러너 게이트온도(미점검 흔함)를 금형분해(밸브핀)보다 먼저 시도. 닦임 여부로 mold_deposit 감별.',
    sharedGates: ['mold_temp_insufficient'],
    source: 'synthesis,taxonomy-29', confidence: 'med',
  },

  // ─── 31. Mold Deposit / Plate-out (금형 석출/플레이트아웃) ───
  mold_deposit: {
    id: 'mold_deposit', nameKo: '금형 석출', nameEn: 'Mold Deposit', phase: '표면',
    typicalSeverity: 'medium (외관). 누적·전수화 시 수율 직결',
    discriminators: '닦으면 옅어지는 백색·뿌연 잔류물(표면 부착물). 닦아도 안 지워지는 구조적 불량(웰드선·플로우마크·은선 지속형·표면 요철)과 결정적으로 구분. 게이트·벤트 주변·특정 캐비티 집중. 반복생산 시 점진 누적, 금형 세정 직후 일시 소멸·재누적.',
    causes: [
      { rank: 1, cause: '수지 휘발분·첨가제 금형표면 석출(plate-out)', category: 'Material',
        baseProbability: 45,
        trigger: '고멜트온도·장시간 체류. 저분자 첨가제·난연제·활제 휘발. 금형 세정 직후 소멸 후 재누적.',
        evidence: '멜트온도·체류(사이클)시간. 세정주기 대비 재발.',
        verification: '금형 게이트·벤트 주변 표면 닦아내고 N샷 후 재출현 확인. 소멸→재누적이면 plate-out 확진.',
        adjustment: '멜트온도↓·사이클(체류)단축·금형 표면 주기 세정·벤트 추가/청소.' },
      { rank: 2, cause: '벤트 부족·막힘 → 가스 응축', category: 'Mold',
        baseProbability: 30,
        trigger: '벤트 막힘·last-fill·게이트 주변. 가스 미배출 응축.',
        evidence: '벤트 상태. 얼룩 위치(게이트·충전말단).',
        verification: '벤트 청소·추가 후 재시험.',
        adjustment: '벤트 청소·추가, 사출속도↓, 멜트온도↓.' },
      { rank: 3, cause: '이형제 과다 전사', category: 'Mold',
        baseProbability: 20,
        trigger: '외부 이형제 분무 과다.',
        evidence: '이형제 사용 로그.',
        verification: '이형제 없이 테스트.',
        adjustment: '이형제 최소화·금형 세정.' },
    ],
    patternHints: {
      '닦으면 흐려짐·지워짐': '표면 부착물 확정 — 웰드/플로우/은선(구조적·지속형) 배제, plate-out·가스 응축·이형제 우선.',
      '특정 캐비티만': '그 캐비티 표면·벤트·핫러너 노즐 데드스팟 집중. 러너밸런스·노즐온도 편차 검토.',
      '게이트 주변 반달·헤일로': 'gate_blush 병발 검토. 닦이면 석출, 안 닦이면 블러시(표면 거칠기).',
      '핫러너 청소·밸브교환에도 지속': '핫러너 내부 아닌 캐비티 표면·벤트 원인 가중. 그 캐비티 표면 세정·벤트 점검.',
    },
    sharedGates: [],
    priorityLogic: '"닦임=표면 부착물"이 분류 결정 단서. 금형 세정 후 일시 소멸·재누적이면 plate-out 확진. 닦이는 잔류물을 웰드/플로우로 분류하지 마라.',
    source: 'synthesis,taxonomy-31', confidence: 'med',
  },

};

// ── 헬퍼 ────────────────────────────────────────────────────────

export function getDefect(defectType: string): DefectNode | undefined {
  if (!defectType) return undefined;
  const lower = defectType.toLowerCase();
  // 직접 id 매칭
  if (DEFECT_KB[lower]) return DEFECT_KB[lower];
  // 영문 또는 한글 이름 포함 매칭
  for (const node of Object.values(DEFECT_KB)) {
    if (lower.includes(node.nameEn.toLowerCase()) || lower.includes(node.nameKo)) {
      return node;
    }
  }
  return undefined;
}

export function getGate(gateId: string): SharedGate | undefined {
  return SHARED_GATES[gateId];
}

export function gatesFor(defectKey: string): SharedGate[] {
  const node = DEFECT_KB[defectKey];
  if (!node?.sharedGates) return [];
  return node.sharedGates.map(id => SHARED_GATES[id]).filter(Boolean) as SharedGate[];
}

function isGateTriggered(
  gate: SharedGate,
  resinSpec: ResinSpec | null,
  settings: Record<string, string>,
  filler?: string,
): boolean {
  if (gate.id !== 'mold_temp_insufficient') return false;
  const moldFixed = parseFloat(settings.moldTempFixed || '0');
  const moldMoving = parseFloat(settings.moldTempMoving || '0');
  const vals = [moldFixed, moldMoving].filter(v => v > 0);
  const moldAvg = vals.length ? vals.reduce((a, b) => a + b, 0) / vals.length : 0;

  const isSuperEP = resinSpec?.tier === 'super-engineering';
  const hasGF = !!filler && filler !== '없음' && filler.toLowerCase() !== 'none' &&
    (filler.toLowerCase().includes('gf') || filler.toLowerCase().includes('glass'));

  if (isSuperEP) return true;
  if (hasGF) return true;
  if (resinSpec && moldAvg > 0 && moldAvg < resinSpec.moldC.min) return true;
  return false;
}

export function formatDefectGuide(
  defectType: string,
  resinSpec: ResinSpec | null,
  settings: Record<string, string>,
  advSettings: Record<string, string>,
  filler?: string,
): string {
  const node = getDefect(defectType);
  if (!node) return '';

  const lines: string[] = [];
  lines.push(`## 불량 추정 가이드레일 (KB ${KB_VERSION})`);
  lines.push(`불량: ${node.nameKo} (${node.nameEn}) | ${node.phase} Phase`);
  lines.push(`phase는 결함 메커니즘이 작동하는 단계 기준으로 판정(채택 원인의 소속 시스템 아님 — 위 노드 phase는 기본값, 결함이 형성되는 단계가 다르면 그 단계로).`);
  if (node.typicalSeverity) {
    lines.push(`통상 심각도: ${node.typicalSeverity} — 외관 불량은 원칙 medium 이하. high는 안전·전수·파단·탄화만. 과대평가 금지.`);
  }
  lines.push(`식별 포인트: ${node.discriminators}`);

  lines.push('\n우선순위 분기 조언:');
  for (const c of node.causes.slice(0, 3)) {
    lines.push(`${c.rank}순위 [${c.category}] ${c.cause} — 활성조건: ${c.trigger}`);
    lines.push(`  증거: ${c.evidence}`);
    lines.push(`  조정안: ${c.adjustment}`);
  }

  if (node.id === 'weld_line') {
    lines.push('★ 강도·파단 요구 시나리오(기능부품·GF/필러 수지)면 금형(게이트 위치 이동·웰드 위치 이동) 대책을 권고 1순위로 명시하라. 멜트온도↑·보압↑은 V홈 외관만 개선하고 섬유 배향 단절로 인한 웰드부 강도는 모재 대비 크게 회복 못 함 — 외관 양품 ≠ 강도 OK.');
  }

  if (node.patternHints) {
    lines.push('\n패턴 단서 (defect_description 키워드 → 분기 가중):');
    for (const [hint, action] of Object.entries(node.patternHints)) {
      lines.push(`- "${hint}" → ${action}`);
    }
  }

  if (node.priorityLogic) {
    lines.push(`\n우선순위 로직: ${node.priorityLogic}`);
  }

  // 가열방식에 따른 게이트 조언 보강
  const heatingMethod = advSettings.heatingMethod || '';
  let heatingNote = '';
  if (heatingMethod === '카트리지') {
    heatingNote = '\n(가열방식: 카트리지 히터 — hot spot 주의, 금형 내 온도 불균일 가능성 확인 권장)';
  } else if (heatingMethod === '온수기') {
    heatingNote = '\n(가열방식: 온수기 — 상한 ~149°C. 이 이상 필요 시 가압수 또는 오일 TCU 검토)';
  } else if (heatingMethod === '온유기') {
    heatingNote = '\n(가열방식: 오일 TCU — 배관 열손실로 실제 금형온도가 설정보다 최대 40°C 낮을 수 있음)';
  }

  // 공유 게이트 (트리거 충족 시만 포함)
  if (node.sharedGates && node.sharedGates.length > 0) {
    for (const gateId of node.sharedGates) {
      const gate = SHARED_GATES[gateId];
      if (gate && isGateTriggered(gate, resinSpec, settings, filler)) {
        lines.push('\n' + gate.guidance + heatingNote);
      }
    }
  }

  lines.push('\n※ 이 가이드레일은 참고 조언입니다. 최종 추정은 전체 맥락으로 하십시오.');
  return lines.join('\n');
}
