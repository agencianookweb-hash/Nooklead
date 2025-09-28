import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Loader2, Smartphone, Wifi, WifiOff, QrCode, CheckCircle, AlertCircle, RefreshCw } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { io, Socket } from "socket.io-client";

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

export default function WhatsAppConnect() {
  const [socket, setSocket] = useState<Socket | null>(null);
  const [realTimeStatus, setRealTimeStatus] = useState<WhatsAppStatus | null>(null);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Query for WhatsApp status
  const { data: statusData, isLoading: statusLoading, error: statusError } = useQuery<WhatsAppResponse>({
    queryKey: ["/api/whatsapp/status"],
    refetchInterval: realTimeStatus?.status === "WAITING_QR" ? 5000 : 30000, // Poll more frequently when waiting for QR scan
  });

  // Mutation for generating QR code
  const generateQRMutation = useMutation({
    mutationFn: async () => {
      const response = await apiRequest("POST", "/api/whatsapp/generate-qr");
      return response.json();
    },
    onSuccess: (data: WhatsAppResponse) => {
      if (data.success) {
        toast({
          title: "QR Code gerado",
          description: "Escaneie o QR Code com seu WhatsApp para conectar.",
        });
        queryClient.invalidateQueries({ queryKey: ["/api/whatsapp/status"] });
      }
    },
    onError: (error: any) => {
      toast({
        title: "Erro ao gerar QR Code",
        description: error.message || "Não foi possível gerar o QR Code",
        variant: "destructive",
      });
    }
  });

  // Mutation for disconnecting
  const disconnectMutation = useMutation({
    mutationFn: async () => {
      const response = await apiRequest("POST", "/api/whatsapp/disconnect");
      return response.json();
    },
    onSuccess: (data: WhatsAppResponse) => {
      if (data.success) {
        toast({
          title: "WhatsApp desconectado",
          description: "Sua conta WhatsApp foi desconectada com sucesso.",
        });
        setRealTimeStatus(null);
        queryClient.invalidateQueries({ queryKey: ["/api/whatsapp/status"] });
      }
    },
    onError: (error: any) => {
      toast({
        title: "Erro ao desconectar",
        description: error.message || "Não foi possível desconectar o WhatsApp",
        variant: "destructive",
      });
    }
  });

  // Setup WebSocket connection for real-time updates
  useEffect(() => {
    const newSocket = io({
      path: "/socket.io",
      autoConnect: true,
    });

    // Authenticate with user ID (get from auth context or status data)
    newSocket.on("connect", () => {
      // Get user ID from status data or auth context
      const userId = statusData?.data?.sessionId?.split('-')[0] || 'current-user'; // This should come from auth context
      newSocket.emit("authenticate", { userId });
    });

    // Listen for WhatsApp status updates
    newSocket.on("whatsapp-status", (data: WhatsAppResponse) => {
      if (data.success) {
        setRealTimeStatus(data.data);
        queryClient.invalidateQueries({ queryKey: ["/api/whatsapp/status"] });
        
        // Show success toast when connected
        if (data.data.status === "CONNECTED" && data.data.connectedPhone) {
          toast({
            title: "WhatsApp Conectado!",
            description: `Conectado como ${data.data.connectedPhone}`,
          });
        }
      }
    });

    newSocket.on("disconnect", () => {
      console.log("Disconnected from WhatsApp WebSocket");
    });

    setSocket(newSocket);

    return () => {
      newSocket.close();
    };
  }, [toast, queryClient]);

  // Use real-time status if available, otherwise use polled status
  const currentStatus = realTimeStatus || statusData?.data;

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "CONNECTED":
        return <CheckCircle className="h-5 w-5 text-green-500" />;
      case "WAITING_QR":
      case "GENERATING_QR":
        return <QrCode className="h-5 w-5 text-blue-500" />;
      case "DISCONNECTED":
        return <WifiOff className="h-5 w-5 text-gray-500" />;
      case "ERROR":
        return <AlertCircle className="h-5 w-5 text-red-500" />;
      default:
        return <Wifi className="h-5 w-5 text-gray-400" />;
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "CONNECTED":
        return <Badge variant="default" className="bg-green-500">Conectado</Badge>;
      case "WAITING_QR":
        return <Badge variant="default" className="bg-blue-500">Aguardando QR</Badge>;
      case "GENERATING_QR":
        return <Badge variant="default" className="bg-yellow-500">Gerando QR</Badge>;
      case "DISCONNECTED":
        return <Badge variant="secondary">Desconectado</Badge>;
      case "ERROR":
        return <Badge variant="destructive">Erro</Badge>;
      default:
        return <Badge variant="outline">Desconhecido</Badge>;
    }
  };

  const getStatusDescription = (status: string) => {
    switch (status) {
      case "CONNECTED":
        return "Seu WhatsApp está conectado e pronto para enviar mensagens.";
      case "WAITING_QR":
        return "Escaneie o QR Code abaixo com seu WhatsApp para conectar.";
      case "GENERATING_QR":
        return "Gerando QR Code para conexão...";
      case "DISCONNECTED":
        return "Clique em 'Conectar WhatsApp' para gerar um QR Code e conectar sua conta.";
      case "ERROR":
        return "Ocorreu um erro na conexão. Tente conectar novamente.";
      default:
        return "Carregando status da conexão...";
    }
  };

  if (statusLoading && !currentStatus) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold" data-testid="heading-whatsapp-connect">Conexão WhatsApp</h1>
          <p className="text-muted-foreground">
            Conecte sua conta WhatsApp Business para enviar mensagens nas campanhas
          </p>
        </div>
      </div>

      <Card data-testid="card-whatsapp-status">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            {getStatusIcon(currentStatus?.status || "DISCONNECTED")}
            Status da Conexão
            {getStatusBadge(currentStatus?.status || "DISCONNECTED")}
          </CardTitle>
          <CardDescription>
            {getStatusDescription(currentStatus?.status || "DISCONNECTED")}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Connection Details */}
          {currentStatus?.connectedPhone && (
            <div className="flex items-center gap-2 p-3 bg-green-50 rounded-lg border border-green-200">
              <Smartphone className="h-4 w-4 text-green-600" />
              <span className="text-sm font-medium text-green-800">
                Conectado como: {currentStatus.connectedPhone}
              </span>
            </div>
          )}

          {/* QR Code Display */}
          {currentStatus?.qrCode && currentStatus.status === "WAITING_QR" && (
            <div className="flex flex-col items-center space-y-4">
              <div className="bg-white p-4 rounded-lg border-2 border-dashed border-gray-300">
                <img 
                  src={currentStatus.qrCode} 
                  alt="WhatsApp QR Code" 
                  className="w-64 h-64 object-contain"
                  data-testid="img-qr-code"
                />
              </div>
              <div className="text-center space-y-2">
                <p className="text-sm text-muted-foreground">
                  1. Abra o WhatsApp no seu celular
                </p>
                <p className="text-sm text-muted-foreground">
                  2. Toque em Menu ⋮ ou Configurações e selecione "Dispositivos conectados"
                </p>
                <p className="text-sm text-muted-foreground">
                  3. Toque em "Conectar um dispositivo" e escaneie este código QR
                </p>
              </div>
            </div>
          )}

          {/* Error Message */}
          {currentStatus?.errorMessage && (
            <Alert variant="destructive" data-testid="alert-error">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>
                {currentStatus.errorMessage}
              </AlertDescription>
            </Alert>
          )}

          {/* Action Buttons */}
          <div className="flex gap-2 justify-center">
            {currentStatus?.status === "CONNECTED" ? (
              <Button
                variant="outline"
                onClick={() => disconnectMutation.mutate()}
                disabled={disconnectMutation.isPending}
                data-testid="button-disconnect"
              >
                {disconnectMutation.isPending && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
                Desconectar WhatsApp
              </Button>
            ) : (
              <Button
                onClick={() => generateQRMutation.mutate()}
                disabled={generateQRMutation.isPending || currentStatus?.status === "GENERATING_QR" || currentStatus?.status === "WAITING_QR"}
                data-testid="button-connect"
              >
                {(generateQRMutation.isPending || currentStatus?.status === "GENERATING_QR") && (
                  <Loader2 className="h-4 w-4 animate-spin mr-2" />
                )}
                {currentStatus?.status === "WAITING_QR" ? "Aguardando Conexão..." : "Conectar WhatsApp"}
              </Button>
            )}
            
            {/* Refresh button for manual status update */}
            <Button
              variant="outline"
              size="icon"
              onClick={() => queryClient.invalidateQueries({ queryKey: ["/api/whatsapp/status"] })}
              disabled={statusLoading}
              data-testid="button-refresh"
            >
              <RefreshCw className={`h-4 w-4 ${statusLoading ? 'animate-spin' : ''}`} />
            </Button>
          </div>

          {/* Last Activity */}
          {currentStatus?.lastActivity && (
            <div className="text-center text-xs text-muted-foreground">
              Última atividade: {new Date(currentStatus.lastActivity).toLocaleString()}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Usage Information */}
      <Card data-testid="card-usage-info">
        <CardHeader>
          <CardTitle>Como usar</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex items-start gap-3">
            <div className="w-6 h-6 rounded-full bg-blue-500 text-white text-xs flex items-center justify-center font-bold">1</div>
            <div>
              <p className="font-medium">Conecte seu WhatsApp</p>
              <p className="text-sm text-muted-foreground">Use o QR Code para conectar sua conta WhatsApp Business</p>
            </div>
          </div>
          <div className="flex items-start gap-3">
            <div className="w-6 h-6 rounded-full bg-blue-500 text-white text-xs flex items-center justify-center font-bold">2</div>
            <div>
              <p className="font-medium">Configure suas campanhas</p>
              <p className="text-sm text-muted-foreground">Vá para a seção de campanhas e configure os envios em massa</p>
            </div>
          </div>
          <div className="flex items-start gap-3">
            <div className="w-6 h-6 rounded-full bg-blue-500 text-white text-xs flex items-center justify-center font-bold">3</div>
            <div>
              <p className="font-medium">Envie mensagens</p>
              <p className="text-sm text-muted-foreground">Com o WhatsApp conectado, suas campanhas poderão enviar mensagens automaticamente</p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}