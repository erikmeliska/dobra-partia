'use client'

import { useState, useRef, useEffect } from 'react'
import 'leaflet/dist/leaflet.css'
import { odosliDopyt } from '@/actions/dopyt'

export default function KontaktForm() {
  const [addressQuery, setAddressQuery] = useState('')
  const [results, setResults] = useState([])
  const [latLon, setLatLon] = useState(null) // { lat, lon }
  const [status, setStatus] = useState('idle') // idle | sending | success | error
  const mapRef = useRef(null) // Leaflet map instance
  const markerRef = useRef(null)
  const searchTimeout = useRef(null)

  // Nominatim autocomplete — port index.html:955-1003
  function onAddressInput(e) {
    const query = e.target.value
    setAddressQuery(query)
    clearTimeout(searchTimeout.current)
    if (query.length < 3) {
      setResults([])
      return
    }
    searchTimeout.current = setTimeout(async () => {
      const url =
        'https://nominatim.openstreetmap.org/search?format=json&q=' +
        encodeURIComponent(query) +
        '&addressdetails=1&limit=5&countrycodes=sk&viewbox=19.9,49.2,22.6,48.3&bounded=0'
      try {
        const r = await fetch(url, { headers: { 'Accept-Language': 'sk' } })
        setResults(await r.json())
      } catch (err) {
        console.error('Chyba pri hľadaní adresy:', err)
      }
    }, 400)
  }

  async function selectResult(item) {
    setAddressQuery(item.display_name)
    setLatLon({ lat: item.lat, lon: item.lon })
    setResults([])
    const L = (await import('leaflet')).default
    const lat = parseFloat(item.lat),
      lon = parseFloat(item.lon)
    if (!mapRef.current) {
      mapRef.current = L.map('map').setView([lat, lon], 15)
      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '&copy; OpenStreetMap',
      }).addTo(mapRef.current)
    } else {
      mapRef.current.setView([lat, lon], 15)
    }
    if (markerRef.current) markerRef.current.setLatLng([lat, lon])
    else markerRef.current = L.marker([lat, lon]).addTo(mapRef.current)
    setTimeout(() => mapRef.current.invalidateSize(), 200)
  }

  // zavretie výsledkov klikom mimo — port index.html:1005-1009
  useEffect(() => {
    const onDocClick = (e) => {
      if (e.target.id !== 'address-input') setResults([])
    }
    document.addEventListener('click', onDocClick)
    return () => document.removeEventListener('click', onDocClick)
  }, [])

  async function onSubmit(e) {
    e.preventDefault()
    setStatus('sending')
    const formData = new FormData(e.target)
    const data = {
      meno: formData.get('meno'),
      telefon: formData.get('telefon'),
      email: formData.get('email') || '',
      adresa: formData.get('adresa'),
      lat: latLon?.lat || '',
      lon: latLon?.lon || '',
      sluzba: formData.get('sluzba'),
      popis: formData.get('popis') || '',
      odoslane: new Date().toISOString(),
      zdroj: 'web-formular',
    }
    try {
      const result = await odosliDopyt(data)
      if (!result.success) throw new Error(result.message)
      setStatus('success')
    } catch (err) {
      console.error('Chyba pri odosielaní:', err)
      setStatus('error')
    }
  }

  return (
    <section id="kontakt" className="py-24 max-w-5xl mx-auto px-4">
      <div className="text-center mb-12">
        <h2 className="text-3xl md:text-4xl font-bold text-navy mb-4">
          Nezáväzná cenová ponuka
        </h2>
        <p className="text-gray-500 max-w-2xl mx-auto text-lg">
          Vyplňte formulár a ozveme sa vám do 60 minút.
        </p>
        <div className="w-24 h-1 bg-teal mx-auto mt-6"></div>
      </div>
      <div className="bg-white rounded-3xl card-shadow overflow-hidden">
        <div className="flex flex-col md:flex-row">
          <div className="bg-teal p-10 md:p-12 text-white md:w-2/5">
            <h3 className="text-2xl font-bold mb-6 text-white">Kontaktujte nás</h3>
            <p className="text-blue-50 mb-8">
              Vyplňte formulár a naša „Dobrá Partia" sa vám ozve do 60 minút.
            </p>
            <div className="space-y-5">
              <div className="flex items-center gap-4">
                <div className="w-10 h-10 bg-white/10 rounded-full flex items-center justify-center flex-shrink-0">
                  <i className="fas fa-map-marker-alt"></i>
                </div>
                <p className="font-medium text-sm">
                  Košice a okolie — všetky služby<br />
                  Prešov — plánované služby
                </p>
              </div>
              <div className="flex items-center gap-4">
                <div className="w-10 h-10 bg-white/10 rounded-full flex items-center justify-center flex-shrink-0">
                  <i className="fas fa-clock"></i>
                </div>
                <p className="font-medium text-sm">Po - So: 7:00 - 19:00</p>
              </div>
              <div className="flex items-center gap-4">
                <div className="w-10 h-10 bg-white/10 rounded-full flex items-center justify-center flex-shrink-0">
                  <i className="fas fa-phone"></i>
                </div>
                <p className="font-medium text-sm">+421 XXX XXX XXX</p>
              </div>
              <div className="flex items-center gap-4">
                <div className="w-10 h-10 bg-white/10 rounded-full flex items-center justify-center flex-shrink-0">
                  <i className="fas fa-envelope"></i>
                </div>
                <p className="font-medium text-sm">info@dobrapartia.sk</p>
              </div>
            </div>
          </div>
          <div className="p-8 md:p-12 md:w-3/5">
            {status !== 'success' && (
              <form className="space-y-5" id="quote-form" onSubmit={onSubmit}>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                  <div>
                    <label className="block text-xs font-bold uppercase text-gray-400 mb-2">
                      Meno *
                    </label>
                    <input
                      type="text"
                      name="meno"
                      required
                      placeholder="Jozef Kováč"
                      className="w-full p-4 rounded-xl bg-gray-50 border border-gray-200 focus:border-teal outline-none transition shadow-sm"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold uppercase text-gray-400 mb-2">
                      Telefón *
                    </label>
                    <input
                      type="tel"
                      name="telefon"
                      required
                      placeholder="+421 9XX XXX XXX"
                      className="w-full p-4 rounded-xl bg-gray-50 border border-gray-200 focus:border-teal outline-none transition shadow-sm"
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-xs font-bold uppercase text-gray-400 mb-2">
                    E-mail
                  </label>
                  <input
                    type="email"
                    name="email"
                    placeholder="vas@email.sk"
                    className="w-full p-4 rounded-xl bg-gray-50 border border-gray-200 focus:border-teal outline-none transition shadow-sm"
                  />
                </div>
                <div className="relative">
                  <label className="block text-xs font-bold uppercase text-gray-400 mb-2">
                    Adresa realizácie *
                  </label>
                  <div className="relative">
                    <input
                      type="text"
                      id="address-input"
                      name="adresa"
                      required
                      autoComplete="off"
                      placeholder="Začnite písať ulicu a mesto..."
                      value={addressQuery}
                      onChange={onAddressInput}
                      className="w-full p-4 rounded-xl bg-gray-50 border border-gray-200 focus:border-teal outline-none transition shadow-sm"
                    />
                    <div className="absolute right-4 top-4 text-gray-300">
                      <i className="fas fa-search"></i>
                    </div>
                  </div>
                  <div
                    id="address-results"
                    className={`absolute left-0 right-0 mt-1 bg-white border border-gray-200 rounded-xl shadow-xl${
                      results.length ? '' : ' hidden'
                    }`}
                  >
                    {results.map((item, i) => (
                      <div
                        key={i}
                        onClick={() => selectResult(item)}
                        className="result-item p-3 border-b border-gray-100 last:border-0 text-sm text-gray-700"
                      >
                        {item.display_name}
                      </div>
                    ))}
                  </div>
                </div>
                <div id="map-container" className={latLon ? '' : 'hidden'}>
                  <div id="map"></div>
                </div>
                <div>
                  <label className="block text-xs font-bold uppercase text-gray-400 mb-2">
                    O čo máte záujem? *
                  </label>
                  <select
                    name="sluzba"
                    required
                    defaultValue=""
                    className="w-full p-4 rounded-xl bg-gray-50 border border-gray-200 focus:border-teal outline-none transition shadow-sm"
                  >
                    <option value="">-- Vyberte službu --</option>
                    <option value="zahradne-prace">Záhradné práce</option>
                    <option value="bazenovy-servis">Bazénový servis</option>
                    <option value="zimna-udrzba">Zimná údržba</option>
                    <option value="hodinovy-majster">Hodinový majster</option>
                    <option value="vypratavanie">Vypratávanie a odvoz</option>
                    <option value="tlakove-cistenie">Tlakové čistenie</option>
                    <option value="ine">Iné</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-bold uppercase text-gray-400 mb-2">
                    Popis práce
                  </label>
                  <textarea
                    name="popis"
                    rows="3"
                    placeholder="Popíšte čo potrebujete spraviť..."
                    className="w-full p-4 rounded-xl bg-gray-50 border border-gray-200 focus:border-teal outline-none transition shadow-sm resize-none"
                  ></textarea>
                </div>
                <div className="flex items-start gap-3">
                  <input
                    type="checkbox"
                    id="gdpr"
                    name="gdpr"
                    required
                    className="mt-1 w-4 h-4 accent-teal-500"
                  />
                  <label htmlFor="gdpr" className="text-xs text-gray-500">
                    Súhlasím so{' '}
                    <a
                      href="/ochrana-sukromia"
                      className="underline hover:text-teal"
                    >
                      spracovaním osobných údajov
                    </a>{' '}
                    za účelom spracovania dopytu. *
                  </label>
                </div>
                <button
                  type="submit"
                  id="submit-btn"
                  disabled={status === 'sending'}
                  className="w-full bg-navy text-white py-5 rounded-xl font-bold text-lg hover:bg-teal hover:shadow-xl transition-all duration-300"
                >
                  {status === 'sending' ? 'Odosielam...' : 'Odoslať nezáväzný dopyt'}
                </button>
              </form>
            )}
            {status === 'success' && (
              <div id="form-success" className="form-success text-center py-12">
                <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center text-green-500 text-4xl mx-auto mb-6">
                  <i className="fas fa-check"></i>
                </div>
                <h3 className="text-2xl font-bold text-navy mb-3">Dopyt odoslaný!</h3>
                <p className="text-gray-500">Ďakujeme. Ozveme sa vám do 60 minút.</p>
              </div>
            )}
            {status === 'error' && (
              <div id="form-error" className="form-success text-center py-6">
                <div className="bg-red-50 text-red-600 p-4 rounded-xl text-sm">
                  <i className="fas fa-exclamation-triangle mr-2"></i>Nastala chyba pri
                  odosielaní. Skúste to znova alebo nám zavolajte.
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </section>
  )
}
