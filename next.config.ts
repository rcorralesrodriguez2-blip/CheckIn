import type {NextConfig} from 'next';

const nextConfig: NextConfig = {
  typescript: {
    ignoreBuildErrors: true,
  },
  eslint: {
    ignoreDuringBuilds: true,
  },
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'placehold.co',
        port: '',
        pathname: '/**',
      },
    ],
  },
  experimental: {
    optimizePackageImports: ['lucide-react'],
  },
  async headers() {
    return [
      {
        source: '/(.*)',
        headers: [
          {
  key: 'Content-Security-Policy',
  value: "connect-src 'self' ws://127.0.0.1:52181 ws://127.0.0.1:52182 ws://localhost:52181 ws://localhost:52182;",
},
        ],
      },
    ];
  },
  webpack: (config) => {
    config.resolve.alias = {
      ...config.resolve.alias,
      'WebSdk': false,
    };
    config.externals = [
      ...(Array.isArray(config.externals) ? config.externals : []),
      '@digitalpersona/devices',
    ];
    return config;
  },
};

export default nextConfig;