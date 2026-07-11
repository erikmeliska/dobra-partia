import Hero from '@/components/home/Hero'
import Sluzby from '@/components/home/Sluzby'
import AkoPracujeme from '@/components/home/AkoPracujeme'
import Referencie from '@/components/home/Referencie'
import Galeria from '@/components/home/Galeria'

export default function HomePage() {
  return (
    <main>
      <Hero />
      <Sluzby />
      <AkoPracujeme />
      <Referencie />
      <Galeria />
    </main>
  )
}
