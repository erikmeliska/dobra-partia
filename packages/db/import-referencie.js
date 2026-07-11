// Jednorazový import data/references-data.json → Referencia + Media.
// Idempotentný: zmaže a nahrá znova. Spustenie: npm run import:referencie
const fs = require('fs')
const path = require('path')
const prisma = require('./index')

async function main() {
  const data = JSON.parse(
    fs.readFileSync(path.join(__dirname, 'data/references-data.json'), 'utf8')
  )
  const partia = await prisma.partia.findUniqueOrThrow({ where: { slug: 'kosice' } })

  await prisma.media.deleteMany({ where: { partiaId: partia.id, referenciaId: { not: null } } })
  await prisma.referencia.deleteMany({ where: { partiaId: partia.id } })

  for (const t of data.testimonials) {
    await prisma.referencia.create({
      data: {
        partiaId: partia.id,
        typ: 'testimonial',
        text: t.text,
        autor: t.author,
        lokalita: t.location,
        sluzba: t.service,
        hviezdicky: t.rating,
        poradie: t.id,
      },
    })
  }

  for (const p of data.projects) {
    await prisma.referencia.create({
      data: {
        partiaId: partia.id,
        typ: 'projekt',
        nazov: p.title,
        popis: p.description,
        lokalita: p.location,
        datum: p.date,
        tagy: p.tags,
        poradie: p.id,
        fotky: {
          create: p.photos.map((f, i) => ({
            partiaId: partia.id,
            url: f.src.startsWith('assets/') ? '/' + f.src : f.src,
            alt: f.alt,
            typ: 'ine',
            suhlasPublikovanie: 's_menom',
            poradie: i,
          })),
        },
      },
    })
  }

  const pocet = await prisma.referencia.count({ where: { partiaId: partia.id } })
  console.log('referencie:', pocet)
}

main().finally(() => prisma.$disconnect())
