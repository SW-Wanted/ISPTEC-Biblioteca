import ResetPasswordClient from "./reset-password-client"

type SearchParams = Record<string, string | string[] | undefined>

export default async function ResetPasswordPage({
  searchParams,
}: {
  searchParams?: Promise<SearchParams> | SearchParams
}) {
  const sp = (await searchParams) as SearchParams | undefined
  const raw = sp?.token
  const token = Array.isArray(raw) ? (raw[0] ?? "") : (raw ?? "")

  return <ResetPasswordClient token={token} />
}
