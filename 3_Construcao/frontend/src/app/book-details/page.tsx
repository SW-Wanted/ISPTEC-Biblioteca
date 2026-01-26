import BookDetailsClient from "./BookDetailsClient"

export const dynamic = "force-dynamic"

type BookDetailsPageProps = {
  searchParams?: Record<string, string | string[] | undefined>
}

export default function BookDetailsPage({ searchParams }: BookDetailsPageProps) {
  const rawId = searchParams?.id
  const bookId = typeof rawId === "string" ? rawId : Array.isArray(rawId) ? rawId[0] : null

  return <BookDetailsClient bookId={bookId} />
}