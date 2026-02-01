import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { extractIsbnFromText } from "@/lib/isbn";

/**
 * POST /api/cataloging/extract-ocr
 * Extrai dados de uma imagem de livro usando OCR + IA
 *
 * Requer: GOOGLE_CLOUD_VISION_API_KEY ou instalar tesseract.js
 */

const extractSchema = z.object({
  imageUrl: z.string().url(),
});

export async function POST(request: NextRequest) {
  try {
    // 1. Verificar autenticação
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: "Não autenticado" }, { status: 401 });
    }

    // 2. Validar input
    const body = await request.json();
    const { imageUrl } = extractSchema.parse(body);

    // 3. Opção A: Google Cloud Vision API (mais preciso)
    const visionApiKey = process.env.GOOGLE_CLOUD_VISION_API_KEY;

    if (visionApiKey) {
      console.log("🔍 Usando Google Cloud Vision API para OCR");

      const visionUrl = `https://vision.googleapis.com/v1/images:annotate?key=${visionApiKey}`;

      const visionResponse = await fetch(visionUrl, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          requests: [
            {
              image: { source: { imageUri: imageUrl } },
              features: [
                { type: "TEXT_DETECTION" },
                { type: "DOCUMENT_TEXT_DETECTION" },
              ],
            },
          ],
        }),
      });

      if (!visionResponse.ok) {
        throw new Error("Falha no Google Vision API");
      }

      const visionData = await visionResponse.json();
      const fullText = visionData.responses[0]?.fullTextAnnotation?.text || "";

      // Extrair dados do texto OCR
      const extractedData = parseBookDataFromText(fullText);

      return NextResponse.json({
        extractedData,
        ocrConfidence: 0.85, // Google Vision é bastante preciso
        rawText: fullText,
      });
    }

    // 3. Opção B: Tesseract.js (fallback gratuito)
    try {
      console.log("🔍 Tentando usar Tesseract.js para OCR");

      const Tesseract = await import("tesseract.js");

      const worker = await Tesseract.createWorker("por");

      const { data } = await worker.recognize(imageUrl);
      await worker.terminate();

      console.log(`✅ OCR Completo! Confiança: ${data.confidence}%`);

      const extractedData = parseBookDataFromText(data.text);

      return NextResponse.json({
        extractedData,
        ocrConfidence: data.confidence / 100, // Tesseract dá confidence 0-100
        rawText: data.text,
        provider: "tesseract",
      });
    } catch (tesseractError) {
      console.log("⚠️ Erro ao usar Tesseract.js:", tesseractError);
    }

    // 3. Opção C: Mock/Fallback (desenvolvimento)
    console.log("⚠️ Nenhuma API de OCR configurada. Usando mock.");
    console.log(
      "💡 Configure GOOGLE_CLOUD_VISION_API_KEY ou instale tesseract.js",
    );

    return NextResponse.json({
      extractedData: {
        title: null,
        subtitle: null,
        isbn: null,
        authors: null,
        publisher: null,
        publishedYear: null,
        edition: null,
        language: "pt",
        description: null,
      },
      ocrConfidence: 0.0,
      message:
        "Configure GOOGLE_CLOUD_VISION_API_KEY ou instale tesseract.js (npm install tesseract.js) para OCR real",
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: "Dados inválidos", details: error.issues },
        { status: 400 },
      );
    }

    console.error("❌ Erro no OCR:", error);
    return NextResponse.json(
      { error: "Erro ao processar imagem" },
      { status: 500 },
    );
  }
}

/**
 * Extrai informações estruturadas do texto OCR
 */
function parseBookDataFromText(text: string) {
  const lines = text
    .split("\n")
    .map((l) => l.trim())
    .filter(Boolean);

  // Regex patterns melhorados
  const yearPattern = /\b(19|20)\d{2}\b/g;
  const editionPattern = /(\d+)[ªº°]?\s*(ed|edição|edition|edicao)/i;

  // Patterns para autor (procurar por linhas com "por", "by", "autor")
  const authorPattern = /(por|by|autor|author)[:\s]+([^\n]+)/i;

  const isbn = extractIsbnFromText(text)?.normalized ?? null;

  // Extrair todos os anos e pegar o mais recente (provavelmente publicação)
  const yearMatches = Array.from(text.matchAll(yearPattern));
  const years = yearMatches
    .map((m) => parseInt(m[0]))
    .filter((y) => y >= 1900 && y <= new Date().getFullYear());
  const publishedYear = years.length > 0 ? Math.max(...years) : null;

  // Extrair edição
  const editionMatch = text.match(editionPattern);
  const edition = editionMatch ? editionMatch[0] : null;

  // Extrair autor
  const authorMatch = text.match(authorPattern);
  const authors = authorMatch ? authorMatch[2].trim() : null;

  // Heurística melhorada para título (primeira linha significativa)
  let title = null;
  for (const line of lines) {
    // Ignorar linhas muito curtas ou que parecem ser ISBN/códigos
    if (
      line.length > 3 &&
      !/^[\d\s-]+$/.test(line) &&
      !line.toLowerCase().startsWith("isbn")
    ) {
      title = line;
      break;
    }
  }

  // Heurística para subtítulo (linha após título, se existir)
  const titleIndex = title ? lines.indexOf(title) : -1;
  const subtitle =
    titleIndex >= 0 &&
    titleIndex + 1 < lines.length &&
    lines[titleIndex + 1].length < 100
      ? lines[titleIndex + 1]
      : null;

  // Procurar por editora (palavras-chave comuns)
  const publisherKeywords = [
    "editora",
    "publisher",
    "edições",
    "edicoes",
    "books",
    "press",
    "publications",
  ];
  const publisher =
    lines.find((line) =>
      publisherKeywords.some((kw) => line.toLowerCase().includes(kw)),
    ) || null;

  // Detectar idioma
  const language = detectLanguage(text);

  console.log("📖 Dados extraídos:", {
    title,
    subtitle,
    isbn,
    authors,
    publisher,
    publishedYear,
    edition,
    language,
  });

  return {
    title,
    subtitle,
    isbn,
    authors,
    publisher,
    publishedYear,
    edition,
    language,
    description: null,
  };
}

/**
 * Detecção simples de idioma
 */
function detectLanguage(text: string): string {
  const portugueseWords = ["de", "da", "do", "para", "com", "uma", "sobre"];
  const englishWords = ["the", "of", "and", "to", "in", "a", "for"];
  const spanishWords = ["de", "la", "el", "para", "con", "una", "sobre"];

  const lowerText = text.toLowerCase();

  const ptCount = portugueseWords.filter((w) => lowerText.includes(w)).length;
  const enCount = englishWords.filter((w) => lowerText.includes(w)).length;
  const esCount = spanishWords.filter((w) => lowerText.includes(w)).length;

  if (ptCount >= enCount && ptCount >= esCount) return "pt";
  if (enCount >= esCount) return "en";
  return "es";
}
