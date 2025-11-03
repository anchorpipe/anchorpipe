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
};

export default nextConfig;
