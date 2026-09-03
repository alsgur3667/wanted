import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // OG 이미지 라우트가 런타임에 읽는 폰트를 서버리스 번들에 포함시킨다
  outputFileTracingIncludes: {
    '/api/og/**': ['./assets/fonts/**'],
  },
  /* config options here */
};

export default nextConfig;
