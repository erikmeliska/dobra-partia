const { PrismaClient } = require('./generated/client')

const prisma = globalThis.__prisma || new PrismaClient()
if (process.env.NODE_ENV !== 'production') {
  globalThis.__prisma = prisma
}

module.exports = prisma
