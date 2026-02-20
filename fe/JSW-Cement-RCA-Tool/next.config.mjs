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
    // Exclude connector-userid-ts and its dependencies from client-side bundle
    if (!isServer) {
      // Prevent Node.js modules from being bundled on client side
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

      // Add externals for client-side to prevent bundling
      config.externals = config.externals || [];
      if (typeof config.externals === 'object' && !Array.isArray(config.externals)) {
        config.externals = [config.externals];
      }
      config.externals.push(({ request }, callback) => {
        // Exclude connector-userid-ts and all its dependencies from client bundle
        if (request && (
          request.includes('connector-userid-ts') ||
          request === 'mqtt' ||
          request === 'socks'
        )) {
          return callback(null, 'commonjs ' + request);
        }
        callback();
      });
    }

    return config;
  },
  serverExternalPackages: ['mqtt', 'connector-userid-ts', 'socks'],
}

export default nextConfig
