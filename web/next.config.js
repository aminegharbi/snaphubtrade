/** @type {import('next').NextConfig} */
const nextConfig = {
  output: 'standalone',
  images: {
    remotePatterns: [
      { protocol: 'http', hostname: 'localhost' },
      { protocol: 'http', hostname: '127.0.0.1' },
      { protocol: 'https', hostname: '*.amazonaws.com' },
      { protocol: 'https', hostname: '*.cloudfront.net' },
      { protocol: 'http', hostname: 'api' },
    ],
    unoptimized: true,
  },
  eslint:     { ignoreDuringBuilds: true },
  typescript: { ignoreBuildErrors: true },

  async rewrites() {
    const apiBase = (process.env.NEXT_PUBLIC_API_URL || 'http://api:3001/api/v1')
      .replace(/\/api\/v1$/, '');
    return [
      // API calls
      { source: '/api/v1/:path*', destination: `${apiBase}/api/v1/:path*` },
      // Static file uploads (images) — proxy to NestJS which serves them
      { source: '/static/:path*', destination: `${apiBase}/static/:path*` },
    ];
  },
};

module.exports = nextConfig;
