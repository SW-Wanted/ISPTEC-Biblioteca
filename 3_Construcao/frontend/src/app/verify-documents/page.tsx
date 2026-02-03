"use client";

import { DocumentsVerification } from "@/components/documents-verification";

export default function DocumentsVerificationPage() {
  return (
    <div className="container mx-auto p-6 space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">
          Verificação de Documentos
        </h1>
        <p className="text-muted-foreground mt-2">
          Gere e verifique documentos enviados pelos membros
        </p>
      </div>

      <DocumentsVerification />
    </div>
  );
}
