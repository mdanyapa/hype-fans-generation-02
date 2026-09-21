/** @type {import('next').NextConfig} */
const nextConfig = {
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: '**',
      },
    ],
  },
  // Increase body size limit for file uploads
  experimental: {
    serverActions: {
      bodySizeLimit: '20mb',
    },
  },
}

module.exports = nextConfig
