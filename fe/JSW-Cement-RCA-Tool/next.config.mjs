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
  webpack: (config, { isServer }) => {
    if (!isServer) {
      config.resolve.fallback = {
        ...config.resolve.fallback,
        mqtt: false,
        net: false,
        tls: false,
        fs: false,
        dns: false,
        child_process: false,
        socks: false,
        stream: false,
        buffer: false,
        util: false,
        assert: false,
        events: false,
        http: false,
        https: false,
        os: false,
        path: false,
        querystring: false,
        url: false,
        crypto: false,
        zlib: false,
      };

      // Completely exclude connector-userid-ts from client bundle
      config.externals = config.externals || [];
      config.externals.push({
        '../../../../../connector-userid-ts/dist/index.js': 'commonjs ../../../../../connector-userid-ts/dist/index.js',
      });
    }
    return config;
  },
  serverExternalPackages: ['mqtt', 'connector-userid-ts'],
}

export default nextConfig
