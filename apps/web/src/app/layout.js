import './globals.css'
import Nav from '@/components/Nav'
import Footer from '@/components/Footer'

export const metadata = {
  metadataBase: new URL('https://www.dobrapartia.sk'),
  title: 'Dobrá Partia | Váš domov v pohode',
  description:
    'Dobrá Partia - servis pre domácnosti, firmy a bytové domy v Košiciach a okolí. Kosenie a záhrady, bazénový servis, zimná údržba, hodinový majster, vypratávanie. Ozveme sa do 60 minút.',
  icons: { icon: '/assets/favicon.ico' },
  openGraph: {
    url: 'https://www.dobrapartia.sk/',
    title: 'Dobrá Partia | Váš domov v pohode',
    description:
      'Servis pre domácnosti, firmy a bytové domy v Košiciach a okolí. Kosenie a záhrady, bazénový servis, zimná údržba, hodinový majster, vypratávanie. Ozveme sa do 60 minút.',
    images: ['https://www.dobrapartia.sk/assets/hero-logo.jpg'],
    type: 'website',
    locale: 'sk_SK',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Dobrá Partia | Váš domov v pohode',
    description:
      'Servis pre domácnosti, firmy a bytové domy v Košiciach a okolí. Ozveme sa do 60 minút.',
    images: ['https://www.dobrapartia.sk/assets/hero-logo.jpg'],
  },
}

export default function RootLayout({ children }) {
  return (
    <html lang="sk">
      <head>
        <link
          href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.5.0/css/all.min.css"
          rel="stylesheet"
        />
      </head>
      <body>
        <Nav />
        {children}
        <Footer />
      </body>
    </html>
  )
}
