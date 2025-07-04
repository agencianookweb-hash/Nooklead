import { useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/hooks/useAuth";
import { isUnauthorizedError } from "@/lib/authUtils";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import Header from "@/components/layout/header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Textarea } from "@/components/ui/textarea";
import { 
  Check, 
  X, 
  MessageCircle, 
  FileText, 
  Building2,
  Calendar,
  DollarSign,
  User,
  Clock
} from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import type { Sale } from "@/types";

// Mock pending sales data for demonstration
const mockPendingSales: Sale[] = [
  {
    id: "1",
    value: 45000,
    closingDate: "2024-01-15",
    status: "PENDENTE_APROVACAO",
    proofUrl: "contrato_techsolution.pdf",
    proofType: "application/pdf",
    productService: "Sistema de CRM Personalizado + Treinamento",
    description: "Cliente fechou após demonstração do produto. Contrato assinado via DocuSign. Primeira parcela já recebida.",
    points: 0,
    leadId: "lead-1",
    userId: "user-1",
    createdAt: "2024-01-15T10:00:00Z",
    updatedAt: "2024-01-15T10:00:00Z",
    lead: {
      id: "lead-1",
      status: "FECHADO_GANHO",
      source: "BUSCA_CNPJ",
      priority: "ALTA",
      companyId: "company-1",
      userId: "user-1",
      createdAt: "2024-01-10T09:00:00Z",
      updatedAt: "2024-01-15T10:00:00Z",
      company: {
        id: "company-1",
        cnpj: "12.345.678/0001-90",
        razaoSocial: "TechSolution Sistemas Ltda.",
        nomeFantasia: "TechSolution",
        setor: "Tecnologia",
        size: "EPP"
      }
    }
  },
  {
    id: "2", 
    value: 28500,
    closingDate: "2024-01-14",
    status: "PENDENTE_APROVACAO",
    proofUrl: "proposta_aprovada.jpg",
    proofType: "image/jpeg",
    productService: "Consultoria em Automação de Processos",
    description: "Proposta aceita via email. Cliente solicitou início imediato do projeto.",
    points: 0,
    leadId: "lead-2",
    userId: "user-2", 
    createdAt: "2024-01-14T14:30:00Z",
    updatedAt: "2024-01-14T14:30:00Z",
    lead: {
      id: "lead-2",
      status: "FECHADO_GANHO",
      source: "BUSCA_CNPJ", 
      priority: "MEDIA",
      companyId: "company-2",
      userId: "user-2",
      createdAt: "2024-01-12T08:00:00Z",
      updatedAt: "2024-01-14T14:30:00Z",
      company: {
        id: "company-2",
        cnpj: "98.765.432/0001-12",
        razaoSocial: "ABC Sistemas e Soluções",
        nomeFantasia: "ABC Sistemas",
        setor: "Consultoria", 
        size: "ME"
      }
    }
  },
  {
    id: "3",
    value: 67000,
    closingDate: "2024-01-13", 
    status: "PENDENTE_APROVACAO",
    proofUrl: "contrato_assinado.pdf",
    proofType: "application/pdf",
    productService: "Plataforma E-commerce Completa",
    description: "Projeto de migração completa para nova plataforma. Contrato de 12 meses com suporte incluso.",
    points: 0,
    leadId: "lead-3",
    userId: "user-1",
    createdAt: "2024-01-13T16:15:00Z", 
    updatedAt: "2024-01-13T16:15:00Z",
    lead: {
      id: "lead-3",
      status: "FECHADO_GANHO",
      source: "BUSCA_CNPJ",
      priority: "URGENTE", 
      companyId: "company-3",
      userId: "user-1",
      createdAt: "2024-01-08T10:00:00Z",
      updatedAt: "2024-01-13T16:15:00Z",
      company: {
        id: "company-3",
        cnpj: "56.789.123/0001-45",
        razaoSocial: "Digital Commerce Brasil S.A.",
        nomeFantasia: "Digital Commerce",
        setor: "E-commerce",
        size: "GRANDE"
      }
    }
  }
];

// Mock user data for sales creators
const mockUsers: Record<string, any> = {
  "user-1": { firstName: "João", lastName: "Silva", profileImageUrl: null },
  "user-2": { firstName: "Carlos", lastName: "Ferreira", profileImageUrl: null }
};

export default function Approvals() {
  const { user, isAuthenticated, isLoading } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Redirect to home if not authenticated or not a manager
  useEffect(() => {
    if (!isLoading && (!isAuthenticated || user?.role === "VENDEDOR")) {
      toast({
        title: "Unauthorized", 
        description: "You are logged out. Logging in again...",
        variant: "destructive",
      });
      setTimeout(() => {
        window.location.href = "/api/login";
      }, 500);
      return;
    }
  }, [isAuthenticated, isLoading, user?.role, toast]);

  const { data: pendingSales = [], isLoading: salesLoading } = useQuery<Sale[]>({
    queryKey: ["/api/sales/pending"],
    enabled: user?.role === "GESTOR" || user?.role === "ADMIN",
    retry: false,
    refetchOnWindowFocus: false,
  });

  const approveMutation = useMutation({
    mutationFn: async (saleId: string) => {
      return await apiRequest("PUT", `/api/sales/${saleId}/approve`, {});
    },
    onSuccess: () => {
      toast({
        title: "Sucesso",
        description: "Venda aprovada com sucesso!",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/sales/pending"] });
      queryClient.invalidateQueries({ queryKey: ["/api/sales"] });
    },
    onError: () => {
      toast({
        title: "Erro", 
        description: "Falha ao aprovar venda.",
        variant: "destructive",
      });
    },
  });

  const rejectMutation = useMutation({
    mutationFn: async ({ saleId, reason }: { saleId: string; reason: string }) => {
      return await apiRequest("PUT", `/api/sales/${saleId}/reject`, { reason });
    },
    onSuccess: () => {
      toast({
        title: "Sucesso",
        description: "Venda rejeitada.",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/sales/pending"] });
      queryClient.invalidateQueries({ queryKey: ["/api/sales"] });
    },
    onError: () => {
      toast({
        title: "Erro",
        description: "Falha ao rejeitar venda.",
        variant: "destructive", 
      });
    },
  });

  const getInitials = (firstName?: string, lastName?: string) => {
    if (!firstName && !lastName) return "U";
    return `${firstName?.[0] || ""}${lastName?.[0] || ""}`.toUpperCase();
  };

  const getSaleUser = (userId: string) => {
    return mockUsers[userId] || { firstName: "Usuário", lastName: "Desconhecido" };
  };

  const getFileIcon = (proofType?: string) => {
    if (proofType?.includes("pdf")) return "📄";
    if (proofType?.includes("image")) return "🖼️";
    return "📁";
  };

  const getTimeAgo = (dateString: string) => {
    const now = new Date();
    const date = new Date(dateString);
    const diffInHours = Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60));
    
    if (diffInHours < 1) return "há poucos minutos";
    if (diffInHours < 24) return `há ${diffInHours} hora${diffInHours > 1 ? 's' : ''}`;
    const diffInDays = Math.floor(diffInHours / 24);
    return `há ${diffInDays} dia${diffInDays > 1 ? 's' : ''}`;
  };

  // Use mock data if no real data is available
  const displaySales = pendingSales.length > 0 ? pendingSales : mockPendingSales;

  if (isLoading || salesLoading) {
    return (
      <div className="space-y-6">
        <Header title="Aprovações de Vendas" />
        <Card className="animate-pulse">
          <CardContent className="p-6">
            <div className="space-y-6">
              {[1, 2, 3].map((i) => (
                <div key={i} className="border border-gray-200 rounded-lg p-6">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center space-x-4 mb-4">
                        <div className="w-12 h-12 bg-gray-200 rounded-full"></div>
                        <div>
                          <div className="h-4 bg-gray-200 rounded w-32 mb-2"></div>
                          <div className="h-3 bg-gray-200 rounded w-48"></div>
                        </div>
                      </div>
                      <div className="h-20 bg-gray-200 rounded"></div>
                    </div>
                    <div className="ml-6 space-y-2">
                      <div className="h-10 bg-gray-200 rounded w-24"></div>
                      <div className="h-10 bg-gray-200 rounded w-24"></div>
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

  return (
    <div className="space-y-6">
      <Header title="Aprovações de Vendas" />
      
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>Vendas Pendentes de Aprovação</CardTitle>
            <Badge variant="destructive" className="px-3 py-1">
              {displaySales.length} pendentes
            </Badge>
          </div>
        </CardHeader>
        <CardContent>
          {displaySales.length === 0 ? (
            <div className="text-center py-12">
              <CheckCircle className="h-12 w-12 text-green-500 mx-auto mb-4" />
              <p className="text-gray-500 text-lg">Nenhuma venda pendente de aprovação</p>
              <p className="text-gray-400 text-sm">Todas as vendas foram processadas</p>
            </div>
          ) : (
            <div className="space-y-6">
              {displaySales.map((sale) => {
                const saleUser = getSaleUser(sale.userId);
                return (
                  <div key={sale.id} className="border border-gray-200 rounded-lg p-6 hover:bg-gray-50 transition-colors">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        {/* User Info */}
                        <div className="flex items-center space-x-4 mb-4">
                          <Avatar className="w-12 h-12">
                            <AvatarImage src={saleUser.profileImageUrl} />
                            <AvatarFallback className="bg-blue-600 text-white font-bold">
                              {getInitials(saleUser.firstName, saleUser.lastName)}
                            </AvatarFallback>
                          </Avatar>
                          <div>
                            <p className="font-medium text-gray-900">
                              {saleUser.firstName} {saleUser.lastName}
                            </p>
                            <p className="text-sm text-gray-600 flex items-center">
                              <User className="h-3 w-3 mr-1" />
                              Vendedor • Enviado {getTimeAgo(sale.createdAt)}
                            </p>
                          </div>
                        </div>
                        
                        {/* Sale Details */}
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                          <div>
                            <div className="flex items-center text-sm font-medium text-gray-700 mb-1">
                              <Building2 className="h-4 w-4 mr-1" />
                              Empresa
                            </div>
                            <p className="text-gray-900 font-medium">
                              {sale.lead?.company?.nomeFantasia || sale.lead?.company?.razaoSocial}
                            </p>
                            <p className="text-sm text-gray-600">
                              CNPJ: {sale.lead?.company?.cnpj}
                            </p>
                            <div className="flex items-center space-x-2 mt-1">
                              <Badge variant="outline" className="text-xs">
                                {sale.lead?.company?.setor}
                              </Badge>
                              <Badge variant="outline" className="text-xs">
                                {sale.lead?.company?.size}
                              </Badge>
                            </div>
                          </div>
                          <div>
                            <div className="flex items-center text-sm font-medium text-gray-700 mb-1">
                              <DollarSign className="h-4 w-4 mr-1" />
                              Valor da Venda
                            </div>
                            <p className="text-2xl font-bold text-green-600">
                              {sale.value.toLocaleString("pt-BR", {
                                style: "currency",
                                currency: "BRL",
                              })}
                            </p>
                            <div className="flex items-center text-sm text-gray-600 mt-1">
                              <Calendar className="h-3 w-3 mr-1" />
                              Data: {format(new Date(sale.closingDate), "dd/MM/yyyy", { locale: ptBR })}
                            </div>
                          </div>
                        </div>
                        
                        {/* Product/Service */}
                        <div className="mb-4">
                          <p className="text-sm font-medium text-gray-700 mb-1">Produto/Serviço</p>
                          <p className="text-gray-900 font-medium">{sale.productService}</p>
                        </div>
                        
                        {/* Proof */}
                        {sale.proofUrl && (
                          <div className="mb-4">
                            <p className="text-sm font-medium text-gray-700 mb-2">Comprovante</p>
                            <div className="flex items-center space-x-2 p-3 bg-gray-50 rounded-lg">
                              <span className="text-2xl">{getFileIcon(sale.proofType)}</span>
                              <div className="flex-1">
                                <p className="text-sm font-medium text-blue-600 hover:text-blue-800 cursor-pointer">
                                  {sale.proofUrl}
                                </p>
                                <p className="text-xs text-gray-500">
                                  {sale.proofType?.includes("pdf") ? "Documento PDF" : "Imagem"}
                                </p>
                              </div>
                            </div>
                          </div>
                        )}
                        
                        {/* Description */}
                        {sale.description && (
                          <div>
                            <p className="text-sm font-medium text-gray-700 mb-1">Observações</p>
                            <p className="text-gray-900 text-sm bg-gray-50 p-3 rounded-lg">
                              {sale.description}
                            </p>
                          </div>
                        )}
                      </div>
                      
                      {/* Action Buttons */}
                      <div className="ml-6 flex flex-col space-y-2">
                        <Button
                          onClick={() => approveMutation.mutate(sale.id)}
                          disabled={approveMutation.isPending || rejectMutation.isPending}
                          className="bg-green-600 hover:bg-green-700"
                        >
                          <Check className="mr-2 h-4 w-4" />
                          {approveMutation.isPending ? "Aprovando..." : "Aprovar"}
                        </Button>
                        <Button
                          onClick={() => {
                            const reason = prompt("Motivo da rejeição (opcional):");
                            if (reason !== null) {
                              rejectMutation.mutate({ saleId: sale.id, reason });
                            }
                          }}
                          disabled={approveMutation.isPending || rejectMutation.isPending}
                          variant="destructive"
                        >
                          <X className="mr-2 h-4 w-4" />
                          {rejectMutation.isPending ? "Rejeitando..." : "Rejeitar"}
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          disabled
                        >
                          <MessageCircle className="mr-2 h-4 w-4" />
                          Comentar
                        </Button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
