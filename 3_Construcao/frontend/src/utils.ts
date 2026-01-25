function toKebabCase(value: string): string {
  return value
    .replace(/([a-z0-9])([A-Z])/g, "$1-$2")
    .replace(/\s+/g, "-")
    .replace(/_/g, "-")
    .toLowerCase()
}

/**
 * Legacy helper used by the imported pages.
 *
 * Accepts values like:
 * - "Home"
 * - "SearchBooks?q=foo"
 * - "BookDetails?id=123"
 */
export function createPageUrl(input: string): string {
  const [rawName, rawQuery] = input.split("?")
  const name = rawName.trim()

  const path = name === "Home" ? "/" : `/${toKebabCase(name)}`
  if (!rawQuery) return path

  return `${path}?${rawQuery}`
}
