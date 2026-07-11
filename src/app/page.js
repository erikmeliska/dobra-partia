import Hero from '@/components/home/Hero'
import Sluzby from '@/components/home/Sluzby'
import PreFirmy from '@/components/home/PreFirmy'
import AkoPracujeme from '@/components/home/AkoPracujeme'
import Referencie from '@/components/home/Referencie'
import Galeria from '@/components/home/Galeria'
import BlogSekcia from '@/components/home/BlogSekcia'
import KontaktForm from '@/components/home/KontaktForm'
import { getPublishedPosts } from '@/lib/blog'

export const metadata = {
  alternates: { canonical: 'https://www.dobrapartia.sk/' },
}

export default async function HomePage() {
  const posts = await getPublishedPosts(3)

  return (
    <main>
      <Hero />
      <Sluzby />
      <PreFirmy />
      <AkoPracujeme />
      <Referencie />
      <Galeria />
      <BlogSekcia posts={posts} />
      <KontaktForm />
    </main>
  )
}
