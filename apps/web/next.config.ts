import type { NextConfig } from 'next'

// The dashboard and API share one origin, so the session cookie just works.
const config: NextConfig = {
  async rewrites() {
    return [{ source: '/api/:path*', destination: `${process.env.API_URL ?? 'http://localhost:4000'}/api/:path*` }]
  },
}

export default config
