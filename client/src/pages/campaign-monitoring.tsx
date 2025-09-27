import { useState } from "react";
import { useRoute } from "wouter";
import { useQuery, useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  AlertCircle,
  Play,
  Pause,
  Square,
  Download,
  RotateCcw,
  Settings,
  Clock,
  MessageSquare,
  CheckCircle,
  XCircle,
  Eye,
  Search,
  TrendingUp,
  Users,
  DollarSign,
  Timer,
  HelpCircle,
} from "lucide-react";
import {
  LineChart,
  Line,
  PieChart,
  Pie,
  Cell,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts";

// Types
interface CampaignStats {
  id: string;
  name: string;
  status: string;
  channel: string;
  totalRecords: number;
  sentCount: number;
  deliveredCount: number;
  readCount: number;
  errorCount: number;
  currentRate: number;
  startedAt: string;
  estimatedCompletionTime: string;
  totalCost: number;
  validationCost: number;
  sendingCost: number;
  createdAt: string;
  updatedAt: string;
}

interface CampaignLog {
  id: string;
  timestamp: string;
  phone: string;
  razaoSocial: string;
  status: string;
  eventType: string;
  errorMessage: string | null;
}

interface LogsResponse {
  logs: CampaignLog[];
  totalCount: number;
  page: number;
  limit: number;
  totalPages: number;
}

const statusIcons = {
  SENT: { icon: CheckCircle, color: "text-green-600", label: "✅ Enviado" },
  DELIVERED: { icon: MessageSquare, color: "text-blue-600", label: "📋 Entregue" },
  READ: { icon: Eye, color: "text-purple-600", label: "👁 Lido" },
  FAILED: { icon: XCircle, color: "text-red-600", label: "❌ Erro" },
  PENDING: { icon: Clock, color: "text-yellow-600", label: "⏳ Processando" },
};

// Fallback para status não mapeados
const getStatusIcon = (status: string) => {
  return statusIcons[status as keyof typeof statusIcons] || {
    icon: HelpCircle,
    color: "text-gray-500",
    label: "❓ Desconhecido"
  };
};

export default function CampaignMonitoring() {
  const [, params] = useRoute("/campaigns/monitor/:campaignId");
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("ALL");
  const [currentPage, setCurrentPage] = useState(1);
  const [showStopConfirmation, setShowStopConfirmation] = useState(false);
  const itemsPerPage = 10;
  const campaignId = params?.campaignId;

  // Campaign stats query with auto-refresh
  const {
    data: campaignStats,
    isLoading: isLoadingStats,
    error: statsError,
    isRefetching
  } = useQuery<CampaignStats>({
    queryKey: ['mass-campaign-stats', campaignId],
    queryFn: async () => {
      const response = await fetch(`/api/mass-campaigns/${campaignId}/stats`, {
        credentials: 'include'
      });
      if (!response.ok) {
        throw new Error('Failed to fetch campaign stats');
      }
      return response.json();
    },
    enabled: !!campaignId,
    refetchInterval: 5000, // Auto-refresh every 5 seconds
    staleTime: 0 // Always refetch to get fresh data
  });

  // Campaign logs query
  const {
    data: logsData,
    isLoading: isLoadingLogs,
    error: logsError
  } = useQuery<LogsResponse>({
    queryKey: ['mass-campaign-logs', campaignId, statusFilter, searchTerm, currentPage],
    queryFn: async () => {
      const params = new URLSearchParams({
        page: currentPage.toString(),
        limit: itemsPerPage.toString(),
        ...(statusFilter !== 'ALL' && { status: statusFilter }),
        ...(searchTerm && { search: searchTerm })
      });
      
      const response = await fetch(`/api/mass-campaigns/${campaignId}/logs?${params}`, {
        credentials: 'include'
      });
      if (!response.ok) {
        throw new Error('Failed to fetch campaign logs');
      }
      return response.json();
    },
    enabled: !!campaignId,
    staleTime: 30000 // Cache for 30 seconds
  });

  // Control mutations
  const pauseMutation = useMutation({
    mutationFn: async () => {
      const response = await apiRequest('POST', `/api/mass-campaigns/${campaignId}/pause`);
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['mass-campaign-stats', campaignId] });
    },
  });

  const resumeMutation = useMutation({
    mutationFn: async () => {
      const response = await apiRequest('POST', `/api/mass-campaigns/${campaignId}/resume`);
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['mass-campaign-stats', campaignId] });
    },
  });

  const stopMutation = useMutation({
    mutationFn: async () => {
      const response = await apiRequest('POST', `/api/mass-campaigns/${campaignId}/stop`);
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['mass-campaign-stats', campaignId] });
    },
  });

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "RUNNING":
        return <Badge className="bg-green-100 text-green-800" data-testid="badge-status-running">🔄 Executando</Badge>;
      case "PAUSED":
        return <Badge className="bg-yellow-100 text-yellow-800" data-testid="badge-status-paused">⏸ Pausada</Badge>;
      case "STOPPED":
        return <Badge className="bg-red-100 text-red-800" data-testid="badge-status-stopped">⏹ Parada</Badge>;
      case "COMPLETED":
        return <Badge className="bg-blue-100 text-blue-800" data-testid="badge-status-completed">✅ Concluída</Badge>;
      default:
        return <Badge variant="secondary" data-testid="badge-status-default">{status}</Badge>;
    }
  };

  const calculateProgress = () => {
    if (!campaignStats || campaignStats.totalRecords === 0) return 0;
    return Math.round((campaignStats.sentCount / campaignStats.totalRecords) * 100);
  };

  const calculateETA = () => {
    if (!campaignStats || campaignStats.currentRate === 0) return 'N/A';
    const remaining = campaignStats.totalRecords - campaignStats.sentCount;
    const hoursRemaining = remaining / campaignStats.currentRate;
    return `${hoursRemaining.toFixed(1)}h restante`;
  };

  const handleControlAction = (action: string) => {
    switch (action) {
      case 'pause':
        pauseMutation.mutate();
        break;
      case 'resume':
        resumeMutation.mutate();
        break;
      case 'stop':
        stopMutation.mutate();
        setShowStopConfirmation(false);
        break;
      default:
        console.log('Unknown action:', action);
    }
  };

  // Generate status distribution data from real stats
  const getStatusDistribution = () => {
    if (!campaignStats) return [];
    return [
      { name: "Enviado", value: campaignStats.sentCount, color: "#22c55e" },
      { name: "Entregue", value: campaignStats.deliveredCount, color: "#3b82f6" },
      { name: "Lido", value: campaignStats.readCount, color: "#8b5cf6" },
      { name: "Erro", value: campaignStats.errorCount, color: "#ef4444" },
    ];
  };

  // Show loading state
  if (isLoadingStats) {
    return (
      <div className="container mx-auto py-6 space-y-6">
        <div className="flex items-center justify-center min-h-[400px]">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
          <span className="ml-2">Carregando dados da campanha...</span>
        </div>
      </div>
    );
  }

  // Show error state
  if (statsError || !campaignStats) {
    return (
      <div className="container mx-auto py-6 space-y-6">
        <Alert>
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>Erro ao carregar campanha</AlertTitle>
          <AlertDescription>
            {statsError?.message || 'Campanha não encontrada'}
          </AlertDescription>
        </Alert>
      </div>
    );
  }

  const handleExportLogs = () => {
    console.log("Exporting logs...");
    // Here would be the CSV export logic
  };

  const handleReprocessErrors = () => {
    console.log("Reprocessing errors...");
    // Here would be the reprocess errors logic
  };

  return (
    <div className="container mx-auto py-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold" data-testid="text-campaign-name">
            {campaignStats.name}
          </h1>
          <div className="flex items-center gap-3 mt-2">
            {getStatusBadge(campaignStats.status)}
            <span className="text-muted-foreground" data-testid="text-campaign-id">
              ID: {campaignStats.id}
            </span>
            <span className="text-muted-foreground" data-testid="text-campaign-channel">
              Canal: {campaignStats.channel}
            </span>
          </div>
        </div>
        {isRefetching && (
          <div className="flex items-center gap-2 text-muted-foreground">
            <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-primary"></div>
            <span>Atualizando...</span>
          </div>
        )}
      </div>

      {/* Metrics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card data-testid="card-total-records">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total de Registros</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold" data-testid="text-total-records">
              {campaignStats.totalRecords.toLocaleString()}
            </div>
            <p className="text-xs text-muted-foreground">
              Contatos na campanha
            </p>
          </CardContent>
        </Card>

        <Card data-testid="card-sent-messages">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Mensagens Enviadas</CardTitle>
            <MessageSquare className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600" data-testid="text-sent-messages">
              {campaignStats.sentCount.toLocaleString()}
            </div>
            <p className="text-xs text-muted-foreground" data-testid="text-sent-percentage">
              {Math.round((campaignStats.sentCount / campaignStats.totalRecords) * 100)}% do total
            </p>
          </CardContent>
        </Card>

        <Card data-testid="card-delivered-messages">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Mensagens Entregues</CardTitle>
            <CheckCircle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-600" data-testid="text-delivered-messages">
              {campaignStats.deliveredCount.toLocaleString()}
            </div>
            <p className="text-xs text-muted-foreground" data-testid="text-delivered-percentage">
              {campaignStats.sentCount > 0 ? Math.round((campaignStats.deliveredCount / campaignStats.sentCount) * 100) : 0}% dos enviados
            </p>
          </CardContent>
        </Card>

        <Card data-testid="card-read-messages">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Mensagens Lidas</CardTitle>
            <Eye className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-purple-600" data-testid="text-read-messages">
              {campaignStats.readCount.toLocaleString()}
            </div>
            <p className="text-xs text-muted-foreground" data-testid="text-read-percentage">
              {campaignStats.deliveredCount > 0 ? Math.round((campaignStats.readCount / campaignStats.deliveredCount) * 100) : 0}% dos entregues
            </p>
          </CardContent>
        </Card>

        <Card data-testid="card-error-messages">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Erros/Falhas</CardTitle>
            <XCircle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600" data-testid="text-error-messages">
              {campaignStats.errorCount.toLocaleString()}
            </div>
            <p className="text-xs text-muted-foreground" data-testid="text-error-percentage">
              {Math.round((campaignStats.errorCount / campaignStats.totalRecords) * 100)}% do total
            </p>
          </CardContent>
        </Card>

        <Card data-testid="card-send-rate">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Taxa de Envio</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold" data-testid="text-send-rate">
              {campaignStats.currentRate}
            </div>
            <p className="text-xs text-muted-foreground">
              msgs/hora
            </p>
          </CardContent>
        </Card>

        <Card data-testid="card-eta">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Tempo Estimado</CardTitle>
            <Timer className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold" data-testid="text-eta">
              {calculateETA()}
            </div>
            <p className="text-xs text-muted-foreground">
              Para conclusão
            </p>
          </CardContent>
        </Card>

        <Card data-testid="card-cost">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Custo Total</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold" data-testid="text-total-cost">
              R$ {campaignStats.totalCost.toFixed(2)}
            </div>
            <p className="text-xs text-muted-foreground" data-testid="text-cost-breakdown">
              Validação: R$ {campaignStats.validationCost.toFixed(2)}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Progress Bar */}
      <Card data-testid="card-progress">
        <CardHeader>
          <CardTitle>Progresso da Campanha</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            <div className="flex justify-between text-sm">
              <span>Progresso</span>
              <span data-testid="text-progress-percentage">{calculateProgress()}%</span>
            </div>
            <Progress value={calculateProgress()} className="w-full" data-testid="progress-campaign" />
            <div className="flex justify-between text-xs text-muted-foreground">
              <span>{campaignStats.sentCount} enviadas</span>
              <span>{campaignStats.totalRecords - campaignStats.sentCount} restantes</span>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Charts Section */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Hourly Sends Chart */}
        <Card data-testid="card-hourly-chart">
          <CardHeader>
            <CardTitle>Envios por Hora</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-center h-[300px] text-muted-foreground">
              <div className="text-center">
                <Clock className="h-8 w-8 mx-auto mb-2" />
                <p>Gráfico horário não disponível</p>
                <p className="text-xs">Implementação futura com dados históricos</p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Status Distribution Chart */}
        <Card data-testid="card-status-chart">
          <CardHeader>
            <CardTitle>Distribuição de Status</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie
                  data={getStatusDistribution()}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                  outerRadius={80}
                  fill="#8884d8"
                  dataKey="value"
                >
                  {getStatusDistribution().map((entry: any, index: number) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      {/* Control Section */}
      <Card data-testid="card-controls">
        <CardHeader>
          <CardTitle>Controles de Execução</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex justify-center gap-4">
            <Button
              data-testid="button-pause"
              variant="outline"
              disabled={campaignStats.status !== "RUNNING" || pauseMutation.isPending}
              onClick={() => handleControlAction("pause")}
            >
              <Pause className="h-4 w-4 mr-2" />
              {pauseMutation.isPending ? 'Pausando...' : 'Pausar'}
            </Button>
            <Button
              data-testid="button-resume"
              variant="outline"
              disabled={campaignStats.status !== "PAUSED" || resumeMutation.isPending}
              onClick={() => handleControlAction("resume")}
            >
              <Play className="h-4 w-4 mr-2" />
              {resumeMutation.isPending ? 'Retomando...' : 'Retomar'}
            </Button>
            <Button
              data-testid="button-stop"
              variant="destructive"
              disabled={campaignStats.status === "STOPPED" || campaignStats.status === "COMPLETED" || stopMutation.isPending}
              onClick={() => setShowStopConfirmation(true)}
            >
              <Square className="h-4 w-4 mr-2" />
              {stopMutation.isPending ? 'Parando...' : 'Parar'}
            </Button>
          </div>

          {showStopConfirmation && (
            <Alert className="mt-4">
              <AlertCircle className="h-4 w-4" />
              <AlertTitle>Confirmação de Parada</AlertTitle>
              <AlertDescription>
                Tem certeza que deseja parar esta campanha? As mensagens não enviadas serão perdidas.
                <div className="flex gap-2 mt-3">
                  <Button
                    data-testid="button-confirm-stop"
                    variant="destructive"
                    size="sm"
                    onClick={() => {
                      handleControlAction("stop");
                      setShowStopConfirmation(false);
                    }}
                  >
                    Sim, Parar
                  </Button>
                  <Button
                    data-testid="button-cancel-stop"
                    variant="outline"
                    size="sm"
                    onClick={() => setShowStopConfirmation(false)}
                  >
                    Cancelar
                  </Button>
                </div>
              </AlertDescription>
            </Alert>
          )}
        </CardContent>
      </Card>

      {/* Logs Section */}
      <Card data-testid="card-logs">
        <CardHeader>
          <div className="flex justify-between items-center">
            <CardTitle>Logs Detalhados</CardTitle>
            <div className="flex gap-2">
              <Button
                data-testid="button-export-logs"
                variant="outline"
                size="sm"
                onClick={handleExportLogs}
              >
                <Download className="h-4 w-4 mr-2" />
                Exportar CSV
              </Button>
              <Button
                data-testid="button-reprocess-errors"
                variant="outline"
                size="sm"
                onClick={handleReprocessErrors}
              >
                <RotateCcw className="h-4 w-4 mr-2" />
                Reprocessar Erros
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {/* Filters */}
          <div className="flex gap-4 mb-4">
            <div className="flex-1">
              <Input
                data-testid="input-search-logs"
                placeholder="Buscar por telefone ou empresa..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-[180px]" data-testid="select-status-filter">
                <SelectValue placeholder="Filtrar por status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="ALL">Todos</SelectItem>
                <SelectItem value="SENT">Enviados</SelectItem>
                <SelectItem value="DELIVERED">Entregues</SelectItem>
                <SelectItem value="READ">Lidos</SelectItem>
                <SelectItem value="FAILED">Erros</SelectItem>
                <SelectItem value="PENDING">Processando</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Logs Table */}
          <Table data-testid="table-logs">
            <TableHeader>
              <TableRow>
                <TableHead>Timestamp</TableHead>
                <TableHead>Telefone</TableHead>
                <TableHead>Empresa</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Mensagem de Erro</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoadingLogs ? (
                <TableRow>
                  <TableCell colSpan={5} className="text-center py-8">
                    <div className="flex items-center justify-center">
                      <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary mr-2"></div>
                      Carregando logs...
                    </div>
                  </TableCell>
                </TableRow>
              ) : logsError ? (
                <TableRow>
                  <TableCell colSpan={5} className="text-center py-8 text-red-600">
                    Erro ao carregar logs: {logsError.message}
                  </TableCell>
                </TableRow>
              ) : !logsData?.logs?.length ? (
                <TableRow>
                  <TableCell colSpan={5} className="text-center py-8 text-muted-foreground">
                    Nenhum log encontrado
                  </TableCell>
                </TableRow>
              ) : (
                logsData.logs.map((log: CampaignLog) => {
                  const StatusIcon = getStatusIcon(log.eventType);
                  return (
                    <TableRow key={log.id} data-testid={`row-log-${log.id}`}>
                      <TableCell data-testid={`cell-timestamp-${log.id}`}>
                        {new Date(log.timestamp).toLocaleTimeString()}
                      </TableCell>
                      <TableCell data-testid={`cell-phone-${log.id}`}>
                        {log.phone}
                      </TableCell>
                      <TableCell data-testid={`cell-company-${log.id}`}>
                        {log.razaoSocial}
                      </TableCell>
                      <TableCell data-testid={`cell-status-${log.id}`}>
                        <div className="flex items-center gap-2">
                          {StatusIcon ? (
                            <>
                              <StatusIcon.icon className={`h-4 w-4 ${StatusIcon.color}`} />
                              <span>{StatusIcon.label}</span>
                            </>
                          ) : (
                            <>
                              <HelpCircle className="h-4 w-4 text-gray-500" />
                              <span>❓ Status desconhecido</span>
                            </>
                          )}
                        </div>
                      </TableCell>
                      <TableCell data-testid={`cell-error-${log.id}`}>
                        {log.errorMessage && (
                          <span className="text-red-600 text-sm">{log.errorMessage}</span>
                        )}
                      </TableCell>
                    </TableRow>
                  );
                })
              )}
            </TableBody>
          </Table>

          {/* Pagination */}
          <div className="flex justify-between items-center mt-4">
            <p className="text-sm text-muted-foreground" data-testid="text-logs-count">
              {logsData ? `Mostrando ${Math.min(logsData.totalCount, itemsPerPage)} de ${logsData.totalCount} registros` : 'Carregando...'}
            </p>
            <div className="flex gap-2">
              <Button
                data-testid="button-prev-page"
                variant="outline"
                size="sm"
                disabled={currentPage === 1 || isLoadingLogs}
                onClick={() => setCurrentPage(currentPage - 1)}
              >
                Anterior
              </Button>
              <Button
                data-testid="button-next-page"
                variant="outline"
                size="sm"
                disabled={!logsData || currentPage >= logsData.totalPages || isLoadingLogs}
                onClick={() => setCurrentPage(currentPage + 1)}
              >
                Próxima
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}