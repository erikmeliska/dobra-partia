import prisma from '@dobra-partia/db'

const TAGY = {
  'hodinovy-majster': 'Hodinový majster',
  'zahradne-prace': 'Záhradné práce',
  'bazenovy-servis': 'Bazénový servis',
  'zimna-udrzba': 'Zimná údržba',
  'vypratavanie': 'Vypratávanie',
  'tlakove-cistenie': 'Tlakové čistenie',
  'exterier': 'Exteriér',
  'interier': 'Interiér',
}

export async function getReferencieData() {
  const refs = await prisma.referencia.findMany({
    where: { published: true },
    orderBy: { poradie: 'asc' },
    include: { fotky: { orderBy: { poradie: 'asc' } } },
  })
  return {
    testimonials: refs
      .filter((r) => r.typ === 'testimonial')
      .map((r) => ({
        id: r.poradie,
        text: r.text,
        author: r.autor,
        location: r.lokalita,
        service: r.sluzba,
        rating: r.hviezdicky,
      })),
    projects: refs
      .filter((r) => r.typ === 'projekt')
      .map((r) => ({
        id: r.poradie,
        title: r.nazov,
        description: r.popis,
        location: r.lokalita,
        date: r.datum,
        tags: r.tagy,
        photos: r.fotky.map((f) => ({ src: f.url, alt: f.alt })),
      })),
    tags: TAGY,
  }
}
