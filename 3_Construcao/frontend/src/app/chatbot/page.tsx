'use client'

import { useState, useEffect, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import ReactMarkdown from 'react-markdown'
import { Bot, User, Loader2, Send, RefreshCw, BookOpen, Clock, HelpCircle } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { ScrollArea } from '@/components/ui/scroll-area'
import { cn } from '@/lib/utils'
import { useQuery } from '@tanstack/react-query'

type Message = {
  role: 'user' | 'assistant'
  content: string
  timestamp: Date
}

const quickActions = [
  { label: 'Como emprestar um livro?', icon: BookOpen },
  { label: 'Qual o prazo de devolução?', icon: Clock },
  { label: 'Como funciona o sistema de reservas?', icon: RefreshCw },
  { label: 'Quais os valores das multas?', icon: HelpCircle },
]

export default function ChatbotPage() {
  const [messages, setMessages] = useState<Message[]>([])
  const [input, setInput] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [cooldown, setCooldown] = useState(0)
  const messagesEndRef = useRef<HTMLDivElement>(null)

  // Carregar usuário
  const { data: user } = useQuery({
    queryKey: ['current-user'],
    queryFn: async () => {
      const response = await fetch('/api/auth/me')
      if (!response.ok) return null
      return response.json()
    },
  })

  // Mensagem de boas-vindas
  useEffect(() => {
    if (user && messages.length === 0) {
      setMessages([
        {
          role: 'assistant',
          content: `Olá ${user.full_name || user.email?.split('@')[0]}! 👋 Sou o assistente virtual da Biblioteca do ISPTEC. Como posso ajudá-lo hoje?

Posso ajudar com:
- 📚 Buscar livros no acervo
- ✅ Verificar disponibilidade
- 📖 Consultar seus empréstimos
- ℹ️ Informações sobre o regulamento`,
          timestamp: new Date(),
        }
      ])
    }
  }, [user, messages.length])

  // Auto-scroll para última mensagem
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  // Cooldown timer
  useEffect(() => {
    if (cooldown > 0) {
      const timer = setTimeout(() => setCooldown(cooldown - 1), 1000)
      return () => clearTimeout(timer)
    }
  }, [cooldown])

  async function handleSendMessage(e: React.FormEvent) {
    e.preventDefault()
    if (!input.trim() || isLoading || cooldown > 0) return

    const userMessage: Message = {
      role: 'user',
      content: input,
      timestamp: new Date(),
    }

    setMessages(prev => [...prev, userMessage])
    setInput('')
    setIsLoading(true)

    try {
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messages: [
            ...messages.map(m => ({ role: m.role, content: m.content })),
            { role: 'user', content: input },
          ]
        }),
      })

      if (!response.ok) {
        // Tentar ler o erro do servidor
        let errorData
        try {
          errorData = await response.json()
        } catch {
          // Se não for JSON válido, criar objeto de erro
          errorData = { 
            error: `Erro ${response.status}: ${response.statusText}`,
            hint: 'O servidor retornou uma resposta inválida.'
          }
        }
        throw new Error(errorData.error || 'Failed to get response')
      }

      const data = await response.json()

      const assistantMessage: Message = {
        role: 'assistant',
        content: data.message,
        timestamp: new Date(),
      }

      setMessages(prev => [...prev, assistantMessage])
      
      // Se estiver usando fallback, avisar o usuário
      if (data.provider === 'fallback' && data.warning) {
        console.warn('⚠️ Usando modo fallback:', data.warning)
      }
    } catch (caught: unknown) {
      console.error('Chat error:', caught)
      
      let errorMessage = 'Desculpe, ocorreu um erro. Por favor, tente novamente.'
      
      const raw =
        caught instanceof Error
          ? caught.message
          : typeof caught === 'string'
            ? caught
            : ''

      if (raw.includes('Limite de requisições') || raw.includes('rate') || raw.includes('429') || raw.includes('quota') || raw.includes('Muitas consultas')) {
        errorMessage = `😊 **Assistente Muito Solicitado!**

O assistente está a ajudar muitos utilizadores neste momento. Isto é um sinal de que o sistema está a funcionar bem!

**O que fazer:**
- ⏱️ Aguarda 1-2 minutos e tenta novamente
- 📚 Enquanto isso, podes consultar as perguntas frequentes abaixo
- 🧑‍💼 Ou dirije-te ao balcão da biblioteca para assistência imediata

*Não te preocupes - o sistema está a funcionar normalmente e voltará em instantes!* ✨`
        
        // Ativar cooldown de 10 segundos
        setCooldown(10)
      } else if (raw.includes('Chave da API') || raw.includes('Gemini') || raw.includes('GOOGLE_GEMINI_API_KEY') || raw.includes('inválida') || raw.includes('Manutenção')) {
        errorMessage = `🔧 **Assistente em Manutenção Técnica**

O assistente IA está temporariamente indisponível devido a manutenção de rotina.

**Como podes obter ajuda:**
- 📚 Consulta as perguntas rápidas abaixo
- 🧑‍💼 Dirije-te ao balcão de atendimento da biblioteca
- 📧 Envia email para biblioteca@isptec.co.ao

*A equipa está a trabalhar para reestabelecer o serviço. Obrigado pela compreensão!* 🙏`
      } else if (raw.includes('região') || raw.includes('região') || raw.includes('blocked') || raw.includes('unsupported')) {
        errorMessage = `😊 **Assistente Funcionando em Modo Local**

O assistente está optimizado para te ajudar com as questões mais comuns da biblioteca!

**Podes fazer:**
- 💬 Usar as perguntas rápidas abaixo
- 📚 Pesquisar livros no catálogo
- 🧑‍💼 Consultar a equipa no balcão para questões específicas

*O sistema está a funcionar normalmente!* ✨`
      }
      
      setMessages(prev => [...prev, {
        role: 'assistant',
        content: errorMessage,
        timestamp: new Date(),
      }])
    } finally {
      setIsLoading(false)
    }
  }

  function handleQuickAction(text: string) {
    setInput(text)
  }

  return (
    <div className="flex flex-col h-[calc(100vh-64px)] lg:h-screen bg-slate-50">
      {/* Header */}
      <div className="bg-white border-b border-slate-200 px-6 py-4 flex items-center gap-4">
        <div className="w-12 h-12 bg-linear-to-br from-indigo-500 to-purple-600 rounded-2xl flex items-center justify-center">
          <Bot className="w-6 h-6 text-white" />
        </div>
        <div>
          <h1 className="text-lg font-semibold text-slate-800">Assistente Virtual</h1>
          <p className="text-sm text-emerald-600 flex items-center gap-2">
            <span className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse" />
            Online 24/7
          </p>
        </div>
      </div>

      {/* Messages Area */}
      <ScrollArea className="flex-1 px-4 py-6">
        <div className="max-w-3xl mx-auto space-y-4">
          <AnimatePresence mode="popLayout">
            {messages.map((message, index) => (
              <motion.div
                key={index}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                transition={{ duration: 0.2 }}
                className={cn(
                  "flex gap-3",
                  message.role === 'user' ? 'justify-end' : 'justify-start'
                )}
              >
                {message.role === 'assistant' && (
                  <div className="h-8 w-8 bg-linear-to-br from-indigo-500 to-purple-600 shrink-0 rounded-full flex items-center justify-center">
                    <Bot className="h-4 w-4 text-white" />
                  </div>
                )}

                <div
                  className={cn(
                    "max-w-[85%] rounded-2xl px-4 py-3",
                    message.role === 'user'
                      ? 'bg-indigo-600 text-white'
                      : 'bg-white text-slate-900 shadow-sm border border-slate-100'
                  )}
                >
                  {message.role === 'user' ? (
                    <p className="text-sm whitespace-pre-wrap">{message.content}</p>
                  ) : (
                    <div className="prose prose-sm max-w-none">
                      <ReactMarkdown
                        components={{
                          p: ({ children }) => <p className="my-1 text-sm leading-relaxed">{children}</p>,
                          ul: ({ children }) => <ul className="my-2 ml-4 space-y-1 list-disc">{children}</ul>,
                          ol: ({ children }) => <ol className="my-2 ml-4 space-y-1 list-decimal">{children}</ol>,
                          li: ({ children }) => <li className="text-sm">{children}</li>,
                          strong: ({ children }) => <strong className="font-semibold">{children}</strong>,
                          code: ({ children }) => <code className="bg-slate-100 px-1 py-0.5 rounded text-xs">{children}</code>,
                        }}
                      >
                        {message.content}
                      </ReactMarkdown>
                    </div>
                  )}
                  <span className={cn(
                    "text-xs mt-1 block",
                    message.role === 'user' ? 'text-indigo-200' : 'text-slate-400'
                  )}>
                    {message.timestamp.toLocaleTimeString('pt-AO', {
                      hour: '2-digit',
                      minute: '2-digit'
                    })}
                  </span>
                </div>

                {message.role === 'user' && (
                  <div className="h-8 w-8 bg-slate-200 shrink-0 rounded-full flex items-center justify-center">
                    <User className="h-4 w-4 text-slate-600" />
                  </div>
                )}
              </motion.div>
            ))}
          </AnimatePresence>

          {isLoading && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="flex gap-3 justify-start"
            >
              <div className="h-8 w-8 bg-linear-to-br from-indigo-500 to-purple-600 shrink-0 rounded-full flex items-center justify-center">
                <Bot className="h-4 w-4 text-white" />
              </div>
              <div className="bg-white rounded-2xl px-4 py-3 shadow-sm border border-slate-100">
                <div className="flex items-center gap-2">
                  <Loader2 className="h-4 w-4 animate-spin text-indigo-600" />
                  <span className="text-sm text-slate-600">A pensar...</span>
                </div>
              </div>
            </motion.div>
          )}

          <div ref={messagesEndRef} />
        </div>
      </ScrollArea>

      {/* Quick Actions */}
      {messages.length <= 1 && (
        <div className="px-6 py-3 bg-slate-50 border-t border-slate-200">
          <div className="max-w-3xl mx-auto">
            <p className="text-xs font-medium text-slate-500 mb-2">Sugestões rápidas:</p>
            <div className="flex flex-wrap gap-2">
              {quickActions.map((action, index) => (
                <Button
                  key={index}
                  variant="outline"
                  size="sm"
                  onClick={() => handleQuickAction(action.label)}
                  disabled={isLoading}
                  className="text-xs bg-white hover:bg-slate-50"
                >
                  <action.icon className="w-3 h-3 mr-1" />
                  {action.label}
                </Button>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Input Area */}
      <div className="bg-white border-t border-slate-200 p-4">
        <form onSubmit={handleSendMessage} className="max-w-3xl mx-auto">
          {cooldown > 0 && (
            <div className="mb-3 p-2 bg-amber-50 border border-amber-200 rounded-lg text-center">
              <span className="text-sm text-amber-800 font-medium">
                ⏱️ Aguarde {cooldown}s antes de enviar outra mensagem
              </span>
            </div>
          )}
          <div className="flex gap-2">
            <Input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder={cooldown > 0 ? `Aguarde ${cooldown}s...` : "Digite sua pergunta..."}
              disabled={isLoading || cooldown > 0}
              className="flex-1 rounded-xl border-slate-200 focus-visible:ring-indigo-500"
            />
            <Button
              type="submit"
              disabled={isLoading || !input.trim() || cooldown > 0}
              className="rounded-xl bg-indigo-600 hover:bg-indigo-700 px-6"
            >
              {isLoading ? (
                <Loader2 className="h-5 w-5 animate-spin" />
              ) : cooldown > 0 ? (
                <span className="text-sm font-medium">{cooldown}s</span>
              ) : (
                <Send className="h-5 w-5" />
              )}
            </Button>
          </div>
          <p className="text-[10px] text-slate-400 text-center mt-2">
            Assistente com IA • Respostas podem conter imprecisões • Para questões complexas, contacte a biblioteca
          </p>
        </form>
      </div>
    </div>
  )
}