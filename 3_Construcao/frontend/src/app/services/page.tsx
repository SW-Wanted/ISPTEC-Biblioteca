"use client";

import React, { useState, useEffect } from 'react';
import { api } from '@/api/apiClient';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { motion } from 'framer-motion';
import { format, addHours } from 'date-fns';
import { Computer, KeyRound, FileText, GraduationCap, BookOpen, Clock, CheckCircle, AlertCircle, Loader2, MapPin, ArrowRight } from 'lucide-react';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { createPageUrl } from '@/utils';

const TRAINING_MIN_DATE = format(addHours(new Date(), 24 * 7), 'yyyy-MM-dd');

export default function Services() {
  const [user, setUser] = useState<Awaited<ReturnType<typeof api.auth.me>> | null>(null);
  const [activeService, setActiveService] = useState<string | null>(null);
  const [requestForm, setRequestForm] = useState({ type: '', title: '', description: '', scheduled_date: '' });
  const queryClient = useQueryClient();

  useEffect(() => {
    const loadUser = async () => {
      try { const userData = await api.auth.me(); setUser(userData); } catch (e) { window.location.href = createPageUrl('Home'); }
    };
    loadUser();
  }, []);

  const { data: lockers = [] } = useQuery({ queryKey: ['lockers'], queryFn: () => api.entities.Locker.list(), initialData: [] });
  const { data: computers = [] } = useQuery({ queryKey: ['computers'], queryFn: () => api.entities.Computer.list(), initialData: [] });
  const { data: myRequests = [] } = useQuery({ queryKey: ['my-requests', user?.email], queryFn: () => api.entities.SpecialRequest.filter({ user_id: user?.email }), enabled: !!user?.email, initialData: [] });

  const availableLockers = lockers.filter(l => l.status === 'available');
  const availableComputers = computers.filter(c => c.status === 'available');

  const reserveLockerMutation = useMutation({
    mutationFn: async (locker: any) => {
      if (!user) return;
      await api.entities.Locker.update(locker.id, { status: 'occupied', current_user_id: user.email, occupied_at: new Date().toISOString(), expected_end: addHours(new Date(), 3).toISOString() });
      await api.entities.Notification.create({ user_id: user.email, type: 'in_app', status: 'pending', title: 'Cacifo reservado!', message: `Cacifo ${locker.number} reservado por 3 horas. Libere até ${format(addHours(new Date(), 3), 'HH:mm')}.`, action_type: 'none' });
    },
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['lockers'] }); setActiveService(null); toast.success('Cacifo reservado com sucesso!'); },
    onError: () => { toast.error('Erro ao reservar cacifo'); }
  });

  const reserveComputerMutation = useMutation({
    mutationFn: async (computer: any) => {
      if (!user) return;
      await api.entities.Computer.update(computer.id, { status: 'occupied', current_user_id: user.email, session_start: new Date().toISOString(), session_end: addHours(new Date(), 2).toISOString() });
      await api.entities.Notification.create({ user_id: user.email, type: 'in_app', status: 'pending', title: 'Computador reservado!', message: `Computador ${computer.number} no ${computer.location} reservado por 2 horas. Faça check-in no balcão.`, action_type: 'none' });
    },
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['computers'] }); setActiveService(null); toast.success('Computador reservado! Faça check-in no balcão.'); },
    onError: () => { toast.error('Erro ao reservar computador'); }
  });

  const submitRequestMutation = useMutation({
    mutationFn: async () => {
      if (!user) return;
      await api.entities.SpecialRequest.create({ user_id: user.email, user_name: user.full_name, type: requestForm.type, title: requestForm.title, description: requestForm.description, status: 'pending', scheduled_date: requestForm.scheduled_date || null });
      await api.entities.Notification.create({ user_id: user.email, type: 'in_app', status: 'pending', title: 'Solicitação enviada!', message: `Sua solicitação de ${requestForm.type === 'bibliography' ? 'levantamento bibliográfico' : requestForm.type === 'cataloging' ? 'catalogação na fonte' : 'formação'} foi recebida. Prazo: 5 dias úteis.`, action_type: 'none' });
    },
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['my-requests', user?.email] }); setActiveService(null); setRequestForm({ type: '', title: '', description: '', scheduled_date: '' }); toast.success('Solicitação enviada com sucesso!'); },
    onError: () => { toast.error('Erro ao enviar solicitação'); }
  });

  const services = [
    { id: 'locker', icon: KeyRound, title: 'Guarda-Volumes', description: 'Reserve um cacifo por 3 horas', available: availableLockers.length, total: lockers.length, color: 'from-blue-500 to-cyan-500' },
    { id: 'computer', icon: Computer, title: 'Computadores', description: 'Reserve uma estação por 2 horas', available: availableComputers.length, total: computers.length, color: 'from-purple-500 to-pink-500' },
    { id: 'bibliography', icon: FileText, title: 'Levantamento Bibliográfico', description: 'Solicite pesquisa de bibliografia', color: 'from-emerald-500 to-teal-500' },
    { id: 'cataloging', icon: BookOpen, title: 'Catalogação na Fonte', description: 'Solicite catalogação de sua obra', color: 'from-orange-500 to-amber-500' },
    { id: 'training', icon: GraduationCap, title: 'Formações', description: 'Agende formação em bases de dados', color: 'from-indigo-500 to-violet-500' }
  ];

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'pending': return <Badge className="bg-yellow-100 text-yellow-700">Pendente</Badge>;
      case 'in_progress': return <Badge className="bg-blue-100 text-blue-700">Em andamento</Badge>;
      case 'completed': return <Badge className="bg-emerald-100 text-emerald-700">Concluído</Badge>;
      case 'cancelled': return <Badge className="bg-slate-100 text-slate-700">Cancelado</Badge>;
      default: return null;
    }
  };

  if (!user) return null;

  return (
    <div className="min-h-screen bg-slate-50 py-8">
      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="mb-8">
          <h1 className="text-2xl font-bold text-slate-800 flex items-center gap-3"><Computer className="w-7 h-7 text-indigo-600" />Serviços da Biblioteca</h1>
          <p className="text-slate-500 mt-1">Reserve recursos e solicite serviços especiais</p>
        </div>

        <Tabs defaultValue="services">
          <TabsList className="mb-6"><TabsTrigger value="services">Serviços Disponíveis</TabsTrigger><TabsTrigger value="requests">Minhas Solicitações ({myRequests.length})</TabsTrigger></TabsList>
          <TabsContent value="services">
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {services.map((service, index) => (
                <motion.div key={service.id} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3, delay: index * 0.1 }}>
                  <Card className="border-0 shadow-sm hover:shadow-md transition-all duration-300 cursor-pointer overflow-hidden" onClick={() => setActiveService(service.id)}>
                    <CardContent className="p-6">
                      <div className={cn("w-14 h-14 rounded-2xl bg-gradient-to-br flex items-center justify-center mb-4", service.color)}><service.icon className="w-7 h-7 text-white" /></div>
                      <h3 className="font-semibold text-slate-800 mb-1">{service.title}</h3>
                      <p className="text-sm text-slate-500 mb-3">{service.description}</p>
                      {service.available !== undefined && <div className="flex items-center gap-2"><Badge variant="secondary" className={cn(service.available > 0 ? "bg-emerald-50 text-emerald-700" : "bg-red-50 text-red-700")}>{service.available > 0 ? `${service.available} disponível(is)` : 'Todos ocupados'}</Badge></div>}
                      <Button variant="link" className="p-0 h-auto mt-3 text-indigo-600">{service.id === 'locker' || service.id === 'computer' ? 'Reservar' : 'Solicitar'}<ArrowRight className="w-4 h-4 ml-1" /></Button>
                    </CardContent>
                  </Card>
                </motion.div>
              ))}
            </div>
          </TabsContent>
          <TabsContent value="requests">
            {myRequests.length === 0 ? <Card className="border-0 shadow-sm"><CardContent className="p-12 text-center"><FileText className="w-16 h-16 text-slate-300 mx-auto mb-4" /><h3 className="text-lg font-semibold text-slate-800 mb-2">Nenhuma solicitação</h3><p className="text-slate-500">Suas solicitações de serviços especiais aparecerão aqui.</p></CardContent></Card> : (
              <div className="space-y-4">{myRequests.map(request => <Card key={request.id} className="border-0 shadow-sm"><CardContent className="p-4"><div className="flex items-start justify-between"><div><div className="flex items-center gap-2 mb-1">{getStatusBadge(request.status)}<Badge variant="outline" className="text-xs">{request.type === 'bibliography' && 'Levantamento Bibliográfico'}{request.type === 'cataloging' && 'Catalogação na Fonte'}{request.type === 'training' && 'Formação'}</Badge></div><h3 className="font-medium text-slate-800">{request.title}</h3><p className="text-sm text-slate-500 mt-1">{request.description}</p>{request.created_date && <p className="text-xs text-slate-400 mt-2">Solicitado em {format(new Date(request.created_date), "dd/MM/yyyy")}</p>}</div>{request.response && <div className="text-right"><p className="text-xs text-slate-500">Resposta:</p><p className="text-sm text-slate-700">{request.response}</p></div>}</div></CardContent></Card>)}</div>
            )}
          </TabsContent>
        </Tabs>
      </div>

      <Dialog open={activeService === 'locker'} onOpenChange={() => setActiveService(null)}>
        <DialogContent><DialogHeader><DialogTitle>Reservar Cacifo</DialogTitle><DialogDescription>Escolha um cacifo disponível. Duração: 3 horas.</DialogDescription></DialogHeader><div className="py-4">{availableLockers.length === 0 ? <div className="text-center py-8"><AlertCircle className="w-12 h-12 text-orange-400 mx-auto mb-3" /><p className="text-slate-600">Todos os cacifos estão ocupados no momento.</p></div> : <div className="grid grid-cols-4 gap-2">{availableLockers.map(locker => <Button key={locker.id} variant="outline" className="h-16 flex flex-col" onClick={() => reserveLockerMutation.mutate(locker)} disabled={reserveLockerMutation.isPending}><KeyRound className="w-5 h-5 mb-1" /><span className="text-xs">{locker.number}</span></Button>)}</div>}</div></DialogContent>
      </Dialog>

      <Dialog open={activeService === 'computer'} onOpenChange={() => setActiveService(null)}>
        <DialogContent><DialogHeader><DialogTitle>Reservar Computador</DialogTitle><DialogDescription>Escolha uma estação disponível. Sessão de 2 horas.</DialogDescription></DialogHeader><div className="py-4">{availableComputers.length === 0 ? <div className="text-center py-8"><AlertCircle className="w-12 h-12 text-orange-400 mx-auto mb-3" /><p className="text-slate-600">Todos os computadores estão ocupados.</p></div> : <div className="space-y-3">{[...new Set(availableComputers.map(c => c.location))].map(location => <div key={location}><p className="text-sm font-medium text-slate-700 mb-2 flex items-center gap-1"><MapPin className="w-4 h-4" />{location}</p><div className="grid grid-cols-4 gap-2">{availableComputers.filter(c => c.location === location).map(computer => <Button key={computer.id} variant="outline" className="h-14 flex flex-col" onClick={() => reserveComputerMutation.mutate(computer)} disabled={reserveComputerMutation.isPending}><Computer className="w-4 h-4 mb-1" /><span className="text-xs">PC {computer.number}</span></Button>)}</div></div>)}</div>}</div></DialogContent>
      </Dialog>

      <Dialog open={activeService === 'bibliography' || activeService === 'cataloging' || activeService === 'training'} onOpenChange={() => setActiveService(null)}>
        <DialogContent><DialogHeader><DialogTitle>{activeService === 'bibliography' && 'Levantamento Bibliográfico'}{activeService === 'cataloging' && 'Catalogação na Fonte'}{activeService === 'training' && 'Agendar Formação'}</DialogTitle><DialogDescription>{activeService === 'bibliography' && 'Solicite uma pesquisa bibliográfica sobre seu tema. Prazo: 5 dias úteis.'}{activeService === 'cataloging' && 'Solicite a catalogação da sua obra. Prazo: 5 dias úteis.'}{activeService === 'training' && 'Agende uma formação sobre acesso a bases de dados. Agende com 1 semana de antecedência.'}</DialogDescription></DialogHeader><div className="py-4 space-y-4"><div><Label>Título / Assunto</Label><Input value={requestForm.title} onChange={(e) => setRequestForm({...requestForm, title: e.target.value, type: activeService})} placeholder={activeService === 'bibliography' ? 'Ex: Inteligência Artificial na Educação' : activeService === 'cataloging' ? 'Nome da sua obra' : 'Tema da formação desejada'} /></div><div><Label>Descrição / Detalhes</Label><Textarea value={requestForm.description} onChange={(e) => setRequestForm({...requestForm, description: e.target.value})} placeholder={activeService === 'bibliography' ? 'Descreva os tópicos, palavras-chave e período de interesse...' : activeService === 'cataloging' ? 'Informações adicionais sobre a obra...' : 'Objetivos da formação, nível de conhecimento atual...'} rows={4} /></div>{activeService === 'training' && <div><Label>Data pretendida</Label><Input type="date" value={requestForm.scheduled_date} onChange={(e) => setRequestForm({...requestForm, scheduled_date: e.target.value})} min={TRAINING_MIN_DATE} /><p className="text-xs text-slate-500 mt-1">Agende com pelo menos 1 semana de antecedência</p></div>}</div><DialogFooter><Button variant="outline" onClick={() => setActiveService(null)}>Cancelar</Button><Button onClick={() => submitRequestMutation.mutate()} disabled={submitRequestMutation.isPending || !requestForm.title || !requestForm.description}>{submitRequestMutation.isPending && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}Enviar Solicitação</Button></DialogFooter></DialogContent>
      </Dialog>
    </div>
  );
}