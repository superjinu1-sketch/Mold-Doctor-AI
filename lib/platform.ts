import { Capacitor } from '@capacitor/core';

export const isNativeApp = () => Capacitor.isNativePlatform(); // 웹 빌드에서 false — 웹 무영향
export const AUTH_DEEPLINK = 'com.jinsimlabs.molddoctor://auth-callback';
