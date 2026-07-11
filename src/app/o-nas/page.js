export const metadata = {
  title: 'O nás | Dobrá Partia',
  description:
    'Spoznajte tím Dobrá Partia - šikovní chlapci z Košického kraja, ktorí sa postarajú o váš domov a záhradu.',
  alternates: { canonical: 'https://www.dobrapartia.sk/o-nas' },
  openGraph: {
    url: 'https://www.dobrapartia.sk/o-nas',
    title: 'O nás | Dobrá Partia',
    description:
      'Spoznajte tím Dobrá Partia - šikovní chlapci z Košického kraja, ktorí sa postarajú o váš domov a záhradu.',
    images: ['https://www.dobrapartia.sk/assets/hero-logo.jpg'],
    type: 'website',
    locale: 'sk_SK',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'O nás | Dobrá Partia',
    description: 'Spoznajte tím Dobrá Partia z Košického kraja.',
    images: ['https://www.dobrapartia.sk/assets/hero-logo.jpg'],
  },
}

export default function ONasPage() {
  return (
    <main>
      {/* Hero */}
      <header className="bg-gradient-to-r from-blue-900 to-blue-800 text-white py-16 px-4">
        <div className="max-w-4xl mx-auto text-center">
          <h1 className="text-4xl md:text-5xl font-extrabold mb-4">O nás</h1>
          <p className="text-lg text-blue-200">
            Sme Dobrá Partia. Šikovní chlapci z Košického kraja.
          </p>
        </div>
      </header>

      <div className="max-w-4xl mx-auto px-4 py-16">
        {/* Príbeh */}
        <section className="mb-16">
          <div className="flex flex-col md:flex-row gap-10 items-center">
            <div className="md:w-1/2">
              <img
                src="/assets/hero-logo.jpg"
                alt="Dobrá Partia tím"
                className="rounded-3xl shadow-lg"
              />
            </div>
            <div className="md:w-1/2">
              <h2 className="text-2xl font-bold text-navy mb-4">
                Náš príbeh
              </h2>
              <p className="text-gray-600 mb-4 leading-relaxed">
                Dobrá Partia vznikla z jednoduchej myšlienky: ľudia na
                východnom Slovensku si zaslúžia spoľahlivý a férový servis
                pre svoj domov. Poznáme ten pocit, keď potrebujete niekoho na
                záhradu, opravu alebo údržbu - a neviete, komu zavolať.
              </p>
              <p className="text-gray-600 mb-4 leading-relaxed">
                Preto sme tu my. Partia šikovných chlapov, ktorí vedia držať
                lopatu aj vŕtačku. Pracujeme poctivo, komunikujeme otvorene a
                za naše ceny sa nehanbíme.
              </p>
              <p className="text-gray-600 leading-relaxed">
                Pôsobíme v celom Košickom kraji - od Košíc cez Michalovce,
                Trebišov, Sobrance, Rožňavu až po Gelnice a Spišskú Novú Ves.
              </p>
            </div>
          </div>
        </section>

        {/* Hodnoty */}
        <section className="mb-16">
          <h2 className="text-2xl font-bold text-navy mb-8 text-center">
            Naše hodnoty
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <div className="bg-white p-8 rounded-2xl shadow-md text-center">
              <div className="w-16 h-16 bg-teal/10 rounded-full flex items-center justify-center text-teal text-2xl mx-auto mb-4">
                <i className="fas fa-handshake"></i>
              </div>
              <h3 className="font-bold text-navy mb-2">Férovosť</h3>
              <p className="text-gray-500 text-sm">
                Transparentné ceny, žiadne skryté poplatky. Čo dohodneme, to
                platí.
              </p>
            </div>
            <div className="bg-white p-8 rounded-2xl shadow-md text-center">
              <div className="w-16 h-16 bg-teal/10 rounded-full flex items-center justify-center text-teal text-2xl mx-auto mb-4">
                <i className="fas fa-clock"></i>
              </div>
              <h3 className="font-bold text-navy mb-2">Spoľahlivosť</h3>
              <p className="text-gray-500 text-sm">
                Keď povedieme, že prídeme, prídeme. Dodržiavame termíny a
                sľuby.
              </p>
            </div>
            <div className="bg-white p-8 rounded-2xl shadow-md text-center">
              <div className="w-16 h-16 bg-teal/10 rounded-full flex items-center justify-center text-teal text-2xl mx-auto mb-4">
                <i className="fas fa-heart"></i>
              </div>
              <h3 className="font-bold text-navy mb-2">Kvalita</h3>
              <p className="text-gray-500 text-sm">
                Robíme to tak, ako by sme to robili pre seba. Lebo nám na tom
                záleží.
              </p>
            </div>
          </div>
        </section>

        {/* Pokrytie */}
        <section className="bg-white rounded-2xl shadow-md p-10 mb-16">
          <h2 className="text-2xl font-bold text-navy mb-6 text-center">
            Kde pôsobíme
          </h2>
          <img
            src="/assets/mapa.jpg"
            alt="Mapa pôsobenia Dobrá Partia - Košický kraj"
            className="w-full rounded-xl shadow-md"
          />
        </section>

        {/* CTA */}
        <div className="text-center">
          <a
            href="/#kontakt"
            className="inline-block bg-terracotta text-white px-10 py-4 rounded-xl font-bold text-lg hover:opacity-90 transition shadow-lg"
          >
            Chcem cenovú ponuku
          </a>
        </div>
      </div>
    </main>
  )
}
