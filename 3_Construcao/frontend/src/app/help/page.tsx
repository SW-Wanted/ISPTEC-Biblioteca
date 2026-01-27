"use client";

import React from 'react';
import { Link } from '@/lib/router';
import { createPageUrl } from '@/utils';
import { motion } from 'framer-motion';
import { HelpCircle, Clock, MessageCircle, Phone, Mail, MapPin, Users } from 'lucide-react';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";

const faqs = [
  { question: "Como faço para me cadastrar na biblioteca?", answer: "O cadastro pode ser feito online através do portal. Você precisará fazer upload dos seus documentos (cartão de estudante ou cartão de colaborador) para validação. Após aprovação, receberá sua credencial digital com QR Code." },
  { question: "Quantos livros posso emprestar?", answer: "Estudantes podem emprestar até 2 livros por 5 dias. Docentes podem emprestar até 4 livros por 15 dias. Livros de cedência por dia têm limite de 1 exemplar para todos." },
  { question: "Como renovar um empréstimo?", answer: "Acesse 'Meus Empréstimos' no menu e clique em 'Renovar' no livro desejado. Você pode renovar até 2 vezes, desde que não haja reservas pendentes e você não tenha multas." },
  { question: "E se o livro que eu quero não está disponível?", answer: "Você pode entrar na fila de espera. Quando o livro for devolvido, você será notificado e terá 48 horas para retirá-lo na biblioteca." },
  { question: "Como funciona o sistema de multas?", answer: "Multas são aplicadas por atraso na devolução, conforme a tabela do regulamento. Enquanto houver multas pendentes, novos empréstimos e renovações ficam bloqueados." }
];

const contacts = [
  { icon: Phone, label: "Telefone", value: "+244 XXX XXX XXX" },
  { icon: Mail, label: "Email", value: "biblioteca@isptec.ao" },
  { icon: MapPin, label: "Localização", value: "Campus ISPTEC, Luanda" },
];

export default function Help() {
  return (
    <div className="min-h-screen bg-slate-50 py-8">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="text-center mb-12">
          <div className="w-16 h-16 bg-linear-to-br from-indigo-500 to-purple-600 rounded-2xl flex items-center justify-center mx-auto mb-4"><HelpCircle className="w-8 h-8 text-white" /></div>
          <h1 className="text-3xl font-bold text-slate-800">Central de Ajuda</h1>
          <p className="text-slate-500 mt-2">Encontre respostas para suas dúvidas sobre a biblioteca</p>
        </motion.div>

        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }} className="mb-12">
          <Card className="border-0 shadow-sm"><CardHeader><CardTitle className="text-lg font-semibold text-slate-800">Perguntas Frequentes</CardTitle></CardHeader><CardContent><Accordion type="single" collapsible className="w-full">{faqs.map((faq, index) => <AccordionItem key={index} value={`item-${index}`}><AccordionTrigger className="text-left text-slate-800 hover:text-indigo-600">{faq.question}</AccordionTrigger><AccordionContent className="text-slate-600">{faq.answer}</AccordionContent></AccordionItem>)}</Accordion></CardContent></Card>
        </motion.div>

        <div className="grid sm:grid-cols-2 gap-6 mb-12">
          <motion.div initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.3 }}>
            <Card className="border-0 shadow-sm h-full"><CardHeader><CardTitle className="text-lg font-semibold text-slate-800 flex items-center gap-2"><Clock className="w-5 h-5 text-indigo-600" />Horário de Funcionamento</CardTitle></CardHeader><CardContent className="space-y-3"><div className="flex justify-between items-center py-2 border-b border-slate-100"><span className="text-slate-600">Segunda a Sexta</span><span className="font-medium text-slate-800">07:30 - 17:00</span></div><div className="flex justify-between items-center py-2 border-b border-slate-100"><span className="text-slate-600">Sábados (época de provas)</span><span className="font-medium text-slate-800">08:00 - 12:30</span></div><div className="flex justify-between items-center py-2"><span className="text-slate-600">Domingos e Feriados</span><span className="font-medium text-red-600">Fechado</span></div></CardContent></Card>
          </motion.div>

          <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.3 }}>
            <Card className="border-0 shadow-sm h-full"><CardHeader><CardTitle className="text-lg font-semibold text-slate-800 flex items-center gap-2"><Users className="w-5 h-5 text-indigo-600" />Limites por Tipo</CardTitle></CardHeader><CardContent className="space-y-4"><div className="p-3 bg-blue-50 rounded-lg"><p className="font-medium text-blue-800 mb-1">Estudantes</p><p className="text-sm text-blue-700">2 livros • 5 dias • 2 renovações</p></div><div className="p-3 bg-purple-50 rounded-lg"><p className="font-medium text-purple-800 mb-1">Docentes</p><p className="text-sm text-purple-700">4 livros • 15 dias • 2 renovações</p></div></CardContent></Card>
          </motion.div>
        </div>

        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.4 }}>
          <Card className="border-0 shadow-sm bg-linear-to-r from-indigo-500 to-purple-600 text-white">
            <CardContent className="p-6"><h3 className="text-xl font-bold mb-4">Precisa de mais ajuda?</h3><p className="text-indigo-100 mb-6">Entre em contacto connosco ou use o assistente virtual para respostas imediatas.</p><div className="grid sm:grid-cols-3 gap-4 mb-6">{contacts.map((contact, index) => <div key={index} className="flex items-center gap-3"><div className="w-10 h-10 bg-white/20 rounded-lg flex items-center justify-center"><contact.icon className="w-5 h-5" /></div><div><p className="text-xs text-indigo-200">{contact.label}</p><p className="font-medium text-sm">{contact.value}</p></div></div>)}</div><Link to={createPageUrl('Chatbot')}><Button className="bg-white text-indigo-600 hover:bg-indigo-50"><MessageCircle className="w-4 h-4 mr-2" />Falar com o Assistente Virtual</Button></Link></CardContent>
          </Card>
        </motion.div>
      </div>
    </div>
  );
}