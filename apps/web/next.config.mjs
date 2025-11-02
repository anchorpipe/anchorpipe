/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  transpilePackages: ['@anchorpipe/*'],
  experimental: {
    serverActions: {
      bodySizeLimit: '2mb',
    },
  },
  // Temporarily skip type checking during build to avoid prerender errors
  // This is a workaround for Next.js 15 build issues with useContext
  typescript: {
    ignoreBuildErrors: false, // Keep false, but allow build to continue
  },
  eslint: {
    ignoreDuringBuilds: false,
  },
};

export default nextConfig;
