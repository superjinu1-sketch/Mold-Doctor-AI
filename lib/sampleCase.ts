// 무료 체험 샘플(PA66 은줄)의 입력 원본 — app/diagnose/page.tsx(클라 폼 프리필)와
// app/api/diagnose/route.ts(서버 측 데모 판정 검증) 양쪽이 이 단일 소스를 공유한다.
// 이 샘플을 "수정 없이 그대로" 진단할 때만 lib/sample-demo.ts의 고정 결과를 무료로 반환한다.
export const SAMPLE_CASES = [
  {
    label: 'PA66 GF33%', defectTypeKey: 'defect.silver_streak',
    defectType: '은줄 (Silver Streak)',
    defectDescription: '제품 표면에 은색 줄무늬 발생. 5샷에 1번꼴, 게이트 부근에서 시작됨.',
    resinType: 'PA66', filler: 'GF(유리섬유)', fillerContent: '33', flameRetardant: '없음', flameRetardantThickness: '미입력', flameRetardantType: '해당없음', resinDetail: 'PA66 GF33%', resinGrade: '',
    nozzleTemp: '285', zone1Temp: '280', zone2Temp: '275', zone3Temp: '265', zone4Temp: '255',
    moldTempFixed: '80', moldTempMoving: '80', injPressure1: '120', holdPressure: '80',
    injSpeed1: '60', injSpeed2: '40', holdTime: '8', coolTime: '15', injTime: '3',
    metering: '85', cushion: '5', backPressure: '5', screwRpm: '80', clampForce: '', pressureUnit: 'MPa',
    moldType: '2판', gateType: '사이드', cavities: '4', runnerType: '콜드', weight: '45', wallThicknessMin: '1.5', wallThicknessMax: '3.0',
  },
] as const;

// 서버 측 데모 판정 최소 검증 — 클라이언트가 보낸 isDemo:true를 그대로 신뢰하지 않는다.
// 사진(images·moldDrawings)이 하나라도 있으면 "샘플 그대로"가 아니므로 즉시 탈락시킨다
// (샘플 자체가 사진을 제공하지 않으므로 기준 식별자는 "이미지 없음").
const SNAPSHOT_FIELDS = [
  'nozzleTemp', 'zone1Temp', 'zone2Temp', 'moldTempFixed', 'injPressure1',
  'holdPressure', 'injSpeed1', 'holdTime', 'coolTime',
] as const;

interface DiagnoseDemoPayload {
  isDemo?: boolean;
  defectType?: unknown;
  resinInfo?: { resinType?: unknown };
  settings?: Record<string, unknown>;
  images?: unknown[];
  moldDrawings?: unknown[];
}

export function matchesSampleCase(body: DiagnoseDemoPayload): boolean {
  if (Array.isArray(body.images) && body.images.length > 0) return false;
  if (Array.isArray(body.moldDrawings) && body.moldDrawings.length > 0) return false;

  const sample = SAMPLE_CASES[0];
  if (body.defectType !== sample.defectType) return false;
  if (body.resinInfo?.resinType !== sample.resinType) return false;

  const settings = body.settings ?? {};
  return SNAPSHOT_FIELDS.every(key => settings[key] === sample[key]);
}
