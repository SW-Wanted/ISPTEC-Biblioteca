"use client";

import { useState, useEffect } from "react";
import { QrCode, RefreshCw, Download, Loader2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { useToast } from "@/components/ui/use-toast";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Skeleton } from "@/components/ui/skeleton";

interface QRCodeData {
  qrCode: string | null;
  qrCodeImage: string | null;
  generatedAt: string | null;
}

export function QRCodeDisplay() {
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [qrData, setQrData] = useState<QRCodeData | null>(null);
  const { toast } = useToast();

  const fetchQRCode = async () => {
    try {
      setLoading(true);
      const response = await fetch("/api/members/qrcode");

      if (!response.ok) {
        throw new Error("Erro ao obter QR Code");
      }

      const data = await response.json();
      setQrData(data);
    } catch (error) {
      console.error("Erro ao obter QR Code:", error);
      toast({
        title: "Erro",
        description: "Erro ao carregar QR Code",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const generateQRCode = async () => {
    try {
      setGenerating(true);
      const response = await fetch("/api/members/qrcode", {
        method: "POST",
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Erro ao gerar QR Code");
      }

      const data = await response.json();
      setQrData({
        qrCode: data.qrCode,
        qrCodeImage: data.qrCodeImage,
        generatedAt: data.generatedAt,
      });

      toast({
        title: "QR Code gerado",
        description: "A tua credencial digital foi gerada com sucesso!",
      });
    } catch (error) {
      console.error("Erro ao gerar QR Code:", error);
      toast({
        title: "Erro",
        description:
          error instanceof Error ? error.message : "Erro ao gerar QR Code",
        variant: "destructive",
      });
    } finally {
      setGenerating(false);
    }
  };

  const downloadQRCode = () => {
    if (!qrData?.qrCodeImage) return;

    const link = document.createElement("a");
    link.href = qrData.qrCodeImage;
    link.download = `ISPTEC-Credencial-${Date.now()}.png`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    toast({
      title: "Download concluído",
      description: "O QR Code foi descarregado com sucesso",
    });
  };

  useEffect(() => {
    fetchQRCode();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <QrCode className="h-5 w-5" />
            Credencial Digital (QR Code)
          </CardTitle>
          <CardDescription>
            A tua credencial digital para acesso à biblioteca
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col items-center space-y-4">
          <Skeleton className="h-[300px] w-[300px]" />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <QrCode className="h-5 w-5" />
          Credencial Digital (QR Code)
        </CardTitle>
        <CardDescription>
          A tua credencial digital para acesso à biblioteca
        </CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col items-center space-y-4">
        {!qrData?.qrCode ? (
          <>
            <Alert>
              <AlertDescription>
                Ainda não tens uma credencial digital. Gera o teu QR Code para
                ter acesso rápido aos serviços da biblioteca.
              </AlertDescription>
            </Alert>
            <Button
              onClick={generateQRCode}
              disabled={generating}
              className="w-full md:w-auto"
            >
              {generating ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />A gerar...
                </>
              ) : (
                <>
                  <QrCode className="mr-2 h-4 w-4" />
                  Gerar QR Code
                </>
              )}
            </Button>
          </>
        ) : (
          <>
            <div className="rounded-lg border bg-white p-4">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={qrData.qrCodeImage!}
                alt="QR Code da Credencial"
                className="h-[300px] w-[300px]"
              />
            </div>

            {qrData.generatedAt && (
              <p className="text-sm text-muted-foreground">
                Gerado a{" "}
                {new Date(qrData.generatedAt).toLocaleString("pt-AO", {
                  day: "2-digit",
                  month: "2-digit",
                  year: "numeric",
                  hour: "2-digit",
                  minute: "2-digit",
                })}
              </p>
            )}

            <div className="flex flex-col gap-2 w-full md:flex-row md:w-auto">
              <Button
                variant="outline"
                onClick={downloadQRCode}
                className="flex-1"
              >
                <Download className="mr-2 h-4 w-4" />
                Descarregar
              </Button>
              <Button
                variant="outline"
                onClick={generateQRCode}
                disabled={generating}
                className="flex-1"
              >
                {generating ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />A gerar...
                  </>
                ) : (
                  <>
                    <RefreshCw className="mr-2 h-4 w-4" />
                    Gerar Novo
                  </>
                )}
              </Button>
            </div>

            <Alert>
              <AlertDescription className="text-xs">
                <strong>Importante:</strong> Apresenta este QR Code ao
                bibliotecário para levantar livros. Não partilhes a tua
                credencial com outras pessoas.
              </AlertDescription>
            </Alert>
          </>
        )}
      </CardContent>
    </Card>
  );
}
