"use client"

import * as React from "react"
import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import { Toaster } from "sonner"
import { SessionProvider } from "next-auth/react"

export function AppProviders({ children }: { children: React.ReactNode }) {
  const [queryClient] = React.useState(() => new QueryClient())

  return (
    <SessionProvider>
      <QueryClientProvider client={queryClient}>
        {children}
        <Toaster richColors closeButton />
      </QueryClientProvider>
    </SessionProvider>
  )
}
