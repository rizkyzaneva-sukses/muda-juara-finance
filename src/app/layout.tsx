import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: 'Muda Juara Finance',
  description: 'Sistem Manajemen Keuangan Kabinet Muda Juara',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="id">
      <body>{children}</body>
    </html>
  )
}
