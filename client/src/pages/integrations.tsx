import { useQuery } from "@tanstack/react-query";
import { Link } from "wouter";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { 
  MessageCircle, 
  Mail, 
  CheckCircle, 
  AlertCircle, 
  XCircle,
  Settings,
  Zap,
  WifiOff
} from "lucide-react";

interface WhatsAppStatus {
  status: string;
  sessionId?: string;
  connectedPhone?: string;
  qrCode?: string;
  lastActivity?: string;
  errorMessage?: string;
}

interface WhatsAppResponse {
  success: boolean;
  data: WhatsAppStatus;
  message?: string;
  error?: string;
}

// Dados mock para configurações de email (em produção viria de uma API)
const emailConfigurations = [
  { id: "1", name: "Gmail Principal", provider: "gmail", status: "connected", isActive: true },
  { id: "2", name: "SendGrid Marketing", provider: "sendgrid", status: "disconnected", isActive: false },
  { id: "3", name: "Outlook Suporte", provider: "outlook", status: "error", isActive: true }
];

export default function Integrations() {
  // Query for WhatsApp status
  const { data: whatsappData, isLoading: whatsappLoading } = useQuery<WhatsAppResponse>({
    queryKey: ["/api/whatsapp/status"],
    refetchInterval: 30000, // Poll every 30 seconds
  });

  const whatsappStatus = whatsappData?.data;

  // Get WhatsApp status info
  const getWhatsAppStatusInfo = (status?: string) => {
    switch (status) {
      case "CONNECTED":
        return {
          label: "Conectado",
          description: `WhatsApp conectado${whatsappStatus?.connectedPhone ? ` como ${whatsappStatus.connectedPhone}` : ""}`,
          color: "bg-green-100 text-green-800",
          icon: CheckCircle,
          iconColor: "text-green-600"
        };
      case "WAITING_QR":
        return {
          label: "Aguardando QR",
          description: "Aguardando escaneamento do QR Code",
          color: "bg-blue-100 text-blue-800",
          icon: Settings,
          iconColor: "text-blue-600"
        };
      case "GENERATING_QR":
        return {
          label: "Gerando QR",
          description: "Preparando QR Code para conexão",
          color: "bg-yellow-100 text-yellow-800",
          icon: Settings,
          iconColor: "text-yellow-600"
        };
      case "ERROR":
        return {
          label: "Erro",
          description: "Erro na conexão WhatsApp",
          color: "bg-red-100 text-red-800",
          icon: AlertCircle,
          iconColor: "text-red-600"
        };
      case "DISCONNECTED":
      default:
        return {
          label: "Desconectado",
          description: "WhatsApp não conectado",
          color: "bg-gray-100 text-gray-800",
          icon: WifiOff,
          iconColor: "text-gray-600"
        };
    }
  };

  // Get Email status info
  const getEmailStatusInfo = () => {
    const activeConfigs = emailConfigurations.filter(config => config.isActive);
    const connectedConfigs = emailConfigurations.filter(config => config.status === "connected");
    const errorConfigs = emailConfigurations.filter(config => config.status === "error");

    if (errorConfigs.length > 0) {
      return {
        label: "Com Erros",
        description: `${connectedConfigs.length} conectadas, ${errorConfigs.length} com erro`,
        color: "bg-yellow-100 text-yellow-800",
        icon: AlertCircle,
        iconColor: "text-yellow-600"
      };
    } else if (connectedConfigs.length > 0) {
      return {
        label: "Conectado",
        description: `${connectedConfigs.length} configuração${connectedConfigs.length > 1 ? 'ões' : ''} ativa${connectedConfigs.length > 1 ? 's' : ''}`,
        color: "bg-green-100 text-green-800",
        icon: CheckCircle,
        iconColor: "text-green-600"
      };
    } else {
      return {
        label: "Desconectado", 
        description: `${emailConfigurations.length} configuração${emailConfigurations.length > 1 ? 'ões' : ''} disponível${emailConfigurations.length > 1 ? 'is' : ''}`,
        color: "bg-gray-100 text-gray-800",
        icon: XCircle,
        iconColor: "text-gray-600"
      };
    }
  };

  const whatsappStatusInfo = getWhatsAppStatusInfo(whatsappStatus?.status);
  const emailStatusInfo = getEmailStatusInfo();

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold" data-testid="heading-integrations">Integrações</h1>
          <p className="text-muted-foreground">
            Gerencie suas integrações de comunicação em um só lugar
          </p>
        </div>
      </div>

      {/* Integration Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* WhatsApp Card */}
        <Card className="hover:shadow-md transition-shadow" data-testid="card-whatsapp-integration">
          <CardHeader className="pb-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <div className="p-2 bg-green-100 rounded-lg">
                  <MessageCircle className="h-6 w-6 text-green-600" />
                </div>
                <div>
                  <CardTitle className="text-xl">WhatsApp Business</CardTitle>
                  <CardDescription>
                    Envio de mensagens via WhatsApp
                  </CardDescription>
                </div>
              </div>
              <div className="flex items-center space-x-2">
                <whatsappStatusInfo.icon className={`h-5 w-5 ${whatsappStatusInfo.iconColor}`} />
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Status */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium text-gray-600">Status:</span>
                {whatsappLoading ? (
                  <Skeleton className="h-5 w-20" />
                ) : (
                  <Badge className={whatsappStatusInfo.color} data-testid="badge-whatsapp-status">
                    {whatsappStatusInfo.label}
                  </Badge>
                )}
              </div>
              <p className="text-sm text-muted-foreground" data-testid="text-whatsapp-description">
                {whatsappLoading ? "Carregando..." : whatsappStatusInfo.description}
              </p>
            </div>

            {/* Action Button */}
            <div className="pt-2">
              <Link href="/whatsapp/connect">
                <Button className="w-full" data-testid="button-configure-whatsapp">
                  <Settings className="h-4 w-4 mr-2" />
                  Configurar WhatsApp
                </Button>
              </Link>
            </div>
          </CardContent>
        </Card>

        {/* Email Card */}
        <Card className="hover:shadow-md transition-shadow" data-testid="card-email-integration">
          <CardHeader className="pb-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <div className="p-2 bg-blue-100 rounded-lg">
                  <Mail className="h-6 w-6 text-blue-600" />
                </div>
                <div>
                  <CardTitle className="text-xl">Email SMTP</CardTitle>
                  <CardDescription>
                    Configurações de servidor de email
                  </CardDescription>
                </div>
              </div>
              <div className="flex items-center space-x-2">
                <emailStatusInfo.icon className={`h-5 w-5 ${emailStatusInfo.iconColor}`} />
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Status */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium text-gray-600">Status:</span>
                <Badge className={emailStatusInfo.color} data-testid="badge-email-status">
                  {emailStatusInfo.label}
                </Badge>
              </div>
              <p className="text-sm text-muted-foreground" data-testid="text-email-description">
                {emailStatusInfo.description}
              </p>
            </div>

            {/* Configurations Summary */}
            <div className="grid grid-cols-3 gap-4 py-2 px-3 bg-gray-50 rounded-lg">
              <div className="text-center">
                <p className="text-sm font-semibold text-gray-900">{emailConfigurations.length}</p>
                <p className="text-xs text-gray-600">Total</p>
              </div>
              <div className="text-center">
                <p className="text-sm font-semibold text-green-600">
                  {emailConfigurations.filter(c => c.status === "connected").length}
                </p>
                <p className="text-xs text-gray-600">Conectadas</p>
              </div>
              <div className="text-center">
                <p className="text-sm font-semibold text-red-600">
                  {emailConfigurations.filter(c => c.status === "error").length}
                </p>
                <p className="text-xs text-gray-600">Com Erro</p>
              </div>
            </div>

            {/* Action Button */}
            <div className="pt-2">
              <Link href="/email/configure">
                <Button className="w-full" data-testid="button-configure-email">
                  <Settings className="h-4 w-4 mr-2" />
                  Configurar Email
                </Button>
              </Link>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Integration Tips */}
      <Card data-testid="card-integration-tips">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Zap className="h-5 w-5 text-yellow-600" />
            Dicas de Integração
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex items-start gap-3">
            <div className="w-6 h-6 rounded-full bg-blue-500 text-white text-xs flex items-center justify-center font-bold">1</div>
            <div>
              <p className="font-medium">WhatsApp Business</p>
              <p className="text-sm text-muted-foreground">
                Mantenha sempre conectado para envios automáticos de campanhas
              </p>
            </div>
          </div>
          <div className="flex items-start gap-3">
            <div className="w-6 h-6 rounded-full bg-blue-500 text-white text-xs flex items-center justify-center font-bold">2</div>
            <div>
              <p className="font-medium">Configurações Email</p>
              <p className="text-sm text-muted-foreground">
                Configure múltiplos servidores SMTP para redundância e maior volume
              </p>
            </div>
          </div>
          <div className="flex items-start gap-3">
            <div className="w-6 h-6 rounded-full bg-blue-500 text-white text-xs flex items-center justify-center font-bold">3</div>
            <div>
              <p className="font-medium">Monitoramento</p>
              <p className="text-sm text-muted-foreground">
                Verifique os status regularmente para garantir o funcionamento das campanhas
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}