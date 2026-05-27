/** @type {import('next').NextConfig} */
const nextConfig = {
  // standalone output bundles only the needed files — critical for small Docker images
  output: 'standalone',

  // Forward /api/graphql requests to the NestJS backend (for local dev)
  async rewrites() {
    return [
      {
        source: '/api/graphql',
        destination: process.env.BACKEND_URL
          ? `${process.env.BACKEND_URL}/graphql`
          : 'http://localhost:3001/graphql',
      },
    ];
  },
};

export default nextConfig;
