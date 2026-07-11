export default function Sluzby() {
  return (
    <section id="sluzby" className="py-24 max-w-7xl mx-auto px-4">
      <div className="text-center mb-16">
        <h2 className="text-3xl md:text-4xl font-bold text-navy mb-4">
          Kompletný servis pre váš domov
        </h2>
        <p className="text-gray-500 max-w-2xl mx-auto text-lg">
          Od Košíc po Sobrance, od Rožňavy po Trebišov. Prídeme všade tam,
          kde nás potrebujete.
        </p>
        <div className="w-24 h-1 bg-teal mx-auto mt-6"></div>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
        <div className="service-card bg-white p-8 rounded-3xl card-shadow border-b-4 border-teal transition-all duration-300">
          <div className="w-16 h-16 bg-teal/10 rounded-2xl flex items-center justify-center text-teal text-3xl mb-6">
            <i className="fas fa-leaf"></i>
          </div>
          <h3 className="text-xl font-bold text-navy mb-3">
            Záhradné práce
          </h3>
          <p className="text-gray-600 mb-4">
            Kosenie, vertikutácia, strihanie živých plotov a zakladanie
            trávnikov.
          </p>
        </div>
        <div className="service-card bg-white p-8 rounded-3xl card-shadow border-b-4 border-blue-400 transition-all duration-300">
          <div className="w-16 h-16 bg-blue-100 rounded-2xl flex items-center justify-center text-blue-500 text-3xl mb-6">
            <i className="fas fa-swimmer"></i>
          </div>
          <h3 className="text-xl font-bold text-navy mb-3">
            Bazénový servis
          </h3>
          <p className="text-gray-600 mb-4">
            Kompletná príprava na sezónu, zazimovanie a pravidelná údržba
            vody.
          </p>
        </div>
        <div className="service-card bg-white p-8 rounded-3xl card-shadow border-b-4 border-slate-300 transition-all duration-300">
          <div className="w-16 h-16 bg-slate-100 rounded-2xl flex items-center justify-center text-slate-400 text-3xl mb-6">
            <i className="fas fa-snowflake"></i>
          </div>
          <h3 className="text-xl font-bold text-navy mb-3">
            Zimná pohotovosť
          </h3>
          <p className="text-gray-600 mb-4">
            Odpratávanie snehu z chodníkov a príjazdových ciest, keď Košice
            zafúka.
          </p>
        </div>
        <div className="service-card bg-white p-8 rounded-3xl card-shadow border-b-4 border-terracotta transition-all duration-300">
          <div className="w-16 h-16 bg-terracotta/10 rounded-2xl flex items-center justify-center text-terracotta text-3xl mb-6">
            <i className="fas fa-hammer"></i>
          </div>
          <h3 className="text-xl font-bold text-navy mb-3">
            Hodinový majster
          </h3>
          <p className="text-gray-600 mb-4">
            Drobné opravy, vŕtanie, montáž nábytku a inštalácia spotrebičov.
          </p>
        </div>
        <div className="service-card bg-white p-8 rounded-3xl card-shadow border-b-4 border-amber-600 transition-all duration-300">
          <div className="w-16 h-16 bg-amber-100 rounded-2xl flex items-center justify-center text-amber-600 text-3xl mb-6">
            <i className="fas fa-couch"></i>
          </div>
          <h3 className="text-xl font-bold text-navy mb-3">
            Vypratávanie a odvoz
          </h3>
          <p className="text-gray-600 mb-4">
            Odvoz starého nábytku na zberný dvor, vypratávanie garáží a
            pivníc.
          </p>
        </div>
        <div className="service-card bg-white p-8 rounded-3xl card-shadow border-b-4 border-navy transition-all duration-300">
          <div className="w-16 h-16 bg-navy/10 rounded-2xl flex items-center justify-center text-navy text-3xl mb-6">
            <i className="fas fa-broom"></i>
          </div>
          <h3 className="text-xl font-bold text-navy mb-3">
            Tlakové čistenie
          </h3>
          <p className="text-gray-600 mb-4">
            Čistenie dlažieb, fasád a striech. Vrátime vášmu domu pôvodný
            lesk.
          </p>
        </div>
      </div>
    </section>
  )
}
