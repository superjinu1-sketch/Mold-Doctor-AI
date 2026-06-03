'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useLocale } from '@/contexts/LocaleContext';

const defects = [
  {
    id: 'short-shot',
    nameKo: '미성형', nameEn: 'Short Shot',
    descriptionKo: '충전 부족으로 제품이 완성되지 않는 현상. 제품의 끝부분이나 얇은 부위가 채워지지 않음.',
    descriptionEn: 'Incomplete filling — the product is not fully formed. End sections or thin walls remain unfilled.',
    causesKo: ['사출 압력/속도 부족', '수지 온도 낮음 (점도 높음)', '게이트/러너 크기 부족', '벤트 불량 (공기 갇힘)', '계량 부족'],
    causesEn: ['Insufficient injection pressure/speed', 'Melt temperature too low (high viscosity)', 'Undersized gate or runner', 'Poor venting (trapped air)', 'Insufficient shot size (metering)'],
    solutionsKo: ['사출 압력 및 1차 속도 증가', '노즐/실린더 온도 상승', '게이트 크기 확대 또는 러너 개선', '벤트 추가/청소', '계량값 증가'],
    solutionsEn: ['Increase injection pressure and 1st-stage speed', 'Raise nozzle/barrel temperature', 'Enlarge gate or improve runner', 'Add or clean vents', 'Increase metering stroke'],
    resinNotesKo: { PA: '결정성 수지로 급격한 점도 변화. 온도 관리 중요.', PBT: '빠른 결정화. 게이트 크기 충분히 확보 필요.', PC: '고점도. 온도 충분히 높여야 함 (280-320℃).', ABS: '상대적으로 쉬운 편이나 온도 관리 필요.', LCP: '점도 매우 낮음. Short Shot 발생 드묾.' },
    resinNotesEn: { PA: 'Semi-crystalline: sharp viscosity change with temperature. Temperature control is critical.', PBT: 'Fast crystallization. Ensure adequate gate size.', PC: 'High viscosity. Requires high temperatures (280–320°C).', ABS: 'Relatively easy to process, but temperature management required.', LCP: 'Extremely low viscosity. Short shot is rare.' },
    color: 'red',
  },
  {
    id: 'flash',
    nameKo: '플래시', nameEn: 'Flash',
    descriptionKo: '파팅 라인이나 에젝터 핀 주변에서 수지가 새어 나오는 현상.',
    descriptionEn: 'Resin leaks past the parting line, ejector pins, or other mold interfaces.',
    causesKo: ['형체력 부족', '사출 압력/보압 과다', '금형 PL면 마모/손상', '금형 강성 부족', '수지 온도 과다 (점도 하락)'],
    causesEn: ['Insufficient clamp force', 'Excessive injection pressure or hold pressure', 'Worn or damaged parting line surface', 'Insufficient mold rigidity', 'Melt temperature too high (viscosity drops)'],
    solutionsKo: ['형체력 증가 또는 투영 면적 감소', '사출 압력/보압 감소', '금형 PL면 수리', '사출 속도 감소', '수지 온도 하강'],
    solutionsEn: ['Increase clamp force or reduce projected area', 'Reduce injection pressure and hold pressure', 'Repair parting line surface', 'Reduce injection speed', 'Lower melt temperature'],
    resinNotesKo: { PA: '점도 낮고 결정성 → Flash 발생 쉬움. 형체력 충분히 확보.', PPS: 'Flash 발생 매우 쉬움. 형체력 충분히 확보.', LCP: '점도 극히 낮음. Flash 발생 위험 최고. 금형 정밀도 중요.', PC: '고점도이나 온도 높으면 Flash 가능.', PP: '점도 낮음. Flash 주의.' },
    resinNotesEn: { PA: 'Low viscosity and semi-crystalline → prone to flash. Ensure sufficient clamp force.', PPS: 'Very flash-prone. Ensure sufficient clamp force.', LCP: 'Extremely low viscosity. Highest flash risk. Mold precision is critical.', PC: 'High viscosity, but flash possible at elevated temperatures.', PP: 'Low viscosity. Watch for flash.' },
    color: 'amber',
  },
  {
    id: 'sink-mark',
    nameKo: '싱크마크', nameEn: 'Sink Mark',
    descriptionKo: '두꺼운 부위 표면이 오목하게 함몰되는 현상. 내부 수축으로 발생.',
    descriptionEn: 'Concave depressions on the surface of thick sections, caused by internal shrinkage during cooling.',
    causesKo: ['보압 부족', '보압 시간 부족', '냉각 시간 부족', '게이트 크기 작음 (조기 동결)', '벽 두께 불균일'],
    causesEn: ['Insufficient hold pressure', 'Insufficient hold time', 'Insufficient cooling time', 'Small gate size (premature gate freeze)', 'Uneven wall thickness'],
    solutionsKo: ['보압 증가', '보압 시간 증가', '냉각 시간 증가', '게이트 크기 확대', '설계 변경 (벽 두께 균일화)'],
    solutionsEn: ['Increase hold pressure', 'Increase hold time', 'Increase cooling time', 'Enlarge gate size', 'Design change (uniform wall thickness)'],
    resinNotesKo: { PA: '수축률 높음. 보압 충분히 필요.', POM: '수축률 매우 높음 (2-3%). 보압 관리 중요.', PP: '수축률 높음 (1.5-2%). 냉각 충분히.', PC: '수축률 낮음. Sink Mark 상대적으로 적음.', PBT: 'GF 강화 시 수축률 감소.' },
    resinNotesEn: { PA: 'High shrinkage rate. Sufficient hold pressure required.', POM: 'Very high shrinkage (2–3%). Critical hold pressure management.', PP: 'High shrinkage (1.5–2%). Allow sufficient cooling.', PC: 'Low shrinkage. Sink marks relatively rare.', PBT: 'Shrinkage reduced with GF reinforcement.' },
    color: 'purple',
  },
  {
    id: 'weld-line',
    nameKo: '웰드라인', nameEn: 'Weld Line',
    descriptionKo: '두 수지 흐름이 합류하는 지점에 생기는 선. 강도 저하 원인.',
    descriptionEn: 'A line or seam that forms where two melt fronts meet. Can reduce structural strength.',
    causesKo: ['수지 온도 낮음', '금형 온도 낮음', '사출 속도 낮음', '게이트 위치 문제', '이형제 과다'],
    causesEn: ['Melt temperature too low', 'Mold temperature too low', 'Injection speed too low', 'Gate position problem', 'Excess mold release agent'],
    solutionsKo: ['수지 온도 상승', '금형 온도 상승', '사출 속도 증가', '게이트 위치/수 변경', '벤트 확인'],
    solutionsEn: ['Raise melt temperature', 'Raise mold temperature', 'Increase injection speed', 'Change gate location or add gates', 'Check and clean vents'],
    resinNotesKo: { 'GF강화': 'GF 강화재는 웰드라인 강도 극히 저하. 설계 단계에서 게이트 위치 검토.', PA66: '온도 범위 좁음. 충분한 온도 유지 중요.', PC: '고점도. 충분한 온도 필요.' },
    resinNotesEn: { 'GF Reinforced': 'GF reinforcement drastically reduces weld line strength. Review gate placement at design stage.', PA66: 'Narrow processing window. Maintaining sufficient temperature is critical.', PC: 'High viscosity. Adequate temperature is essential.' },
    color: 'blue',
  },
  {
    id: 'burn-mark',
    nameKo: '버닝/가스마크', nameEn: 'Burn Mark',
    descriptionKo: '공기 압축 발열 또는 수지 분해로 인해 제품에 탄 자국이 생기는 현상.',
    descriptionEn: 'Charring or discoloration from compressed-air combustion (diesel effect) or thermal degradation.',
    causesKo: ['사출 속도 과다 (공기 압축 발열)', '벤트 불량', '수지 온도 과다 (분해)', '과도한 체류 시간', '핫러너 온도 과다'],
    causesEn: ['Injection speed too high (compressed-air combustion)', 'Poor venting', 'Melt temperature too high (thermal degradation)', 'Excessive residence time', 'Hot runner temperature too high'],
    solutionsKo: ['사출 속도 감소', '벤트 추가/확대/청소', '수지 온도 하강', '사이클 타임 단축', '스크류 퍼지'],
    solutionsEn: ['Reduce injection speed', 'Add, enlarge, or clean vents', 'Lower melt temperature', 'Shorten cycle time', 'Purge screw'],
    resinNotesKo: { POM: '포름알데히드 가스 발생. 벤트 필수. 체류 시간 최소화.', PVC: 'HCl 가스 발생. 온도 관리 매우 중요.', PA: '수분에 의한 가스 발생 가능. 건조 중요.', ABS: '260℃ 이상에서 분해 시작.' },
    resinNotesEn: { POM: 'Generates formaldehyde gas. Venting is essential. Minimize residence time.', PVC: 'Generates HCl gas. Temperature control is critical.', PA: 'Moisture can generate gas. Drying is important.', ABS: 'Degradation begins above 260°C.' },
    color: 'red',
  },
  {
    id: 'silver-streak',
    nameKo: '은줄', nameEn: 'Silver Streak',
    descriptionKo: '게이트에서 수지 흐름 방향으로 은색 줄무늬가 생기는 현상. 수분 또는 가스 원인.',
    descriptionEn: 'Silver or streaky lines running in the flow direction from the gate, caused by moisture or gas.',
    causesKo: ['수지 건조 불충분 (수분)', '수지 온도 과다 (분해 가스)', '공기 혼입 (배압 낮음)', '스크류 역류', '이형제 가스'],
    causesEn: ['Insufficient resin drying (moisture)', 'Melt temperature too high (decomposition gas)', 'Air entrapment (back pressure too low)', 'Check ring backflow', 'Release agent outgassing'],
    solutionsKo: ['수지 건조 온도/시간 확인', '수지 온도 하강', '배압 증가', '스크류 RPM 감소', '사출 속도 감소 (1차)'],
    solutionsEn: ['Verify drying temperature and time', 'Lower melt temperature', 'Increase back pressure', 'Reduce screw RPM', 'Reduce 1st-stage injection speed'],
    resinNotesKo: { PA66: '수분 흡습 강함. 건조 필수 (80℃, 4-8시간).', PA6: '건조 80℃, 4-6시간.', PA46: '매우 흡습. 건조 80℃, 16-24시간.', PC: '건조 120℃, 4시간. 재건조 반드시 필요.', PMMA: '건조 80℃, 3시간.', TPU: '건조 80-100℃, 2-4시간.', PBT: '건조 120℃, 4시간.' },
    resinNotesEn: { PA66: 'Strong moisture absorption. Drying mandatory (80°C, 4–8 hrs).', PA6: 'Dry at 80°C, 4–6 hrs.', PA46: 'Extremely hygroscopic. Dry at 80°C, 16–24 hrs.', PC: 'Dry at 120°C, 4 hrs. Re-drying is essential.', PMMA: 'Dry at 80°C, 3 hrs.', TPU: 'Dry at 80–100°C, 2–4 hrs.', PBT: 'Dry at 120°C, 4 hrs.' },
    color: 'slate',
  },
  {
    id: 'discoloration',
    nameKo: '변색', nameEn: 'Discoloration',
    descriptionKo: '제품 색상이 의도와 다르게 변하는 현상. 갈색화, 황변, 탄화 등.',
    descriptionEn: 'Product color deviates from intent — browning, yellowing, charring, etc.',
    causesKo: ['수지 온도 과다 (열화)', '과도한 체류 시간', '이전 수지 오염', '스크류/바렐 손상', '난연제 분해'],
    causesEn: ['Melt temperature too high (thermal degradation)', 'Excessive residence time', 'Contamination from previous resin', 'Damaged screw or barrel', 'Flame retardant decomposition'],
    solutionsKo: ['수지 온도 하강', '사이클 타임 단축', '철저한 퍼지', '스크류/바렐 점검', '핫러너 온도 균일화'],
    solutionsEn: ['Lower melt temperature', 'Shorten cycle time', 'Thorough purging', 'Inspect screw and barrel', 'Equalize hot runner temperature'],
    resinNotesKo: { ABS: '260℃ 이상에서 황변/갈변.', '난연등급': '난연제 (특히 할로겐계) 분해온도 확인 필수.', PA: '수분에 의한 가수분해 변색.' },
    resinNotesEn: { ABS: 'Yellowing/browning above 260°C.', 'FR Grades': 'Check decomposition temperature of flame retardants (especially halogenated). Mandatory.', PA: 'Hydrolytic discoloration from moisture.' },
    color: 'amber',
  },
  {
    id: 'crack',
    nameKo: '크랙', nameEn: 'Crack',
    descriptionKo: '제품에 균열이 생기는 현상. 이형 시, 사용 중, 또는 후처리 중 발생.',
    descriptionEn: 'Cracks occurring during ejection, in service, or during post-processing.',
    causesKo: ['잔류 응력 과다 (보압 과다)', '이형 불량 (에젝터)', '금형 온도 낮음', '환경 응력 균열 (화학물질 접촉)', '과도한 사출 속도'],
    causesEn: ['Excessive residual stress (over-packing)', 'Ejection issues (ejector pin force)', 'Mold temperature too low', 'Environmental stress cracking (chemical contact)', 'Excessive injection speed'],
    solutionsKo: ['보압 감소', '에젝터 설계 개선, 이형제 적용', '금형 온도 상승', '냉각 시간 충분히', '잔류 응력 제거 어닐링'],
    solutionsEn: ['Reduce hold pressure', 'Improve ejector design; apply release agent', 'Raise mold temperature', 'Allow sufficient cooling time', 'Stress-relief annealing'],
    resinNotesKo: { PC: '환경 응력 균열 취약. 이형제 선택 주의.', PMMA: '취성. 잔류 응력 주의.', PA: '유리섬유 배향에 의한 방향성 균열.' },
    resinNotesEn: { PC: 'Susceptible to environmental stress cracking. Choose release agents carefully.', PMMA: 'Brittle material. Watch for residual stress.', PA: 'Directional cracking due to glass fiber orientation.' },
    color: 'red',
  },
  {
    id: 'warpage',
    nameKo: '휨/변형', nameEn: 'Warpage',
    descriptionKo: '이형 후 제품이 뒤틀리거나 변형되는 현상.',
    descriptionEn: 'Distortion or twisting of the part after ejection.',
    causesKo: ['불균일 냉각', '금형 온도 불균일', '보압 불균일 (멀티캐비티)', '수지 배향 차이 (GF 강화)', '두께 불균일'],
    causesEn: ['Uneven cooling', 'Non-uniform mold temperature', 'Uneven hold pressure (multi-cavity)', 'Differential fiber orientation (GF reinforced)', 'Non-uniform wall thickness'],
    solutionsKo: ['금형 냉각 회로 개선', '금형 온도 균일화', '보압 최적화', '냉각 지그 사용', '게이트 위치 변경'],
    solutionsEn: ['Improve mold cooling circuit', 'Equalize mold temperature', 'Optimize hold pressure', 'Use cooling fixtures', 'Change gate location'],
    resinNotesKo: { 'GF강화': '섬유 배향에 의한 이방성 수축 → 심한 휨. 설계 단계 검토 필수.', PP: '수축률 높음. 균일 냉각 중요.', PA: '흡습에 의한 치수 변화 고려.', POM: '높은 수축률. 충분한 보압/냉각.' },
    resinNotesEn: { 'GF Reinforced': 'Anisotropic shrinkage from fiber orientation → severe warpage. Review at design stage.', PP: 'High shrinkage. Uniform cooling is critical.', PA: 'Consider dimensional changes from moisture absorption.', POM: 'High shrinkage. Sufficient hold pressure and cooling required.' },
    color: 'purple',
  },
  {
    id: 'void',
    nameKo: '기포', nameEn: 'Void/Bubble',
    descriptionKo: '제품 내부에 생기는 공동(기포). 표면에서 보이지 않는 내부 불량.',
    descriptionEn: 'Internal voids inside the part that may not be visible from the surface.',
    causesKo: ['보압 부족', '보압 시간 부족', '게이트 조기 동결', '사출 속도 과다', '수지 건조 불량'],
    causesEn: ['Insufficient hold pressure', 'Insufficient hold time', 'Premature gate freeze', 'Injection speed too high', 'Inadequate resin drying'],
    solutionsKo: ['보압 증가', '보압 시간 증가', '게이트 크기 확대', '사출 속도 감소 (마지막 단계)', '수지 건조 확인'],
    solutionsEn: ['Increase hold pressure', 'Increase hold time', 'Enlarge gate size', 'Reduce injection speed (final stage)', 'Verify resin drying'],
    resinNotesKo: { PC: '두꺼운 부위 기포 발생 쉬움.', PA: '수분 기포 주의. 건조 필수.', '투명': '투명 수지에서 육안 확인 가능. 엄격한 관리 필요.' },
    resinNotesEn: { PC: 'Voids easily form in thick sections.', PA: 'Moisture-induced bubbles. Drying mandatory.', Transparent: 'Voids are visible in transparent resins. Strict control required.' },
    color: 'blue',
  },
  {
    id: 'jetting',
    nameKo: '젯팅', nameEn: 'Jetting',
    descriptionKo: '게이트에서 수지가 고속 분사되어 뱀 모양의 흔적이 생기는 현상.',
    descriptionEn: 'High-velocity melt jetting from the gate creates serpentine marks on the part surface.',
    causesKo: ['사출 속도 과다', '게이트 크기 작음', '게이트 위치 불량 (공간을 향해 직접 사출)', '수지 온도 낮음'],
    causesEn: ['Injection speed too high', 'Gate size too small', 'Poor gate location (direct injection into open space)', 'Melt temperature too low'],
    solutionsKo: ['사출 속도 감소 (1단)', '게이트 크기 확대', '게이트 위치/방향 변경', '수지 온도 상승', '다단 사출 (느리게 시작)'],
    solutionsEn: ['Reduce injection speed (1st stage)', 'Enlarge gate size', 'Change gate location or direction', 'Raise melt temperature', 'Multi-stage injection (start slow)'],
    resinNotesKo: { '일반': '게이트를 향해 벽면이 있으면 Jetting 억제.' },
    resinNotesEn: { General: 'Placing a wall opposite the gate suppresses jetting.' },
    color: 'amber',
  },
  {
    id: 'surface-roughness',
    nameKo: '표면 거침', nameEn: 'Surface Roughness',
    descriptionKo: '제품 표면이 거칠거나 광택이 없는 현상. 유동 불량, 금형 온도 부족 등.',
    descriptionEn: 'Rough surface or lack of gloss. Caused by inadequate flow, low mold temperature, etc.',
    causesKo: ['수지 온도 낮음', '금형 온도 낮음', '사출 속도 낮음', '금형 표면 불량', '이형제 과다'],
    causesEn: ['Melt temperature too low', 'Mold temperature too low', 'Injection speed too low', 'Poor mold surface condition', 'Excessive release agent'],
    solutionsKo: ['수지 온도 상승', '금형 온도 상승', '사출 속도 증가', '금형 폴리싱', '이형제 양 조절'],
    solutionsEn: ['Raise melt temperature', 'Raise mold temperature', 'Increase injection speed', 'Polish mold surface', 'Reduce release agent quantity'],
    resinNotesKo: { PA: 'GF 강화 시 표면에 섬유 노출 가능 → 금형 온도 높이면 개선.', PC: '광택 우수하나 금형 온도 중요.', ABS: '표면 재현성 양호.' },
    resinNotesEn: { PA: 'GF reinforcement can expose fibers at surface → raising mold temperature helps.', PC: 'Excellent surface gloss, but mold temperature is key.', ABS: 'Good surface reproducibility.' },
    color: 'slate',
  },
];

// Brand-unified: all defect categories use the same brand color system
const colorMap: Record<string, string> = {
  red:    'border-[var(--brand-border)] bg-brand-tint',
  amber:  'border-[var(--brand-border)] bg-brand-tint',
  purple: 'border-[var(--brand-border)] bg-brand-tint',
  blue:   'border-[var(--brand-border)] bg-brand-tint',
  slate:  'border-[var(--brand-border)] bg-brand-tint',
};

const headerColorMap: Record<string, string> = {
  red:    'bg-brand',
  amber:  'bg-brand',
  purple: 'bg-brand',
  blue:   'bg-brand',
  slate:  'bg-brand',
};

const DEFECT_NUMS: Record<string, string> = {
  'short-shot': '1', 'flash': '2', 'sink-mark': '3', 'weld-line': '4',
  'burn-mark': '5', 'silver-streak': '6', 'discoloration': '7', 'crack': '8',
  'warpage': '9', 'void': '10', 'jetting': '11', 'surface-roughness': '12',
};

export default function GuidePage() {
  const [openId, setOpenId] = useState<string | null>(null);
  const { t, locale } = useLocale();

  const toggle = (id: string) => setOpenId(openId === id ? null : id);

  return (
    <div className="bg-canvas min-h-screen px-4 sm:px-6 py-10">
      <div className="max-w-4xl mx-auto">
        <div className="mb-10">
          <div className="inline-flex items-center gap-2 border border-[var(--brand-border)] bg-brand-tint text-brand-ink text-xs font-medium px-3.5 py-1.5 rounded-full mb-5">
            <span className="w-1.5 h-1.5 bg-brand rounded-full" />
            {t('guide.badge')}
          </div>
          <h1 className="text-3xl font-bold text-ink mb-2">{t('guide.h1')}</h1>
          <p className="text-muted">{t('guide.sub')}</p>
        </div>

        <div className="space-y-2">
          {defects.map((defect) => {
            const isEn = locale === 'en';
            const displayName = isEn ? defect.nameEn : defect.nameKo;
            // Korean mode: show English in parens. English mode: no Korean shown.
            const secondaryName = isEn ? null : defect.nameEn;
            const description = isEn ? defect.descriptionEn : defect.descriptionKo;
            const causes = isEn ? defect.causesEn : defect.causesKo;
            const solutions = isEn ? defect.solutionsEn : defect.solutionsKo;
            const resinNotes = isEn ? defect.resinNotesEn : defect.resinNotesKo;

            return (
              <div
                key={defect.id}
                className={`border rounded-2xl overflow-hidden transition-all ${
                  openId === defect.id ? colorMap[defect.color] : 'border-border bg-surface hover:border-[var(--brand-border)]'
                }`}
              >
                <button
                  type="button"
                  className="w-full flex items-center justify-between p-5 text-left"
                  onClick={() => toggle(defect.id)}
                >
                  <div className="flex items-center gap-3">
                    <span className={`w-9 h-9 rounded-full ${headerColorMap[defect.color]} text-on-brand flex items-center justify-center text-sm font-bold shrink-0`}>
                      {DEFECT_NUMS[defect.id]}
                    </span>
                    <div>
                      <span className="font-bold text-ink text-base">{displayName}</span>
                      {secondaryName && (
                        <span className="text-faint ml-2 text-sm">({secondaryName})</span>
                      )}
                    </div>
                  </div>
                  <svg
                    className={`w-5 h-5 text-faint transition-transform ${openId === defect.id ? 'rotate-180' : ''}`}
                    fill="none" stroke="currentColor" viewBox="0 0 24 24"
                  >
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                  </svg>
                </button>

                {openId === defect.id && (
                  <div className="px-5 pb-6 space-y-5 border-t border-border pt-4">
                    <p className="text-muted text-sm leading-relaxed">{description}</p>

                    <div className="grid sm:grid-cols-2 gap-4">
                      <div>
                        <h4 className="font-semibold text-muted mb-3 flex items-center gap-2 text-sm">
                          <span className="text-danger">◆</span> {t('guide.causes_label')}
                        </h4>
                        <ul className="space-y-2">
                          {causes.map((cause, i) => (
                            <li key={i} className="flex items-start gap-2 text-sm text-muted">
                              <span className="text-danger mt-0.5 shrink-0">•</span>
                              {cause}
                            </li>
                          ))}
                        </ul>
                      </div>
                      <div>
                        <h4 className="font-semibold text-muted mb-3 flex items-center gap-2 text-sm">
                          <span className="text-ok">◆</span> {t('guide.solutions_label')}
                        </h4>
                        <ul className="space-y-2">
                          {solutions.map((sol, i) => (
                            <li key={i} className="flex items-start gap-2 text-sm text-muted">
                              <span className="text-ok mt-0.5 shrink-0">✓</span>
                              {sol}
                            </li>
                          ))}
                        </ul>
                      </div>
                    </div>

                    {Object.keys(resinNotes).length > 0 && (
                      <div>
                        <h4 className="font-semibold text-muted mb-3 flex items-center gap-2 text-sm">
                          <span className="text-brand-ink">◆</span> {t('guide.resin_notes_label')}
                        </h4>
                        <div className="grid sm:grid-cols-2 gap-2">
                          {Object.entries(resinNotes).map(([resin, note]) => (
                            <div key={resin} className="bg-surface-sunken rounded-xl p-3 border border-border">
                              <span className="font-bold text-ink text-sm">{resin}</span>
                              <p className="text-faint text-xs mt-1">{note}</p>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    <div className="pt-1">
                      <Link
                        href={`/diagnose?defect=${encodeURIComponent(defect.nameKo)}`}
                        className="inline-flex items-center gap-2 bg-brand hover:bg-brand-ink text-on-brand px-4 py-2 rounded-full text-sm font-bold transition-colors shadow-sm"
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
                        </svg>
                        {displayName} {t('guide.analyze_btn')}
                      </Link>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
