import BookDetailsClient from "./BookDetailsClient"

export const dynamic = "force-dynamic"

type BookDetailsPageProps = {
  searchParams?: Promise<Record<string, string | string[] | undefined>>
}

export default async function BookDetailsPage({ searchParams }: BookDetailsPageProps) {
  const resolvedSearchParams = searchParams ? await searchParams : undefined
  const rawId = resolvedSearchParams?.id
  const bookId = typeof rawId === "string" ? rawId : Array.isArray(rawId) ? rawId[0] : null

  return <BookDetailsClient bookId={bookId} />
}