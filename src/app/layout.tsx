import type { Metadata } from "next"
import { Geist, Geist_Mono } from "next/font/google"
import "./globals.css"
import { Sidebar } from "@/components/Sidebar"
import { SearchBar } from "@/components/SearchBar"
import { AuthProvider } from "@/lib/auth-context"

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
})

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
})

export const metadata: Metadata = {
  title: "Bonsoir",
  description: "Order & Production Management",
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex bg-background text-foreground">
        <AuthProvider>
          <Sidebar />
          <div className="flex-1 flex flex-col min-h-screen ml-0 lg:ml-56">
            <header className="sticky top-0 z-30 bg-background/95 backdrop-blur border-b border-border px-4 lg:px-8 py-3">
              <SearchBar />
            </header>
            <main className="flex-1 px-4 lg:px-8 py-6">
              {children}
            </main>
          </div>
        </AuthProvider>
      </body>
    </html>
  )
}
