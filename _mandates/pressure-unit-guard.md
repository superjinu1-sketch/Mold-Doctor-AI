# 압력 단위(bar/MPa) 처리 — OCR 인식 + 정규화 + 비현실값 가드

## 배경 / 목적
한국 사출기(우진 등)는 압력을 **bar**로 표시하는데, 앱은 모든 압력을 **MPa**로 가정(폼 placeholder·OCR 프롬프트·진단 프롬프트 전부 MPa). → 사용자가 "배압 80.1 bar"를 입력/촬영하면 앱이 80.1 MPa(=801 bar)로 읽어 **10배 과대 오진**(실제 케이스: 배압 "과대"를 1순위로 오진, 진짜 해법인 온도상향을 강등).

해결 3종(핵심=OCR):
1. **OCR이 화면의 압력 단위를 읽는다** (화면에 `[bar]` 표기 있음).
2. 압력 값을 **진단 직전 라우트 한 곳에서 MPa로 정규화** (다운스트림 프롬프트는 이미 MPa 기준이라 그대로 맞아짐).
3. **비현실값 가드** — 정규화 후에도 배압>30MPa 등이면 단위 오인 경고를 프롬프트에 주입(OCR 오독·수동 실수 백업).

## 원칙
- 내부 캐노니컬 단위 = **MPa**. 정규화는 **route 한 곳**에서만(중복 변환 금지).
- 기본 단위 = **bar**(한국 시장 현실). OCR이 읽으면 그 값으로 덮어씀.
- 압력 외 항목(속도%, 시간sec, 위치mm, RPM, ton)은 건드리지 말 것.
- 디자인 토큰만, 터치 44px. 끝나면 `npx tsc --noEmit`+`npm run build` 통과, push 금지, 변경파일 보고.

────────────────────────────────────
## 작업 1 — OCR이 단위 읽기 (app/api/extract-settings/route.ts)
프롬프트 JSON 스키마에 `"pressureUnit": ""` 추가(injPressure1 위 등 아무 곳). 그리고 항목설명 보강:

- JSON에 한 줄 추가: `  "pressureUnit": "",`
- 설명 블록에 추가:
  ```
  - pressureUnit: 화면에 표시된 압력 단위. 압력 항목 헤더/옆의 [bar], [MPa], [kgf/cm²] 표기를 그대로 읽어 "bar" | "MPa" | "kgf/cm2" 중 하나로 반환. 판단 불가 시 "".
  - 중요: 압력 값(injPressure1·holdPressure·backPressure)은 화면에 보이는 숫자 그대로 반환하라(단위 환산하지 말 것). 환산은 앱이 한다.
  ```
- 기존 `backPressure: 배압 (MPa)` 설명을 `backPressure: 배압 (화면 단위 그대로)` 로, `injPressure1: ... (MPa 또는 bar)`는 `(화면 단위 그대로)` 로 수정.

## 작업 2 — 폼에 단위 상태 + 토글 (app/diagnose/page.tsx)
1. settings 초기 state에 `pressureUnit: 'bar'` 추가(빈 기본값 객체. 데모 기본값 객체에도 있으면 동일 추가).
2. OCR 결과 적용부(handleSettingsImage 내 fill 루프): 기존 루프가 `key in updated` 면 채우므로 pressureUnit도 자동 채워지지만, **유효값만 허용**하도록 가드:
   - 루프 끝난 뒤 또는 안에서: `if (extracted.pressureUnit && ['bar','MPa','kgf/cm2'].includes(extracted.pressureUnit)) updated.pressureUnit = extracted.pressureUnit;`
   - pressureUnit은 extractedFields 하이라이트 대상에서 제외(라벨 아님).
3. 압력 입력 섹션(machineParams 렌더 근처) 위에 **단위 토글** 추가(세그먼트 bar/MPa):
   ```tsx
   <div className="flex items-center gap-2 mb-2">
     <span className="text-faint text-sm">{t('step3.pressure_unit')}</span>
     {(['bar','MPa'] as const).map(u => (
       <button key={u} type="button"
         onClick={() => setSettings(prev => ({ ...prev, pressureUnit: u }))}
         className={`min-h-[44px] px-4 rounded-lg border text-sm font-bold transition-colors ${
           settings.pressureUnit === u
             ? 'bg-brand-tint text-brand-ink border-[var(--brand-border)]'
             : 'bg-surface text-muted border-border hover:border-border-strong'}`}>
         {u}
       </button>
     ))}
   </div>
   ```
4. 진단 요청 body에 `pressureUnit: settings.pressureUnit` 포함(handleDiagnose가 /api/diagnose로 보내는 JSON.stringify 객체에 추가).
5. placeholder의 'MPa'는 그대로 둬도 됨(토글이 단위를 명시하므로). 선택: 압력 3필드 placeholder를 `settings.pressureUnit` 로 바꾸면 더 친절.

## 작업 3 — 라우트 정규화 + 가드 (app/api/diagnose/route.ts)
1. body 파싱부(L425 근처 destructure)에 `pressureUnit` 추가.
2. `const s = settings || {};` `const a = advSettings || {};` 를 **얕은 복사**로 바꾸고 정규화:
   ```ts
   const s = { ...(settings || {}) };
   const a = { ...(advSettings || {}) };
   const divide = pressureUnit === 'bar' || pressureUnit === 'kgf/cm2' || pressureUnit === 'kgf';
   const toMPa = (v?: string) => {
     const n = parseFloat(v ?? '');
     if (!isFinite(n)) return v ?? '';
     return divide ? String(Math.round((n / 10) * 100) / 100) : (v ?? '');
   };
   for (const k of ['injPressure1','holdPressure','backPressure'] as const) s[k] = toMPa(s[k]);
   for (const k of ['vpTransferPressure','actualPeakPressure','maxInjPressure'] as const) a[k] = toMPa(a[k]);
   ```
   (divide=false면 원본 유지 → MPa 입력·구버전 안전. 압력 외 키는 손 안 댐.)
3. moldMachineGuard rules 배열에 **비현실값 가드** 추가(maxInjP 규칙 근처):
   ```ts
   const bpN = parseFloat(s.backPressure || '0');
   const ipN = parseFloat(s.injPressure1 || '0');
   if (bpN > 30)
     rules.push(`- ⚠ 배압 ${bpN}MPa는 비현실적으로 높음(통상 5~20MPa). 단위 오인(bar↔MPa) 가능성 — 배압 기반 원인은 신중히 판단하고, 권고에 "화면 압력 단위(bar 여부) 확인"을 포함하라.`);
   if (ipN > 350)
     rules.push(`- ⚠ 1차 사출압 ${ipN}MPa는 비정상적으로 높음. 단위 확인 필요.`);
   ```
4. (선택, 투명성) 셋팅 프롬프트 블록(L610 근처)에 한 줄 추가: `- (압력 입력 단위: ${pressureUnit || 'MPa'}, 내부 MPa 환산 적용)`. 압력 라벨은 정규화로 이미 MPa가 맞으니 나머지 템플릿은 그대로.

## 작업 4 — i18n
`messages/ko.ts`: `'step3.pressure_unit': '압력 단위'`, `messages/en.ts`: `'step3.pressure_unit': 'Pressure unit'`.

## 변경 파일 요약
- 수정: extract-settings/route.ts, diagnose/route.ts, app/diagnose/page.tsx, messages/ko.ts·en.ts
- 불변: defect-kb.ts, resin-kb.ts (정규화가 route에서 끝나 KB는 그대로 MPa 기준)

## 검증
1. tsc + build 통과.
2. 토글 bar(기본) + 배압 80 입력 → 진단 프롬프트엔 배압 8MPa로 들어가야 함(가드 미발동).
3. 토글 MPa + 배압 80 입력 → 8이 아니라 80 그대로 + 가드 "비현실적" 경고 발동.
4. OCR 사진에 [bar] 보이면 결과 pressureUnit='bar'로 토글 자동 전환.
5. 압력 외 값(온도·속도·시간) 변화 0(회귀).
