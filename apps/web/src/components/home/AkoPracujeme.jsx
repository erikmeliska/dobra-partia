export default function AkoPracujeme() {
  return (
    <section id="ako-pracujeme" className="py-24 bg-white">
      <div className="max-w-7xl mx-auto px-4">
        <div className="text-center mb-16">
          <h2 className="text-3xl md:text-4xl font-bold text-navy mb-4">
            Ako to u nás funguje?
          </h2>
          <p className="text-gray-500 max-w-2xl mx-auto text-lg">
            Jednoduchý proces od dopytu po hotovú prácu.
          </p>
          <div className="w-24 h-1 bg-teal mx-auto mt-6"></div>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
          <div className="text-center">
            <div className="w-20 h-20 bg-teal/10 rounded-full flex items-center justify-center text-teal text-3xl mx-auto mb-4">
              <i className="fas fa-paper-plane"></i>
            </div>
            <div className="text-sm font-bold text-teal uppercase mb-2">
              Krok 1
            </div>
            <h3 className="font-bold text-navy mb-2">Pošlite dopyt</h3>
            <p className="text-gray-500 text-sm">
              Vyplňte formulár alebo nám zavolajte. Stačí pár viet o tom, čo
              potrebujete.
            </p>
          </div>
          <div className="text-center">
            <div className="w-20 h-20 bg-teal/10 rounded-full flex items-center justify-center text-teal text-3xl mx-auto mb-4">
              <i className="fas fa-phone-alt"></i>
            </div>
            <div className="text-sm font-bold text-teal uppercase mb-2">
              Krok 2
            </div>
            <h3 className="font-bold text-navy mb-2">
              Ozveme sa do 60 min
            </h3>
            <p className="text-gray-500 text-sm">
              Upresníme si detaily a dohodneme termín obhliadky alebo rovno
              práce.
            </p>
          </div>
          <div className="text-center">
            <div className="w-20 h-20 bg-teal/10 rounded-full flex items-center justify-center text-teal text-3xl mx-auto mb-4">
              <i className="fas fa-tools"></i>
            </div>
            <div className="text-sm font-bold text-teal uppercase mb-2">
              Krok 3
            </div>
            <h3 className="font-bold text-navy mb-2">Spravíme to</h3>
            <p className="text-gray-500 text-sm">
              Príde naša partia, spraví prácu rýchlo a poriadne. Bez
              neporiadku.
            </p>
          </div>
          <div className="text-center">
            <div className="w-20 h-20 bg-teal/10 rounded-full flex items-center justify-center text-teal text-3xl mx-auto mb-4">
              <i className="fas fa-smile"></i>
            </div>
            <div className="text-sm font-bold text-teal uppercase mb-2">
              Krok 4
            </div>
            <h3 className="font-bold text-navy mb-2">Spokojnosť</h3>
            <p className="text-gray-500 text-sm">
              Platíte až keď ste spokojní — faktúru vystavíme na mieste v deň
              ukončenia práce.
            </p>
          </div>
        </div>
      </div>
    </section>
  )
}
