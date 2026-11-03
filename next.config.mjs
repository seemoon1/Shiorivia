/** @type {import('next').NextConfig} */
const nextConfig = {
  // The local launcher probes 127.0.0.1; keep the dev-origin exception loopback-only.
  allowedDevOrigins: ['127.0.0.1'],

  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: '**',
      },
      {
        protocol: 'http',
        hostname: '**',
      },
    ],
    unoptimized: true, 
  },

  reactStrictMode: false,

  typescript: {
    ignoreBuildErrors: true,
  },
};

export default nextConfig;