import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { z } from "zod";
import crypto from "crypto";

import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { UserStatus } from "@prisma/client";

// ---------------------------------------------------------------------------
// Configuration
// ---------------------------------------------------------------------------

const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10 MB
const ALLOWED_MIME_TYPES = [
  "image/jpeg",
  "image/png",
  "image/gif",
  "image/webp",
  "image/heic",
  "image/heif",
  "application/pdf",
];

const CLOUDINARY_CLOUD_NAME = process.env.CLOUDINARY_CLOUD_NAME;
const CLOUDINARY_API_KEY = process.env.CLOUDINARY_API_KEY;
const CLOUDINARY_API_SECRET = process.env.CLOUDINARY_API_SECRET;

function isCloudinaryConfigured(): boolean {
  return !!(
    CLOUDINARY_CLOUD_NAME &&
    CLOUDINARY_API_KEY &&
    CLOUDINARY_API_SECRET
  );
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

async function requireActiveUser() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.email) return null;

  const user = await prisma.user.findUnique({
    where: { email: session.user.email },
    select: { id: true, email: true, status: true, isBlocked: true },
  });

  if (!user) return null;
  // ✅ Permitir PENDING (para upload de documentos durante onboarding)
  // ❌ Bloquear apenas INACTIVE e usuários bloqueados
  if (user.status === UserStatus.INACTIVE || user.isBlocked) return null;

  return user;
}

/**
 * Generate a Cloudinary signature for authenticated uploads.
 * https://cloudinary.com/documentation/upload_images#generating_authentication_signatures
 */
function generateCloudinarySignature(
  paramsToSign: Record<string, string | number>,
  apiSecret: string,
): string {
  const sortedKeys = Object.keys(paramsToSign).sort();
  const stringToSign = sortedKeys
    .map((k) => `${k}=${paramsToSign[k]}`)
    .join("&");
  return crypto
    .createHash("sha1")
    .update(stringToSign + apiSecret)
    .digest("hex");
}

/**
 * Upload a file buffer to Cloudinary using their Upload API.
 */
async function uploadToCloudinary(
  buffer: Buffer,
  filename: string,
  folder: string,
): Promise<{ url: string; publicId: string }> {
  const timestamp = Math.floor(Date.now() / 1000);
  const publicId = `${folder}/${Date.now()}_${filename.replace(/[^a-zA-Z0-9._-]/g, "_")}`;

  const paramsToSign: Record<string, string | number> = {
    folder,
    public_id: publicId,
    timestamp,
  };

  const signature = generateCloudinarySignature(
    paramsToSign,
    CLOUDINARY_API_SECRET!,
  );

  const formData = new FormData();
  // Convert Node.js Buffer to Uint8Array for cross-runtime Blob compatibility
  formData.append("file", new Blob([new Uint8Array(buffer)]), filename);
  formData.append("api_key", CLOUDINARY_API_KEY!);
  formData.append("timestamp", String(timestamp));
  formData.append("signature", signature);
  formData.append("folder", folder);
  formData.append("public_id", publicId);

  const uploadUrl = `https://api.cloudinary.com/v1_1/${CLOUDINARY_CLOUD_NAME}/auto/upload`;

  const res = await fetch(uploadUrl, {
    method: "POST",
    body: formData,
  });

  if (!res.ok) {
    const errorBody = await res.text();
    console.error("Cloudinary upload error:", errorBody);
    throw new Error("Falha ao enviar ficheiro para Cloudinary");
  }

  const json = (await res.json()) as { secure_url: string; public_id: string };
  return { url: json.secure_url, publicId: json.public_id };
}

/**
 * Fallback: store file as a data URL (not recommended for production).
 * Mirrors the previous behaviour for environments without Cloudinary configured.
 */
function fileToDataUrl(buffer: Buffer, mimeType: string): string {
  return `data:${mimeType};base64,${buffer.toString("base64")}`;
}

// ---------------------------------------------------------------------------
// Input validation
// ---------------------------------------------------------------------------

const folderSchema = z
  .enum(["covers", "documents", "ocr", "profiles"])
  .default("covers");

// ---------------------------------------------------------------------------
// POST /api/uploads
// ---------------------------------------------------------------------------

export async function POST(request: NextRequest) {
  const user = await requireActiveUser();
  if (!user) {
    return NextResponse.json({ error: "Não autenticado" }, { status: 401 });
  }

  let formData: FormData;
  try {
    formData = await request.formData();
  } catch {
    return NextResponse.json(
      { error: "Corpo da requisição inválido (esperado multipart/form-data)" },
      { status: 400 },
    );
  }

  const file = formData.get("file");
  if (!file || !(file instanceof File)) {
    return NextResponse.json(
      { error: "Campo 'file' obrigatório" },
      { status: 400 },
    );
  }

  // Validate MIME type
  if (!ALLOWED_MIME_TYPES.includes(file.type)) {
    return NextResponse.json(
      {
        error: `Tipo de ficheiro não permitido: ${file.type}. Permitidos: ${ALLOWED_MIME_TYPES.join(", ")}`,
      },
      { status: 400 },
    );
  }

  // Validate size
  if (file.size > MAX_FILE_SIZE) {
    return NextResponse.json(
      {
        error: `Ficheiro muito grande. Máximo: ${MAX_FILE_SIZE / 1024 / 1024} MB`,
      },
      { status: 400 },
    );
  }

  // Folder (for organisation in Cloudinary)
  const rawFolder = formData.get("folder");
  const folderParsed = folderSchema.safeParse(rawFolder ?? "covers");
  const folder = folderParsed.success ? folderParsed.data : "covers";

  // Read file into buffer
  const arrayBuffer = await file.arrayBuffer();
  const buffer = Buffer.from(arrayBuffer);

  let fileUrl: string;

  if (isCloudinaryConfigured()) {
    try {
      const result = await uploadToCloudinary(
        buffer,
        file.name,
        `sgbu/${folder}`,
      );
      fileUrl = result.url;
    } catch (err) {
      console.error("Upload to Cloudinary failed:", err);
      return NextResponse.json(
        { error: "Falha ao enviar ficheiro para o storage" },
        { status: 500 },
      );
    }
  } else {
    // Fallback to data URL (development/testing without Cloudinary)
    console.warn(
      "CLOUDINARY não configurado — a utilizar data URL como fallback (não recomendado para produção)",
    );
    fileUrl = fileToDataUrl(buffer, file.type);
  }

  return NextResponse.json({ file_url: fileUrl }, { status: 200 });
}
