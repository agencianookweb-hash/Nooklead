import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Link } from "wouter";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Progress } from "@/components/ui/progress";
import {
  AlertCircle,
  Plus,
  Search,
  Eye,
  Upload,
  Settings,
  MessageSquare,
  Users,
  CheckCircle,
  XCircle,
  Clock,
  Calendar,
  Filter,
  DollarSign,
  Play,
  Pause,
  Square,
  BarChart,
} from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import type { MassCampaign } from "@shared/schema";

// Função para obter informações do status
const getStatusInfo = (status: string) => {
  switch (status) {
    case "DRAFT":
      return {
        label: "Rascunho",
        color: "bg-gray-100 text-gray-800",
        icon: Settings,
        description: "Campanha em configuração"
      };
    case "VALIDATING":
      return {
        label: "Validando",
        color: "bg-yellow-100 text-yellow-800",
        icon: Clock,
        description: "Validando contatos"
      };
    case "SCHEDULED":
      return {
        label: "Agendada",
        color: "bg-blue-100 text-blue-800",
        icon: Calendar,
        description: "Agendada para envio"
      };
    case "RUNNING":
      return {
        label: "Executando",
        color: "bg-green-100 text-green-800",
        icon: Play,
        description: "Enviando mensagens"
      };
    case "PAUSED":
      return {
        label: "Pausada",
        color: "bg-orange-100 text-orange-800",
        icon: Pause,
        description: "Execução pausada"
      };
    case "COMPLETED":
      return {
        label: "Concluída",
        color: "bg-emerald-100 text-emerald-800",
        icon: CheckCircle,
        description: "Campanha finalizada"
      };
    case "STOPPED":
      return {
        label: "Interrompida",
        color: "bg-red-100 text-red-800",
        icon: Square,
        description: "Execução interrompida"
      };
    default:
      return {
        label: status,
        color: "bg-gray-100 text-gray-800",
        icon: AlertCircle,
        description: "Status desconhecido"
      };
  }
};

// Função para obter informações do canal
const getChannelInfo = (channel: string) => {
  switch (channel) {
    case "WHATSAPP":
      return {
        label: "WhatsApp",
        color: "text-green-600",
        icon: MessageSquare
      };
    case "SMS":
      return {
        label: "SMS",
        color: "text-blue-600",
        icon: MessageSquare
      };
    case "EMAIL":
      return {
        label: "Email",
        color: "text-purple-600",
        icon: MessageSquare
      };
    default:
      return {
        label: channel,
        color: "text-gray-600",
        icon: MessageSquare
      };
  }
};

// Função para calcular porcentagem de progresso
const calculateProgress = (campaign: MassCampaign) => {
  const totalRecords = campaign.totalRecords || 0;
  const sentCount = campaign.sentCount || 0;
  if (totalRecords === 0) return 0;
  return Math.round((sentCount / totalRecords) * 100);
};

// Função para calcular taxa de sucesso
const calculateSuccessRate = (campaign: MassCampaign) => {
  const sentCount = campaign.sentCount || 0;
  const successCount = campaign.successCount || 0;
  if (sentCount === 0) return 0;
  return Math.round((successCount / sentCount) * 100);
};

export default function Campaigns() {
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("ALL");

  // Query para buscar campanhas
  const {
    data: campaigns,
    isLoading,
    error,
    refetch
  } = useQuery<MassCampaign[]>({
    queryKey: ['mass-campaigns'],
    queryFn: async () => {
      const response = await fetch('/api/mass-campaigns', {
        credentials: 'include'
      });
      if (!response.ok) {
        throw new Error('Falha ao carregar campanhas');
      }
      return response.json();
    },
    staleTime: 30000, // Cache por 30 segundos
  });

  // Filtrar campanhas baseado na busca e filtro de status
  const filteredCampaigns = campaigns?.filter((campaign) => {
    const campaignName = campaign.name || '';
    const campaignDescription = campaign.description || '';
    const matchesSearch = campaignName.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         campaignDescription.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = statusFilter === "ALL" || campaign.status === statusFilter;
    
    return matchesSearch && matchesStatus;
  }) || [];

  // Estado de carregamento
  if (isLoading) {
    return (
      <div className="container mx-auto py-6 space-y-6">
        <div className="flex items-center justify-center min-h-[400px]">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
          <span className="ml-2">Carregando campanhas...</span>
        </div>
      </div>
    );
  }

  // Estado de erro
  if (error) {
    return (
      <div className="container mx-auto py-6 space-y-6">
        <Alert>
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>Erro ao carregar campanhas</AlertTitle>
          <AlertDescription>
            {error.message || 'Ocorreu um erro inesperado. Tente novamente.'}
          </AlertDescription>
        </Alert>
      </div>
    );
  }

  return (
    <div className="container mx-auto py-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold" data-testid="text-campaigns-title">Campanhas</h1>
          <p className="text-muted-foreground">
            Gerencie suas campanhas de disparo em massa
          </p>
        </div>
        <Link href="/campaigns/configure">
          <Button data-testid="button-create-campaign">
            <Plus className="h-4 w-4 mr-2" />
            Nova Campanha
          </Button>
        </Link>
      </div>

      {/* Filtros */}
      <Card data-testid="card-filters">
        <CardContent className="pt-6">
          <div className="flex gap-4 items-center">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
              <Input
                placeholder="Buscar campanhas..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
                data-testid="input-search-campaigns"
              />
            </div>
            <div className="flex items-center gap-2">
              <Filter className="h-4 w-4 text-gray-500" />
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="w-[180px]" data-testid="select-status-filter">
                  <SelectValue placeholder="Filtrar por status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="ALL">Todos os status</SelectItem>
                  <SelectItem value="DRAFT">Rascunho</SelectItem>
                  <SelectItem value="VALIDATING">Validando</SelectItem>
                  <SelectItem value="SCHEDULED">Agendada</SelectItem>
                  <SelectItem value="RUNNING">Executando</SelectItem>
                  <SelectItem value="PAUSED">Pausada</SelectItem>
                  <SelectItem value="COMPLETED">Concluída</SelectItem>
                  <SelectItem value="STOPPED">Interrompida</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Lista de campanhas */}
      {filteredCampaigns.length === 0 ? (
        <Card>
          <CardContent className="pt-6">
            <div className="text-center py-12">
              <BarChart className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">
                {campaigns?.length === 0 ? 'Nenhuma campanha encontrada' : 'Nenhuma campanha corresponde aos filtros'}
              </h3>
              <p className="text-gray-500 mb-4">
                {campaigns?.length === 0 
                  ? 'Comece criando sua primeira campanha de disparo em massa'
                  : 'Tente ajustar os filtros de busca ou status'
                }
              </p>
              {campaigns?.length === 0 && (
                <Link href="/campaigns/configure">
                  <Button data-testid="button-create-first-campaign">
                    <Plus className="h-4 w-4 mr-2" />
                    Criar Primeira Campanha
                  </Button>
                </Link>
              )}
            </div>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-6">
          {filteredCampaigns.map((campaign) => {
            const statusInfo = getStatusInfo(campaign.status);
            const channelInfo = getChannelInfo(campaign.channel);
            const progress = calculateProgress(campaign);
            const successRate = calculateSuccessRate(campaign);
            const StatusIcon = statusInfo.icon;
            const ChannelIcon = channelInfo.icon;

            return (
              <Card key={campaign.id} className="hover:shadow-md transition-shadow" data-testid={`card-campaign-${campaign.id}`}>
                <CardHeader className="pb-3">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-2">
                        <CardTitle className="text-xl" data-testid={`text-campaign-name-${campaign.id}`}>
                          {campaign.name}
                        </CardTitle>
                        <Badge className={statusInfo.color} data-testid={`badge-status-${campaign.id}`}>
                          <StatusIcon className="h-3 w-3 mr-1" />
                          {statusInfo.label}
                        </Badge>
                        <div className={`flex items-center gap-1 text-sm ${channelInfo.color}`}>
                          <ChannelIcon className="h-4 w-4" />
                          {channelInfo.label}
                        </div>
                      </div>
                      {campaign.description && (
                        <p className="text-muted-foreground text-sm mb-2" data-testid={`text-campaign-description-${campaign.id}`}>
                          {campaign.description}
                        </p>
                      )}
                      <div className="flex items-center gap-4 text-xs text-muted-foreground">
                        <span data-testid={`text-campaign-created-${campaign.id}`}>
                          Criada em {campaign.createdAt ? format(new Date(campaign.createdAt), "dd/MM/yyyy", { locale: ptBR }) : 'Data não disponível'}
                        </span>
                        {campaign.startTime && (
                          <span data-testid={`text-campaign-started-${campaign.id}`}>
                            Iniciada em {format(new Date(campaign.startTime), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}
                          </span>
                        )}
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <Link href={`/campaigns/monitor/${campaign.id}`}>
                        <Button variant="outline" size="sm" data-testid={`button-monitor-${campaign.id}`}>
                          <Eye className="h-4 w-4 mr-1" />
                          Monitorar
                        </Button>
                      </Link>
                      <Link href={`/campaigns/upload/${campaign.id}`}>
                        <Button variant="outline" size="sm" data-testid={`button-upload-${campaign.id}`}>
                          <Upload className="h-4 w-4 mr-1" />
                          Contatos
                        </Button>
                      </Link>
                      <Link href="/campaigns/configure">
                        <Button variant="outline" size="sm" data-testid={`button-configure-${campaign.id}`}>
                          <Settings className="h-4 w-4 mr-1" />
                          Configurar
                        </Button>
                      </Link>
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  {/* Métricas principais */}
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
                    <div className="text-center p-3 bg-blue-50 rounded-lg">
                      <div className="flex items-center justify-center mb-1">
                        <Users className="h-4 w-4 text-blue-600" />
                      </div>
                      <div className="text-lg font-bold text-blue-900" data-testid={`text-total-records-${campaign.id}`}>
                        {(campaign.totalRecords || 0).toLocaleString()}
                      </div>
                      <div className="text-xs text-blue-700">Total de Contatos</div>
                    </div>
                    <div className="text-center p-3 bg-green-50 rounded-lg">
                      <div className="flex items-center justify-center mb-1">
                        <MessageSquare className="h-4 w-4 text-green-600" />
                      </div>
                      <div className="text-lg font-bold text-green-900" data-testid={`text-sent-count-${campaign.id}`}>
                        {(campaign.sentCount || 0).toLocaleString()}
                      </div>
                      <div className="text-xs text-green-700">Enviadas</div>
                    </div>
                    <div className="text-center p-3 bg-emerald-50 rounded-lg">
                      <div className="flex items-center justify-center mb-1">
                        <CheckCircle className="h-4 w-4 text-emerald-600" />
                      </div>
                      <div className="text-lg font-bold text-emerald-900" data-testid={`text-success-count-${campaign.id}`}>
                        {(campaign.successCount || 0).toLocaleString()}
                      </div>
                      <div className="text-xs text-emerald-700">Sucesso</div>
                    </div>
                    <div className="text-center p-3 bg-red-50 rounded-lg">
                      <div className="flex items-center justify-center mb-1">
                        <XCircle className="h-4 w-4 text-red-600" />
                      </div>
                      <div className="text-lg font-bold text-red-900" data-testid={`text-error-count-${campaign.id}`}>
                        {(campaign.errorCount || 0).toLocaleString()}
                      </div>
                      <div className="text-xs text-red-700">Erros</div>
                    </div>
                  </div>

                  {/* Progresso e taxa de sucesso */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                    <div>
                      <div className="flex justify-between text-sm mb-1">
                        <span>Progresso de Envio</span>
                        <span data-testid={`text-progress-${campaign.id}`}>{progress}%</span>
                      </div>
                      <Progress value={progress} className="w-full" data-testid={`progress-campaign-${campaign.id}`} />
                    </div>
                    <div>
                      <div className="flex justify-between text-sm mb-1">
                        <span>Taxa de Sucesso</span>
                        <span data-testid={`text-success-rate-${campaign.id}`}>{successRate}%</span>
                      </div>
                      <Progress value={successRate} className="w-full" data-testid={`progress-success-${campaign.id}`} />
                    </div>
                  </div>

                  {/* Informações adicionais */}
                  <div className="flex justify-between items-center text-sm text-muted-foreground">
                    <div className="flex items-center gap-4">
                      <div className="flex items-center gap-1">
                        <DollarSign className="h-3 w-3" />
                        <span data-testid={`text-total-cost-${campaign.id}`}>
                          R$ {(Number(campaign.validationCost || 0) + Number(campaign.sendingCost || 0)).toFixed(2)}
                        </span>
                      </div>
                      <div className="flex items-center gap-1">
                        <Clock className="h-3 w-3" />
                        <span>Rate: {campaign.sendRate || 0}/h</span>
                      </div>
                    </div>
                    <div className="text-xs">
                      {statusInfo.description}
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {/* Resumo geral */}
      {campaigns && campaigns.length > 0 && (
        <Card data-testid="card-summary">
          <CardHeader>
            <CardTitle>Resumo Geral</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="text-center">
                <div className="text-2xl font-bold text-blue-600" data-testid="text-total-campaigns">
                  {campaigns.length}
                </div>
                <div className="text-sm text-muted-foreground">Total de Campanhas</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-green-600" data-testid="text-active-campaigns">
                  {campaigns.filter(c => ['RUNNING', 'SCHEDULED', 'PAUSED'].includes(c.status)).length}
                </div>
                <div className="text-sm text-muted-foreground">Campanhas Ativas</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-purple-600" data-testid="text-total-contacts">
                  {campaigns.reduce((sum, c) => sum + (c.totalRecords || 0), 0).toLocaleString()}
                </div>
                <div className="text-sm text-muted-foreground">Total de Contatos</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-orange-600" data-testid="text-total-sent">
                  {campaigns.reduce((sum, c) => sum + (c.sentCount || 0), 0).toLocaleString()}
                </div>
                <div className="text-sm text-muted-foreground">Total Enviado</div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}