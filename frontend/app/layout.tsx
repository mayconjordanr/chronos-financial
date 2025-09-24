import type { Metadata } from 'next'
import { Inter } from 'next/font/google'
import { ThemeProvider } from '@/components/providers/theme-provider'
import { QueryProvider } from '@/components/providers/query-provider'
import { AuthProvider } from '@/components/providers/auth-provider'
import { RealtimeProvider } from '@/components/providers/realtime-provider'
import { Toaster } from '@/components/ui/sonner'
import './globals.css'

const inter = Inter({ subsets: ['latin'] })

export const metadata: Metadata = {
  title: 'CHRONOS Financial - Multi-tenant Financial Management',
  description: 'Modern financial management platform with real-time synchronization and WhatsApp integration',
  keywords: ['fintech', 'financial management', 'multi-tenant', 'real-time', 'whatsapp'],
  authors: [{ name: 'Maycon Jordan', url: 'https://github.com/mayconjordanr' }],
  creator: 'Maycon Jordan',
  publisher: 'CHRONOS Financial',
  robots: 'index, follow',
  openGraph: {
    type: 'website',
    locale: 'en_US',
    url: 'https://chronos.financial',
    siteName: 'CHRONOS Financial',
    title: 'CHRONOS Financial - Multi-tenant Financial Management',
    description: 'Modern financial management platform with real-time synchronization and WhatsApp integration',
    images: [
      {
        url: '/og-image.png',
        width: 1200,
        height: 630,
        alt: 'CHRONOS Financial',
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'CHRONOS Financial',
    description: 'Modern financial management platform',
    creator: '@chronosfinancial',
    images: ['/og-image.png'],
  },
  viewport: 'width=device-width, initial-scale=1',
  themeColor: [
    { media: '(prefers-color-scheme: light)', color: '#ffffff' },
    { media: '(prefers-color-scheme: dark)', color: '#000000' },
  ],
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className={inter.className}>
        <ThemeProvider
          attribute="class"
          defaultTheme="system"
          enableSystem
          disableTransitionOnChange
        >
          <QueryProvider>
            <AuthProvider>
              <RealtimeProvider>
                {children}
                <Toaster
                  position="bottom-right"
                  expand={true}
                  richColors
                  closeButton
                />
              </RealtimeProvider>
            </AuthProvider>
          </QueryProvider>
        </ThemeProvider>
      </body>
    </html>
  )
}