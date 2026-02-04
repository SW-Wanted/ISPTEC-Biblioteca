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
    const { prompt, file_urls, response_json_schema } = invokeSchema.parse(body);

    const apiKey = process.env.GOOGLE_GEMINI_API_KEY;
    if (!apiKey) {
      return NextResponse.json(
        { error: "API Gemini não configurada" },
        { status: 503 }
      );
    }

    const genAI = new GoogleGenerativeAI(apiKey);
    const model = genAI.getGenerativeModel({ 
      model: "gemini-2.0-flash-exp",
      generationConfig: response_json_schema ? {
        responseMimeType: "application/json",
        responseSchema: response_json_schema,
      } : undefined,
    });

    let result;

    if (file_urls && file_urls.length > 0) {
      // Com imagens
      const imageParts = await Promise.all(
        file_urls.map(async (url) => {
          const response = await fetch(url);
          const buffer = await response.arrayBuffer();
          const base64 = Buffer.from(buffer).toString('base64');
          const mimeType = response.headers.get('content-type') || 'image/jpeg';
          
          return {
            inlineData: {
              data: base64,
              mimeType,
            },
          };
        })
      );

      result = await model.generateContent([prompt, ...imageParts]);
    } else {
      // Só texto
      result = await model.generateContent(prompt);
    }

    const response = result.response;
    const text = response.text();

    // Se esperamos JSON, fazer parse
    let parsedResult = text;
    if (response_json_schema) {
      try {
        parsedResult = JSON.parse(text);
      } catch {
        console.warn("Resposta não é JSON válido, retornando como texto");
      }
    }

    return NextResponse.json({ result: parsedResult }, { status: 200 });
  } catch (error) {
    console.error("Erro ao invocar IA:", error);
    
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: "Dados inválidos", details: error.errors },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Erro ao processar requisição" },
      { status: 500 }
    );
  }
}
