import { useQuery } from "@tanstack/react-query";
import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { MessageCircle, AlertCircle, CheckCircle, WifiOff, Settings } from "lucide-react";

interface WhatsAppStatusResponse {
  success: boolean;
  data: {
    isConnected: boolean;
  };
}

interface WhatsAppConnectionStatus {
  success: boolean;
  data: {
    status: string;
    connectedPhone?: string;
    lastActivity?: string;
  };
}

interface WhatsAppStatusProps {
  variant?: "card" | "inline" | "minimal";
  showActions?: boolean;
  className?: string;
}

export function WhatsAppStatus({ 
  variant = "inline", 
  showActions = true, 
  className = "" 
}: WhatsAppStatusProps) {
  // Check if WhatsApp is connected
  const { data: connectionData, isLoading } = useQuery<WhatsAppConnectionStatus>({
    queryKey: ["/api/whatsapp/status"],
    refetchInterval: 30000, // Check every 30 seconds
  });

  const isConnected = connectionData?.data?.status === "CONNECTED";
  const connectedPhone = connectionData?.data?.connectedPhone;

  if (isLoading) {
    return (
      <div className={`flex items-center gap-2 ${className}`}>
        <div className="h-4 w-4 animate-spin rounded-full border-2 border-gray-300 border-t-blue-600"></div>
        <span className="text-sm text-gray-500">Verificando WhatsApp...</span>
      </div>
    );
  }

  if (variant === "card") {
    return (
      <Card className={className} data-testid="card-whatsapp-status">
        <CardHeader className="pb-3">
          <CardTitle className="text-lg flex items-center gap-2">
            <MessageCircle className="h-5 w-5" />
            Status WhatsApp
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              {isConnected ? (
                <>
                  <CheckCircle className="h-4 w-4 text-green-500" />
                  <Badge variant="default" className="bg-green-500">
                    Conectado
                  </Badge>
                  {connectedPhone && (
                    <span className="text-sm text-gray-600">
                      {connectedPhone}
                    </span>
                  )}
                </>
              ) : (
                <>
                  <WifiOff className="h-4 w-4 text-red-500" />
                  <Badge variant="destructive">
                    Desconectado
                  </Badge>
                </>
              )}
            </div>
            {showActions && !isConnected && (
              <Button asChild size="sm" data-testid="button-connect-whatsapp">
                <Link href="/whatsapp/connect">
                  <Settings className="h-4 w-4 mr-2" />
                  Conectar
                </Link>
              </Button>
            )}
          </div>
        </CardContent>
      </Card>
    );
  }

  if (variant === "minimal") {
    return (
      <div className={`flex items-center gap-2 ${className}`}>
        {isConnected ? (
          <>
            <CheckCircle className="h-4 w-4 text-green-500" />
            <Badge variant="default" className="bg-green-500" data-testid="badge-connected">
              WhatsApp Conectado
            </Badge>
          </>
        ) : (
          <>
            <WifiOff className="h-4 w-4 text-red-500" />
            <Badge variant="destructive" data-testid="badge-disconnected">
              WhatsApp Desconectado
            </Badge>
          </>
        )}
      </div>
    );
  }

  // Default inline variant
  if (!isConnected) {
    return (
      <Alert variant="destructive" className={className} data-testid="alert-whatsapp-disconnected">
        <AlertCircle className="h-4 w-4" />
        <AlertTitle>WhatsApp não conectado</AlertTitle>
        <AlertDescription className="flex items-center justify-between">
          <span>
            Conecte sua conta WhatsApp Business para enviar campanhas por WhatsApp.
          </span>
          {showActions && (
            <Button asChild variant="outline" size="sm" className="ml-4" data-testid="button-connect-whatsapp-inline">
              <Link href="/whatsapp/connect">
                Conectar WhatsApp
              </Link>
            </Button>
          )}
        </AlertDescription>
      </Alert>
    );
  }

  return (
    <Alert className={`border-green-200 bg-green-50 ${className}`} data-testid="alert-whatsapp-connected">
      <CheckCircle className="h-4 w-4 text-green-600" />
      <AlertTitle className="text-green-800">WhatsApp conectado</AlertTitle>
      <AlertDescription className="text-green-700">
        {connectedPhone ? `Conectado como ${connectedPhone}` : "Pronto para enviar campanhas"}
      </AlertDescription>
    </Alert>
  );
}

// Hook for checking WhatsApp connection status
export function useWhatsAppStatus() {
  const { data: connectionData, isLoading } = useQuery<WhatsAppConnectionStatus>({
    queryKey: ["/api/whatsapp/status"],
    refetchInterval: 30000,
  });

  return {
    isConnected: connectionData?.data?.status === "CONNECTED",
    connectedPhone: connectionData?.data?.connectedPhone,
    status: connectionData?.data?.status,
    isLoading,
  };
}