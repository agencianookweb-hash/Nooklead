import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { z } from "zod";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { Check, CloudUpload } from "lucide-react";
import type { Lead } from "@/types";

const saleSchema = z.object({
  leadId: z.string().min(1, "Selecione um lead"),
  value: z.string().min(1, "Informe o valor da venda"),
  closingDate: z.string().min(1, "Informe a data de fechamento"),
  productService: z.string().min(1, "Informe o produto/serviço"),
  description: z.string().optional(),
});

type SaleFormData = z.infer<typeof saleSchema>;

export default function SalesForm() {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const form = useForm<SaleFormData>({
    resolver: zodResolver(saleSchema),
    defaultValues: {
      leadId: "",
      value: "",
      closingDate: "",
      productService: "",
      description: "",
    },
  });

  const { data: leads = [] } = useQuery<Lead[]>({
    queryKey: ["/api/leads"],
    retry: false,
  });

  const createSaleMutation = useMutation({
    mutationFn: async (data: SaleFormData) => {
      return await apiRequest("POST", "/api/sales", {
        ...data,
        value: parseFloat(data.value.replace(/[^\d.,]/g, "").replace(",", ".")),
      });
    },
    onSuccess: () => {
      toast({
        title: "Sucesso",
        description: "Venda registrada e enviada para aprovação!",
      });
      form.reset();
      queryClient.invalidateQueries({ queryKey: ["/api/sales"] });
    },
    onError: () => {
      toast({
        title: "Erro",
        description: "Falha ao registrar venda. Tente novamente.",
        variant: "destructive",
      });
    },
  });

  const onSubmit = (data: SaleFormData) => {
    createSaleMutation.mutate(data);
  };

  // Filter leads that can be converted to sales (those in advanced stages)
  const eligibleLeads = leads.filter(lead => 
    ["INTERESSE", "PROPOSTA_ENVIADA", "NEGOCIACAO"].includes(lead.status)
  );

  return (
    <Card>
      <CardHeader>
        <CardTitle>Registrar Nova Venda</CardTitle>
      </CardHeader>
      <CardContent>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="leadId"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Lead/Empresa</FormLabel>
                  <Select onValueChange={field.onChange} defaultValue={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Selecione um lead..." />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {eligibleLeads.map((lead) => (
                        <SelectItem key={lead.id} value={lead.id}>
                          {lead.company?.nomeFantasia || lead.company?.razaoSocial}
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
              name="value"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Valor da Venda</FormLabel>
                  <FormControl>
                    <Input 
                      placeholder="R$ 0,00" 
                      {...field}
                      onChange={(e) => {
                        // Format currency input
                        let value = e.target.value.replace(/[^\d]/g, "");
                        if (value) {
                          value = (parseFloat(value) / 100).toLocaleString("pt-BR", {
                            style: "currency",
                            currency: "BRL",
                          });
                        }
                        field.onChange(value);
                      }}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="closingDate"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Data de Fechamento</FormLabel>
                  <FormControl>
                    <Input type="date" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="productService"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Produto/Serviço</FormLabel>
                  <FormControl>
                    <Input placeholder="Descrição do produto ou serviço" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div>
              <FormLabel>Comprovante</FormLabel>
              <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center mt-2">
                <CloudUpload className="h-8 w-8 text-gray-400 mx-auto mb-2" />
                <p className="text-sm text-gray-600">Arraste o arquivo ou clique para fazer upload</p>
                <p className="text-xs text-gray-500 mt-1">PDF, JPG, PNG até 10MB</p>
              </div>
            </div>

            <FormField
              control={form.control}
              name="description"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Observações</FormLabel>
                  <FormControl>
                    <Textarea 
                      rows={3}
                      placeholder="Observações adicionais..." 
                      {...field} 
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <Button 
              type="submit" 
              className="w-full bg-green-600 hover:bg-green-700"
              disabled={createSaleMutation.isPending}
            >
              <Check className="mr-2 h-4 w-4" />
              {createSaleMutation.isPending ? "Registrando..." : "Registrar Venda"}
            </Button>
          </form>
        </Form>
      </CardContent>
    </Card>
  );
}
