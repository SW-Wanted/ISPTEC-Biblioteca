import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { GoogleGenerativeAI } from "@google/generative-ai";

const invokeSchema = z.object({
  prompt: z.string(),
  file_urls: z.array(z.string()).optional(),
  response_json_schema: z.any().optional(),
});

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    console.log("📥 Request body recebido:", JSON.stringify(body, null, 2));
    
    const { prompt, file_urls, response_json_schema } =
      invokeSchema.parse(body);

    const apiKey = process.env.GOOGLE_GEMINI_API_KEY;
    if (!apiKey) {
      console.error("❌ GOOGLE_GEMINI_API_KEY não configurada");
      return NextResponse.json(
        { error: "API Gemini não configurada" },
        { status: 503 },
      );
    }

    console.log("🔑 API Key encontrada (primeiros 10 chars):", apiKey.substring(0, 10));
    console.log("🖼️ File URLs:", file_urls);
    console.log("📝 Prompt length:", prompt.length);

    const genAI = new GoogleGenerativeAI(apiKey);
    const model = genAI.getGenerativeModel({
      model: "gemini-2.0-flash-exp",
      generationConfig: response_json_schema
        ? {
            responseMimeType: "application/json",
            responseSchema: response_json_schema,
          }
        : undefined,
    });

    console.log("🤖 Model criado com sucesso");

    let result;

    if (file_urls && file_urls.length > 0) {
      console.log("🖼️ Processando imagens...");
      // Com imagens
      const imageParts = await Promise.all(
        file_urls.map(async (url, index) => {
          console.log(`  Fetching imagem ${index + 1}: ${url}`);
          const response = await fetch(url);
          if (!response.ok) {
            throw new Error(`Falha ao carregar imagem ${index + 1}: ${response.status}`);
          }
          const buffer = await response.arrayBuffer();
          const base64 = Buffer.from(buffer).toString("base64");
          const mimeType = response.headers.get("content-type") || "image/jpeg";
          console.log(`  ✅ Imagem ${index + 1} carregada: ${(buffer.byteLength / 1024).toFixed(2)}KB`);

          return {
            inlineData: {
              data: base64,
              mimeType,
            },
          };
        }),
      );

      console.log("🚀 Chamando Gemini com imagens...");
      result = await model.generateContent([prompt, ...imageParts]);
      console.log("✅ Resposta Gemini recebida");
    } else {
      // Só texto
      console.log("🚀 Chamando Gemini (só texto)...");
      result = await model.generateContent(prompt);
      console.log("✅ Resposta Gemini recebida");
    }

    const response = result.response;
    const text = response.text();
    console.log("📄 Texto da resposta (primeiros 200 chars):", text.substring(0, 200));

    // Se esperamos JSON, fazer parse
    let parsedResult = text;
    if (response_json_schema) {
      try {
        parsedResult = JSON.parse(text);
        console.log("✅ JSON parsed com sucesso");
      } catch (parseError) {
        console.warn("⚠️ Resposta não é JSON válido, retornando como texto");
        console.warn("Parse error:", parseError);
      }
    }

    return NextResponse.json({ result: parsedResult }, { status: 200 });
  } catch (error) {
    console.error("❌ Erro ao invocar IA:", error);
    console.error("Stack trace:", error instanceof Error ? error.stack : "N/A");

    if (error instanceof z.ZodError) {
      console.error("❌ Erro de validação Zod:", error.errors);
      return NextResponse.json(
        { error: "Dados inválidos", details: error.errors },
        { status: 400 },
      );
    }

    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Erro ao processar requisição",
        details: error instanceof Error ? error.stack : undefined,
      },
      { status: 500 },
    );
  }
}
