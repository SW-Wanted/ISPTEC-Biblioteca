"use client"

import React, { useEffect, useState } from "react"
import Image from "next/image"
import { Link } from "@/lib/router"
import { createPageUrl } from "@/utils"
import { api } from "@/api/apiClient"
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { motion } from "framer-motion"
import { AlertCircle, BookOpen, CheckCircle, ChevronLeft, Heart, Loader2, MapPin, Share2, Star } from "lucide-react"

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Separator } from "@/components/ui/separator"
import { Skeleton } from "@/components/ui/skeleton"
import { Textarea } from "@/components/ui/textarea"
import { cn } from "@/lib/utils"
import { toast } from "sonner"

type BookReviewRow = {
  id?: string
  book_id?: string | null
  user_id?: string | null
  user_name?: string | null
  rating?: number | null
  review?: string | null
  is_verified_read?: boolean | null
  created_at?: string | null
}

type BookDetailsClientProps = {
  bookId: string | null
}

export default function BookDetailsClient({ bookId }: BookDetailsClientProps) {
  const [user, setUser] = useState<Awaited<ReturnType<typeof api.auth.me>> | null>(null)
  const [showReserveDialog, setShowReserveDialog] = useState(false)
  const [showReviewDialog, setShowReviewDialog] = useState(false)
  const [reviewRating, setReviewRating] = useState(0)
  const [reviewText, setReviewText] = useState("")
  const queryClient = useQueryClient()

  useEffect(() => {
    const loadUser = async () => {
      try {
        const userData = await api.auth.me()
        setUser(userData)
      } catch {
        // ignore
      }
    }
    loadUser()
  }, [])

  const { data: book, isLoading } = useQuery({
    queryKey: ["book", bookId],
    queryFn: async () => {
      const books = await api.entities.Book.filter({ id: bookId })
      return books[0]
    },
    enabled: !!bookId,
  })

  const { data: member } = useQuery({
    queryKey: ["member", user?.email],
    queryFn: async () => {
      const members = await api.entities.Member.filter({ user_id: user?.email })
      return members[0] || null
    },
    enabled: !!user?.email,
    initialData: null,
  })

  const { data: copies = [] } = useQuery({
    queryKey: ["copies", bookId],
    queryFn: () => api.entities.Copy.filter({ book_id: bookId }),
    enabled: !!bookId,
    initialData: [],
  })

  const { data: reviews = [] } = useQuery<BookReviewRow[]>({
    queryKey: ["reviews", bookId],
    queryFn: () => api.entities.BookReview.filter({ book_id: bookId }),
    enabled: !!bookId,
    initialData: [] as BookReviewRow[],
  })

  const { data: existingReservations = [] } = useQuery({
    queryKey: ["reservations", bookId, user?.email],
    queryFn: () =>
      api.entities.Reservation.filter({ book_id: bookId, member_id: user?.email, status: "active" }),
    enabled: !!bookId && !!user?.email,
    initialData: [],
  })

  const { data: queueReservations = [] } = useQuery({
    queryKey: ["queue", bookId],
    queryFn: () => api.entities.Reservation.filter({ book_id: bookId, status: "active" }),
    enabled: !!bookId,
    initialData: [],
  })

  const reserveMutation = useMutation({
    mutationFn: async () => {
      if (!bookId || !user || !book) return
      const queuePosition = queueReservations.length + 1
      const availableCopiesCount = book.available_copies ?? 0
      await api.entities.Reservation.create({
        book_id: bookId,
        member_id: user.email,
        book_title: book.title,
        member_name: user.full_name,
        status: availableCopiesCount > 0 ? "available" : "active",
        reservation_date: new Date().toISOString(),
        queue_position: queuePosition,
        available_date: availableCopiesCount > 0 ? new Date().toISOString() : null,
        expiry_date:
          availableCopiesCount > 0
            ? new Date(Date.now() + 48 * 60 * 60 * 1000).toISOString()
            : null,
      })
      await api.entities.Notification.create({
        user_id: user.email,
        type: "in_app",
        status: "pending",
        title: availableCopiesCount > 0 ? "Livro reservado!" : "Entrou na fila de espera",
        message:
          availableCopiesCount > 0
            ? `O livro "${book.title}" está reservado para você. Retire em até 48 horas.`
            : `Você está na posição ${queuePosition} da fila para "${book.title}".`,
        reservation_id: bookId,
        action_type: "collect_reservation",
      })
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["reservations", bookId, user?.email] })
      queryClient.invalidateQueries({ queryKey: ["queue", bookId] })
      setShowReserveDialog(false)
      toast.success((book?.available_copies ?? 0) > 0 ? "Reserva realizada com sucesso!" : "Você entrou na fila de espera!")
    },
    onError: () => {
      toast.error("Erro ao realizar reserva")
    },
  })

  const reviewMutation = useMutation({
    mutationFn: async () => {
      if (!bookId || !user || !book) return
      await api.entities.BookReview.create({
        book_id: bookId,
        rating: reviewRating,
        review: reviewText,
        is_verified_read: false,
      })
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["reviews", bookId] })
      queryClient.invalidateQueries({ queryKey: ["book", bookId] })
      setShowReviewDialog(false)
      setReviewRating(0)
      setReviewText("")
      toast.success("Avaliação enviada!")
    },
    onError: () => {
      toast.error("Erro ao enviar avaliação")
    },
  })

  const availableCopies = copies.filter((c: { status?: string | null }) => c.status === "available")
  const hasExistingReservation = existingReservations.length > 0

  if (!bookId) {
    return (
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <Card className="border-0 shadow-sm">
          <CardContent className="p-12 text-center">
            <BookOpen className="w-16 h-16 text-slate-300 mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-slate-800 mb-2">Livro não especificado</h3>
            <Link to={createPageUrl("SearchBooks")}>
              <Button variant="outline" className="mt-4">
                <ChevronLeft className="w-4 h-4 mr-2" />Voltar à pesquisa
              </Button>
            </Link>
          </CardContent>
        </Card>
      </div>
    )
  }

  if (isLoading) {
    return (
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="grid lg:grid-cols-3 gap-8">
          <div className="lg:col-span-1">
            <Skeleton className="aspect-2/3 w-full rounded-2xl" />
          </div>
          <div className="lg:col-span-2 space-y-4">
            <Skeleton className="h-10 w-3/4" />
            <Skeleton className="h-6 w-1/2" />
            <Skeleton className="h-32 w-full" />
          </div>
        </div>
      </div>
    )
  }

  if (!book) {
    return (
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <Card className="border-0 shadow-sm">
          <CardContent className="p-12 text-center">
            <BookOpen className="w-16 h-16 text-slate-300 mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-slate-800 mb-2">Livro não encontrado</h3>
            <Link to={createPageUrl("SearchBooks")}>
              <Button variant="outline" className="mt-4">
                <ChevronLeft className="w-4 h-4 mr-2" />Voltar à pesquisa
              </Button>
            </Link>
          </CardContent>
        </Card>
      </div>
    )
  }

  const averageRating = typeof book.average_rating === "number" ? book.average_rating : 0
  const totalReviews = typeof book.total_reviews === "number" ? book.total_reviews : 0

  return (
    <div className="min-h-screen bg-slate-50 pb-12">
      <div className="bg-white border-b border-slate-200">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center gap-2 text-sm">
            <Link
              to={createPageUrl("SearchBooks")}
              className="text-slate-500 hover:text-indigo-600 transition-colors flex items-center gap-1"
            >
              <ChevronLeft className="w-4 h-4" />Pesquisa
            </Link>
            <span className="text-slate-300">/</span>
            <span className="text-slate-800 font-medium truncate">{book.title}</span>
          </div>
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="grid lg:grid-cols-3 gap-8">
          <motion.div initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} className="lg:col-span-1">
            <div className="sticky top-8">
              <div className="aspect-2/3 bg-linear-to-br from-slate-100 to-slate-200 rounded-2xl overflow-hidden shadow-xl relative">
                {book.cover_url ? (
                  <Image
                    src={book.cover_url}
                    alt={book.title}
                    fill
                    className="object-cover"
                    sizes="(max-width: 1024px) 100vw, 33vw"
                    unoptimized
                    loader={({ src }) => src}
                  />
                ) : (
                  <div className="absolute inset-0 flex items-center justify-center">
                    <BookOpen className="w-24 h-24 text-slate-300" />
                  </div>
                )}
              </div>
              <div className="mt-4 flex gap-2">
                <Button variant="outline" className="flex-1" size="sm">
                  <Heart className="w-4 h-4 mr-2" />Favoritar
                </Button>
                <Button variant="outline" size="sm">
                  <Share2 className="w-4 h-4" />
                </Button>
              </div>
            </div>
          </motion.div>

          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="lg:col-span-2">
            <div className="flex flex-wrap gap-2 mb-4">
              {book.category && (
                <Badge variant="secondary" className="bg-indigo-50 text-indigo-700">
                  {book.category}
                </Badge>
              )}
              {book.language && (
                <Badge variant="outline">
                  {book.language === "pt"
                    ? "Português"
                    : book.language === "en"
                      ? "Inglês"
                      : book.language === "es"
                        ? "Espanhol"
                        : book.language}
                </Badge>
              )}
            </div>

            <h1 className="text-3xl lg:text-4xl font-bold text-slate-800 mb-2">{book.title}</h1>
            {book.subtitle && <p className="text-xl text-slate-600 mb-4">{book.subtitle}</p>}

            <div className="flex flex-wrap items-center gap-4 text-slate-600 mb-6">
              <p className="font-medium">{book.authors?.join(", ") || "Autor desconhecido"}</p>
              {averageRating > 0 && (
                <div className="flex items-center gap-1">
                  <Star className="w-5 h-5 text-amber-400 fill-amber-400" />
                  <span className="font-semibold">{averageRating.toFixed(1)}</span>
                  <span className="text-slate-400">({totalReviews} avaliações)</span>
                </div>
              )}
            </div>

            <Card
              className={cn(
                "border-2 mb-6",
                availableCopies.length > 0 || (book.available_copies ?? 0) > 0
                  ? "border-emerald-200 bg-emerald-50"
                  : "border-orange-200 bg-orange-50"
              )}
            >
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    {availableCopies.length > 0 || (book.available_copies ?? 0) > 0 ? (
                      <CheckCircle className="w-8 h-8 text-emerald-600" />
                    ) : (
                      <AlertCircle className="w-8 h-8 text-orange-600" />
                    )}
                    <div>
                      <p
                        className={cn(
                          "font-semibold text-lg",
                          availableCopies.length > 0 || (book.available_copies ?? 0) > 0
                            ? "text-emerald-800"
                            : "text-orange-800"
                        )}
                      >
                        {availableCopies.length > 0 || (book.available_copies ?? 0) > 0
                          ? `${book.available_copies ?? availableCopies.length} exemplar(es) disponível(is)`
                          : "Indisponível no momento"}
                      </p>
                      {queueReservations.length > 0 && !(book.available_copies ?? 0) && (
                        <p className="text-sm text-orange-700">
                          {queueReservations.length} pessoa(s) na fila de espera
                        </p>
                      )}
                    </div>
                  </div>
                  {user ? (
                    hasExistingReservation ? (
                      <Badge className="bg-indigo-100 text-indigo-700 py-2 px-4">Já reservado</Badge>
                    ) : (
                      <Button
                        onClick={() => setShowReserveDialog(true)}
                        className={
                          (book.available_copies ?? 0) > 0 || availableCopies.length > 0
                            ? "bg-emerald-600 hover:bg-emerald-700"
                            : "bg-orange-600 hover:bg-orange-700"
                        }
                      >
                        {(book.available_copies ?? 0) > 0 || availableCopies.length > 0
                          ? "Reservar para Retirada"
                          : "Entrar na Fila"}
                      </Button>
                    )
                  ) : (
                    <Link to={createPageUrl("Home")}>
                      <Button variant="outline">Faça login para reservar</Button>
                    </Link>
                  )}
                </div>
              </CardContent>
            </Card>

            <Card className="border-0 shadow-sm mb-6">
              <CardContent className="p-6">
                <h3 className="font-semibold text-slate-800 mb-4">Detalhes do Livro</h3>
                <div className="grid grid-cols-2 gap-4 text-sm">
                  {book.isbn && (
                    <div>
                      <p className="text-slate-500">ISBN</p>
                      <p className="font-medium text-slate-800">{book.isbn}</p>
                    </div>
                  )}
                  {book.publisher && (
                    <div>
                      <p className="text-slate-500">Editora</p>
                      <p className="font-medium text-slate-800">{book.publisher}</p>
                    </div>
                  )}
                  {book.publication_year && (
                    <div>
                      <p className="text-slate-500">Ano de Publicação</p>
                      <p className="font-medium text-slate-800">{book.publication_year}</p>
                    </div>
                  )}
                  {book.edition && (
                    <div>
                      <p className="text-slate-500">Edição</p>
                      <p className="font-medium text-slate-800">{book.edition}</p>
                    </div>
                  )}
                  {book.pages && (
                    <div>
                      <p className="text-slate-500">Páginas</p>
                      <p className="font-medium text-slate-800">{book.pages}</p>
                    </div>
                  )}
                  {book.location && (
                    <div>
                      <p className="text-slate-500">Localização</p>
                      <p className="font-medium text-slate-800 flex items-center gap-1">
                        <MapPin className="w-4 h-4 text-indigo-600" />{book.location}
                      </p>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>

            {book.description && (
              <Card className="border-0 shadow-sm mb-6">
                <CardContent className="p-6">
                  <h3 className="font-semibold text-slate-800 mb-4">Sinopse</h3>
                  <p className="text-slate-600 leading-relaxed whitespace-pre-wrap">{book.description}</p>
                </CardContent>
              </Card>
            )}

            <Card className="border-0 shadow-sm">
              <CardHeader className="flex flex-row items-center justify-between">
                <CardTitle className="text-lg">Avaliações</CardTitle>
                {user && (
                  <Button variant="outline" size="sm" onClick={() => setShowReviewDialog(true)}>
                    Avaliar
                  </Button>
                )}
              </CardHeader>
              <CardContent>
                {reviews.length === 0 ? (
                  <p className="text-slate-500 text-center py-4">Nenhuma avaliação ainda. Seja o primeiro a avaliar!</p>
                ) : (
                  <div className="space-y-4">
                    {reviews.map((review) => (
                      <div key={review.id} className="border-b border-slate-100 last:border-0 pb-4 last:pb-0">
                        <div className="flex items-center justify-between mb-2">
                          <div className="flex items-center gap-2">
                            <div className="w-8 h-8 rounded-full bg-indigo-100 flex items-center justify-center text-indigo-600 font-medium">
                              {review.user_name?.charAt(0) || "U"}
                            </div>
                            <span className="font-medium text-slate-800">{review.user_name || "Anónimo"}</span>
                            {review.is_verified_read && (
                              <Badge variant="secondary" className="text-[10px]">
                                Leitura verificada
                              </Badge>
                            )}
                          </div>
                          <div className="flex items-center gap-1">
                            {Array.from({ length: 5 }).map((_, i) => (
                              <Star
                                key={i}
                                className={cn(
                                  "w-4 h-4",
                                  i < (review.rating ?? 0)
                                    ? "text-amber-400 fill-amber-400"
                                    : "text-slate-200"
                                )}
                              />
                            ))}
                          </div>
                        </div>
                        {review.review && <p className="text-slate-600 text-sm">{review.review}</p>}
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </motion.div>
        </div>
      </div>

      <Dialog open={showReserveDialog} onOpenChange={setShowReserveDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {(book?.available_copies ?? 0) > 0 || availableCopies.length > 0
                ? "Confirmar Reserva"
                : "Entrar na Fila de Espera"}
            </DialogTitle>
            <DialogDescription>
              {(book?.available_copies ?? 0) > 0 || availableCopies.length > 0
                ? `O livro "${book?.title}" ficará reservado por 48 horas. Retire na biblioteca.`
                : `Você será notificado quando o livro "${book?.title}" estiver disponível.`}
            </DialogDescription>
          </DialogHeader>
          <div className="py-4">
            <div className="flex items-center gap-4 p-4 bg-slate-50 rounded-lg">
              <div className="w-16 h-20 bg-slate-200 rounded shrink-0 overflow-hidden">
                {book?.cover_url && (
                  <Image
                    src={book.cover_url}
                    alt=""
                    width={64}
                    height={80}
                    className="w-full h-full object-cover"
                    unoptimized
                    loader={({ src }) => src}
                  />
                )}
              </div>
              <div>
                <p className="font-medium text-slate-800">{book?.title}</p>
                <p className="text-sm text-slate-500">{book?.authors?.join(", ")}</p>
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowReserveDialog(false)}>
              Cancelar
            </Button>
            <Button onClick={() => reserveMutation.mutate()} disabled={reserveMutation.isPending}>
              {reserveMutation.isPending && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              Confirmar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={showReviewDialog} onOpenChange={setShowReviewDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Avaliar Livro</DialogTitle>
          </DialogHeader>
          <div className="py-4 space-y-4">
            <div>
              <p className="text-sm text-slate-600 mb-2">Sua avaliação</p>
              <div className="flex gap-1">
                {Array.from({ length: 5 }).map((_, i) => (
                  <button key={i} onClick={() => setReviewRating(i + 1)} className="p-1">
                    <Star
                      className={cn(
                        "w-8 h-8 transition-colors",
                        i < reviewRating
                          ? "text-amber-400 fill-amber-400"
                          : "text-slate-200 hover:text-amber-200"
                      )}
                    />
                  </button>
                ))}
              </div>
            </div>
            <div>
              <p className="text-sm text-slate-600 mb-2">Comentário (opcional)</p>
              <Textarea
                value={reviewText}
                onChange={(e) => setReviewText(e.target.value)}
                placeholder="Conte o que achou do livro..."
                rows={4}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowReviewDialog(false)}>
              Cancelar
            </Button>
            <Button
              onClick={() => reviewMutation.mutate()}
              disabled={reviewMutation.isPending || reviewRating === 0}
            >
              {reviewMutation.isPending && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              Enviar Avaliação
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Separator className="sr-only" />
      {member ? null : null}
    </div>
  )
}
