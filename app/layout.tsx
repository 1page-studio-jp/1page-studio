import type { Metadata } from 'next'
import { Inter, Noto_Sans_JP } from 'next/font/google'
import './globals.css'

const inter = Inter({
  subsets: ['latin'],
  variable: '--font-inter',
  display: 'swap',
})

const notoSansJP = Noto_Sans_JP({
  subsets: ['latin'],
  weight: ['400', '500', '700'],
  variable: '--font-noto-jp',
  display: 'swap',
  preload: false,
})

export const metadata: Metadata = {
  title: '1Page Studio - 店舗集客管理プラットフォーム',
  description: 'LP・広告・LINE・Googleマップを一画面で管理する店舗集客プラットフォーム',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ja" suppressHydrationWarning>
      <body className={`${inter.variable} ${notoSansJP.variable} font-sans antialiased`}>
        {children}
      </body>
    </html>
  )
}
