import './globals.css'
import SwRegister from '@/components/SwRegister'
import CaptureButton from '@/components/CaptureButton'

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
      <body className="bg-sand text-navy min-h-screen">
        <SwRegister />
        <CaptureButton />
        {children}
      </body>
    </html>
  )
}
