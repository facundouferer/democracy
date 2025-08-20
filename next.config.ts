import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'parlamentaria.hcdn.gob.ar',
        port: '',
        pathname: '/image/**',
      },
      {
        protocol: 'https',
        hostname: 'www.hcdn.gob.ar',
        port: '',
        pathname: '/**',
      },
    ],
  },
};

export default nextConfig;
