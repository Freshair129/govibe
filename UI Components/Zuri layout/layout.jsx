import '@/styles/globals.css'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/app/api/auth/[...nextauth]/auth-config'
import Providers from './providers'
import AiFab from '@/components/ai/AiFab'
import CookieBanner from '@/components/shared/CookieBanner'
import { Analytics } from '@vercel/analytics/react'
import { SpeedInsights } from '@vercel/speed-insights/next'

export const viewport = {
  themeColor: [
    { media: '(prefers-color-scheme: light)', color: '#ffffff' },
    { media: '(prefers-color-scheme: dark)', color: '#111827' },
  ],
  width: 'device-width',
  initialScale: 1,
}

export const metadata = {
  metadataBase: new URL(process.env.NEXT_PUBLIC_APP_URL || 'https://zuri10.vercel.app'),
  title: {
    default: 'Zuri — AI Business Platform สำหรับธุรกิจบริการไทย',
    template: '%s | Zuri'
  },
  description: 'แพลตฟอร์ม AI ครบวงจรสำหรับธุรกิจบริการไทย — CRM, Inbox, POS, การตลาด และ AI ในที่เดียว',
  applicationName: 'Zuri',
  authors: [{ name: 'Zuri Team' }],
  generator: 'Next.js',
  keywords: ['Zuri', 'AI Business Platform', 'CRM ไทย', 'POS', 'AI Marketing', 'โรงเรียนสอนทำอาหาร', 'ธุรกิจบริการ', 'SaaS ไทย'],
  referrer: 'origin-when-cross-origin',
  creator: 'Zuri',
  publisher: 'Zuri',
  robots: {
    index: true,
    follow: true,
  },
  openGraph: {
    title: 'Zuri — AI Business Platform สำหรับธุรกิจบริการไทย',
    description: 'แพลตฟอร์ม AI ครบวงจรสำหรับธุรกิจบริการไทย — CRM, Inbox, POS, การตลาด และ AI ในที่เดียว',
    url: 'https://zuri10.vercel.app',
    siteName: 'Zuri',
    locale: 'th_TH',
    type: 'website',
    images: [
      {
        url: '/og-image.png',
        width: 1200,
        height: 630,
        alt: 'Zuri — AI Business Platform สำหรับธุรกิจบริการไทย',
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Zuri — AI Business Platform สำหรับธุรกิจบริการไทย',
    description: 'แพลตฟอร์ม AI ครบวงจรสำหรับธุรกิจบริการไทย — CRM, Inbox, POS, การตลาด และ AI ในที่เดียว',
    creator: '@zuri_ai',
    images: ['/og-image.png'],
  },
  icons: {
    icon: '/favicon.ico',
    shortcut: '/shortcut-icon.png',
    apple: '/apple-touch-icon.png',
  },
}

export default async function RootLayout({ children }) {
  const session = await getServerSession(authOptions)
  return (
    <html suppressHydrationWarning>
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          href="https://fonts.googleapis.com/css2?family=IBM+Plex+Sans+Thai:wght@300;400;500;600;700&family=Manrope:wght@300;400;500;600;700;800&family=Prompt:wght@300;400;500;600;700&family=Be+Vietnam+Pro:wght@300;400;500;600&display=swap"
          rel="stylesheet"
        />
        <link
          href="https://fonts.googleapis.com/css2?family=Material+Symbols+Outlined:opsz,wght,FILL,GRAD@20..48,100..700,0..1,-50..200"
          rel="stylesheet"
        />
        <script dangerouslySetInnerHTML={{ __html: `
          try {
            var t = localStorage.getItem('zuri-theme');
            if (t === 'dark' || (!t && window.matchMedia('(prefers-color-scheme: dark)').matches)) {
              document.documentElement.classList.add('dark');
            }
          } catch(e) {}
        `}} />
      </head>
      <body className="bg-surface dark:bg-gray-800 text-on-surface dark:text-gray-100 antialiased font-body">
        <Providers session={session}>
          {children}
          <AiFab />
          <CookieBanner />
          <Analytics />
          <SpeedInsights />
        </Providers>
      </body>
    </html>
  )
}
