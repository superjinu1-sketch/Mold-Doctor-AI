# Capacitor Step 2 — 설치 + 원격로드(server.url) 셋업 + Android 플랫폼 추가

## 목표
Capacitor를 설치하고, `server.url`로 라이브 사이트(`https://mold-doctor-ai.vercel.app`)를 네이티브 WebView에 로드하는 데모 APK 빌드 기반을 만든다.
정적번들(static export) 안 함. webDir는 stub 1장(server.url이 런타임에 덮어씀).

## 확정값 (변경 금지)
- appId: `com.jinsimlabs.molddoctor`
- appName: `Mold-Doctor`
- server.url: `https://mold-doctor-ai.vercel.app`

## 작업 (mold-doctor 루트에서)

### 1. Capacitor 의존성 설치
```bash
npm i @capacitor/core@latest
npm i -D @capacitor/cli@latest
npm i @capacitor/android@latest
```

### 2. stub webDir 생성
새 폴더 `capacitor-www/`, 그 안에 `capacitor-www/index.html`:
```html
<!DOCTYPE html>
<html><head><meta charset="utf-8"><title>Mold-Doctor</title></head>
<body><p>Loading Mold-Doctor…</p></body></html>
```
(server.url 설정 시 런타임엔 이 파일 대신 라이브 사이트가 뜬다. Capacitor가 webDir 존재만 요구해서 두는 placeholder.)

### 3. capacitor.config.ts 생성 (루트)
```ts
import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.jinsimlabs.molddoctor',
  appName: 'Mold-Doctor',
  webDir: 'capacitor-www',
  server: {
    url: 'https://mold-doctor-ai.vercel.app',
    cleartext: false,
  },
};

export default config;
```

### 4. Android 플랫폼 추가 + 동기화
```bash
npx cap add android
npx cap sync android
```
→ 루트에 `android/` 폴더 생성됨.

### 5. .gitignore 정리
`.gitignore`에 아래 추가(빌드 산출물·캐시 제외, android/ 프로젝트 자체는 커밋 유지):
```
# Capacitor / Android
/android/.gradle
/android/app/build
/android/build
/android/capacitor-cordova-android-plugins
/android/local.properties
```

## 검증 (CC가 할 것)
1. `npx cap doctor android` 통과(또는 경고만, 에러 0).
2. `android/` 폴더 + `android/app/src/main/AndroidManifest.xml` 존재 확인.
3. AndroidManifest에 `<uses-permission android:name="android.permission.INTERNET"/>` 있는지 확인(Capacitor 기본 포함).
4. `npx tsc --noEmit`은 capacitor.config.ts 영향 없어야 함(루트 ts는 빌드 대상 아님, 에러 시 보고).
5. **push 하지 마라.** 변경/신규 파일 목록 보고.

## CC가 하지 않는 것 (진우 로컬 수동)
- APK 빌드: Android Studio로 `android/` 폴더 열고 Build > Build APK(s),
  또는 터미널 `cd android && ./gradlew assembleDebug` → `android/app/build/outputs/apk/debug/app-debug.apk`.
- 세컨폰 설치(USB 디버깅 or APK 직접 전송).

## 알려진 테스트 포인트 (빌드 후)
- APK 켜면 라이브 사이트 로드 → **샘플 진단(로그인 불필요)은 동작해야 함.**
- **구글 로그인은 이 단계에선 작동 안 함**(WebView OAuth 차단). 로그인은 다음 mandate(capacitor-step3-auth)에서 네이티브 OAuth + 이메일 로그인으로 해결.
- 카메라: HTML file input이 WebView서 네이티브 카메라/갤러리 호출되는지 확인(안 되면 @capacitor/camera는 나중).
