import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Separator } from "@/components/ui/separator";
import { Switch } from "@/components/ui/switch";
import { useToast } from "@/hooks/use-toast";
import { 
  Form, 
  FormControl, 
  FormDescription, 
  FormField, 
  FormItem, 
  FormLabel, 
  FormMessage 
} from "@/components/ui/form";
import {
  AlertCircle,
  Plus,
  Settings,
  Mail,
  CheckCircle,
  XCircle,
  Eye,
  EyeOff,
  Edit,
  Trash2,
  TestTube,
  Globe,
  Zap,
  Server,
  Shield,
  Key
} from "lucide-react";
import { SiGmail, SiSendgrid } from "react-icons/si";

// Schema de validação para o formulário SMTP
const smtpConfigSchema = z.object({
  name: z.string().min(1, "Nome é obrigatório").max(50, "Nome deve ter no máximo 50 caracteres"),
  provider: z.enum(["gmail", "outlook", "sendgrid", "custom"], {
    required_error: "Selecione um provedor"
  }),
  host: z.string().min(1, "Host é obrigatório"),
  port: z.coerce.number().min(1, "Porta é obrigatória").max(65535, "Porta inválida"),
  username: z.string().min(1, "Usuário é obrigatório"),
  password: z.string().min(1, "Senha é obrigatória"),
  senderEmail: z.string().email("E-mail do remetente deve ser válido"),
  senderName: z.string().optional(),
  useSSL: z.boolean().default(true),
  useTLS: z.boolean().default(true),
});

type SMTPConfig = z.infer<typeof smtpConfigSchema>;

// Templates pré-definidos para providers
const providerTemplates = {
  gmail: {
    name: "Gmail",
    host: "smtp.gmail.com",
    port: 587,
    useSSL: true,
    useTLS: true,
    icon: SiGmail,
    color: "text-red-600",
    description: "Configure com App Password do Gmail",
    helpUrl: "https://support.google.com/accounts/answer/185833"
  },
  outlook: {
    name: "Outlook",
    host: "smtp-mail.outlook.com",
    port: 587,
    useSSL: true,
    useTLS: true,
    icon: Mail,
    color: "text-blue-600",
    description: "Use credenciais da conta Microsoft",
    helpUrl: "https://support.microsoft.com/en-us/office/pop-imap-and-smtp-settings-for-outlook-com-d088b986-291d-42b8-9564-9c414e2aa040"
  },
  sendgrid: {
    name: "SendGrid",
    host: "smtp.sendgrid.net",
    port: 587,
    useSSL: true,
    useTLS: true,
    icon: SiSendgrid,
    color: "text-blue-500",
    description: "Use API Key como senha",
    helpUrl: "https://docs.sendgrid.com/for-developers/sending-email/integrating-with-the-smtp-api"
  },
  custom: {
    name: "SMTP Customizado",
    host: "",
    port: 587,
    useSSL: true,
    useTLS: true,
    icon: Server,
    color: "text-gray-600",
    description: "Configure seu próprio servidor SMTP",
    helpUrl: null
  }
};

// Dados iniciais de configurações
const initialConfigurations: ConfigurationWithId[] = [
  {
    id: "1",
    name: "Gmail Principal",
    provider: "gmail" as const,
    host: "smtp.gmail.com",
    port: 587,
    username: "empresa@gmail.com",
    password: "********",
    senderEmail: "empresa@gmail.com",
    senderName: "Empresa CRM",
    useSSL: true,
    useTLS: true,
    isActive: true,
    status: "connected",
    lastUsed: "2024-09-28T10:30:00Z",
    totalSent: 2543
  },
  {
    id: "2", 
    name: "SendGrid Marketing",
    provider: "sendgrid" as const,
    host: "smtp.sendgrid.net",
    port: 587,
    username: "apikey",
    password: "********",
    senderEmail: "marketing@empresa.com",
    senderName: "Marketing Empresa",
    useSSL: true,
    useTLS: true,
    isActive: false,
    status: "disconnected",
    lastUsed: "2024-09-25T15:45:00Z",
    totalSent: 15642
  },
  {
    id: "3",
    name: "Outlook Suporte",
    provider: "outlook" as const,
    host: "smtp-mail.outlook.com", 
    port: 587,
    username: "suporte@empresa.com",
    password: "********",
    senderEmail: "suporte@empresa.com",
    senderName: "Suporte Técnico",
    useSSL: true,
    useTLS: true,
    isActive: true,
    status: "error",
    lastUsed: "2024-09-27T08:15:00Z",
    totalSent: 891
  }
];

type ConfigurationWithId = SMTPConfig & {
  id: string;
  isActive: boolean;
  status: string;
  lastUsed: string;
  totalSent: number;
};

export default function EmailConfigure() {
  const [configurations, setConfigurations] = useState<ConfigurationWithId[]>(initialConfigurations);
  const [showPassword, setShowPassword] = useState(false);
  const [isCreatingNew, setIsCreatingNew] = useState(false);
  const [editingConfig, setEditingConfig] = useState<string | null>(null);
  const [testingConnection, setTestingConnection] = useState(false);
  const { toast } = useToast();

  const form = useForm<SMTPConfig>({
    resolver: zodResolver(smtpConfigSchema),
    defaultValues: {
      name: "",
      provider: "gmail",
      host: "",
      port: 587,
      username: "",
      password: "",
      senderEmail: "",
      senderName: "",
      useSSL: true,
      useTLS: true,
    },
  });

  const selectedProvider = form.watch("provider");

  // Função para aplicar template do provider
  const applyProviderTemplate = (provider: keyof typeof providerTemplates) => {
    const template = providerTemplates[provider];
    form.setValue("host", template.host);
    form.setValue("port", template.port);
    form.setValue("useSSL", template.useSSL);
    form.setValue("useTLS", template.useTLS);
  };

  // Função para testar conexão específica
  const handleTestConnection = async (configId?: string) => {
    setTestingConnection(true);
    
    // Simular teste de conexão
    setTimeout(() => {
      setTestingConnection(false);
      const success = Math.random() > 0.3; // 70% chance de sucesso
      
      if (success) {
        toast({
          title: "Conexão bem-sucedida! ✅",
          description: "Configuração SMTP testada com sucesso.",
        });
        
        // Atualizar status da configuração se um ID for fornecido
        if (configId) {
          setConfigurations(prev => prev.map(config => 
            config.id === configId 
              ? { ...config, status: "connected", lastUsed: new Date().toISOString() }
              : config
          ));
        }
      } else {
        toast({
          title: "Falha na conexão ❌",
          description: "Verifique as credenciais e configurações.",
          variant: "destructive",
        });
        
        // Atualizar status da configuração se um ID for fornecido
        if (configId) {
          setConfigurations(prev => prev.map(config => 
            config.id === configId 
              ? { ...config, status: "error" }
              : config
          ));
        }
      }
    }, 2000);
  };

  // Função para salvar configuração
  const handleSaveConfiguration = async (data: SMTPConfig) => {
    // Simular salvamento
    setTimeout(() => {
      // Criar nova configuração com ID único
      const newConfig: ConfigurationWithId = {
        ...data,
        id: Date.now().toString(),
        isActive: false,
        status: "disconnected",
        lastUsed: new Date().toISOString(),
        totalSent: 0
      };
      
      // Adicionar ao state
      setConfigurations(prev => [...prev, newConfig]);
      
      toast({
        title: "Configuração salva! 💾",
        description: `${data.name} foi configurado com sucesso.`,
      });
      setIsCreatingNew(false);
      form.reset();
    }, 1000);
  };
  
  // Função para editar configuração
  const handleEditConfiguration = (configId: string) => {
    const config = configurations.find(c => c.id === configId);
    if (config) {
      form.reset({
        name: config.name,
        provider: config.provider as any,
        host: config.host,
        port: config.port,
        username: config.username,
        password: "", // Não mostrar senha por segurança
        senderEmail: config.senderEmail,
        senderName: config.senderName || "",
        useSSL: config.useSSL || true,
        useTLS: config.useTLS || true,
      });
      setEditingConfig(configId);
      setIsCreatingNew(true);
    }
  };
  
  // Função para atualizar configuração existente
  const handleUpdateConfiguration = async (data: SMTPConfig) => {
    if (!editingConfig) return;
    
    setTimeout(() => {
      // Atualizar configuração existente
      setConfigurations(prev => prev.map(config => 
        config.id === editingConfig 
          ? { 
              ...config,
              ...data,
              lastUsed: new Date().toISOString()
            }
          : config
      ));
      
      toast({
        title: "Configuração atualizada! ✏️",
        description: `${data.name} foi atualizado com sucesso.`,
      });
      setIsCreatingNew(false);
      setEditingConfig(null);
      form.reset();
    }, 1000);
  };
  
  // Função para deletar configuração
  const handleDeleteConfiguration = (configId: string) => {
    const config = configurations.find(c => c.id === configId);
    if (config) {
      setConfigurations(prev => prev.filter(c => c.id !== configId));
      toast({
        title: "Configuração removida! 🗑️",
        description: `${config.name} foi removido com sucesso.`,
      });
    }
  };

  // Função para obter status visual
  const getStatusInfo = (status: string) => {
    switch (status) {
      case "connected":
        return {
          label: "Conectado",
          color: "bg-green-100 text-green-800",
          icon: CheckCircle,
          description: "Funcionando normalmente"
        };
      case "disconnected":
        return {
          label: "Desconectado",
          color: "bg-gray-100 text-gray-800",
          icon: XCircle,
          description: "Configuração inativa"
        };
      case "error":
        return {
          label: "Erro",
          color: "bg-red-100 text-red-800",
          icon: AlertCircle,
          description: "Erro de autenticação"
        };
      default:
        return {
          label: "Desconhecido",
          color: "bg-gray-100 text-gray-800",
          icon: AlertCircle,
          description: "Status indefinido"
        };
    }
  };

  return (
    <div className="container mx-auto py-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold" data-testid="text-email-configure-title">
            Configuração SMTP
          </h1>
          <p className="text-muted-foreground">
            Configure servidores de email para suas campanhas
          </p>
        </div>
        <Button 
          onClick={() => setIsCreatingNew(true)}
          data-testid="button-create-smtp-config"
        >
          <Plus className="h-4 w-4 mr-2" />
          Nova Configuração
        </Button>
      </div>

      {/* Formulário de Nova Configuração */}
      {isCreatingNew && (
        <Card data-testid="card-new-smtp-config">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Settings className="h-5 w-5" />
              Nova Configuração SMTP
            </CardTitle>
          </CardHeader>
          <CardContent>
            <Form {...form}>
              <form onSubmit={form.handleSubmit(editingConfig ? handleUpdateConfiguration : handleSaveConfiguration)} className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {/* Nome da Configuração */}
                  <FormField
                    control={form.control}
                    name="name"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Nome da Configuração</FormLabel>
                        <FormControl>
                          <Input 
                            placeholder="Ex: Gmail Principal" 
                            data-testid="input-config-name"
                            {...field} 
                          />
                        </FormControl>
                        <FormDescription>
                          Nome para identificar esta configuração
                        </FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  {/* Provider */}
                  <FormField
                    control={form.control}
                    name="provider"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Provedor</FormLabel>
                        <Select 
                          value={field.value} 
                          onValueChange={(value) => {
                            field.onChange(value);
                            applyProviderTemplate(value as keyof typeof providerTemplates);
                          }}
                        >
                          <FormControl>
                            <SelectTrigger data-testid="select-provider">
                              <SelectValue placeholder="Selecione o provedor" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            {Object.entries(providerTemplates).map(([key, template]) => {
                              const IconComponent = template.icon;
                              return (
                                <SelectItem key={key} value={key}>
                                  <div className="flex items-center gap-2">
                                    <IconComponent className={`h-4 w-4 ${template.color}`} />
                                    {template.name}
                                  </div>
                                </SelectItem>
                              );
                            })}
                          </SelectContent>
                        </Select>
                        <FormDescription>
                          {providerTemplates[selectedProvider]?.description}
                        </FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                {/* Template Info */}
                {selectedProvider && (
                  <Alert>
                    <Globe className="h-4 w-4" />
                    <AlertTitle>Configuração Recomendada</AlertTitle>
                    <AlertDescription>
                      {providerTemplates[selectedProvider].description}
                      {providerTemplates[selectedProvider].helpUrl && (
                        <a 
                          href={providerTemplates[selectedProvider].helpUrl!}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="ml-2 text-blue-600 hover:underline"
                        >
                          Ver documentação →
                        </a>
                      )}
                    </AlertDescription>
                  </Alert>
                )}

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {/* Host SMTP */}
                  <FormField
                    control={form.control}
                    name="host"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Host SMTP</FormLabel>
                        <FormControl>
                          <Input 
                            placeholder="smtp.gmail.com" 
                            data-testid="input-smtp-host"
                            {...field} 
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  {/* Porta */}
                  <FormField
                    control={form.control}
                    name="port"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Porta</FormLabel>
                        <FormControl>
                          <Input 
                            type="number" 
                            placeholder="587" 
                            data-testid="input-smtp-port"
                            {...field} 
                          />
                        </FormControl>
                        <FormDescription>
                          Padrão: 587 (TLS) ou 465 (SSL)
                        </FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  {/* Usuário */}
                  <FormField
                    control={form.control}
                    name="username"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Usuário</FormLabel>
                        <FormControl>
                          <Input 
                            placeholder="seu-email@gmail.com" 
                            data-testid="input-smtp-username"
                            {...field} 
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  {/* Senha */}
                  <FormField
                    control={form.control}
                    name="password"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Senha</FormLabel>
                        <FormControl>
                          <div className="relative">
                            <Input 
                              type={showPassword ? "text" : "password"}
                              placeholder="••••••••" 
                              data-testid="input-smtp-password"
                              {...field} 
                            />
                            <Button
                              type="button"
                              variant="ghost"
                              size="sm"
                              className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
                              onClick={() => setShowPassword(!showPassword)}
                              data-testid="button-toggle-password"
                            >
                              {showPassword ? (
                                <EyeOff className="h-4 w-4" />
                              ) : (
                                <Eye className="h-4 w-4" />
                              )}
                            </Button>
                          </div>
                        </FormControl>
                        <FormDescription>
                          {selectedProvider === "gmail" && "Use App Password, não a senha normal"}
                          {selectedProvider === "sendgrid" && "Use sua API Key do SendGrid"}
                          {selectedProvider === "outlook" && "Use a senha da sua conta Microsoft"}
                        </FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  {/* Email do Remetente */}
                  <FormField
                    control={form.control}
                    name="senderEmail"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Email do Remetente</FormLabel>
                        <FormControl>
                          <Input 
                            type="email"
                            placeholder="empresa@exemplo.com" 
                            data-testid="input-sender-email"
                            {...field} 
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  {/* Nome do Remetente */}
                  <FormField
                    control={form.control}
                    name="senderName"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Nome do Remetente (Opcional)</FormLabel>
                        <FormControl>
                          <Input 
                            placeholder="Empresa CRM" 
                            data-testid="input-sender-name"
                            {...field} 
                          />
                        </FormControl>
                        <FormDescription>
                          Nome que aparece para o destinatário
                        </FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                {/* Configurações de Segurança */}
                <div className="space-y-4">
                  <Label className="text-base font-medium">Configurações de Segurança</Label>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <FormField
                      control={form.control}
                      name="useSSL"
                      render={({ field }) => (
                        <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
                          <div className="space-y-0.5">
                            <FormLabel className="text-base">
                              Usar SSL
                            </FormLabel>
                            <FormDescription>
                              Criptografia SSL para conexão segura
                            </FormDescription>
                          </div>
                          <FormControl>
                            <Switch
                              checked={field.value}
                              onCheckedChange={field.onChange}
                              data-testid="switch-use-ssl"
                            />
                          </FormControl>
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="useTLS"
                      render={({ field }) => (
                        <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
                          <div className="space-y-0.5">
                            <FormLabel className="text-base">
                              Usar TLS
                            </FormLabel>
                            <FormDescription>
                              Criptografia TLS para autenticação
                            </FormDescription>
                          </div>
                          <FormControl>
                            <Switch
                              checked={field.value}
                              onCheckedChange={field.onChange}
                              data-testid="switch-use-tls"
                            />
                          </FormControl>
                        </FormItem>
                      )}
                    />
                  </div>
                </div>

                {/* Botões de Ação */}
                <div className="flex gap-4">
                  <Button 
                    type="button"
                    variant="outline"
                    onClick={() => handleTestConnection()}
                    disabled={testingConnection}
                    data-testid="button-test-connection"
                  >
                    {testingConnection ? (
                      <>
                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-current mr-2"></div>
                        Testando...
                      </>
                    ) : (
                      <>
                        <TestTube className="h-4 w-4 mr-2" />
                        Testar Conexão
                      </>
                    )}
                  </Button>
                  <Button type="submit" data-testid="button-save-config">
                    <Key className="h-4 w-4 mr-2" />
                    {editingConfig ? "Atualizar Configuração" : "Salvar Configuração"}
                  </Button>
                  <Button 
                    type="button"
                    variant="outline"
                    onClick={() => {
                      setIsCreatingNew(false);
                      setEditingConfig(null);
                      form.reset();
                    }}
                    data-testid="button-cancel-config"
                  >
                    Cancelar
                  </Button>
                </div>
              </form>
            </Form>
          </CardContent>
        </Card>
      )}

      {/* Lista de Configurações Salvas */}
      <Card data-testid="card-saved-configurations">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Mail className="h-5 w-5" />
            Configurações Salvas
          </CardTitle>
        </CardHeader>
        <CardContent>
          {configurations.length === 0 ? (
            <div className="text-center py-12">
              <Mail className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">
                Nenhuma configuração encontrada
              </h3>
              <p className="text-gray-500 mb-4">
                Crie sua primeira configuração SMTP para começar a enviar emails
              </p>
              <Button onClick={() => setIsCreatingNew(true)}>
                <Plus className="h-4 w-4 mr-2" />
                Criar Primeira Configuração
              </Button>
            </div>
          ) : (
            <div className="space-y-4">
              {configurations.map((config) => {
                const statusInfo = getStatusInfo(config.status);
                const providerInfo = providerTemplates[config.provider as keyof typeof providerTemplates];
                const StatusIcon = statusInfo.icon;
                const ProviderIcon = providerInfo.icon;

                return (
                  <Card key={config.id} className="hover:shadow-md transition-shadow" data-testid={`card-config-${config.id}`}>
                    <CardContent className="pt-6">
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <div className="flex items-center gap-3 mb-2">
                            <ProviderIcon className={`h-5 w-5 ${providerInfo.color}`} />
                            <h3 className="text-lg font-semibold" data-testid={`text-config-name-${config.id}`}>
                              {config.name}
                            </h3>
                            <Badge className={statusInfo.color} data-testid={`badge-status-${config.id}`}>
                              <StatusIcon className="h-3 w-3 mr-1" />
                              {statusInfo.label}
                            </Badge>
                            {config.isActive && (
                              <Badge variant="outline" className="text-green-600 border-green-200">
                                <Zap className="h-3 w-3 mr-1" />
                                Ativo
                              </Badge>
                            )}
                          </div>

                          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm text-muted-foreground">
                            <div>
                              <span className="font-medium">Host:</span> {config.host}:{config.port}
                            </div>
                            <div>
                              <span className="font-medium">Usuário:</span> {config.username}
                            </div>
                            <div>
                              <span className="font-medium">Remetente:</span> {config.senderEmail}
                            </div>
                          </div>

                          <div className="mt-3 flex items-center gap-6 text-xs text-muted-foreground">
                            <div className="flex items-center gap-1">
                              <Mail className="h-3 w-3" />
                              <span data-testid={`text-total-sent-${config.id}`}>
                                {config.totalSent.toLocaleString()} emails enviados
                              </span>
                            </div>
                            <div>
                              Último uso: {new Date(config.lastUsed).toLocaleDateString('pt-BR')}
                            </div>
                            <div>{statusInfo.description}</div>
                          </div>
                        </div>

                        <div className="flex gap-2 ml-4">
                          <Button 
                            variant="outline" 
                            size="sm"
                            onClick={() => handleTestConnection(config.id)}
                            disabled={testingConnection}
                            data-testid={`button-test-${config.id}`}
                          >
                            <TestTube className="h-4 w-4" />
                          </Button>
                          <Button 
                            variant="outline" 
                            size="sm"
                            onClick={() => handleEditConfiguration(config.id)}
                            data-testid={`button-edit-${config.id}`}
                          >
                            <Edit className="h-4 w-4" />
                          </Button>
                          <Button 
                            variant="outline" 
                            size="sm"
                            className="text-red-600 hover:text-red-700"
                            onClick={() => handleDeleteConfiguration(config.id)}
                            data-testid={`button-delete-${config.id}`}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Informações e Dicas */}
      <Card data-testid="card-help-info">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Shield className="h-5 w-5" />
            Dicas de Configuração
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <h4 className="font-medium mb-2">Configurações Recomendadas</h4>
              <ul className="text-sm text-muted-foreground space-y-1">
                <li>• Use sempre SSL/TLS para segurança</li>
                <li>• Para Gmail, crie um App Password específico</li>
                <li>• SendGrid oferece melhor deliverabilidade</li>
                <li>• Teste sempre antes de usar em campanhas</li>
              </ul>
            </div>
            <div>
              <h4 className="font-medium mb-2">Solução de Problemas</h4>
              <ul className="text-sm text-muted-foreground space-y-1">
                <li>• Verifique se 2FA está habilitado (Gmail/Outlook)</li>
                <li>• Confirme se a porta está correta</li>
                <li>• Alguns provedores bloqueiam SMTP externo</li>
                <li>• Verifique limites de envio do provedor</li>
              </ul>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}