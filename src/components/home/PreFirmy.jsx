export default function PreFirmy() {
  return (
    <section id="pre-firmy" className="py-24 bg-navy text-white">
      <div className="max-w-7xl mx-auto px-4">
        <div className="text-center mb-16">
          <div className="inline-block bg-teal/20 text-teal px-4 py-1 rounded-full text-sm font-bold tracking-wider uppercase mb-4">
            B2B
          </div>
          <h2 className="text-3xl md:text-4xl font-bold mb-4">
            Pre firmy a správcov
          </h2>
          <p className="text-blue-100 max-w-2xl mx-auto text-lg">
            Jedna partia, jedna zmluva, jedna faktúra. Paušály a rámcové
            zmluvy, vďaka ktorým sa o objekty nemusíte starať vy.
          </p>
          <div className="w-24 h-1 bg-teal mx-auto mt-6"></div>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
          <div className="bg-white/5 border border-white/10 p-8 rounded-3xl">
            <div className="w-16 h-16 bg-teal/10 rounded-2xl flex items-center justify-center text-teal text-3xl mb-6">
              <i className="fas fa-key"></i>
            </div>
            <h3 className="text-xl font-bold mb-3">
              Realitky a prenajímatelia
            </h3>
            <p className="text-blue-100 text-sm leading-relaxed">
              Kompletná obrátka bytu medzi nájomníkmi — vypratanie, drobné
              opravy, čistenie. Rámcová zmluva a jedno číslo na všetko.
            </p>
          </div>
          <div className="bg-white/5 border border-white/10 p-8 rounded-3xl">
            <div className="w-16 h-16 bg-teal/10 rounded-2xl flex items-center justify-center text-teal text-3xl mb-6">
              <i className="fas fa-industry"></i>
            </div>
            <h3 className="text-xl font-bold mb-3">Firemné areály</h3>
            <p className="text-blue-100 text-sm leading-relaxed">
              Ročný balík starostlivosti: kosenie a zeleň v sezóne, zimná
              údržba s pohotovosťou, tlakové čistenie plôch. Jedna faktúra
              mesačne.
            </p>
          </div>
          <div className="bg-white/5 border border-white/10 p-8 rounded-3xl">
            <div className="w-16 h-16 bg-teal/10 rounded-2xl flex items-center justify-center text-teal text-3xl mb-6">
              <i className="fas fa-building"></i>
            </div>
            <h3 className="text-xl font-bold mb-3">Správcovia a SVB</h3>
            <p className="text-blue-100 text-sm leading-relaxed">
              Údržbový dodávateľ pre bytové domy — drobná údržba, starostlivosť
              o zeleň a zimná pohotovosť za mesačný fix. Spoľahlivo a s
              dokladom o každom zásahu.
            </p>
          </div>
          <div className="bg-white/5 border border-white/10 p-8 rounded-3xl">
            <div className="w-16 h-16 bg-teal/10 rounded-2xl flex items-center justify-center text-teal text-3xl mb-6">
              <i className="fas fa-hot-tub"></i>
            </div>
            <h3 className="text-xl font-bold mb-3">Hotely a penzióny</h3>
            <p className="text-blue-100 text-sm leading-relaxed">
              Bazénový servis so zmluvou — pravidelná kontrola vody počas
              sezóny, otvorenie aj zazimovanie. Hostia majú vždy čistý bazén.
            </p>
          </div>
        </div>
        <div className="text-center mt-12 space-y-4">
          <p className="text-blue-100">
            Sme poistení pre prípad škody a faktúru vystavujeme na mieste v
            deň ukončenia práce. Cenovú ponuku pripravíme po obhliadke do 24
            hodín.
          </p>
          <a
            href="#kontakt"
            className="inline-block bg-teal text-white px-8 py-4 rounded-xl font-bold text-lg shadow-lg hover:scale-105 transition transform"
          >
            Dohodnúť obhliadku
          </a>
        </div>
      </div>
    </section>
  )
}
