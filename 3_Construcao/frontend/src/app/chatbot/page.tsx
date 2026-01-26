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

  async function handleSendMessage(e: React.FormEvent) {
    e.preventDefault()
    if (!input.trim() || isLoading) return

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
        const error = await response.json()
        throw new Error(error.error || 'Failed to get response')
      }

      const data = await response.json()

      const assistantMessage: Message = {
        role: 'assistant',
        content: data.message,
        timestamp: new Date(),
      }

      setMessages(prev => [...prev, assistantMessage])
    } catch (error: any) {
      console.error('Chat error:', error)
      
      let errorMessage = 'Desculpe, ocorreu um erro. Por favor, tente novamente.'
      
      if (error.message.includes('Limite de créditos')) {
        errorMessage = '⚠️ O assistente está temporariamente indisponível. Por favor, contacte a biblioteca diretamente.'
      } else if (error.message.includes('Chave da API')) {
        errorMessage = '⚠️ Configuração pendente. Por favor, contacte o administrador do sistema.'
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
          <div className="flex gap-2">
            <Input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Digite sua pergunta..."
              disabled={isLoading}
              className="flex-1 rounded-xl border-slate-200 focus-visible:ring-indigo-500"
            />
            <Button
              type="submit"
              disabled={isLoading || !input.trim()}
              className="rounded-xl bg-indigo-600 hover:bg-indigo-700 px-6"
            >
              {isLoading ? (
                <Loader2 className="h-5 w-5 animate-spin" />
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