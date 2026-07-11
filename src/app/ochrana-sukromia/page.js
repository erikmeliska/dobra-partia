export const metadata = {
  title: 'Ochrana súkromia | Dobrá Partia',
  description: 'Informácie o spracovaní osobných údajov - Dobrá Partia s.r.o.',
  alternates: { canonical: 'https://www.dobrapartia.sk/ochrana-sukromia' },
  openGraph: {
    url: 'https://www.dobrapartia.sk/ochrana-sukromia',
    title: 'Ochrana súkromia | Dobrá Partia',
    description: 'Informácie o spracovaní osobných údajov.',
    images: ['https://www.dobrapartia.sk/assets/hero-logo.jpg'],
    locale: 'sk_SK',
  },
  twitter: {
    card: 'summary',
  },
}

export default function OchranaSukromiaPage() {
  return (
    <main>
      <header className="bg-gradient-to-r from-blue-900 to-blue-800 text-white py-16 px-4">
        <div className="max-w-4xl mx-auto text-center">
          <h1 className="text-4xl md:text-5xl font-extrabold mb-4">
            Ochrana súkromia
          </h1>
          <p className="text-lg text-blue-200">
            Informácie o spracovaní osobných údajov
          </p>
        </div>
      </header>

      <div className="max-w-4xl mx-auto px-4 py-16">
        <div className="bg-white rounded-2xl shadow-md p-8 md:p-12 space-y-8">
          <section>
            <h2 className="text-xl font-bold text-navy mb-3">
              1. Prevádzkovateľ
            </h2>
            <p className="text-gray-600 leading-relaxed">
              Prevádzkovateľom osobných údajov je spoločnosť Dobrá Partia
              s.r.o., so sídlom v Košickom kraji, IČO: XXXXXXXX (ďalej len
              „prevádzkovateľ").
            </p>
            <p className="text-gray-600 leading-relaxed mt-2">
              Kontakt: <strong>info@dobrapartia.sk</strong>
            </p>
          </section>

          <section>
            <h2 className="text-xl font-bold text-navy mb-3">
              2. Aké údaje zbierame
            </h2>
            <p className="text-gray-600 leading-relaxed mb-3">
              Pri odoslaní kontaktného formulára zbierame nasledovné údaje:
            </p>
            <ul className="list-disc list-inside text-gray-600 space-y-1">
              <li>Meno a priezvisko</li>
              <li>Telefónne číslo</li>
              <li>E-mailová adresa (voliteľne)</li>
              <li>Adresa miesta realizácie (vrátane GPS súradníc)</li>
              <li>Typ požadovanej služby</li>
              <li>Popis práce (voliteľne)</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-bold text-navy mb-3">
              3. Účel spracovania
            </h2>
            <p className="text-gray-600 leading-relaxed">
              Vaše osobné údaje spracúvame výlučne za účelom:
            </p>
            <ul className="list-disc list-inside text-gray-600 space-y-1 mt-2">
              <li>Spracovanie vášho dopytu a príprava cenovej ponuky</li>
              <li>Kontaktovanie vás v súvislosti s vašou požiadavkou</li>
              <li>Realizácia objednaných služieb</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-bold text-navy mb-3">
              4. Právny základ
            </h2>
            <p className="text-gray-600 leading-relaxed">
              Právnym základom spracovania je váš súhlas udelený zaškrtnutím
              príslušného políčka v kontaktnom formulári (čl. 6 ods. 1 písm.
              a) GDPR) a oprávnený záujem prevádzkovateľa na plnení
              predzmluvných vzťahov (čl. 6 ods. 1 písm. b) GDPR).
            </p>
          </section>

          <section>
            <h2 className="text-xl font-bold text-navy mb-3">
              5. Doba uchovávania
            </h2>
            <p className="text-gray-600 leading-relaxed">
              Vaše osobné údaje uchovávame po dobu nevyhnutnú na splnenie
              účelu spracovania, maximálne však 2 roky od ich poskytnutia,
              pokiaľ nie je zákonom stanovená dlhšia doba archivácie.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-bold text-navy mb-3">
              6. Vaše práva
            </h2>
            <p className="text-gray-600 leading-relaxed mb-3">
              V súvislosti so spracovaním vašich osobných údajov máte právo:
            </p>
            <ul className="list-disc list-inside text-gray-600 space-y-1">
              <li>Požiadať o prístup k vašim osobným údajom</li>
              <li>Požiadať o opravu nesprávnych údajov</li>
              <li>Požiadať o vymazanie údajov (právo na zabudnutie)</li>
              <li>Obmedziť spracovanie</li>
              <li>Namietať proti spracovaniu</li>
              <li>Na prenosnosť údajov</li>
              <li>Kedykoľvek odvolať svoj súhlas</li>
              <li>Podať sťažnosť na Úrad na ochranu osobných údajov SR</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-bold text-navy mb-3">
              7. Príjemcovia údajov
            </h2>
            <p className="text-gray-600 leading-relaxed">
              Vaše osobné údaje neposkytujeme tretím stranám s výnimkou
              prípadov, keď je to nevyhnutné pre realizáciu služieb
              (napríklad subdodávatelia) alebo keď nám to ukladá zákon. Údaje
              z formulára sú spracované prostredníctvom zabezpečeného
              systému na spracovanie dopytov.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-bold text-navy mb-3">8. Cookies</h2>
            <p className="text-gray-600 leading-relaxed">
              Táto webová stránka nepoužíva sledovacie cookies. Používame len
              technicky nevyhnutné cookies pre správne fungovanie stránky.
            </p>
          </section>

          <div className="border-t border-gray-200 pt-6 text-gray-400 text-sm">
            <p>Posledná aktualizácia: apríl 2026</p>
          </div>
        </div>
      </div>
    </main>
  )
}
