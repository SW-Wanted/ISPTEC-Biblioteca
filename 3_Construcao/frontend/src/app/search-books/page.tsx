import { Suspense } from "react"

import SearchBooksClient from "./SearchBooksClient"

export const dynamic = "force-dynamic"

export default function SearchBooksPage() {
  return (
    <Suspense fallback={<div className="p-6 text-slate-600">A carregar…</div>}>
      <SearchBooksClient />
    </Suspense>
  )
}