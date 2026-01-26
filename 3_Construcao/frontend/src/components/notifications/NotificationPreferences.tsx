"use client"

import React from "react"
import {
  Mail,
  Smartphone,
  Monitor,
  BookOpen,
  Clock,
  DollarSign,
  FileText,
  CheckCircle,
} from "lucide-react"

import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card"
import { Switch } from "@/components/ui/switch"
import { Label } from "@/components/ui/label"
import { Separator } from "@/components/ui/separator"
import { cn } from "@/lib/utils"

const notificationTypes = [
  {
    id: 'loan_due_soon',
    label: 'Devolução Próxima',
    description: 'Alertas quando um empréstimo está próximo do vencimento',
    icon: Clock,
    color: 'text-orange-600 bg-orange-100'
  },
  {
    id: 'loan_overdue',
    label: 'Empréstimo Atrasado',
    description: 'Notificações quando um empréstimo passa do prazo',
    icon: Clock,
    color: 'text-red-600 bg-red-100'
  },
  {
    id: 'reservation_available',
    label: 'Reserva Disponível',
    description: 'Quando um livro reservado fica disponível para retirada',
    icon: BookOpen,
    color: 'text-emerald-600 bg-emerald-100'
  },
  {
    id: 'reservation_expiring',
    label: 'Reserva Expirando',
    description: 'Alertas quando o prazo de retirada está acabando',
    icon: Clock,
    color: 'text-amber-600 bg-amber-100'
  },
  {
    id: 'new_fine',
    label: 'Nova Multa',
    description: 'Quando uma multa é gerada na sua conta',
    icon: DollarSign,
    color: 'text-red-600 bg-red-100'
  },
  {
    id: 'fine_paid',
    label: 'Pagamento Confirmado',
    description: 'Confirmação de pagamento de multas',
    icon: CheckCircle,
    color: 'text-emerald-600 bg-emerald-100'
  },
  {
    id: 'request_status',
    label: 'Status de Solicitações',
    description: 'Atualizações sobre suas solicitações de serviços',
    icon: FileText,
    color: 'text-indigo-600 bg-indigo-100'
  },
  {
    id: 'renewal_success',
    label: 'Renovação Realizada',
    description: 'Confirmação de renovação de empréstimos',
    icon: CheckCircle,
    color: 'text-emerald-600 bg-emerald-100'
  }
];

const channels = [
  { id: 'in_app', label: 'No Aplicativo', icon: Monitor, description: 'Notificações dentro do sistema' },
  { id: 'email', label: 'Email', icon: Mail, description: 'Receber por email' },
  { id: 'push', label: 'Push', icon: Smartphone, description: 'Notificações push no navegador' }
];

type NotificationPreferencesProps = {
  preferences?: Record<string, unknown> | null;
  onUpdate: (preferences: Record<string, unknown>) => void;
  isUpdating?: boolean;
};

export default function NotificationPreferences({
  preferences,
  onUpdate,
  isUpdating,
}: NotificationPreferencesProps) {
  const handleToggle = (typeId: string, channelId: string) => {
    const key = `${typeId}_${channelId}`;
    const isCurrentlyEnabled = preferences?.[key] !== false;
    const newValue = !isCurrentlyEnabled;
    onUpdate({ ...(preferences ?? {}), [key]: newValue });
  };

  const handleToggleAll = (channelId: string, enabled: boolean) => {
    const updates: Record<string, boolean> = {};
    notificationTypes.forEach(type => {
      updates[`${type.id}_${channelId}`] = enabled;
    });
    onUpdate({ ...(preferences ?? {}), ...updates });
  };

  const isEnabled = (typeId: string, channelId: string) => {
    return preferences?.[`${typeId}_${channelId}`] !== false; // Default to true
  };

  const getChannelCount = (channelId: string) => {
    return notificationTypes.filter(type => isEnabled(type.id, channelId)).length;
  };

  return (
    <div className="space-y-6">
      {/* Channel Summary */}
      <div className="grid sm:grid-cols-3 gap-4">
        {channels.map(channel => (
          <Card key={channel.id} className="border-0 shadow-sm">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-indigo-100 rounded-lg flex items-center justify-center">
                    <channel.icon className="w-5 h-5 text-indigo-600" />
                  </div>
                  <div>
                    <p className="font-medium text-slate-800">{channel.label}</p>
                    <p className="text-xs text-slate-500">{getChannelCount(channel.id)} de {notificationTypes.length} ativas</p>
                  </div>
                </div>
                <Switch
                  checked={getChannelCount(channel.id) === notificationTypes.length}
                  onCheckedChange={(checked) => handleToggleAll(channel.id, checked)}
                  disabled={isUpdating}
                />
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Detailed Preferences */}
      <Card className="border-0 shadow-sm">
        <CardHeader>
          <CardTitle className="text-lg">Preferências Detalhadas</CardTitle>
          <CardDescription>Configure cada tipo de notificação individualmente</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {notificationTypes.map((type, index) => (
              <div key={type.id}>
                {index > 0 && <Separator className="my-4" />}
                <div className="flex flex-col sm:flex-row sm:items-center gap-4">
                  <div className="flex items-center gap-3 flex-1 min-w-0">
                    <div className={cn("w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0", type.color.split(' ')[1])}>
                      <type.icon className={cn("w-5 h-5", type.color.split(' ')[0])} />
                    </div>
                    <div className="min-w-0">
                      <p className="font-medium text-slate-800">{type.label}</p>
                      <p className="text-sm text-slate-500 truncate">{type.description}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-4 pl-13 sm:pl-0">
                    {channels.map(channel => (
                      <div key={channel.id} className="flex items-center gap-2">
                        <Switch
                          id={`${type.id}_${channel.id}`}
                          checked={isEnabled(type.id, channel.id)}
                          onCheckedChange={() => handleToggle(type.id, channel.id)}
                          disabled={isUpdating}
                        />
                        <Label htmlFor={`${type.id}_${channel.id}`} className="text-xs text-slate-500 cursor-pointer">
                          {channel.label}
                        </Label>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}