// 작업표준 저장소(/ledger) 매뉴얼 입력 폼용 필드 구성 — app/diagnose/page.tsx의 settings/advSettings와
// 동일 키·동일 t() 라벨을 재사용(신규 문구 없음, UI 카피 일관성). diagnose 페이지 자체는 무접촉.
export interface SettingField {
  key: string;
  labelKey: string;
  placeholder?: string;
}

export const TEMP_FIELDS: SettingField[] = [
  { key: 'nozzleTemp', labelKey: 'step3.nozzle' },
  { key: 'zone1Temp', labelKey: 'step3.zone1' },
  { key: 'zone2Temp', labelKey: 'step3.zone2' },
  { key: 'zone3Temp', labelKey: 'step3.zone3' },
  { key: 'zone4Temp', labelKey: 'step3.zone4' },
];

export const MOLD_TEMP_FIELDS: SettingField[] = [
  { key: 'moldTempFixed', labelKey: 'step3.fixed' },
  { key: 'moldTempMoving', labelKey: 'step3.moving' },
];

export const MACHINE_PARAM_FIELDS: SettingField[] = [
  { key: 'injPressure1', labelKey: 'step3.inj_pressure', placeholder: 'MPa' },
  { key: 'holdPressure', labelKey: 'step3.hold_pressure', placeholder: 'MPa' },
  { key: 'injSpeed1', labelKey: 'step3.inj_speed1', placeholder: '%' },
  { key: 'injSpeed2', labelKey: 'step3.inj_speed2', placeholder: '%' },
  { key: 'holdTime', labelKey: 'step3.hold_time', placeholder: 'sec' },
  { key: 'coolTime', labelKey: 'step3.cool_time', placeholder: 'sec' },
  { key: 'injTime', labelKey: 'step3.inj_time', placeholder: 'sec' },
  { key: 'metering', labelKey: 'step3.metering', placeholder: 'mm' },
  { key: 'cushion', labelKey: 'step3.cushion', placeholder: 'mm' },
  { key: 'backPressure', labelKey: 'step3.back_pressure', placeholder: 'MPa' },
  { key: 'screwRpm', labelKey: 'step3.screw_rpm', placeholder: 'rpm' },
  { key: 'clampForce', labelKey: 'step3.clamp', placeholder: 'ton' },
];

// 기본(위 3그룹 + pressureUnit) 키 — 프리필 시 settings/advSettings 분리에 사용.
export const BASIC_SETTING_KEYS = [
  ...TEMP_FIELDS.map(f => f.key),
  ...MOLD_TEMP_FIELDS.map(f => f.key),
  ...MACHINE_PARAM_FIELDS.map(f => f.key),
  'pressureUnit',
];

export interface SettingGroup {
  titleKey: string;
  fields: SettingField[];
}

export const ADV_FIELD_GROUPS: SettingGroup[] = [
  {
    titleKey: 'adv.vp_section',
    fields: [
      { key: 'vpTransferPos', labelKey: 'adv.vp_pos' },
      { key: 'vpTransferPressure', labelKey: 'adv.vp_pressure' },
      { key: 'preInjectDecompDist', labelKey: 'adv.decomp_pre' },
      { key: 'preInjectDecompSpeed', labelKey: 'adv.decomp_pre_speed' },
      { key: 'postMeterDecompDist', labelKey: 'adv.decomp_post' },
    ],
  },
  {
    titleKey: 'adv.actual_section',
    fields: [
      { key: 'actualFillTime', labelKey: 'adv.fill_time' },
      { key: 'actualPeakPressure', labelKey: 'adv.peak_pressure' },
      { key: 'actualCushion', labelKey: 'adv.cushion' },
      { key: 'actualCycleTime', labelKey: 'adv.cycle_time' },
      { key: 'actualPartWeight', labelKey: 'adv.part_weight' },
    ],
  },
  {
    titleKey: 'adv.dry_section',
    fields: [
      { key: 'dryTemp', labelKey: 'adv.dry_temp' },
      { key: 'dryTime', labelKey: 'adv.dry_time' },
      { key: 'dryerType', labelKey: 'adv.dryer_type' },
      { key: 'moistureContent', labelKey: 'adv.moisture' },
    ],
  },
  {
    titleKey: 'adv.hr_section',
    fields: [
      { key: 'hrManifoldTemp', labelKey: 'adv.hr_manifold' },
      { key: 'hrNozzle1Temp', labelKey: 'adv.hr_nozzle1' },
      { key: 'hrNozzle2Temp', labelKey: 'adv.hr_nozzle2' },
      { key: 'hrNozzle3Temp', labelKey: 'adv.hr_nozzle3' },
      { key: 'hrNozzle4Temp', labelKey: 'adv.hr_nozzle4' },
      { key: 'valveGate', labelKey: 'adv.valve_gate' },
    ],
  },
  {
    titleKey: 'adv.regrind_section',
    fields: [
      { key: 'regrindRatio', labelKey: 'adv.regrind_ratio' },
      { key: 'colorType', labelKey: 'adv.color_type' },
      { key: 'mbRatio', labelKey: 'adv.color_ratio' },
    ],
  },
  {
    titleKey: 'adv.machine_section',
    fields: [
      { key: 'machineModel', labelKey: 'adv.machine_model' },
      { key: 'screwDiameter', labelKey: 'adv.screw_dia' },
      { key: 'maxClampForce', labelKey: 'adv.max_clamp' },
      { key: 'maxInjPressure', labelKey: 'adv.max_pressure' },
      { key: 'heatingMethod', labelKey: 'adv.heating_method' },
    ],
  },
];

export const ADV_SETTING_KEYS = ADV_FIELD_GROUPS.flatMap(g => g.fields.map(f => f.key));

// 원본 diagnose 페이지의 settings(기본값 pressureUnit='bar')와 동일 초기값.
export function emptySettings(): Record<string, string> {
  const out: Record<string, string> = {};
  for (const k of BASIC_SETTING_KEYS) out[k] = '';
  out.pressureUnit = 'bar';
  for (const k of ADV_SETTING_KEYS) out[k] = '';
  return out;
}
