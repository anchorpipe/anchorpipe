/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  transpilePackages: ['@anchorpipe/*'],
  experimental: {
    serverActions: {
      bodySizeLimit: '2mb',
    },
  },
  // Enable standalone output for Docker
  output: 'standalone',
  eslint: {
    // Don't run ESLint during builds (run it separately via Nx)
    ignoreDuringBuilds: true,
  },
};

export default nextConfig;
