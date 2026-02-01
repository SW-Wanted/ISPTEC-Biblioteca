import { NextRequest, NextResponse } from "next/server";
import { GoogleGenerativeAI } from "@google/generative-ai";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";

/**
 * POST /api/cataloging/analyze-image
 * Analisa imagem de livro usando Gemini Vision para extrair dados estruturados
 *
 * Muito mais preciso que OCR puro pois entende contexto visual
 */

let genAI: GoogleGenerativeAI | null = null;
try {
  if (process.env.GOOGLE_GEMINI_API_KEY) {
    genAI = new GoogleGenerativeAI(process.env.GOOGLE_GEMINI_API_KEY);
  }
} catch (error) {
  console.error("Failed to initialize Gemini:", error);
}

export async function POST(request: NextRequest) {
  try {
    // 1. Verificar autenticação
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: "Não autenticado" }, { status: 401 });
    }

    // 2. Verificar se Gemini está configurado
    if (!genAI || !process.env.GOOGLE_GEMINI_API_KEY) {
      return NextResponse.json(
        {
          error: "Configure GOOGLE_GEMINI_API_KEY para análise inteligente",
          fallbackToOCR: true,
        },
        { status: 503 },
      );
    }

    const body = await request.json();
    const { imageBase64, mimeType } = body;

    if (!imageBase64 || !mimeType) {
      return NextResponse.json(
        { error: "imageBase64 e mimeType são obrigatórios" },
        { status: 400 },
      );
    }

    console.log("🤖 Analisando imagem com Gemini Vision...");

    // 3. Usar Gemini Vision para analisar imagem
    const model = genAI.getGenerativeModel({
      model: "gemini-1.5-flash",
    });

    const prompt = `Você é um especialista em catalogação bibliográfica. Analise esta imagem de um livro (capa, contracapa ou folha de rosto) e extraia APENAS as informações que estão CLARAMENTE VISÍVEIS.

**Regras CRÍTICAS:**
1. **TÍTULO**: Extraia o título EXATO como aparece na capa/folha de rosto. NÃO invente, NÃO resuma, NÃO traduza.
2. **SUBTÍTULO**: Se houver subtítulo separado visível, extraia-o.
3. **ISBN**: Procure por "ISBN" seguido de 10 ou 13 dígitos (pode ter hífens). Geralmente na contracapa ou página de créditos.
4. **AUTORES**: Nomes dos autores como aparecem no livro. Se múltiplos, separe por vírgula.
5. **EDITORA**: Nome da editora/publisher.
6. **ANO**: Ano de publicação (4 dígitos).
7. **EDIÇÃO**: Número da edição se visível (ex: "2ª edição", "3rd edition").
8. **IDIOMA**: Código do idioma (pt, en, es, fr) baseado no texto visível.

**IMPORTANTE:**
- Se alguma informação NÃO estiver claramente visível, deixe como null
- Não invente ou deduza informações
- Seja preciso e fiel ao que está escrito
- Prefira extração literal a interpretação

Retorne APENAS um objeto JSON válido com esta estrutura:
{
  "title": "título exato do livro",
  "subtitle": "subtítulo se houver",
  "isbn": "ISBN sem hífens",
  "authors": "Nome dos autores",
  "publisher": "Nome da editora",
  "publishedYear": 2024,
  "edition": "1ª edição",
  "language": "en",
  "confidence": 0.95
}

Se a imagem não for de um livro ou estiver ilegível, retorne:
{
  "error": "Imagem não é de um livro ou está ilegível",
  "confidence": 0.0
}`;

    const imagePart = {
      inlineData: {
        data: imageBase64,
        mimeType: mimeType,
      },
    };

    const result = await model.generateContent([prompt, imagePart]);
    const response = await result.response;
    const text = response.text();

    console.log("🤖 Resposta Gemini:", text);

    // 4. Parsear resposta JSON
    // Remover markdown code blocks se houver
    const jsonText = text
      .replace(/```json\n?/g, "")
      .replace(/```\n?/g, "")
      .trim();

    let extractedData;
    try {
      extractedData = JSON.parse(jsonText);
    } catch (parseError) {
      console.error("Erro ao parsear JSON:", parseError);
      console.log("Texto recebido:", jsonText);

      return NextResponse.json(
        {
          error: "Falha ao processar resposta da IA",
          rawResponse: text,
        },
        { status: 500 },
      );
    }

    // 5. Verificar se houve erro na análise
    if (extractedData.error) {
      return NextResponse.json(
        {
          error: extractedData.error,
          extractedData: null,
          confidence: 0,
        },
        { status: 200 },
      );
    }

    // 6. Retornar dados extraídos
    return NextResponse.json({
      extractedData,
      confidence: extractedData.confidence || 0.8,
      provider: "gemini-vision",
    });
  } catch (error) {
    console.error("❌ Erro na análise de imagem:", error);

    return NextResponse.json(
      {
        error: "Erro ao processar imagem",
        message: error instanceof Error ? error.message : "Erro desconhecido",
      },
      { status: 500 },
    );
  }
}
