import path from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))

/** @type {import('next').NextConfig} */
const nextConfig = {
  serverExternalPackages: ['@dobra-partia/db'],
  // Prisma klient je generovaný do packages/db/generated (mimo root directory appky)
  // a jeho query engine (.node binár) sa načítava dynamickým require — file tracing
  // ho sám nenájde, bez tohto include lambda padá pri importe (exit 128).
  outputFileTracingRoot: path.join(__dirname, '../../'),
  outputFileTracingIncludes: {
    '/**': ['../../packages/db/**'],
  },
}

export default nextConfig
