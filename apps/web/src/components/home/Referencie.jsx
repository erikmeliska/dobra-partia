'use client'

import { useState, useEffect } from 'react'
import refData from '@/data/references-data.json'

function getSlidesPerView() {
  if (window.innerWidth >= 1024) return 3
  if (window.innerWidth >= 768) return 2
  return 1
}

export default function Referencie() {
  const [index, setIndex] = useState(0)
  const [slidesPerView, setSlidesPerView] = useState(1)
  const testimonials = refData.testimonials

  useEffect(() => {
    const update = () => {
      const spv = getSlidesPerView()
      setSlidesPerView(spv)
      setIndex(i => Math.min(i, Math.max(testimonials.length - spv, 0)))
    }
    update()
    window.addEventListener('resize', update)
    return () => window.removeEventListener('resize', update)
  }, [testimonials.length])

  const dotCount = Math.max(testimonials.length - slidesPerView + 1, 1)

  return (
    <section id="referencie" className="py-24 max-w-7xl mx-auto px-4">
      <div className="text-center mb-12">
        <h2 className="text-3xl md:text-4xl font-bold text-navy mb-4">
          Čo hovoria zákazníci
        </h2>
        <div className="w-24 h-1 bg-teal mx-auto"></div>
      </div>
      <div className="relative">
        <div className="overflow-hidden">
          <div
            id="carousel-track"
            className="flex transition-transform duration-500"
            style={{ transform: `translateX(${-(index * (100 / slidesPerView))}%)` }}
          >
            {testimonials.map((t, i) => (
              <div key={i} className="carousel-slide">
                <div className="bg-white p-8 rounded-2xl shadow-md h-full flex flex-col">
                  <span className="text-yellow-400 mb-4 flex gap-1">
                    {Array.from({ length: t.rating }).map((_, s) => (
                      <i key={s} className="fas fa-star" />
                    ))}
                  </span>
                  <p className="text-gray-600 italic flex-grow mb-6 leading-relaxed">
                    {'„'}{t.text}{'“'}
                  </p>
                  <div className="flex items-center gap-3 mt-auto">
                    <div className="w-10 h-10 bg-teal/10 rounded-full flex items-center justify-center text-teal font-bold">
                      {t.author.charAt(0)}
                    </div>
                    <div>
                      <div className="font-bold text-navy text-sm">{t.author}</div>
                      <div className="text-gray-400 text-xs">{t.location}</div>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
        <button
          onClick={() => setIndex(i => Math.max(i - 1, 0))}
          className="absolute left-0 top-1/2 -translate-y-1/2 -translate-x-2 w-10 h-10 bg-white rounded-full shadow-lg flex items-center justify-center text-navy hover:bg-gray-50 transition z-10"
        >
          <i className="fas fa-chevron-left" />
        </button>
        <button
          onClick={() => setIndex(i => Math.min(i + 1, testimonials.length - slidesPerView))}
          className="absolute right-0 top-1/2 -translate-y-1/2 translate-x-2 w-10 h-10 bg-white rounded-full shadow-lg flex items-center justify-center text-navy hover:bg-gray-50 transition z-10"
        >
          <i className="fas fa-chevron-right" />
        </button>
      </div>
      <div className="flex justify-center gap-2 mt-6">
        {Array.from({ length: dotCount }).map((_, i) => (
          <button
            key={i}
            onClick={() => setIndex(i)}
            className={`w-2.5 h-2.5 rounded-full transition-all ${i === index ? 'bg-teal w-6' : 'bg-gray-300'}`}
          />
        ))}
      </div>
    </section>
  )
}
