"use client";

import React, { useState, useEffect, useRef } from 'react';
import { Link } from '@/lib/router';
import { createPageUrl } from '@/utils';
import { api } from '@/api/apiClient';
import { useQuery } from '@tanstack/react-query';
import { motion, AnimatePresence } from 'framer-motion';
import ReactMarkdown from 'react-markdown';
import { MessageCircle, Send, Bot, User, Loader2, Sparkles, BookOpen, Clock, HelpCircle, RefreshCw } from 'lucide-react';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { cn } from "@/lib/utils";

type ChatMessage = {
  role: 'assistant' | 'user';
  content: string;
};

type LoanLike = {
  book_title?: string | null;
};

const quickActions = [
  { label: 'Como renovar um empréstimo?', icon: RefreshCw },
  { label: 'Verificar disponibilidade de livro', icon: BookOpen },
  { label: 'Qual é o meu prazo de devolução?', icon: Clock },
  { label: 'Horário de funcionamento', icon: HelpCircle },
];

export default function Chatbot() {
  const [user, setUser] = useState<Awaited<ReturnType<typeof api.auth.me>> | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      role: 'assistant',
      content:
        'Olá! 👋 Sou o assistente virtual da Biblioteca ISPTEC. Como posso ajudá-lo hoje?\n\nPosso ajudar com:\n- Verificar disponibilidade de livros\n- Informações sobre empréstimos e renovações\n- Dúvidas sobre o regulamento\n- Horários e serviços da biblioteca',
    },
  ]);
  const [inputValue, setInputValue] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const loadUser = async () => {
      try { const userData = await api.auth.me(); setUser(userData); } catch (e) {}
    };
    loadUser();
  }, []);

  useEffect(() => { messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [messages]);

  const { data: activeLoans = [] } = useQuery<LoanLike[]>({
    queryKey: ['chatbot-loans', user?.email],
    queryFn: () => api.entities.Loan.filter({ member_id: user?.email, status: 'active' }),
    enabled: !!user?.email,
    initialData: [] as LoanLike[],
  });

  const sendMessage = async (message: string) => {
    if (!message.trim()) return;
    const userMessage: ChatMessage = { role: 'user', content: message };
    setMessages(prev => [...prev, userMessage]);
    setInputValue('');
    setIsLoading(true);

    try {
      let context = `Você é o assistente virtual da Biblioteca Universitária do ISPTEC em Angola. Horário: Segunda a Sexta 07:30-17:00, Sábados (provas) 08:00-12:30. Estudantes: 2 livros/5 dias, 2 renovações. Docentes: 4 livros/15 dias, 2 renovações. Responda em português de Angola de forma amigável.`;
      if (user && activeLoans.length > 0) {
        context += `\nUtilizador tem ${activeLoans.length} empréstimo(s) ativo(s): ${activeLoans.map(l => l.book_title ?? '').filter(Boolean).join(', ')}.`;
      }
      const response = await api.integrations.Core.InvokeLLM<string>({
			prompt: `${context}\n\nPergunta: ${message}`,
			response_json_schema: null,
		});
    const assistantMessage: ChatMessage = { role: 'assistant', content: response };
      setMessages(prev => [...prev, assistantMessage]);
      if (user) await api.entities.ChatConversation.create({ user_id: user.email, session_id: `session_${Date.now()}`, messages: [...messages, userMessage, assistantMessage], is_active: true });
    } catch (error) {
      setMessages(prev => [...prev, { role: 'assistant', content: 'Desculpe, ocorreu um erro. Por favor, tente novamente ou entre em contacto com a biblioteca diretamente.' }]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSubmit = (e: React.FormEvent) => { e.preventDefault(); sendMessage(inputValue); };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col">
      <div className="bg-white border-b border-slate-200 px-4 py-4 flex items-center gap-3">
        <div className="w-12 h-12 bg-linear-to-br from-indigo-500 to-purple-600 rounded-2xl flex items-center justify-center"><Bot className="w-6 h-6 text-white" /></div>
        <div><h1 className="font-semibold text-slate-800">Assistente Virtual</h1><p className="text-sm text-emerald-600 flex items-center gap-1"><span className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse" />Online 24/7</p></div>
      </div>

      <ScrollArea className="flex-1 p-4">
        <div className="max-w-2xl mx-auto space-y-4">
          <AnimatePresence mode="popLayout">
            {messages.map((message, index) => (
              <motion.div key={index} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} className={cn("flex gap-3", message.role === 'user' ? 'justify-end' : 'justify-start')}>
                {message.role === 'assistant' && <div className="w-8 h-8 rounded-full bg-linear-to-br from-indigo-500 to-purple-600 flex items-center justify-center shrink-0"><Bot className="w-4 h-4 text-white" /></div>}
                <div className={cn("max-w-[80%] rounded-2xl px-4 py-3", message.role === 'user' ? 'bg-indigo-600 text-white' : 'bg-white shadow-sm border border-slate-100')}>
                  {message.role === 'user' ? <p className="text-sm">{message.content}</p> : (
                    <div className="prose prose-sm max-w-none prose-slate">
                      <ReactMarkdown components={{ p: ({ children }) => <p className="my-1 text-sm text-slate-700">{children}</p>, ul: ({ children }) => <ul className="my-2 ml-4 text-sm text-slate-700 list-disc">{children}</ul>, li: ({ children }) => <li className="my-0.5">{children}</li>, strong: ({ children }) => <strong className="font-semibold text-slate-800">{children}</strong> }}>{message.content}</ReactMarkdown>
                    </div>
                  )}
                </div>
                {message.role === 'user' && <div className="w-8 h-8 rounded-full bg-slate-200 flex items-center justify-center shrink-0"><User className="w-4 h-4 text-slate-600" /></div>}
              </motion.div>
            ))}
          </AnimatePresence>
          {isLoading && <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="flex gap-3"><div className="w-8 h-8 rounded-full bg-linear-to-br from-indigo-500 to-purple-600 flex items-center justify-center shrink-0"><Bot className="w-4 h-4 text-white" /></div><div className="bg-white shadow-sm border border-slate-100 rounded-2xl px-4 py-3"><div className="flex items-center gap-2"><Loader2 className="w-4 h-4 animate-spin text-indigo-600" /><span className="text-sm text-slate-500">A pensar...</span></div></div></motion.div>}
          <div ref={messagesEndRef} />
        </div>
      </ScrollArea>

      {messages.length <= 2 && (
        <div className="px-4 pb-2"><div className="max-w-2xl mx-auto"><p className="text-xs text-slate-500 mb-2">Sugestões:</p><div className="flex flex-wrap gap-2">{quickActions.map((action, index) => <Button key={index} variant="outline" size="sm" className="text-xs bg-white" onClick={() => sendMessage(action.label)}><action.icon className="w-3 h-3 mr-1" />{action.label}</Button>)}</div></div></div>
      )}

      <div className="bg-white border-t border-slate-200 p-4">
        <form onSubmit={handleSubmit} className="max-w-2xl mx-auto">
          <div className="flex gap-2">
            <Input value={inputValue} onChange={(e) => setInputValue(e.target.value)} placeholder="Escreva sua mensagem..." className="flex-1 rounded-xl border-slate-200 focus-visible:ring-indigo-500" disabled={isLoading} />
            <Button type="submit" disabled={isLoading || !inputValue.trim()} className="rounded-xl bg-indigo-600 hover:bg-indigo-700 px-4">{isLoading ? <Loader2 className="w-5 h-5 animate-spin" /> : <Send className="w-5 h-5" />}</Button>
          </div>
          <p className="text-[10px] text-slate-400 text-center mt-2">Assistente com IA • Para questões complexas, contacte a biblioteca diretamente</p>
        </form>
      </div>
    </div>
  );
}