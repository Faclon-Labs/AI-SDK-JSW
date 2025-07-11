/** @type {import('next').NextConfig} */
const nextConfig = {
  basePath: '/jsw-rca-new',
  eslint: {
    ignoreDuringBuilds: true,
  },
  typescript: {
    ignoreBuildErrors: true,
  },
  images: {
    unoptimized: true,
  },
}

export default nextConfig