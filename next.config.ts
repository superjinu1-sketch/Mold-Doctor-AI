import type { NextConfig } from "next";
import path from "path";

const isCapacitor = process.env.BUILD_TARGET === 'capacitor';

const nextConfig: NextConfig = {
  turbopack: {
    root: path.resolve(__dirname),
  },
  serverExternalPackages: ['sharp'],
  ...(isCapacitor && {
    output: 'export' as const,
    trailingSlash: true,            // WebView 파일서빙에서 /diagnose → /diagnose/index.html 해석
    images: { unoptimized: true },  // 방어적 (next/image 사용 0 확인됨)
  }),
};

export default nextConfig;
