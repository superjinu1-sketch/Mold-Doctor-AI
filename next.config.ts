import type { NextConfig } from "next";
import path from "path";

const isCapacitor = process.env.BUILD_TARGET === 'capacitor';

const nextConfig: NextConfig = {
  turbopack: {
    root: path.resolve(__dirname),
  },
  serverExternalPackages: ['sharp'],

  // 구 도메인(mold-doctor-ai.vercel.app) → 신 도메인 301.
  // ⚠ /api 제외 필수 — 배포된 Capacitor 앱(Android v1.2·심사 중 iOS)이 구 도메인으로
  //   POST /api/*를 호출한다(scripts/build-capacitor.mjs의 API_BASE_URL_DEFAULT, 범위 밖 — 손대지 않음).
  //   리다이렉트되면 POST가 GET으로 바뀌거나 body가 유실돼 기존 사용자 진단이 전면 장애난다.
  // ⚠ output:'export'(Capacitor 빌드)는 redirects를 지원하지 않으므로 조건부로만 넣는다.
  ...(!isCapacitor && {
    async redirects() {
      return [
        {
          source: '/:path((?!api/|_next/|_vercel/).*)',
          has: [{ type: 'host' as const, value: 'mold-doctor-ai.vercel.app' }],
          destination: 'https://molddoctor.jinsimlabs.com/:path',
          permanent: true,
        },
      ];
    },
  }),

  ...(isCapacitor && {
    output: 'export' as const,
    trailingSlash: true,            // WebView 파일서빙에서 /diagnose → /diagnose/index.html 해석
    images: { unoptimized: true },  // 방어적 (next/image 사용 0 확인됨)
  }),
};

export default nextConfig;
