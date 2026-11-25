// 후속 라운드: 이전 권고의 "현재값"과 지금 입력된 셋팅값을 서버가 직접 대조한다.
// 앱은 이전 셋팅을 따로 보내지 않고 이전 결과(previousDiagnosis)만 보낸다. 사용자가 조치를 "실행함"으로
// 체크해도 셋팅값이 그대로인 경우가 있어(11/07 TPU 2차: 보압 122 그대로인데 "보압 조정 무효"로 해석),
// 바뀐 항목과 안 바뀐 항목을 사실로 알려 준다. 판정이 애매한 권고(시험·배럴 다구간·핫러너 등)는 건너뛴다.

export interface PrevRec { parameter?: string; current?: string; recommended?: string }

export interface SettingDiff {
  parameter: string;
  key: string;
  before: number;
  now: number;
  changed: boolean;
  /** 권고 방향과 비교: 'with' 권고 방향, 'against' 반대 방향, null 판단 불가(권고값 숫자 없음·변경 없음) */
  direction: 'with' | 'against' | null;
}

// 순서가 중요하다: 보압시간을 보압보다, 쿠션을 계량보다 먼저 본다.
const KEY_RULES: [RegExp, string][] = [
  [/보압\s*시간|hold(ing)?\s*time|pack(ing)?\s*time/i, 'holdTime'],
  [/보압|hold(ing)?\s*pressure|pack(ing)?\s*pressure/i, 'holdPressure'],
  [/배압|back\s*pressure/i, 'backPressure'],
  [/사출\s*압|injection\s*pressure|fill(ing)?\s*pressure/i, 'injPressure1'],
  [/사출\s*속도|injection\s*speed|fill(ing)?\s*speed/i, 'injSpeed1'],
  [/냉각\s*시간|cooling\s*time/i, 'coolTime'],
  [/쿠션|cushion/i, 'cushion'],
  [/계량|metering|shot\s*size/i, 'metering'],
  [/스크(류|루)\s*(회전|rpm)|screw\s*(speed|rpm)/i, 'screwRpm'],
  [/금형\s*(표면\s*)?온도|mou?ld\s*temp/i, 'moldTempFixed'],
  [/노즐\s*온도|nozzle\s*temp/i, 'nozzleTemp'],
];

// 숫자 비교가 의미 없는 권고: 시험·측정 절차, 핫러너(노즐과 혼동), 배럴 다구간
const SKIP = /시험|test|trial|핫\s*러너|hot\s*runner|배럴|barrel|실린더/i;
const STAGE2 = /2\s*단|2\s*차|2nd|second|stage\s*2/i;

const firstNum = (v: unknown): number | null => {
  const m = String(v ?? '').replace(/,/g, '').match(/-?\d+(\.\d+)?/);
  return m ? parseFloat(m[0]) : null;
};

function keyFor(parameter: string): string | null {
  if (SKIP.test(parameter)) return null;
  for (const [re, key] of KEY_RULES) {
    if (!re.test(parameter)) continue;
    if (key === 'injSpeed1' && STAGE2.test(parameter)) return 'injSpeed2';
    if (key === 'injPressure1' && STAGE2.test(parameter)) return 'injPressure2';
    return key;
  }
  return null;
}

const near = (a: number, b: number) => Math.abs(a - b) <= Math.max(0.05, Math.abs(b) * 0.005);

/**
 * @param recs 이전 결과의 recommendations
 * @param rawSettings 사용자가 입력한 그대로의 셋팅(단위 환산 전)
 * @param convSettings 서버가 °C·MPa로 환산한 셋팅(이전 결과가 환산값으로 적었을 수 있어 같이 본다)
 */
export function diffFollowUp(
  recs: PrevRec[] | undefined,
  rawSettings: Record<string, unknown>,
  convSettings: Record<string, unknown> = {},
): SettingDiff[] {
  const out: SettingDiff[] = [];
  const seen = new Set<string>();
  for (const r of recs ?? []) {
    const parameter = String(r?.parameter ?? '');
    const key = keyFor(parameter);
    if (!key || seen.has(key)) continue;
    const before = firstNum(r?.current);
    const nowRaw = firstNum(rawSettings[key]);
    if (before === null || nowRaw === null) continue;
    const nowConv = firstNum(convSettings[key]);
    seen.add(key);
    const same = near(nowRaw, before) || (nowConv !== null && near(nowConv, before));
    let direction: SettingDiff['direction'] = null;
    const target = firstNum(r?.recommended);
    if (!same && target !== null && !near(target, before)) {
      // 이전 값과 같은 체계(입력 그대로)로 비교. 환산값으로 적힌 경우는 환산값으로 비교.
      const now = nowConv !== null && Math.abs(nowConv - before) < Math.abs(nowRaw - before) ? nowConv : nowRaw;
      direction = Math.sign(target - before) === Math.sign(now - before) ? 'with' : 'against';
    }
    out.push({ parameter, key, before, now: nowRaw, changed: !same, direction });
  }
  return out;
}

export function formatFollowUpDiff(diffs: SettingDiff[], isEn: boolean): string {
  if (!diffs.length) return '';
  if (isEn) {
    const lines = diffs.map(d => `- ${d.parameter}: at the previous estimate ${d.before} → now ${d.now}: ${d.changed ? (d.direction === 'against' ? 'CHANGED (opposite to the previous recommendation)' : 'CHANGED') : 'UNCHANGED'}`);
    return `## Setting check against the previous recommendations (computed by the server from the entered values)
${lines.join('\n')}
Rules: an UNCHANGED item was not applied to the settings, even if the user checked it as done. Do NOT treat it as "tried with no effect" and do not say that adjustment was ineffective; say the entered value is still the same and ask the user to confirm whether it was really changed. Only CHANGED items count as evidence of what was tried. State a value changed opposite to the recommendation as a plain fact.`;
  }
  const lines = diffs.map(d => `- ${d.parameter}: 이전 추정 시점 ${d.before} → 지금 ${d.now}: ${d.changed ? (d.direction === 'against' ? '변경됨(이전 권고와 반대 방향)' : '변경됨') : '변경 없음'}`);
  return `## 이전 권고 대비 셋팅값 대조 (입력값으로 서버가 계산)
${lines.join('\n')}
규칙: '변경 없음' 항목은 사용자가 '실행함'으로 체크했어도 셋팅값에는 반영되지 않았다. 이 항목을 "해봤지만 효과 없음"으로 보지 말고, 그 조정이 무효였다고 쓰지 마라. 입력값이 그대로라는 사실을 적고 실제로 바꿨는지 확인을 요청하라. 시도 결과의 근거로는 '변경됨' 항목만 써라. 이전 권고와 반대 방향으로 바뀐 값은 사실 그대로만 적어라.`;
}
