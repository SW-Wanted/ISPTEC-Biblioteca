"use client";

import { FileCheck } from "lucide-react";
import { DocumentsVerification } from "@/components/documents-verification";

export default function DocumentsVerificationPage() {
  return (
    <div className="min-h-screen bg-slate-50 py-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-slate-800 flex items-center gap-3">
              <FileCheck className="w-7 h-7 text-indigo-600" />
              Verificação de Documentos
            </h1>
            <p className="text-slate-500 mt-1">
              Gere e verifique documentos enviados pelos membros
            </p>
          </div>
        </div>

        <DocumentsVerification />
      </div>
    </div>
  );
}
