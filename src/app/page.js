import Hero from '@/components/home/Hero'
import Sluzby from '@/components/home/Sluzby'
import PreFirmy from '@/components/home/PreFirmy'
import AkoPracujeme from '@/components/home/AkoPracujeme'
import Referencie from '@/components/home/Referencie'
import Galeria from '@/components/home/Galeria'
import KontaktForm from '@/components/home/KontaktForm'

export default function HomePage() {
  return (
    <main>
      <Hero />
      <Sluzby />
      <PreFirmy />
      <AkoPracujeme />
      <Referencie />
      <Galeria />
      <KontaktForm />
    </main>
  )
}
