export const metadata = {
  title: 'Obchodné podmienky | Dobrá Partia',
  description: 'Obchodné podmienky poskytovania služieb - Dobrá Partia s.r.o.',
  alternates: { canonical: 'https://www.dobrapartia.sk/obchodne-podmienky' },
  openGraph: {
    url: 'https://www.dobrapartia.sk/obchodne-podmienky',
    title: 'Obchodné podmienky | Dobrá Partia',
    description: 'Obchodné podmienky poskytovania služieb.',
    images: ['https://www.dobrapartia.sk/assets/hero-logo.jpg'],
    locale: 'sk_SK',
  },
  twitter: {
    card: 'summary',
  },
}

export default function ObchodnePodmienkyPage() {
  return (
    <main>
      <header className="bg-gradient-to-r from-blue-900 to-blue-800 text-white py-16 px-4">
        <div className="max-w-4xl mx-auto text-center">
          <h1 className="text-4xl md:text-5xl font-extrabold mb-4">
            Obchodné podmienky
          </h1>
          <p className="text-lg text-blue-200">Podmienky poskytovania služieb</p>
        </div>
      </header>

      <div className="max-w-4xl mx-auto px-4 py-16">
        <div className="bg-white rounded-2xl shadow-md p-8 md:p-12 space-y-8">
          <section>
            <h2 className="text-xl font-bold text-navy mb-3">
              1. Úvodné ustanovenia
            </h2>
            <p className="text-gray-600 leading-relaxed">
              Tieto obchodné podmienky upravujú vzťahy medzi spoločnosťou
              Dobrá Partia s.r.o., IČO: XXXXXXXX, so sídlom v Košickom kraji
              (ďalej len „poskytovateľ") a objednávateľom služieb (ďalej len
              „zákazník").
            </p>
          </section>

          <section>
            <h2 className="text-xl font-bold text-navy mb-3">
              2. Objednávka služieb
            </h2>
            <p className="text-gray-600 leading-relaxed mb-3">
              Objednávku služieb je možné vykonať:
            </p>
            <ul className="list-disc list-inside text-gray-600 space-y-1">
              <li>Prostredníctvom kontaktného formulára na webovej stránke</li>
              <li>Telefonicky na čísle +421 XXX XXX XXX</li>
              <li>E-mailom na adrese info@dobrapartia.sk</li>
            </ul>
            <p className="text-gray-600 leading-relaxed mt-3">
              Odoslaním formulára zákazník vyjadruje nezáväzný záujem o
              služby. Záväzná objednávka vzniká až po vzájomnom odsúhlasení
              rozsahu prác a ceny.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-bold text-navy mb-3">
              3. Cenová ponuka
            </h2>
            <p className="text-gray-600 leading-relaxed">
              Po prijatí dopytu poskytovateľ kontaktuje zákazníka do 60 minút
              (v pracovných hodinách) a pripraví nezáväznú cenovú ponuku.
              Cenová ponuka je platná 14 dní od jej vystavenia, pokiaľ nie je
              dohodnuté inak.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-bold text-navy mb-3">
              4. Realizácia služieb
            </h2>
            <p className="text-gray-600 leading-relaxed">
              Poskytovateľ sa zaväzuje realizovať služby v dohodnutom termíne
              a rozsahu. V prípade nepriaznivého počasia alebo iných
              objektívnych prekážok si poskytovateľ vyhradzuje právo
              dohodnúť so zákazníkom náhradný termín.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-bold text-navy mb-3">
              5. Oblasť pôsobenia
            </h2>
            <p className="text-gray-600 leading-relaxed">
              Služby poskytujeme na území Košického kraja (okresy Košice
              I-IV, Košice-okolie, Michalovce, Trebišov, Spišská Nová Ves,
              Rožňava, Gelnica, Sobrance). V prípade záujmu z iných regiónov
              nás kontaktujte pre individuálnu dohodu.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-bold text-navy mb-3">
              6. Platobné podmienky
            </h2>
            <p className="text-gray-600 leading-relaxed mb-3">
              Platba za služby je splatná po dokončení prác, pokiaľ nie je
              dohodnuté inak. Akceptujeme nasledovné spôsoby platby:
            </p>
            <ul className="list-disc list-inside text-gray-600 space-y-1">
              <li>Platba v hotovosti</li>
              <li>Bankový prevod na základe faktúry</li>
            </ul>
            <p className="text-gray-600 leading-relaxed mt-3">
              Pri väčších zákazkách (nad 500 EUR) môže byť dohodnutá záloha
              vo výške 30-50% z celkovej sumy.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-bold text-navy mb-3">
              7. Reklamácie a záruka
            </h2>
            <p className="text-gray-600 leading-relaxed">
              Na vykonané práce poskytujeme záruku v zmysle platnej
              legislatívy. Reklamáciu je možné uplatniť telefonicky alebo
              e-mailom. Poskytovateľ sa zaväzuje reklamáciu vyriešiť v čo
              najkratšom čase, najneskôr do 30 dní.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-bold text-navy mb-3">
              8. Zrušenie objednávky
            </h2>
            <p className="text-gray-600 leading-relaxed">
              Zákazník má právo zrušiť objednávku bezplatne najneskôr 24
              hodín pred dohodnutým termínom realizácie. Pri neskoršom
              zrušení si poskytovateľ vyhradzuje právo účtovať storno
              poplatok vo výške cestovných nákladov.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-bold text-navy mb-3">
              9. Záverečné ustanovenia
            </h2>
            <p className="text-gray-600 leading-relaxed">
              Tieto obchodné podmienky nadobúdajú platnosť dňom ich
              zverejnenia na webovej stránke. Poskytovateľ si vyhradzuje
              právo tieto podmienky kedykoľvek aktualizovať. Vzťahy
              neupravené týmito podmienkami sa riadia platnými právnymi
              predpismi Slovenskej republiky.
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
