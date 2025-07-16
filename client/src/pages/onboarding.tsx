import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useMutation } from "@tanstack/react-query";
import { Building2, User, Mail, Phone, MapPin, Target, Users } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";

const onboardingSchema = z.object({
  // Dados da Empresa
  companyName: z.string().min(2, "Nome da empresa é obrigatório"),
  cnpj: z.string().min(14, "CNPJ deve ter 14 dígitos").max(18, "CNPJ inválido"),
  businessSector: z.string().min(1, "Setor de atuação é obrigatório"),
  companySize: z.string().min(1, "Porte da empresa é obrigatório"),
  
  // Dados do Responsável/Gestor
  managerName: z.string().min(2, "Nome do responsável é obrigatório"),
  managerCpf: z.string().min(11, "CPF deve ter 11 dígitos"),
  managerEmail: z.string().email("Email inválido"),
  managerPhone: z.string().min(10, "Telefone inválido"),
  managerPassword: z.string().min(6, "Senha deve ter pelo menos 6 caracteres"),
  
  // Endereço
  cep: z.string().min(8, "CEP é obrigatório"),
  address: z.string().min(5, "Logradouro é obrigatório"),
  number: z.string().min(1, "Número é obrigatório"),
  complement: z.string().optional(),
  neighborhood: z.string().min(2, "Bairro é obrigatório"),
  city: z.string().min(2, "Cidade é obrigatória"),
  state: z.string().min(2, "Estado é obrigatório"),
  
  // Configurações Iniciais
  salesGoal: z.string().min(1, "Meta de vendas é obrigatória"),
  teamSize: z.string().min(1, "Tamanho da equipe é obrigatório"),
  description: z.string().optional(),
});

type OnboardingFormData = z.infer<typeof onboardingSchema>;

const brazilianStates = [
  "AC", "AL", "AP", "AM", "BA", "CE", "DF", "ES", "GO", "MA",
  "MT", "MS", "MG", "PA", "PB", "PR", "PE", "PI", "RJ", "RN",
  "RS", "RO", "RR", "SC", "SP", "SE", "TO"
];

const companySizes = [
  { value: "MEI", label: "MEI - Microempreendedor Individual" },
  { value: "ME", label: "ME - Microempresa" },
  { value: "EPP", label: "EPP - Empresa de Pequeno Porte" },
  { value: "GRANDE", label: "Grande Empresa" },
];

const businessSectors = [
  "Tecnologia", "Varejo", "Serviços", "Indústria", "Construção",
  "Alimentício", "Saúde", "Educação", "Financeiro", "Agronegócio",
  "Logística", "Consultoria", "Marketing", "Turismo", "Outros"
];

export default function Onboarding() {
  const [step, setStep] = useState(1);
  const { toast } = useToast();

  const form = useForm<OnboardingFormData>({
    resolver: zodResolver(onboardingSchema),
    defaultValues: {
      companyName: "",
      cnpj: "",
      businessSector: "",
      companySize: "",
      managerName: "",
      managerCpf: "",
      managerEmail: "",
      managerPhone: "",
      managerPassword: "",
      cep: "",
      address: "",
      number: "",
      complement: "",
      neighborhood: "",
      city: "",
      state: "",
      salesGoal: "",
      teamSize: "",
      description: "",
    },
  });

  const onboardingMutation = useMutation({
    mutationFn: async (data: OnboardingFormData) => {
      await apiRequest("/api/onboarding", {
        method: "POST",
        body: JSON.stringify(data),
      });
    },
    onSuccess: () => {
      toast({
        title: "Configuração concluída!",
        description: "Sua empresa foi configurada com sucesso. Redirecionando...",
      });
      setTimeout(() => {
        window.location.href = "/";
      }, 2000);
    },
    onError: (error: Error) => {
      toast({
        title: "Erro",
        description: "Erro ao configurar empresa. Tente novamente.",
        variant: "destructive",
      });
    },
  });

  const onSubmit = (data: OnboardingFormData) => {
    onboardingMutation.mutate(data);
  };

  const nextStep = () => {
    const currentStepFields = getStepFields(step);
    form.trigger(currentStepFields).then((isValid) => {
      if (isValid) {
        setStep(step + 1);
      }
    });
  };

  const getStepFields = (currentStep: number) => {
    switch (currentStep) {
      case 1:
        return ["companyName", "cnpj", "businessSector", "companySize"] as (keyof OnboardingFormData)[];
      case 2:
        return ["managerName", "managerCpf", "managerEmail", "managerPhone", "managerPassword"] as (keyof OnboardingFormData)[];
      case 3:
        return ["cep", "address", "number", "neighborhood", "city", "state"] as (keyof OnboardingFormData)[];
      case 4:
        return ["salesGoal", "teamSize"] as (keyof OnboardingFormData)[];
      default:
        return [];
    }
  };

  const formatCNPJ = (value: string) => {
    const numbers = value.replace(/\D/g, '');
    return numbers.replace(/(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})/, '$1.$2.$3/$4-$5');
  };

  const formatCPF = (value: string) => {
    const numbers = value.replace(/\D/g, '');
    return numbers.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, '$1.$2.$3-$4');
  };

  const formatCEP = (value: string) => {
    const numbers = value.replace(/\D/g, '');
    return numbers.replace(/(\d{5})(\d{3})/, '$1-$2');
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center p-4">
      <div className="w-full max-w-2xl">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">
            Bem-vindo ao CRM CNPJ
          </h1>
          <p className="text-gray-600">
            Configure sua empresa em poucos passos
          </p>
        </div>

        {/* Progress Steps */}
        <div className="flex justify-center mb-8">
          <div className="flex space-x-4">
            {[1, 2, 3, 4].map((stepNumber) => (
              <div
                key={stepNumber}
                className={`w-10 h-10 rounded-full flex items-center justify-center ${
                  stepNumber <= step
                    ? "bg-blue-600 text-white"
                    : "bg-gray-200 text-gray-600"
                }`}
              >
                {stepNumber}
              </div>
            ))}
          </div>
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              {step === 1 && <Building2 className="h-5 w-5" />}
              {step === 2 && <User className="h-5 w-5" />}
              {step === 3 && <MapPin className="h-5 w-5" />}
              {step === 4 && <Target className="h-5 w-5" />}
              <span>
                {step === 1 && "Dados da Empresa"}
                {step === 2 && "Dados do Responsável"}
                {step === 3 && "Endereço"}
                {step === 4 && "Configurações Iniciais"}
              </span>
            </CardTitle>
            <CardDescription>
              {step === 1 && "Informe os dados básicos da sua empresa"}
              {step === 2 && "Dados do gestor responsável pelo sistema"}
              {step === 3 && "Endereço da sede da empresa"}
              {step === 4 && "Configure metas e objetivos iniciais"}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
                {/* Step 1: Company Data */}
                {step === 1 && (
                  <div className="space-y-4">
                    <FormField
                      control={form.control}
                      name="companyName"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Nome da Empresa</FormLabel>
                          <FormControl>
                            <Input placeholder="Empresa Exemplo Ltda" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="cnpj"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>CNPJ</FormLabel>
                          <FormControl>
                            <Input
                              placeholder="00.000.000/0000-00"
                              {...field}
                              onChange={(e) => {
                                const formatted = formatCNPJ(e.target.value);
                                field.onChange(formatted);
                              }}
                              maxLength={18}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="businessSector"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Setor de Atuação</FormLabel>
                          <Select onValueChange={field.onChange} defaultValue={field.value}>
                            <FormControl>
                              <SelectTrigger>
                                <SelectValue placeholder="Selecione o setor" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              {businessSectors.map((sector) => (
                                <SelectItem key={sector} value={sector}>
                                  {sector}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="companySize"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Porte da Empresa</FormLabel>
                          <Select onValueChange={field.onChange} defaultValue={field.value}>
                            <FormControl>
                              <SelectTrigger>
                                <SelectValue placeholder="Selecione o porte" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              {companySizes.map((size) => (
                                <SelectItem key={size.value} value={size.value}>
                                  {size.label}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                )}

                {/* Step 2: Manager Data */}
                {step === 2 && (
                  <div className="space-y-4">
                    <FormField
                      control={form.control}
                      name="managerName"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Nome do Responsável</FormLabel>
                          <FormControl>
                            <Input placeholder="João Silva" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="managerCpf"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>CPF</FormLabel>
                          <FormControl>
                            <Input
                              placeholder="000.000.000-00"
                              {...field}
                              onChange={(e) => {
                                const formatted = formatCPF(e.target.value);
                                field.onChange(formatted);
                              }}
                              maxLength={14}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="managerEmail"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>E-mail</FormLabel>
                          <FormControl>
                            <Input placeholder="joao@empresa.com" type="email" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="managerPhone"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>WhatsApp</FormLabel>
                          <FormControl>
                            <Input placeholder="(11) 99999-9999" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="managerPassword"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Senha</FormLabel>
                          <FormControl>
                            <Input placeholder="••••••••" type="password" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                )}

                {/* Step 3: Address */}
                {step === 3 && (
                  <div className="space-y-4">
                    <FormField
                      control={form.control}
                      name="cep"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>CEP</FormLabel>
                          <FormControl>
                            <Input
                              placeholder="00000-000"
                              {...field}
                              onChange={(e) => {
                                const formatted = formatCEP(e.target.value);
                                field.onChange(formatted);
                              }}
                              maxLength={9}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <div className="grid grid-cols-3 gap-4">
                      <div className="col-span-2">
                        <FormField
                          control={form.control}
                          name="address"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Logradouro</FormLabel>
                              <FormControl>
                                <Input placeholder="Rua das Flores" {...field} />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                      </div>
                      <FormField
                        control={form.control}
                        name="number"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Nº</FormLabel>
                            <FormControl>
                              <Input placeholder="123" {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <FormField
                        control={form.control}
                        name="neighborhood"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Bairro</FormLabel>
                            <FormControl>
                              <Input placeholder="Centro" {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={form.control}
                        name="city"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Cidade</FormLabel>
                            <FormControl>
                              <Input placeholder="São Paulo" {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <FormField
                        control={form.control}
                        name="state"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Estado</FormLabel>
                            <Select onValueChange={field.onChange} defaultValue={field.value}>
                              <FormControl>
                                <SelectTrigger>
                                  <SelectValue placeholder="UF" />
                                </SelectTrigger>
                              </FormControl>
                              <SelectContent>
                                {brazilianStates.map((state) => (
                                  <SelectItem key={state} value={state}>
                                    {state}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={form.control}
                        name="complement"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Complemento</FormLabel>
                            <FormControl>
                              <Input placeholder="Apto 10" {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>
                  </div>
                )}

                {/* Step 4: Initial Settings */}
                {step === 4 && (
                  <div className="space-y-4">
                    <FormField
                      control={form.control}
                      name="salesGoal"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Meta de Vendas Mensal (R$)</FormLabel>
                          <FormControl>
                            <Input
                              placeholder="50000"
                              type="number"
                              {...field}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="teamSize"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Tamanho Inicial da Equipe</FormLabel>
                          <FormControl>
                            <Input
                              placeholder="5"
                              type="number"
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
                          <FormLabel>Descrição da Empresa (Opcional)</FormLabel>
                          <FormControl>
                            <Textarea
                              placeholder="Descreva brevemente a atividade principal da empresa..."
                              className="min-h-[80px]"
                              {...field}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                )}

                <div className="flex justify-between pt-6">
                  {step > 1 && (
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => setStep(step - 1)}
                    >
                      Anterior
                    </Button>
                  )}
                  {step < 4 ? (
                    <Button
                      type="button"
                      onClick={nextStep}
                      className="ml-auto"
                    >
                      Próximo
                    </Button>
                  ) : (
                    <Button
                      type="submit"
                      disabled={onboardingMutation.isPending}
                      className="ml-auto"
                    >
                      {onboardingMutation.isPending ? "Finalizando..." : "Finalizar Configuração"}
                    </Button>
                  )}
                </div>
              </form>
            </Form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}