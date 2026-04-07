'use client';

import { useState } from 'react';
import Link from 'next/link';

const defects = [
  {
    id: 'short-shot',
    ko: '미성형',
    en: 'Short Shot',
    description: '충전 부족으로 제품이 완성되지 않는 현상. 제품의 끝부분이나 얇은 부위가 채워지지 않음.',
    causes: [
      '사출 압력/속도 부족',
      '수지 온도 낮음 (점도 높음)',
      '게이트/러너 크기 부족',
      '벤트 불량 (공기 갇힘)',
      '계량 부족',
    ],
    solutions: [
      '사출 압력 및 1차 속도 증가',
      '노즐/실린더 온도 상승',
      '게이트 크기 확대 또는 러너 개선',
      '벤트 추가/청소',
      '계량값 증가',
    ],
    resinNotes: {
      PA: '결정성 수지로 급격한 점도 변화. 온도 관리 중요.',
      PBT: '빠른 결정화. 게이트 크기 충분히 확보 필요.',
      PC: '고점도. 온도 충분히 높여야 함 (280-320℃).',
      ABS: '상대적으로 쉬운 편이나 온도 관리 필요.',
      LCP: '점도 매우 낮음. Short Shot 발생 드묾.',
    },
    color: 'red',
  },
  {
    id: 'flash',
    ko: '플래시',
    en: 'Flash',
    description: '파팅 라인이나 에젝터 핀 주변에서 수지가 새어 나오는 현상.',
    causes: [
      '형체력 부족',
      '사출 압력/보압 과다',
      '금형 PL면 마모/손상',
      '금형 강성 부족',
      '수지 온도 과다 (점도 하락)',
    ],
    solutions: [
      '형체력 증가 또는 투영 면적 감소',
      '사출 압력/보압 감소',
      '금형 PL면 수리',
      '사출 속도 감소',
      '수지 온도 하강',
    ],
    resinNotes: {
      PA: '점도 낮고 결정성 → Flash 발생 쉬움. 형체력 충분히 확보.',
      PPS: 'Flash 발생 매우 쉬움. 형체력 충분히 확보.',
      LCP: '점도 극히 낮음. Flash 발생 위험 최고. 금형 정밀도 중요.',
      PC: '고점도이나 온도 높으면 Flash 가능.',
      PP: '점도 낮음. Flash 주의.',
    },
    color: 'amber',
  },
  {
    id: 'sink-mark',
    ko: '싱크마크',
    en: 'Sink Mark',
    description: '두꺼운 부위 표면이 오목하게 함몰되는 현상. 내부 수축으로 발생.',
    causes: [
      '보압 부족',
      '보압 시간 부족',
      '냉각 시간 부족',
      '게이트 크기 작음 (조기 동결)',
      '벽 두께 불균일',
    ],
    solutions: [
      '보압 증가',
      '보압 시간 증가',
      '냉각 시간 증가',
      '게이트 크기 확대',
      '설계 변경 (벽 두께 균일화)',
    ],
    resinNotes: {
      PA: '수축률 높음. 보압 충분히 필요.',
      POM: '수축률 매우 높음 (2-3%). 보압 관리 중요.',
      PP: '수축률 높음 (1.5-2%). 냉각 충분히.',
      PC: '수축률 낮음. Sink Mark 상대적으로 적음.',
      PBT: 'GF 강화 시 수축률 감소.',
    },
    color: 'purple',
  },
  {
    id: 'weld-line',
    ko: '웰드라인',
    en: 'Weld Line',
    description: '두 수지 흐름이 합류하는 지점에 생기는 선. 강도 저하 원인.',
    causes: [
      '수지 온도 낮음',
      '금형 온도 낮음',
      '사출 속도 낮음',
      '게이트 위치 문제',
      '이형제 과다',
    ],
    solutions: [
      '수지 온도 상승',
      '금형 온도 상승',
      '사출 속도 증가',
      '게이트 위치/수 변경',
      '벤트 확인',
    ],
    resinNotes: {
      GF강화: 'GF 강화재는 웰드라인 강도 극히 저하. 설계 단계에서 게이트 위치 검토.',
      PA66: '온도 범위 좁음. 충분한 온도 유지 중요.',
      PC: '고점도. 충분한 온도 필요.',
    },
    color: 'blue',
  },
  {
    id: 'burn-mark',
    ko: '버닝/가스마크',
    en: 'Burn Mark',
    description: '공기 압축 발열 또는 수지 분해로 인해 제품에 탄 자국이 생기는 현상.',
    causes: [
      '사출 속도 과다 (공기 압축 발열)',
      '벤트 불량',
      '수지 온도 과다 (분해)',
      '과도한 체류 시간',
      '핫러너 온도 과다',
    ],
    solutions: [
      '사출 속도 감소',
      '벤트 추가/확대/청소',
      '수지 온도 하강',
      '사이클 타임 단축',
      '스크류 퍼지',
    ],
    resinNotes: {
      POM: '포름알데히드 가스 발생. 벤트 필수. 체류 시간 최소화.',
      PVC: 'HCl 가스 발생. 온도 관리 매우 중요.',
      PA: '수분에 의한 가스 발생 가능. 건조 중요.',
      ABS: '260℃ 이상에서 분해 시작.',
    },
    color: 'red',
  },
  {
    id: 'silver-streak',
    ko: '은줄',
    en: 'Silver Streak',
    description: '게이트에서 수지 흐름 방향으로 은색 줄무늬가 생기는 현상. 수분 또는 가스 원인.',
    causes: [
      '수지 건조 불충분 (수분)',
      '수지 온도 과다 (분해 가스)',
      '공기 혼입 (배압 낮음)',
      '스크류 역류',
      '이형제 가스',
    ],
    solutions: [
      '수지 건조 온도/시간 확인',
      '수지 온도 하강',
      '배압 증가',
      '스크류 RPM 감소',
      '사출 속도 감소 (1차)',
    ],
    resinNotes: {
      PA66: '수분 흡습 강함. 건조 필수 (80℃, 4-8시간).',
      PA6: '건조 80℃, 4-6시간.',
      PA46: '매우 흡습. 건조 80℃, 16-24시간.',
      PC: '건조 120℃, 4시간. 재건조 반드시 필요.',
      PMMA: '건조 80℃, 3시간.',
      TPU: '건조 80-100℃, 2-4시간.',
      PBT: '건조 120℃, 4시간.',
    },
    color: 'slate',
  },
  {
    id: 'discoloration',
    ko: '변색',
    en: 'Discoloration',
    description: '제품 색상이 의도와 다르게 변하는 현상. 갈색화, 황변, 탄화 등.',
    causes: [
      '수지 온도 과다 (열화)',
      '과도한 체류 시간',
      '이전 수지 오염',
      '스크류/바렐 손상',
      '난연제 분해',
    ],
    solutions: [
      '수지 온도 하강',
      '사이클 타임 단축',
      '철저한 퍼지',
      '스크류/바렐 점검',
      '핫러너 온도 균일화',
    ],
    resinNotes: {
      ABS: '260℃ 이상에서 황변/갈변.',
      난연등급: '난연제 (특히 할로겐계) 분해온도 확인 필수.',
      PA: '수분에 의한 가수분해 변색.',
    },
    color: 'amber',
  },
  {
    id: 'crack',
    ko: '크랙',
    en: 'Crack',
    description: '제품에 균열이 생기는 현상. 이형 시, 사용 중, 또는 후처리 중 발생.',
    causes: [
      '잔류 응력 과다 (보압 과다)',
      '이형 불량 (에젝터)',
      '금형 온도 낮음',
      '환경 응력 균열 (화학물질 접촉)',
      '과도한 사출 속도',
    ],
    solutions: [
      '보압 감소',
      '에젝터 설계 개선, 이형제 적용',
      '금형 온도 상승',
      '냉각 시간 충분히',
      '잔류 응력 제거 어닐링',
    ],
    resinNotes: {
      PC: '환경 응력 균열 취약. 이형제 선택 주의.',
      PMMA: '취성. 잔류 응력 주의.',
      PA: '유리섬유 배향에 의한 방향성 균열.',
    },
    color: 'red',
  },
  {
    id: 'warpage',
    ko: '휨/변형',
    en: 'Warpage',
    description: '이형 후 제품이 뒤틀리거나 변형되는 현상.',
    causes: [
      '불균일 냉각',
      '금형 온도 불균일',
      '보압 불균일 (멀티캐비티)',
      '수지 배향 차이 (GF 강화)',
      '두께 불균일',
    ],
    solutions: [
      '금형 냉각 회로 개선',
      '금형 온도 균일화',
      '보압 최적화',
      '냉각 지그 사용',
      '게이트 위치 변경',
    ],
    resinNotes: {
      'GF강화': '섬유 배향에 의한 이방성 수축 → 심한 휨. 설계 단계 검토 필수.',
      PP: '수축률 높음. 균일 냉각 중요.',
      PA: '흡습에 의한 치수 변화 고려.',
      POM: '높은 수축률. 충분한 보압/냉각.',
    },
    color: 'purple',
  },
  {
    id: 'void',
    ko: '기포',
    en: 'Void/Bubble',
    description: '제품 내부에 생기는 공동(기포). 표면에서 보이지 않는 내부 불량.',
    causes: [
      '보압 부족',
      '보압 시간 부족',
      '게이트 조기 동결',
      '사출 속도 과다',
      '수지 건조 불량',
    ],
    solutions: [
      '보압 증가',
      '보압 시간 증가',
      '게이트 크기 확대',
      '사출 속도 감소 (마지막 단계)',
      '수지 건조 확인',
    ],
    resinNotes: {
      PC: '두꺼운 부위 기포 발생 쉬움.',
      PA: '수분 기포 주의. 건조 필수.',
      투명: '투명 수지에서 육안 확인 가능. 엄격한 관리 필요.',
    },
    color: 'blue',
  },
  {
    id: 'jetting',
    ko: '젯팅',
    en: 'Jetting',
    description: '게이트에서 수지가 고속 분사되어 뱀 모양의 흔적이 생기는 현상.',
    causes: [
      '사출 속도 과다',
      '게이트 크기 작음',
      '게이트 위치 불량 (공간을 향해 직접 사출)',
      '수지 온도 낮음',
    ],
    solutions: [
      '사출 속도 감소 (1단)',
      '게이트 크기 확대',
      '게이트 위치/방향 변경',
      '수지 온도 상승',
      '다단 사출 (느리게 시작)',
    ],
    resinNotes: {
      일반: '게이트를 향해 벽면이 있으면 Jetting 억제.',
    },
    color: 'amber',
  },
  {
    id: 'surface-roughness',
    ko: '표면 거침',
    en: 'Surface Roughness',
    description: '제품 표면이 거칠거나 광택이 없는 현상. 유동 불량, 금형 온도 부족 등.',
    causes: [
      '수지 온도 낮음',
      '금형 온도 낮음',
      '사출 속도 낮음',
      '금형 표면 불량',
      '이형제 과다',
    ],
    solutions: [
      '수지 온도 상승',
      '금형 온도 상승',
      '사출 속도 증가',
      '금형 폴리싱',
      '이형제 양 조절',
    ],
    resinNotes: {
      PA: 'GF 강화 시 표면에 섬유 노출 가능 → 금형 온도 높이면 개선.',
      PC: '광택 우수하나 금형 온도 중요.',
      ABS: '표면 재현성 양호.',
    },
    color: 'slate',
  },
];

const colorMap: Record<string, string> = {
  red: 'border-red-300 bg-red-50',
  amber: 'border-amber-300 bg-amber-50',
  purple: 'border-purple-300 bg-purple-50',
  blue: 'border-blue-300 bg-blue-50',
  slate: 'border-slate-300 bg-slate-50',
};

const headerColorMap: Record<string, string> = {
  red: 'bg-red-500',
  amber: 'bg-amber-500',
  purple: 'bg-purple-500',
  blue: 'bg-blue-500',
  slate: 'bg-slate-500',
};

export default function GuidePage() {
  const [openId, setOpenId] = useState<string | null>(null);

  const toggle = (id: string) => setOpenId(openId === id ? null : id);

  return (
    <div className="max-w-4xl mx-auto px-4 py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-[#1E293B] mb-2">사출 불량 가이드</h1>
        <p className="text-slate-500">12가지 주요 불량 유형별 원인과 해결 방향을 확인하세요.</p>
      </div>

      <div className="space-y-3">
        {defects.map((defect) => (
          <div
            key={defect.id}
            className={`border-2 rounded-xl overflow-hidden transition-all ${
              openId === defect.id ? colorMap[defect.color] : 'border-slate-200 bg-white'
            }`}
          >
            <button
              type="button"
              className="w-full flex items-center justify-between p-5 text-left"
              onClick={() => toggle(defect.id)}
            >
              <div className="flex items-center gap-3">
                <span className={`w-10 h-10 rounded-full ${headerColorMap[defect.color]} text-white flex items-center justify-center text-sm font-bold shrink-0`}>
                  {defect.id === 'short-shot' ? '1' : defect.id === 'flash' ? '2' : defect.id === 'sink-mark' ? '3' : defect.id === 'weld-line' ? '4' : defect.id === 'burn-mark' ? '5' : defect.id === 'silver-streak' ? '6' : defect.id === 'discoloration' ? '7' : defect.id === 'crack' ? '8' : defect.id === 'warpage' ? '9' : defect.id === 'void' ? '10' : defect.id === 'jetting' ? '11' : '12'}
                </span>
                <div>
                  <span className="font-bold text-[#1E293B] text-lg">{defect.ko}</span>
                  <span className="text-slate-400 ml-2 text-base">({defect.en})</span>
                </div>
              </div>
              <svg
                className={`w-5 h-5 text-slate-400 transition-transform ${openId === defect.id ? 'rotate-180' : ''}`}
                fill="none" stroke="currentColor" viewBox="0 0 24 24"
              >
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
              </svg>
            </button>

            {openId === defect.id && (
              <div className="px-5 pb-5 space-y-5">
                <p className="text-slate-600">{defect.description}</p>

                <div className="grid sm:grid-cols-2 gap-4">
                  <div>
                    <h4 className="font-bold text-[#1E293B] mb-3 flex items-center gap-2">
                      <span className="text-red-500">◆</span> 일반적 원인
                    </h4>
                    <ul className="space-y-2">
                      {defect.causes.map((cause, i) => (
                        <li key={i} className="flex items-start gap-2 text-sm text-slate-600">
                          <span className="text-red-400 mt-0.5 shrink-0">•</span>
                          {cause}
                        </li>
                      ))}
                    </ul>
                  </div>
                  <div>
                    <h4 className="font-bold text-[#1E293B] mb-3 flex items-center gap-2">
                      <span className="text-green-500">◆</span> 해결 방향
                    </h4>
                    <ul className="space-y-2">
                      {defect.solutions.map((sol, i) => (
                        <li key={i} className="flex items-start gap-2 text-sm text-slate-600">
                          <span className="text-green-500 mt-0.5 shrink-0">✓</span>
                          {sol}
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>

                {Object.keys(defect.resinNotes).length > 0 && (
                  <div>
                    <h4 className="font-bold text-[#1E293B] mb-3 flex items-center gap-2">
                      <span className="text-blue-500">◆</span> 수지별 주의사항
                    </h4>
                    <div className="grid sm:grid-cols-2 gap-2">
                      {Object.entries(defect.resinNotes).map(([resin, note]) => (
                        <div key={resin} className="bg-white rounded-lg p-3 border border-slate-200">
                          <span className="font-bold text-[#1E293B] text-sm">{resin}</span>
                          <p className="text-slate-500 text-xs mt-1">{note}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                <div className="pt-2">
                  <Link
                    href={`/diagnose?defect=${encodeURIComponent(defect.ko)}`}
                    className="inline-flex items-center gap-2 bg-[#059669] hover:bg-[#047857] text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
                    </svg>
                    {defect.ko} AI 진단하기
                  </Link>
                </div>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
