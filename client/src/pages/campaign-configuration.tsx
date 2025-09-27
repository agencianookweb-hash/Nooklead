import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { z } from "zod";
import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { Calendar, Clock, MessageSquare, Settings, Target, Send, Eye, Zap } from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

// Schema de validação baseado no esquema massCampaigns existente
const campaignConfigSchema = z.object({
  // Informações Básicas
  name: z.string().min(1, "Nome da campanha é obrigatório"),
  description: z.string().optional(),
  objective: z.enum(["VENDAS", "MARKETING", "SUPORTE", "PROSPECCAO"]),
  
  // Seleção de Canal
  channel: z.enum(["WHATSAPP", "EMAIL", "SMS"]).default("WHATSAPP"),
  
  // Configuração de Timing
  sendType: z.enum(["IMMEDIATE", "SCHEDULED"]).default("IMMEDIATE"),
  scheduledDate: z.string().optional(),
  scheduledTime: z.string().optional(),
  sendRate: z.coerce.number().min(1).max(1000).default(50), // msgs por hora
  workingHoursEnabled: z.boolean().default(false),
  workingHoursStart: z.string().default("08:00"),
  workingHoursEnd: z.string().default("18:00"),
  
  // Template de Mensagem
  messageTemplate: z.string().min(1, "Template da mensagem é obrigatório"),
  
  // Configurações Avançadas
  retryEnabled: z.boolean().default(false),
  retryAttempts: z.coerce.number().min(1).max(5).default(3),
  customBlacklist: z.string().optional(),
  reportSettings: z.object({
    enableDeliveryReport: z.boolean().default(true),
    enableReadReport: z.boolean().default(true),
    enableReplyReport: z.boolean().default(true),
  }).default({
    enableDeliveryReport: true,
    enableReadReport: true,
    enableReplyReport: true,
  }),
});

type CampaignConfigData = z.infer<typeof campaignConfigSchema>;

// Variáveis dinâmicas disponíveis
const TEMPLATE_VARIABLES = [
  { key: "{{nome}}", description: "Nome da empresa" },
  { key: "{{empresa}}", description: "Razão social" },
  { key: "{{telefone}}", description: "Telefone" },
  { key: "{{cidade}}", description: "Cidade" },
  { key: "{{setor}}", description: "Setor da empresa" },
];

// Exemplo de dados para preview
const PREVIEW_DATA = {
  nome: "João Silva Ltda",
  empresa: "João Silva Comercial Ltda",
  telefone: "(11) 99999-9999", 
  cidade: "São Paulo",
  setor: "Comércio",
};

export default function CampaignConfiguration() {
  const { toast } = useToast();
  const [activeTab, setActiveTab] = useState("basic");

  const form = useForm<CampaignConfigData>({
    resolver: zodResolver(campaignConfigSchema),
    defaultValues: {
      name: "",
      description: "",
      objective: "VENDAS",
      channel: "WHATSAPP",
      sendType: "IMMEDIATE",
      sendRate: 50,
      workingHoursEnabled: false,
      workingHoursStart: "08:00",
      workingHoursEnd: "18:00",
      messageTemplate: "",
      retryEnabled: false,
      retryAttempts: 3,
      reportSettings: {
        enableDeliveryReport: true,
        enableReadReport: true,
        enableReplyReport: true,
      },
    },
  });

  const watchedValues = form.watch();
  
  const createCampaignMutation = useMutation({
    mutationFn: async (data: CampaignConfigData) => {
      // Preparar os dados para o backend
      const campaignData = {
        name: data.name,
        description: data.description,
        channel: data.channel,
        messageTemplate: data.messageTemplate,
        sendRate: data.sendRate,
        workingHours: data.workingHoursEnabled ? {
          enabled: true,
          start: data.workingHoursStart,
          end: data.workingHoursEnd,
        } : null,
        startTime: data.sendType === "SCHEDULED" && data.scheduledDate && data.scheduledTime 
          ? new Date(`${data.scheduledDate}T${data.scheduledTime}`).toISOString() 
          : null,
      };

      return await apiRequest("POST", "/api/campaigns/mass", campaignData);
    },
    onSuccess: () => {
      toast({
        title: "Sucesso",
        description: "Campanha configurada com sucesso! Agora você pode adicionar contatos.",
      });
      form.reset();
    },
    onError: (error) => {
      console.error("Erro ao criar campanha:", error);
      toast({
        title: "Erro",
        description: "Falha ao configurar campanha. Tente novamente.",
        variant: "destructive",
      });
    },
  });

  const onSubmit = (data: CampaignConfigData) => {
    console.log("Dados da campanha:", data);
    createCampaignMutation.mutate(data);
  };

  // Função para escapar caracteres especiais de regex
  const escapeRegExp = (string: string) => {
    return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  };

  // Função para substituir variáveis no preview
  const renderPreview = (template: string) => {
    let preview = template;
    TEMPLATE_VARIABLES.forEach(variable => {
      const value = PREVIEW_DATA[variable.key.replace(/[{}]/g, "") as keyof typeof PREVIEW_DATA];
      // Escapar corretamente o padrão para criar o regex
      const escapedPattern = escapeRegExp(variable.key);
      preview = preview.replace(new RegExp(escapedPattern, "g"), value || variable.key);
    });
    return preview;
  };

  // Contador de caracteres
  const characterCount = watchedValues.messageTemplate?.length || 0;
  const maxChars = watchedValues.channel === "SMS" ? 160 : 4096;

  return (
    <div className="container mx-auto py-6 space-y-6">
      <div className="flex items-center gap-3">
        <Target className="h-8 w-8 text-blue-600" />
        <div>
          <h1 className="text-2xl font-bold">Configuração de Campanha</h1>
          <p className="text-muted-foreground">Configure sua campanha de disparo em massa</p>
        </div>
      </div>

      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
          <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
            <TabsList className="grid w-full grid-cols-5">
              <TabsTrigger value="basic" data-testid="tab-basic">
                <Target className="h-4 w-4 mr-2" />
                Básicas
              </TabsTrigger>
              <TabsTrigger value="channel" data-testid="tab-channel">
                <MessageSquare className="h-4 w-4 mr-2" />
                Canal
              </TabsTrigger>
              <TabsTrigger value="timing" data-testid="tab-timing">
                <Clock className="h-4 w-4 mr-2" />
                Timing
              </TabsTrigger>
              <TabsTrigger value="template" data-testid="tab-template">
                <Send className="h-4 w-4 mr-2" />
                Template
              </TabsTrigger>
              <TabsTrigger value="advanced" data-testid="tab-advanced">
                <Settings className="h-4 w-4 mr-2" />
                Avançado
              </TabsTrigger>
            </TabsList>

            {/* Seção 1: Informações Básicas */}
            <TabsContent value="basic" className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle>Informações Básicas</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <FormField
                    control={form.control}
                    name="name"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Nome da Campanha *</FormLabel>
                        <FormControl>
                          <Input 
                            placeholder="Ex: Prospecção Q1 2025"
                            data-testid="input-campaign-name"
                            {...field} 
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="description"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Descrição da Campanha</FormLabel>
                        <FormControl>
                          <Textarea 
                            rows={3}
                            placeholder="Descreva o objetivo e contexto desta campanha..."
                            data-testid="textarea-campaign-description"
                            {...field} 
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="objective"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Objetivo da Campanha</FormLabel>
                        <Select onValueChange={field.onChange} defaultValue={field.value}>
                          <FormControl>
                            <SelectTrigger data-testid="select-campaign-objective">
                              <SelectValue placeholder="Selecione o objetivo" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value="VENDAS">Vendas</SelectItem>
                            <SelectItem value="MARKETING">Marketing</SelectItem>
                            <SelectItem value="SUPORTE">Suporte</SelectItem>
                            <SelectItem value="PROSPECCAO">Prospecção</SelectItem>
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <div className="p-4 bg-blue-50 rounded-lg">
                    <div className="flex items-center gap-2 text-blue-700 font-medium">
                      <Calendar className="h-4 w-4" />
                      Data de Criação
                    </div>
                    <p className="text-blue-600 mt-1" data-testid="text-creation-date">
                      {format(new Date(), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}
                    </p>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            {/* Seção 2: Seleção de Canal */}
            <TabsContent value="channel" className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle>Seleção de Canal</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <FormField
                    control={form.control}
                    name="channel"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Canal de Comunicação</FormLabel>
                        <FormControl>
                          <RadioGroup
                            onValueChange={field.onChange}
                            defaultValue={field.value}
                            className="grid grid-cols-3 gap-4"
                          >
                            <div className="flex items-center space-x-2 border rounded-lg p-4">
                              <RadioGroupItem value="WHATSAPP" id="whatsapp" data-testid="radio-channel-whatsapp" />
                              <Label htmlFor="whatsapp" className="flex items-center gap-2 cursor-pointer flex-1">
                                <MessageSquare className="h-5 w-5 text-green-600" />
                                <div>
                                  <div className="font-medium">WhatsApp</div>
                                  <div className="text-sm text-muted-foreground">Recomendado</div>
                                </div>
                              </Label>
                            </div>
                            <div className="flex items-center space-x-2 border rounded-lg p-4">
                              <RadioGroupItem value="SMS" id="sms" data-testid="radio-channel-sms" />
                              <Label htmlFor="sms" className="flex items-center gap-2 cursor-pointer flex-1">
                                <Send className="h-5 w-5 text-blue-600" />
                                <div>
                                  <div className="font-medium">SMS</div>
                                  <div className="text-sm text-muted-foreground">160 caracteres</div>
                                </div>
                              </Label>
                            </div>
                            <div className="flex items-center space-x-2 border rounded-lg p-4">
                              <RadioGroupItem value="EMAIL" id="email" data-testid="radio-channel-email" />
                              <Label htmlFor="email" className="flex items-center gap-2 cursor-pointer flex-1">
                                <Calendar className="h-5 w-5 text-purple-600" />
                                <div>
                                  <div className="font-medium">Email</div>
                                  <div className="text-sm text-muted-foreground">Sem limite</div>
                                </div>
                              </Label>
                            </div>
                          </RadioGroup>
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  {/* Informações específicas do canal */}
                  {watchedValues.channel === "WHATSAPP" && (
                    <div className="p-4 bg-green-50 rounded-lg">
                      <h4 className="font-medium text-green-800 mb-2">Configurações WhatsApp</h4>
                      <ul className="text-sm text-green-700 space-y-1">
                        <li>• Mensagens são validadas automaticamente</li>
                        <li>• Suporte a emojis e formatação</li>
                        <li>• Limite de 4096 caracteres por mensagem</li>
                        <li>• Rate limiting para evitar bloqueios</li>
                      </ul>
                    </div>
                  )}

                  {watchedValues.channel === "SMS" && (
                    <div className="p-4 bg-blue-50 rounded-lg">
                      <h4 className="font-medium text-blue-800 mb-2">Configurações SMS</h4>
                      <ul className="text-sm text-blue-700 space-y-1">
                        <li>• Limite de 160 caracteres por mensagem</li>
                        <li>• Não suporta emojis ou formatação</li>
                        <li>• Entrega mais rápida</li>
                        <li>• Cobrança por SMS enviado</li>
                      </ul>
                    </div>
                  )}

                  {watchedValues.channel === "EMAIL" && (
                    <div className="p-4 bg-purple-50 rounded-lg">
                      <h4 className="font-medium text-purple-800 mb-2">Configurações Email</h4>
                      <ul className="text-sm text-purple-700 space-y-1">
                        <li>• Suporte a HTML e imagens</li>
                        <li>• Sem limite de caracteres</li>
                        <li>• Necessário assunto da mensagem</li>
                        <li>• Taxa de abertura variável</li>
                      </ul>
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            {/* Seção 3: Configuração de Timing */}
            <TabsContent value="timing" className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle>Configuração de Timing</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <FormField
                    control={form.control}
                    name="sendType"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Tipo de Envio</FormLabel>
                        <FormControl>
                          <RadioGroup
                            onValueChange={field.onChange}
                            defaultValue={field.value}
                            className="grid grid-cols-2 gap-4"
                          >
                            <div className="flex items-center space-x-2 border rounded-lg p-4">
                              <RadioGroupItem value="IMMEDIATE" id="immediate" data-testid="radio-send-immediate" />
                              <Label htmlFor="immediate" className="flex items-center gap-2 cursor-pointer flex-1">
                                <Zap className="h-5 w-5 text-orange-600" />
                                <div>
                                  <div className="font-medium">Imediato</div>
                                  <div className="text-sm text-muted-foreground">Enviar agora</div>
                                </div>
                              </Label>
                            </div>
                            <div className="flex items-center space-x-2 border rounded-lg p-4">
                              <RadioGroupItem value="SCHEDULED" id="scheduled" data-testid="radio-send-scheduled" />
                              <Label htmlFor="scheduled" className="flex items-center gap-2 cursor-pointer flex-1">
                                <Calendar className="h-5 w-5 text-blue-600" />
                                <div>
                                  <div className="font-medium">Agendado</div>
                                  <div className="text-sm text-muted-foreground">Escolher data/hora</div>
                                </div>
                              </Label>
                            </div>
                          </RadioGroup>
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  {watchedValues.sendType === "SCHEDULED" && (
                    <div className="grid grid-cols-2 gap-4">
                      <FormField
                        control={form.control}
                        name="scheduledDate"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Data</FormLabel>
                            <FormControl>
                              <Input 
                                type="date" 
                                data-testid="input-scheduled-date"
                                {...field} 
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <FormField
                        control={form.control}
                        name="scheduledTime"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Horário</FormLabel>
                            <FormControl>
                              <Input 
                                type="time" 
                                data-testid="input-scheduled-time"
                                {...field} 
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>
                  )}

                  <FormField
                    control={form.control}
                    name="sendRate"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Rate Limiting (mensagens por hora)</FormLabel>
                        <FormControl>
                          <div className="space-y-2">
                            <Input 
                              type="number" 
                              min="1" 
                              max="1000"
                              placeholder="50"
                              data-testid="input-send-rate"
                              value={field.value}
                              onChange={(e) => field.onChange(Number(e.target.value))}
                            />
                            <div className="text-sm text-muted-foreground">
                              Recomendado: 50 msgs/hora para WhatsApp, 200 msgs/hora para SMS
                            </div>
                          </div>
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="workingHoursEnabled"
                    render={({ field }) => (
                      <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
                        <div className="space-y-0.5">
                          <FormLabel>Horário de Funcionamento</FormLabel>
                          <FormDescription>
                            Limitar envios apenas no horário comercial
                          </FormDescription>
                        </div>
                        <FormControl>
                          <Switch
                            data-testid="switch-working-hours"
                            checked={field.value}
                            onCheckedChange={field.onChange}
                          />
                        </FormControl>
                      </FormItem>
                    )}
                  />

                  {watchedValues.workingHoursEnabled && (
                    <div className="grid grid-cols-2 gap-4">
                      <FormField
                        control={form.control}
                        name="workingHoursStart"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Início</FormLabel>
                            <FormControl>
                              <Input 
                                type="time" 
                                data-testid="input-working-hours-start"
                                {...field} 
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <FormField
                        control={form.control}
                        name="workingHoursEnd"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Fim</FormLabel>
                            <FormControl>
                              <Input 
                                type="time" 
                                data-testid="input-working-hours-end"
                                {...field} 
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            {/* Seção 4: Template de Mensagem */}
            <TabsContent value="template" className="space-y-6">
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Editor de Template */}
                <Card>
                  <CardHeader>
                    <CardTitle>Template da Mensagem</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <FormField
                      control={form.control}
                      name="messageTemplate"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Conteúdo da Mensagem</FormLabel>
                          <FormControl>
                            <Textarea 
                              rows={8}
                              placeholder="Olá {{nome}}! Temos uma proposta especial para {{empresa}}..."
                              data-testid="textarea-message-template"
                              className="resize-none"
                              {...field} 
                            />
                          </FormControl>
                          <div className="flex justify-between items-center text-sm">
                            <span data-testid="text-character-count" className={characterCount > maxChars ? "text-red-600" : "text-muted-foreground"}>
                              {characterCount} / {maxChars} caracteres
                            </span>
                            {characterCount > maxChars && (
                              <Badge variant="destructive">Limite excedido</Badge>
                            )}
                          </div>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <div className="space-y-3">
                      <h4 className="font-medium">Variáveis Disponíveis</h4>
                      <div className="grid grid-cols-2 gap-2">
                        {TEMPLATE_VARIABLES.map((variable) => (
                          <div 
                            key={variable.key}
                            className="p-2 bg-gray-50 rounded-lg cursor-pointer hover:bg-gray-100 transition-colors"
                            data-testid={`variable-${variable.key.replace(/[{}]/g, "")}`}
                            onClick={() => {
                              const current = form.getValues("messageTemplate");
                              form.setValue("messageTemplate", current + " " + variable.key);
                            }}
                          >
                            <div className="font-mono text-sm text-blue-600">{variable.key}</div>
                            <div className="text-xs text-muted-foreground">{variable.description}</div>
                          </div>
                        ))}
                      </div>
                    </div>
                  </CardContent>
                </Card>

                {/* Preview */}
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Eye className="h-5 w-5" />
                      Preview da Mensagem
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4">
                      <div className="p-4 bg-green-50 border border-green-200 rounded-lg">
                        <div className="text-xs text-green-600 font-medium mb-2">
                          PREVIEW - {watchedValues.channel}
                        </div>
                        <div 
                          className="whitespace-pre-wrap text-sm"
                          data-testid="text-message-preview"
                        >
                          {watchedValues.messageTemplate 
                            ? renderPreview(watchedValues.messageTemplate)
                            : "Digite uma mensagem para ver o preview..."
                          }
                        </div>
                      </div>

                      <div className="text-xs text-muted-foreground">
                        <strong>Dados de exemplo:</strong>
                        <ul className="mt-1 space-y-1">
                          <li>• Nome: {PREVIEW_DATA.nome}</li>
                          <li>• Empresa: {PREVIEW_DATA.empresa}</li>
                          <li>• Telefone: {PREVIEW_DATA.telefone}</li>
                          <li>• Cidade: {PREVIEW_DATA.cidade}</li>
                          <li>• Setor: {PREVIEW_DATA.setor}</li>
                        </ul>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>
            </TabsContent>

            {/* Seção 5: Configurações Avançadas */}
            <TabsContent value="advanced" className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle>Configurações Avançadas</CardTitle>
                </CardHeader>
                <CardContent className="space-y-6">
                  <FormField
                    control={form.control}
                    name="retryEnabled"
                    render={({ field }) => (
                      <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
                        <div className="space-y-0.5">
                          <FormLabel>Retry Automático</FormLabel>
                          <FormDescription>
                            Tentar reenviar automaticamente em caso de falha
                          </FormDescription>
                        </div>
                        <FormControl>
                          <Switch
                            data-testid="switch-retry-enabled"
                            checked={field.value}
                            onCheckedChange={field.onChange}
                          />
                        </FormControl>
                      </FormItem>
                    )}
                  />

                  {watchedValues.retryEnabled && (
                    <FormField
                      control={form.control}
                      name="retryAttempts"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Número de Tentativas</FormLabel>
                          <FormControl>
                            <Input 
                              type="number" 
                              min="1" 
                              max="5"
                              data-testid="input-retry-attempts"
                              value={field.value}
                              onChange={(e) => field.onChange(Number(e.target.value))}
                            />
                          </FormControl>
                          <FormDescription>
                            Máximo de 5 tentativas
                          </FormDescription>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  )}

                  <FormField
                    control={form.control}
                    name="customBlacklist"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Blacklist Personalizada</FormLabel>
                        <FormControl>
                          <Textarea 
                            rows={4}
                            placeholder="Digite números que devem ser ignorados, um por linha...&#10;+5511999999999&#10;11888888888"
                            data-testid="textarea-custom-blacklist"
                            {...field} 
                          />
                        </FormControl>
                        <FormDescription>
                          Um número por linha. Números nesta lista não receberão mensagens.
                        </FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <div className="space-y-4">
                    <h4 className="font-medium">Configurações de Relatório</h4>
                    
                    <FormField
                      control={form.control}
                      name="reportSettings.enableDeliveryReport"
                      render={({ field }) => (
                        <FormItem className="flex flex-row items-center justify-between rounded-lg border p-3">
                          <div className="space-y-0.5">
                            <FormLabel>Relatório de Entrega</FormLabel>
                            <FormDescription className="text-xs">
                              Acompanhar status de entrega das mensagens
                            </FormDescription>
                          </div>
                          <FormControl>
                            <Switch
                              data-testid="switch-delivery-report"
                              checked={field.value}
                              onCheckedChange={field.onChange}
                            />
                          </FormControl>
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="reportSettings.enableReadReport"
                      render={({ field }) => (
                        <FormItem className="flex flex-row items-center justify-between rounded-lg border p-3">
                          <div className="space-y-0.5">
                            <FormLabel>Relatório de Leitura</FormLabel>
                            <FormDescription className="text-xs">
                              Acompanhar quando mensagens são visualizadas
                            </FormDescription>
                          </div>
                          <FormControl>
                            <Switch
                              data-testid="switch-read-report"
                              checked={field.value}
                              onCheckedChange={field.onChange}
                            />
                          </FormControl>
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="reportSettings.enableReplyReport"
                      render={({ field }) => (
                        <FormItem className="flex flex-row items-center justify-between rounded-lg border p-3">
                          <div className="space-y-0.5">
                            <FormLabel>Relatório de Resposta</FormLabel>
                            <FormDescription className="text-xs">
                              Acompanhar respostas recebidas
                            </FormDescription>
                          </div>
                          <FormControl>
                            <Switch
                              data-testid="switch-reply-report"
                              checked={field.value}
                              onCheckedChange={field.onChange}
                            />
                          </FormControl>
                        </FormItem>
                      )}
                    />
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>

          {/* Botões de ação */}
          <div className="flex justify-between items-center pt-6 border-t">
            <div className="text-sm text-muted-foreground">
              Após configurar, você poderá adicionar contatos à campanha
            </div>
            
            <div className="flex gap-3">
              <Button 
                type="button" 
                variant="outline"
                data-testid="button-save-draft"
              >
                Salvar Rascunho
              </Button>
              <Button 
                type="submit" 
                disabled={createCampaignMutation.isPending}
                data-testid="button-create-campaign"
                className="min-w-[150px]"
              >
                {createCampaignMutation.isPending ? "Criando..." : "Criar Campanha"}
              </Button>
            </div>
          </div>
        </form>
      </Form>
    </div>
  );
}