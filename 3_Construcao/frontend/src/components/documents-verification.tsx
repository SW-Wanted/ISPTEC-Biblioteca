"use client";

import { useState, useEffect } from "react";
import {
  CheckCircle,
  XCircle,
  FileText,
  User,
  Loader2,
  ExternalLink,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useToast } from "@/components/ui/use-toast";
import { Skeleton } from "@/components/ui/skeleton";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

interface UserDocument {
  id: string;
  documentType: string;
  documentUrl: string;
  isVerified: boolean;
  verifiedAt: string | null;
  createdAt: string;
  user: {
    id: string;
    name: string;
    email: string;
    type: string;
    registrationNumber: string | null;
  };
}

const DOCUMENT_TYPES = {
  ID_CARD: "Cartão de Identidade",
  STUDENT_CARD: "Cartão de Estudante",
  ENROLLMENT: "Ficha de Matrícula",
  STAFF_CARD: "Cartão de Colaborador",
} as const;

const USER_TYPES = {
  STUDENT: "Estudante",
  TEACHER: "Docente",
  STAFF: "Funcionário",
  LIBRARIAN: "Bibliotecário",
  CATALOGER: "Catalogador",
  SUPERVISOR: "Supervisor",
} as const;

export function DocumentsVerification() {
  const [loading, setLoading] = useState(true);
  const [documents, setDocuments] = useState<UserDocument[]>([]);
  const [filter, setFilter] = useState<"all" | "pending" | "verified">(
    "pending",
  );
  const [processingId, setProcessingId] = useState<string | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [selectedDocument, setSelectedDocument] = useState<UserDocument | null>(
    null,
  );
  const [actionType, setActionType] = useState<"verify" | "reject" | null>(
    null,
  );
  const { toast } = useToast();

  const fetchDocuments = async () => {
    try {
      setLoading(true);
      const response = await fetch(
        `/api/members/documents/pending?status=${filter}`,
      );

      if (!response.ok) {
        throw new Error("Erro ao carregar documentos");
      }

      const data = await response.json();
      setDocuments(data.documents);
    } catch (error) {
      console.error("Erro ao carregar documentos:", error);
      toast({
        title: "Erro",
        description: "Erro ao carregar documentos",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleAction = async (documentId: string, isVerified: boolean) => {
    try {
      setProcessingId(documentId);
      const response = await fetch(`/api/members/documents/${documentId}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ isVerified }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Erro ao processar documento");
      }

      toast({
        title: isVerified ? "Documento verificado" : "Documento rejeitado",
        description: isVerified
          ? "O documento foi verificado com sucesso"
          : "O documento foi rejeitado",
      });

      // Recarregar lista
      await fetchDocuments();
    } catch (error) {
      console.error("Erro ao processar documento:", error);
      toast({
        title: "Erro",
        description:
          error instanceof Error
            ? error.message
            : "Erro ao processar documento",
        variant: "destructive",
      });
    } finally {
      setProcessingId(null);
      setDialogOpen(false);
      setSelectedDocument(null);
      setActionType(null);
    }
  };

  const openConfirmDialog = (
    document: UserDocument,
    action: "verify" | "reject",
  ) => {
    setSelectedDocument(document);
    setActionType(action);
    setDialogOpen(true);
  };

  useEffect(() => {
    fetchDocuments();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filter]);

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Verificação de Documentos</CardTitle>
          <CardDescription>
            Gerir e verificar documentos dos membros
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            <Skeleton className="h-10 w-full" />
            <Skeleton className="h-10 w-full" />
            <Skeleton className="h-10 w-full" />
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <>
      <Card>
        <CardHeader>
          <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
            <div>
              <CardTitle>Verificação de Documentos</CardTitle>
              <CardDescription>
                Gerir e verificar documentos dos membros
              </CardDescription>
            </div>
            <Select
              value={filter}
              onValueChange={(value: "all" | "pending" | "verified") =>
                setFilter(value)
              }
            >
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="Filtrar por" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos</SelectItem>
                <SelectItem value="pending">Pendentes</SelectItem>
                <SelectItem value="verified">Verificados</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardHeader>
        <CardContent>
          {documents.length === 0 ? (
            <div className="py-8 text-center text-muted-foreground">
              Nenhum documento encontrado
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Utilizador</TableHead>
                    <TableHead>Tipo</TableHead>
                    <TableHead>Documento</TableHead>
                    <TableHead>Data</TableHead>
                    <TableHead>Estado</TableHead>
                    <TableHead className="text-right">Ações</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {documents.map((doc) => (
                    <TableRow key={doc.id}>
                      <TableCell>
                        <div className="flex flex-col">
                          <div className="flex items-center gap-2">
                            <User className="h-4 w-4 text-muted-foreground" />
                            <span className="font-medium">{doc.user.name}</span>
                          </div>
                          <span className="text-sm text-muted-foreground">
                            {doc.user.email}
                          </span>
                          {doc.user.registrationNumber && (
                            <span className="text-xs text-muted-foreground">
                              Nº {doc.user.registrationNumber}
                            </span>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline">
                          {USER_TYPES[doc.user.type as keyof typeof USER_TYPES]}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <div className="flex flex-col gap-1">
                          <span className="text-sm">
                            {
                              DOCUMENT_TYPES[
                                doc.documentType as keyof typeof DOCUMENT_TYPES
                              ]
                            }
                          </span>
                          <a
                            href={doc.documentUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="flex items-center gap-1 text-xs text-blue-600 hover:underline"
                          >
                            <FileText className="h-3 w-3" />
                            Ver documento
                            <ExternalLink className="h-3 w-3" />
                          </a>
                        </div>
                      </TableCell>
                      <TableCell>
                        <span className="text-sm">
                          {new Date(doc.createdAt).toLocaleDateString("pt-AO")}
                        </span>
                      </TableCell>
                      <TableCell>
                        {doc.isVerified ? (
                          <Badge
                            variant="default"
                            className="flex w-fit items-center gap-1"
                          >
                            <CheckCircle className="h-3 w-3" />
                            Verificado
                          </Badge>
                        ) : (
                          <Badge
                            variant="secondary"
                            className="flex w-fit items-center gap-1"
                          >
                            <XCircle className="h-3 w-3" />
                            Pendente
                          </Badge>
                        )}
                      </TableCell>
                      <TableCell className="text-right">
                        {!doc.isVerified && (
                          <div className="flex justify-end gap-2">
                            <Button
                              size="sm"
                              variant="default"
                              onClick={() => openConfirmDialog(doc, "verify")}
                              disabled={processingId === doc.id}
                            >
                              {processingId === doc.id ? (
                                <Loader2 className="h-4 w-4 animate-spin" />
                              ) : (
                                <>
                                  <CheckCircle className="mr-1 h-4 w-4" />
                                  Verificar
                                </>
                              )}
                            </Button>
                            <Button
                              size="sm"
                              variant="destructive"
                              onClick={() => openConfirmDialog(doc, "reject")}
                              disabled={processingId === doc.id}
                            >
                              {processingId === doc.id ? (
                                <Loader2 className="h-4 w-4 animate-spin" />
                              ) : (
                                <>
                                  <XCircle className="mr-1 h-4 w-4" />
                                  Rejeitar
                                </>
                              )}
                            </Button>
                          </div>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      <AlertDialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {actionType === "verify"
                ? "Verificar documento"
                : "Rejeitar documento"}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {actionType === "verify" ? (
                <>
                  Confirma que o documento de{" "}
                  <strong>{selectedDocument?.user.name}</strong> está correto e
                  deve ser verificado?
                </>
              ) : (
                <>
                  Tens a certeza que desejas rejeitar o documento de{" "}
                  <strong>{selectedDocument?.user.name}</strong>? O utilizador
                  será notificado.
                </>
              )}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                if (selectedDocument) {
                  handleAction(selectedDocument.id, actionType === "verify");
                }
              }}
            >
              Confirmar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
