import type { Metadata } from 'next'
// import { Inter } from 'next/font/google'
import { GeistSans } from 'geist/font/sans'
import '@/app/globals.css'
import { ThemeProvider } from '@/components/theme-provider'
import NextTopLoader from 'nextjs-toploader'
import Navbar from '@/components/ui/navbar'

export const metadata: Metadata = {
  title: 'Sortr',
  description: 'Sortr is a simple web app for sorting lists.',
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className={GeistSans.className}>
        <ThemeProvider
          attribute="class"
          defaultTheme="system"
          enableSystem
          disableTransitionOnChange
        >
          <Navbar />
          <NextTopLoader color="#fafafa" showSpinner={false} />
          {children}
        </ThemeProvider>
      </body>
    </html>
  )
}
