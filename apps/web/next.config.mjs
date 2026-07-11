/** @type {import('next').NextConfig} */
const nextConfig = {
  serverExternalPackages: ['@dobra-partia/db'],
  async redirects() {
    return [
      { source: '/index.html', destination: '/', permanent: true },
      { source: '/o-nas.html', destination: '/o-nas', permanent: true },
      { source: '/ochrana-sukromia.html', destination: '/ochrana-sukromia', permanent: true },
      { source: '/obchodne-podmienky.html', destination: '/obchodne-podmienky', permanent: true },
    ]
  },
}

export default nextConfig
