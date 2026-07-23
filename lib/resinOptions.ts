// 수지 선택 옵션 — app/diagnose/page.tsx의 동일 상수를 조건 대장(/ledger)에서도 쓰기 위해 공유 모듈로 분리.
// diagnose 페이지 자체는 무접촉(회귀 리스크 0) — 값(한국어)은 API 호환을 위해 그대로 유지.
export const RESIN_OPTIONS = [
  { group: '폴리아미드 (나일론)', groupKey: 'resin.group.polyamide', options: ['PA6', 'PA66', 'PA46', 'PA410', 'PA4T', 'PA6T', 'PA9T', 'PA12T', 'PA12', 'PA610', 'PA612', 'PA1010', 'PA6/66', 'MXD6'] },
  { group: '폴리에스터', groupKey: 'resin.group.polyester', options: ['PBT', 'PET', 'PCT', 'PEN'] },
  { group: '엔지니어링 플라스틱 기타', groupKey: 'resin.group.engineering', options: ['PC', 'POM(아세탈)', 'PPE/PPO', 'm-PPE'] },
  { group: '슈퍼 엔지니어링 플라스틱', groupKey: 'resin.group.super_eng', options: ['PPS', 'LCP', 'PEEK', 'PEI', 'PAI', 'PI(폴리이미드)', 'PSU', 'PPSU', 'PES', 'PTFE', 'FEP', 'PFA', 'ETFE'] },
  { group: '범용 플라스틱', groupKey: 'resin.group.commodity', options: ['PP', 'PE(HDPE)', 'PE(LDPE)', 'PE(LLDPE)', 'PS', 'ABS', 'SAN', 'ASA', 'PMMA(아크릴)', 'PVC'] },
  { group: '블렌드/알로이', groupKey: 'resin.group.blend', options: ['PC/ABS', 'PC/PBT', 'PA/ABS', 'PA/PP', 'PPE/PA', 'PBT/ABS'] },
  { group: '엘라스토머/TPE', groupKey: 'resin.group.elastomer', options: ['TPU', 'TPE', 'TPC', 'TPA', 'TPEE', 'TPV', 'TPO'] },
  { group: '기타', groupKey: 'resin.group.other', options: ['기타 (직접 입력)'] },
];

export const RESIN_OPTION_EN_LABEL: Record<string, string> = {
  'POM(아세탈)': 'POM (Acetal)',
  'PI(폴리이미드)': 'PI (Polyimide)',
  'PMMA(아크릴)': 'PMMA (Acrylic)',
};

export const RESIN_CUSTOM_VALUE = '기타 (직접 입력)';
