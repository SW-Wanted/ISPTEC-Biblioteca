"use client";

import { useState } from "react";
import { Upload, FileText, CheckCircle, XCircle, Loader2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/components/ui/use-toast";
import { Alert, AlertDescription } from "@/components/ui/alert";

interface UserDocument {
  id: string;
  documentType: string;
  documentUrl: string;
  isVerified: boolean;
  verifiedAt: string | null;
  createdAt: string;
  updatedAt: string;
}

interface DocumentsManagerProps {
  documents: UserDocument[];
  userType?: string | null;
  onDocumentsChange?: () => void;
}

const DOCUMENT_TYPES = {
  ID_CARD: "Cartão de Identidade",
  STUDENT_CARD: "Cartão de Estudante",
  ENROLLMENT: "Ficha de Matrícula",
  STAFF_CARD: "Cartão de Colaborador",
  TEACHER_CARD: "Cartão de Professor",
} as const;

type DocumentTypeKey = keyof typeof DOCUMENT_TYPES;

// Documentos requeridos por tipo de usuário
const getRequiredDocuments = (
  userType: string | null | undefined,
): DocumentTypeKey[] => {
  const type = userType?.toLowerCase();

  switch (type) {
    case "student":
      return ["STUDENT_CARD", "ENROLLMENT"];
    case "teacher":
      return ["TEACHER_CARD"];
    case "staff":
    case "librarian":
    case "cataloger":
    case "supervisor":
      return ["STAFF_CARD"];
    default:
      return ["ID_CARD"];
  }
};

export function DocumentsManager({
  documents,
  userType,
  onDocumentsChange,
}: DocumentsManagerProps) {
  const [uploading, setUploading] = useState<DocumentTypeKey | null>(null);
  const { toast } = useToast();

  // Obter documentos requeridos baseado no tipo de usuário
  const requiredDocuments = getRequiredDocuments(userType);

  const handleFileUpload = async (
    documentType: DocumentTypeKey,
    file: File,
  ) => {
    setUploading(documentType);

    try {
      // 1. Upload do ficheiro
      const formData = new FormData();
      formData.append("file", file);
      formData.append("folder", "documents");

      const uploadResponse = await fetch("/api/uploads", {
        method: "POST",
        body: formData,
      });

      if (!uploadResponse.ok) {
        const error = await uploadResponse.json();
        throw new Error(error.error || "Erro ao enviar ficheiro");
      }

      const { file_url } = await uploadResponse.json();

      // 2. Registar documento
      const documentResponse = await fetch("/api/members/documents", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          documentType,
          documentUrl: file_url,
        }),
      });

      if (!documentResponse.ok) {
        const error = await documentResponse.json();
        throw new Error(error.error || "Erro ao registar documento");
      }

      toast({
        title: "Documento enviado",
        description: "O documento será verificado pela equipa da biblioteca.",
      });

      onDocumentsChange?.();
    } catch (error) {
      console.error("Erro ao enviar documento:", error);
      toast({
        title: "Erro",
        description:
          error instanceof Error ? error.message : "Erro ao enviar documento",
        variant: "destructive",
      });
    } finally {
      setUploading(null);
    }
  };

  const getDocumentStatus = (doc: UserDocument) => {
    if (doc.isVerified) {
      return {
        label: "Verificado",
        variant: "default" as const,
        icon: CheckCircle,
      };
    }
    return {
      label: "Pendente",
      variant: "secondary" as const,
      icon: XCircle,
    };
  };

  const renderDocumentCard = (type: DocumentTypeKey) => {
    const existingDoc = documents.find((d) => d.documentType === type);
    const status = existingDoc ? getDocumentStatus(existingDoc) : null;
    const isUploading = uploading === type;

    return (
      <Card key={type}>
        <CardHeader>
          <div className="flex items-start justify-between">
            <div>
              <CardTitle className="text-base">
                {DOCUMENT_TYPES[type]}
              </CardTitle>
              {existingDoc && (
                <CardDescription className="mt-1">
                  Enviado a{" "}
                  {new Date(existingDoc.createdAt).toLocaleDateString("pt-AO")}
                </CardDescription>
              )}
            </div>
            {status && (
              <Badge
                variant={status.variant}
                className="flex items-center gap-1"
              >
                <status.icon className="h-3 w-3" />
                {status.label}
              </Badge>
            )}
          </div>
        </CardHeader>
        <CardContent>
          {existingDoc ? (
            <div className="space-y-2">
              <a
                href={existingDoc.documentUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-2 text-sm text-blue-600 hover:underline"
              >
                <FileText className="h-4 w-4" />
                Ver documento
              </a>
              <label className="block">
                <Button
                  variant="outline"
                  size="sm"
                  disabled={isUploading}
                  className="w-full"
                  asChild
                >
                  <span>
                    {isUploading ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />A
                        enviar...
                      </>
                    ) : (
                      <>
                        <Upload className="mr-2 h-4 w-4" />
                        Substituir documento
                      </>
                    )}
                  </span>
                </Button>
                <input
                  type="file"
                  className="hidden"
                  accept="image/*,application/pdf"
                  disabled={isUploading}
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) {
                      handleFileUpload(type, file);
                    }
                  }}
                />
              </label>
            </div>
          ) : (
            <label className="block">
              <Button
                variant="outline"
                size="sm"
                disabled={isUploading}
                className="w-full"
                asChild
              >
                <span>
                  {isUploading ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />A
                      enviar...
                    </>
                  ) : (
                    <>
                      <Upload className="mr-2 h-4 w-4" />
                      Enviar documento
                    </>
                  )}
                </span>
              </Button>
              <input
                type="file"
                className="hidden"
                accept="image/*,application/pdf"
                disabled={isUploading}
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) {
                    handleFileUpload(type, file);
                  }
                }}
              />
            </label>
          )}
        </CardContent>
      </Card>
    );
  };

  const allVerified =
    documents.length > 0 && documents.every((d) => d.isVerified);
  const hasDocuments = documents.length > 0;

  return (
    <div className="space-y-4">
      {!hasDocuments && (
        <Alert>
          <AlertDescription>
            Envie os documentos necessários para ativar a sua conta e poder usar
            os serviços da biblioteca.
          </AlertDescription>
        </Alert>
      )}

      {hasDocuments && !allVerified && (
        <Alert>
          <AlertDescription>
            Os teus documentos estão a ser verificados. Serás notificado quando
            o processo estiver concluído.
          </AlertDescription>
        </Alert>
      )}

      {allVerified && (
        <Alert>
          <AlertDescription className="flex items-center gap-2">
            <CheckCircle className="h-4 w-4 text-green-600" />
            Todos os documentos foram verificados!
          </AlertDescription>
        </Alert>
      )}

      <div className="grid gap-4 md:grid-cols-2">
        {requiredDocuments.map((type) => renderDocumentCard(type))}
      </div>
    </div>
  );
}
