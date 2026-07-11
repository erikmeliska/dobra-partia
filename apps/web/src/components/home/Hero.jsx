export default function Hero() {
  return (
    <header className="hero-gradient text-white py-16 md:py-24 px-4 overflow-hidden">
      <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-center justify-between gap-12">
        <div className="md:w-1/2 space-y-6 z-10">
          <div className="inline-block bg-teal/20 text-teal-300 px-4 py-1 rounded-full text-sm font-bold tracking-wider uppercase">
            Košice a okolie · Prešov
          </div>
          <h1 className="text-4xl md:text-6xl font-extrabold leading-tight">
            Váš domov aj záhrada <br />
            <span className="text-teal">v absolútnej pohode.</span>
          </h1>
          <p className="text-lg text-blue-100 max-w-lg">
            Sme partia šikovných chlapov z Východu. Jedna partia na všetko —
            dom, záhradu aj firmu. Jednorazovo alebo pravidelne na paušál.
          </p>
          <ul className="space-y-2 text-blue-100">
            <li className="flex items-center gap-3">
              <i className="fas fa-phone-alt text-teal"></i>
              Ozveme sa do 60 minút
            </li>
            <li className="flex items-center gap-3">
              <i className="fas fa-hand-holding-usd text-teal"></i>
              Platba až po spokojnosti
            </li>
            <li className="flex items-center gap-3">
              <i className="fas fa-users text-teal"></i>
              Jedna partia na všetko
            </li>
          </ul>
          <div className="flex flex-wrap gap-4 pt-4">
            <a
              href="#kontakt"
              className="bg-teal text-white px-8 py-4 rounded-xl font-bold text-lg shadow-lg hover:scale-105 transition transform"
            >
              Chcem cenovú ponuku
            </a>
            <a
              href="#pre-firmy"
              className="border-2 border-teal text-teal px-8 py-4 rounded-xl font-bold text-lg hover:bg-teal hover:text-white transition"
            >
              Pre firmy a správcov
            </a>
          </div>
        </div>
        <div className="md:w-1/2 relative">
          <div className="relative z-10">
            <img
              src="/assets/auto.jpg"
              alt="Dacia Dokker Dobrá Partia"
              className="rounded-3xl shadow-2xl border-4 border-white/10"
            />
          </div>
          <div className="absolute -top-10 -right-10 w-40 h-40 bg-teal/20 rounded-full blur-3xl"></div>
          <div className="absolute -bottom-10 -left-10 w-40 h-40 bg-terracotta/20 rounded-full blur-3xl"></div>
        </div>
      </div>
    </header>
  )
}
