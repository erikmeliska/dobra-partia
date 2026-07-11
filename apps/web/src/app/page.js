import Hero from '@/components/home/Hero'
import Sluzby from '@/components/home/Sluzby'
import PreFirmy from '@/components/home/PreFirmy'
import AkoPracujeme from '@/components/home/AkoPracujeme'
import Referencie from '@/components/home/Referencie'
import Galeria from '@/components/home/Galeria'
import BlogSekcia from '@/components/home/BlogSekcia'
import KontaktForm from '@/components/home/KontaktForm'
import { getPublishedPosts } from '@/lib/blog'
import { getReferencieData } from '@/lib/referencie'

export const metadata = {
  alternates: { canonical: 'https://www.dobrapartia.sk/' },
}

export const revalidate = 3600

export default async function HomePage() {
  const posts = await getPublishedPosts(3)
  const refData = await getReferencieData()

  return (
    <main>
      <Hero />
      <Sluzby />
      <PreFirmy />
      <AkoPracujeme />
      <Referencie testimonials={refData.testimonials} />
      <Galeria projects={refData.projects} tags={refData.tags} />
      <BlogSekcia posts={posts} />
      <KontaktForm />
    </main>
  )
}
