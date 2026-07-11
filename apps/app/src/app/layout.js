import './globals.css'

export const metadata = {
  title: 'Dobrá Partia — Appka',
  robots: { index: false, follow: false },
}

export const viewport = {
  themeColor: '#1e3a5f',
}

export default function RootLayout({ children }) {
  return (
    <html lang="sk">
      <body className="bg-sand text-navy min-h-screen">{children}</body>
    </html>
  )
}
