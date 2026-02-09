import "./globals.css"

import type { Metadata } from "next"

import { AppShell } from "@/components/app-shell"
import { AppProviders } from "@/components/app-providers"

export const metadata: Metadata = {
  title: "ISPTEC | Biblioteca",
  description: "ISPTEC - Sistema de Gestão de Biblioteca Universitária",
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="pt-AO">
      <body>
        <AppProviders>
          <AppShell>{children}</AppShell>
        </AppProviders>
      </body>
    </html>
  )
}