"use client"

import Link from "next/link"
import { usePathname, useRouter, useSearchParams as useNextSearchParams } from "next/navigation"
import * as React from "react"

type LinkProps = {
  to: string
  className?: string
  children: React.ReactNode
}

/**
 * Minimal shim so the legacy pages can compile without react-router-dom.
 */
export function LinkShim({ to, className, children }: LinkProps) {
  return (
    <Link href={to} className={className}>
      {children}
    </Link>
  )
}

export { LinkShim as Link }

/**
 * react-router-dom compatible API: returns [URLSearchParams, setSearchParams]
 */
export function useSearchParams(): [URLSearchParams, (next: URLSearchParams | Record<string, string>) => void] {
  const router = useRouter()
  const pathname = usePathname()
  const nextParams = useNextSearchParams()

  const params = React.useMemo(() => new URLSearchParams(nextParams?.toString()), [nextParams])

  const setSearchParams = React.useCallback(
    (next: URLSearchParams | Record<string, string>) => {
      const updated = next instanceof URLSearchParams ? next : new URLSearchParams(next)
      const qs = updated.toString()
      router.push(qs ? `${pathname}?${qs}` : pathname)
    },
    [pathname, router]
  )

  return [params, setSearchParams]
}
