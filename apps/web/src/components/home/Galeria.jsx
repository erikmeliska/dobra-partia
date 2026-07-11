'use client'

import { useState, useEffect } from 'react'

const MONTHS = ['január', 'február', 'marec', 'apríl', 'máj', 'jún', 'júl', 'august', 'september', 'október', 'november', 'december']

function formatDate(dateStr) {
  const parts = dateStr.split('-')
  return MONTHS[parseInt(parts[1], 10) - 1] + ' ' + parts[0]
}

function photoSrc(src) {
  return src.startsWith('assets/') ? '/' + src : src
}

export default function Galeria({ projects, tags }) {
  const [activeTag, setActiveTag] = useState('all')
  const [modalProject, setModalProject] = useState(null)
  const [activePhoto, setActivePhoto] = useState(0)

  const filtered = projects.filter(
    p => activeTag === 'all' || p.tags.includes(activeTag)
  )

  useEffect(() => {
    const onKey = e => { if (e.key === 'Escape') setModalProject(null) }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [])

  useEffect(() => {
    document.body.style.overflow = modalProject ? 'hidden' : ''
    return () => { document.body.style.overflow = '' }
  }, [modalProject])

  const openModal = project => { setModalProject(project); setActivePhoto(0) }
  const closeModal = () => setModalProject(null)

  return (
    <section id="realizacie" className="py-24 bg-white">
      <div className="max-w-7xl mx-auto px-4">
        <div className="text-center mb-12">
          <h2 className="text-3xl md:text-4xl font-bold text-navy mb-4">Naše realizácie</h2>
          <p className="text-gray-500 max-w-2xl mx-auto">Vybrané projekty z Košického kraja.</p>
          <div className="w-24 h-1 bg-teal mx-auto mt-4"></div>
        </div>

        <div className="flex flex-wrap justify-center gap-2 mb-10">
          {[['all', 'Všetky'], ...Object.entries(tags)].map(([key, label]) => (
            <button
              key={key}
              onClick={() => setActiveTag(key)}
              className={`tag-btn px-4 py-2 rounded-full text-sm font-medium border border-gray-200 ${
                activeTag === key ? 'active' : 'text-gray-600 hover:border-teal'
              }`}
            >
              {label}
            </button>
          ))}
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {filtered.map(project => {
            const cover = project.photos[0]
            return (
              <div
                key={project.id}
                className="gallery-item relative group"
                onClick={() => openModal(project)}
              >
                <img
                  src={photoSrc(cover.src)}
                  alt={cover.alt}
                  className="w-full h-64 object-cover"
                  loading="lazy"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex flex-col justify-end p-5">
                  <h3 className="text-white font-bold text-lg mb-1">{project.title}</h3>
                  <p className="text-white/70 text-sm">{project.location}</p>
                  <div className="flex flex-wrap gap-1 mt-2">
                    {project.tags.map(t => (
                      <span key={t} className="text-xs bg-white/20 text-white px-2 py-0.5 rounded-full">
                        {tags[t] || t}
                      </span>
                    ))}
                  </div>
                </div>
                {project.photos.length > 1 && (
                  <div className="absolute top-3 right-3 bg-black/50 text-white text-xs px-2 py-1 rounded-full">
                    {project.photos.length} fotiek
                  </div>
                )}
              </div>
            )
          })}
        </div>

        {filtered.length === 0 && (
          <div className="text-center py-16 text-gray-400">
            <i className="fas fa-search text-4xl mb-4 block"></i>
            <p>Pre tento filter zatiaľ nemáme realizácie.</p>
          </div>
        )}
      </div>

      <div
        className={`fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/85 transition-opacity duration-300 ${
          modalProject ? 'opacity-100' : 'opacity-0 pointer-events-none'
        }`}
        onClick={e => { if (e.target === e.currentTarget) closeModal() }}
      >
        <div
          className={`bg-white rounded-2xl shadow-2xl max-w-3xl w-full max-h-[90vh] overflow-y-auto transition-transform duration-300 ${
            modalProject ? '' : 'scale-95'
          }`}
        >
          {modalProject && (
            <>
              <div className="relative">
                <img
                  src={photoSrc(modalProject.photos[activePhoto].src)}
                  alt={modalProject.photos[activePhoto].alt}
                  className="w-full h-64 sm:h-80 md:h-96 object-cover rounded-t-2xl"
                />
                <button
                  onClick={closeModal}
                  className="absolute top-4 right-4 w-10 h-10 bg-white/90 rounded-full flex items-center justify-center text-gray-700 hover:bg-white transition shadow-lg"
                >
                  <i className="fas fa-times"></i>
                </button>
              </div>
              {modalProject.photos.length > 1 && (
                <div className="flex gap-2 px-6 pt-4 overflow-x-auto">
                  {modalProject.photos.map((photo, i) => (
                    <img
                      key={i}
                      src={photoSrc(photo.src)}
                      alt={photo.alt}
                      onClick={() => setActivePhoto(i)}
                      className={`thumb w-16 h-16 object-cover rounded-lg flex-shrink-0${i === activePhoto ? ' active' : ''}`}
                    />
                  ))}
                </div>
              )}
              <div className="p-6">
                <div className="flex flex-wrap gap-2 mb-3">
                  {modalProject.tags.map(t => (
                    <span key={t} className="text-xs font-medium px-3 py-1 rounded-full bg-teal/10 text-teal">
                      {tags[t] || t}
                    </span>
                  ))}
                </div>
                <h3 className="text-2xl font-bold text-navy mb-2">{modalProject.title}</h3>
                <div className="flex items-center gap-4 text-sm text-gray-400 mb-4">
                  <span><i className="fas fa-map-marker-alt mr-1"></i> {modalProject.location}</span>
                  <span><i className="fas fa-calendar mr-1"></i> {formatDate(modalProject.date)}</span>
                </div>
                <p className="text-gray-600 leading-relaxed">{modalProject.description}</p>
              </div>
            </>
          )}
        </div>
      </div>
    </section>
  )
}
