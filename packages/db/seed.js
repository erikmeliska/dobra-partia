// Seed: tenant "kosice" + užívatelia z env SEED_UZIVATELIA.
// Spustenie: npm run seed  (env SEED_UZIVATELIA='[{"meno":"Erik","email":"erik@dobrapartia.sk","heslo":"..."}]')
const bcrypt = require('bcryptjs')
const prisma = require('./index')

async function main() {
  const partia = await prisma.partia.upsert({
    where: { slug: 'kosice' },
    update: {},
    create: { nazov: 'Dobrá Partia Košice', slug: 'kosice' },
  })
  console.log('PARTIA_ID=' + partia.id)

  const uzivatelia = JSON.parse(process.env.SEED_UZIVATELIA || '[]')
  for (const u of uzivatelia) {
    await prisma.uzivatel.upsert({
      where: { email: u.email },
      update: { meno: u.meno },
      create: {
        partiaId: partia.id,
        meno: u.meno,
        email: u.email,
        passwordHash: bcrypt.hashSync(u.heslo, 10),
      },
    })
    console.log('uzivatel: ' + u.email)
  }

  const backfill = await prisma.dopyt.updateMany({
    where: { partiaId: null },
    data: { partiaId: partia.id },
  })
  console.log('dopyty backfill: ' + backfill.count)
}

main().finally(() => prisma.$disconnect())
