export default function Footer() {
  return (
    <footer className="bg-gray-900 py-16 text-white">
      <div className="max-w-7xl mx-auto px-4">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-10 mb-12">
          <div className="md:col-span-1">
            <div className="flex items-center gap-3 mb-4">
              <img
                src="/assets/logo.png"
                alt="Logo"
                className="w-10 h-10 rounded-lg"
              />
              <span className="text-xl font-bold tracking-tight uppercase">
                Dobrá Partia
              </span>
            </div>
            <p className="text-gray-400 text-sm leading-relaxed">
              Kompletný servis pre domácnosti, firmy a bytové domy. Košice a
              okolie, plánované služby aj v Prešove.
            </p>
          </div>
          <div>
            <h4 className="font-bold text-sm uppercase tracking-wider mb-4 text-teal">
              Služby
            </h4>
            <ul className="space-y-2 text-gray-400 text-sm">
              <li>
                <a href="/#sluzby" className="hover:text-white transition">
                  Záhradné práce
                </a>
              </li>
              <li>
                <a href="/#sluzby" className="hover:text-white transition">
                  Bazénový servis
                </a>
              </li>
              <li>
                <a href="/#sluzby" className="hover:text-white transition">
                  Zimná pohotovosť
                </a>
              </li>
              <li>
                <a href="/#sluzby" className="hover:text-white transition">
                  Hodinový majster
                </a>
              </li>
              <li>
                <a href="/#sluzby" className="hover:text-white transition">
                  Tlakové čistenie
                </a>
              </li>
            </ul>
          </div>
          <div>
            <h4 className="font-bold text-sm uppercase tracking-wider mb-4 text-teal">
              Informácie
            </h4>
            <ul className="space-y-2 text-gray-400 text-sm">
              <li>
                <a href="/o-nas" className="hover:text-white transition">
                  O nás
                </a>
              </li>
              <li>
                <a href="/#pre-firmy" className="hover:text-white transition">
                  Pre firmy a správcov
                </a>
              </li>
              <li>
                <a href="/#referencie" className="hover:text-white transition">
                  Referencie
                </a>
              </li>
              <li>
                <a
                  href="/ochrana-sukromia"
                  className="hover:text-white transition"
                >
                  Ochrana súkromia
                </a>
              </li>
              <li>
                <a
                  href="/obchodne-podmienky"
                  className="hover:text-white transition"
                >
                  Obchodné podmienky
                </a>
              </li>
              <li>
                <a href="/#kontakt" className="hover:text-white transition">
                  Kontakt
                </a>
              </li>
            </ul>
          </div>
          <div>
            <h4 className="font-bold text-sm uppercase tracking-wider mb-4 text-teal">
              Kontakt
            </h4>
            <ul className="space-y-3 text-gray-400 text-sm">
              <li className="flex items-center gap-2">
                <i className="fas fa-phone text-teal text-xs"></i>
                +421 XXX XXX XXX
              </li>
              <li className="flex items-center gap-2">
                <i className="fas fa-envelope text-teal text-xs"></i>
                info@dobrapartia.sk
              </li>
              <li className="flex items-center gap-2">
                <i className="fas fa-map-marker-alt text-teal text-xs"></i>
                Košice a okolie · Prešov
              </li>
            </ul>
          </div>
        </div>
        <div className="border-t border-gray-800 pt-8 flex flex-col md:flex-row justify-between items-center gap-4">
          <p className="text-gray-500 text-sm">
            &copy; 2026 Dobrá Partia s.r.o. | IČO: XXXXXXXX
          </p>
          <div className="flex gap-4 text-gray-500">
            <a
              href="/ochrana-sukromia"
              className="text-sm hover:text-white transition"
            >
              Ochrana súkromia
            </a>
            <span>|</span>
            <a
              href="/obchodne-podmienky"
              className="text-sm hover:text-white transition"
            >
              Obchodné podmienky
            </a>
          </div>
        </div>
      </div>
    </footer>
  )
}
