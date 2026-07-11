'use client'

import { useState } from 'react'

export default function Nav() {
  const [menuOpen, setMenuOpen] = useState(false)

  return (
    <nav className="bg-white sticky top-0 z-50 border-b border-gray-100 shadow-sm">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between h-20">
          <div className="flex items-center">
            <a href="/" className="flex-shrink-0 flex items-center gap-3">
              <img
                src="/assets/logo.png"
                alt="Logo Dobrá Partia"
                className="w-12 h-12 rounded-lg object-contain"
              />
              <span className="text-2xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-blue-900 to-teal-600">
                DOBRÁ PARTIA
              </span>
            </a>
          </div>
          <div className="hidden md:flex items-center space-x-8">
            <a
              href="/#sluzby"
              className="text-gray-600 hover:text-teal font-medium transition"
            >
              Služby
            </a>
            <a
              href="/#ako-pracujeme"
              className="text-gray-600 hover:text-teal font-medium transition"
            >
              Ako pracujeme
            </a>
            <a
              href="/o-nas"
              className="text-gray-600 hover:text-teal font-medium transition"
            >
              O nás
            </a>
            <a
              href="/blog"
              className="text-gray-600 hover:text-teal font-medium transition"
            >
              Blog
            </a>
            <a
              href="/#referencie"
              className="text-gray-600 hover:text-teal font-medium transition"
            >
              Referencie
            </a>
            <a
              href="/#kontakt"
              className="bg-terracotta text-white px-6 py-2 rounded-full font-bold hover:opacity-90 transition shadow-md"
            >
              Rezervovať termín
            </a>
          </div>
          <div className="md:hidden flex items-center">
            <button
              id="mobile-menu-btn"
              className="text-gray-600 text-2xl"
              onClick={() => setMenuOpen(true)}
            >
              <i className="fas fa-bars"></i>
            </button>
          </div>
        </div>
      </div>
      <div
        id="mobile-menu"
        className={`mobile-menu fixed top-0 right-0 w-64 h-full bg-white shadow-2xl z-50 p-6 ${menuOpen ? 'open' : ''}`}
      >
        <button
          id="mobile-menu-close"
          className="text-gray-600 text-2xl mb-8 block ml-auto"
          onClick={() => setMenuOpen(false)}
        >
          <i className="fas fa-times"></i>
        </button>
        <div className="flex flex-col space-y-6">
          <a
            href="/#sluzby"
            className="text-gray-700 font-medium text-lg"
            onClick={() => setMenuOpen(false)}
          >
            Služby
          </a>
          <a
            href="/#ako-pracujeme"
            className="text-gray-700 font-medium text-lg"
            onClick={() => setMenuOpen(false)}
          >
            Ako pracujeme
          </a>
          <a
            href="/o-nas"
            className="text-gray-700 font-medium text-lg"
            onClick={() => setMenuOpen(false)}
          >
            O nás
          </a>
          <a
            href="/blog"
            className="text-gray-700 font-medium text-lg"
            onClick={() => setMenuOpen(false)}
          >
            Blog
          </a>
          <a
            href="/#referencie"
            className="text-gray-700 font-medium text-lg"
            onClick={() => setMenuOpen(false)}
          >
            Referencie
          </a>
          <a
            href="/#kontakt"
            className="bg-terracotta text-white px-6 py-3 rounded-full font-bold text-center"
            onClick={() => setMenuOpen(false)}
          >
            Rezervovať termín
          </a>
        </div>
      </div>
    </nav>
  )
}
