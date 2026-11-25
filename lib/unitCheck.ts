// 추정 제출 직전 단위 착오 점검(10·11월 가입자 기록 17건 중 6건이 단위 착오).
//  - °C로 둔 채 °F 값 입력: 노즐·실린더 475·510, 금형 460
//  - bar로 둔 채 psi 값 입력: 사출압 30000, 배압 2000
//  - MPa로 둔 채 kgf/cm²·bar 값 입력: 배압 28·35 MPa
// 확실한 오류가 아니라 "확인해 보세요" 수준이므로 경고만 하고, 사용자가 그대로 진행할 수 있다.
// 기준은 서버 지시문(app/api/diagnose/route.ts 단위 규칙)과 맞춘다.

export type PressureUnit = 'bar' | 'MPa' | 'psi' | 'kgf/cm2';

export type UnitIssue =
  | { kind: 'temp_f'; value: number }
  | { kind: 'mold_temp_f'; value: number }
  | { kind: 'mpa_too_high'; field: 'inj' | 'hold' | 'back'; value: number }
  | { kind: 'bar_looks_psi'; field: 'inj' | 'hold' | 'back'; value: number };

const num = (v: unknown): number | null => {
  const n = parseFloat(String(v ?? '').replace(/,/g, ''));
  return Number.isFinite(n) ? n : null;
};

const maxOf = (vals: unknown[]): number | null => {
  const ns = vals.map(num).filter((n): n is number => n !== null);
  return ns.length ? Math.max(...ns) : null;
};

export function checkUnits(
  s: Record<string, unknown>,
  tempUnit: 'C' | 'F',
  pressureUnit: string,
): UnitIssue[] {
  const issues: UnitIssue[] = [];

  if (tempUnit === 'C') {
    // 사출 수지 중 가장 높은 PEEK·PEI도 실린더 400℃ 안팎이다. 그보다 높으면 °F일 가능성이 높다.
    const barrel = maxOf([s.nozzleTemp, s.zone1Temp, s.zone2Temp, s.zone3Temp, s.zone4Temp]);
    if (barrel !== null && barrel > 410) issues.push({ kind: 'temp_f', value: barrel });
    // 금형온도 250℃ 초과는 오일 온조기로도 쓰지 않는 값이다(PEEK·PEI 금형도 200℃ 안팎).
    const mold = maxOf([s.moldTempFixed, s.moldTempMoving]);
    if (mold !== null && mold > 250) issues.push({ kind: 'mold_temp_f', value: mold });
  }

  const inj = num(s.injPressure1);
  const hold = num(s.holdPressure);
  const back = num(s.backPressure);

  if (pressureUnit === 'MPa') {
    // 수지압 기준 사출·보압은 300 MPa를 넘지 않는다. 배압은 발포 공정 최대치(~22 MPa)도 넘으면 단위 착오.
    if (inj !== null && inj > 300) issues.push({ kind: 'mpa_too_high', field: 'inj', value: inj });
    else if (hold !== null && hold > 300) issues.push({ kind: 'mpa_too_high', field: 'hold', value: hold });
    else if (back !== null && back > 25) issues.push({ kind: 'mpa_too_high', field: 'back', value: back });
  } else if (pressureUnit === 'bar' || pressureUnit === 'kgf/cm2') {
    // 3000 bar(300 MPa)를 넘는 사출·보압, 300 bar를 넘는 배압은 psi 값일 가능성이 높다.
    if (inj !== null && inj > 3000) issues.push({ kind: 'bar_looks_psi', field: 'inj', value: inj });
    else if (hold !== null && hold > 3000) issues.push({ kind: 'bar_looks_psi', field: 'hold', value: hold });
    else if (back !== null && back > 300) issues.push({ kind: 'bar_looks_psi', field: 'back', value: back });
  }

  return issues;
}
