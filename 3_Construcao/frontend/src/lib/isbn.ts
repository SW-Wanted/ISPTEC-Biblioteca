export type Isbn = {
  raw: string;
  normalized: string;
  type: "ISBN_10" | "ISBN_13";
};

function onlyDigitsAndX(value: string): string {
  return value.toUpperCase().replace(/[^0-9X]/g, "");
}

export function normalizeIsbn(value: string | null | undefined): string | null {
  if (!value) return null;
  const cleaned = onlyDigitsAndX(value);

  // ISBN-13 must be 13 digits
  if (/^\d{13}$/.test(cleaned)) return cleaned;

  // ISBN-10 can end with X
  if (/^\d{9}[\dX]$/.test(cleaned)) return cleaned;

  return null;
}

export function isValidIsbn10(value: string): boolean {
  const normalized = normalizeIsbn(value);
  if (!normalized || !/^\d{9}[\dX]$/.test(normalized)) return false;

  // ISBN-10 checksum: sum_{i=1..10} i*d_i ≡ 0 (mod 11)
  // where X = 10 at position 10
  let sum = 0;
  for (let i = 0; i < 10; i++) {
    const char = normalized[i];
    const digit = char === "X" ? 10 : Number(char);
    sum += (i + 1) * digit;
  }
  return sum % 11 === 0;
}

export function isValidIsbn13(value: string): boolean {
  const normalized = normalizeIsbn(value);
  if (!normalized || !/^\d{13}$/.test(normalized)) return false;

  // ISBN-13 checksum: (sum of digits with alternating weights 1,3) % 10 == 0
  let sum = 0;
  for (let i = 0; i < 13; i++) {
    const digit = Number(normalized[i]);
    const weight = i % 2 === 0 ? 1 : 3;
    sum += digit * weight;
  }
  return sum % 10 === 0;
}

export function isValidIsbn(value: string | null | undefined): boolean {
  if (!value) return false;
  const normalized = normalizeIsbn(value);
  if (!normalized) return false;

  if (normalized.length === 13) return isValidIsbn13(normalized);
  return isValidIsbn10(normalized);
}

function pickFirstValid(
  candidates: Array<string | null | undefined>,
): Isbn | null {
  for (const candidate of candidates) {
    if (!candidate) continue;

    const normalized = normalizeIsbn(candidate);
    if (!normalized) continue;

    if (normalized.length === 13 && isValidIsbn13(normalized)) {
      return { raw: candidate, normalized, type: "ISBN_13" };
    }

    if (normalized.length === 10 && isValidIsbn10(normalized)) {
      return { raw: candidate, normalized, type: "ISBN_10" };
    }
  }

  return null;
}

/**
 * Extrai ISBN do texto (OCR/IA). Prioriza ocorrências com o rótulo "ISBN",
 * mas também tenta capturar sequências válidas (10/13) típicas de código de barras.
 */
export function extractIsbnFromText(text: string): Isbn | null {
  if (!text) return null;

  // 1) Casos com rótulo ISBN/ISBN-10/ISBN-13
  const labeledMatches: string[] = [];
  const labeled = /\bISBN(?:-1[03])?\b[^0-9X]*([0-9X][0-9X\s-]{8,20})/gi;
  for (const match of text.matchAll(labeled)) {
    if (match[1]) labeledMatches.push(match[1]);
  }

  // 2) ISBN-13 sem rótulo (978/979)
  const isbn13Like: string[] = [];
  const pattern13 = /\b97[89](?:[\s-]?\d){10}\b/g;
  for (const match of text.matchAll(pattern13)) {
    isbn13Like.push(match[0]);
  }

  // 3) ISBN-10 sem rótulo
  const isbn10Like: string[] = [];
  const pattern10 = /\b(?:\d[\s-]?){9}[\dX]\b/gi;
  for (const match of text.matchAll(pattern10)) {
    isbn10Like.push(match[0]);
  }

  return pickFirstValid([...labeledMatches, ...isbn13Like, ...isbn10Like]);
}
