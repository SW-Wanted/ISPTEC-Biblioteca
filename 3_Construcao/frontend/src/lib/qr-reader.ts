/**
 * QR Code Reader Utility
 * Extrai dados de QR Codes de imagens de cartões de estudante
 */

import jsQR from "jsqr";
import sharp from "sharp";

/**
 * Lê QR Code de uma imagem usando jsQR e sharp
 * @param imageBuffer Buffer da imagem ou URL
 * @returns String contida no QR Code ou null se não encontrado
 */
export async function readQRFromImage(
  imageInput: Buffer | string,
): Promise<string | null> {
  try {
    let imageBuffer: Buffer;

    // Se for URL, fazer fetch
    if (typeof imageInput === "string") {
      const response = await fetch(imageInput);
      if (!response.ok) {
        throw new Error(`Erro ao buscar imagem: ${response.statusText}`);
      }
      imageBuffer = Buffer.from(await response.arrayBuffer());
    } else {
      imageBuffer = imageInput;
    }

    // Converter imagem para raw pixel data usando sharp
    const { data, info } = await sharp(imageBuffer)
      .resize({ width: 1000, withoutEnlargement: true }) // Redimensionar para performance
      .ensureAlpha() // Garantir canal alpha
      .raw()
      .toBuffer({ resolveWithObject: true });

    // Decodificar QR Code
    const qrCode = jsQR(new Uint8ClampedArray(data), info.width, info.height);

    if (qrCode) {
      return qrCode.data;
    }

    return null;
  } catch (error) {
    console.error("Erro ao ler QR Code da imagem:", error);
    return null;
  }
}

/**
 * Interface para dados extraídos de VCARD
 */
export interface VCardData {
  fullName?: string;
  firstName?: string;
  lastName?: string;
  phone?: string;
  email?: string;
  organization?: string;
  title?: string;
}

/**
 * Parseia string VCARD e extrai informações relevantes
 * @param vcardString String no formato VCARD 3.0 ou 4.0
 * @returns Objeto com dados estruturados
 */
export function parseVCard(vcardString: string): VCardData {
  const data: VCardData = {};

  // Remover espaços em branco extras
  const lines = vcardString
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter((line) => line.length > 0);

  for (const line of lines) {
    // Ignorar BEGIN/END VCARD
    if (line.startsWith("BEGIN:VCARD") || line.startsWith("END:VCARD")) {
      continue;
    }

    // Parsear cada campo
    const colonIndex = line.indexOf(":");
    if (colonIndex === -1) continue;

    const fieldPart = line.substring(0, colonIndex);
    const value = line.substring(colonIndex + 1);

    // Extrair o nome do campo (antes de ; ou :)
    const fieldName = fieldPart.split(";")[0];

    switch (fieldName) {
      case "FN": // Full Name
        data.fullName = value;
        break;

      case "N": // Name (Structured)
        // Formato: LastName;FirstName;MiddleName;Prefix;Suffix
        const nameParts = value.split(";");
        if (nameParts.length >= 2) {
          data.lastName = nameParts[0] || undefined;
          data.firstName = nameParts[1] || undefined;

          // Se não tiver fullName, construir
          if (!data.fullName && data.firstName && data.lastName) {
            data.fullName = `${data.firstName} ${data.lastName}`.trim();
          }
        }
        break;

      case "TEL": // Telephone
        if (!data.phone) {
          data.phone = value;
        }
        break;

      case "EMAIL":
        if (!data.email) {
          data.email = value;
        }
        break;

      case "ORG": // Organization
        data.organization = value;
        break;

      case "TITLE": // Job Title
        data.title = value;
        break;
    }
  }

  return data;
}

/**
 * Extrai código de matrícula de email ISPTEC
 * @param email Email no formato codigomatricula@isptec.co.ao
 * @returns Código de matrícula ou null
 */
export function extractRegistrationCode(email: string): string | null {
  const match = email.match(/^([a-zA-Z0-9]+)@isptec\.co\.ao$/i);
  return match ? match[1] : null;
}

/**
 * Lê QR Code de cartão de estudante e extrai informações
 * @param imageInput Buffer da imagem ou URL
 * @returns Dados do estudante ou null
 */
export async function extractStudentDataFromCard(
  imageInput: Buffer | string,
): Promise<VCardData | null> {
  try {
    // Ler QR Code
    const qrData = await readQRFromImage(imageInput);

    if (!qrData) {
      console.log("Nenhum QR Code encontrado na imagem");
      return null;
    }

    // Verificar se é VCARD
    if (!qrData.includes("BEGIN:VCARD")) {
      console.log("QR Code não contém dados VCARD");
      return null;
    }

    // Parsear VCARD
    const studentData = parseVCard(qrData);

    return studentData;
  } catch (error) {
    console.error("Erro ao extrair dados do cartão:", error);
    return null;
  }
}
