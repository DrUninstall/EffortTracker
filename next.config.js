/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  output: 'export',
  basePath: '/EffortTracker',
  assetPrefix: '/EffortTracker/',
  images: {
    unoptimized: true,
  },
};

module.exports = nextConfig;
