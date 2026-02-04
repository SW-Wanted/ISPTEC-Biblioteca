"use client";

import React, { useEffect, useState } from "react";
import { Link } from "@/lib/router";
import { createPageUrl } from "@/utils";
import { motion } from "framer-motion";
import {
  HelpCircle,
  Clock,
  MessageCircle,
  Phone,
  Mail,
  MapPin,
  Users,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { Skeleton } from "@/components/ui/skeleton";

interface LoanPolicy {
  loanDays: number;
  maxBooks: number;
  maxRenewals: number;
}

interface PublicSettings {
  loanPolicies: {
    STUDENT: LoanPolicy;
    TEACHER: LoanPolicy;
    [key: string]: LoanPolicy;
  };
  systemPolicies: {
    RESERVATION_COLLECTION_HOURS: string;
    [key: string]: string;
  };
  faqs: Array<{
    id: string;
    question: string;
    answer: string;
    order: number;
  }>;
}

export default function Help() {
  const [settings, setSettings] = useState<PublicSettings | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/settings/public")
      .then((res) => res.json())
      .then((data) => {
        setSettings(data);
        setLoading(false);
      })
      .catch((err) => {
        console.error("Erro ao carregar configurações:", err);
        // Fallback para valores padrão
        setSettings({
          loanPolicies: {
            STUDENT: { loanDays: 5, maxBooks: 2, maxRenewals: 2 },
            TEACHER: { loanDays: 15, maxBooks: 4, maxRenewals: 2 },
          },
          systemPolicies: {
            RESERVATION_COLLECTION_HOURS: "48",
          },
        });
        setLoading(false);
      });
  }, []);

  const studentPolicy = settings?.loanPolicies.STUDENT;
  const teacherPolicy = settings?.loanPolicies.TEACHER;
  const reservationHours =
    settings?.systemPolicies.RESERVATION_COLLECTION_HOURS || "48";

  // Horários dinâmicos
  const weekdayHours =
    settings?.systemPolicies.LIBRARY_HOURS_WEEKDAY || "07:30-17:00";
  const saturdayHours =
    settings?.systemPolicies.LIBRARY_HOURS_SATURDAY || "08:00-12:30";
  const sundayHours =
    settings?.systemPolicies.LIBRARY_HOURS_SUNDAY || "Fechado";
  const saturdayNote = settings?.systemPolicies.LIBRARY_SATURDAY_NOTE || "";

  // Informações de contacto dinâmicas
  const contactPhone =
    settings?.systemPolicies.CONTACT_PHONE || "+244 XXX XXX XXX";
  const contactEmail =
    settings?.systemPolicies.CONTACT_EMAIL || "biblioteca@isptec.ao";
  const contactLocation =
    settings?.systemPolicies.CONTACT_LOCATION || "Campus ISPTEC, Luanda";

  const contacts = [
    { icon: Phone, label: "Telefone", value: contactPhone },
    { icon: Mail, label: "Email", value: contactEmail },
    { icon: MapPin, label: "Localização", value: contactLocation },
  ];

  // FAQs dinâmicas com fallback
  const dynamicFaqs =
    settings?.faqs && settings.faqs.length > 0
      ? settings.faqs
      : [
          {
            id: "faq_001",
            question: "Como faço para me cadastrar na biblioteca?",
            answer:
              "O cadastro pode ser feito online através do portal. Você precisará fazer upload dos seus documentos (cartão de estudante ou cartão de colaborador) para validação. Após aprovação, receberá sua credencial digital com QR Code.",
            order: 1,
          },
          {
            id: "faq_002",
            question: "Quantos livros posso emprestar?",
            answer: loading
              ? "A carregar informações..."
              : `Estudantes podem emprestar até ${studentPolicy?.maxBooks} livros por ${studentPolicy?.loanDays} dias. Docentes podem emprestar até ${teacherPolicy?.maxBooks} livros por ${teacherPolicy?.loanDays} dias. Livros de cedência por dia têm limite de 1 exemplar para todos.`,
            order: 2,
          },
          {
            id: "faq_003",
            question: "Como renovar um empréstimo?",
            answer: loading
              ? "A carregar informações..."
              : `Acesse 'Meus Empréstimos' no menu e clique em 'Renovar' no livro desejado. Você pode renovar até ${studentPolicy?.maxRenewals} vezes, desde que não haja reservas pendentes e você não tenha multas.`,
            order: 3,
          },
          {
            id: "faq_004",
            question: "E se o livro que eu quero não está disponível?",
            answer: loading
              ? "A carregar informações..."
              : `Você pode entrar na fila de espera. Quando o livro for devolvido, você será notificado e terá ${reservationHours} horas para retirá-lo na biblioteca.`,
            order: 4,
          },
          {
            id: "faq_005",
            question: "Como funciona o sistema de multas?",
            answer:
              "Multas são aplicadas por atraso na devolução, conforme a tabela do regulamento. Enquanto houver multas pendentes, novos empréstimos e renovações ficam bloqueados.",
            order: 5,
          },
        ];

  return (
    <div className="min-h-screen bg-slate-50 py-8">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center mb-12"
        >
          <div className="w-16 h-16 bg-linear-to-br from-indigo-500 to-purple-600 rounded-2xl flex items-center justify-center mx-auto mb-4">
            <HelpCircle className="w-8 h-8 text-white" />
          </div>
          <h1 className="text-3xl font-bold text-slate-800">
            Central de Ajuda
          </h1>
          <p className="text-slate-500 mt-2">
            Encontre respostas para suas dúvidas sobre a biblioteca
          </p>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="mb-12"
        >
          <Card className="border-0 shadow-sm">
            <CardHeader>
              <CardTitle className="text-lg font-semibold text-slate-800">
                Perguntas Frequentes
              </CardTitle>
            </CardHeader>
            <CardContent>
              <Accordion type="single" collapsible className="w-full">
                {dynamicFaqs.map((faq, index) => (
                  <AccordionItem key={faq.id} value={`item-${index}`}>
                    <AccordionTrigger className="text-left text-slate-800 hover:text-indigo-600">
                      {faq.question}
                    </AccordionTrigger>
                    <AccordionContent className="text-slate-600">
                      {faq.answer}
                    </AccordionContent>
                  </AccordionItem>
                ))}
              </Accordion>
            </CardContent>
          </Card>
        </motion.div>

        <div className="grid sm:grid-cols-2 gap-6 mb-12">
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.3 }}
          >
            <Card className="border-0 shadow-sm h-full">
              <CardHeader>
                <CardTitle className="text-lg font-semibold text-slate-800 flex items-center gap-2">
                  <Clock className="w-5 h-5 text-indigo-600" />
                  Horário de Funcionamento
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {loading ? (
                  <>
                    <Skeleton className="h-10 w-full" />
                    <Skeleton className="h-10 w-full" />
                    <Skeleton className="h-10 w-full" />
                  </>
                ) : (
                  <>
                    <div className="flex justify-between items-center py-2 border-b border-slate-100">
                      <span className="text-slate-600">Segunda a Sexta</span>
                      <span className="font-medium text-slate-800">
                        {weekdayHours}
                      </span>
                    </div>
                    <div className="flex justify-between items-center py-2 border-b border-slate-100">
                      <span className="text-slate-600">
                        Sábados
                        {saturdayNote && saturdayNote.trim() !== ""
                          ? ` (${saturdayNote})`
                          : ""}
                      </span>
                      <span className="font-medium text-slate-800">
                        {saturdayHours}
                      </span>
                    </div>
                    <div className="flex justify-between items-center py-2">
                      <span className="text-slate-600">
                        Domingos e Feriados
                      </span>
                      <span className="font-medium text-red-600">
                        {sundayHours}
                      </span>
                    </div>
                  </>
                )}
              </CardContent>
            </Card>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.3 }}
          >
            <Card className="border-0 shadow-sm h-full">
              <CardHeader>
                <CardTitle className="text-lg font-semibold text-slate-800 flex items-center gap-2">
                  <Users className="w-5 h-5 text-indigo-600" />
                  Limites por Tipo
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {loading ? (
                  <>
                    <Skeleton className="h-16 w-full" />
                    <Skeleton className="h-16 w-full" />
                  </>
                ) : (
                  <>
                    <div className="p-3 bg-blue-50 rounded-lg">
                      <p className="font-medium text-blue-800 mb-1">
                        Estudantes
                      </p>
                      <p className="text-sm text-blue-700">
                        {studentPolicy?.maxBooks} livros •{" "}
                        {studentPolicy?.loanDays} dias •{" "}
                        {studentPolicy?.maxRenewals} renovações
                      </p>
                    </div>
                    <div className="p-3 bg-purple-50 rounded-lg">
                      <p className="font-medium text-purple-800 mb-1">
                        Docentes
                      </p>
                      <p className="text-sm text-purple-700">
                        {teacherPolicy?.maxBooks} livros •{" "}
                        {teacherPolicy?.loanDays} dias •{" "}
                        {teacherPolicy?.maxRenewals} renovações
                      </p>
                    </div>
                  </>
                )}
              </CardContent>
            </Card>
          </motion.div>
        </div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
        >
          <Card className="border-0 shadow-sm bg-linear-to-r from-indigo-500 to-purple-600 text-white">
            <CardContent className="p-6">
              <h3 className="text-xl font-bold mb-4">Precisa de mais ajuda?</h3>
              <p className="text-indigo-100 mb-6">
                Entre em contacto connosco ou use o assistente virtual para
                respostas imediatas.
              </p>
              <div className="grid sm:grid-cols-3 gap-4 mb-6">
                {contacts.map((contact, index) => (
                  <div key={index} className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-white/20 rounded-lg flex items-center justify-center">
                      <contact.icon className="w-5 h-5" />
                    </div>
                    <div>
                      <p className="text-xs text-indigo-200">{contact.label}</p>
                      <p className="font-medium text-sm">{contact.value}</p>
                    </div>
                  </div>
                ))}
              </div>
              <Link to={createPageUrl("Chatbot")}>
                <Button className="bg-white text-indigo-600 hover:bg-indigo-50">
                  <MessageCircle className="w-4 h-4 mr-2" />
                  Falar com o Assistente Virtual
                </Button>
              </Link>
            </CardContent>
          </Card>
        </motion.div>
      </div>
    </div>
  );
}
