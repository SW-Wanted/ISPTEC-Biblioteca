import React from "react";
import Link from "next/link";
import Image from "next/image";
import { Home, Search } from "lucide-react";
import { Button } from "@/components/ui/button";

export const metadata = {
  title: "404 - Página não encontrada | ISPTEC Biblioteca",
};

export default function NotFound() {
  return (
    <div className="min-h-screen flex flex-col bg-linear-to-br from-slate-50 to-slate-100">
      {/* Simple header for unauthenticated context */}
      <header className="h-16 px-6 flex items-center justify-between border-b border-slate-200 bg-white">
        <Link href="/" className="flex items-center gap-3">
          <Image
            src="/isptec-logo-square.png"
            alt="ISPTEC"
            width={36}
            height={36}
            className="rounded-xl"
          />
          <div>
            <span className="font-bold text-slate-800">ISPTEC</span>
            <span className="text-[10px] text-slate-500 uppercase tracking-wider ml-2">
              Biblioteca
            </span>
          </div>
        </Link>
        <Link href="/login">
          <Button variant="outline" size="sm">
            Entrar
          </Button>
        </Link>
      </header>

      <div className="flex-1 flex items-center justify-center p-4">
        <div className="max-w-lg w-full text-center space-y-8">
          {/* Illustration */}
          <div className="relative mx-auto w-64 h-48">
            <Image
              src="/index/isptec-campus-01.jpeg"
              alt="ISPTEC Campus"
              fill
              className="object-cover rounded-2xl opacity-30"
            />
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="text-center">
                <p className="text-8xl font-black text-slate-800/80 tracking-tight">
                  404
                </p>
              </div>
            </div>
          </div>

          {/* Info */}
          <div className="space-y-3">
            <h1 className="text-2xl sm:text-3xl font-bold text-slate-900 tracking-tight">
              Página não encontrada
            </h1>
            <p className="text-slate-500 text-sm sm:text-base leading-relaxed max-w-md mx-auto">
              A página que procura não existe ou foi movida. Verifique o
              endereço ou volte à página inicial.
            </p>
          </div>

          {/* Actions */}
          <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
            <Link href="/">
              <Button className="h-11 bg-slate-900 hover:bg-slate-800 text-white font-medium shadow-sm rounded-xl transition-all duration-200 px-6">
                <Home className="w-4 h-4 mr-2" />
                Página inicial
              </Button>
            </Link>
            <Link href="/search-books">
              <Button
                variant="outline"
                className="h-11 font-medium rounded-xl px-6"
              >
                <Search className="w-4 h-4 mr-2" />
                Pesquisar livros
              </Button>
            </Link>
          </div>

          {/* ISPTEC Branding */}
          <div className="pt-4 flex items-center justify-center gap-2 text-slate-400 text-xs">
            <Image
              src="/isptec-logo.png"
              alt="ISPTEC"
              width={20}
              height={20}
              className="opacity-50"
            />
            <span>Biblioteca Digital ISPTEC</span>
          </div>
        </div>
      </div>
    </div>
  );
}
